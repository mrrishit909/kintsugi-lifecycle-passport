import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
// Budgets. Frame times here are SwiftShader (CPU rasteriser) numbers: they prove the scene is bounded, not that a GPU hits 60 fps.
const out = new URL("../../apps/web/out/", import.meta.url).pathname;
const size = (dir: string): number => readdirSync(dir).reduce((a, f) => { const p = join(dir, f), s = statSync(p); return a + (s.isDirectory() ? size(p) : f.endsWith(".js") ? gzipSync(readFileSync(p)).length : 0); }, 0);

test("download weight stays inside the budget", () => {
  expect(statSync(out + "models/kettle.glb").size).toBeLessThan(400_000);
  expect(size(out + "_next/static/chunks")).toBeLessThan(750_000); // gzipped JS incl. three.js
});
test("scene cost: draw calls and triangles are bounded", async ({ page }) => {
  await page.goto("/?skip=1&view=lifecycle"); await page.waitForFunction(() => typeof (window as unknown as { __kintsugiStats?: unknown }).__kintsugiStats === "function", null, { timeout: 30_000 }); await page.waitForTimeout(2000);
  const st = await page.evaluate(() => (window as unknown as { __kintsugiStats: () => { calls: number; triangles: number } }).__kintsugiStats());
  console.log("renderer", JSON.stringify(st));
  expect(st.calls).toBeLessThan(120); expect(st.triangles).toBeLessThan(120_000);
});
test("interaction stays responsive while the canvas renders", async ({ page }) => {
  await page.goto("/?skip=1&view=lifecycle"); await expect(page.getByTestId("hud")).toBeVisible({ timeout: 30_000 }); await page.waitForTimeout(2000);
  const t0 = Date.now(); await page.getByTestId("nav-repairs").click(); await expect(page.getByTestId("components")).toBeVisible();
  console.log("view-switch ms", Date.now() - t0); expect(Date.now() - t0).toBeLessThan(3000);
});
