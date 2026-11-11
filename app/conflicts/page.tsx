import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { minutesToTime } from "@/lib/time";
import { can } from "@/lib/rbac";
import { roomFacultyWhere } from "@/lib/faculty-scope";
import { expireRoomRequests } from "@/lib/room-request-expiration";

export const dynamic = "force-dynamic";

export default async function ConflictsPage({ searchParams }: { searchParams: Promise<{ day?: string; room?: string }> }) {
  const user = await verifySession();
  if (!user) redirect("/login");
  if (!can(user.role, "conflicts")) redirect("/");
  await expireRoomRequests();
  const filters = await searchParams;
  const conflicts = await prisma.$queryRaw<Array<{ pairId: string; roomCode: string; roomName: string; day: string; firstStart: number; firstEnd: number; secondStart: number; secondEnd: number; firstCourse: string | null; secondCourse: string | null }>>`
    SELECT
      a.id || ':' || b.id AS "pairId",
      r.code AS "roomCode", r.name AS "roomName", a.day,
      a."startMinutes" AS "firstStart", a."endMinutes" AS "firstEnd",
      b."startMinutes" AS "secondStart", b."endMinutes" AS "secondEnd",
      ca.name AS "firstCourse", cb.name AS "secondCourse"
    FROM "Schedule" a
    JOIN "Schedule" b ON a."roomId" = b."roomId" AND a.day = b.day AND a.id < b.id
      AND (a."scheduledDate" IS NULL OR b."scheduledDate" IS NULL OR a."scheduledDate" = b."scheduledDate")
    JOIN "Room" r ON r.id = a."roomId"
    LEFT JOIN "Course" ca ON ca.id = a."courseId"
    LEFT JOIN "Course" cb ON cb.id = b."courseId"
    WHERE a.active = true AND b.active = true
      AND a."startMinutes" < b."endMinutes" AND b."startMinutes" < a."endMinutes"
      AND (${filters.day ?? null}::text IS NULL OR a.day::text = ${filters.day})
      AND (${filters.room ?? null}::text IS NULL OR a."roomId" = ${filters.room})
      AND (${!["KAPRODI", "SARPRAS"].includes(user.role)} OR ${user.faculty} = ANY(r.faculties))
    ORDER BY r.code, a.day, a."startMinutes"
    LIMIT 100
  `;
  const rooms = await prisma.room.findMany({ where: roomFacultyWhere(user), select: { id: true, code: true }, orderBy: { code: "asc" }, take: 500 });
  return (
    <main className="workspace-main">
      <header className="dashboard-header"><div><span className="page-kicker">Roster / Deteksi Konflik</span><h1>Peninjauan Jadwal Bentrok</h1><p>Pasangan jadwal yang saling tumpang tindih pada ruang dan hari yang sama.</p></div></header>
      <section className="dashboard-content">
        <form className="filter-bar" method="get">
          <label>Hari<select name="day" defaultValue={filters.day ?? ""}><option value="">Semua hari</option>{["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"].map((day) => <option key={day}>{day}</option>)}</select></label>
          <label>Ruangan<select name="room" defaultValue={filters.room ?? ""}><option value="">Semua ruangan</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.code}</option>)}</select></label>
          <button type="submit">Terapkan</button>
        </form>
        <div className="table-wrap"><table><thead><tr><th>Ruangan</th><th>Hari</th><th>Pasangan Jadwal</th><th>Status Deteksi</th></tr></thead><tbody>
          {conflicts.map((conflict) => <tr key={conflict.pairId}><td><strong>{conflict.roomCode}</strong><br /><small>{conflict.roomName}</small></td><td>{conflict.day}</td><td><strong>{conflict.firstCourse ?? "Jadwal A"}</strong> {minutesToTime(conflict.firstStart)}–{minutesToTime(conflict.firstEnd)}<br /><strong>{conflict.secondCourse ?? "Jadwal B"}</strong> {minutesToTime(conflict.secondStart)}–{minutesToTime(conflict.secondEnd)}</td><td><span className="status-pill danger">Bentrok</span></td></tr>)}
          {!conflicts.length && <tr><td colSpan={4}>Tidak ditemukan bentrok pada filter ini.</td></tr>}
        </tbody></table></div>
      </section>
    </main>
  );
}
