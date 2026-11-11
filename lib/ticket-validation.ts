import { Day, Prisma } from "@prisma/client";

export class TicketValidationError extends Error {}

export async function validateTicketInput(
  tx: Prisma.TransactionClient,
  input: {
    roomId: string;
    day: Day;
    requestedDate?: Date;
    startMinutes: number;
    endMinutes: number;
    enrolledStudents: number;
    sourceScheduleId?: string;
  },
) {
  if (input.endMinutes <= input.startMinutes) {
    throw new TicketValidationError("Waktu selesai harus lebih akhir dari waktu mulai.");
  }

  const room = await tx.room.findUniqueOrThrow({ where: { id: input.roomId } });
  if (!room.active) throw new TicketValidationError("Ruangan tidak aktif.");

  const schedules = await tx.schedule.findMany({
    where: {
      roomId: input.roomId,
      day: input.day,
      active: true,
      ...(input.requestedDate
        ? { OR: [{ scheduledDate: null }, { scheduledDate: input.requestedDate }] }
        : {}),
    },
    select: { id: true, startMinutes: true, endMinutes: true },
  });

  const overlap = schedules.some(
    (schedule) =>
      schedule.id !== input.sourceScheduleId &&
      input.startMinutes < schedule.endMinutes &&
      input.endMinutes > schedule.startMinutes,
  );
  if (overlap) {
    throw new TicketValidationError("Jadwal bentrok dengan jadwal aktif pada ruangan dan hari tersebut.");
  }

  const approvedTickets = await tx.ticket.findMany({
    where: {
      targetRoomId: input.roomId,
      targetDay: input.day,
      status: "DISETUJUI",
      schedule: { is: null },
      ...(input.requestedDate ? { requestedDate: input.requestedDate } : {}),
    },
    select: { startMinutes: true, endMinutes: true },
  });
  const ticketOverlap = approvedTickets.some(
    (ticket) => input.startMinutes < ticket.endMinutes && input.endMinutes > ticket.startMinutes,
  );
  if (ticketOverlap) {
    throw new TicketValidationError("Jadwal bentrok dengan peminjaman yang telah disetujui.");
  }

  const usedMinutes = schedules.reduce(
    (total, schedule) =>
      schedule.id === input.sourceScheduleId
        ? total
        : total + schedule.endMinutes - schedule.startMinutes,
    0,
  );
  const approvedMinutes = approvedTickets.reduce(
    (total, ticket) => total + ticket.endMinutes - ticket.startMinutes,
    0,
  );
  const flags: { type: "INFO" | "WARNING"; code: string; message: string }[] = [];
  if (input.enrolledStudents > room.capacitySeat) {
    flags.push({
      type: "WARNING",
      code: "OVERCAPACITY",
      message: `Jumlah mahasiswa (${input.enrolledStudents}) melebihi kapasitas ruangan (${room.capacitySeat}).`,
    });
  } else if (input.enrolledStudents / room.capacitySeat >= 0.9) {
    flags.push({
      type: "INFO",
      code: "CAPACITY_NEAR_LIMIT",
      message: "Jumlah mahasiswa mendekati kapasitas ruangan.",
    });
  }
  const projectedMinutes = usedMinutes + approvedMinutes + input.endMinutes - input.startMinutes;
  if (projectedMinutes > room.maxDailyMinutes) {
    flags.push({
      type: "WARNING",
      code: "OVERTIME",
      message: `Okupansi harian diproyeksikan ${projectedMinutes} dari batas ${room.maxDailyMinutes} menit.`,
    });
  } else if (projectedMinutes >= room.maxDailyMinutes * 0.9) {
    flags.push({
      type: "INFO",
      code: "TIME_NEAR_LIMIT",
      message: "Okupansi harian mendekati batas 360 menit.",
    });
  }
  return flags;
}
