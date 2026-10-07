"use client";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { FOV_DEG, layout, mulberry32, openDamage, seamsOf, shatter, springStep, stepShatter, type Shard } from "@kintsugi/domain";
import type { ComponentKey } from "@kintsugi/schemas";
import type { Data } from "../data";
import { base } from "../data";
import { live, set, state, useStore } from "../store";

const GOLD = "#D9AA45", RED = "#8E241F";
const PART: Record<string, string> = { body: "Body", lid: "Lid", handle: "Handle", spout: "Spout" };
const SEP: Record<ComponentKey, [number, number, number]> = { body: [0, 0.2, 0.55], lid: [0, 0.8, 0], handle: [0.7, 0.35, 0], spout: [-0.7, 0.4, 0], base: [0, -0.5, 0], gasket: [0, 0.55, 0.5], strainer: [0.1, 0.9, 0.5] };
const matFor = (kind: string) => { const c: Record<string, THREE.MeshPhysicalMaterialParameters> = { glaze: { color: "#EEE7D5", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }, lacquer: { color: "#8E241F", roughness: 0.25, clearcoat: 0.8 }, steel: { color: "#AAA69D", metalness: 1, roughness: 0.3 }, silicone: { color: "#1b1a18", roughness: 0.7 } }; return new THREE.MeshPhysicalMaterial(c[kind] ?? c.glaze); };

function Kettle({ data }: { data: Data }) {
  const gltf = useLoader(GLTFLoader, `${base}/models/kettle.glb`), model = useMemo(() => gltf.scene.clone(true), [gltf]), root = useRef<THREE.Group>(null);
  const mats = useMemo(() => ({ glaze: matFor("glaze"), lacquer: matFor("lacquer"), steel: matFor("steel"), silicone: matFor("silicone") }), []);
  const parts = useMemo(() => {
    const intact = data.components.map((c) => ({ c, node: model.getObjectByName(c.mesh) as THREE.Mesh }));
    const frags: { key: ComponentKey; part: string; node: THREE.Object3D; home: THREE.Vector3; mesh: THREE.Mesh; p: THREE.Vector3; v: THREE.Vector3; delay: number; dir: THREE.Vector3 }[] = [], r = mulberry32(5);
    for (const c of data.components) for (let i = 1; i <= c.fragments; i++) { const n = model.getObjectByName(`Frag_${PART[c.key]}_${String(i).padStart(2, "0")}`) as THREE.Mesh; const home = n.position.clone(); frags.push({ key: c.key, part: PART[c.key], node: n, home, mesh: n, p: home.clone(), v: new THREE.Vector3(), delay: r() * 0.9, dir: new THREE.Vector3(r() - 0.5, r() * 0.6, r() - 0.5).normalize() }); }
    model.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const comp = data.components.find((c) => c.mesh === m.name) ?? data.components.find((c) => m.name.startsWith(`Frag_${PART[c.key]}_`)); m.material = mats[(comp?.material ?? "glaze") as keyof typeof mats] ?? mats.glaze; });
    return { intact, frags };
  }, [model, data, mats]);
  // gold and crack tubes from the Blender seam metadata
  const seamMeshes = useMemo(() => data.seams.map((s) => { const curve = new THREE.CatmullRomCurve3(s.points.map((p) => new THREE.Vector3(...p)).map((v) => v.clone().multiply(new THREE.Vector3(1.006, 1, 1.006)))), tube = new THREE.TubeGeometry(curve, Math.max(8, s.points.length * 2), 0.014, 6, false); const idx = tube.index!.count; const gold = new THREE.Mesh(tube, new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.28, emissive: GOLD, emissiveIntensity: 0.18 })), crack = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, s.points.length), 0.006, 4, false), new THREE.MeshBasicMaterial({ color: RED })); gold.visible = crack.visible = false; return { s, gold, crack, idx }; }), [data]);
  const sim = useRef<{ shards: Shard[]; started: boolean }>({ shards: [], started: false }), prog = useRef<Record<string, number>>({}), state2 = useRef({ y: 0, sepK: 0 });
  const env = useThree((s) => s.scene), gl = useThree((s) => s.gl);
  useEffect(() => { const pm = new THREE.PMREMGenerator(gl), t = pm.fromScene(new RoomEnvironment(), 0.04).texture; env.environment = t; env.environmentIntensity = 0.35; return () => { env.environment = null; t.dispose(); pm.dispose(); }; }, [env, gl]);
  useFrame((st, dt) => {
    const s = state, intro = !s.introDone, ev = s.events[s.serial] ?? [], open = new Set(openDamage(ev) as ComponentKey[]), repaired = new Set(ev.filter((e) => e.type === "repaired" && e.details.method === "kintsugi").map((e) => PART[e.details.component as string]).filter(Boolean));
    const sepKeys = new Set<ComponentKey>(!intro && s.view === "repairs" ? [...open] : []), g = root.current!; const tt = st.clock.elapsedTime;
    // ---- intro phases (live.shatter): 0 whole, 1 shards fly, 2 silence, 3 shards levitate and reassemble, 4 whole again
    const phase = intro ? live.shatter : 0, showFrags = intro && phase >= 1 && phase <= 3, showIntact = !intro || phase === 0 || phase === 4;
    g.position.y = intro ? Math.max(0, live.fall) : 0;
    if (intro && phase === 1) { if (!sim.current.started) { sim.current.started = true; sim.current.shards = shatter(parts.frags.map((f) => [f.home.x, f.home.y, f.home.z] as [number, number, number]), [0, 0, 0.2], 3, 0.02); } if (!s.pauseMotion) stepShatter(sim.current.shards, Math.min(dt, 0.05) * 0.9); }
    if (!intro || phase === 0) sim.current.started = !intro ? false : sim.current.started;
    parts.frags.forEach((f, i) => {
      const sh = sim.current.shards[i];
      if (intro && phase === 1 && sh) { f.node.position.set(...sh.p); f.node.rotation.set(...sh.r); f.p.copy(f.node.position); f.v.set(0, 0, 0); }
      else if (intro && phase === 2) { /* silence: they lie where they fell */ }
      else if (intro && phase === 3) { const k = Math.max(0, Math.min(1, live.assemble * 1.6 - f.delay)), tgt = k < 0.3 ? new THREE.Vector3(f.p.x, f.home.y + 0.8, f.p.z) : f.home; for (let a = 0; a < 3; a++) { const [x, v] = springStep(f.node.position.getComponent(a), f.v.getComponent(a), tgt.getComponent(a), 6 + 6 * k, Math.min(dt, 0.05)); f.node.position.setComponent(a, x); f.v.setComponent(a, v); } f.node.rotation.x *= 0.92; f.node.rotation.y *= 0.92; f.node.rotation.z *= 0.92; if (k < 0.3) f.p.copy(new THREE.Vector3(f.node.position.x, f.p.y, f.node.position.z)); }
      else {
        const sepd = sepKeys.has(f.key), off = sepd ? SEP[f.key] : [0, 0, 0], w = sepd ? 0.15 : 0, tgt = [f.home.x + off[0] + f.dir.x * w, f.home.y + off[1] + f.dir.y * w, f.home.z + off[2] + f.dir.z * w];
        for (let a = 0; a < 3; a++) { const [x, v] = springStep(f.node.position.getComponent(a), f.v.getComponent(a), tgt[a], s.reduced ? 60 : 10, Math.min(dt, 0.05)); f.node.position.setComponent(a, x); f.v.setComponent(a, v); }
        f.node.rotation.x *= 0.85; f.node.rotation.y *= 0.85; f.node.rotation.z *= 0.85;
      }
      const away = f.node.position.distanceTo(f.home) > 0.004; f.node.visible = intro ? showFrags : sepKeys.has(f.key) || away;
    });
    // ---- intact meshes
    for (const { c, node } of parts.intact) {
      const sep = sepKeys.has(c.key), shardsAway = c.fragments > 0 && parts.frags.some((f) => f.key === c.key && f.node.position.distanceTo(f.home) > 0.004);
      if (c.fragments === 0) { const off = sep ? SEP[c.key] : [0, 0, 0]; node.position.x += (off[0] - node.position.x) * 0.15; node.position.y += (off[1] - node.position.y) * 0.15; node.position.z += (off[2] - node.position.z) * 0.15; }
      node.visible = intro ? (c.fragments === 0 ? !showFrags || true : showIntact) : c.fragments > 0 ? !(sep || shardsAway) : true;
      if (intro && c.fragments === 0) node.visible = !(phase >= 1 && phase <= 3);
      const mm = node.material as THREE.MeshPhysicalMaterial, sel = s.selComp === c.key && s.view === "repairs"; mm.emissive.set(sel ? "#D9AA45" : "#000000"); mm.emissiveIntensity = sel ? 0.25 + (s.pauseMotion ? 0 : 0.1 * Math.sin(tt * 3)) : 0;
    }
    // ---- gold seams on repaired parts (and all of them during the intro's repair), red hairlines on open damage
    for (const sm of seamMeshes) { const part = sm.s.part, key = (Object.keys(PART).find((k) => PART[k] === part) ?? "") as ComponentKey;
      const wantGold = intro ? live.seams > 0 && phase >= 3 || (intro && phase === 4) : repaired.has(part) && !sepKeys.has(key), p0 = prog.current[sm.s.part + sm.s.a + sm.s.b] ?? 0, target = wantGold ? (intro ? live.seams : 1) : 0, p = intro ? target : p0 + (target - p0) * (s.reduced ? 1 : 1 - Math.exp(-dt * 3));
      prog.current[sm.s.part + sm.s.a + sm.s.b] = p; sm.gold.visible = p > 0.01; (sm.gold.geometry as THREE.TubeGeometry).setDrawRange(0, Math.floor((sm.idx * Math.max(0, Math.min(1, p))) / 3) * 3);
      const dmg = !intro && open.has(key) && !sepKeys.has(key) && seamsOf(data.seams, key).indexOf(sm.s) >= 0 && seamsOf(data.seams, key).indexOf(sm.s) < 2; sm.crack.visible = dmg; }
    if (live.repaired) { live.repairPulse = 1; live.repaired = ""; } live.repairPulse *= 0.95;
    g.rotation.y = s.view === "passport" || s.view === "resale" ? tt * 0.25 * (s.pauseMotion ? 0 : 1) : (s.view === "repairs" ? live.drag : 0.3 * Math.sin(tt * 0.3) * (s.pauseMotion || intro ? 0 : 1));
  });
  return (
    <group ref={root}>
      <primitive object={model} onPointerDown={(e: { object: THREE.Object3D; stopPropagation: () => void }) => { if (!state.introDone || state.view !== "repairs") return; const c = data.components.find((x) => x.mesh === e.object.name || e.object.name.startsWith(`Frag_${PART[x.key]}_`)); if (c) { e.stopPropagation(); set({ selComp: c.key }); } }} />
      {seamMeshes.map((sm, i) => <group key={i}><primitive object={sm.gold} /><primitive object={sm.crack} /></group>)}
      <mesh position={[0, -0.21, 0]}><cylinderGeometry args={[1.7, 1.8, 0.3, 64]} /><meshStandardMaterial color="#0d0c0b" roughness={0.55} metalness={0.3} /></mesh>
    </group>
  );
}

function Rig() {
  const { camera, size } = useThree(), cam = camera as THREE.PerspectiveCamera, cur = useRef({ d: 12, tilt: 0.3, y: 0.7 });
  useFrame((_, dt) => {
    const s = state, L = layout(size.width, size.height), cx = size.width / 2 + (L.cx - size.width / 2) * live.ring, cy = size.height / 2 + (L.cy - size.height / 2) * live.ring;
    const goal = s.view === "repairs" ? { d: L.dist * 0.82, tilt: 0.18, y: 0.7 } : s.view === "resale" ? { d: L.dist * 1.1, tilt: 0.35, y: 0.55 } : s.view === "recovery" ? { d: L.dist * 1.25, tilt: 0.5, y: 0.5 } : { d: L.dist, tilt: 0.28, y: 0.65 };
    const k = !s.introDone ? 1 : s.reduced ? 1 : 1 - Math.exp(-dt * 2.6); cur.current.d += (goal.d - cur.current.d) * k; cur.current.tilt += (goal.tilt - cur.current.tilt) * k; cur.current.y += (goal.y - cur.current.y) * k;
    const { d, tilt, y } = cur.current; cam.fov = FOV_DEG; cam.near = 0.1; cam.far = 80; cam.position.set(0, y + Math.sin(tilt) * d, Math.cos(tilt) * d); cam.lookAt(0, y, 0); cam.setViewOffset(size.width, size.height, size.width / 2 - cx, size.height / 2 - cy, size.width, size.height); cam.updateProjectionMatrix();
  });
  return null;
}
function Lights() { return <><ambientLight intensity={0.18} color="#EEE7D5" /><spotLight position={[-4, 7, 4]} angle={0.5} penumbra={0.9} intensity={160} color="#FFF1D6" distance={30} decay={1.6} /><pointLight position={[5, 2, -3]} intensity={30} color={GOLD} /><pointLight position={[0, 1.5, 5]} intensity={18} color="#EEE7D5" /></>; }
function Lifecycle() {
  const { setFrameloop, gl } = useThree();
  useEffect(() => { const vis = () => setFrameloop(document.hidden ? "never" : "always"), lost = (e: Event) => { e.preventDefault(); set({ gfx: "poster" }); };
    document.addEventListener("visibilitychange", vis); gl.domElement.addEventListener("webglcontextlost", lost); (window as unknown as { __kintsugiStats: () => unknown }).__kintsugiStats = () => ({ calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures });
    return () => { document.removeEventListener("visibilitychange", vis); gl.domElement.removeEventListener("webglcontextlost", lost); }; }, [setFrameloop, gl]);
  return null;
}
export default function Scene({ data }: { data: Data }) {
  useStore(); const drag = useRef<{ x: number; k: number } | null>(null);
  useEffect(() => { (window as unknown as { __kLive: typeof live }).__kLive = live; }, []);
  return (
    <Canvas className="stage" data-testid="stage" dpr={[1, 1.75]} camera={{ fov: FOV_DEG, position: [0, 3, 12] }} gl={{ antialias: true, powerPreference: "high-performance" }} onCreated={({ gl, scene }) => { gl.setClearColor("#12110F"); gl.toneMapping = THREE.ACESFilmicToneMapping; scene.fog = new THREE.FogExp2("#12110F", 0.035); }}
      onPointerDown={(e) => { drag.current = { x: e.clientX, k: live.drag }; }} onPointerMove={(e) => { if (drag.current && state.introDone) live.drag = drag.current.k + (e.clientX - drag.current.x) * 0.008; }} onPointerUp={() => { drag.current = null; }}>
      <Lights /><Rig /><Kettle data={data} /><Lifecycle />
    </Canvas>
  );
}
