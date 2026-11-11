import { TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function getJakartaDateAndMinutes(now: Date) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const [hours, minutes] = time.split(":").map(Number);
  return { date, dateValue: new Date(`${date}T00:00:00.000Z`), minutes: hours * 60 + minutes };
}

export async function expireRoomRequests() {
  const { dateValue, minutes } = getJakartaDateAndMinutes(new Date());
  const expiredWhere = {
    status: TicketStatus.DIAJUKAN,
    OR: [
      { requestedDate: { lt: dateValue } },
      { requestedDate: dateValue, endMinutes: { lte: minutes } },
    ],
  };

  const [expiredRequests, deactivatedSchedules] = await prisma.$transaction(async (tx) => {
    const expired = await tx.ticket.updateManyAndReturn({
      where: expiredWhere,
      data: {
        status: TicketStatus.DITOLAK,
        adminNotes: "Ditolak otomatis karena waktu permintaan telah berlalu.",
      },
      select: { id: true },
    });
    if (expired.length) {
      await tx.ticketFlag.createMany({
        data: expired.map(({ id }) => ({
          ticketId: id,
          type: "WARNING" as const,
          code: "EXPIRED",
          message: "Permintaan kedaluwarsa dan ditolak otomatis.",
        })),
        skipDuplicates: true,
      });
    }

    const scheduleResult = await tx.schedule.updateMany({
      where: {
        active: true,
        scheduledDate: { not: null },
        OR: [
          { scheduledDate: { lt: dateValue } },
          { scheduledDate: dateValue, endMinutes: { lte: minutes } },
        ],
      },
      data: { active: false },
    });
    return [expired.length, scheduleResult.count] as const;
  });

  return { expiredRequests, deactivatedSchedules };
}
