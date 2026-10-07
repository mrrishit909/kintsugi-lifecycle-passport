# KINTSUGI: a product lifecycle passport

A kettle falls and shatters, then reassembles with gold where it broke. **NOTHING SHOULD BECOME WASTE BEFORE ITS TIME.** The gold seams draw a ring that becomes a lifecycle wheel: make, use, repair, resell, recover.

Then the passport: scan a product, read its provenance and materials, select a damaged component (the lid) and see its repair history and plan, record the repair and watch a gold seam stay where it broke, find a repairer by distance, list the kettle for resale at a graded value, and see where its materials go when its life ends.

Built from blueprint 06 of the *Advanced Engineering Build Book, Volume VII* as a **vertical slice**. **Every product, owner, repair shop, price and material flow is synthetic.** The product is fictional.

- Live: https://mrrishit909.github.io/projects/kintsugi-lifecycle-passport/demo/
- Case study: https://mrrishit909.github.io/projects/kintsugi-lifecycle-passport/

## Run it
```bash
npm ci
npm run seed                      # passports, shops, components
npm run model                     # Blender 4.5: build.py then validate.py (the GLB is committed, so optional)
npm test                          # 31 domain + API tests
npm run build && node scripts/serve.ts 8681   # static export at http://127.0.0.1:8681
npm run e2e                       # 23 Playwright tests (needs Google Chrome)
node apps/api/src/server.ts       # /v1 API on :8680
```
`?skip=1`, `?view=lifecycle|passport|repairs|finder|resale|recovery`, `&comp=lid`, `&serial=KG-2019-00092`, `?gfx=off`, `?motion=reduced`.

## The pipeline
`model/parts.json` is the contract for seven components split into 20 shards. `build.py` lathes the kettle, partitions its triangles among seed points so shards tile the surface exactly, and writes the 27 seams; `validate.py` re-checks that. Lifecycle rules, repair planning, value, material flows and the repair finder are in `packages/domain`, shared by the UI and the API. See [docs/](docs/) and [design/](design/).

## Agent roles
`.claude/agents/` defines the twelve roles from the book, `.claude/skills/` the project skills. **Honest note:** this repository was produced by one Claude Code session playing those roles in sequence on one working tree, not by parallel subagents in separate worktrees. The multi-agent workflow is the development process; the product contains no agents.

## Not built, and why
PostgreSQL (JSON files plus localStorage), QR scanning (a select stands in), a repair marketplace and payments, authentication, real product data, touch tests beyond the phone layout, and a measurement on a physical GPU. Frame numbers are SwiftShader.
