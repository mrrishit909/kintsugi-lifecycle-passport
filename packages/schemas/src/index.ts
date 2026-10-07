export type ComponentKey = "body" | "lid" | "handle" | "spout" | "base" | "gasket" | "strainer";
export type EventType = "manufactured" | "sold" | "damaged" | "repaired" | "listed" | "transferred" | "refurbished" | "recycled";
export type LifecycleEvent = { id: string; type: EventType; at: string; actor: string; location: string; details: Record<string, unknown> };
export type Passport = { id: string; serial: string; model: string; manufacturedAt: string; owner: string; basePriceUsd: number; materialManifest: Record<string, number>; events: LifecycleEvent[] };
export type Component = { key: ComponentKey; label: string; mesh: string; fragments: number; material: string; massG: number; repairability: number; note: string };
export type Shop = { id: string; name: string; lat: number; lon: number; methods: string[]; stock: Partial<Record<ComponentKey, number>>; leadDays: number };
export type Seam = { part: string; a: number; b: number; points: [number, number, number][] };
