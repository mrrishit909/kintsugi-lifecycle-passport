import type { Component, ComponentKey, Shop } from "@kintsugi/schemas";
import type { Method } from "./repair.ts";
export const haversineKm = (a: [number, number], b: [number, number]) => { const R = 6371, r = (d: number) => (d * Math.PI) / 180, dLat = r(b[0] - a[0]), dLon = r(b[1] - a[1]), h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
export type Offer = { shop: Shop; distanceKm: number; canDo: boolean; inStock: boolean; etaDays: number };
/** Shops ranked for a repair: those that can do the method first, then in-stock, then nearest. A part that is not in stock adds a week to the lead time. */
export function findRepair(shops: Shop[], key: ComponentKey, method: Method, from: [number, number], maxKm = 5000): Offer[] {
  return shops.map((s) => { const d = haversineKm(from, [s.lat, s.lon]), canDo = s.methods.includes(method), need = method === "kintsugi" || method === "rewrap" ? true : (s.stock[key] ?? 0) > 0, inStock = method === "kintsugi" ? true : need; return { shop: s, distanceKm: Math.round(d), canDo, inStock, etaDays: s.leadDays + (inStock ? 0 : 7) + Math.ceil(d / 800) }; })
    .filter((o) => o.distanceKm <= maxKm).sort((a, b) => Number(b.canDo) - Number(a.canDo) || Number(b.inStock) - Number(a.inStock) || a.distanceKm - b.distanceKm);
}
export const componentOf = (cs: Component[], key: string) => cs.find((c) => c.key === key);
