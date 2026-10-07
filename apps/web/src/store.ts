import { useSyncExternalStore } from "react";
import type { ComponentKey, LifecycleEvent, Passport } from "@kintsugi/schemas";
export type View = "lifecycle" | "passport" | "repairs" | "finder" | "resale" | "recovery";
export const VIEWS: { id: View; label: string; blurb: string; stage: number }[] = [
  { id: "lifecycle", label: "Lifecycle", blurb: "The wheel and the log", stage: 1 }, { id: "passport", label: "Passport", blurb: "Provenance and materials", stage: 0 }, { id: "repairs", label: "Repairs", blurb: "Spatial history", stage: 2 },
  { id: "finder", label: "Repair finder", blurb: "Who, where, in stock", stage: 2 }, { id: "resale", label: "Resale", blurb: "Condition and value", stage: 3 }, { id: "recovery", label: "Recovery", blurb: "Where the materials go", stage: 4 },
];
export type State = { view: View; prevView: View; serial: string; events: Record<string, LifecycleEvent[]>; owners: Record<string, string>; selComp: ComponentKey | null; finderFrom: string; introDone: boolean; introFx: boolean; introStep: number; reduced: boolean; pauseMotion: boolean; gfx: "webgl" | "poster"; flash: string };
export const state: State = { view: "lifecycle", prevView: "lifecycle", serial: "KG-2021-00417", events: {}, owners: {}, selComp: null, finderFrom: "lyon", introDone: false, introFx: false, introStep: 0, reduced: false, pauseMotion: false, gfx: "webgl", flash: "" };
/** Per-frame values the intro and the canvas read; not reactive. */
export const live = { fall: 0, shatter: 0, assemble: 1, seams: 1, fragK: 0, ring: 1, drag: 0, repairPulse: 0, repaired: "" as string, lastSettled: false, impact: 0 };
let snap = { ...state }; const subs = new Set<() => void>();
export function set(p: Partial<State>) { Object.assign(state, p); snap = { ...state }; subs.forEach((f) => f()); }
export const useStore = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => snap, () => snap);
export const passportOf = (ps: Passport[], serial: string) => ps.find((p) => p.serial === serial)!;
