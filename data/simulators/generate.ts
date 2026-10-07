// Synthetic product passports, repair shops and the component list (from the Blender contract). Names, serials and places are invented.
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { validateHistory } from "../../packages/domain/src/index.ts";
import type { LifecycleEvent, Passport, Shop } from "../../packages/schemas/src/index.ts";
const parts = JSON.parse(readFileSync(new URL("../../model/parts.json", import.meta.url), "utf8"));
let n = 0; const ev = (type: LifecycleEvent["type"], at: string, actor: string, location: string, details: Record<string, unknown> = {}): LifecycleEvent => ({ id: `e${++n}`, type, at, actor, location, details });
const manifest = (cs: { material: string; massG: number }[]) => { const m: Record<string, number> = {}; for (const c of cs) m[c.material] = (m[c.material] ?? 0) + c.massG; return m; };
const base = manifest(parts.components);
const products: Passport[] = [
  { id: "pr1", serial: "KG-2021-00417", model: "Kintsugi Kettle KG1 (fictional)", manufacturedAt: "2021-03-04", owner: "A. Moreau", basePriceUsd: 240, materialManifest: base, events: [
    ev("manufactured", "2021-03-04T09:00:00Z", "Atelier Hoshi", "Seto, Japan (fictional)", { batch: "KG1-21-03" }), ev("sold", "2021-04-12T14:20:00Z", "Maison Verre", "Lyon, France (fictional)", { to: "A. Moreau" }),
    ev("damaged", "2022-09-02T08:00:00Z", "A. Moreau", "Lyon", { component: "handle", issue: "wrap worn" }), ev("repaired", "2022-09-20T10:00:00Z", "Atelier Verre", "Lyon", { component: "handle", issue: "wrap worn", method: "rewrap", hours: 1.2, costUsd: 52 }),
    ev("damaged", "2024-02-11T19:30:00Z", "A. Moreau", "Lyon", { component: "body", issue: "crack" }), ev("repaired", "2024-03-02T11:00:00Z", "Atelier Verre", "Lyon", { component: "body", issue: "crack", method: "kintsugi", hours: 3.4, costUsd: 143 }),
    ev("damaged", "2025-11-18T07:45:00Z", "A. Moreau", "Lyon", { component: "lid", issue: "chip" })] },
  { id: "pr2", serial: "KG-2019-00092", model: "Kintsugi Kettle KG1 (fictional)", manufacturedAt: "2019-05-21", owner: "R. Okafor", basePriceUsd: 220, materialManifest: base, events: [
    ev("manufactured", "2019-05-21T09:00:00Z", "Atelier Hoshi", "Seto, Japan (fictional)"), ev("sold", "2019-07-02T10:00:00Z", "Maison Verre", "Lyon, France (fictional)", { to: "R. Okafor" }),
    ev("damaged", "2023-01-09T08:00:00Z", "R. Okafor", "Lagos", { component: "gasket", issue: "worn" }), ev("repaired", "2023-01-16T12:00:00Z", "Repair Cafe Ikeja", "Lagos", { component: "gasket", issue: "worn", method: "replace", hours: 0.2, costUsd: 9 }),
    ev("damaged", "2025-06-30T16:00:00Z", "R. Okafor", "Lagos", { component: "spout", issue: "chip" }), ev("repaired", "2025-07-19T09:30:00Z", "Atelier Verre", "Lyon", { component: "spout", issue: "chip", method: "kintsugi", hours: 2.1, costUsd: 94 }), ev("listed", "2025-09-05T13:00:00Z", "R. Okafor", "Lagos", { askUsd: 120 })] },
  { id: "pr3", serial: "KG-2023-01288", model: "Kintsugi Kettle KG1 (fictional)", manufacturedAt: "2023-10-01", owner: "S. Tanaka", basePriceUsd: 260, materialManifest: base, events: [ev("manufactured", "2023-10-01T09:00:00Z", "Atelier Hoshi", "Seto, Japan (fictional)"), ev("sold", "2023-11-20T09:30:00Z", "Atelier Hoshi shop", "Kyoto, Japan (fictional)", { to: "S. Tanaka" })] },
  { id: "pr4", serial: "KG-2016-00031", model: "Kintsugi Kettle KG1 (fictional)", manufacturedAt: "2016-02-10", owner: "Municipal recovery", basePriceUsd: 200, materialManifest: base, events: [
    ev("manufactured", "2016-02-10T09:00:00Z", "Atelier Hoshi", "Seto, Japan (fictional)"), ev("sold", "2016-04-01T10:00:00Z", "Maison Verre", "Lyon, France (fictional)", { to: "L. Girard" }), ev("damaged", "2024-08-01T10:00:00Z", "L. Girard", "Lyon", { component: "body", issue: "break" }), ev("recycled", "2024-09-10T10:00:00Z", "Recovery centre Vénissieux", "Lyon", {})] },
];
for (const p of products) { const err = validateHistory(p.events); if (err) throw new Error(`${p.serial}: ${err}`); }
const shops: Shop[] = [
  { id: "sh1", name: "Atelier Verre", lat: 45.76, lon: 4.84, methods: ["kintsugi", "rewrap", "replace", "reseal"], stock: { gasket: 12, strainer: 4, handle: 2 }, leadDays: 4 },
  { id: "sh2", name: "Repair Cafe Ikeja", lat: 6.6, lon: 3.35, methods: ["replace", "reseal"], stock: { gasket: 6 }, leadDays: 2 },
  { id: "sh3", name: "Hoshi Workshop Seto", lat: 35.22, lon: 137.08, methods: ["kintsugi", "rewrap", "replace", "reseal"], stock: { gasket: 40, strainer: 20, handle: 9, base: 5 }, leadDays: 2 },
  { id: "sh4", name: "Kyoto Mending Studio", lat: 35.01, lon: 135.77, methods: ["kintsugi"], stock: {}, leadDays: 6 },
  { id: "sh5", name: "Brooklyn Fix Lab", lat: 40.68, lon: -73.94, methods: ["replace", "reseal", "rewrap"], stock: { gasket: 3, strainer: 1 }, leadDays: 3 },
];
const out = new URL("../generated/", import.meta.url).pathname; mkdirSync(out, { recursive: true });
writeFileSync(out + "products.json", JSON.stringify(products)); writeFileSync(out + "shops.json", JSON.stringify(shops)); writeFileSync(out + "components.json", JSON.stringify(parts.components));
copyFileSync(new URL("../../model/exports/seams.json", import.meta.url).pathname, out + "seams.json");
console.log(`generated ${products.length} passports (${products.reduce((a, p) => a + p.events.length, 0)} events), ${shops.length} shops, ${parts.components.length} components`);
