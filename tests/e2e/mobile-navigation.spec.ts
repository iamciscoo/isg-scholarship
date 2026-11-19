import { test, expect } from "@playwright/test";
for (const width of [320, 390]) {
  test(`mobile headers and home card rows fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.locator(".hero-copy h1")).toBeVisible();
    await page.mouse.wheel(0, 1000);
    await expect
      .poll(() => page.locator(".utility-strip").evaluate((e) => Math.round(e.getBoundingClientRect().top)))
      .toBe(0);
    await expect(page.getByRole("button", { name: "Language", exact: true })).toBeInViewport();
    await expect(page.locator(".pathways-section .section-heading p")).toHaveCount(0);
    for (const selector of [".story-grid", ".pathway-grid"]) {
      const row = page.locator(selector);
      await row.scrollIntoViewIfNeeded();
      await expect(row).toBeVisible();
      expect(await row.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
      const card = row.locator(":scope > *").first();
      expect(await card.evaluate((e) => e.getBoundingClientRect().width)).toBeLessThan(width);
      await row.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => row.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 390 && selector === ".pathway-grid") {
        await page.getByRole("heading", { name: "Where will your ambition take you?", exact: true }).click();
        await page.screenshot({ path: "artifacts/mobile-card-navigation-preview.png" });
      }
    }
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "About us", exact: true })
      .click();
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".utility-strip")).toBeInViewport();
  });
}
