import type { Component, LifecycleEvent, Passport } from "@kintsugi/schemas";
import { STAGES, ageYears, openDamage, repairCount, stageOf, statusOf } from "./lifecycle.ts";
import { healthOf, repairabilityIndex } from "./repair.ts";
import { gradeOf, resaleValue } from "./value.ts";
/** Everything a screen or the API shows about a passport at a moment in time, computed from its event log. One function, so they cannot disagree. */
export function passportView(p: Passport, events: LifecycleEvent[], comps: Component[], now: string) {
  const status = statusOf(events), st = stageOf(events), open = openDamage(events), health = Object.fromEntries(comps.map((c) => [c.key, healthOf(c, events, p.manufacturedAt, now)])) as Record<string, number>;
  const mean = Object.values(health).reduce((a, b) => a + b, 0) / comps.length, grade = gradeOf(mean, open.length), kint = events.filter((e) => e.type === "repaired" && e.details.method === "kintsugi").length;
  const owner = [...events].reverse().find((e) => e.type === "transferred" || e.type === "sold")?.details.to as string | undefined ?? p.owner;
  return { ...p, events, owner, status, stage: STAGES[st], stageIndex: st, openDamage: open, health, repairCount: repairCount(events), repairabilityIndex: repairabilityIndex(comps, events), grade, resaleValueUsd: resaleValue({ basePriceUsd: p.basePriceUsd, ageYears: ageYears(p, now), grade, kintsugiRepairs: kint, otherRepairs: repairCount(events) - kint }) };
}
