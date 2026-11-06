import { Day, PrismaClient } from "@prisma/client";
import "dotenv/config";
import * as XLSX from "xlsx";
import path from "node:path";

const prisma = new PrismaClient();

const days: Record<string, Day> = {
  Senin: "SENIN",
  Selasa: "SELASA",
  Rabu: "RABU",
  Kamis: "KAMIS",
  Jumat: "JUMAT",
  Sabtu: "SABTU",
};

function timeToMinutes(value: unknown) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.ticketFlag.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.course.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      { email: "admin@unpad.ac.id", name: "Administrator Sarpras", role: "ADMIN" },
      { email: "kaprodi@unpad.ac.id", name: "Kaprodi Demo", role: "KAPRODI" },
      { email: "sarpras@unpad.ac.id", name: "Pengelola Sarpras Fakultas", role: "SARPRAS" },
      { email: "viewer@unpad.ac.id", name: "Pengguna Dashboard", role: "VIEWER" },
    ],
  });

  const schedulePath = path.join(process.cwd(), "acuan", "jadwal_kuliah.xlsx");
  const workbook = XLSX.readFile(schedulePath);
  const scheduleSheet = workbook.Sheets["Jadwal no duplikat jadwalkod"];
  const roomSheet = workbook.Sheets["Ruang"];
  const scheduleRows: any[] = XLSX.utils.sheet_to_json(scheduleSheet);
  const roomRows: any[] = XLSX.utils.sheet_to_json(roomSheet);

  const roomMap = new Map<string, string>();
  const roomData: {
    code: string;
    name: string;
    building: string | null;
    floor: string | null;
    capacitySeat: number;
  }[] = [];
  for (const row of roomRows) {
    const code = String(row.ruangkode ?? "").trim();
    if (!code || roomData.some((room) => room.code === code)) continue;
    const capacity = Number(row.ruangankapasitasnormal) || 40;
    roomData.push({
      code,
      name: String(row.ruangannamaruang ?? code),
      building: row.rgedungnama ? String(row.rgedungnama) : null,
      floor: row.ruanganlantai ? String(row.ruanganlantai) : null,
      capacitySeat: capacity,
    });
  }
  await prisma.room.createMany({ data: roomData, skipDuplicates: true });
  for (const room of await prisma.room.findMany({ select: { id: true, code: true } })) roomMap.set(room.code, room.id);

  const courseMap = new Map<string, string>();
  const courseData = new Map<string, { code: string; name: string }>();
  const scheduleRowsForInsert: {
    sourceCode: string;
    roomId: string;
    courseCode: string | null;
    day: Day;
    startMinutes: number;
    endMinutes: number;
    enrolledStudents: number;
    className: string | null;
  }[] = [];
  let importedSchedules = 0;
  for (const row of scheduleRows) {
    const roomCode = String(row.JadwalRuangKode ?? "").trim();
    const roomId = roomMap.get(roomCode);
    const day = days[String(row.hHari ?? "").trim()];
    const startMinutes = timeToMinutes(row.JadwalJadwalJamMulai);
    const endMinutes = timeToMinutes(row.JadwalJadwalJamAkhir);
    if (!roomId || !day || startMinutes === null || endMinutes === null || endMinutes <= startMinutes) continue;

    const courseCode = String(row.JadwalKodeMK ?? "").trim();
    if (courseCode) {
      courseData.set(courseCode, { code: courseCode, name: String(row.MKNamaMataKuliah ?? courseCode) });
    }

    scheduleRowsForInsert.push({
      sourceCode: String(row.JadwalKode ?? ""),
      roomId,
      courseCode: courseCode || null,
      day,
      startMinutes,
      endMinutes,
      enrolledStudents: Number(row.JadwalKuota) || 0,
      className: row.JadwalKelas ? String(row.JadwalKelas) : null,
    });
    importedSchedules++;
  }

  await prisma.course.createMany({ data: [...courseData.values()], skipDuplicates: true });
  for (const course of await prisma.course.findMany({ select: { id: true, code: true } })) courseMap.set(course.code, course.id);

  const scheduleData = scheduleRowsForInsert.map((schedule) => ({
    sourceCode: schedule.sourceCode,
    roomId: schedule.roomId,
    courseId: schedule.courseCode ? courseMap.get(schedule.courseCode) : undefined,
    day: schedule.day,
    startMinutes: schedule.startMinutes,
    endMinutes: schedule.endMinutes,
    enrolledStudents: schedule.enrolledStudents,
    className: schedule.className,
  }));
  for (let index = 0; index < scheduleData.length; index += 1000) {
    await prisma.schedule.createMany({
      data: scheduleData.slice(index, index + 1000),
      skipDuplicates: true,
    });
  }

  console.log(`Seed selesai: ${roomMap.size} ruangan, ${importedSchedules} jadwal.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
