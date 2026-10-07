// Resale value and condition grade. A visible gold repair adds a small premium in this demo (an invented rule, stated as such on the page).
export type Grade = "A" | "B" | "C" | "D";
export const gradeOf = (meanHealth: number, openDamage: number): Grade => (openDamage > 0 ? (openDamage > 1 ? "D" : "C") : meanHealth >= 0.85 ? "A" : meanHealth >= 0.65 ? "B" : "C");
const GRADE_FACTOR: Record<Grade, number> = { A: 1, B: 0.85, C: 0.65, D: 0.4 };
export function resaleValue(i: { basePriceUsd: number; ageYears: number; grade: Grade; kintsugiRepairs: number; otherRepairs: number }): number {
  const dep = Math.max(0.2, Math.exp(-0.16 * i.ageYears)), premium = 1 + Math.min(0.12, i.kintsugiRepairs * 0.04), docs = 1 + Math.min(0.05, i.otherRepairs * 0.01);
  return Math.round(i.basePriceUsd * dep * GRADE_FACTOR[i.grade] * premium * docs);
}
