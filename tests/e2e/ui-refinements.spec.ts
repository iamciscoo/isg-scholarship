import { test, expect } from "@playwright/test";
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`auth forms remain accessible at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const path of ["/login", "/register"]) {
      await page.goto(path);
      await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
      const submit = page.locator(".auth-card form > button.button");
      await expect(submit).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (viewport.height >= 768)
        expect(await submit.evaluate((e) => e.getBoundingClientRect().bottom)).toBeLessThanOrEqual(
          viewport.height,
        );
      await submit.scrollIntoViewIfNeeded();
      await expect(submit).toBeInViewport();
    }
  });
}
test("home flags and mobile swipe rows preserve page width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".hero-destinations img")).toHaveCount(4);
  await expect(page.locator(".hero-route-plaque .route-plaque-line")).toHaveCount(0);
  await page.goto("/pathways");
  const row = page.locator(".study-path-grid").first();
  await expect(row).toBeVisible();
  await expect(row.locator("article")).toHaveCount(12);
  expect(await row.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
  await row.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => row.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("home logo returns to top with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("heading", { name: "More than a university.", exact: false }).scrollIntoViewIfNeeded();
  await page.locator(".brand").click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});
