import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { minutesToTime } from "@/lib/time";
import { can } from "@/lib/rbac";
import { roomFacultyWhere } from "@/lib/faculty-scope";
import { expireRoomRequests } from "@/lib/room-request-expiration";

export const dynamic = "force-dynamic";

export default async function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await verifySession();
  if (!user) redirect("/login");
  if (!can(user.role, "rooms")) redirect("/");
  await expireRoomRequests();
  const { id } = await params;
  const room = await prisma.room.findFirst({
    where: { id, ...roomFacultyWhere(user) },
    include: { schedules: { where: { active: true }, include: { course: true }, orderBy: [{ day: "asc" }, { startMinutes: "asc" }] } },
  });
  if (!room) notFound();
  return (
    <main className="workspace-main">
      <header className="dashboard-header"><div><Link href="/rooms" className="page-kicker">← Kembali ke inventaris</Link><h1>{room.code} · {room.name}</h1><p>{room.faculties.join(", ") || "Fakultas belum ditetapkan"} · {room.building ?? "Lokasi belum ditetapkan"}{room.floor ? ` · Lantai ${room.floor}` : ""}</p></div></header>
      <section className="dashboard-content">
        <div className="analytics-grid">
          <article className="insight-card"><span>Kapasitas kursi</span><strong>{room.capacitySeat}</strong><p>Jumlah tempat duduk normal.</p></article>
          <article className="insight-card"><span>Batas harian</span><strong>{room.maxDailyMinutes}</strong><p>Menit penggunaan per hari.</p></article>
          <article className="insight-card"><span>Jadwal aktif</span><strong>{room.schedules.length}</strong><p>Status ruangan: {room.active ? "Aktif" : "Tidak aktif"}</p></article>
        </div>
        <div className="table-wrap"><table><thead><tr><th>Hari</th><th>Waktu</th><th>Mata Kuliah</th><th>Kelas</th><th>Peserta</th></tr></thead><tbody>
          {room.schedules.map((schedule) => <tr key={schedule.id}><td>{schedule.day}</td><td>{minutesToTime(schedule.startMinutes)}–{minutesToTime(schedule.endMinutes)}</td><td>{schedule.course?.name ?? "-"}</td><td>{schedule.className ?? "-"}</td><td>{schedule.enrolledStudents}</td></tr>)}
          {!room.schedules.length && <tr><td colSpan={5}>Ruangan belum memiliki jadwal aktif.</td></tr>}
        </tbody></table></div>
      </section>
    </main>
  );
}
