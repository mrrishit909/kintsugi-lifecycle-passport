import type { Component, ComponentKey, LifecycleEvent } from "@kintsugi/schemas";
import { openDamage } from "./lifecycle.ts";
export type Method = "kintsugi" | "replace" | "reseal" | "rewrap";
export type Plan = { method: Method; label: string; parts: { sku: string; qty: number }[]; hours: number; costUsd: number; visible: boolean };
export const ISSUES: Record<ComponentKey, string[]> = { body: ["crack", "chip", "break"], lid: ["chip", "break"], handle: ["loose", "crack", "wrap worn"], spout: ["chip", "crack"], base: ["loose", "scratched"], gasket: ["worn"], strainer: ["clogged", "bent"] };
/** The repair a given component and issue call for, with parts, labour and a visible-repair flag (gold seams show on the object). Rates are invented. */
export function planRepair(c: Component, issue: string, seamCm = 0): Plan {
  const rate = 38;
  if (c.material === "glaze" || (c.key === "handle" && issue !== "wrap worn" && issue !== "loose")) {
    const hours = 1.5 + seamCm / 18 + (issue === "break" ? 2 : 0); return { method: "kintsugi", label: `Gold-seam re-bond of the ${c.label.toLowerCase()}`, parts: [{ sku: "urushi-gold-kit", qty: 1 }], hours: Math.round(hours * 10) / 10, costUsd: Math.round(hours * rate + 14), visible: true };
  }
  if (c.key === "gasket") return { method: "replace", label: "Replace the silicone gasket", parts: [{ sku: "gasket-kg1", qty: 1 }], hours: 0.2, costUsd: 9, visible: false };
  if (c.key === "strainer") return { method: issue === "bent" ? "replace" : "reseal", label: issue === "bent" ? "Replace the strainer" : "Clean and descale the strainer", parts: issue === "bent" ? [{ sku: "strainer-kg1", qty: 1 }] : [], hours: 0.3, costUsd: issue === "bent" ? 12 : 6, visible: false };
  if (c.key === "base") return { method: "reseal", label: "Re-seat and torque the induction plate", parts: [{ sku: "screw-set-m3", qty: 1 }], hours: 0.5, costUsd: 22, visible: false };
  return { method: "rewrap", label: "Re-wrap the handle with new cane", parts: [{ sku: "cane-kg1", qty: 1 }], hours: 1.2, costUsd: Math.round(1.2 * rate + 6), visible: false };
}
const WEAR: Record<ComponentKey, number> = { body: 0.01, lid: 0.015, handle: 0.02, spout: 0.015, base: 0.01, gasket: 0.12, strainer: 0.06 };
/** Component health 0..1 at `now`: wears from manufacture or its last repair, and an open damage report caps it at 0.35. */
export function healthOf(c: Component, events: LifecycleEvent[], manufacturedAt: string, now: string): number {
  const since = [...events].reverse().find((e) => e.type === "repaired" && e.details.component === c.key)?.at ?? manufacturedAt, years = Math.max(0, (Date.parse(now) - Date.parse(since)) / (365.25 * 86400000));
  const h = Math.max(0.05, 1 - WEAR[c.key] * years); return openDamage(events).includes(c.key) ? Math.min(h, 0.35) : Math.round(h * 100) / 100;
}
/** A 0 to 10 repairability index: mean component repairability, minus a point for each open damage, with a kintsugi bonus for visible repairs already made. */
export function repairabilityIndex(components: Component[], events: LifecycleEvent[]): number {
  const mean = components.reduce((a, c) => a + c.repairability, 0) / components.length, open = openDamage(events).length, visible = events.filter((e) => e.type === "repaired" && e.details.method === "kintsugi").length;
  return Math.round(Math.max(0, Math.min(10, mean * 10 - open + Math.min(1, visible * 0.25))) * 10) / 10;
}
