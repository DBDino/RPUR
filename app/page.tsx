import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DashboardCharts, type ChartDatum } from "@/components/dashboard-charts";
import type { Day } from "@prisma/client";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { roomFacultyWhere, scheduleFacultyWhere, ticketFacultyWhere } from "@/lib/faculty-scope";
import { expireRoomRequests } from "@/lib/room-request-expiration";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await verifySession();
  if (!user) redirect("/login");
  await expireRoomRequests();
  const roomWhere = roomFacultyWhere(user);
  const scheduleWhere = { ...scheduleFacultyWhere(user), active: true };
  const ticketWhere = ticketFacultyWhere(user);
  let roomCount = 0, scheduleCount = 0, ticketCount = 0;
  let rooms: { id: string; code: string; name: string; capacitySeat: number }[] = [];
  let roomsWithUsage: { building: string | null; _count: { schedules: number } }[] = [];
  let dayCounts: { day: Day; _count: { _all: number } }[] = [];
  let dailyData: ChartDatum[] = [
    { name: "Senin", value: 0 }, { name: "Selasa", value: 0 }, { name: "Rabu", value: 0 },
    { name: "Kamis", value: 0 }, { name: "Jumat", value: 0 }, { name: "Sabtu", value: 0 }, { name: "Minggu", value: 0 },
  ];
  let conflicts = 0;
  let idleRooms = 0;
  let conflictData: ChartDatum[] = [];
  let occupancyData: ChartDatum[] = [
    { name: "Over (>100%)", value: 0 }, { name: "Optimal (70-100%)", value: 0 },
    { name: "Under (30-69%)", value: 0 }, { name: "Low (<30%)", value: 0 },
  ];
  let unusedData: ChartDatum[] = [];
  try {
    [roomCount, scheduleCount, ticketCount, rooms, dayCounts, roomsWithUsage] = await Promise.all([
      prisma.room.count({ where: roomWhere }),
      prisma.schedule.count({ where: scheduleWhere }),
      prisma.ticket.count({ where: ticketWhere }),
      prisma.room.findMany({ where: roomWhere, take: 8, orderBy: { code: "asc" } }),
      prisma.schedule.groupBy({ by: ["day"], where: scheduleWhere, _count: { _all: true } }),
      prisma.room.findMany({
        where: roomWhere,
        include: { _count: { select: { schedules: { where: { active: true } } } } },
        orderBy: { code: "asc" },
      }),
    ]);
    const dayNames: Record<Day, string> = { MINGGU: "Minggu", SENIN: "Senin", SELASA: "Selasa", RABU: "Rabu", KAMIS: "Kamis", JUMAT: "Jumat", SABTU: "Sabtu" };
    const countMap = new Map(dayCounts.map((item) => [item.day, item._count._all]));
    dailyData = (Object.keys(dayNames) as Day[]).map((day) => ({ name: dayNames[day], value: countMap.get(day) ?? 0 }));
    idleRooms = roomsWithUsage.filter((room) => room._count.schedules === 0).length;
    const conflictCount = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Schedule" a
      JOIN "Schedule" b ON a."roomId" = b."roomId" AND a."day" = b."day" AND a."id" < b."id"
      WHERE a."active" = true AND b."active" = true
        AND a."startMinutes" < b."endMinutes" AND b."startMinutes" < a."endMinutes"
        AND (a."scheduledDate" IS NULL OR b."scheduledDate" IS NULL OR a."scheduledDate" = b."scheduledDate")
        AND (${!["KAPRODI", "SARPRAS"].includes(user.role)} OR EXISTS (
          SELECT 1 FROM "Room" r WHERE r.id = a."roomId" AND ${user.faculty} = ANY(r."faculties")
        ))
    `;
    conflicts = Number(conflictCount[0]?.count ?? 0);

    occupancyData = [
      { name: "Over (>100%)", value: 0 }, { name: "Optimal (70-100%)", value: 0 },
      { name: "Under (30-69%)", value: 0 }, { name: "Low (<30%)", value: 0 },
    ];
    const usedRooms = roomsWithUsage.filter((room) => room._count.schedules > 0);
    const averageSchedules = usedRooms.length ? scheduleCount / usedRooms.length / 6 : 0;
    for (const room of usedRooms) {
      const ratio = averageSchedules ? room._count.schedules / (averageSchedules * 6) : 0;
      if (ratio > 1) occupancyData[0].value += 1;
      else if (ratio >= .7) occupancyData[1].value += 1;
      else if (ratio >= .3) occupancyData[2].value += 1;
      else occupancyData[3].value += 1;
    }

    const unusedByBuilding = new Map<string, number>();
    for (const room of roomsWithUsage.filter((room) => room._count.schedules === 0)) {
      const building = room.building?.trim() || "Lainnya";
      unusedByBuilding.set(building, (unusedByBuilding.get(building) ?? 0) + 1);
    }
    unusedData = [...unusedByBuilding.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  } catch {}

  const configured = roomCount > 0 || scheduleCount > 0;
  return (
    <main className="workspace-main">
      <header className="dashboard-header">
        <div>
          <span className="page-kicker">Direktorat Akademik / Intelligence Hub</span>
          <h1>Operasional Ruang &amp; Roster</h1>
          <p className="page-description">Pemantauan terintegrasi jadwal, kapasitas, dan utilisasi ruang kampus.</p>
        </div>
        <div className="header-actions">
          <div className="period-chip"><span>Periode aktif</span><strong>Semester Ganjil</strong></div>
          <Link href="/rooms" className="sync-button">Buka inventaris <span>↗</span></Link>
        </div>
      </header>
      {!configured && <div className="setup-panel"><strong>Database belum terhubung</strong><p>Salin <code>.env.example</code> menjadi <code>.env.local</code>, isi Neon connection string, lalu jalankan migrasi dan seed.</p><code>npm run db:deploy &amp;&amp; npm run db:seed</code></div>}
      <section className="dashboard-content">
        <div className="insight-banner">
          <div className="insight-mark">i</div>
          <div><span>Ringkasan sistem</span><strong>{idleRooms.toLocaleString("id-ID")} ruangan belum memiliki jadwal aktif.</strong></div>
          <Link href="/rooms">Review kebutuhan ruang <span>→</span></Link>
        </div>
        <div className="metrics-grid">
          <article className="metric-card metric-primary"><div className="metric-top"><span>Portofolio jadwal</span><small>AKTIF</small></div><strong>{scheduleCount.toLocaleString("id-ID")}</strong><p>Jadwal perkuliahan terdaftar</p></article>
          <article className="metric-card metric-danger"><div className="metric-top"><span>Perlu perhatian</span><small>{conflicts ? "TINDAKAN" : "STABIL"}</small></div><strong>{conflicts.toLocaleString("id-ID")}</strong><p>Kasus jadwal bentrok terdeteksi</p></article>
          <article className="metric-card"><div className="metric-top"><span>Cakupan ruangan</span><small>{roomCount ? Math.round(((roomCount - idleRooms) / roomCount) * 100) : 0}%</small></div><strong>{(roomCount - idleRooms).toLocaleString("id-ID")}</strong><p>Dari {roomCount.toLocaleString("id-ID")} ruangan aktif digunakan</p></article>
          <article className="metric-card"><div className="metric-top"><span>Antrean layanan</span><small>{ticketCount ? "TERBUKA" : "BERSIH"}</small></div><strong>{ticketCount.toLocaleString("id-ID")}</strong><p>Permohonan ruang seluruh status</p></article>
        </div>
        <DashboardCharts conflicts={conflictData} occupancy={occupancyData} daily={dailyData} unusedRooms={unusedData} />
      </section>
    </main>
  );
}
