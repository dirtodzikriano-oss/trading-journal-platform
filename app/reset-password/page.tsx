"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) { setMessage("Konfirmasi kata sandi tidak sama."); return; }
    if (password.length < 8) { setMessage("Kata sandi minimal 8 karakter."); return; }
    setBusy(true); setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru dari halaman Sign In.");
      setBusy(false); return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/login?reset=success");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <a className="auth-brand" href="/">tradefolio<span>.</span></a>
        <p className="auth-eyebrow">ACCOUNT SECURITY</p>
        <h1>Buat kata sandi baru</h1>
        <p className="auth-description">Masukkan kata sandi baru untuk akun Tradefolio kamu.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Kata sandi baru
            <span className="auth-password-wrap">
              <input type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimal 8 karakter" />
              <button className="auth-password-toggle" type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? "Sembunyikan" : "Lihat"}</button>
            </span>
          </label>
          <label>Konfirmasi kata sandi
            <span className="auth-password-wrap">
              <input type={showConfirm ? "text" : "password"} autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Ulangi kata sandi baru" />
              <button className="auth-password-toggle" type="button" onClick={() => setShowConfirm(v => !v)}>{showConfirm ? "Sembunyikan" : "Lihat"}</button>
            </span>
          </label>
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Simpan kata sandi baru"}</button>
        </form>
        {message && <p className="auth-message" role="status">{message}</p>}
        <div className="auth-switch"><p><a href="/login">Kembali ke Sign In</a></p></div>
      </section>
    </main>
  );
}
