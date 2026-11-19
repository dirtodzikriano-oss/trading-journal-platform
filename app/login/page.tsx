"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "forgot" | "reset";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function changeMode(next: Mode) {
    setMode(next);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
    setOtp("");
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
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        setMode("reset");
        setMessage("Kode OTP pemulihan telah diminta. Periksa kotak masuk atau folder spam email kamu.");
      } else {
        if (password !== confirmPassword) throw new Error("Konfirmasi kata sandi baru tidak sama.");
        if (password.length < 8) throw new Error("Kata sandi baru minimal 8 karakter.");
        if (!/^\\d{6}$/.test(otp.trim())) throw new Error("Masukkan kode OTP 6 digit dari email.");
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otp.trim(),
          type: "recovery",
        });
        if (verifyError) throw verifyError;
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setMessage("Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru.");
        setPassword("");
        setConfirmPassword("");
        setOtp("");
        setMode("login");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Selamat datang kembali"
    : mode === "signup" ? "Buat akun Tradefolio"
    : mode === "forgot" ? "Lupa kata sandi?"
    : "Reset kata sandi";

  const description = mode === "login" ? "Masuk untuk mengelola jurnal trading dan analitik pribadi."
    : mode === "signup" ? "Daftar untuk mulai mengelola jurnal trading kamu."
    : mode === "forgot" ? "Masukkan email akun. Kami akan mengirim kode OTP untuk pemulihan."
    : "Masukkan kode OTP dari email dan buat kata sandi baru.";

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
          {(mode === "login" || mode === "signup" || mode === "forgot" || mode === "reset") && (
            <label htmlFor="auth-email">Email
              <input id="auth-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@email.com" readOnly={mode === "reset"} />
            </label>
          )}

          {mode === "reset" && (
            <label htmlFor="auth-otp">Kode OTP dari email
              <input id="auth-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required value={otp} onChange={e => setOtp(e.target.value.replace(/\\D/g, "").slice(0, 6))} placeholder="Masukkan 6 digit OTP" />
            </label>
          )}

          {(mode === "login" || mode === "signup" || mode === "reset") && passwordField(
            mode === "reset" ? "Kata sandi baru" : "Kata sandi",
            password, setPassword, showPassword, setShowPassword,
            mode === "login" ? "current-password" : "new-password", "auth-password"
          )}

          {(mode === "signup" || mode === "reset") && passwordField(
            "Konfirmasi kata sandi", confirmPassword, setConfirmPassword,
            showConfirmPassword, setShowConfirmPassword, "new-password", "auth-confirm-password"
          )}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "Memproses..." : mode === "login" ? "Masuk" : mode === "signup" ? "Daftar" : mode === "forgot" ? "Kirim kode OTP" : "Verifikasi OTP & reset kata sandi"}
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
          {mode === "reset" && <p>Belum menerima kode? <button type="button" disabled={busy} onClick={async () => {
            setBusy(true); setMessage("");
            const { error } = await createClient().auth.resetPasswordForEmail(email.trim());
            setBusy(false);
            setMessage(error ? error.message : "Permintaan kode OTP baru telah dikirim. Periksa email kamu.");
          }}>Kirim ulang OTP</button> <span>·</span> <button type="button" onClick={() => changeMode("forgot")}>Ganti email</button></p>}
        </div>
        <p className="auth-safe">Gunakan kata sandi yang kuat. Jangan pernah membagikan kode OTP kepada siapa pun.</p>
      </section>
    </main>
  );
}
