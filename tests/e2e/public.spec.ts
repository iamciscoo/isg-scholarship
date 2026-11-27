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
    "/universities",
    "/faqs",
    "/pricing",
    "/contact",
    "/privacy",
    "/terms",
    "/cookies",
    "/consultation",
    "/login",
    "/register",
    "/forgot-password",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    if (path === "/services") {
      await expect(page.getByText(/^Service scope and any charges/)).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Read about service fees" })).toBeVisible();
    }
  }
  const legacy = await request.get("/index.html", { maxRedirects: 0 });
  expect(legacy.status()).toBe(308);
  expect(legacy.headers().location).toBe("/");
});
test("service content is translated after navigating from another public page", async ({ page, baseURL }) => {
  await page.context().addCookies([{ name: "isg_locale", value: "fr", url: baseURL! }]);
  await page.goto("/about");
  await page.getByRole("link", { name: "Nos services", exact: true }).first().click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.locator(".content-grid h2")).toHaveText([
    "Évaluation initiale de l’admissibilité",
    "Conseils sur les bourses",
    "Examen du profil académique",
    "Préparation de la candidature",
    "Consultations individuelles",
    "Suivi de la candidature",
  ]);
  await expect(page.getByRole("link", { name: "Consulter les frais de service" })).toBeVisible();
});
test("logo and utility links zoom without a pointer border and retain keyboard focus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const logo = page.locator(".brand");
  for (const link of [logo, page.locator(".utility-links a").first()]) {
    await expect(link).toBeVisible();
    const box = (await link.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(link).toHaveCSS("box-shadow", "none");
    await expect(link).toHaveCSS("outline-style", "none");
    await expect(link).toHaveCSS("scale", "1.04");
    await page.mouse.move(0, 0);
    await page.mouse.up();
  }
  await page.keyboard.press("Tab");
  await logo.focus();
  await expect(logo).toHaveCSS("outline-style", "solid");
});
test("registration password requirements and confirmation update while typing", async ({ page }) => {
  await page.goto("/register");
  const password = page.locator("#auth-password");
  const confirm = page.locator("#auth-password-confirm");
  const passed = page.locator('#auth-password-requirements [data-met="true"]');
  await password.fill("lowercase");
  await expect(passed).toHaveCount(1);
  await password.fill("AnExample1234");
  await expect(passed).toHaveCount(4);
  await confirm.fill("AnExample1235");
  await expect(page.locator("#auth-confirm-error")).toBeVisible();
  await confirm.fill("AnExample1234");
  await expect(page.locator("#auth-confirm-error")).toHaveCount(0);
  await expect(confirm).toHaveAttribute("aria-invalid", "false");
});
test("unauthenticated private routes stay protected", async ({ page, request, baseURL }) => {
  for (const path of [
    "/admin",
    "/admin/audit",
    "/admin/enquiries",
    "/admin/consultations",
    "/admin/notifications",
    "/admin/inbox",
    "/admin/payments",
    "/admin/opportunities",
    "/admin/promotions",
    "/admin/packages",
    "/admin/applications",
    "/advisor",
    "/dashboard",
    "/dashboard/profile",
    "/dashboard/consultations",
    "/dashboard/application",
    "/dashboard/applications",
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
  for (const path of ["/", "/register", "/contact", "/login"]) {
    await page.goto(path);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
  }
});
