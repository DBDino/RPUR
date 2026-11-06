import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { minutesToTime } from "@/lib/time";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function ScheduleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await verifySession();
  if (!user) redirect("/login");
  if (!can(user.role, "schedules")) redirect("/");
  const { id } = await params;
  const schedule = await prisma.schedule.findUnique({ where: { id }, include: { room: true, course: true } });
  if (!schedule) notFound();
  const ratio = schedule.room.capacitySeat ? Math.round(schedule.enrolledStudents / schedule.room.capacitySeat * 100) : 0;
  return (
    <main className="workspace-main">
      <header className="dashboard-header"><div><Link href="/schedules" className="page-kicker">← Kembali ke master jadwal</Link><h1>{schedule.course?.name ?? schedule.sourceCode ?? "Detail Jadwal"}</h1><p>{schedule.className ? `Kelas ${schedule.className}` : "Kelas tidak tercatat"}</p></div></header>
      <section className="dashboard-content">
        <div className="analytics-grid">
          <article className="insight-card"><span>Hari dan waktu</span><strong>{schedule.day}</strong><p>{minutesToTime(schedule.startMinutes)}–{minutesToTime(schedule.endMinutes)}</p></article>
          <article className="insight-card"><span>Ruangan</span><strong>{schedule.room.code}</strong><p>{schedule.room.name} · kapasitas {schedule.room.capacitySeat}</p></article>
          <article className="insight-card warning"><span>Okupansi kapasitas</span><strong>{ratio}%</strong><p>{schedule.enrolledStudents} peserta terdaftar</p></article>
        </div>
      </section>
    </main>
  );
}
