# KINTSUGI

Product lifecycle passport demo for a fictional kettle (blueprint 06, Advanced Engineering Build Book Vol. VII). Static site; the Blender kettle is scripted. Every product, owner, repair shop and material flow is synthetic.

- Build the asset: `npm run model` (Blender 4.5 at ~/Applications), then `node scripts/copy-assets.ts`. Contract: `model/parts.json` (7 components, body 10 shards, lid 4, handle 3, spout 3). The build also writes `model/exports/seams.json` (27 seams, shard fracture edges) used by the gold seam tubes and the validator.
- Rules: `packages/domain` (lifecycle state machine, repair plan and health, resale value, material flows, repair finder, spring/shatter). Data: `npm run seed`. Tests: `npm test`, `npm run e2e` after `npm run build`.
- State: events persist in localStorage `kintsugi:v1`; "Reset the demo data" clears them. `window.__kLive` and `window.__kintsugiStats` are exposed for tests.
- Multi-agent is the development process only (.claude/agents); the product contains no agents.
