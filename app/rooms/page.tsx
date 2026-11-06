import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { Pagination } from "@/components/pagination";
import Link from "next/link";
import { can } from "@/lib/rbac";
import { deleteRoom, saveRoom } from "./actions";

export const dynamic = "force-dynamic";

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ q?: string; building?: string; status?: string; page?: string }> }) {
  const user = await verifySession();
  if (!user) redirect("/login");
  if (!can(user.role, "rooms")) redirect("/");
  const filters = await searchParams;
  const pageSize = 100;
  const page = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);
  let rooms: Prisma.RoomGetPayload<{ include: { _count: { select: { schedules: true } } } }>[] = [];
  let total = 0;
  try {
    const where = {
        ...(filters.building ? { building: filters.building } : {}),
        ...(filters.status === "idle" ? { schedules: { none: {} } } : {}),
        ...(filters.status === "active" ? { schedules: { some: {} } } : {}),
        ...(filters.q ? { OR: [
          { code: { contains: filters.q, mode: "insensitive" } },
          { name: { contains: filters.q, mode: "insensitive" } },
        ] } : {}),
      } satisfies Prisma.RoomWhereInput;
    [rooms, total] = await Promise.all([
      prisma.room.findMany({
      where,
      orderBy: { code: "asc" },
      include: { _count: { select: { schedules: true } } },
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
        {can(user.role, "rooms", "add") && (
          <details className="filter-bar">
            <summary>Tambah ruang</summary>
            <form action={saveRoom} className="filter-bar">
              <label>Kode<input name="code" required /></label>
              <label>Nama<input name="name" required /></label>
              <label>Gedung<input name="building" /></label>
              <label>Lantai<input name="floor" /></label>
              <label>Kapasitas<input name="capacitySeat" type="number" min="1" required /></label>
              <label>Maks. menit/hari<input name="maxDailyMinutes" type="number" min="1" defaultValue="360" /></label>
              <button type="submit">Simpan ruang</button>
            </form>
          </details>
        )}
        <form className="filter-bar" method="get">
          <label>Telusuri<input name="q" defaultValue={filters.q ?? ""} placeholder="Kode atau nama ruangan" /></label>
          <label>Gedung<input name="building" defaultValue={filters.building ?? ""} placeholder="Contoh: Graha" /></label>
          <label>Status<select name="status" defaultValue={filters.status ?? ""}><option value="">Semua</option><option value="active">Aktif terjadwal</option><option value="idle">Idle</option></select></label>
          <button type="submit">Terapkan filter</button>
        </form>
        <div className="table-wrap"><table><thead><tr><th>Kode</th><th>Nama</th><th>Gedung</th><th>Kapasitas</th><th>Jadwal</th>{can(user.role, "rooms", "update") && <th>Aksi</th>}</tr></thead>
          <tbody>{rooms.map(room => <tr key={room.id}><td><Link href={`/rooms/${room.id}`}><code>{room.code}</code></Link></td><td>{room.name}</td><td>{room.building ?? "-"}</td><td>{room.capacitySeat} kursi</td><td>{room._count.schedules}</td>{can(user.role, "rooms", "update") && <td><details><summary>Edit</summary><form action={saveRoom}>
            <input type="hidden" name="id" value={room.id} /><input name="code" defaultValue={room.code} required /><input name="name" defaultValue={room.name} required /><input name="building" defaultValue={room.building ?? ""} /><input name="floor" defaultValue={room.floor ?? ""} /><input name="capacitySeat" type="number" defaultValue={room.capacitySeat} required /><input name="maxDailyMinutes" type="number" defaultValue={room.maxDailyMinutes} required /><button type="submit">Perbarui</button>
          </form>{can(user.role, "rooms", "delete") && <form action={deleteRoom} className="delete-form"><input type="hidden" name="id" value={room.id} /><button className="danger-button" type="submit">Hapus ruang</button></form>}</details></td>}</tr>)}
          {!rooms.length && <tr><td colSpan={5}>Belum ada data ruangan. Jalankan seed setelah database terhubung.</td></tr>}</tbody>
        </table></div>
        <Pagination page={page} pageSize={pageSize} total={total} query={{ q: filters.q, building: filters.building, status: filters.status }} />
      </section>
    </main>
  );
}
