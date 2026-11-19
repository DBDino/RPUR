import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { Pagination } from "@/components/pagination";
import { can } from "@/lib/rbac";
import { roomFacultyWhere } from "@/lib/faculty-scope";
import { expireRoomRequests } from "@/lib/room-request-expiration";
import { FACULTIES } from "@/lib/faculties";
import { RoomCreateForm } from "@/components/room-create-form";
import { RoomsTable } from "@/components/rooms-table";

export const dynamic = "force-dynamic";

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ q?: string; building?: string; status?: string; faculty?: string; page?: string }> }) {
  const user = await verifySession();
  if (!user) redirect("/login");
  if (!can(user.role, "rooms")) redirect("/");
  await expireRoomRequests();
  const filters = await searchParams;
  const pageSize = 100;
  const page = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);
  const selectedFaculty = user.role === "ADMIN" && FACULTIES.some(({ name }) => name === filters.faculty)
    ? filters.faculty
    : undefined;
  let rooms: Prisma.RoomGetPayload<{ include: { _count: { select: { schedules: true } } } }>[] = [];
  let total = 0;
  try {
    const where = {
        ...roomFacultyWhere(user),
          ...(selectedFaculty ? { faculties: { has: selectedFaculty } } : {}),
          ...(filters.building ? { building: filters.building } : {}),
        ...(filters.status === "idle" ? { schedules: { none: { active: true } } } : {}),
        ...(filters.status === "active" ? { schedules: { some: { active: true } } } : {}),
        ...(filters.q ? { OR: [
          { code: { contains: filters.q, mode: "insensitive" } },
          { name: { contains: filters.q, mode: "insensitive" } },
        ] } : {}),
      } satisfies Prisma.RoomWhereInput;
    [rooms, total] = await Promise.all([
      prisma.room.findMany({
      where,
      orderBy: { code: "asc" },
      include: { _count: { select: { schedules: { where: { active: true } } } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      }),
      prisma.room.count({ where }),
    ]);
  } catch {}
  return (
    <main className="workspace-main">
      <header className="dashboard-header">
        <div><h1>Master Data Ruangan</h1><p>Daftar fasilitas dan pemanfaatan ruang aktif</p></div>
      </header>
      <section className="dashboard-content">
        <form className={`filter-bar room-filter-bar${user.role === "ADMIN" ? " room-filter-bar-admin" : ""}`} method="get">
          <label>Telusuri<input name="q" defaultValue={filters.q ?? ""} placeholder="Kode atau nama ruangan" /></label>
          <label>Gedung<input name="building" defaultValue={filters.building ?? ""} placeholder="Contoh: Graha" /></label>
          <label>Status<select name="status" defaultValue={filters.status ?? ""}><option value="">Semua</option><option value="active">Aktif terjadwal</option><option value="idle">Idle</option></select></label>
          {user.role === "ADMIN" && <label>Fakultas<select name="faculty" defaultValue={selectedFaculty ?? ""}><option value="">Semua fakultas</option>{FACULTIES.map(({ name }) => <option key={name} value={name}>{name}</option>)}</select></label>}
          <button type="submit">Terapkan filter</button>
        </form>
        {can(user.role, "rooms", "add") && (
          <details className="entry-card">
            <summary className="entry-card-summary">
              <span className="entry-card-title">
                <svg className="entry-card-chevron" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Tambah Ruang
              </span>
              <span className="entry-card-hint">Klik untuk membuka / menutup form input</span>
            </summary>
            <RoomCreateForm userRole={user.role} userFaculty={user.faculty} />
          </details>
        )}
        <RoomsTable
          rooms={rooms}
          canUpdate={can(user.role, "rooms", "update")}
          canDelete={can(user.role, "rooms", "delete")}
          userRole={user.role}
          userFaculty={user.faculty}
        />
        <Pagination page={page} pageSize={pageSize} total={total} query={{ q: filters.q, building: filters.building, status: filters.status, faculty: selectedFaculty }} />
      </section>
    </main>
  );
}
