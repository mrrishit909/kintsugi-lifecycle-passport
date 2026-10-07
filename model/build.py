"""KINTSUGI: an original ceramic kettle with authored fragments. Deterministic. Run: Blender -b -P model/build.py
Intact meshes (Kettle_*), shards (Frag_<Part>_NN, origin = shard centroid = assembled position) and seams.json (boundaries between neighbouring shards, glTF axes).
The shards are the intact mesh's own faces partitioned by nearest seed, so the shards tile the object exactly with no gaps. Browser animates; nothing fractures at runtime."""
import bpy, bmesh, math, os, json, random
from collections import defaultdict
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__)); P = json.load(open(os.path.join(HERE, "parts.json")))
os.makedirs(os.path.join(HERE, "exports"), exist_ok=True); os.makedirs(os.path.join(HERE, "renders"), exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True); scene = bpy.context.scene; rnd = random.Random(404)
def mat(name, color, rough=0.3, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal; return m
MAT = {"glaze": mat("Glaze", (0.82, 0.8, 0.72), 0.22), "lacquer": mat("Lacquer", (0.34, 0.07, 0.06), 0.25), "steel": mat("Steel", (0.7, 0.7, 0.72), 0.3, 1.0), "silicone": mat("Silicone", (0.05, 0.05, 0.05), 0.7), "gold": mat("Gold", (0.85, 0.66, 0.27), 0.25, 1.0)}
root = bpy.data.objects.new("Kettle", None); scene.collection.objects.link(root)
def lathe(profile, seg=48):
    bm = bmesh.new(); rings = []
    for i in range(seg):
        a = 2 * math.pi * i / seg; c, s = math.cos(a), math.sin(a); rings.append([bm.verts.new((r * c, r * s, z)) for r, z in profile])
    n = len(profile)
    for i in range(seg):
        for j in range(n - 1): bm.faces.new((rings[i][j], rings[(i + 1) % seg][j], rings[(i + 1) % seg][j + 1], rings[i][j + 1]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5); return bm
def smooth(pts, n=5):
    """Catmull-Rom through the profile points so the lathe is round, not faceted."""
    out = []
    for i in range(len(pts) - 1):
        p0, p1, p2, p3 = pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, len(pts) - 1)]
        for k in range(n):
            t = k / n; out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t ** 3) for j in range(2)))
    out.append(pts[-1]); return out
def sweep(path, radius, sides=12):
    bm = bmesh.new(); rings = []
    for i, p in enumerate(path):
        t = i / (len(path) - 1); r = radius(t); d = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized(); a = d.cross(Vector((0, 1, 0))).normalized(); b = d.cross(a).normalized()
        rings.append([bm.verts.new(p + (a * math.cos(2 * math.pi * k / sides) + b * math.sin(2 * math.pi * k / sides)) * r) for k in range(sides)])
    for i in range(len(rings) - 1):
        for k in range(sides): bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
    return bm
def to_obj(name, bm, material, loc=(0, 0, 0), smooth=True):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = smooth
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o); o.data.materials.append(MAT[material]); o.parent = root; o.location = loc; return o
def centroid(bm_faces): 
    vs = [v.co for f in bm_faces for v in f.verts]; return sum(vs, Vector()) / len(vs)
SEAMS = []
def fracture(part, bm, material, n, seed_fn):
    """Partition bm's faces into n shards by nearest seed; make one object per shard with its origin at the shard centroid; record seam polylines."""
    r = random.Random(hash(part) % 1000 + 7); seeds = [seed_fn(i, n, r) for i in range(n)]
    faces = list(bm.faces); fc = [f.calc_center_median() for f in faces]
    gid = {f.index: min(range(n), key=lambda k: (fc[faces.index(f)] - seeds[k]).length_squared) for f in faces}
    # edge -> groups on either side
    edge_groups = defaultdict(set)
    for f in faces:
        for e in f.edges: edge_groups[e.index].add(gid[f.index])
    pair_edges = defaultdict(list)
    for e in bm.edges:
        g = edge_groups[e.index]
        if len(g) == 2: pair_edges[tuple(sorted(g))].append((e.verts[0].co.copy(), e.verts[1].co.copy()))
    for (a, b), segs in pair_edges.items():
        # chain the segments into polylines
        pts = {}; 
        for p, q in segs: pts.setdefault(tuple(round(c, 5) for c in p), []).append(q); pts.setdefault(tuple(round(c, 5) for c in q), []).append(p)
        start = next((k for k, v in pts.items() if len(v) == 1), next(iter(pts))); path = [Vector(start)]; seen = {start}; cur = start
        while True:
            nxt = [q for q in pts[cur] if tuple(round(c, 5) for c in q) not in seen]
            if not nxt: break
            q = nxt[0]; k = tuple(round(c, 5) for c in q); seen.add(k); path.append(Vector(q)); cur = k
        if len(path) >= 3: SEAMS.append({"part": part, "a": a + 1, "b": b + 1, "points": [[round(p.x, 4), round(p.z, 4), round(-p.y, 4)] for p in path]})
    objs = []
    for k in range(n):
        sb = bmesh.new(); vm = {}
        for f in [f for f in faces if gid[f.index] == k]:
            nv = [vm.setdefault(v.index, sb.verts.new(v.co)) for v in f.verts]; sb.faces.new(nv)
        if not sb.faces: sb.free(); continue
        c = centroid(sb.faces)
        for v in sb.verts: v.co -= c
        objs.append(to_obj(f"Frag_{part}_{k + 1:02d}", sb, material, tuple(c)))
    return objs
# ---- body: a rounded stoneware vessel
body_profile = [(0.0, 0.0), (0.62, 0.0), (0.74, 0.04), (0.88, 0.22), (0.96, 0.5), (0.94, 0.78), (0.82, 1.0), (0.62, 1.16), (0.52, 1.22), (0.48, 1.22)]
body = lathe(smooth(body_profile, 4), 64)
to_obj("Kettle_Body", body.copy(), "glaze")
def seed_body(i, n, r): a = (i + r.uniform(-0.3, 0.3)) / n * 2 * math.pi * 2.0; z = (0.15 + 0.7 * ((i * 0.618) % 1)); return Vector((0.9 * math.cos(a), 0.9 * math.sin(a), z))
fracture("Body", body, "glaze", 10, seed_body)
# ---- lid: a low dome with a knob (knob is part of the lid mesh)
lid_profile = [(0.0, 1.3), (0.06, 1.3), (0.1, 1.36), (0.07, 1.42), (0.0, 1.44)]
dome = [(0.48, 1.22), (0.5, 1.24), (0.42, 1.32), (0.3, 1.38), (0.18, 1.4), (0.1, 1.4)]
lid = lathe(smooth(dome, 4) + [(0.09, 1.4), (0.09, 1.47), (0.14, 1.52), (0.0, 1.56)], 40)
to_obj("Kettle_Lid", lid.copy(), "glaze")
def seed_lid(i, n, r): a = i / n * 2 * math.pi + 0.4; return Vector((0.3 * math.cos(a), 0.3 * math.sin(a), 1.36))
fracture("Lid", lid, "glaze", 4, seed_lid)
# ---- handle: a loop swept along an arc; spout: a tapered tube
hpath = [Vector((0.9 + 0.55 * math.sin(math.pi * t), 0, 0.28 + 0.74 * t)) for t in [i / 16 for i in range(17)]]
handle = sweep(hpath, lambda t: 0.07 * (1 + 0.5 * math.sin(math.pi * t)), 12); to_obj("Kettle_Handle", handle.copy(), "lacquer")
def seed_h(i, n, r): t = (i + 0.5) / n; return Vector((0.9 + 0.55 * math.sin(math.pi * t), 0, 0.28 + 0.74 * t))
fracture("Handle", handle, "lacquer", 3, seed_h)
spath = [Vector((-0.86 - 0.62 * t, 0, 0.3 + 0.62 * t * t + 0.1 * t)) for t in [i / 12 for i in range(13)]]
spout = sweep(spath, lambda t: 0.16 - 0.09 * t, 12); to_obj("Kettle_Spout", spout.copy(), "glaze")
def seed_s(i, n, r): t = (i + 0.5) / n; return Vector((-0.86 - 0.62 * t, 0, 0.3 + 0.62 * t * t + 0.1 * t))
fracture("Spout", spout, "glaze", 3, seed_s)
# ---- intact accessories
base = lathe([(0.55, -0.06), (0.74, -0.06), (0.76, -0.02), (0.76, 0.02), (0.6, 0.02)], 40); to_obj("Kettle_Base", base, "steel")
gasket = lathe([(0.5, 1.205), (0.54, 1.205), (0.54, 1.225), (0.5, 1.225)], 40); to_obj("Kettle_Gasket", gasket, "silicone")
bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=24, radius=0.42); [setattr(v, "co", Vector((v.co.x, v.co.y, 1.12))) for v in bm.verts]; ext = bmesh.ops.extrude_face_region(bm, geom=bm.faces[:]); [setattr(v, "co", v.co + Vector((0, 0, 0.02))) for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)]
to_obj("Kettle_Strainer", bm, "steel")
for o in list(root.children): o.parent = root
# ---- a plinth for the poster only
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1.6, depth=0.3, location=(0, 0, -0.21)); pl = bpy.context.active_object; pl.name = "Plinth_poster"; pl.data.materials.append(mat("PlinthMat", (0.07, 0.065, 0.06), 0.5))
bpy.ops.object.camera_add(location=(3.4, -4.2, 2.1)); cam = bpy.context.active_object; scene.camera = cam; cam.data.lens = 55; cam.rotation_euler = (Vector((0, 0, 0.75)) - cam.location).to_track_quat("-Z", "Y").to_euler()
for name, loc, e, col in (("Key", (-3, -3, 4), 900, (1.0, 0.9, 0.75)), ("Rim", (3, 3, 2), 500, (0.8, 0.9, 1.0))):
    bpy.ops.object.light_add(type="POINT", location=loc); l = bpy.context.active_object; l.name = name; l.data.energy = e; l.data.color = col
world = bpy.data.worlds.new("Ink"); scene.world = world; world.use_nodes = True; world.node_tree.nodes["Background"].inputs[0].default_value = (0.02, 0.018, 0.015, 1)
for o in bpy.data.objects:
    if o.name.startswith("Frag_"): o.hide_render = True
scene.render.engine = "BLENDER_EEVEE_NEXT"; scene.render.resolution_x, scene.render.resolution_y = 1280, 720; scene.render.filepath = os.path.join(HERE, "renders", "poster.png")
bpy.data.objects["Plinth_poster"].select_set(False); pl.hide_render = False
bpy.ops.object.select_all(action="DESELECT")
def pick(o):
    o.select_set(True)
    for c in o.children: pick(c)
pick(root)
bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, "exports", "kettle.glb"), export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_cameras=False, export_lights=False)
json.dump({"seams": SEAMS}, open(os.path.join(HERE, "exports", "seams.json"), "w"))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "source.blend"))
try: bpy.ops.render.render(write_still=True)
except Exception as e: print("poster failed", e)
print("BUILD OK", len(SEAMS), "seams")
