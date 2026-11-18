"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Pendaftaran diterima. Periksa email untuk konfirmasi jika diminta, lalu masuk.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Terjadi kesalahan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <a className="auth-brand" href="/">tradefolio<span>.</span></a>
        <p className="auth-eyebrow">TRADING JOURNAL WORKSPACE</p>
        <h1>{mode === "login" ? "Selamat datang kembali" : "Buat akun Tradefolio"}</h1>
        <p className="auth-description">Masuk untuk mengelola jurnal trading dan analitik pribadi.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>Email
            <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@email.com" />
          </label>
          <label>Password
            <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimal 8 karakter" />
          </label>
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}</button>
        </form>
        {message && <p className="auth-message" role="status">{message}</p>}
        <p className="auth-switch">{mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"} <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "Daftar" : "Masuk"}</button></p>
        <p className="auth-safe">Koneksi menggunakan Supabase Auth. Jangan pernah memasukkan password database atau secret key di halaman ini.</p>
      </section>
    </main>
  );
}
