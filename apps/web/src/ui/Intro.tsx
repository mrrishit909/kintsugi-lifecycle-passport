"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { live, set, state, useStore } from "../store";

// Steps (blueprint section 3): 0 the perfect object on its plinth, 1 it falls and shatters, 2 silence, 3 gold seams appear as the shards levitate and reassemble, 4 the line, 5 one gold seam expands across the screen and becomes the lifecycle wheel.
export default function Intro() {
  const s = useStore(), tl = useRef<gsap.core.Timeline | null>(null), [cap, setCap] = useState(""), [line, setLine] = useState(false); const root = document.documentElement;
  const finish = () => { tl.current?.kill(); Object.assign(live, { fall: 0, shatter: 0, assemble: 1, seams: 1, ring: 1 }); root.style.setProperty("--draw", "0"); root.style.setProperty("--nodes", "1"); root.style.setProperty("--sweep", "360deg"); root.style.setProperty("--ui", "1"); set({ introFx: false, introStep: 99, ...(state.introDone ? {} : { introDone: true }) }); setLine(false); }; // never overwrite what the visitor did while the last fade ran
  useEffect(() => {
    if (state.reduced) return; gsap.ticker.lagSmoothing(0);
    Object.assign(live, { fall: 0, shatter: 0, assemble: 0, seams: 0, ring: 0 }); root.style.setProperty("--draw", "1"); root.style.setProperty("--nodes", "0"); root.style.setProperty("--sweep", "0deg"); root.style.setProperty("--ui", "0");
    const t = gsap.timeline({ defaults: { ease: "power1.inOut" }, onComplete: finish }); tl.current = t; const step = (n: number, c = "") => () => { set({ introStep: n }); setCap(c); }, g = { v: 0 };
    t.call(step(0, ""), [], 0).to(live, { fall: 0.7, duration: 0.8, ease: "power2.out" }, 2.8).to(live, { fall: 0, duration: 0.5, ease: "power2.in" }, 3.7).call(() => { live.shatter = 1; set({ introStep: 1 }); }, [], 4.2)
      .call(() => { live.shatter = 2; set({ introStep: 2 }); }, [], 6.9)
      .call(() => { live.shatter = 3; set({ introStep: 3 }); }, [], 8.3).to(live, { assemble: 1, duration: 2.8, ease: "power1.inOut" }, 8.3).to(live, { seams: 1, duration: 3.2, ease: "none" }, 8.5)
      .call(() => { live.shatter = 4; }, [], 11.6)
      .call(() => { set({ introStep: 4 }); setLine(true); }, [], 12.4).call(() => setLine(false), [], 15.2)
      .call(() => { set({ introStep: 5 }); }, [], 15.4).to(live, { ring: 1, duration: 2.6, ease: "power2.inOut" }, 15.4)
      .to(g, { v: 1, duration: 3, ease: "power2.inOut", onUpdate() { const v = g.v; root.style.setProperty("--draw", String(1 - v)); root.style.setProperty("--sweep", `${v * 360}deg`); root.style.setProperty("--ui", String(Math.min(1, v * 1.6))); root.style.setProperty("--nodes", String(Math.max(0, (v - 0.6) / 0.4))); } }, 15.6)
      .call(() => { set({ introDone: true, introFx: true, introStep: 99 }); }, [], 18.6);
    return () => { if (!state.introDone) t.kill(); }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const skip = () => { const tt = tl.current; if (tt && tt.time() < 15.3) { live.shatter = 4; live.assemble = 1; live.seams = 1; tt.seek(15.4); } else finish(); };
  if (s.introDone && !s.introFx) return null;
  if (s.reduced) { const fr = [["Perfect", "A ceramic kettle on a dark plinth."], ["Broken", "It falls and shatters into authored shards."], ["Mended", "Gold seams find the breaks and the pieces return."], ["Nothing should become waste before its time", "The seam becomes the lifecycle wheel."]];
    return (<div className="intro intro-static" role="dialog" aria-label="Opening story" data-testid="intro"><ol>{fr.map(([a, b], i) => <li key={i}><b>{a}</b> {b}</li>)}</ol><button className="btn primary" onClick={finish} data-testid="skip-intro">Enter the passport</button></div>); }
  return (<div className={`intro ${s.introDone ? "fx" : ""}`} data-testid="intro" data-step={s.introStep}>
    {line && <h1 className="statement" data-testid="statement">Nothing should become waste before its time.</h1>}<p className="caption" role="status">{cap}</p>{!s.introDone && <button className="btn skip" onClick={skip} data-testid="skip-intro" autoFocus>Skip intro</button>}</div>);
}
