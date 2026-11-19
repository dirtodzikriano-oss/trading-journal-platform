"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function changeMode(next: Mode) {
    setMode(next);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();

      if (mode === "signup") {
        if (password !== confirmPassword) throw new Error("Konfirmasi kata sandi tidak sama.");
        if (password.length < 8) throw new Error("Kata sandi minimal 8 karakter.");
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        setMessage("Pendaftaran berhasil dikirim. Periksa email untuk konfirmasi jika diminta, lalu masuk ke Tradefolio.");
        setPassword("");
        setConfirmPassword("");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      } else if (mode === "forgot") {
        const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        if (error) throw error;
        setMessage("Tautan reset kata sandi telah dikirim jika email terdaftar. Periksa kotak masuk atau folder spam.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Selamat datang kembali"
    : mode === "signup" ? "Buat akun Tradefolio"
    : "Lupa kata sandi?";

  const description = mode === "login" ? "Masuk untuk mengelola jurnal trading dan analitik pribadi."
    : mode === "signup" ? "Daftar untuk mulai mengelola jurnal trading kamu."
    : "Masukkan email akun. Kami akan mengirim tautan untuk membuat kata sandi baru.";

  function passwordField(label: string, value: string, onChange: (value: string) => void, visible: boolean, setVisible: (value: boolean) => void, autoComplete: string, fieldId: string) {
    return (
      <label htmlFor={fieldId}>{label}
        <span className="auth-password-wrap">
          <input id={fieldId} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={8} required value={value} onChange={e => onChange(e.target.value)} placeholder="Minimal 8 karakter" />
          <button className="auth-password-toggle" type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Sembunyikan kata sandi" : "Lihat kata sandi"}>{visible ? "Sembunyikan" : "Lihat"}</button>
        </span>
      </label>
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <a className="auth-brand" href="/">tradefolio<span>.</span></a>
        <p className="auth-eyebrow">TRADING JOURNAL WORKSPACE</p>
        <h1>{title}</h1>
        <p className="auth-description">{description}</p>
        <form onSubmit={handleSubmit} className="auth-form">
          {(mode === "login" || mode === "signup" || mode === "forgot") && (
            <label htmlFor="auth-email">Email
              <input id="auth-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@email.com" />
            </label>
          )}

          {(mode === "login" || mode === "signup") && passwordField(
            "Kata sandi",
            password, setPassword, showPassword, setShowPassword,
            mode === "login" ? "current-password" : "new-password", "auth-password"
          )}

          {(mode === "signup") && passwordField(
            "Konfirmasi kata sandi", confirmPassword, setConfirmPassword,
            showConfirmPassword, setShowConfirmPassword, "new-password", "auth-confirm-password"
          )}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "Memproses..." : mode === "login" ? "Masuk" : mode === "signup" ? "Daftar" : "Kirim tautan reset"}
          </button>
        </form>

        {message && <p className="auth-message" role="status">{message}</p>}

        <div className="auth-switch">
          {mode === "login" && <>
            <p>Lupa kata sandi? <button type="button" onClick={() => changeMode("forgot")}>Reset kata sandi</button></p>
            <p>Belum punya akun? <button type="button" onClick={() => changeMode("signup")}>Daftar</button></p>
          </>}
          {mode === "signup" && <p>Sudah punya akun? <button type="button" onClick={() => changeMode("login")}>Masuk</button></p>}
          {mode === "forgot" && <p>Ingat kata sandi? <button type="button" onClick={() => changeMode("login")}>Kembali ke Sign In</button></p>}
        </div>
      </section>
    </main>
  );
}
