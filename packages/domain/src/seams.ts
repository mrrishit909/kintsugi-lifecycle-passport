import type { Seam } from "@kintsugi/schemas";
export const seamLengthM = (s: Seam) => s.points.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - s.points[i][0], p[1] - s.points[i][1], p[2] - s.points[i][2]), 0);
/** Total seam length per component part (Body, Lid, Handle, Spout), in the model's units (1 unit = 12 cm in the demo's presentation). */
export function seamTotals(seams: Seam[]) { const t: Record<string, number> = {}; for (const s of seams) t[s.part] = (t[s.part] ?? 0) + seamLengthM(s); return t; }
export const seamsOf = (seams: Seam[], part: string) => seams.filter((s) => s.part.toLowerCase() === part.toLowerCase());
