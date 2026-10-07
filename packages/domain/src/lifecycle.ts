// The product's life as a small state machine over an append-only event log. Invented demo rules, written so an invalid history cannot be produced.
import type { EventType, LifecycleEvent, Passport } from "@kintsugi/schemas";
export type Status = "new" | "in_use" | "listed" | "recycled";
export const STAGES = ["Make", "Use", "Repair", "Resell", "Recover"] as const;
export type Stage = 0 | 1 | 2 | 3 | 4;
export const STAGE_HINT = ["Manufactured and registered", "In use by its owner", "Repaired, visibly", "Listed or refurbished for a new owner", "Recovered as materials"];
export function statusOf(events: LifecycleEvent[]): Status {
  let s: Status = "new";
  for (const e of events) { if (e.type === "manufactured") s = "new"; else if (e.type === "sold" || e.type === "transferred") s = "in_use"; else if (e.type === "listed") s = "listed"; else if (e.type === "refurbished") s = "listed"; else if (e.type === "recycled") s = "recycled"; }
  return s;
}
export type Result = { ok: true; events: LifecycleEvent[] } | { ok: false; error: string };
const RULES: Record<EventType, (s: Status, e: LifecycleEvent, ev: LifecycleEvent[]) => string | null> = {
  manufactured: (_s, _e, ev) => (ev.length ? "a product is manufactured once" : null),
  sold: (s) => (s === "new" ? null : "only a new product can be sold for the first time"),
  damaged: (s, e) => (s === "in_use" || s === "listed" ? (typeof e.details.component === "string" ? null : "a damage report names a component") : "a product that is not in someone's hands cannot be reported damaged"),
  repaired: (s, e, ev) => { if (s !== "in_use" && s !== "listed") return "only a product in use or listed can be repaired"; const c = e.details.component; if (typeof c !== "string") return "a repair names a component"; return openDamage(ev).includes(c) ? null : `there is no open damage report for ${c}`; },
  listed: (s) => (s === "in_use" ? null : "only a product in use can be listed for resale"),
  transferred: (s, e) => (s !== "listed" ? "a product must be listed before it changes hands" : typeof e.details.to === "string" && e.details.to ? null : "a transfer names the new owner"),
  refurbished: (s, _e, ev) => (s === "listed" || s === "in_use" ? (openDamage(ev).length ? "repair every open damage before refurbishing" : null) : "only a product in use or listed can be refurbished"),
  recycled: (s, _e, ev) => (s === "recycled" ? "already recycled" : s === "new" ? "a new product is not recycled" : openDamage(ev).length >= 0 ? null : null),
};
/** Components with a damage report that no later repair has closed. */
export function openDamage(events: LifecycleEvent[]): string[] {
  const open = new Set<string>(); for (const e of events) { const c = e.details.component as string | undefined; if (!c) continue; if (e.type === "damaged") open.add(c); if (e.type === "repaired") open.delete(c); } return [...open];
}
export function applyEvent(events: LifecycleEvent[], e: LifecycleEvent): Result {
  const err = RULES[e.type](statusOf(events), e, events); if (err) return { ok: false, error: err };
  if (events.length && Date.parse(e.at) < Date.parse(events[events.length - 1].at)) return { ok: false, error: "events are recorded in time order" };
  return { ok: true, events: [...events, e] };
}
export function validateHistory(events: LifecycleEvent[]): string | null { let acc: LifecycleEvent[] = []; for (const e of events) { const r = applyEvent(acc, e); if (!r.ok) return `${e.type} at ${e.at}: ${r.error}`; acc = r.events; } return null; }
/** Which stage of the wheel the product is in now. */
export function stageOf(events: LifecycleEvent[]): Stage {
  const s = statusOf(events), last = events[events.length - 1];
  if (s === "recycled") return 4; if (s === "listed") return 3; if (s === "new") return 0;
  return last && (last.type === "repaired" || last.type === "damaged") ? 2 : 1;
}
export const repairCount = (events: LifecycleEvent[]) => events.filter((e) => e.type === "repaired").length;
export const ownerOf = (p: Passport) => [...p.events].reverse().find((e) => e.type === "transferred" || e.type === "sold")?.details.to as string | undefined ?? p.owner;
export const ageYears = (p: Passport, now: string) => Math.max(0, (Date.parse(now) - Date.parse(p.manufacturedAt)) / (365.25 * 86400000));
