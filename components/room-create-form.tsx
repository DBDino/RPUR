"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import type { UserRole } from "@prisma/client";
import { saveRoom } from "@/app/rooms/actions";
import { AlertDialog } from "@/components/alert-dialog";

export function RoomCreateForm({ userRole, userFaculty }: { userRole: UserRole; userFaculty: string | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFeedback(null);

    startTransition(async () => {
      try {
        await saveRoom(formData);
        formRef.current?.reset();
        setFeedback({ type: "success", message: "Ruangan berhasil ditambahkan." });
      } catch (error) {
        setFeedback({
          type: "error",
          message: error instanceof Error ? error.message : "Ruangan gagal disimpan. Periksa kembali datanya.",
        });
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="entry-form room-form">
      <label>Kode<input name="code" placeholder="Misal: R.101" required /></label>
      <label>Nama<input name="name" placeholder="Misal: Ruang Kuliah A" required /></label>
      <label>Fakultas
        {userRole === "ADMIN" ? (
          <input name="faculties" placeholder="Pisahkan beberapa fakultas dengan koma" required />
        ) : (
          <>
            <input type="text" value={`${userFaculty ?? "Fakultas Anda"} (Terkunci)`} disabled className="locked-input" />
            <input type="hidden" name="faculties" value={userFaculty ?? ""} />
          </>
        )}
      </label>
      <label>Gedung<input name="building" placeholder="Misal: Gedung A" /></label>
      <label>Lantai<input name="floor" placeholder="Misal: 1" /></label>
      <label>Kapasitas<input name="capacitySeat" type="number" min="1" placeholder="Jumlah kursi" required /></label>
      <label>Maks. menit/hari<input name="maxDailyMinutes" type="number" min="1" defaultValue="360" /></label>
      <div className="entry-form-actions">
        <button type="submit" disabled={isPending}>{isPending ? "Menyimpan..." : "Simpan ruang"}</button>
      </div>
      {feedback?.type === "success" && <p className="form-feedback success" role="status">{feedback.message}</p>}
      <AlertDialog
        isOpen={feedback?.type === "error"}
        title="Ruangan belum disimpan"
        message={feedback?.type === "error" ? feedback.message : "Terjadi kesalahan saat menyimpan ruangan."}
        onClose={() => setFeedback(null)}
      />
    </form>
  );
}
