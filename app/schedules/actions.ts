"use server";

import { Day, type Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { requireRoomInFaculty, scheduleFacultyWhere } from "@/lib/faculty-scope";

export async function deleteSchedule(formData: FormData) {
  const user = await verifySession();
  if (!user || !can(user.role, "schedules", "delete")) throw new Error("Anda tidak memiliki kewenangan menghapus jadwal.");
  const id = String(formData.get("id"));
  const schedule = await prisma.schedule.findFirst({ where: { id, ...scheduleFacultyWhere(user) }, select: { id: true } });
  if (!schedule) throw new Error("Jadwal tidak ditemukan atau berada di luar fakultas Anda.");
  await prisma.schedule.delete({ where: { id: schedule.id } });
  revalidatePath("/schedules");
}

export async function saveSchedule(formData: FormData) {
  const user = await verifySession();
  if (!user) throw new Error("Sesi tidak valid.");
  const id = String(formData.get("id") ?? "");
  if (!can(user.role, "schedules", id ? "update" : "add")) throw new Error("Anda tidak memiliki kewenangan mengubah master jadwal.");
  if (id) {
    const existing = await prisma.schedule.findFirst({
      where: { id, ...scheduleFacultyWhere(user) },
      select: { id: true, ticketId: true },
    });
    if (!existing) throw new Error("Jadwal tidak ditemukan atau berada di luar fakultas Anda.");
    if (existing.ticketId) throw new Error("Jadwal permintaan ruangan harus dikelola melalui tiket.");
  }
  const roomCode = String(formData.get("roomCode") ?? "").trim();
  const room = roomCode ? await prisma.room.findUnique({ where: { code: roomCode }, select: { id: true } }) : null;
  if (!room) throw new Error("Pilih kode ruangan yang terdaftar.");
  const roomId = room.id;
  await requireRoomInFaculty(user, roomId);
  const day = String(formData.get("day")) as Day;
  const startTime = String(formData.get("startTime"));
  const endTime = String(formData.get("endTime"));
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);
  const enrolledStudents = Number(formData.get("students"));
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(endTime)) {
    throw new Error("Format jam mulai dan selesai tidak valid.");
  }
  if (!Number.isInteger(enrolledStudents) || enrolledStudents < 0) throw new Error("Jumlah peserta tidak valid.");
  const data: Prisma.ScheduleUncheckedUpdateInput = {
    roomId,
    day,
    startMinutes,
    endMinutes,
    enrolledStudents,
    className: String(formData.get("className") ?? "") || null,
  };
  if (!Object.values(Day).includes(day) || endMinutes <= startMinutes) throw new Error("Hari atau waktu jadwal tidak valid.");
  if (id) await prisma.schedule.update({ where: { id }, data });
  else await prisma.schedule.create({ data: data as Prisma.ScheduleUncheckedCreateInput });
  revalidatePath("/schedules");
}
