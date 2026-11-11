"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { requireRoomInFaculty } from "@/lib/faculty-scope";

export async function saveRoom(formData: FormData) {
  const user = await verifySession();
  if (!user) throw new Error("Sesi tidak valid.");
  const id = String(formData.get("id") ?? "");
  const capability = id ? "update" : "add";
  if (!can(user.role, "rooms", capability)) throw new Error("Anda tidak memiliki kewenangan mengubah master ruang.");
  const existingRoom = id ? await requireRoomInFaculty(user, id) : null;
  if (!id && user.role !== "ADMIN") throw new Error("Hanya admin yang dapat menambahkan ruangan.");
  const selectedFaculties = String(formData.get("faculties") ?? formData.get("faculty") ?? "")
    .split(",")
    .map((faculty) => faculty.trim())
    .filter(Boolean);
  if (user.role === "ADMIN" && !selectedFaculties.length) throw new Error("Fakultas ruangan wajib diisi.");
  const data = {
    code: String(formData.get("code")).trim().toUpperCase(),
    name: String(formData.get("name")).trim(),
    building: String(formData.get("building") ?? "").trim() || null,
    floor: String(formData.get("floor") ?? "").trim() || null,
    faculties: user.role === "ADMIN" ? selectedFaculties : existingRoom?.faculties ?? [],
    capacitySeat: Number(formData.get("capacitySeat")),
    maxDailyMinutes: Number(formData.get("maxDailyMinutes") || 360),
    active: formData.get("active") !== "false",
  };
  if (!data.code || !data.name || data.capacitySeat < 1 || data.maxDailyMinutes < 1) throw new Error("Data ruangan tidak lengkap.");
  if (id) await prisma.room.update({ where: { id }, data });
  else await prisma.room.create({ data });
  revalidatePath("/rooms");
  revalidatePath("/schedules");
  revalidatePath("/tickets");
}

export async function deleteRoom(formData: FormData) {
  const user = await verifySession();
  if (!user || !can(user.role, "rooms", "delete")) throw new Error("Anda tidak memiliki kewenangan menghapus ruang.");
  const id = String(formData.get("id"));
  await requireRoomInFaculty(user, id);
  await prisma.room.delete({ where: { id } });
  revalidatePath("/rooms");
  revalidatePath("/schedules");
  revalidatePath("/tickets");
}
