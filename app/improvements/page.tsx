import { ImprovementPriority, ImprovementStatus, type Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { createImprovement, deleteImprovement, updateImprovement } from "./actions";
import { can } from "@/lib/rbac";
import { roomFacultyWhere, improvementFacultyWhere } from "@/lib/faculty-scope";
import { FACULTIES } from "@/lib/faculties";
import { FacultyRoomSelect } from "@/components/faculty-room-select";

export const dynamic = "force-dynamic";

export default async function ImprovementsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const user = await verifySession();
  if (!user) redirect("/login");
  if (!can(user.role, "improvements")) redirect("/");
  const filters = await searchParams;
  const statusValid = Object.values(ImprovementStatus).includes(filters.status as ImprovementStatus);
  const sarprasAssigneeFilters: Prisma.UserWhereInput[] = [{ role: "ADMIN" }];
  if (user.faculty) sarprasAssigneeFilters.push({ role: "SARPRAS", faculty: user.faculty });
  const assigneeWhere: Prisma.UserWhereInput = user.role === "SARPRAS"
    ? { OR: sarprasAssigneeFilters }
    : { role: { in: ["ADMIN", "SARPRAS"] } };
  const [tickets, assignees, rooms] = await Promise.all([
    prisma.improvementTicket.findMany({
      where: {
        ...improvementFacultyWhere(user),
        ...(statusValid ? { status: filters.status as ImprovementStatus } : {}),
        ...(filters.q ? { OR: [
          { title: { contains: filters.q, mode: "insensitive" } },
          { description: { contains: filters.q, mode: "insensitive" } },
          { category: { contains: filters.q, mode: "insensitive" } },
        ] } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.user.findMany({ where: assigneeWhere, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.room.findMany({
      where: { ...(user.role === "SARPRAS" ? {} : roomFacultyWhere(user)), active: true },
      select: { id: true, code: true, name: true, faculties: true },
      orderBy: { code: "asc" },
    }),
  ]);
  const canManage = ["ADMIN", "SARPRAS"].includes(user.role);
  const requestFaculties = ["ADMIN", "SARPRAS"].includes(user.role)
    ? FACULTIES.map(({ name }) => name)
    : user.faculty && FACULTIES.some(({ name }) => name === user.faculty) ? [user.faculty] : [];
  return (
    <main className="workspace-main">
      <header className="dashboard-header"><div><span className="page-kicker">Saran Perbaikan / Action Plan</span><h1>Tiket Perbaikan</h1><p>Temuan analitik diterjemahkan menjadi tindak lanjut terukur.</p></div></header>
      <section className="dashboard-content">
        <form className="filter-bar" method="get">
          <label>Cari<input name="q" defaultValue={filters.q ?? ""} placeholder="Judul, kategori, atau uraian" /></label>
          <label>Status<select name="status" defaultValue={filters.status ?? ""}><option value="">Semua status</option>{Object.values(ImprovementStatus).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <button type="submit">Terapkan filter</button>
        </form>
        {can(user.role, "improvements", "add") && <form action={createImprovement} className="ticket-form improvement-form">
          <FacultyRoomSelect faculties={requestFaculties} rooms={rooms} />
          <label>Judul temuan<input name="title" placeholder="Judul temuan" required /></label>
          <label>Kategori<input name="category" placeholder="Misalnya: utilisasi" required /></label>
          <label>Prioritas<select name="priority" defaultValue="SEDANG">{Object.values(ImprovementPriority).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Deskripsi<input name="description" placeholder="Deskripsi temuan dan dampak" required /></label>
          <label>Saran solusi<input name="solution" placeholder="Saran solusi" required /></label>
          <label>Referensi<input name="reference" placeholder="Ruangan, jadwal, atau sumber data" /></label>
          <button type="submit">Buat tiket perbaikan</button>
        </form>}
        <div className="section-heading"><div><div className="eyebrow">{user.role === "SARPRAS" ? "Tiket milik Anda dan fakultas yang dikelola" : user.role === "ADMIN" ? "Semua fakultas" : "Tiket Anda"}</div><h2>Saran dan tindak lanjut perbaikan</h2></div></div>
        <div className="table-wrap"><table><thead><tr><th>Tiket</th><th>Fakultas</th><th>Prioritas</th><th>Status</th><th>{canManage ? "Aksi / Referensi" : "Referensi"}</th></tr></thead>
          <tbody>{tickets.map((ticket) => <tr key={ticket.id}>
            <td><strong>{ticket.title}</strong><br /><small>{ticket.category}</small></td>
            <td>{ticket.faculty ?? "Belum ditetapkan"}{user.role === "SARPRAS" && ticket.creatorId === user.id && <><br /><small>Tiket Anda</small></>}</td>
            <td>{ticket.priority}</td><td><span className="badge">{ticket.status}</span></td>
            <td><details className="ticket-review improvement-review" name="improvement-ticket-details">
              <summary>Lihat deskripsi</summary>
              <div className="ticket-review-panel">
                <p><strong>Deskripsi temuan</strong><br />{ticket.description}</p>
                <p><strong>Saran solusi</strong><br />{ticket.solution}</p>
                <p><strong>Referensi</strong><br />{ticket.reference || "-"}</p>
                {ticket.resolution && <p><strong>Catatan penyelesaian</strong><br />{ticket.resolution}</p>}
                {ticket.evidence && <p><strong>Bukti</strong><br />{ticket.evidence}</p>}
                {(user.role === "ADMIN" || (user.role === "SARPRAS" && ticket.creatorId !== user.id && ticket.faculty === user.faculty)) && <form action={updateImprovement} className="decision-form improvement-actions">
                  <input type="hidden" name="id" value={ticket.id} />
                  <label>Status<select name="status" defaultValue={ticket.status}>{Object.values(ImprovementStatus).map((value) => <option key={value}>{value}</option>)}</select></label>
                  <label>Prioritas<select name="priority" defaultValue={ticket.priority}>{Object.values(ImprovementPriority).map((value) => <option key={value}>{value}</option>)}</select></label>
                  <label>Penanggung jawab<select name="assigneeId" defaultValue={ticket.assigneeId ?? ""}><option value="">Belum ditugaskan</option>{assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}</select></label>
                  <label>Catatan penyelesaian<input name="resolution" defaultValue={ticket.resolution ?? ""} placeholder="Catatan penyelesaian" /></label>
                  <label>Bukti<input name="evidence" defaultValue={ticket.evidence ?? ""} placeholder="Referensi bukti" /></label>
                  <button type="submit">Simpan perubahan</button>
                </form>}
                {(user.role === "ADMIN" || (user.role === "SARPRAS" && ticket.creatorId === user.id)) && <details className="inline-delete-menu ticket-delete-menu">
                  <summary>Opsi lainnya</summary>
                  <form action={deleteImprovement} className="delete-form"><input type="hidden" name="id" value={ticket.id} /><button className="danger-button" type="submit">Hapus tiket</button></form>
                </details>}
              </div>
            </details></td>
          </tr>)}
          {!tickets.length && <tr><td colSpan={5}>Belum ada tiket perbaikan.</td></tr>}</tbody>
        </table></div>
      </section>
    </main>
  );
}
