import "server-only";

import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FACULTIES } from "@/lib/faculties";

type FacultyUser = { id: string; role: UserRole; faculty: string | null };

function isFacultyScoped(role: UserRole) {
  return role === "KAPRODI" || role === "SARPRAS";
}

export function roomFacultyWhere(user: FacultyUser): Prisma.RoomWhereInput {
  if (!isFacultyScoped(user.role)) return {};
  return user.faculty ? { faculties: { has: user.faculty } } : { id: { in: [] } };
}

export function scheduleFacultyWhere(user: FacultyUser): Prisma.ScheduleWhereInput {
  if (!isFacultyScoped(user.role)) return {};
  return user.faculty ? { room: { is: { faculties: { has: user.faculty } } } } : { roomId: { in: [] } };
}

export function ticketFacultyWhere(user: FacultyUser): Prisma.TicketWhereInput {
  if (user.role === "SARPRAS") {
    return {
      OR: [
        { submitterId: user.id },
        ...(user.faculty ? [{ targetRoom: { is: { faculties: { has: user.faculty } } } }] : []),
      ],
    };
  }
  if (!isFacultyScoped(user.role)) return {};
  return user.faculty
    ? { targetRoom: { is: { faculties: { has: user.faculty } } } }
    : { targetRoomId: { in: [] } };
}

export function improvementFacultyWhere(user: FacultyUser): Prisma.ImprovementTicketWhereInput {
  if (user.role === "ADMIN") return {};
  if (user.role === "SARPRAS") {
    return {
      OR: [
        { creatorId: user.id },
        ...(user.faculty ? [{ faculty: user.faculty }] : []),
      ],
    };
  }
  return { creatorId: user.id };
}

export async function requireRoomInSelectedFaculty(
  user: FacultyUser,
  roomId: string,
  faculty: string,
  allowAnyFaculty = false,
) {
  if (!FACULTIES.some((option) => option.name === faculty)) {
    throw new Error("Pilih fakultas yang valid terlebih dahulu.");
  }
  if (user.role !== "ADMIN" && !allowAnyFaculty && user.faculty !== faculty) {
    throw new Error("Fakultas yang dipilih berada di luar cakupan akun Anda.");
  }
  const room = await prisma.room.findFirst({
    where: { id: roomId, active: true, faculties: { has: faculty } },
    select: { id: true, code: true, name: true, faculties: true },
  });
  if (!room) throw new Error("Pilih ruangan aktif yang terdaftar pada fakultas tersebut.");
  return room;
}

export async function requireRoomInFaculty(user: FacultyUser, roomId: string) {
  const room = await prisma.room.findFirst({
    where: { id: roomId, ...roomFacultyWhere(user) },
    select: { id: true, faculties: true },
  });
  if (!room) throw new Error("Ruangan tidak ditemukan atau berada di luar fakultas Anda.");
  return room;
}
