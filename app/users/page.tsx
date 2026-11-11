import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { saveUser } from "./actions";

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
        <div><h1>Pengguna dan Fakultas</h1><p>Tetapkan cakupan fakultas untuk akun PJ/Kaprodi dan Sarpras.</p></div>
      </header>
      <section className="dashboard-content">
        <details className="filter-bar">
          <summary>Tambah pengguna</summary>
          <form action={saveUser} className="filter-bar">
            <label>Nama<input name="name" required /></label>
            <label>Email<input name="email" type="email" required /></label>
            <label>Peran<select name="role" defaultValue="SARPRAS">{Object.values(UserRole).map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
            <label>Fakultas<input name="faculty" placeholder="Contoh: Fakultas Teknik" /></label>
            <button type="submit">Buat pengguna</button>
          </form>
        </details>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Fakultas</th><th>Aksi</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td><td>{user.email}</td><td>{user.role}</td><td>{user.faculty ?? "—"}</td>
                  <td>
                    <details>
                      <summary>Edit</summary>
                      <form action={saveUser}>
                        <input type="hidden" name="id" value={user.id} />
                        <input name="name" defaultValue={user.name} required />
                        <input name="email" type="email" defaultValue={user.email} required />
                        <select name="role" defaultValue={user.role}>{Object.values(UserRole).map((role) => <option key={role} value={role}>{role}</option>)}</select>
                        <input name="faculty" defaultValue={user.faculty ?? ""} placeholder="Contoh: Fakultas Teknik" />
                        <button type="submit">Simpan perubahan</button>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}
              {!users.length && <tr><td colSpan={5}>Belum ada pengguna.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
