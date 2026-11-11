"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function saveUser(formData: FormData) {
  const actor = await verifySession();
  if (!actor || !can(actor.role, "users", "add")) throw new Error("Hanya admin yang dapat mengelola akun.");

  const id = String(formData.get("id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const faculty = String(formData.get("faculty") ?? "").trim() || null;

  if (!email.includes("@") || !name || !Object.values(UserRole).includes(role as UserRole)) {
    throw new Error("Nama, email, atau peran tidak valid.");
  }
  if (["KAPRODI", "SARPRAS"].includes(role) && !faculty) {
    throw new Error("Fakultas wajib diisi untuk akun PJ/Kaprodi dan Sarpras.");
  }
  if (id === actor.id && role !== "ADMIN") {
    throw new Error("Peran admin pada akun yang sedang digunakan tidak dapat diubah.");
  }

  const data = { email, name, role: role as UserRole, faculty };
  if (id) await prisma.user.update({ where: { id }, data });
  else await prisma.user.create({ data });
  revalidatePath("/users");
}
