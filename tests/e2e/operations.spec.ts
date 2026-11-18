import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("study paths merge campus life and filter programme areas", async ({ page }) => {
  await page.goto("/pathways");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find your study path.");
  await page.getByRole("combobox",{name:"Study level",exact:true}).selectOption("Master's");
  await page.getByRole("combobox",{name:"Academic field",exact:true}).selectOption("Health");
  await page.getByRole("button", { name: "Explore paths" }).click();
  await expect(
    page.getByRole("heading", { name: "Public health & life sciences", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Engineering & technology", exact: true })).toHaveCount(0);
  await expect(page.locator("#campus-life .university-scenes article")).toHaveCount(3);
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
});
test("private file and declared PDF endpoints do not serve anonymous content", async ({ request }) => {
  for (const path of [
    "/api/case-files/80000000-0000-4000-8000-000000000001",
    "/api/application-pdf/80000000-0000-4000-8000-000000000001",
  ]) {
    const result = await request.get(path);
    expect([401, 503]).toContain(result.status());
    expect(await result.body()).toHaveLength(0);
  }
});
test("WhatsApp offers a visible desktop help label and a direct mobile action", async ({ page }) => {
  await page.goto("/");
  const chat = page.getByRole("link", { name: "Chat with ISG on WhatsApp" });
  await chat.hover();
  await expect(chat.locator(".whatsapp-help")).toHaveCSS("opacity", "1");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(chat).toBeVisible();
  await expect(chat).toHaveAttribute("href", "https://wa.me/79282120121");
});
for (const width of [320, 390, 768, 1024, 1440])
  test(`study paths and fees fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/pathways", "/pricing"]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
    }
  });
