import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { login } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const user = await verifySession();
  if (user) redirect("/");

  return (
    <main className="login-page">
      <aside className="login-context" aria-label="Campus operations">
        <div className="campus-grid" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <div className="login-context-brand"><span>U</span><strong>RPUR</strong></div>
        <div className="login-context-copy">
          <span>Universitas Padjadjaran</span>
          <strong>Ruang, roster,<br />dan keputusan akademik.</strong>
          <p>Porta operasional untuk tata kelola ruang dan utilitas kampus.</p>
        </div>
        <div className="login-context-index"><span>01</span><i /><span>RPUR / Campus Operations</span></div>
      </aside>
      <section className="login-panel">
        <div className="login-mobile-brand"><span>U</span><strong>RPUR</strong></div>
        <div className="login-entry">
          <p className="login-kicker">Akses sistem</p>
          <h1>Masuk ke<br />workspace RPUR.</h1>
          <p className="login-copy">Gunakan akun institusi Anda untuk mengelola ruang dan roster.</p>

          {params.error && <div className="login-error" role="alert">{params.error}</div>}
          <form action={login} className="login-form">
            <label>Email institusi
              <input name="email" type="email" autoComplete="username" placeholder="nama@unpad.ac.id" required />
            </label>
            <label>Password
              <input name="password" type="password" autoComplete="current-password" placeholder="Masukkan password" required />
            </label>
            <button type="submit">Masuk ke sistem <span>→</span></button>
          </form>
        </div>
      </section>
    </main>
  );
}
