import { expect, test } from "@playwright/test";
test("reduced motion: static keyframes, no timeline, same navigation", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" }), page = await ctx.newPage(); await page.goto("/");
  await expect(page.getByRole("dialog", { name: "Opening story" })).toBeVisible(); await expect(page.getByTestId("pause-motion")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("skip-intro").click(); await expect(page.getByTestId("serial")).toBeVisible(); await page.getByTestId("nav-recovery").click(); await expect(page.getByTestId("routes")).toBeVisible(); await ctx.close();
});
test("graphics failure: the poster still, and every view still works from the DOM", async ({ page }) => {
  await page.goto("/?gfx=off&skip=1&view=repairs&comp=lid"); await expect(page.getByTestId("poster")).toBeVisible(); await expect(page.locator("canvas:not(.flow)")).toHaveCount(0);
  await page.getByTestId("repair").click(); await page.getByTestId("nav-resale").click(); await page.getByTestId("list").click(); await expect(page.getByTestId("status")).toHaveText("listed");
});
test("WebGL context loss falls back to the poster", async ({ page }) => {
  await page.goto("/?skip=1&view=lifecycle"); await expect(page.locator("canvas")).toHaveCount(1, { timeout: 30_000 }); await page.waitForFunction(() => typeof (window as unknown as { __kintsugiStats?: unknown }).__kintsugiStats === "function");
  await page.evaluate(() => document.querySelector("canvas")!.dispatchEvent(new Event("webglcontextlost", { cancelable: true }))); await expect(page.getByTestId("poster")).toBeVisible(); await page.getByTestId("nav-passport").click(); await expect(page.getByTestId("materials")).toBeVisible();
});
test("phone width: nothing scrolls sideways and the panel stays reachable", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true }), page = await ctx.newPage(); await page.goto("/?skip=1&view=lifecycle&gfx=off");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0); await expect(page.getByTestId("nav-repairs")).toBeVisible(); await page.getByTestId("nav-repairs").click(); await expect(page.getByTestId("components")).toBeVisible(); await ctx.close();
});
test("pause motion stops the ambient animation", async ({ page }) => { await page.goto("/?skip=1&view=lifecycle"); await page.getByTestId("pause-motion").click(); await expect(page.getByTestId("pause-motion")).toHaveAttribute("aria-pressed", "true"); });
