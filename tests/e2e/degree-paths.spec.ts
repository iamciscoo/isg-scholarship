import { expect, test } from "@playwright/test";

test("homepage degree cards select their study level", async ({ page }) => {
  for (const [index, level] of ["Undergraduate", "Master's", "PhD / Research"].entries()) {
    await page.goto("/");
    await page.locator(".pathway-grid .pathway-tile").nth(index).click();
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === "/pathways" && url.searchParams.get("level") === level && url.hash === "#programmes",
    );
    await expect(page.getByRole("combobox", { name: "Study level", exact: true })).toHaveValue(level);
    const cards = page.locator(".study-path-card .eyebrow");
    await expect(cards.first()).toBeVisible();
    for (const card of await cards.all()) await expect(card).toHaveText(level);
  }
});
