import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("registration has email and matching password fields", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("autocomplete", "new-password");
  await expect(page.getByLabel("Confirm password", { exact: true })).toHaveAttribute("type", "password");
  await expect(page.locator('input[type="password"]')).toHaveCount(2);
});
test("university content follows the presidents without exposing scholarship listings", async ({ page }) => {
  await page.goto("/");
  const position = await page
    .locator(".leaders-section")
    .evaluate((el) => Boolean(el.nextElementSibling?.classList.contains("university-life")));
  expect(position).toBe(true);
  await page.locator(".university-life").scrollIntoViewIfNeeded();
  await expect(page.locator(".university-scenes article")).toHaveCount(3);
  for (const img of await page.locator(".university-scenes img").all()) await expect(img).toBeVisible();
  await page.goto("/universities");
  await expect(page.locator("h1")).toHaveText("Find your study path.");
  await expect(page).toHaveURL(/\/pathways#campus-life/);
  await expect(page.getByRole("link", { name: /view scholarships/i })).toHaveCount(0);
});
for (const width of [320, 390, 768, 1440])
  test(`public and registration layouts fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/about", "/universities", "/register"]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
      if (width === 390)
        await page.screenshot({ path: `artifacts/polish-${path.slice(1)}-mobile.png`, fullPage: true });
    }
  });
test("university and registration pages meet accessibility checks", async ({ page }) => {
  for (const path of ["/pathways", "/register"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations).toEqual([]);
  }
});
