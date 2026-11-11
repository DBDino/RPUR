"use server";

import { Day, TicketStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { TicketValidationError, validateTicketInput } from "@/lib/ticket-validation";
import { timeToMinutes } from "@/lib/time";
import { verifySession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { requireRoomInFaculty, requireRoomInSelectedFaculty, ticketFacultyWhere } from "@/lib/faculty-scope";
import { expireRoomRequests } from "@/lib/room-request-expiration";

const daysByWeekday: Day[] = [Day.MINGGU, Day.SENIN, Day.SELASA, Day.RABU, Day.KAMIS, Day.JUMAT, Day.SABTU];

function parseRequestedDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Tanggal permintaan wajib diisi.");
  }

  const text = value.trim();
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const localizedDate = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  const year = isoDate ? Number(isoDate[1]) : localizedDate ? Number(localizedDate[3]) : NaN;
  const month = isoDate ? Number(isoDate[2]) : localizedDate ? Number(localizedDate[2]) : NaN;
  const day = isoDate ? Number(isoDate[3]) : localizedDate ? Number(localizedDate[1]) : NaN;

  if (![year, month, day].every(Number.isInteger)) {
    throw new Error("Tanggal permintaan tidak terbaca. Pilih tanggal pada kolom Tanggal permintaan.");
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error("Tanggal permintaan tidak valid.");
  }

  return { date, isoDate: date.toISOString().slice(0, 10) };
}

export async function createTicket(formData: FormData) {
  const actor = await verifySession();
  if (!actor || !can(actor.role, "tickets", "add")) throw new Error("Peran ini tidak memiliki akses membuat pengajuan.");
  try {
    const roomId = String(formData.get("roomId"));
    await requireRoomInSelectedFaculty(actor, roomId, String(formData.get("faculty") ?? ""), actor.role === "SARPRAS");
    const { date: requestedDate, isoDate: requestedDateText } = parseRequestedDate(formData.get("requestedDate"));
    const startMinutes = timeToMinutes(String(formData.get("startTime")));
    const endMinutes = timeToMinutes(String(formData.get("endTime")));
    if (startMinutes === null || endMinutes === null) throw new Error("Format waktu tidak valid.");
    const todayInJakarta = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
    const currentTimeInJakarta = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date());
    const [currentHour, currentMinute] = currentTimeInJakarta.split(":").map(Number);
    if (requestedDateText < todayInJakarta ||
        (requestedDateText === todayInJakarta && startMinutes <= currentHour * 60 + currentMinute)) {
      throw new Error("Waktu mulai permintaan harus berada di masa depan (WIB).");
    }
    const input = {
      roomId,
      day: daysByWeekday[requestedDate.getUTCDay()],
      requestedDate,
      startMinutes,
      endMinutes,
      enrolledStudents: Number(formData.get("students")),
    };
    await prisma.$transaction(async tx => {
      const flags = await validateTicketInput(tx, input);
      await tx.ticket.create({
        data: {
          submitterId: actor.id,
          targetRoomId: roomId,
          targetDay: input.day,
          requestedDate,
          startMinutes,
          endMinutes,
          enrolledStudents: input.enrolledStudents,
          purpose: String(formData.get("purpose")),
          flags: flags.length ? { create: flags } : undefined,
        },
      });
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error("Pengajuan gagal disimpan.");
  }
  revalidatePath("/tickets");
  after(() => expireRoomRequests());
}

export async function decideTicket(formData: FormData) {
  const actor = await verifySession();
  if (!actor || !can(actor.role, "tickets", "update")) throw new Error("Anda tidak memiliki kewenangan memutuskan pengajuan.");
  const ticketId = String(formData.get("ticketId"));
  const decision = String(formData.get("decision"));
  const notes = String(formData.get("notes") ?? "");
  try {
    await prisma.$transaction(async tx => {
      const ticket = await tx.ticket.findFirst({
        where: { id: ticketId, status: TicketStatus.DIAJUKAN, ...ticketFacultyWhere(actor) },
      });
      if (!ticket) throw new Error("Pengajuan tidak ditemukan atau berada di luar fakultas Anda.");
      if (actor.role === "SARPRAS" && ticket.submitterId === actor.id) {
        throw new Error("Sarpras tidak dapat memutuskan permintaan yang diajukannya sendiri.");
      }
      if (decision === "REJECT") {
        if (!notes.trim()) throw new TicketValidationError("Alasan penolakan wajib diisi.");
        await tx.ticket.update({
          where: { id: ticketId },
          data: { status: TicketStatus.DITOLAK, adminNotes: notes },
        });
        await tx.auditLog.create({ data: { ticketId, actorId: actor.id, action: "DITOLAK", notes } });
        return;
      }
      if (decision !== "APPROVE") throw new Error("Keputusan permintaan tidak valid.");
      const flags = await validateTicketInput(tx, {
        roomId: ticket.targetRoomId,
        day: ticket.targetDay,
        requestedDate: ticket.requestedDate,
        startMinutes: ticket.startMinutes,
        endMinutes: ticket.endMinutes,
        enrolledStudents: ticket.enrolledStudents,
        sourceScheduleId: ticket.sourceScheduleId ?? undefined,
      });
      await tx.ticketFlag.deleteMany({ where: { ticketId, code: { in: ["OVERCAPACITY", "OVERTIME", "CAPACITY_NEAR_LIMIT", "TIME_NEAR_LIMIT"] } } });
      await tx.ticketFlag.createMany({ data: flags.map((flag) => ({ ticketId, ...flag })), skipDuplicates: true });
      await tx.schedule.create({
        data: {
          ticketId: ticket.id,
          roomId: ticket.targetRoomId,
          scheduledDate: ticket.requestedDate,
          day: ticket.targetDay,
          startMinutes: ticket.startMinutes,
          endMinutes: ticket.endMinutes,
          enrolledStudents: ticket.enrolledStudents,
          className: ticket.purpose,
        },
      });
      await tx.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.DISETUJUI, adminNotes: notes || null },
      });
      await tx.auditLog.create({ data: { ticketId, actorId: actor.id, action: "DISETUJUI", notes: notes || null } });
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error("Keputusan gagal disimpan.");
  }
  revalidatePath("/tickets");
  revalidatePath("/schedules");
  revalidatePath("/rooms");
  revalidatePath("/");
}

export async function deleteTicket(formData: FormData) {
  const actor = await verifySession();
  if (!actor) throw new Error("Sesi tidak valid.");
  const ticketId = String(formData.get("ticketId"));
  await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findFirst({
      where: { id: ticketId, ...ticketFacultyWhere(actor) },
      select: { id: true, submitterId: true },
    });
    if (!ticket) throw new Error("Pengajuan tidak ditemukan atau berada di luar fakultas Anda.");
    if (actor.role !== "ADMIN" && !(actor.role === "SARPRAS" && ticket.submitterId === actor.id)) {
      throw new Error("Anda hanya dapat menghapus permintaan ruangan yang Anda ajukan sendiri.");
    }
    await tx.schedule.deleteMany({ where: { ticketId: ticket.id } });
    await tx.ticket.delete({ where: { id: ticket.id } });
  });
  revalidatePath("/tickets");
  revalidatePath("/schedules");
  revalidatePath("/");
}
