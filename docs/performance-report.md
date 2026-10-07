# Performance report

Measured with `node scripts/measure.mjs` on an Apple M3 Pro with Chrome through SwiftShader (CPU rasteriser). These are bounds, **not GPU results**; no physical GPU was available.

| Metric | Value |
|---|---|
| Transfer | 517 KB, 19 requests |
| LCP | 5,612 ms (software rendering, model decode on the main thread) |
| CLS | 0 |
| Long tasks | 3,098 ms in total during load |
| Frame time, lifecycle view | median 33.3 ms, p95 50 ms |
| Draw calls / triangles | 8 / 8,004 (intact kettle on screen) |
| kettle.glb | 299 KB |

Budgets enforced by the e2e suite: GLB under 400 KB, gzipped JS under 750 KB, fewer than 120 draw calls and 120,000 triangles, a view switch under 3 s.
