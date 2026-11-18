"use client";

import { useMemo, useState } from "react";

type Trade = {
  id: string;
  symbol: string;
  direction: "Long" | "Short";
  strategy: string;
  date: string;
  pnl: number;
};

const sampleTrades: Trade[] = [
  { id: "TR-001", symbol: "XAUUSD", direction: "Long", strategy: "Price Action", date: "18 Nov 2026", pnl: 128.4 },
  { id: "TR-002", symbol: "EURUSD", direction: "Short", strategy: "SMC", date: "17 Nov 2026", pnl: 64.2 },
  { id: "TR-003", symbol: "BTCUSDT", direction: "Long", strategy: "Breakout", date: "17 Nov 2026", pnl: -42.5 },
  { id: "TR-004", symbol: "GBPJPY", direction: "Short", strategy: "Harmonic", date: "16 Nov 2026", pnl: 0 },
  { id: "TR-005", symbol: "XAUUSD", direction: "Long", strategy: "Elliott Wave", date: "15 Nov 2026", pnl: 91.8 }
];

const strategies = ["Price Action", "Harmonic", "SMC", "ICT", "Elliott Wave", "Support & Resistance", "Supply & Demand", "Breakout", "Trend Following", "Mean Reversion", "Indicator-Based", "Volume-Based", "Custom"];
const money = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(2)}`;

export default function Home() {
  const [trades, setTrades] = useState(sampleTrades);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [symbol, setSymbol] = useState("XAUUSD");
  const [direction, setDirection] = useState<"Long" | "Short">("Long");
  const [strategy, setStrategy] = useState("Price Action");
  const [pnl, setPnl] = useState("50");

  const filtered = useMemo(() => trades.filter(t =>
    [t.id, t.symbol, t.strategy, t.direction].join(" ").toLowerCase().includes(search.toLowerCase())
  ), [trades, search]);

  const net = trades.reduce((sum, t) => sum + t.pnl, 0);
  const wins = trades.filter(t => t.pnl > 0).length;
  const closed = trades.filter(t => t.pnl !== 0).length;
  const winRate = closed ? Math.round((wins / closed) * 100) : 0;

  function submitTrade(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(pnl);
    if (!Number.isFinite(value)) return;
    const next: Trade = {
      id: `TR-${String(Date.now()).slice(-6)}`,
      symbol: symbol.trim().toUpperCase(),
      direction,
      strategy,
      date: "Just now",
      pnl: value
    };
    setTrades(current => [next, ...current]);
    setShowForm(false);
    setPnl("50");
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-mark">T</span> tradefolio<span className="brand-dot">.</span></a>
        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace"><span className="workspace-avatar">P</span><span><b>Personal Workspace</b><small>Free plan · Demo</small></span><span className="chevron">⌄</span></div>
        <div className="nav-label">MENU</div>
        <nav>
          <a className="nav-link selected" href="#overview">▦ <span>Overview</span></a>
          <a className="nav-link" href="#trades">▤ <span>Trade Journal</span></a>
          <a className="nav-link" href="#analytics">▥ <span>Analytics</span></a>
          <a className="nav-link" href="#strategies">◎ <span>Strategies</span></a>
          <a className="nav-link" href="#risk">◇ <span>Risk Management</span></a>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><b>Build better habits</b><p>Record, review, and understand your trading decisions.</p><span>Trading journal workspace ↗</span></div>
          <div className="user"><span className="user-avatar">TR</span><span><b>Trader</b><small>Personal account</small></span></div>
        </div>
      </aside>

      <section className="main">
        <header className="topbar"><div className="crumb">Workspace <span>/</span> <b>Overview</b></div><div className="top-right"><span className="status-dot"/> Demo environment <span className="top-avatar">TR</span></div></header>
        <div className="content" id="overview">
          <div className="heading-row"><div><div className="eyebrow">TRADING WORKSPACE</div><h1>Good morning, Trader</h1><p>Review your trading activity and performance.</p></div><button className="primary" onClick={() => setShowForm(true)}>＋ Add trade</button></div>

          <div className="demo-notice"><b>DEMO DATA</b><span>These sample trades are illustrative and are not connected to a broker or database. New entries remain in this browser session only.</span></div>

          <section className="stats">
            <article className="stat"><div className="stat-label">Net P/L <span className="stat-icon green">↗</span></div><strong className={net >= 0 ? "positive" : "negative"}>{money(net)}</strong><small>Combined sample trade results</small></article>
            <article className="stat"><div className="stat-label">Win rate <span className="stat-icon blue">◎</span></div><strong>{winRate}%</strong><small>{wins} winning trades of {closed} closed</small><div className="progress"><i style={{width: `${winRate}%`}}/></div></article>
            <article className="stat"><div className="stat-label">Total trades <span className="stat-icon purple">▥</span></div><strong>{trades.length}</strong><small>Across all recorded strategies</small></article>
            <article className="stat"><div className="stat-label">Risk status <span className="stat-icon amber">◇</span></div><strong className="risk-text">Not configured</strong><small>Risk rules will be added in a later phase</small></article>
          </section>

          <section className="panels" id="analytics">
            <article className="panel performance"><div className="panel-head"><div><h2>Performance overview</h2><p>Illustrative cumulative P/L · sample only</p></div><span className="tag">Sample view</span></div><div className="chart-total">{money(net)}</div><div className="chart"><div className="y-labels"><span>$300</span><span>$200</span><span>$100</span><span>$0</span><span>-$100</span></div><svg viewBox="0 0 620 180" preserveAspectRatio="none" aria-label="Illustrative sample performance line"><path className="grid" d="M0 10H620 M0 50H620 M0 90H620 M0 130H620 M0 170H620"/><path className="area" d="M0 145 C40 140 50 130 90 137 S140 110 180 117 S230 78 270 93 S320 65 360 78 S410 45 450 58 S500 28 540 43 S590 18 620 22 V180 H0Z"/><path className="line" d="M0 145 C40 140 50 130 90 137 S140 110 180 117 S230 78 270 93 S320 65 360 78 S410 45 450 58 S500 28 540 43 S590 18 620 22"/></svg></div><div className="x-labels"><span>12 Nov</span><span>13 Nov</span><span>14 Nov</span><span>15 Nov</span><span>16 Nov</span><span>17 Nov</span><span>18 Nov</span></div></article>
            <article className="panel" id="strategies"><div className="panel-head"><div><h2>Strategy mix</h2><p>Primary strategy labels</p></div></div><div className="strategy-list">{strategies.slice(0,6).map((s, i) => { const count = trades.filter(t => t.strategy === s).length; return <div className="strategy-row" key={s}><span className={`strategy-dot dot-${i}`}/><span>{s}</span><b>{count}</b></div>; })}</div><p className="muted-note">A trade can have one primary strategy and multiple supporting confirmations in the planned data model.</p></article>
          </section>

          <section className="panel trade-panel" id="trades"><div className="panel-head trade-head"><div><h2>Recent trades</h2><p>Your latest journal entries</p></div><div className="trade-tools"><input aria-label="Search trades" placeholder="Search trades..." value={search} onChange={e => setSearch(e.target.value)}/><button className="secondary" onClick={() => setShowForm(true)}>＋ Add trade</button></div></div><div className="table-wrap"><table><thead><tr><th>TRADE ID</th><th>INSTRUMENT</th><th>DIRECTION</th><th>PRIMARY STRATEGY</th><th>DATE</th><th className="right">NET P/L</th><th>RESULT</th></tr></thead><tbody>{filtered.map(t => <tr key={t.id}><td className="id-cell">{t.id}</td><td><b>{t.symbol}</b></td><td><span className={t.direction === "Long" ? "long" : "short"}>{t.direction}</span></td><td>{t.strategy}</td><td className="date-cell">{t.date}</td><td className={`right amount ${t.pnl > 0 ? "positive" : t.pnl < 0 ? "negative" : ""}`}>{money(t.pnl)}</td><td><span className={`result ${t.pnl > 0 ? "win" : t.pnl < 0 ? "loss" : "be"}`}>{t.pnl > 0 ? "Win" : t.pnl < 0 ? "Loss" : "Break even"}</span></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty">No trades found.</div>}</div><div className="table-foot">Showing {filtered.length} of {trades.length} trades <span>Demo data · not persisted</span></div></section>
          <footer>Tradefolio · Trading Journal Platform <span>Foundation phase · Demo mode</span></footer>
        </div>
      </section>

      {showForm && <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}><form className="modal" onSubmit={submitTrade}><div className="modal-head"><div><h2>Record a trade</h2><p>Add a completed trade to the demo journal.</p></div><button type="button" className="close" onClick={() => setShowForm(false)}>×</button></div><label>Instrument<input value={symbol} onChange={e => setSymbol(e.target.value)} required placeholder="e.g. XAUUSD"/></label><label>Direction<select value={direction} onChange={e => setDirection(e.target.value as "Long" | "Short")}><option>Long</option><option>Short</option></select></label><label>Primary strategy<select value={strategy} onChange={e => setStrategy(e.target.value)}>{strategies.map(s => <option key={s}>{s}</option>)}</select></label><label>Net P/L (USD)<input type="number" step="0.01" value={pnl} onChange={e => setPnl(e.target.value)} required/></label><div className="modal-actions"><button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="primary" type="submit">Save demo trade</button></div><p className="modal-note">This is a temporary demo entry. Database persistence is not implemented yet.</p></form></div>}
    </main>
  );
}
