# Asset contract

`model/parts.json` is read by `build.py`, `validate.py` and the web app.

| Component | Shards | Note |
|---|---|---|
| body | 10 | lathe with Catmull-Rom smoothing |
| lid | 4 | knob on top |
| handle | 3 | lacquer red |
| spout | 3 | |
| base | 1 | foot ring |
| gasket | 1 | |
| strainer | 1 | |

Outputs: `model/exports/kettle.glb` (299 KB, 14,844 triangles, one node per shard named `<component>.<n>`, origins at shard centroids), `seams.json` (27 seams: component, endpoints, polyline), `poster.png`.

`validate.py` re-imports the GLB in a fresh scene and fails on: a missing component or shard, an unparented node, a shard or origin that does not match the contract, a seam that does not match `seams.json`, or the triangle or byte budget being exceeded.
