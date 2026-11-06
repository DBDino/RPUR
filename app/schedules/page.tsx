import { redirect } from "next/navigation";
import { Day } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { minutesToTime } from "@/lib/time";
import { Pagination } from "@/components/pagination";
import Link from "next/link";
import { can } from "@/lib/rbac";
import { deleteSchedule, saveSchedule } from "./actions";

export const dynamic = "force-dynamic";

export default async function SchedulesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; day?: string; room?: string; page?: string }>;
}) {
  const user = await verifySession();
  if (!user) redirect("/login");
  if (!can(user.role, "schedules")) redirect("/");
  const filters = await searchParams;
  const query = filters.q?.trim() ?? "";
  const pageSize = 100;
  const page = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);
  const selectedDay = filters.day && Object.values(Day).includes(filters.day as Day) ? filters.day as Day : undefined;
  const [rooms, schedules, total] = await Promise.all([
    prisma.room.findMany({ select: { id: true, code: true, name: true }, orderBy: { code: "asc" } }),
    prisma.schedule.findMany({
    where: {
      ...(selectedDay ? { day: selectedDay } : {}),
      ...(filters.room ? { roomId: filters.room } : {}),
      ...(query ? {
        OR: [
          { className: { contains: query, mode: "insensitive" } },
          { course: { is: { OR: [
            { code: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
          ] } } },
          { room: { OR: [
            { code: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
          ] } },
        ],
      } : {}),
    },
    include: { room: true, course: true },
    orderBy: [{ day: "asc" }, { startMinutes: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    }),
    prisma.schedule.count({
      where: {
        ...(selectedDay ? { day: selectedDay } : {}),
        ...(filters.room ? { roomId: filters.room } : {}),
        ...(query ? { OR: [
          { className: { contains: query, mode: "insensitive" } },
          { course: { is: { OR: [
            { code: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
          ] } } },
          { room: { OR: [
            { code: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
          ] } },
        ] } : {}),
      },
    }),
  ]);

  return (
    <main className="workspace-main">
      <header className="dashboard-header">
        <div><span className="page-kicker">Roster / Master Data</span><h1>Master Jadwal</h1></div>
      </header>
      <section className="dashboard-content">
        <form className="filter-bar" method="get">
          <label>Telusuri<input name="q" placeholder="Kode, mata kuliah, kelas, atau ruang" defaultValue={query} /></label>
          <label>Hari<select name="day" defaultValue={filters.day ?? ""}><option value="">Semua hari</option>{(["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"] as Day[]).map((day) => <option key={day} value={day}>{day}</option>)}</select></label>
          <label>Ruangan<select name="room" defaultValue={filters.room ?? ""}><option value="">Semua ruangan</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.code}</option>)}</select></label>
          <button type="submit">Terapkan filter</button>
        </form>
        {(can(user.role, "schedules", "add")) && (
          <details className="filter-bar">
            <summary>Tambah jadwal</summary>
            <form action={saveSchedule} className="filter-bar">
              <label>Ruangan<select name="roomId" required>{rooms.map(room => <option key={room.id} value={room.id}>{room.code} - {room.name}</option>)}</select></label>
              <label>Hari<select name="day" required>{Object.values(Day).map(day => <option key={day} value={day}>{day}</option>)}</select></label>
              <label>Mulai<input name="startTime" type="time" required /></label>
              <label>Selesai<input name="endTime" type="time" required /></label>
              <label>Peserta<input name="students" type="number" min="0" defaultValue="0" required /></label>
              <label>Kelas<input name="className" /></label>
              <button type="submit">Simpan jadwal</button>
            </form>
          </details>
        )}
        <div className="data-toolbar"><strong>{total.toLocaleString("id-ID")} jadwal ditemukan</strong><span>100 data per halaman</span></div>
        <div className="table-wrap"><table><thead><tr><th>Hari &amp; Waktu</th><th>Ruang</th><th>Mata Kuliah</th><th>Kelas</th><th>Peserta</th><th>Utilisasi</th>{can(user.role, "schedules", "delete") && <th>Aksi</th>}</tr></thead>
          <tbody>{schedules.map((schedule) => {
            const ratio = schedule.room.capacitySeat ? schedule.enrolledStudents / schedule.room.capacitySeat * 100 : 0;
            const utilization = ratio > 100 ? "Over capacity" : ratio >= 70 ? "Optimal" : ratio >= 30 ? "Under" : "Belum terklasifikasi";
            return <tr key={schedule.id}><td><strong>{schedule.day}</strong><br />{minutesToTime(schedule.startMinutes)}–{minutesToTime(schedule.endMinutes)}</td><td><strong>{schedule.room.code}</strong><br /><small>{schedule.room.name}</small></td><td><Link href={`/schedules/${schedule.id}`}>{schedule.course?.name ?? "-"}</Link></td><td>{schedule.className ?? "-"}</td><td>{schedule.enrolledStudents}</td><td><span className={`status-pill ${ratio > 100 ? "danger" : ratio >= 70 ? "success" : ""}`}>{utilization} · {Math.round(ratio)}%</span></td>{can(user.role, "schedules", "delete") && <td><form action={deleteSchedule} className="delete-form"><input type="hidden" name="id" value={schedule.id} /><button className="danger-button" type="submit">Hapus jadwal</button></form></td>}</tr>;
          })}</tbody>
        </table></div>
        <Pagination page={page} pageSize={pageSize} total={total} query={{ q: filters.q, day: filters.day, room: filters.room }} />
      </section>
    </main>
  );
}
