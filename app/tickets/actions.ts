"use server";

import { Day, TicketStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { TicketValidationError, validateTicketInput } from "@/lib/ticket-validation";
import { timeToMinutes } from "@/lib/time";
import { verifySession } from "@/lib/auth";
import { can } from "@/lib/rbac";

export async function createTicket(formData: FormData) {
  const actor = await verifySession();
  if (!actor || !can(actor.role, "tickets", "add")) throw new Error("Peran ini tidak memiliki akses membuat pengajuan.");
  try {
    const roomId = String(formData.get("roomId"));
    const startMinutes = timeToMinutes(String(formData.get("startTime")));
    const endMinutes = timeToMinutes(String(formData.get("endTime")));
    if (startMinutes === null || endMinutes === null) throw new Error("Format waktu tidak valid.");
    const input = { roomId, day: String(formData.get("day")) as Day, startMinutes, endMinutes, enrolledStudents: Number(formData.get("students")) };
    await prisma.$transaction(async tx => {
      const flags = await validateTicketInput(tx, input);
      await tx.ticket.create({
        data: {
          submitterId: actor.id,
          targetRoomId: roomId,
          targetDay: input.day,
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
}

export async function decideTicket(formData: FormData) {
  const actor = await verifySession();
  if (!actor || !can(actor.role, "tickets", "update")) throw new Error("Anda tidak memiliki kewenangan memutuskan pengajuan.");
  const ticketId = String(formData.get("ticketId"));
  const decision = String(formData.get("decision"));
  const notes = String(formData.get("notes") ?? "");
  try {
    await prisma.$transaction(async tx => {
      const ticket = await tx.ticket.findUniqueOrThrow({ where: { id: ticketId } });
      if (decision === "REJECT") {
        if (!notes.trim()) throw new TicketValidationError("Alasan penolakan wajib diisi.");
        await tx.ticket.update({ where: { id: ticketId }, data: { status: TicketStatus.DITOLAK, adminNotes: notes } });
        await tx.auditLog.create({ data: { ticketId, actorId: actor.id, action: "DITOLAK", notes } });
        return;
      }
      const flags = await validateTicketInput(tx, { roomId: ticket.targetRoomId, day: ticket.targetDay, startMinutes: ticket.startMinutes, endMinutes: ticket.endMinutes, enrolledStudents: ticket.enrolledStudents, sourceScheduleId: ticket.sourceScheduleId ?? undefined });
      await tx.ticketFlag.deleteMany({ where: { ticketId, code: { in: ["OVERCAPACITY", "OVERTIME", "CAPACITY_NEAR_LIMIT", "TIME_NEAR_LIMIT"] } } });
      await tx.ticketFlag.createMany({ data: flags.map((flag) => ({ ticketId, ...flag })), skipDuplicates: true });
      await tx.ticket.update({ where: { id: ticketId }, data: { status: TicketStatus.DISETUJUI, adminNotes: notes || null } });
      await tx.auditLog.create({ data: { ticketId, actorId: actor.id, action: "DISETUJUI", notes: notes || null } });
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error("Keputusan gagal disimpan.");
  }
  revalidatePath("/tickets");
}

export async function deleteTicket(formData: FormData) {
  const actor = await verifySession();
  if (!actor || !can(actor.role, "tickets", "delete")) throw new Error("Anda tidak memiliki kewenangan menghapus pengajuan.");
  const ticketId = String(formData.get("ticketId"));
  await prisma.$transaction(async (tx) => {
    await tx.ticket.delete({ where: { id: ticketId } });
  });
  revalidatePath("/tickets");
}
