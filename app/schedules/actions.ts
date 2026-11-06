"use server";

import { Day, type Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { can } from "@/lib/rbac";

export async function deleteSchedule(formData: FormData) {
  const user = await verifySession();
  if (!user || !can(user.role, "schedules", "delete")) throw new Error("Anda tidak memiliki kewenangan menghapus jadwal.");
  await prisma.schedule.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/schedules");
}

export async function saveSchedule(formData: FormData) {
  const user = await verifySession();
  if (!user) throw new Error("Sesi tidak valid.");
  const id = String(formData.get("id") ?? "");
  if (!can(user.role, "schedules", id ? "update" : "add")) throw new Error("Anda tidak memiliki kewenangan mengubah master jadwal.");
  const day = String(formData.get("day")) as Day;
  const startTime = String(formData.get("startTime"));
  const endTime = String(formData.get("endTime"));
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);
  const data: Prisma.ScheduleUncheckedUpdateInput = {
    roomId: String(formData.get("roomId")),
    day,
    startMinutes,
    endMinutes,
    enrolledStudents: Number(formData.get("students")),
    className: String(formData.get("className") ?? "") || null,
  };
  if (!Object.values(Day).includes(day) || endMinutes <= startMinutes) throw new Error("Hari atau waktu jadwal tidak valid.");
  if (id) await prisma.schedule.update({ where: { id }, data });
  else await prisma.schedule.create({ data: data as Prisma.ScheduleUncheckedCreateInput });
  revalidatePath("/schedules");
}
