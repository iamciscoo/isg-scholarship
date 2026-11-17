import { expect, test } from "@playwright/test";
test("consultation requires registration", async ({ page }) => {
  await page.goto("/consultation");
  await expect(page).toHaveURL(/register/);
  await expect(page.locator("#auth-email")).toBeVisible();
  await expect(page.locator("#firstName")).toHaveCount(0);
  await page.goto("/eligibility");
  await expect(page).toHaveURL(/register/);
});
