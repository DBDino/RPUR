"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { requireRoomInFaculty, roomFacultyWhere } from "@/lib/faculty-scope";

export async function saveRoom(formData: FormData) {
  const user = await verifySession();
  if (!user) throw new Error("Sesi tidak valid.");
  const id = String(formData.get("id") ?? "");
  const capability = id ? "update" : "add";
  if (!can(user.role, "rooms", capability)) throw new Error("Anda tidak memiliki kewenangan mengubah master ruang.");
  const existingRoom = id ? await requireRoomInFaculty(user, id) : null;
  if (!id && user.role !== "ADMIN" && user.role !== "SARPRAS") throw new Error("Hanya admin atau sarpras yang dapat menambahkan ruangan.");

  let faculties: string[] = [];
  if (user.role === "ADMIN") {
    const selectedFaculties = String(formData.get("faculties") ?? formData.get("faculty") ?? "")
      .split(",")
      .map((faculty) => faculty.trim())
      .filter(Boolean);
    if (!selectedFaculties.length) throw new Error("Fakultas ruangan wajib diisi.");
    faculties = selectedFaculties;
  } else if (user.role === "SARPRAS") {
    if (!user.faculty) throw new Error("Akun SARPRAS belum memiliki fakultas yang ditugaskan.");
    faculties = id ? (existingRoom?.faculties ?? [user.faculty]) : [user.faculty];
  } else {
    faculties = existingRoom?.faculties ?? [];
  }

  const data = {
    code: String(formData.get("code")).trim().toUpperCase(),
    name: String(formData.get("name")).trim(),
    building: String(formData.get("building") ?? "").trim() || null,
    floor: String(formData.get("floor") ?? "").trim() || null,
    faculties,
    capacitySeat: Number(formData.get("capacitySeat")),
    maxDailyMinutes: Number(formData.get("maxDailyMinutes") || 360),
    active: formData.get("active") !== "false",
  };
  if (!data.code || !data.name || data.capacitySeat < 1 || data.maxDailyMinutes < 1) throw new Error("Data ruangan tidak lengkap.");
  const duplicateRoom = await prisma.room.findFirst({
    where: {
      code: { equals: data.code, mode: "insensitive" },
      ...(id ? { id: { not: id } } : {}),
    },
    select: { id: true },
  });
  if (duplicateRoom) throw new Error("Kode ruangan sudah digunakan. Masukkan kode ruangan yang berbeda.");

  try {
    if (id) await prisma.room.update({ where: { id }, data });
    else await prisma.room.create({ data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Kode ruangan sudah digunakan. Masukkan kode ruangan yang berbeda.");
    }
    throw error;
  }
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

export async function deleteRoomsBatch(formData: FormData) {
  const user = await verifySession();
  if (!user || !can(user.role, "rooms", "delete")) throw new Error("Anda tidak memiliki kewenangan menghapus ruang.");
  const rawIds = String(formData.get("ids") ?? "");
  let ids: string[] = [];
  try {
    ids = JSON.parse(rawIds);
  } catch {
    ids = rawIds.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(ids) || ids.length === 0) throw new Error("Pilih ruangan yang ingin dihapus.");

  const allowedRooms = await prisma.room.findMany({
    where: { id: { in: ids }, ...roomFacultyWhere(user) },
    select: { id: true },
  });
  const allowedIds = allowedRooms.map((r) => r.id);
  if (allowedIds.length === 0) throw new Error("Tidak ada ruangan dalam cakupan fakultas Anda yang dapat dihapus.");
  await prisma.room.deleteMany({ where: { id: { in: allowedIds } } });
  revalidatePath("/rooms");
  revalidatePath("/schedules");
  revalidatePath("/tickets");
}
