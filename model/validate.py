"""Fresh-scene re-import of exports/kettle.glb checked against parts.json and seams.json. Exit 1 on failure."""
import bpy, os, sys, json
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__)); P = json.load(open(os.path.join(HERE, "parts.json"))); S = json.load(open(os.path.join(HERE, "exports", "seams.json")))["seams"]
bpy.ops.wm.read_factory_settings(use_empty=True); path = os.path.join(HERE, "exports", "kettle.glb"); bpy.ops.import_scene.gltf(filepath=path)
objs = {o.name.split(".")[0]: o for o in bpy.data.objects}; tris = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
missing, bad = [], []
for c in P["components"]:
    if c["mesh"] not in objs: missing.append(c["mesh"])
    n = c["fragments"]
    if n:
        frs = [objs.get(f"Frag_{c['key'].capitalize()}_{k + 1:02d}") for k in range(n)]
        for k, f in enumerate(frs):
            if f is None: missing.append(f"Frag_{c['key'].capitalize()}_{k + 1:02d}")
        have = [f for f in frs if f]
        if have and c["mesh"] in objs and sum(tris(f) for f in have) != tris(objs[c["mesh"]]): bad.append(f"{c['key']}: the shards have {sum(tris(f) for f in have)} triangles but the intact mesh has {tris(objs[c['mesh']])} (the shards must tile it exactly)")
        for f in have:                                   # origin must be the shard centroid: the local bounding box centre sits near the origin
            lo = [min(v.co[i] for v in f.data.vertices) for i in range(3)]; hi = [max(v.co[i] for v in f.data.vertices) for i in range(3)]; size = max(hi[i] - lo[i] for i in range(3)) or 1
            off = max(abs((lo[i] + hi[i]) / 2) for i in range(3))
            if off > 0.45 * size: bad.append(f"{f.name}: origin is {off:.2f} from the shard's centre (size {size:.2f})")
seam_bad = []
for i, s in enumerate(S):
    if len(s["points"]) < 3: seam_bad.append(f"seam {i} has {len(s['points'])} points")
if not S: seam_bad.append("no seams")
orphans = [o.name for o in bpy.data.objects if o.parent is None and o.name.split(".")[0] not in ("Kettle",)]
total_tris = sum(tris(o) for o in bpy.data.objects if o.type == "MESH"); size = os.path.getsize(path)
by_part = {}
for s in S: by_part[s["part"]] = by_part.get(s["part"], 0) + 1
rep = {"tris": total_tris, "bytes": size, "missing": missing, "orphans": orphans, "problems": bad, "seamProblems": seam_bad, "seams": len(S), "seamsByPart": by_part}
json.dump(rep, open(os.path.join(HERE, "exports", "validation.json"), "w"), indent=1); print(json.dumps(rep, indent=1))
fail = []
if missing: fail.append(f"missing {missing}")
if orphans: fail.append(f"unparented {orphans}")
if bad: fail.append("; ".join(bad[:3]))
if seam_bad: fail.append("; ".join(seam_bad[:3]))
if total_tris > P["budget"]["tris"]: fail.append(f"{total_tris} tris over budget")
if size > P["budget"]["bytes"]: fail.append(f"{size} bytes over budget")
if fail: print("VALIDATION FAILED:", fail); sys.exit(1)
print("VALIDATION OK")
