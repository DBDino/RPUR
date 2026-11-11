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
          <input name="title" placeholder="Judul temuan" required />
          <input name="category" placeholder="Kategori, mis. Utilisasi" required />
          <select name="priority" defaultValue="SEDANG">{Object.values(ImprovementPriority).map((value) => <option key={value} value={value}>{value}</option>)}</select>
          <textarea name="description" placeholder="Deskripsi temuan dan dampak" required />
          <textarea name="solution" placeholder="Saran solusi" required />
          <input name="reference" placeholder="Referensi data, ruangan, atau jadwal" />
          <button type="submit">Buat tiket perbaikan</button>
        </form>}
        <div className="section-heading"><div><div className="eyebrow">{user.role === "SARPRAS" ? "Tiket milik Anda dan fakultas yang dikelola" : user.role === "ADMIN" ? "Semua fakultas" : "Tiket Anda"}</div><h2>Saran dan tindak lanjut perbaikan</h2></div></div>
        <div className="table-wrap"><table><thead><tr><th>Tiket</th><th>Fakultas</th><th>Prioritas</th><th>Status</th><th>{canManage ? "Aksi / Referensi" : "Referensi"}</th></tr></thead>
          <tbody>{tickets.map((ticket) => <tr key={ticket.id}>
            <td><strong>{ticket.title}</strong><br /><small>{ticket.category}</small><p>{ticket.description}</p></td>
            <td>{ticket.faculty ?? "Belum ditetapkan"}{user.role === "SARPRAS" && ticket.creatorId === user.id && <><br /><small>Tiket Anda</small></>}</td>
            <td>{ticket.priority}</td><td><span className="badge">{ticket.status}</span></td>
            <td>{(user.role === "ADMIN" || (user.role === "SARPRAS" && ticket.creatorId !== user.id && ticket.faculty === user.faculty)) ? <div className="ticket-action-cell"><form action={updateImprovement} className="decision-form improvement-actions">
              <input type="hidden" name="id" value={ticket.id} />
              <select name="status" defaultValue={ticket.status}>{Object.values(ImprovementStatus).map((value) => <option key={value}>{value}</option>)}</select>
              <select name="priority" defaultValue={ticket.priority}>{Object.values(ImprovementPriority).map((value) => <option key={value}>{value}</option>)}</select>
              <select name="assigneeId" defaultValue={ticket.assigneeId ?? ""}><option value="">Belum ditugaskan</option>{assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}</select>
              <input name="resolution" defaultValue={ticket.resolution ?? ""} placeholder="Catatan penyelesaian/bukti" />
              <input name="evidence" defaultValue={ticket.evidence ?? ""} placeholder="Referensi bukti" />
              <button type="submit">Simpan</button>
            </form></div> : ticket.reference || "-"}
              {(user.role === "ADMIN" || (user.role === "SARPRAS" && ticket.creatorId === user.id)) && <form action={deleteImprovement} className="delete-form"><input type="hidden" name="id" value={ticket.id} /><button className="danger-button" type="submit">Hapus tiket</button></form>}
            </td>
          </tr>)}
          {!tickets.length && <tr><td colSpan={5}>Belum ada tiket perbaikan.</td></tr>}</tbody>
        </table></div>
      </section>
    </main>
  );
}
