// KINTSUGI API: the blueprint's section 12 contract plus the small extras the demo needs (damage, list, recycle). Every mutation is idempotent by key and goes through the lifecycle state machine.
import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { ISSUES, applyEvent, flows, passportView, planRepair, recoveredShare, routeTotals, seamTotals } from "../../../packages/domain/src/index.ts";
import type { Component, ComponentKey, EventType, LifecycleEvent, Passport, Seam } from "../../../packages/schemas/src/index.ts";
const load = <T,>(n: string) => JSON.parse(readFileSync(new URL(`../../../data/generated/${n}.json`, import.meta.url), "utf8")) as T;
export const openapi = { openapi: "3.1.0", info: { title: "KINTSUGI API", version: "1.0.0", description: "Synthetic product passports." }, paths: {
  "/v1/products/{serial}": { get: {} }, "/v1/products/{id}/timeline": { get: {} }, "/v1/products/{id}/repair": { post: { summary: "Record a repair of a component with an open damage report; Idempotency-Key required" } }, "/v1/products/{id}/transfer": { post: { summary: "Hand a listed product to a new owner; Idempotency-Key required" } },
  "/v1/products/{id}/damage": { post: { summary: "Extension: report damage" } }, "/v1/products/{id}/list": { post: { summary: "Extension: list for resale" } }, "/v1/products/{id}/recycle": { post: { summary: "Extension: send to recovery" } }, "/v1/materials/recovery": { get: { summary: "Mass flows by material and route; ?serial= for one product" } } } };
export function build(now = "2026-10-07T00:00:00Z") {
  const products = load<Passport[]>("products").map((p) => ({ ...p, events: [...p.events] })), comps = load<Component[]>("components"), seams = load<{ seams: Seam[] }>("seams").seams, seen = new Map<string, unknown>(), totals = seamTotals(seams);
  const view = (p: Passport) => passportView(p, p.events, comps, now);
  const send = (res: ServerResponse, code: number, body: unknown) => { res.writeHead(code, { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "content-type,idempotency-key", "access-control-allow-methods": "GET,POST,OPTIONS" }); res.end(JSON.stringify(body)); };
  const err = (res: ServerResponse, code: number, error: string) => send(res, code, { error });
  async function body(req: IncomingMessage) { let s = ""; for await (const c of req) { s += c; if (s.length > 10_000) throw new RangeError("body too large"); } return s ? JSON.parse(s) : {}; }
  const server: Server = createServer(async (req, res) => {
    try {
      const u = new URL(req.url ?? "/", "http://x"), p = u.pathname.replace(/\/+$/, "") || "/", m = req.method ?? "GET"; let g: RegExpMatchArray | null;
      if (m === "OPTIONS") return send(res, 204, {}); if (p === "/openapi.json") return send(res, 200, openapi); if (p === "/healthz") return send(res, 200, { ok: true });
      if ((g = p.match(/^\/v1\/products\/(KG-\d{4}-\d{5})$/)) && m === "GET") { const pr = products.find((x) => x.serial === g![1]); return pr ? send(res, 200, view(pr)) : err(res, 404, "no such product"); }
      if ((g = p.match(/^\/v1\/products\/(pr\d+)\/(timeline|repair|transfer|damage|list|recycle)$/))) {
        const pr = products.find((x) => x.id === g![1]); if (!pr) return err(res, 404, "no such product");
        if (g[2] === "timeline" && m === "GET") { const limit = Number(u.searchParams.get("limit") ?? 50), cursor = Number(u.searchParams.get("cursor") ?? 0); if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(cursor) || cursor < 0) return err(res, 400, "limit 1-200 and cursor must be whole numbers"); return send(res, 200, { total: pr.events.length, items: pr.events.slice(cursor, cursor + limit), nextCursor: cursor + limit < pr.events.length ? cursor + limit : null }); }
        if (m !== "POST") return err(res, 405, "use POST");
        const key = req.headers["idempotency-key"]; if (typeof key !== "string" || !key) return err(res, 400, "Idempotency-Key header required"); const k = pr.id + g[2] + key; if (seen.has(k)) return send(res, 200, seen.get(k));
        const b = await body(req), t: Record<string, EventType> = { repair: "repaired", transfer: "transferred", damage: "damaged", list: "listed", recycle: "recycled" }, type = t[g[2]]; let details: Record<string, unknown> = {}, actor = String(b.actor ?? pr.owner).slice(0, 60), location = String(b.location ?? "").slice(0, 60);
        if (type === "repaired" || type === "damaged") { const c = comps.find((x) => x.key === b.component); if (!c) return err(res, 422, `component must be one of ${comps.map((x) => x.key).join(", ")}`); const issue = String(b.issue ?? ISSUES[c.key as ComponentKey][0]); if (!ISSUES[c.key as ComponentKey].includes(issue)) return err(res, 422, `issue for ${c.key} must be one of ${ISSUES[c.key as ComponentKey].join(", ")}`);
          details = { component: c.key, issue }; if (type === "repaired") { const plan = planRepair(c, issue, (totals[c.label] ?? 0) * 12); details = { ...details, method: plan.method, hours: plan.hours, costUsd: plan.costUsd, shopId: b.shopId ?? null }; } }
        if (type === "transferred") { if (typeof b.to !== "string" || !b.to.trim()) return err(res, 422, "to is required"); details = { to: b.to.trim().slice(0, 60) }; }
        if (type === "listed") { if (!Number.isFinite(b.askUsd) || b.askUsd < 0 || b.askUsd > 5000) return err(res, 422, "askUsd 0-5000 is required"); details = { askUsd: b.askUsd }; }
        const event: LifecycleEvent = { id: `e${pr.events.length + 100}`, type, at: now, actor, location, details }; const r = applyEvent(pr.events, event); if (!r.ok) return err(res, 409, r.error);
        pr.events = r.events; if (type === "transferred") pr.owner = String(details.to); const out = view(pr); seen.set(k, out); return send(res, 201, out);
      }
      if (p === "/v1/materials/recovery" && m === "GET") { const s = u.searchParams.get("serial"), pr = s ? products.find((x) => x.serial === s) : null; if (s && !pr) return err(res, 404, "no such product"); const f = flows(comps); return send(res, 200, { serial: s, flows: f, routes: routeTotals(f), recoveredShare: recoveredShare(f), totalGrams: comps.reduce((a, c) => a + c.massG, 0) }); }
      return err(res, 404, "not found");
    } catch (e) { return err(res, e instanceof SyntaxError || e instanceof RangeError ? 400 : 500, e instanceof Error ? e.message : "error"); }
  });
  return { server, listen: (port = 8680) => new Promise<number>((r) => server.listen(port, () => r((server.address() as { port: number }).port))), close: () => new Promise<void>((r) => { server.closeAllConnections(); server.close(() => r()); }) };
}
if (import.meta.url === `file://${process.argv[1]}`) build().listen().then((p) => console.log(`KINTSUGI API on :${p}`));
