import { expect, test } from "@playwright/test";
// Visual regression on the product surfaces with the canvas swapped for the poster (WebGL output is not bit-stable across GPUs).
for (const view of ["lifecycle", "passport", "repairs", "finder", "resale", "recovery"]) {
  test(`visual: ${view}`, async ({ page }) => {
    await page.goto(`/?gfx=off&skip=1&view=${view}&comp=lid`); await page.addStyleTag({ content: "*{animation:none!important;transition:none!important}" });
    await expect(page.getByTestId("hud")).toBeVisible(); await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot(`${view}.png`);
  });
}
