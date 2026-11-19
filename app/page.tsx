"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Account = { id: string; account_name: string; market_type: string; broker_name: string | null; broker_server?: string | null; platform?: string | null; account_number?: string | null; account_currency: string; account_mode: string };
type BrokerOption = { id: string; broker_name: string; owner_user_id: string | null };
type Strategy = { id: string; strategy_name: string };
type Trade = { id: string; instrument: string; direction: "long" | "short"; status: string; opened_at: string; closed_at: string | null; net_pnl: number | null; pnl_currency: string; trading_account_id: string; strategy_id: string | null };

const money = (n: number, currency = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
const marketLabels: Record<string, string> = { cfd: "CFD (Forex, Commodities, Indices, Stock CFDs)", crypto_futures: "Crypto Futures" };

export default function Home() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showAccount, setShowAccount] = useState(false);
  const [showTrade, setShowTrade] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [marketType, setMarketType] = useState("cfd");
  const [broker, setBroker] = useState("");
  const [brokerId, setBrokerId] = useState<string | null>(null);
  const [brokerResults, setBrokerResults] = useState<BrokerOption[]>([]);
  const [showBrokerSuggestions, setShowBrokerSuggestions] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [platform, setPlatform] = useState("MT5");
  const [brokerServer, setBrokerServer] = useState("");
  const [brokerServerId, setBrokerServerId] = useState<string | null>(null);
  const [serverResults, setServerResults] = useState<Array<{id:string;server_name:string;environment:string;is_verified:boolean}>>([]);
  const [showServerSuggestions, setShowServerSuggestions] = useState(false);
  const [currency, setCurrency] = useState("");
  const [accountMode, setAccountMode] = useState("live");
  const [contractType, setContractType] = useState("linear_usdt");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [apiPassphrase, setApiPassphrase] = useState("");
  const [investorPassword, setInvestorPassword] = useState("");
  const [instrument, setInstrument] = useState("XAUUSD");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [accountId, setAccountId] = useState("");
  const [strategyId, setStrategyId] = useState("");
  const [openedAt, setOpenedAt] = useState(new Date().toISOString().slice(0, 16));
  const [pnl, setPnl] = useState("0");
  const [pnlCurrency, setPnlCurrency] = useState("USD");
  const [status, setStatus] = useState("closed");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      router.replace("/login");
      return;
    }
    setEmail(authData.user.email ?? "");
    const [accountRes, strategyRes, tradeRes] = await Promise.all([
      supabase.from("trading_accounts").select("id,account_name,market_type,broker_name,account_currency,account_mode").order("created_at", { ascending: false }),
      supabase.from("strategies").select("id,strategy_name").order("strategy_name"),
      supabase.from("trades").select("id,instrument,direction,status,opened_at,closed_at,net_pnl,pnl_currency,trading_account_id,strategy_id").order("opened_at", { ascending: false }).limit(500)
    ]);
    if (accountRes.error) setError(accountRes.error.message);
    else setAccounts((accountRes.data ?? []) as Account[]);
    if (strategyRes.error) setError(strategyRes.error.message);
    else setStrategies((strategyRes.data ?? []) as Strategy[]);
    if (tradeRes.error) setError(tradeRes.error.message);
    else setTrades((tradeRes.data ?? []) as Trade[]);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) { router.replace("/login"); return; }
    if (!/^[A-Z]{3}$/.test(currency.trim().toUpperCase())) { setBusy(false); setError("Mata uang harus berupa kode 3 huruf, misalnya USD atau EUR."); return; }
    if (!accountName.trim()) { setBusy(false); setError("Nama akun wajib diisi."); return; }
    if (!brokerId || !broker.trim()) { setBusy(false); setError("Pilih broker atau exchange dari daftar yang tersedia."); return; }
    if (marketType === "cfd" && (!brokerServer.trim() || !accountNumber.trim())) { setBusy(false); setError("Untuk CFD, Broker Server dan Nomor Akun wajib diisi."); return; }
    if (marketType === "crypto_futures" && (!apiKey.trim() || !apiSecret.trim())) { setBusy(false); setError("Untuk Crypto Futures, API Key dan API Secret wajib diisi."); return; }
    if (marketType === "cfd" && !investorPassword.trim()) { setBusy(false); setError("Investor Password wajib diisi untuk akun CFD."); return; }
    setBusy(false); setError("Formulir sudah divalidasi, tetapi penyimpanan kredensial belum diaktifkan. Investor Password dan API Secret tidak boleh disimpan sebagai teks biasa. Kita perlu menyelesaikan secure credential vault sebelum akun dapat dihubungkan."); return;
    let resolvedBrokerId = brokerId;
    if (broker.trim() && !resolvedBrokerId) {
      const normalized = broker.trim().toLowerCase().replace(/\s+/g, " ");
      const { data: createdBroker, error: brokerError } = await supabase.from("brokers").insert({ owner_user_id: authData.user.id, broker_name: broker.trim(), normalized_name: normalized }).select("id").single();
      if (brokerError || !createdBroker) { setBusy(false); setError("Direktori broker belum siap atau broker gagal disimpan. Pastikan Migration 0003 sudah dijalankan. Detail: " + (brokerError?.message ?? "Data broker tidak ditemukan.")); return; }
      resolvedBrokerId = createdBroker.id;
    }
    const { error: insertError } = await supabase.from("trading_accounts").insert({
      user_id: authData.user.id, account_name: accountName.trim(), market_type: marketType,
      broker_name: broker.trim() || null, broker_id: resolvedBrokerId, broker_server: brokerServer.trim() || null, broker_server_id: brokerServerId,
      account_number: accountNumber.trim() || null, platform: platform,
      account_currency: currency.trim().toUpperCase(), account_currency_source: "user_input", account_currency_status: "user_confirmed", account_mode: accountMode
    });
    setBusy(false);
    if (insertError) { setError("Akun belum tersimpan. Pastikan Migration 0003 sudah dijalankan. Detail: " + insertError.message); return; }
    setAccountName(""); setBroker(""); setBrokerId(null); setAccountNumber(""); setBrokerServer(""); setBrokerServerId(null); setCurrency(""); setShowAccount(false); setNotice("Akun trading berhasil disimpan.");
    await loadData();
  }

  async function createTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountId) { setError("Pilih akun trading terlebih dahulu."); return; }
    setBusy(true); setError(""); setNotice("");
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) { router.replace("/login"); return; }
    const closedAt = status === "closed" ? new Date().toISOString() : null;
    const { error: insertError } = await supabase.from("trades").insert({
      user_id: authData.user.id, trading_account_id: accountId, strategy_id: strategyId || null,
      instrument: instrument.trim().toUpperCase(), market_type: accounts.find(a => a.id === accountId)?.market_type ?? "forex_cfd",
      direction, status, source_type: "manual", opened_at: new Date(openedAt).toISOString(),
      closed_at: closedAt, net_pnl: status === "closed" ? Number(pnl) : null, pnl_currency: pnlCurrency.toUpperCase()
    });
    setBusy(false);
    if (insertError) { setError(insertError.message); return; }
    setShowTrade(false); setInstrument("XAUUSD"); setPnl("0"); setStrategyId("");
    setNotice("Transaksi berhasil disimpan ke database.");
    await loadData();
  }

  async function logout() {
    setBusy(true);
    setError("");
    const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
    setBusy(false);
    if (signOutError) {
      setError("Logout gagal: " + signOutError.message + ". Coba muat ulang halaman.");
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  const filtered = trades.filter(t => t.instrument.toLowerCase().includes(search.toLowerCase()) || t.direction.includes(search.toLowerCase()));
  const closedTrades = trades.filter(t => t.status === "closed" && t.net_pnl !== null);
  const net = closedTrades.reduce((sum, t) => sum + Number(t.net_pnl ?? 0), 0);
  const wins = closedTrades.filter(t => Number(t.net_pnl) > 0).length;
  const winRate = closedTrades.length ? Math.round(wins / closedTrades.length * 100) : 0;
  const accountNameFor = (id: string) => accounts.find(a => a.id === id)?.account_name ?? "Akun tidak ditemukan";
  const strategyNameFor = (id: string | null) => strategies.find(s => s.id === id)?.strategy_name ?? "Belum dipilih";

  if (loading) return <main className="auth-shell"><section className="auth-card">Memuat data Trading Journal...</section></main>;

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-mark">T</span> tradefolio<span className="brand-dot">.</span></a>
        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace"><span className="workspace-avatar">P</span><span><b>Personal Workspace</b><small>Data akun pribadi</small></span></div>
        <div className="nav-label">MENU</div>
        <nav><a className="nav-link selected" href="#overview">▦ <span>Overview</span></a><a className="nav-link" href="#accounts">▣ <span>Trading Accounts</span></a><a className="nav-link" href="#trades">▤ <span>Trade Journal</span></a></nav>
        <div className="sidebar-bottom"><div className="help-card"><b>Trading Journal</b><p>Catat transaksi dan evaluasi performa trading secara terstruktur.</p><span>Data tersimpan di Supabase</span></div><div className="user"><span className="user-avatar">TR</span><span><b>{email || "Trader"}</b><small>Personal account</small></span></div></div>
      </aside>
      <section className="main">
        <header className="topbar"><div className="crumb">Workspace <span>/</span> <b>Overview</b></div><div className="top-right"><span className="status-dot"/> Connected <button className="secondary" onClick={logout} disabled={busy}>{busy ? "Memproses..." : "Keluar"}</button></div></header>
        <div className="content" id="overview">
          <div className="heading-row"><div><div className="eyebrow">TRADING WORKSPACE</div><h1>Trading Journal</h1><p>Data transaksi dan akun trading milikmu.</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="secondary" onClick={() => setShowAccount(true)}>＋ Tambah akun</button><button className="primary" onClick={() => { if (!accounts.length) { setError("Buat akun trading terlebih dahulu."); setShowAccount(true); } else { setAccountId(accounts[0].id); setShowTrade(true); } }}>＋ Catat trade</button></div></div>
          {error && <div className="demo-notice" style={{borderColor:"#f2c6c6",background:"#fff4f4",color:"#a33"}}>{error}</div>}
          {notice && <div className="demo-notice" style={{borderColor:"#bfe8d5",background:"#effaf4",color:"#287653"}}>{notice}</div>}
          <section className="stats">
            <article className="stat"><div className="stat-label">Net P/L</div><strong className={net >= 0 ? "positive" : "negative"}>{money(net)}</strong><small>Total transaksi tertutup</small></article>
            <article className="stat"><div className="stat-label">Win rate</div><strong>{winRate}%</strong><small>{wins} profit dari {closedTrades.length} trade tertutup</small></article>
            <article className="stat"><div className="stat-label">Total trades</div><strong>{trades.length}</strong><small>Data yang tersimpan</small></article>
            <article className="stat"><div className="stat-label">Trading accounts</div><strong>{accounts.length}</strong><small>Akun milik pengguna</small></article>
          </section>
          <section className="panel" id="accounts" style={{marginBottom:15}}><div className="panel-head"><div><h2>Trading Accounts</h2><p>Daftar akun trading yang terhubung ke jurnal.</p></div><button className="secondary" onClick={() => setShowAccount(true)}>＋ Tambah akun</button></div>
            {accounts.length === 0 ? <div className="empty">Belum ada akun trading. Tambahkan akun pertama untuk mulai mencatat transaksi.</div> : <div className="table-wrap"><table><thead><tr><th>NAMA AKUN</th><th>MARKET</th><th>BROKER / EXCHANGE</th><th>MODE</th><th>MATA UANG</th></tr></thead><tbody>{accounts.map(a => <tr key={a.id}><td><b>{a.account_name}</b></td><td>{marketLabels[a.market_type] ?? a.market_type}</td><td>{a.broker_name || "—"}</td><td>{a.account_mode}</td><td>{a.account_currency}</td></tr>)}</tbody></table></div>}
          </section>
          <section className="panel trade-panel" id="trades"><div className="panel-head trade-head"><div><h2>Trade Journal</h2><p>Transaksi tersimpan di database Supabase.</p></div><div className="trade-tools"><input aria-label="Cari transaksi" placeholder="Cari instrumen..." value={search} onChange={e => setSearch(e.target.value)}/><button className="secondary" onClick={() => { if (accounts.length) { setAccountId(accounts[0].id); setShowTrade(true); } else { setShowAccount(true); } }}>＋ Catat trade</button></div></div>
            <div className="table-wrap"><table><thead><tr><th>INSTRUMEN</th><th>AKUN</th><th>DIRECTION</th><th>STRATEGI</th><th>WAKTU BUKA</th><th className="right">NET P/L</th><th>STATUS</th></tr></thead><tbody>{filtered.map(t => <tr key={t.id}><td><b>{t.instrument}</b></td><td>{accountNameFor(t.trading_account_id)}</td><td><span className={t.direction === "long" ? "long" : "short"}>{t.direction.toUpperCase()}</span></td><td>{strategyNameFor(t.strategy_id)}</td><td>{new Date(t.opened_at).toLocaleString("id-ID")}</td><td className={"right amount " + (Number(t.net_pnl) > 0 ? "positive" : Number(t.net_pnl) < 0 ? "negative" : "")}>{t.net_pnl === null ? "—" : money(Number(t.net_pnl), t.pnl_currency)}</td><td>{t.status}</td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty">{trades.length ? "Tidak ada transaksi yang cocok." : "Belum ada transaksi. Catat trade pertamamu."}</div>}</div><div className="table-foot">Menampilkan {filtered.length} dari {trades.length} transaksi <span>Data database · tersimpan</span></div>
          </section>
          <footer>Tradefolio · Trading Journal Platform <span>Fondasi database aktif</span></footer>
        </div>
      </section>
      {showAccount && <div className="overlay account-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setShowAccount(false); }}><form className="modal account-modal" onSubmit={createAccount}><div className="modal-head"><div><h2>Tambah akun trading</h2><p>Formulir menyesuaikan jenis market yang dipilih.</p></div><button type="button" className="close" onClick={() => setShowAccount(false)}>×</button></div>
        <label>Nama akun<input value={accountName} onChange={e => setAccountName(e.target.value)} required placeholder="Contoh: Valetax Live 01"/></label>
        <label>Jenis market<select value={marketType} onChange={e => {setMarketType(e.target.value);setBroker("");setBrokerId(null);setBrokerResults([]);setBrokerServer("");setBrokerServerId(null);setServerResults([]);setAccountNumber("");setPlatform("MT5");setApiKey("");setApiSecret("");setApiPassphrase("");setInvestorPassword("");}}><option value="cfd">{marketLabels.cfd}</option><option value="crypto_futures">{marketLabels.crypto_futures}</option></select></label>
        <label>{marketType === "cfd" ? "Broker" : "Exchange"}
          <div style={{position:"relative"}}>
            <input value={broker} onFocus={async () => {setShowBrokerSuggestions(true);if(broker.trim()){const {data}=await supabase.from("brokers").select("id,broker_name,owner_user_id").ilike("broker_name",`%${broker.trim()}%`).eq("is_active",true).limit(20);setBrokerResults((data??[]) as BrokerOption[]);}}} onChange={async e=>{const value=e.target.value;setBroker(value);setBrokerId(null);setBrokerServer("");setBrokerServerId(null);setShowBrokerSuggestions(true);if(value.trim()){const {data}=await supabase.from("brokers").select("id,broker_name,owner_user_id").ilike("broker_name",`%${value.trim()}%`).eq("is_active",true).order("broker_name").limit(20);setBrokerResults((data??[]) as BrokerOption[]);}else setBrokerResults([]);}} placeholder={marketType==="cfd"?"Cari broker, misalnya Valetax...":"Cari exchange, misalnya Binance..."} autoComplete="off"/>
            {showBrokerSuggestions && <div className="suggestion-menu">{brokerResults.map(item=><button type="button" key={item.id} onClick={()=>{setBroker(item.broker_name);setBrokerId(item.id);setShowBrokerSuggestions(false);}}>{item.broker_name}</button>)}{!brokerResults.length&&<div className="suggestion-empty">Tidak ditemukan. Pilih nama yang tersedia di direktori Tradefolio.</div>}</div>}
          </div><small className="field-hint">Pilih dari direktori agar referensi broker/exchange valid.</small>
        </label>
        {marketType === "cfd" ? <>
          <label>Platform<select value={platform} onChange={e=>{setPlatform(e.target.value);setBrokerServer("");setBrokerServerId(null);setServerResults([]);}}><option value="MT5">MetaTrader 5 (MT5)</option><option value="MT4">MetaTrader 4 (MT4)</option><option value="cTrader">cTrader</option></select></label>
          <label>Broker Server (wajib)
            <div style={{position:"relative"}}><input value={brokerServer} onFocus={async()=>{setShowServerSuggestions(true);if(brokerId){const {data}=await supabase.from("broker_servers").select("id,server_name,environment,is_verified").eq("broker_id",brokerId).eq("platform",platform).eq("is_active",true).limit(30);setServerResults(data??[]);}}} onChange={async e=>{const value=e.target.value;setBrokerServer(value);setBrokerServerId(null);setShowServerSuggestions(true);if(brokerId){let q=supabase.from("broker_servers").select("id,server_name,environment,is_verified").eq("broker_id",brokerId).eq("platform",platform).eq("is_active",true);if(value.trim())q=q.ilike("server_name",`%${value.trim()}%`);const {data}=await q.limit(30);setServerResults(data??[]);}}} placeholder={brokerId?"Pilih server atau ketik nama server...":"Pilih broker terlebih dahulu"} required disabled={!brokerId} autoComplete="off"/>{showServerSuggestions&&brokerId&&<div className="suggestion-menu">{serverResults.map(item=><button type="button" key={item.id} onClick={()=>{setBrokerServer(item.server_name);setBrokerServerId(item.id);setShowServerSuggestions(false);}}>{item.server_name} · {item.environment}{item.is_verified?" · Verified":""}</button>)}{!serverResults.length&&<div className="suggestion-empty">Belum ada server terdaftar untuk broker/platform ini. Ketik nama server persis seperti yang tampil di MT4/MT5.</div>}</div>}</div>
            <small className="field-hint">Server dicari berdasarkan broker dan platform. Jika belum ada di direktori, masukkan nama server persis dari aplikasi trading.</small>
          </label>
          <label>Nomor akun (wajib)<input value={accountNumber} onChange={e=>setAccountNumber(e.target.value)} required inputMode="numeric" placeholder="Masukkan nomor akun trading"/></label>
          <label>Investor Password / Kata Sandi Pantau (wajib)<input type="password" value={investorPassword} onChange={e=>setInvestorPassword(e.target.value)} required autoComplete="off" placeholder="Kata sandi read-only"/></label>
        </> : <>
          <label>Jenis kontrak<select value={contractType} onChange={e=>setContractType(e.target.value)}><option value="linear_usdt">Linear – USDT margined</option><option value="linear_usdc">Linear – USDC margined</option><option value="inverse">Inverse – Coin margined</option></select></label>
          <label>API Key (wajib)<input value={apiKey} onChange={e=>setApiKey(e.target.value)} required autoComplete="off" placeholder="Masukkan API Key read-only"/></label>
          <label>API Secret (wajib)<input type="password" value={apiSecret} onChange={e=>setApiSecret(e.target.value)} required autoComplete="new-password" placeholder="Masukkan API Secret"/></label>
          <label>API Passphrase (jika diperlukan)<input type="password" value={apiPassphrase} onChange={e=>setApiPassphrase(e.target.value)} autoComplete="new-password" placeholder="Wajib untuk exchange yang memerlukannya"/></label>
          <p className="security-note">Gunakan API dengan izin baca saja. Jangan aktifkan izin trading atau penarikan.</p>
        </>}
        <label>Mata uang akun<input value={currency} onChange={e=>setCurrency(e.target.value.toUpperCase())} required maxLength={3} placeholder={marketType==="cfd"?"Contoh: USD":"Contoh: USDT atau BTC"}/></label>
        <label>Mode akun<select value={accountMode} onChange={e=>setAccountMode(e.target.value)}><option value="live">Live</option><option value="demo">Demo</option><option value="forward_test">Forward Test</option></select></label>
        <div className="security-note">Penyimpanan aman kredensial dan verifikasi koneksi sedang disiapkan. Data rahasia tidak akan disimpan sebelum secure vault tersedia.</div>
        <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowAccount(false)}>Batal</button><button className="primary" type="submit" disabled={busy}>{busy?"Memproses...":"Validasi akun"}</button></div>
      </form></div>}
      {showTrade && <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) setShowTrade(false); }}><form className="modal" onSubmit={createTrade}><div className="modal-head"><div><h2>Catat transaksi</h2><p>Masukkan data trade yang sudah dilakukan.</p></div><button type="button" className="close" onClick={() => setShowTrade(false)}>×</button></div><label>Akun trading<select value={accountId} onChange={e => setAccountId(e.target.value)} required>{accounts.map(a => <option value={a.id} key={a.id}>{a.account_name}</option>)}</select></label><label>Instrumen<input value={instrument} onChange={e => setInstrument(e.target.value)} required placeholder="XAUUSD / BTCUSDT"/></label><label>Direction<select value={direction} onChange={e => setDirection(e.target.value as "long" | "short")}><option value="long">Long</option><option value="short">Short</option></select></label><label>Strategi (opsional)<select value={strategyId} onChange={e => setStrategyId(e.target.value)}><option value="">Belum dipilih</option>{strategies.map(s => <option key={s.id} value={s.id}>{s.strategy_name}</option>)}</select></label><label>Waktu buka<input type="datetime-local" value={openedAt} onChange={e => setOpenedAt(e.target.value)} required/></label><label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="closed">Closed</option><option value="open">Open</option></select></label>{status === "closed" && <><label>Net P/L<input type="number" step="0.01" value={pnl} onChange={e => setPnl(e.target.value)} required/></label><label>Mata uang P/L<input value={pnlCurrency} onChange={e => setPnlCurrency(e.target.value)} required maxLength={8}/></label></>}<div className="modal-actions"><button type="button" className="secondary" onClick={() => setShowTrade(false)}>Batal</button><button className="primary" type="submit" disabled={busy}>{busy ? "Menyimpan..." : "Simpan transaksi"}</button></div><p className="modal-note">Ini pencatatan manual. Integrasi broker/exchange akan dibuat pada tahap berikutnya.</p></form></div>}
    </main>
  );
}
