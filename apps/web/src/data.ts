import type { Component, Passport, Seam, Shop } from "@kintsugi/schemas";
export type Data = { products: Passport[]; components: Component[]; shops: Shop[]; seams: Seam[] };
export const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export async function loadData(): Promise<Data> { const g = async <T,>(n: string) => (await fetch(`${base}/data/${n}.json`)).json() as Promise<T>; const [products, components, shops, s] = await Promise.all([g<Passport[]>("products"), g<Component[]>("components"), g<Shop[]>("shops"), g<{ seams: Seam[] }>("seams")]); return { products, components, shops, seams: s.seams }; }
export const NOW = "2026-10-07T09:00:00Z";
