import { redirect } from "next/navigation";
import { Day, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { minutesToTime } from "@/lib/time";
import { Pagination } from "@/components/pagination";
import Link from "next/link";
import { can } from "@/lib/rbac";
import { roomFacultyWhere } from "@/lib/faculty-scope";
import { FACULTIES } from "@/lib/faculties";
import { deleteSchedule, saveSchedule } from "./actions";

export const dynamic = "force-dynamic";

export default async function SchedulesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; day?: string; room?: string; faculty?: string; page?: string }>;
}) {
  const user = await verifySession();
  if (!user) redirect("/login");
  if (!can(user.role, "schedules")) redirect("/");
  const filters = await searchParams;
  const query = filters.q?.trim() ?? "";
  const pageSize = 100;
  const page = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);
  const selectedDay = filters.day && Object.values(Day).includes(filters.day as Day) ? filters.day as Day : undefined;
  const selectedFaculty = user.role === "ADMIN" && FACULTIES.some(({ name }) => name === filters.faculty)
    ? filters.faculty
    : undefined;
  const roomFilter: Prisma.RoomWhereInput = {
    ...roomFacultyWhere(user),
    ...(selectedFaculty ? { faculties: { has: selectedFaculty } } : {}),
    ...(filters.room?.trim() ? { code: { contains: filters.room.trim(), mode: "insensitive" } } : {}),
  };
  const hasRoomFilter = Object.keys(roomFilter).length > 0;
  const where: Prisma.ScheduleWhereInput = {
    active: true,
    ...(selectedDay ? { day: selectedDay } : {}),
    ...(hasRoomFilter ? { room: { is: roomFilter } } : {}),
    ...(query ? {
      OR: [
        { className: { contains: query, mode: "insensitive" } },
        { course: { is: { OR: [
          { code: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ] } } },
        { room: { is: { OR: [
          { code: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ] } } },
      ],
    } : {}),
  };
  const [schedules, total] = await Promise.all([
    prisma.schedule.findMany({
      where,
      select: {
        id: true,
        scheduledDate: true,
        roomId: true,
        day: true,
        startMinutes: true,
        endMinutes: true,
        enrolledStudents: true,
        className: true,
        ticketId: true,
        room: { select: { code: true, name: true, capacitySeat: true } },
        course: { select: { name: true } },
      },
      orderBy: [{ day: "asc" }, { startMinutes: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.schedule.count({ where }),
  ]);

  return (
    <main className="workspace-main">
      <header className="dashboard-header">
        <div><span className="page-kicker">Roster / Master Data</span><h1>Master Jadwal</h1></div>
      </header>
      <section className="dashboard-content">
        <form className={`filter-bar schedule-filter-bar${user.role === "ADMIN" ? " schedule-filter-bar-admin" : ""}`} method="get">
          <label>Telusuri<input name="q" placeholder="Kode, mata kuliah, kelas, atau ruang" defaultValue={query} /></label>
          <label>Hari<select name="day" defaultValue={filters.day ?? ""}><option value="">Semua hari</option>{(["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"] as Day[]).map((day) => <option key={day} value={day}>{day}</option>)}</select></label>
          <label>Kode ruangan<input name="room" placeholder="Cari kode ruangan" defaultValue={filters.room ?? ""} /></label>
          {user.role === "ADMIN" && <label>Fakultas<select name="faculty" defaultValue={selectedFaculty ?? ""}><option value="">Semua fakultas</option>{FACULTIES.map(({ name }) => <option key={name} value={name}>{name}</option>)}</select></label>}
          <button type="submit">Terapkan filter</button>
        </form>
        {(can(user.role, "schedules", "add")) && (
          <details className="filter-bar">
            <summary>Tambah jadwal</summary>
            <form action={saveSchedule} className="filter-bar">
              <label>Kode ruangan<input name="roomCode" placeholder="Masukkan kode ruangan" required /></label>
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
        <div className="table-wrap"><table><thead><tr><th>Hari &amp; Waktu</th><th>Ruang</th><th>Mata Kuliah</th><th>Kelas</th><th>Peserta</th><th>Utilisasi</th>{(can(user.role, "schedules", "update") || can(user.role, "schedules", "delete")) && <th>Aksi</th>}</tr></thead>
          <tbody>{schedules.map((schedule) => {
            const ratio = schedule.room.capacitySeat ? schedule.enrolledStudents / schedule.room.capacitySeat * 100 : 0;
            const utilization = ratio > 100 ? "Over capacity" : ratio >= 70 ? "Optimal" : ratio >= 30 ? "Under" : "Belum terklasifikasi";
            return <tr key={schedule.id}><td><strong>{schedule.scheduledDate ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(schedule.scheduledDate) : schedule.day}</strong><br />{minutesToTime(schedule.startMinutes)}–{minutesToTime(schedule.endMinutes)}</td><td><strong>{schedule.room.code}</strong><br /><small>{schedule.room.name}</small></td><td><Link href={`/schedules/${schedule.id}`}>{schedule.course?.name ?? "-"}</Link></td><td>{schedule.className ?? "-"}</td><td>{schedule.enrolledStudents}</td><td><span className={`status-pill ${ratio > 100 ? "danger" : ratio >= 70 ? "success" : ""}`}>{utilization} · {Math.round(ratio)}%</span></td>{(can(user.role, "schedules", "update") || can(user.role, "schedules", "delete")) && <td>
              {can(user.role, "schedules", "update") && !schedule.ticketId && <details><summary>Edit jadwal</summary><form action={saveSchedule} className="decision-form schedule-edit-form">
                <input type="hidden" name="id" value={schedule.id} />
                <label>Kode ruangan<input name="roomCode" defaultValue={schedule.room.code} required /></label>
                <label>Hari<select name="day" defaultValue={schedule.day} required>{Object.values(Day).map((day) => <option value={day} key={day}>{day}</option>)}</select></label>
                <label>Jam mulai<input name="startTime" type="time" defaultValue={minutesToTime(schedule.startMinutes)} required /></label>
                <label>Jam selesai<input name="endTime" type="time" defaultValue={minutesToTime(schedule.endMinutes)} required /></label>
                <label>Peserta<input name="students" type="number" min="0" defaultValue={schedule.enrolledStudents} required /></label>
                <label>Kelas<input name="className" defaultValue={schedule.className ?? ""} /></label>
                <button type="submit">Simpan perubahan</button>
              </form></details>}
              {schedule.ticketId && <small>Jadwal permintaan ruangan dikelola melalui tiket.</small>}
              {can(user.role, "schedules", "delete") && <form action={deleteSchedule} className="delete-form"><input type="hidden" name="id" value={schedule.id} /><button className="danger-button" type="submit">Hapus jadwal</button></form>}
            </td>}</tr>;
          })}</tbody>
        </table></div>
        <Pagination page={page} pageSize={pageSize} total={total} query={{ q: filters.q, day: filters.day, room: filters.room, faculty: selectedFaculty }} />
      </section>
    </main>
  );
}
