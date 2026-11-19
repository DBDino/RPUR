import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { saveUser } from "./actions";
import { UsersTable, type UserTableItem } from "@/components/users-table";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const actor = await verifySession();
  if (!actor) redirect("/login");
  if (!can(actor.role, "users")) redirect("/");

  const users = await prisma.user.findMany({
    orderBy: [{ faculty: "asc" }, { role: "asc" }, { name: "asc" }],
  });

  return (
    <main className="workspace-main">
      <header className="dashboard-header">
        <div>
          <h1>Pengguna dan Fakultas</h1>
          <p>Tetapkan cakupan fakultas untuk akun PJ/Kaprodi dan Sarpras.</p>
        </div>
      </header>
      <section className="dashboard-content">
        <details className="entry-card">
          <summary className="entry-card-summary">
            <span className="entry-card-title">
              <svg className="entry-card-chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 18 6-6-6-6" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Tambah Pengguna
            </span>
            <span className="entry-card-hint">Klik untuk membuka form input</span>
          </summary>
          <form action={saveUser} className="entry-form user-form">
            <label>Nama<input name="name" placeholder="Nama lengkap" required /></label>
            <label>Email<input name="email" type="email" placeholder="nama@unpad.ac.id" required /></label>
            <label>Peran<select name="role" defaultValue="SARPRAS">{Object.values(UserRole).map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
            <label>Fakultas<input name="faculty" placeholder="Contoh: Fakultas Teknik" /></label>
            <div className="entry-form-actions user-form-actions">
              <button type="submit">Buat pengguna</button>
            </div>
          </form>
        </details>
        <UsersTable users={users as UserTableItem[]} currentUserId={actor.id} />
      </section>
    </main>
  );
}
