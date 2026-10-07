import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { applyEvent, validateHistory, statusOf, stageOf, openDamage, repairCount, ageYears, ownerOf, planRepair, healthOf, repairabilityIndex, ISSUES, gradeOf, resaleValue, flows, recoveredShare, routeTotals, ROUTES, haversineKm, findRepair, springStep, shatter, stepShatter, seamLengthM, seamTotals, seamsOf, mulberry32 } from "../src/index.ts";
import type { Component, LifecycleEvent, Passport, Seam, Shop } from "@kintsugi/schemas";
const gen = (n: string) => JSON.parse(readFileSync(new URL(`../../../data/generated/${n}.json`, import.meta.url), "utf8"));
const products: Passport[] = gen("products"), comps: Component[] = gen("components"), shops: Shop[] = gen("shops"), seams: Seam[] = gen("seams").seams, hero = products[0];
let id = 0; const E = (type: LifecycleEvent["type"], at: string, details: Record<string, unknown> = {}): LifecycleEvent => ({ id: `t${++id}`, type, at, actor: "x", location: "y", details });

describe("lifecycle state machine", () => {
  it("the generated histories are all valid", () => { for (const p of products) expect(validateHistory(p.events), p.serial).toBeNull(); });
  it("status and stage follow the log", () => { expect(statusOf(hero.events)).toBe("in_use"); expect(stageOf(hero.events)).toBe(2); expect(stageOf(products[1].events)).toBe(3); expect(stageOf(products[2].events)).toBe(1); expect(stageOf(products[3].events)).toBe(4); expect(stageOf([hero.events[0]])).toBe(0); });
  it("rejects impossible events with the reason", () => {
    const m = E("manufactured", "2020-01-01T00:00:00Z"), sold = E("sold", "2020-02-01T00:00:00Z", { to: "a" });
    const bad = (evs: LifecycleEvent[], e: LifecycleEvent) => { const r = applyEvent(evs, e); return r.ok ? "ok" : r.error; };
    expect(bad([m], m)).toMatch(/once/); expect(bad([m], E("repaired", "2020-03-01T00:00:00Z", { component: "body" }))).toMatch(/in use or listed/); expect(bad([m, sold], E("repaired", "2020-03-01T00:00:00Z", { component: "body" }))).toMatch(/no open damage/);
    expect(bad([m, sold], E("transferred", "2020-03-01T00:00:00Z", { to: "b" }))).toMatch(/listed before/); expect(bad([m, sold], E("sold", "2020-03-01T00:00:00Z", { to: "b" }))).toMatch(/new product/); expect(bad([m, sold], E("damaged", "2019-01-01T00:00:00Z", { component: "lid" }))).toMatch(/time order/);
    expect(bad([m], E("recycled", "2020-03-01T00:00:00Z"))).toMatch(/new product/); expect(bad([m, sold], E("damaged", "2020-03-01T00:00:00Z", {}))).toMatch(/names a component/);
  });
  it("damage then repair closes the report; refurbishing needs no open damage; recycled is terminal", () => {
    let ev: LifecycleEvent[] = []; const push = (e: LifecycleEvent) => { const r = applyEvent(ev, e); if (!r.ok) throw new Error(r.error); ev = r.events; };
    push(E("manufactured", "2020-01-01T00:00:00Z")); push(E("sold", "2020-02-01T00:00:00Z", { to: "a" })); push(E("damaged", "2020-03-01T00:00:00Z", { component: "lid" })); expect(openDamage(ev)).toEqual(["lid"]);
    expect(applyEvent(ev, E("refurbished", "2020-04-01T00:00:00Z")).ok).toBe(false); push(E("repaired", "2020-04-01T00:00:00Z", { component: "lid" })); expect(openDamage(ev)).toEqual([]); expect(applyEvent(ev, E("refurbished", "2020-05-01T00:00:00Z")).ok).toBe(true);
    push(E("listed", "2020-06-01T00:00:00Z")); push(E("transferred", "2020-07-01T00:00:00Z", { to: "b" })); expect(statusOf(ev)).toBe("in_use"); push(E("recycled", "2020-08-01T00:00:00Z")); expect(applyEvent(ev, E("repaired", "2020-09-01T00:00:00Z", { component: "lid" })).ok).toBe(false); expect(repairCount(ev)).toBe(1);
  });
  it("owner and age", () => { expect(ownerOf(hero)).toBe("A. Moreau"); expect(ageYears(hero, "2026-03-04")).toBeCloseTo(5, 1); expect(ageYears(hero, "2000-01-01")).toBe(0); });
});
describe("repair planning and health", () => {
  const c = (k: string) => comps.find((x) => x.key === k)!;
  it("ceramic breaks call for a visible gold re-bond whose time grows with the seam length", () => { const a = planRepair(c("body"), "crack", 10), b = planRepair(c("body"), "crack", 60), brk = planRepair(c("body"), "break", 10); expect(a.method).toBe("kintsugi"); expect(a.visible).toBe(true); expect(b.hours).toBeGreaterThan(a.hours); expect(brk.hours).toBeGreaterThan(a.hours); expect(b.costUsd).toBeGreaterThan(a.costUsd); });
  it("wear parts are replaced, invisibly and cheaply", () => { const g = planRepair(c("gasket"), "worn"); expect(g.method).toBe("replace"); expect(g.visible).toBe(false); expect(g.costUsd).toBeLessThan(20); expect(planRepair(c("strainer"), "bent").parts[0].sku).toBe("strainer-kg1"); expect(planRepair(c("handle"), "wrap worn").method).toBe("rewrap"); });
  it("every component has at least one issue and each issue plans without error", () => { for (const k of Object.keys(ISSUES)) for (const i of ISSUES[k as keyof typeof ISSUES]) expect(planRepair(c(k), i, 20).costUsd).toBeGreaterThan(0); });
  it("health wears over time, resets with a repair, and an open damage caps it", () => { const lid = c("lid"), gasket = c("gasket"); expect(healthOf(gasket, [], "2020-01-01", "2023-01-01")).toBeLessThan(healthOf(lid, [], "2020-01-01", "2023-01-01")); const fixed = [E("repaired", "2022-12-01T00:00:00Z", { component: "gasket" })]; expect(healthOf(gasket, fixed, "2020-01-01", "2023-01-01")).toBeGreaterThan(healthOf(gasket, [], "2020-01-01", "2023-01-01")); expect(healthOf(lid, hero.events, hero.manufacturedAt, "2026-10-07")).toBeLessThanOrEqual(0.35); });
  it("repairability: an open damage lowers it, a visible repair raises it a little", () => { const none = repairabilityIndex(comps, []), open = repairabilityIndex(comps, [E("damaged", "2022-01-01T00:00:00Z", { component: "lid" })]), vis = repairabilityIndex(comps, [E("repaired", "2022-01-01T00:00:00Z", { component: "body", method: "kintsugi" })]); expect(open).toBeLessThan(none); expect(vis).toBeGreaterThanOrEqual(none); expect(none).toBeLessThanOrEqual(10); expect(none).toBeGreaterThan(5); });
});
describe("value", () => {
  it("falls with age and grade; visible repairs add a bounded premium", () => { const v = (o = {}) => resaleValue({ basePriceUsd: 240, ageYears: 3, grade: "A" as const, kintsugiRepairs: 0, otherRepairs: 0, ...o }); expect(v({ ageYears: 6 })).toBeLessThan(v()); expect(v({ grade: "C" })).toBeLessThan(v({ grade: "B" })); expect(v({ kintsugiRepairs: 2 })).toBeGreaterThan(v()); expect(v({ kintsugiRepairs: 40 })).toBeLessThan(v() * 1.2); expect(v({ ageYears: 80 })).toBe(Math.round(240 * 0.2)); });
  it("grades follow health and open damage", () => { expect(gradeOf(0.9, 0)).toBe("A"); expect(gradeOf(0.7, 0)).toBe("B"); expect(gradeOf(0.5, 0)).toBe("C"); expect(gradeOf(0.95, 1)).toBe("C"); expect(gradeOf(0.95, 2)).toBe("D"); });
});
describe("material recovery", () => {
  it("route shares sum to one; flows conserve mass and the recovered share is high", () => { for (const r of Object.values(ROUTES)) expect(Object.values(r).reduce((a, b) => a + b, 0)).toBeCloseTo(1); const f = flows(comps), tot = comps.reduce((a, c) => a + c.massG, 0); expect(f.reduce((a, x) => a + x.grams, 0)).toBeCloseTo(tot, 0); expect(recoveredShare(f)).toBeGreaterThan(0.85); expect(routeTotals(f)["Crushed to aggregate"]).toBeGreaterThan(500); });
  it("an unknown material goes to landfill", () => expect(flows([{ material: "mystery", massG: 10 }])).toEqual([{ material: "mystery", route: "Landfill", grams: 10 }]));
});
describe("repair finder", () => {
  it("haversine: Lyon to Seto is about 9,700 km", () => { const d = haversineKm([45.76, 4.84], [35.22, 137.08]); expect(d).toBeGreaterThan(9500); expect(d).toBeLessThan(10000); expect(haversineKm([1, 1], [1, 1])).toBe(0); });
  it("ranks shops that can do the method first, then by stock and distance", () => { const o = findRepair(shops, "gasket", "replace", [45.76, 4.84], 20000); expect(o[0].shop.name).toBe("Atelier Verre"); expect(o.every((x, i) => i === 0 || Number(o[i - 1].canDo) >= Number(x.canDo))).toBe(true); expect(o.find((x) => x.shop.name === "Kyoto Mending Studio")!.canDo).toBe(false); });
  it("an out-of-stock part adds lead time, and the radius filters", () => { const o = findRepair(shops, "base", "reseal", [45.76, 4.84], 20000); expect(o.find((x) => x.shop.id === "sh1")!.inStock).toBe(false); expect(o.find((x) => x.shop.id === "sh3")!.inStock).toBe(true); expect(findRepair(shops, "gasket", "replace", [45.76, 4.84], 100).map((x) => x.shop.id)).toEqual(["sh1"]); });
});
describe("springs and shatter", () => {
  it("critically damped spring converges without overshoot, from either side, at any frame time", () => { for (const dt of [0.001, 0.016, 0.2, 1]) for (const start of [0, 10]) { let x = start, v = 0; for (let i = 0; i < 4000; i++) { [x, v] = springStep(x, v, 5, 12, dt); if (start === 0) expect(x).toBeLessThanOrEqual(5 + 1e-9); else expect(x).toBeGreaterThanOrEqual(5 - 1e-9); } expect(x).toBeCloseTo(5, 3); } });
  it("a shatter is deterministic, stays above the floor, and comes to rest", () => { const origins: [number, number, number][] = Array.from({ length: 12 }, (_, i) => [Math.cos(i), 0.5 + i * 0.05, Math.sin(i)]); const a = shatter(origins, [0, 0, 0], 4), b = shatter(origins, [0, 0, 0], 4); expect(a).toEqual(b); for (let i = 0; i < 1500; i++) { stepShatter(a, 1 / 120); for (const s of a) expect(s.p[1]).toBeGreaterThanOrEqual(0.04 - 1e-9); } expect(a.every((s) => s.settled)).toBe(true); const far = Math.max(...a.map((s) => Math.hypot(s.p[0], s.p[2]))); expect(far).toBeGreaterThan(1.2); });
  it("seeded rng repeats", () => { const r = mulberry32(3), q = mulberry32(3); expect([r(), r()]).toEqual([q(), q()]); });
});
describe("seams from Blender", () => {
  it("every fractured part has seams, all with real length, and the shards' count matches the contract", () => { const t = seamTotals(seams); for (const c of comps.filter((x) => x.fragments > 0)) { expect(t[c.key.charAt(0).toUpperCase() + c.key.slice(1)], c.key).toBeGreaterThan(0.5); const ids = new Set(seamsOf(seams, c.key).flatMap((s) => [s.a, s.b])); expect(ids.size).toBeGreaterThan(1); expect(Math.max(...ids)).toBeLessThanOrEqual(c.fragments); } expect(seams.every((s) => seamLengthM(s) > 0.02)).toBe(true); });
});
import { layout, FOV_DEG, stationXY } from "../src/index.ts";
describe("layout (wheel and camera share one centre)", () => {
  it("wide screens put the product left of centre with room for a panel; phones put it on top", () => { const d = layout(1440, 900), p = layout(390, 780); expect(d.wide).toBe(true); expect(d.cx + d.ringPx).toBeLessThan(1440 * 0.62); expect(p.wide).toBe(false); expect(p.cy).toBeLessThan(780 / 2); expect(p.cx - p.ringPx).toBeGreaterThan(0); });
  it("the camera distance projects the object radius to the requested pixels", () => { const l = layout(1440, 900); expect((1.25 / (l.dist * Math.tan((FOV_DEG * Math.PI) / 360))) * (900 / 2)).toBeCloseTo(l.dialPx, 5); });
  it("five stations sit on the ring from 12 o'clock clockwise", () => { const l = layout(1440, 900), a = stationXY(l, 0, 5, l.ringPx), b = stationXY(l, 1, 5, l.ringPx); expect(a[0]).toBeCloseTo(l.cx); expect(a[1]).toBeCloseTo(l.cy - l.ringPx); expect(b[0]).toBeGreaterThan(l.cx); expect(Math.hypot(b[0] - l.cx, b[1] - l.cy)).toBeCloseTo(l.ringPx); });
});
