"use server";

import { revalidatePath } from "next/cache";
import { ImprovementPriority, ImprovementStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { improvementFacultyWhere, requireRoomInSelectedFaculty } from "@/lib/faculty-scope";

export async function createImprovement(formData: FormData) {
  const actor = await verifySession();
  if (!actor || !can(actor.role, "improvements", "add")) throw new Error("Anda tidak memiliki akses membuat tiket perbaikan.");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const solution = String(formData.get("solution") ?? "").trim();
  const reference = String(formData.get("reference") ?? "").trim();
  const faculty = String(formData.get("faculty") ?? "");
  const roomId = String(formData.get("roomId") ?? "");
  const priority = String(formData.get("priority")) as ImprovementPriority;
  if (!title || !description || !category || !solution || !Object.values(ImprovementPriority).includes(priority)) {
    throw new Error("Semua field wajib tiket perbaikan harus lengkap.");
  }
  const room = await requireRoomInSelectedFaculty(actor, roomId, faculty, actor.role === "SARPRAS");
  const roomReference = `Fakultas: ${faculty}; Ruangan: ${room.code} — ${room.name}`;
  await prisma.improvementTicket.create({
    data: {
      title,
      description,
      category,
      solution,
      faculty,
      reference: reference ? `${roomReference}; ${reference}` : roomReference,
      priority,
      creatorId: actor.id,
    },
  });
  revalidatePath("/improvements");
}

export async function updateImprovement(formData: FormData) {
  const actor = await verifySession();
  if (!actor || !can(actor.role, "improvements", "update")) throw new Error("Anda tidak memiliki kewenangan memperbarui tiket.");
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as ImprovementStatus;
  const priority = String(formData.get("priority")) as ImprovementPriority;
  const resolution = String(formData.get("resolution") ?? "").trim();
  const evidence = String(formData.get("evidence") ?? "").trim();
  const assigneeId = String(formData.get("assigneeId") ?? "").trim();
  if (!Object.values(ImprovementStatus).includes(status) || !Object.values(ImprovementPriority).includes(priority)) {
    throw new Error("Status atau prioritas tidak valid.");
  }
  if (status === "SOLVED" && !resolution) throw new Error("Catatan penyelesaian wajib diisi.");
  const ticket = await prisma.improvementTicket.findFirst({
    where: { id, ...improvementFacultyWhere(actor) },
    select: { id: true, creatorId: true, faculty: true },
  });
  if (!ticket) throw new Error("Tiket tidak ditemukan atau berada di luar cakupan fakultas Anda.");
  if (actor.role === "SARPRAS" && (ticket.creatorId === actor.id || ticket.faculty !== actor.faculty)) {
    throw new Error("Sarpras hanya dapat memproses tiket fakultas yang diurusnya.");
  }
  if (assigneeId) {
    const assigneeConditions: Prisma.UserWhereInput[] = [{ role: "ADMIN" }];
    if (ticket.faculty) assigneeConditions.push({ role: "SARPRAS", faculty: ticket.faculty });
    const assigneeWhere: Prisma.UserWhereInput = actor.role === "SARPRAS"
      ? { id: assigneeId, OR: assigneeConditions }
      : { id: assigneeId, role: { in: ["ADMIN", "SARPRAS"] } };
    const assignee = await prisma.user.findFirst({ where: assigneeWhere, select: { id: true } });
    if (!assignee) throw new Error("Penanggung jawab tidak valid untuk fakultas tiket ini.");
  }
  const updateWhere: Prisma.ImprovementTicketWhereInput = actor.role === "SARPRAS"
    ? { id: ticket.id, faculty: actor.faculty, creatorId: { not: actor.id } }
    : { id: ticket.id };
  const updated = await prisma.improvementTicket.updateMany({
    where: updateWhere,
    data: {
      status,
      priority,
      resolution: resolution || null,
      evidence: evidence || null,
      assigneeId: assigneeId || null,
    },
  });
  if (updated.count !== 1) throw new Error("Tiket berubah; muat ulang halaman lalu coba kembali.");
  revalidatePath("/improvements");
}

export async function deleteImprovement(formData: FormData) {
  const actor = await verifySession();
  if (!actor) throw new Error("Sesi tidak valid.");
  const id = String(formData.get("id"));
  const ticket = await prisma.improvementTicket.findFirst({
    where: { id, ...improvementFacultyWhere(actor) },
    select: { id: true, creatorId: true },
  });
  if (!ticket) throw new Error("Tiket tidak ditemukan atau berada di luar cakupan fakultas Anda.");
  if (actor.role !== "ADMIN" && !(actor.role === "SARPRAS" && ticket.creatorId === actor.id)) {
    throw new Error("Sarpras hanya dapat menghapus tiket yang diajukannya sendiri.");
  }
  const deleted = await prisma.improvementTicket.deleteMany({
    where: actor.role === "ADMIN" ? { id: ticket.id } : { id: ticket.id, creatorId: actor.id },
  });
  if (deleted.count !== 1) throw new Error("Tiket berubah; muat ulang halaman lalu coba kembali.");
  revalidatePath("/improvements");
}
