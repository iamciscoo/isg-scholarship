import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
test("public pages and legacy redirects work", async ({ page, request }) => {
  for (const path of [
    "/",
    "/about",
    "/services",
    "/how-it-works",
    "/pathways",
    "/faqs",
    "/pricing",
    "/contact",
    "/privacy",
    "/terms",
    "/cookies",
    "/eligibility",
    "/login",
    "/register",
    "/forgot-password",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
  }
  const legacy = await request.get("/index.html", { maxRedirects: 0 });
  expect(legacy.status()).toBe(308);
  expect(legacy.headers().location).toBe("/");
});
test("unauthenticated private routes stay protected", async ({ page, request, baseURL }) => {
  for (const path of [
    "/admin",
    "/admin/audit",
    "/admin/enquiries",
    "/advisor",
    "/dashboard",
    "/dashboard/profile",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
  expect((await request.get("/api/jobs/notifications")).status()).toBe(401);
  const result = await request.post("/api/assessments", {
    headers: { origin: "https://evil.invalid" },
    data: {},
  });
  expect(result.status()).toBe(403);
  expect(
    (
      await request.post("/api/assessments", { headers: { origin: new URL(baseURL!).origin }, data: {} })
    ).status(),
  ).toBe(503);
});
for (const width of [320, 768, 1024, 1440])
  test(`homepage fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (width < 1024) {
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
      await page.getByRole("button", { name: "Close menu" }).click();
    }
    expect(errors).toEqual([]);
    await mkdir("artifacts", { recursive: true });
    await page.screenshot({ path: `artifacts/home-${width}.png`, fullPage: true });
    await page.screenshot({ path: `artifacts/home-${width}-viewport.png`, fullPage: false });
  });
test("FAQ works with the keyboard", async ({ page }) => {
  await page.goto("/faqs");
  const question = page.locator("summary").first();
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("details").first()).toHaveAttribute("open", "");
});
test("homepage and assessment have no serious accessibility violations", async ({ page }) => {
  for (const path of ["/", "/eligibility", "/contact", "/login"]) {
    await page.goto(path);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
  }
});
