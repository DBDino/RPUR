"use server";

import { revalidatePath } from "next/cache";
import { ImprovementPriority, ImprovementStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { can } from "@/lib/rbac";

export async function createImprovement(formData: FormData) {
  const actor = await verifySession();
  if (!actor || !can(actor.role, "improvements", "add")) throw new Error("Anda tidak memiliki akses membuat tiket perbaikan.");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const solution = String(formData.get("solution") ?? "").trim();
  const reference = String(formData.get("reference") ?? "").trim();
  const priority = String(formData.get("priority")) as ImprovementPriority;
  if (!title || !description || !category || !solution || !Object.values(ImprovementPriority).includes(priority)) {
    throw new Error("Semua field wajib tiket perbaikan harus lengkap.");
  }
  await prisma.improvementTicket.create({
    data: { title, description, category, solution, reference: reference || null, priority, creatorId: actor.id },
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
  await prisma.improvementTicket.update({
    where: { id },
    data: {
      status,
      priority,
      resolution: resolution || null,
      evidence: evidence || null,
      assigneeId: assigneeId || null,
    },
  });
  revalidatePath("/improvements");
}

export async function deleteImprovement(formData: FormData) {
  const actor = await verifySession();
  if (!actor || !can(actor.role, "improvements", "delete")) throw new Error("Anda tidak memiliki kewenangan menghapus tiket perbaikan.");
  await prisma.improvementTicket.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/improvements");
}
