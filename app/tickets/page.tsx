import { prisma } from "@/lib/prisma";
import { minutesToTime } from "@/lib/time";
import { createTicket, decideTicket, deleteTicket } from "./actions";
import { TicketStatus, type Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { Pagination } from "@/components/pagination";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const user = await verifySession();
  if (!user) redirect("/login");
  if (!can(user.role, "tickets")) redirect("/");
  const filters = await searchParams;
  const pageSize = 100;
  const page = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);
  let rooms: { id: string; code: string; name: string }[] = [];
  let tickets: Prisma.TicketGetPayload<{ include: { targetRoom: true; submitter: true; flags: true } }>[] = [];
  let total = 0;
  try {
    rooms = await prisma.room.findMany({ where: { active: true }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } });
    const where = {
        ...(["KAPRODI", "VIEWER"].includes(user.role) ? { submitterId: user.id } : {}),
        ...(filters.status && Object.values(TicketStatus).includes(filters.status as TicketStatus) ? { status: filters.status as TicketStatus } : {}),
        ...(filters.q ? { OR: [
          { purpose: { contains: filters.q, mode: "insensitive" } },
          { targetRoom: { OR: [
            { code: { contains: filters.q, mode: "insensitive" } },
            { name: { contains: filters.q, mode: "insensitive" } },
          ] } },
        ] } : {}),
      } satisfies Prisma.TicketWhereInput;
    [tickets, total] = await Promise.all([prisma.ticket.findMany({
      where,
      include: { targetRoom: true, submitter: true, flags: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }), prisma.ticket.count({ where })]);
  } catch {}
  return (
    <main className="workspace-main">
      <header className="dashboard-header">
        <div><h1>Pengajuan dan Peninjauan Ruangan</h1><p>Tindak lanjut tiket peminjaman dan perubahan jadwal</p></div>
      </header>
      <section className="dashboard-content page-section">
        <form className="filter-bar" method="get">
          <label>Telusuri<input name="q" defaultValue={filters.q ?? ""} placeholder="Ruangan atau tujuan" /></label>
          <label>Status<select name="status" defaultValue={filters.status ?? ""}><option value="">Semua status</option><option value="DIAJUKAN">Diajukan</option><option value="DISETUJUI">Disetujui</option><option value="DITOLAK">Ditolak</option></select></label>
          <button type="submit">Terapkan filter</button>
        </form>
        {can(user.role, "tickets", "add") && <form action={createTicket} className="ticket-form">
          <select name="roomId" required><option value="">Pilih ruangan</option>{rooms.map(room => <option value={room.id} key={room.id}>{room.code} — {room.name}</option>)}</select>
          <select name="day" required><option value="SENIN">Senin</option><option value="SELASA">Selasa</option><option value="RABU">Rabu</option><option value="KAMIS">Kamis</option><option value="JUMAT">Jumat</option><option value="SABTU">Sabtu</option></select>
          <input name="startTime" type="time" required /><input name="endTime" type="time" required />
          <input name="students" type="number" min="1" placeholder="Jumlah mahasiswa" required /><input name="purpose" placeholder="Tujuan penggunaan" required />
          <button type="submit">Ajukan tiket</button>
        </form>}
        <div className="section-heading"><div><div className="eyebrow">{["ADMIN", "SARPRAS"].includes(user.role) ? "Antrean peninjauan" : "Pengajuan Anda"}</div><h2>{["ADMIN", "SARPRAS"].includes(user.role) ? "Semua tiket" : "Status pengajuan"}</h2></div></div>
        <div className="table-wrap"><table><thead><tr><th>Ruangan</th><th>Waktu</th><th>Peserta</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>{tickets.map(ticket => <tr key={ticket.id}><td><strong>{ticket.targetRoom.code}</strong><br /><small>{ticket.purpose}</small>{ticket.flags.length > 0 && <div className="ticket-warning">⚠ {ticket.flags.length} perhatian</div>}</td><td>{ticket.targetDay}<br />{minutesToTime(ticket.startMinutes)}–{minutesToTime(ticket.endMinutes)}</td><td>{ticket.enrolledStudents}</td><td><span className="badge">{ticket.status}</span></td>
            <td className="ticket-action-cell">
              {ticket.status === "DIAJUKAN" && can(user.role, "tickets", "update") && (
                <form action={decideTicket} className="decision-form">
                  <input type="hidden" name="ticketId" value={ticket.id} />
                  <input name="notes" placeholder="Catatan keputusan" />
                  <button name="decision" value="APPROVE">Setujui</button>
                  <button className="reject-button" name="decision" value="REJECT">Tolak</button>
                </form>
              )}
              {can(user.role, "tickets", "delete") && (
                <form action={deleteTicket} className="delete-form">
                  <input type="hidden" name="ticketId" value={ticket.id} />
                  <button type="submit" className="danger-button">Hapus tiket</button>
                </form>
              )}
            </td>
          </tr>)}
          {!tickets.length && <tr><td colSpan={5}>Belum ada tiket.</td></tr>}</tbody>
        </table></div>
        <Pagination page={page} pageSize={pageSize} total={total} query={{ q: filters.q, status: filters.status }} />
      </section>
    </main>
  );
}
