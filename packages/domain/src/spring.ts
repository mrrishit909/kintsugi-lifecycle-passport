import { mulberry32 } from "./rng.ts";
/** Critically damped spring, exact for one step: the value approaches the target without overshoot at any frame time. */
export function springStep(x: number, v: number, target: number, omega: number, dt: number): [number, number] {
  const e = Math.exp(-omega * dt), d = x - target, c = v + omega * d; return [target + (d + c * dt) * e, (v - omega * c * dt) * e];
}
export type Shard = { p: [number, number, number]; v: [number, number, number]; r: [number, number, number]; w: [number, number, number]; rest: [number, number, number]; settled: boolean };
/** A dropped object's shards: seeded outward velocities from the impact point, gravity, bounces on the floor (restitution 0.3) and friction until each comes to rest. Deterministic. */
export function shatter(origins: [number, number, number][], impact: [number, number, number], seed = 3, floorY = 0): Shard[] {
  const r = mulberry32(seed); return origins.map((o) => { const dx = o[0] - impact[0], dz = o[2] - impact[2], l = Math.hypot(dx, dz) || 1, s = 1.2 + r() * 1.8; return { p: [...o] as [number, number, number], v: [(dx / l) * s, 1.5 + r() * 2.2, (dz / l) * s], r: [0, 0, 0], w: [(r() - 0.5) * 9, (r() - 0.5) * 9, (r() - 0.5) * 9], rest: [o[0], floorY, o[2]], settled: false }; });
}
export function stepShatter(shards: Shard[], dt: number, floorY = 0.04, g = 9.8) {
  for (const s of shards) { if (s.settled) continue; s.v[1] -= g * dt; for (let i = 0; i < 3; i++) { s.p[i] += s.v[i] * dt; s.r[i] += s.w[i] * dt; }
    if (s.p[1] <= floorY) { s.p[1] = floorY; s.v[1] = -s.v[1] * 0.3; s.v[0] *= 0.82; s.v[2] *= 0.82; for (let i = 0; i < 3; i++) s.w[i] *= 0.7; if (Math.abs(s.v[1]) < 0.35) { s.v = [0, 0, 0]; s.w = [0, 0, 0]; s.settled = true; } } }
}
