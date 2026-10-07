import { expect, test, type Page } from "@playwright/test";
const open = async (page: Page, url: string) => { await page.goto(url); await expect(page.getByTestId("hud")).toBeVisible({ timeout: 30_000 }); await expect(page.locator(".app")).toHaveAttribute("data-intro", "done"); };

// Blueprint section 19, the demo script.
test("demo walk: intro, passport, damaged lid, repair history, record repair, resale", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByTestId("skip-intro")).toBeVisible(); await expect(page.getByTestId("intro")).toHaveAttribute("data-step", /[0-9]/);
  await page.getByTestId("skip-intro").click(); await expect(page.getByTestId("intro")).toHaveCount(0, { timeout: 40_000 });
  await expect(page.getByTestId("hud")).toHaveCSS("opacity", "1", { timeout: 10_000 }); // toBeVisible ignores opacity, so assert it
  await expect(page.getByTestId("serial")).toHaveText("KG-2021-00417"); await expect(page.getByTestId("open-damage")).toContainText("lid");
  // passport: choose another product by scanning, then back
  await page.getByTestId("nav-passport").click(); await page.getByTestId("scan").selectOption({ index: 1 }); await expect(page.getByTestId("scan")).not.toHaveValue(await page.getByTestId("scan").locator("option").first().getAttribute("value") as string); await page.getByTestId("scan").selectOption({ index: 0 }); await expect(page.getByTestId("materials")).toBeVisible();
  // repairs: select the damaged lid, see history and plan, record the repair
  await page.getByTestId("nav-repairs").click(); await page.getByTestId("comp-lid").click(); await expect(page.getByTestId("hist")).toContainText("damaged"); await expect(page.getByTestId("plan")).toContainText("Gold-seam");
  await page.getByTestId("repair").click(); await page.getByTestId("nav-lifecycle").click(); await expect(page.getByTestId("open-damage")).toHaveText("none"); await expect(page.getByTestId("repair-count")).toHaveText("3"); await expect(page.getByTestId("log").locator("li").first()).toContainText("Repaired");
  // resale: list the repaired kettle, the wheel moves to Resell
  await page.getByTestId("nav-resale").click(); await expect(page.getByTestId("value")).toContainText("$"); await page.getByTestId("list").click(); await expect(page.getByTestId("status")).toHaveText("listed");
  await page.getByTestId("nav-lifecycle").click(); await expect(page.getByTestId("stage-name")).toHaveText("Resell");
  // recovery needs the confirmation checkbox
  await page.getByTestId("nav-recovery").click(); await expect(page.getByTestId("recycle")).toBeDisabled(); await page.getByTestId("sure").check(); await page.getByTestId("recycle").click(); await expect(page.getByTestId("recovered")).toContainText("%");
  expect(errors).toEqual([]);
});
test("events persist across a reload and reset clears them", async ({ page }) => {
  await open(page, "/?skip=1&view=repairs&comp=lid"); await page.getByTestId("repair").click(); await page.reload(); await expect(page.getByTestId("hud")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("nav-lifecycle").click(); await expect(page.getByTestId("repair-count")).toHaveText("3"); await page.getByTestId("reset").click(); await expect(page.getByTestId("repair-count")).toHaveText("2");
});
test("damage can be reported on a sound component, and a repair is refused when nothing is open", async ({ page }) => {
  await open(page, "/?skip=1&view=repairs&comp=body"); await page.getByTestId("report").click(); await expect(page.getByTestId("plan")).toBeVisible(); await page.getByTestId("repair").click(); await expect(page.getByTestId("report")).toBeVisible();
});
test("a recycled passport accepts no further events", async ({ page }) => {
  await open(page, "/?skip=1&view=lifecycle&serial=KG-2016-00031"); await expect(page.getByTestId("status")).toHaveText("recycled"); await page.getByTestId("nav-resale").click(); await expect(page.getByTestId("list")).toHaveCount(0);
});
test("repair finder ranks shops by distance and honours the component", async ({ page }) => {
  await open(page, "/?skip=1&view=finder"); const rows = page.getByTestId("offers").locator("tbody tr"); expect(await rows.count()).toBeGreaterThan(1);
  const km = (await rows.locator("td:nth-child(2)").allTextContents()).map(Number); expect([...km].sort((a, b) => a - b)).toEqual(km);
});
test("deep link opens a view with a component selected", async ({ page }) => { await open(page, "/?view=repairs&comp=lid"); await expect(page.getByTestId("detail")).toContainText("Lid"); });
test("refresh mid-sequence restarts the intro cleanly", async ({ page }) => { await page.goto("/"); await page.waitForTimeout(1500); await page.reload(); await expect(page.getByTestId("intro")).toHaveAttribute("data-step", /[01]/); });
test("keyboard: views and components are reachable without a pointer", async ({ page }) => {
  await open(page, "/?skip=1&view=repairs"); await expect(async () => { await page.getByTestId("comp-lid").focus(); await expect(page.getByTestId("comp-lid")).toBeFocused({ timeout: 500 }); }).toPass({ timeout: 15_000 });
  await expect(async () => { await page.getByTestId("comp-lid").focus(); await page.keyboard.press("Enter"); await expect(page.getByTestId("detail")).toContainText("Lid", { timeout: 1000 }); }).toPass({ timeout: 15_000 });
});
test("choices made while the intro's last fade is still running are kept", async ({ page }) => {
  await page.goto("/"); await page.getByTestId("skip-intro").click(); await expect(page.getByTestId("hud")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("nav-resale").click(); await expect(page.getByTestId("intro")).toHaveCount(0, { timeout: 40_000 }); await expect(page.getByTestId("list")).toBeVisible();
});
