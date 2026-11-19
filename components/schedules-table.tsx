"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Day, type UserRole } from "@prisma/client";
import { saveSchedule, deleteSchedule, deleteSchedulesBatch } from "@/app/schedules/actions";
import { minutesToTime } from "@/lib/time";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AlertDialog } from "@/components/alert-dialog";

export type ScheduleItem = {
  id: string;
  scheduledDate: Date | null;
  roomId: string;
  day: Day;
  startMinutes: number;
  endMinutes: number;
  enrolledStudents: number;
  className: string | null;
  ticketId: string | null;
  room: { code: string; name: string; capacitySeat: number };
  course: { name: string } | null;
};

export function SchedulesTable({
  schedules,
  canUpdate,
  canDelete,
}: {
  schedules: ScheduleItem[];
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
    | { type: "single"; schedule: ScheduleItem }
    | { type: "batch"; count: number }
    | null
  >(null);

  const allSelected = schedules.length > 0 && selectedIds.size === schedules.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(schedules.map((s) => s.id)));
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

  function handleSaveSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaveError(null);
    startTransition(async () => {
      try {
        await saveSchedule(formData);
        setExpandedId(null);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Jadwal gagal disimpan. Periksa kembali datanya.");
      }
    });
  }

  function openSingleDelete(schedule: ScheduleItem, e: React.MouseEvent) {
    e.stopPropagation();
    setDialogTarget({ type: "single", schedule });
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
          fd.append("id", dialogTarget.schedule.id);
          await deleteSchedule(fd);
          setExpandedId(null);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(dialogTarget.schedule.id);
            return next;
          });
        } else if (dialogTarget.type === "batch") {
          const fd = new FormData();
          fd.append("ids", JSON.stringify(Array.from(selectedIds)));
          await deleteSchedulesBatch(fd);
          setSelectedIds(new Set());
          setExpandedId(null);
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus jadwal.");
      } finally {
        setDialogOpen(false);
        setDialogTarget(null);
      }
    });
  }

  const colCount = (canDelete ? 1 : 0) + 6;

  return (
    <div className="schedules-table-container">
      {/* Batch Action Bar */}
      {selectedIds.size > 0 && canDelete && (
        <div className="batch-action-bar">
          <div className="batch-action-info">
            <strong>{selectedIds.size} jadwal dipilih</strong>
          </div>
          <div className="batch-action-buttons">
            <button
              type="button"
              className="batch-btn-danger"
              onClick={openBatchDelete}
              disabled={isPending}
              aria-label={`Hapus ${selectedIds.size} jadwal terpilih`}
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
                    aria-label="Pilih semua jadwal"
                  />
                </th>
              )}
              <th>Hari &amp; Waktu</th>
              <th>Ruang</th>
              <th>Mata Kuliah</th>
              <th>Kelas</th>
              <th>Peserta</th>
              <th>Utilisasi</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule) => {
              const isExpanded = expandedId === schedule.id;
              const isSelected = selectedIds.has(schedule.id);
              const ratio = schedule.room.capacitySeat
                ? (schedule.enrolledStudents / schedule.room.capacitySeat) * 100
                : 0;
              const utilization =
                ratio > 100
                  ? "Over capacity"
                  : ratio >= 70
                  ? "Optimal"
                  : ratio >= 30
                  ? "Under capacity"
                  : "Low usage";

              return (
                <React.Fragment key={schedule.id}>
                  <tr
                    className={`table-row-clickable${isExpanded ? " row-expanded" : ""}${
                      isSelected ? " row-selected" : ""
                    }`}
                    onClick={() => toggleRowExpand(schedule.id)}
                    title="Klik baris jadwal untuk membuka panel edit"
                  >
                    {canDelete && (
                      <td
                        style={{ textAlign: "center" }}
                      >
                        <input
                          type="checkbox"
                          className="row-checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(schedule.id)}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Pilih jadwal ${schedule.room.code}`}
                        />
                      </td>
                    )}
                    <td>
                      <strong>
                        {schedule.scheduledDate
                          ? new Intl.DateTimeFormat("id-ID", {
                              dateStyle: "medium",
                              timeZone: "Asia/Jakarta",
                            }).format(new Date(schedule.scheduledDate))
                          : schedule.day}
                      </strong>
                      <br />
                      <small style={{ color: "var(--muted)" }}>
                        {minutesToTime(schedule.startMinutes)}–{minutesToTime(schedule.endMinutes)} WIB
                      </small>
                    </td>
                    <td>
                      <strong>{schedule.room.code}</strong>
                      <br />
                      <small style={{ color: "var(--muted)" }}>{schedule.room.name}</small>
                    </td>
                    <td>
                      <Link
                        href={`/schedules/${schedule.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="course-link"
                      >
                        {schedule.course?.name ?? "Kuliah Reguler"}
                      </Link>
                    </td>
                    <td>{schedule.className ?? "-"}</td>
                    <td>{schedule.enrolledStudents} mhs</td>
                    <td>
                      <span
                        className={`status-pill ${
                          ratio > 100 ? "danger" : ratio >= 70 ? "success" : ""
                        }`}
                      >
                        {utilization} · {Math.round(ratio)}%
                      </span>
                    </td>
                  </tr>

                  {/* Expanded Full-Width Section */}
                  {isExpanded && (
                    <tr className="table-accordion-row">
                      <td colSpan={colCount}>
                        <div className="table-accordion-content">
                          <div className="accordion-header">
                            <div>
                              <h4>
                                Edit Jadwal: {schedule.room.code} ({schedule.day},{" "}
                                {minutesToTime(schedule.startMinutes)}–{minutesToTime(schedule.endMinutes)})
                              </h4>
                              <p>Perbarui slot jadwal atau hapus jadwal dari roster aktif.</p>
                            </div>
                          </div>

                          {schedule.ticketId ? (
                            <div className="ticket-locked-notice">
                              <span style={{ color: "var(--orange)", fontWeight: 700 }}>
                                ⚠ Jadwal Permohonan Tiket
                              </span>
                              <p>
                                Jadwal ini dibuat melalui permohonan ruang dan peninjauannya dikelola
                                secara terpusat pada menu <strong>Permintaan Ruang</strong>.
                              </p>
                            </div>
                          ) : canUpdate ? (
                            <form onSubmit={handleSaveSchedule} className="entry-form full-width-edit-form">
                              <input type="hidden" name="id" value={schedule.id} />

                              <label>
                                Kode Ruangan
                                <input
                                  name="roomCode"
                                  defaultValue={schedule.room.code}
                                  placeholder="Masukkan kode ruangan"
                                  required
                                />
                              </label>

                              <label>
                                Hari
                                <select name="day" defaultValue={schedule.day} required>
                                  {Object.values(Day).map((day) => (
                                    <option key={day} value={day}>
                                      {day}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label>
                                Jam Mulai
                                <input
                                  name="startTime"
                                  type="time"
                                  defaultValue={minutesToTime(schedule.startMinutes)}
                                  required
                                />
                              </label>

                              <label>
                                Jam Selesai
                                <input
                                  name="endTime"
                                  type="time"
                                  defaultValue={minutesToTime(schedule.endMinutes)}
                                  required
                                />
                              </label>

                              <label>
                                Jumlah Peserta
                                <input
                                  name="students"
                                  type="number"
                                  min="0"
                                  defaultValue={schedule.enrolledStudents}
                                  required
                                />
                              </label>

                              <label className="schedule-class-field">
                                Nama Kelas / Mata Kuliah
                                <input
                                  name="className"
                                  defaultValue={schedule.className ?? ""}
                                  placeholder="Nama kelas atau mata kuliah"
                                />
                              </label>

                              <div className="accordion-action-footer" style={{ gridColumn: "1 / -1" }}>
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
                                      onClick={(e) => openSingleDelete(schedule, e)}
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
                                      Hapus Jadwal
                                    </button>
                                  </details>
                                )}
                              </div>
                            </form>
                          ) : canDelete ? (
                            <details className="inline-delete-menu" onClick={(event) => event.stopPropagation()}>
                              <summary>Opsi lainnya</summary>
                              <button type="button" className="danger-button" onClick={(event) => openSingleDelete(schedule, event)}>
                                Hapus Jadwal
                              </button>
                            </details>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {!schedules.length && (
              <tr>
                <td colSpan={colCount} style={{ textAlign: "center", padding: "28px" }}>
                  Belum ada jadwal dalam cakupan fakultas Anda.
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
            ? "Konfirmasi Hapus Massal Jadwal"
            : `Konfirmasi Hapus Jadwal: ${dialogTarget?.schedule.room.code}`
        }
        message={
          dialogTarget?.type === "batch"
            ? `Apakah Anda yakin ingin menghapus ${dialogTarget.count} jadwal yang dipilih? Tindakan ini tidak dapat dibatalkan.`
            : `Apakah Anda yakin ingin menghapus jadwal ruangan ${dialogTarget?.schedule.room.code} pada hari ${dialogTarget?.schedule.day} (${minutesToTime(
                dialogTarget?.schedule.startMinutes ?? 0
              )}–${minutesToTime(dialogTarget?.schedule.endMinutes ?? 0)} WIB)? Tindakan ini tidak dapat dibatalkan.`
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
        title="Jadwal belum disimpan"
        message={saveError ?? "Terjadi kesalahan saat menyimpan jadwal."}
        onClose={() => setSaveError(null)}
      />
    </div>
  );
}
