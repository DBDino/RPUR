"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Day } from "@prisma/client";
import { saveSchedule } from "@/app/schedules/actions";
import { AlertDialog } from "@/components/alert-dialog";

export function ScheduleCreateForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await saveSchedule(formData);
        formRef.current?.reset();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Jadwal gagal disimpan. Periksa kembali datanya.");
      }
    });
  }

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} className="entry-form schedule-form">
        <label>Kode ruangan<input name="roomCode" placeholder="Masukkan kode ruangan" required /></label>
        <label>Hari<select name="day" required>{Object.values(Day).map((day) => <option key={day} value={day}>{day}</option>)}</select></label>
        <label>Mulai<input name="startTime" type="time" required /></label>
        <label>Selesai<input name="endTime" type="time" required /></label>
        <label>Peserta<input name="students" type="number" min="0" defaultValue="0" required /></label>
        <label className="schedule-class-field">Kelas<input name="className" placeholder="Nama kelas / mata kuliah" /></label>
        <div className="entry-form-actions">
          <button type="submit" disabled={isPending}>{isPending ? "Menyimpan..." : "Simpan jadwal"}</button>
        </div>
      </form>
      <AlertDialog
        isOpen={Boolean(errorMessage)}
        title="Jadwal belum disimpan"
        message={errorMessage ?? "Terjadi kesalahan saat menyimpan jadwal."}
        onClose={() => setErrorMessage(null)}
      />
    </>
  );
}
