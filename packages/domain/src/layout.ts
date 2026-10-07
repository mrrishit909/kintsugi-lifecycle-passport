// Where the watch sits on screen and where the navigation ring goes, derived from the viewport. One source for the camera and the DOM ring.
export const FOV_DEG = 28, DIAL_R_CM = 1.25;
export type Layout = { cx: number; cy: number; dialPx: number; ringPx: number; indexPx: number; dist: number; wide: boolean };
export function layout(W: number, H: number): Layout {
  const wide = W > 900 && W >= H * 1.1;
  const cx = wide ? W * 0.36 : W / 2, cy = wide ? H * 0.52 : H * 0.3;
  const base = wide ? H : Math.min(H * 0.6, W * 1.05);   // the drawable height the ring may use
  const dialPx = base * 0.2, ringPx = base * 0.4, indexPx = dialPx * 1.1;
  // perspective: projected radius = R / (d tan(fov/2)) * (H/2)  =>  d = R * (H/2) / (px * tan(fov/2))
  const dist = (DIAL_R_CM * (H / 2)) / (dialPx * Math.tan((FOV_DEG * Math.PI) / 360));
  return { cx, cy, dialPx, ringPx, indexPx, dist, wide };
}
/** Screen position of station i of n (clockwise from 12) at radius r around the layout centre. */
export const stationXY = (l: Layout, i: number, n: number, r: number): [number, number] => { const a = (2 * Math.PI * i) / n; return [l.cx + r * Math.sin(a), l.cy - r * Math.cos(a)]; };
