import { redirect } from "next/navigation";
import { Day } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ day?: string; building?: string }> }) {
  const user = await verifySession();
  if (!user) redirect("/login");
  if (!can(user.role, "analytics")) redirect("/");
  const filters = await searchParams;
  const selectedDay = filters.day && Object.values(Day).includes(filters.day as Day) ? filters.day as Day : undefined;
  const buildings = await prisma.room.findMany({ where: { building: { not: null } }, select: { building: true }, distinct: ["building"], orderBy: { building: "asc" } });
  const rooms = await prisma.room.findMany({
    where: { ...(filters.building ? { building: filters.building } : {}) },
    include: { schedules: { where: { active: true, ...(selectedDay ? { day: selectedDay } : {}) } } },
    orderBy: { code: "asc" },
    take: 80,
  });
  const occupancy = rooms.map((room) => {
    const minutes = room.schedules.reduce((sum, schedule) => sum + schedule.endMinutes - schedule.startMinutes, 0);
    return { code: room.code, name: room.name, minutes, ratio: Math.round(minutes / room.maxDailyMinutes * 100), scheduleCount: room.schedules.length };
  });

  return (
    <main className="workspace-main">
      <header className="dashboard-header"><div><span className="page-kicker">Utilisasi / Analisis</span><h1>Analitik Ruang</h1></div></header>
      <section className="dashboard-content">
        <form className="filter-bar" method="get">
          <label>Hari<select name="day" defaultValue={filters.day ?? ""}><option value="">Rata-rata semua hari</option>{(["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"] as Day[]).map((day) => <option key={day} value={day}>{day}</option>)}</select></label>
          <label>Gedung<select name="building" defaultValue={filters.building ?? ""}><option value="">Semua gedung</option>{buildings.map((item) => item.building && <option key={item.building} value={item.building}>{item.building}</option>)}</select></label>
          <button type="submit">Analisis</button>
        </form>
        <div className="analytics-grid">
          <article className="insight-card"><span>Basis analisis</span><strong>{selectedDay ?? "Semua hari"}</strong><p>Total durasi dibagi batas harian ruangan (360 menit).</p></article>
          <article className="insight-card warning"><span>Perlu tinjauan</span><strong>{occupancy.filter((item) => item.ratio > 100).length}</strong><p>Ruangan melewati batas okupansi waktu.</p></article>
          <article className="insight-card"><span>Ruang idle pada filter</span><strong>{occupancy.filter((item) => item.scheduleCount === 0).length}</strong><p>Belum memiliki jadwal aktif pada cakupan filter.</p></article>
        </div>
        <div className="table-wrap"><table><thead><tr><th>Ruangan</th><th>Jumlah Jadwal</th><th>Menit Terpakai</th><th>Okupansi</th><th>Status</th></tr></thead>
          <tbody>{occupancy.map((item) => <tr key={item.code}><td><strong>{item.code}</strong><br /><small>{item.name}</small></td><td>{item.scheduleCount}</td><td>{item.minutes} menit</td><td><div className="progress"><span style={{ width: `${Math.min(item.ratio, 100)}%` }} /></div>{item.ratio}%</td><td><span className={`status-pill ${item.ratio > 100 ? "danger" : item.scheduleCount === 0 ? "" : "success"}`}>{item.ratio > 100 ? "Over 100%" : item.scheduleCount === 0 ? "Idle" : item.ratio >= 70 ? "Optimal" : "Underutilized"}</span></td></tr>)}</tbody>
        </table></div>
      </section>
    </main>
  );
}
