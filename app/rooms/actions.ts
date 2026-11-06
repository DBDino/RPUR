"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { can } from "@/lib/rbac";

export async function saveRoom(formData: FormData) {
  const user = await verifySession();
  if (!user) throw new Error("Sesi tidak valid.");
  const id = String(formData.get("id") ?? "");
  const capability = id ? "update" : "add";
  if (!can(user.role, "rooms", capability)) throw new Error("Anda tidak memiliki kewenangan mengubah master ruang.");
  const data = {
    code: String(formData.get("code")).trim().toUpperCase(),
    name: String(formData.get("name")).trim(),
    building: String(formData.get("building") ?? "").trim() || null,
    floor: String(formData.get("floor") ?? "").trim() || null,
    capacitySeat: Number(formData.get("capacitySeat")),
    maxDailyMinutes: Number(formData.get("maxDailyMinutes") || 360),
    active: formData.get("active") !== "false",
  };
  if (!data.code || !data.name || data.capacitySeat < 1 || data.maxDailyMinutes < 1) throw new Error("Data ruangan tidak lengkap.");
  if (id) await prisma.room.update({ where: { id }, data });
  else await prisma.room.create({ data });
  revalidatePath("/rooms");
}

export async function deleteRoom(formData: FormData) {
  const user = await verifySession();
  if (!user || !can(user.role, "rooms", "delete")) throw new Error("Anda tidak memiliki kewenangan menghapus ruang.");
  const id = String(formData.get("id"));
  await prisma.room.delete({ where: { id } });
  revalidatePath("/rooms");
}
