"use client";

import { Fragment, useState } from "react";
import type { UserRole } from "@prisma/client";
import { saveUser } from "@/app/users/actions";

const userRoles: UserRole[] = ["ADMIN", "KAPRODI", "SARPRAS", "VIEWER"];

export type UserTableItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  faculty: string | null;
};

export function UsersTable({ users, currentUserId }: { users: UserTableItem[]; currentUserId: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Fakultas</th></tr></thead>
        <tbody>
          {users.map((user) => {
            const isExpanded = expandedId === user.id;
            const isCurrentAdmin = user.id === currentUserId && user.role === "ADMIN";

            return (
              <Fragment key={user.id}>
                <tr
                  tabIndex={0}
                  className={`table-row-clickable${isExpanded ? " row-expanded" : ""}`}
                  onClick={() => setExpandedId(isExpanded ? null : user.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setExpandedId(isExpanded ? null : user.id);
                    }
                  }}
                  aria-expanded={isExpanded}
                >
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.faculty ?? "—"}</td>
                </tr>
                {isExpanded && (
                  <tr className="table-accordion-row">
                    <td colSpan={4}>
                      <div className="table-accordion-content">
                        <div className="accordion-header">
                          <div>
                            <h4>Edit Pengguna: {user.name}</h4>
                            <p>Perbarui akun, peran, atau cakupan fakultas.</p>
                          </div>
                        </div>
                        <form action={saveUser} className="entry-form full-width-edit-form user-edit-form">
                          <input type="hidden" name="id" value={user.id} />
                          <label>Nama<input name="name" defaultValue={user.name} required /></label>
                          <label>Email<input name="email" type="email" defaultValue={user.email} required /></label>
                          <label>Peran{isCurrentAdmin ? <><input value="ADMIN" disabled /><input type="hidden" name="role" value="ADMIN" /></> : <select name="role" defaultValue={user.role}>{userRoles.map((role) => <option key={role} value={role}>{role}</option>)}</select>}</label>
                          <label>Fakultas<input name="faculty" defaultValue={user.faculty ?? ""} placeholder="Contoh: Fakultas Teknik" /></label>
                          <div className="accordion-action-footer">
                            <div className="accordion-left-actions">
                              <button type="submit" className="save-btn">Simpan perubahan</button>
                            </div>
                            {isCurrentAdmin && <small>Peran admin pada akun Anda tetap admin.</small>}
                          </div>
                        </form>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {!users.length && <tr><td colSpan={4}>Belum ada pengguna.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
