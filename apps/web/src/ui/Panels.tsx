"use client";
import { useEffect, useRef, useState } from "react";
import { ISSUES, applyEvent, componentOf, findRepair, flows, layout, passportView, planRepair, recoveredShare, routeTotals, seamTotals, stationXY, STAGES, STAGE_HINT } from "@kintsugi/domain";
import type { Component, ComponentKey, LifecycleEvent, Passport } from "@kintsugi/schemas";
import { NOW, type Data } from "../data";
import { live, set, state, useStore, VIEWS, type View } from "../store";

const go = (v: View) => { if (v !== state.view) { set({ prevView: state.view, view: v }); history.replaceState(null, "", `#${v}`); } };
const usd = (n: number) => "$" + n.toLocaleString("en-US"), dateOf = (iso: string) => iso.slice(0, 10), cap = (s: string) => s[0].toUpperCase() + s.slice(1);
export const STORE_KEY = "kintsugi:v1";
const persist = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify({ events: state.events })); } catch { /* storage may be blocked */ } };
export function record(p: Passport, type: LifecycleEvent["type"], details: Record<string, unknown>, actor?: string): string | null {
  const ev = state.events[p.serial] ?? p.events, e: LifecycleEvent = { id: `u${ev.length + 1}-${type}`, type, at: NOW, actor: actor ?? p.owner, location: "this browser", details }, r = applyEvent(ev, e);
  if (!r.ok) { set({ flash: r.error }); return r.error; } set({ events: { ...state.events, [p.serial]: r.events }, flash: "" }); persist(); return null;
}
const useView = (data: Data) => { const s = useStore(), p = data.products.find((x) => x.serial === s.serial)!, events = s.events[s.serial] ?? p.events; return { s, p, events, v: passportView(p, events, data.components, NOW) }; };
const Bar = ({ v }: { v: number }) => <span className="bar"><i style={{ width: `${Math.round(v * 100)}%`, background: v > 0.65 ? "#33463B" : v > 0.35 ? "#D9AA45" : "#8E241F" }} /></span>;

export function Wheel({ data }: { data: Data }) {
  const { v } = useView(data), [size, setSize] = useState({ w: 1280, h: 800 });
  useEffect(() => { const f = () => setSize({ w: innerWidth, h: innerHeight }); f(); addEventListener("resize", f); return () => removeEventListener("resize", f); }, []);
  const L = layout(size.w, size.h), R = L.ringPx, C = 2 * Math.PI * R, st = state.introDone ? v.stageIndex : 0, cx = size.w / 2 + (L.cx - size.w / 2) * (state.introDone ? 1 : live.ring), cy = L.cy;
  const hop = ["passport", "lifecycle", "repairs", "resale", "recovery"] as View[];
  return (<div className="wheel" aria-label="Lifecycle wheel" data-testid="wheel" data-stage={v.stageIndex}>
    <svg width="100%" height="100%" aria-hidden><circle className="ring" cx={L.cx} cy={cy} r={R} fill="none" pathLength={1} strokeDasharray={1} style={{ strokeDashoffset: "var(--draw, 0)" }} /></svg>
    {STAGES.map((n, i) => { const [x, y] = stationXY(L, i, 5, R); return (<button key={n} className={`stage ${i === st ? "on" : ""}`} style={{ left: x, top: y, opacity: "var(--nodes, 1)" } as React.CSSProperties} aria-current={i === st ? "step" : undefined} title={STAGE_HINT[i]} onClick={() => go(hop[i])} data-testid={`stage-${i}`}><i>{i + 1}</i><b>{n}</b></button>); })}
    <div className="bead" style={{ transform: `translate(${L.cx}px, ${cy}px) rotate(${st * 72}deg)` }} aria-hidden><i style={{ transform: `translateY(${-R}px)` }} /></div><span style={{ display: "none" }}>{cx}</span></div>);
}
function Lifecycle({ data }: { data: Data }) {
  const { v, events } = useView(data), s = useStore();
  return (<section aria-labelledby="h-l"><h2 id="h-l">{v.model}</h2><p className="lede">Serial <b data-testid="serial">{v.serial}</b>, owned by {v.owner}. The wheel shows where it is in its life; each event is a gold seam in the log.</p>
    <dl className="spec"><div><dt>Stage</dt><dd data-testid="stage-name">{v.stage}</dd></div><div><dt>Status</dt><dd data-testid="status">{v.status.replace("_", " ")}</dd></div><div><dt>Repairs</dt><dd data-testid="repair-count">{v.repairCount}</dd></div><div><dt>Open damage</dt><dd data-testid="open-damage">{v.openDamage.length ? v.openDamage.join(", ") : "none"}</dd></div></dl>
    {s.flash && <p className="warn" role="alert" data-testid="flash">{s.flash}</p>}
    <ol className="log" data-testid="log">{[...events].reverse().map((e) => (<li key={e.id} className={e.type}><time>{dateOf(e.at)}</time><b>{cap(e.type)}</b><span>{e.details.component ? `${e.details.component}${e.details.issue ? `, ${e.details.issue}` : ""}` : e.details.to ? `to ${e.details.to}` : ""}{e.details.method ? ` · ${e.details.method}` : ""}{e.details.costUsd ? ` · ${usd(e.details.costUsd as number)}` : ""}</span><small>{e.actor}, {e.location}</small></li>))}</ol>
    <button className="btn ghost" onClick={() => { set({ events: {}, flash: "" }); try { localStorage.removeItem(STORE_KEY); } catch { /* */ } }} data-testid="reset">Reset the demo data</button></section>);
}
function Passport({ data }: { data: Data }) {
  const { v, events } = useView(data), s = useStore(), mats = v.materialManifest, total = Object.values(mats).reduce((a, b) => a + b, 0), owners = events.filter((e) => e.type === "sold" || e.type === "transferred");
  return (<section aria-labelledby="h-p"><h2 id="h-p">Product passport</h2>
    <div className="scan"><label>Scan or choose a passport<select value={s.serial} onChange={(e) => set({ serial: e.target.value, selComp: null, flash: "" })} data-testid="scan">{data.products.map((p) => <option key={p.id} value={p.serial}>{p.serial}</option>)}</select></label></div>
    <dl className="spec"><div><dt>Model</dt><dd>KG1 kettle</dd></div><div><dt>Made</dt><dd data-testid="made">{v.manufacturedAt}</dd></div><div><dt>Owner</dt><dd data-testid="owner">{v.owner}</dd></div><div><dt>Repairability</dt><dd data-testid="repairability">{v.repairabilityIndex}/10</dd></div></dl>
    <h3>Provenance</h3><ul className="plain" data-testid="provenance"><li>Made by {events[0].actor}, {events[0].location}.</li>{owners.map((e) => <li key={e.id}>{dateOf(e.at)}: {e.type === "sold" ? "sold" : "handed over"} to {String(e.details.to)}.</li>)}</ul>
    <h3>Materials, {total} g</h3><table className="tbl" data-testid="materials"><tbody>{Object.entries(mats).map(([m, g]) => <tr key={m}><td>{cap(m)}</td><td><span className="bar"><i style={{ width: `${(g / total) * 100}%`, background: "#D9AA45" }} /></span></td><td>{g} g</td></tr>)}</tbody></table>
    <h3>Components</h3><ul className="plain">{data.components.map((c) => <li key={c.key}><b>{c.label}</b> <Bar v={v.health[c.key]} /> {Math.round(v.health[c.key] * 100)}%. {c.note}</li>)}</ul></section>);
}
function Repairs({ data }: { data: Data }) {
  const { v, p, events } = useView(data), s = useStore(), totals = seamTotals(data.seams), [issue, setIssue] = useState(""); const c = (s.selComp ? componentOf(data.components, s.selComp) : undefined) as Component | undefined;
  const open = c ? v.openDamage.includes(c.key) : false, iss = c ? (ISSUES[c.key].includes(issue) ? issue : ISSUES[c.key][0]) : "", plan = c ? planRepair(c, iss, (totals[cap(c.key)] ?? 0) * 12) : null;
  const hist = c ? events.filter((e) => e.details.component === c.key) : [];
  return (<section aria-labelledby="h-r"><h2 id="h-r">Repair history</h2><p className="lede">Choose a component here or on the object. A damaged part separates; a repair pulls it back, and a gold seam stays where it broke.</p>
    <ul className="comps" data-testid="components">{data.components.map((x) => <li key={x.key}><button className={`row ${s.selComp === x.key ? "on" : ""} ${v.openDamage.includes(x.key) ? "bad" : ""}`} onClick={() => set({ selComp: x.key })} aria-pressed={s.selComp === x.key} data-testid={`comp-${x.key}`}><b>{x.label}</b><Bar v={v.health[x.key]} /><span>{v.openDamage.includes(x.key) ? "damaged" : `${Math.round(v.health[x.key] * 100)}%`}</span></button></li>)}</ul>
    {s.flash && <p className="warn" role="alert" data-testid="flash">{s.flash}</p>}
    {c && <div className="detail" data-testid="detail"><h3>{c.label}</h3><p>{c.note}</p><h4>History</h4><ul className="plain" data-testid="hist">{hist.length ? hist.map((e) => <li key={e.id}>{dateOf(e.at)}: {e.type}{e.details.issue ? `, ${e.details.issue}` : ""}{e.details.method ? ` (${e.details.method})` : ""}</li>) : <li>No events for this component.</li>}</ul>
      {!open ? <div className="row2"><label>Issue <select value={iss} onChange={(e) => setIssue(e.target.value)} data-testid="issue">{ISSUES[c.key].map((i) => <option key={i}>{i}</option>)}</select></label><button className="btn" onClick={() => record(p, "damaged", { component: c.key, issue: iss })} data-testid="report">Report damage</button></div> :
        <div data-testid="plan"><h4>Repair plan</h4><p><b>{plan!.label}</b>. {plan!.hours} h, {usd(plan!.costUsd)}, parts: {plan!.parts.map((x) => `${x.sku} ×${x.qty}`).join(", ") || "none"}. {plan!.visible ? "The repair will show as a gold seam." : "The repair is invisible."}</p>
        <div className="row2"><button className="btn primary" onClick={() => { const e = record(p, "repaired", { component: c.key, issue: v.openDamage.includes(c.key) ? iss : iss, method: plan!.method, hours: plan!.hours, costUsd: plan!.costUsd }); if (!e) live.repaired = c.key; }} data-testid="repair">Record the repair</button><button className="btn ghost" onClick={() => go("finder")} data-testid="to-finder">Find a repairer</button></div></div>}</div>}</section>);
}
const PLACES: Record<string, [string, number, number]> = { lyon: ["Lyon", 45.76, 4.84], lagos: ["Lagos", 6.52, 3.38], kyoto: ["Kyoto", 35.01, 135.77], nyc: ["New York", 40.71, -74.0] };
function Finder({ data }: { data: Data }) {
  const { v } = useView(data), s = useStore(), key = (s.selComp ?? v.openDamage[0] ?? "lid") as ComponentKey, c = componentOf(data.components, key)!, issue = ISSUES[key][0], plan = planRepair(c, issue, 20), [from, setFrom] = useState(s.finderFrom), pos = PLACES[from];
  const offers = findRepair(data.shops, key, plan.method, [pos[1], pos[2]], 20000);
  return (<section aria-labelledby="h-f"><h2 id="h-f">Repair finder</h2><p className="lede">For the <b>{c.label.toLowerCase()}</b>: {plan.label.toLowerCase()}. Shops that can do the method come first, then those with the part in stock, then the nearest.</p>
    <div className="row2"><label>Component <select value={key} onChange={(e) => set({ selComp: e.target.value as ComponentKey })} data-testid="finder-comp">{data.components.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</select></label><label>From <select value={from} onChange={(e) => { setFrom(e.target.value); set({ finderFrom: e.target.value }); }} data-testid="finder-from">{Object.entries(PLACES).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select></label></div>
    <table className="tbl" data-testid="offers"><thead><tr><th>Shop</th><th>km</th><th>Can do</th><th>Part</th><th>Days</th></tr></thead><tbody>{offers.map((o) => <tr key={o.shop.id} data-testid={`offer-${o.shop.id}`}><td>{o.shop.name}</td><td>{o.distanceKm.toLocaleString("en-US")}</td><td>{o.canDo ? "yes" : "no"}</td><td>{o.inStock ? "in stock" : "to order"}</td><td>{o.etaDays}</td></tr>)}</tbody></table></section>);
}
function Resale({ data }: { data: Data }) {
  const { v, p } = useView(data), s = useStore(), [ask, setAsk] = useState(String(Math.round(v.resaleValueUsd))), [to, setTo] = useState("");
  return (<section aria-labelledby="h-s"><h2 id="h-s">Resale and refurbishment</h2><p className="lede">Condition grade follows component health and open damage. Each visible gold repair adds a small premium in this demo (an invented rule).</p>
    <dl className="spec"><div><dt>Grade</dt><dd data-testid="grade">{v.grade}</dd></div><div><dt>Estimated value</dt><dd data-testid="value">{usd(v.resaleValueUsd)}</dd></div><div><dt>Status</dt><dd data-testid="status">{v.status.replace("_", " ")}</dd></div><div><dt>Stage</dt><dd data-testid="stage-name">{v.stage}</dd></div></dl>
    {s.flash && <p className="warn" role="alert" data-testid="flash">{s.flash}</p>}
    {v.status === "in_use" && <div className="row2"><label>Ask <input value={ask} onChange={(e) => setAsk(e.target.value)} inputMode="numeric" data-testid="ask" /></label><button className="btn primary" onClick={() => record(p, "listed", { askUsd: Number(ask) })} data-testid="list">List for resale</button></div>}
    {v.status === "listed" && <><div className="row2"><button className="btn" onClick={() => record(p, "refurbished", {})} data-testid="refurbish">Mark as refurbished</button></div><div className="row2"><label>New owner <input value={to} onChange={(e) => setTo(e.target.value)} data-testid="new-owner" /></label><button className="btn primary" onClick={() => record(p, "transferred", { to }, p.owner)} data-testid="transfer">Hand over</button></div></>}
    {v.openDamage.length > 0 && <p className="note">Open damage on the {v.openDamage.join(", ")}: repair it before refurbishing or reselling at a better grade.</p>}</section>);
}
function Recovery({ data }: { data: Data }) {
  const { v, p } = useView(data), f = flows(data.components), routes = routeTotals(f), cv = useRef<HTMLCanvasElement>(null), [sure, setSure] = useState(false), s = useStore();
  useEffect(() => { // physical shards, not a Sankey: one dot per 2 g, streaming from the product to its routes
    const c = cv.current; if (!c) return; const g = c.getContext("2d")!, names = Object.keys(routes), dots = f.flatMap((x) => Array.from({ length: Math.max(1, Math.round(x.grams / 6)) }, (_, i) => ({ to: names.indexOf(x.route), m: x.material, t: ((i * 0.37) % 1) }))); let raf = 0, t0 = performance.now(); const col: Record<string, string> = { glaze: "#EEE7D5", lacquer: "#8E241F", steel: "#AAA69D", silicone: "#33463B" };
    const draw = (n: number) => { const t = state.pauseMotion || state.reduced ? 0.6 : (n - t0) / 4000; g.clearRect(0, 0, c.width, c.height); names.forEach((nm, i) => { const y = 24 + i * 38; g.fillStyle = "#AAA69D"; g.font = "12px system-ui"; g.fillText(`${nm}  ${routes[nm]} g`, 330, y + 4); g.strokeStyle = "rgba(217,170,69,.4)"; g.beginPath(); g.moveTo(60, 100); g.bezierCurveTo(180, 100, 200, y, 320, y); g.stroke(); });
      for (const d of dots) { const u = (t * 0.5 + d.t) % 1, y1 = 24 + d.to * 38, x = 60 + u * 260, y = 100 + (y1 - 100) * (u * u * (3 - 2 * u)); g.fillStyle = col[d.m] ?? "#fff"; g.beginPath(); g.moveTo(x, y - 3); g.lineTo(x + 3, y + 2); g.lineTo(x - 3, y + 2); g.closePath(); g.fill(); } g.fillStyle = "#EEE7D5"; g.fillRect(40, 84, 20, 32); raf = requestAnimationFrame(draw); }; raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  return (<section aria-labelledby="h-c"><h2 id="h-c">Material recovery</h2><p className="lede">One shard for every few grams of the bill of materials, streaming to the route that takes it. Rates are invented; the masses are the components' real contract values.</p>
    <canvas ref={cv} width={520} height={180} className="flow" role="img" aria-label={`Material flows: ${Object.entries(routes).map(([k, g]) => `${g} grams to ${k}`).join(", ")}`} data-testid="flow" />
    <table className="tbl" data-testid="routes"><thead><tr><th>Route</th><th>Grams</th></tr></thead><tbody>{Object.entries(routes).map(([k, g]) => <tr key={k}><td>{k}</td><td data-testid={`route-${k.replace(/ /g, "-")}`}>{g}</td></tr>)}</tbody></table>
    <dl className="spec"><div><dt>Recovered</dt><dd data-testid="recovered">{Math.round(recoveredShare(f) * 1000) / 10}%</dd></div><div><dt>Total mass</dt><dd>{data.components.reduce((a, c) => a + c.massG, 0)} g</dd></div></dl>
    {s.flash && <p className="warn" role="alert" data-testid="flash">{s.flash}</p>}{v.status !== "recycled" && <div className="row2"><label className="chk"><input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} data-testid="sure" /> I understand this ends the product's life</label><button className="btn" disabled={!sure} onClick={() => record(p, "recycled", {})} data-testid="recycle">Send to recovery</button></div>}{v.status === "recycled" && <p className="note">Recovered: this passport is closed.</p>}</section>);
}
export default function Panels({ data }: { data: Data }) {
  const s = useStore(), idx = VIEWS.findIndex((v) => v.id === s.view), V = s.view;
  return (
    <div className="ui" data-testid="hud">
      <header className="top"><span className="brand">KINTSUGI</span><span className="seam" aria-hidden /><button className="btn ghost" aria-pressed={s.pauseMotion} onClick={() => set({ pauseMotion: !s.pauseMotion })} data-testid="pause-motion">{s.pauseMotion ? "Resume motion" : "Pause motion"}</button></header>
      <nav className="rail" aria-label="Views">{VIEWS.map((v, i) => <button key={v.id} className={i === idx ? "on" : ""} aria-current={i === idx ? "page" : undefined} onClick={() => go(v.id)} data-testid={`nav-${v.id}`}><b>{v.label}</b><small>{v.blurb}</small></button>)}</nav>
      <main className={`panel ${s.reduced ? "" : "wipe"}`} key={V} tabIndex={-1}>{V === "lifecycle" && <Lifecycle data={data} />}{V === "passport" && <Passport data={data} />}{V === "repairs" && <Repairs data={data} />}{V === "finder" && <Finder data={data} />}{V === "resale" && <Resale data={data} />}{V === "recovery" && <Recovery data={data} />}</main>
    </div>
  );
}
