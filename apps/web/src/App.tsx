"use client";
import { useEffect, useState } from "react";
import { loadData, base, type Data } from "./data";
import { live, set, state, useStore, VIEWS } from "./store";
import { validateHistory } from "@kintsugi/domain";
import Intro from "./ui/Intro";
import Panels, { STORE_KEY, Wheel } from "./ui/Panels";
import Scene from "./scene/Scene";
const webglOk = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } };
export default function App() {
  const s = useStore(); const [data, setData] = useState<Data | null>(null); const [err, setErr] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(location.search), rm = matchMedia("(prefers-reduced-motion: reduce)").matches || q.get("motion") === "reduced", view = VIEWS.find((v) => v.id === q.get("view"))?.id, skip = q.get("skip") === "1" || !!view;
    loadData().then((d) => {
      let events: Record<string, never> | Record<string, import("@kintsugi/schemas").LifecycleEvent[]> = {}; try { const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null")?.events ?? {}; for (const [k, v] of Object.entries(saved)) if (d.products.some((p) => p.serial === k) && !validateHistory(v as never)) (events as Record<string, unknown>)[k] = v; } catch { /* a corrupted store is ignored */ }
      const serial = d.products.find((p) => p.serial === q.get("serial"))?.serial ?? d.products[0].serial;
      set({ reduced: rm, pauseMotion: rm, gfx: q.get("gfx") === "off" || !webglOk() ? "poster" : "webgl", events: events as never, serial, ...(view ? { view } : {}), ...(q.get("comp") ? { selComp: q.get("comp") as never } : {}), ...(skip ? { introDone: true, introStep: 99 } : {}) });
      if (skip) { const r = document.documentElement.style; r.setProperty("--draw", "0"); r.setProperty("--nodes", "1"); r.setProperty("--sweep", "360deg"); r.setProperty("--ui", "1"); Object.assign(live, { ring: 1, fall: 0, shatter: 0, assemble: 1, seams: 1 }); }
      setData(d); }).catch((e) => setErr(String(e)));
  }, []);
  useEffect(() => { const f = () => { const v = VIEWS.find((x) => x.id === location.hash.slice(1)); if (v && v.id !== state.view && state.introDone) set({ prevView: state.view, view: v.id }); }; addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  if (err) return <div className="boot" role="alert">Could not load data: {err}</div>;
  if (!data) return <div className="boot" role="status">Firing the kiln…</div>;
  return (
    <div className="app" data-view={s.view} data-intro={s.introDone ? "done" : "running"} data-gfx={s.gfx}>
      {s.gfx === "webgl" ? <Scene data={data} /> : <div className="poster" style={{ backgroundImage: `url(${base}/posters/kettle.png)` }} role="img" aria-label="Still of the ceramic kettle on a dark plinth" data-testid="poster" />}
      <div className="vignette" aria-hidden /><Wheel data={data} /><Panels data={data} />{(!s.introDone || s.introFx) && <Intro />}
    </div>
  );
}
