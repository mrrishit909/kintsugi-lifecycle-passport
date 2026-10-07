import type { Component } from "@kintsugi/schemas";
// End-of-life routes per material: share to each route. Invented rates; they sum to 1 per material.
export const ROUTES: Record<string, Record<string, number>> = {
  glaze: { "Crushed to aggregate": 0.85, "Landfill": 0.15 }, lacquer: { "Composted": 0.4, "Energy recovery": 0.45, "Landfill": 0.15 },
  steel: { "Melted for new steel": 0.95, "Landfill": 0.05 }, silicone: { "Energy recovery": 0.7, "Landfill": 0.3 },
};
export type Flow = { material: string; route: string; grams: number };
/** Mass flows from each material to each route; grams are exact fractions of the bill of materials, so the flows always add up to the product's mass. */
export function flows(components: Pick<Component, "material" | "massG">[]): Flow[] {
  const mass: Record<string, number> = {}; for (const c of components) mass[c.material] = (mass[c.material] ?? 0) + c.massG;
  const out: Flow[] = []; for (const [m, g] of Object.entries(mass)) for (const [route, share] of Object.entries(ROUTES[m] ?? { Landfill: 1 })) out.push({ material: m, route, grams: Math.round(g * share * 10) / 10 }); return out;
}
export const recoveredShare = (f: Flow[]) => { const tot = f.reduce((a, x) => a + x.grams, 0); return Math.round((f.filter((x) => x.route !== "Landfill").reduce((a, x) => a + x.grams, 0) / tot) * 1000) / 1000; };
export const routeTotals = (f: Flow[]) => { const t: Record<string, number> = {}; for (const x of f) t[x.route] = Math.round(((t[x.route] ?? 0) + x.grams) * 10) / 10; return t; };
