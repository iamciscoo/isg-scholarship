import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("utility bar, guest notifications and WhatsApp contact work", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.locator(".utility-links").getByRole("link", { name: "Contact", exact: true }),
  ).toHaveAttribute("href", "/contact");
  await page.getByRole("button", { name: "Notifications", exact: true }).click();
  await expect(page.getByText("Sign in to see updates from ISG.")).toBeVisible();
  await expect(page.locator(".notification-count")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeFocused();
  await expect(page.getByRole("link", { name: "Chat with ISG on WhatsApp" })).toHaveAttribute(
    "href",
    "https://wa.me/79282120121",
  );
  await expect(page.locator(".account-link")).toHaveAttribute("href", "/login");
});
test("six languages change content and persist; Arabic uses RTL", async ({ page }) => {
  await page.goto("/");
  for (const [name, locale, title] of [
    ["Français", "fr", "Avec un plan clair."],
    ["Kiswahili", "sw", "Kwa mpango ulio wazi."],
    ["Русский", "ru", "С понятным планом."],
    ["Español", "es", "Con un plan claro."],
    ["العربية", "ar", "بخطة واضحة."],
    ["English", "en", "With a clear plan."],
  ]) {
    await page.locator(".language-trigger").click();
    await page.getByRole("menuitemradio", { name }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("h1")).toContainText(title);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    if (locale === "ar") {
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: "artifacts/home-ar-mobile.png", fullPage: true });
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(result.violations).toEqual([]);
    }
  }
  await page.locator(".language-trigger").click();
  await page.getByRole("menuitemradio", { name: "Kiswahili" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "sw");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "sw");
  await page.goto("/login");
  await expect(page.locator("h1")).toHaveText("Karibu tena.");
});
test("sign in allows password visibility without losing the value", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password", { exact: true }).fill("test-only-fixture");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.locator("#auth-password")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(page.locator("#auth-password")).toHaveValue("test-only-fixture");
  await page.screenshot({ path: "artifacts/login-desktop.png", fullPage: true });
});
test("reduced motion keeps all content visible without scroll transforms", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".process-section").scrollIntoViewIfNeeded();
  expect(await page.locator(".hero-photo").evaluate((el) => getComputedStyle(el).transform)).toBe("none");
  await expect(page.locator(".process-grid li")).toHaveCount(4);
  await page.screenshot({ path: "artifacts/home-reduced.png", fullPage: true });
});
