# Architecture

```
model/parts.json ──> model/build.py ──Blender──> kettle.glb (7 components, 20 shards), seams.json (27 seams), poster.png
                 └─> model/validate.py (shards tile the intact triangles exactly, origins at centroids, seams match)
data/simulators/generate.ts ──> products.json (4 passports, 20 events), shops.json (5), components.json, seams.json
packages/domain: lifecycle, repair, value, materials, finder, spring, seams, layout, view (passportView)
apps/web (Next.js 16 static export): App ─ store ─ Panels (DOM + SVG wheel) + Scene (R3F kettle, fragments, seams) + Intro (GSAP)
apps/api (node:http): products by serial, timeline, repair/transfer plus damage/list/recycle (all idempotent), materials/recovery
```

**One view function.** `passportView` turns a passport and its events into stage, status, open damage, grade, value and recoverable material. The UI and the API both call it, so the wheel, the table and the JSON cannot disagree.

**A state machine, not a log of strings.** `applyEvent` accepts an event only if the passport's status allows it (only a product in use can be listed, a transfer needs a listing and a named owner, refurbishing needs every open damage repaired, nothing is recycled twice, events are in time order); `validateHistory` replays a stored history and reports the first illegal event. Events are idempotent by id.

**The break is real geometry.** Blender partitions the kettle's triangles among seed points (nearest seed wins), so shards tile the intact surface with no gaps; each shard has its origin at its centroid so it can spin on its own spring. Gold seams are tubes along the shared edges (`seams.json`). A repair removes the red crack and leaves a seam, which is the product idea: the repair stays visible.

**Persistence.** Events live in `localStorage` (`kintsugi:v1`), merged over the generated history. "Reset the demo data" clears them. There is no server in the public demo.

**Not built.** PostgreSQL (JSON files), real product data or QR scanning (a select box stands in for a scan), a repair marketplace, authentication, a physical GPU measurement.
