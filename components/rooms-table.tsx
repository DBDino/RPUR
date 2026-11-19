"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { saveRoom, deleteRoom, deleteRoomsBatch } from "@/app/rooms/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AlertDialog } from "@/components/alert-dialog";

export type RoomItem = {
  id: string;
  code: string;
  name: string;
  faculties: string[];
  building: string | null;
  floor: string | null;
  capacitySeat: number;
  maxDailyMinutes: number;
  active: boolean;
  _count: { schedules: number };
};

export function RoomsTable({
  rooms,
  canUpdate,
  canDelete,
  userRole,
  userFaculty,
}: {
  rooms: RoomItem[];
  canUpdate: boolean;
  canDelete: boolean;
  userRole: UserRole;
  userFaculty: string | null;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTarget, setDialogTarget] = useState<
    | { type: "single"; room: RoomItem }
    | { type: "batch"; count: number }
    | null
  >(null);

  const allSelected = rooms.length > 0 && selectedIds.size === rooms.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rooms.map((r) => r.id)));
    }
  }

  function toggleSelectRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleRowExpand(id: string) {
    if (!canUpdate && !canDelete) return;
    setSaveError(null);
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleSaveRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaveError(null);
    startTransition(async () => {
      try {
        await saveRoom(formData);
        setExpandedId(null);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Ruangan gagal disimpan. Periksa kembali datanya.");
      }
    });
  }

  function openSingleDelete(room: RoomItem, e: React.MouseEvent) {
    e.stopPropagation();
    setDialogTarget({ type: "single", room });
    setDialogOpen(true);
  }

  function openBatchDelete() {
    if (selectedIds.size === 0) return;
    setDialogTarget({ type: "batch", count: selectedIds.size });
    setDialogOpen(true);
  }

  function handleConfirmDelete() {
    if (!dialogTarget) return;

    startTransition(async () => {
      try {
        if (dialogTarget.type === "single") {
          const fd = new FormData();
          fd.append("id", dialogTarget.room.id);
          await deleteRoom(fd);
          setExpandedId(null);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(dialogTarget.room.id);
            return next;
          });
        } else if (dialogTarget.type === "batch") {
          const fd = new FormData();
          fd.append("ids", JSON.stringify(Array.from(selectedIds)));
          await deleteRoomsBatch(fd);
          setSelectedIds(new Set());
          setExpandedId(null);
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus.");
      } finally {
        setDialogOpen(false);
        setDialogTarget(null);
      }
    });
  }

  const colCount = (canDelete ? 1 : 0) + 6;

  return (
    <div className="rooms-table-container">
      {/* Batch Action Bar */}
      {selectedIds.size > 0 && canDelete && (
        <div className="batch-action-bar">
          <div className="batch-action-info">
            <strong>{selectedIds.size} ruangan dipilih</strong>
          </div>
          <div className="batch-action-buttons">
            <button
              type="button"
              className="batch-btn-danger"
              onClick={openBatchDelete}
              disabled={isPending}
              aria-label={`Hapus ${selectedIds.size} ruangan terpilih`}
            >
              Hapus
            </button>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {canDelete && (
                <th style={{ width: "42px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    className="row-checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Pilih semua ruangan"
                  />
                </th>
              )}
              <th>Kode</th>
              <th>Nama</th>
              <th>Fakultas</th>
              <th>Gedung</th>
              <th>Kapasitas</th>
              <th>Jadwal</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => {
              const isExpanded = expandedId === room.id;
              const isSelected = selectedIds.has(room.id);

              return (
                <React.Fragment key={room.id}>
                  <tr
                    className={`table-row-clickable${isExpanded ? " row-expanded" : ""}${
                      isSelected ? " row-selected" : ""
                    }`}
                    onClick={() => toggleRowExpand(room.id)}
                  >
                    {canDelete && (
                      <td
                        style={{ textAlign: "center" }}
                      >
                        <input
                          type="checkbox"
                          className="row-checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(room.id)}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Pilih ruang ${room.code}`}
                        />
                      </td>
                    )}
                    <td>
                      <Link
                        href={`/rooms/${room.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="room-code-link"
                      >
                        <code>{room.code}</code>
                      </Link>
                    </td>
                    <td>{room.name}</td>
                    <td>{room.faculties.join(", ") || "Belum ditetapkan"}</td>
                    <td>{room.building ?? "-"}</td>
                    <td>{room.capacitySeat} kursi</td>
                    <td>{room._count.schedules}</td>
                  </tr>

                  {/* Expanded Full-Width Section */}
                  {isExpanded && (
                    <tr className="table-accordion-row">
                      <td colSpan={colCount}>
                        <div className="table-accordion-content">
                          <div className="accordion-header">
                            <div>
                              <h4>Edit Ruangan: {room.code}</h4>
                              <p>Perbarui informasi ruangan atau hapus ruangan dari sistem.</p>
                            </div>
                          </div>

                          <form onSubmit={handleSaveRoom} className="entry-form full-width-edit-form">
                            <input type="hidden" name="id" value={room.id} />

                            <label>
                              Kode Ruangan
                              <input
                                name="code"
                                defaultValue={room.code}
                                placeholder="Misal: R.101"
                                required
                              />
                            </label>

                            <label>
                              Nama Ruangan
                              <input
                                name="name"
                                defaultValue={room.name}
                                placeholder="Nama ruangan"
                                required
                              />
                            </label>

                            <label>
                              Fakultas
                              {userRole === "ADMIN" ? (
                                <input
                                  name="faculties"
                                  defaultValue={room.faculties.join(", ")}
                                  placeholder="Pisahkan dengan koma jika multi-fakultas"
                                  required
                                />
                              ) : (
                                <>
                                  <input
                                    type="text"
                                    value={`${userFaculty ?? "Fakultas Anda"} (Terkunci)`}
                                    disabled
                                    className="locked-input"
                                  />
                                  <input
                                    type="hidden"
                                    name="faculties"
                                    value={room.faculties.join(", ") || userFaculty || ""}
                                  />
                                </>
                              )}
                            </label>

                            <label>
                              Gedung
                              <input
                                name="building"
                                defaultValue={room.building ?? ""}
                                placeholder="Misal: Gedung A"
                              />
                            </label>

                            <label>
                              Lantai
                              <input
                                name="floor"
                                defaultValue={room.floor ?? ""}
                                placeholder="Misal: 2"
                              />
                            </label>

                            <label>
                              Kapasitas Kursi
                              <input
                                name="capacitySeat"
                                type="number"
                                min="1"
                                defaultValue={room.capacitySeat}
                                required
                              />
                            </label>

                            <label>
                              Maks. Menit / Hari
                              <input
                                name="maxDailyMinutes"
                                type="number"
                                min="1"
                                defaultValue={room.maxDailyMinutes}
                                required
                              />
                            </label>

                            <label>
                              Status Ruang
                              <select
                                name="active"
                                defaultValue={room.active ? "true" : "false"}
                              >
                                <option value="true">Aktif</option>
                                <option value="false">Nonaktif</option>
                              </select>
                            </label>

                            <div className="accordion-action-footer">
                              <div className="accordion-left-actions">
                                <button type="submit" className="save-btn" disabled={isPending}>
                                  Simpan Perubahan
                                </button>
                              </div>

                              {canDelete && (
                                <details className="inline-delete-menu" onClick={(event) => event.stopPropagation()}>
                                  <summary>Opsi lainnya</summary>
                                  <button
                                    type="button"
                                    className="danger-button delete-single-btn"
                                    onClick={(e) => openSingleDelete(room, e)}
                                    disabled={isPending}
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      aria-hidden="true"
                                      width="14"
                                      height="14"
                                    >
                                      <path
                                        d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                    Hapus Ruangan
                                  </button>
                                </details>
                              )}
                            </div>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {!rooms.length && (
              <tr>
                <td colSpan={colCount} style={{ textAlign: "center", padding: "28px" }}>
                  Belum ada data ruangan dalam cakupan fakultas Anda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      <ConfirmDialog
        isOpen={dialogOpen}
        title={
          dialogTarget?.type === "batch"
            ? "Konfirmasi Hapus Massal Ruangan"
            : `Konfirmasi Hapus Ruangan: ${dialogTarget?.room.code}`
        }
        message={
          dialogTarget?.type === "batch"
            ? `Apakah Anda yakin ingin menghapus ${dialogTarget.count} ruangan yang dipilih? Seluruh jadwal kuliah terkait akan ikut terhapus secara permanen.`
            : `Apakah Anda yakin ingin menghapus ruangan ${dialogTarget?.room.code} (${dialogTarget?.room.name})? Seluruh jadwal perkuliahan pada ruangan ini akan ikut terhapus secara permanen.`
        }
        confirmLabel="Ya, Hapus"
        isLoading={isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDialogOpen(false);
          setDialogTarget(null);
        }}
      />
      <AlertDialog
        isOpen={Boolean(saveError)}
        title="Ruangan belum disimpan"
        message={saveError ?? "Terjadi kesalahan saat menyimpan ruangan."}
        onClose={() => setSaveError(null)}
      />
    </div>
  );
}
