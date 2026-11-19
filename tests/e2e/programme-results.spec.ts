import { test, expect } from "@playwright/test";
test("programme filters land at results and retain the same range for every country", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const destination of ["Russia", "Canada", "Germany", "United Kingdom"]) {
    await page.goto("/pathways");
    await page.getByRole("combobox", { name: "Study level", exact: true }).selectOption("Undergraduate");
    await page.getByRole("combobox", { name: "Academic field", exact: true }).selectOption("Computing");
    await page.getByRole("textbox", { name: "Destination interest", exact: true }).fill(destination);
    await page.getByRole("button", { name: "Explore paths", exact: true }).click();
    await expect(page).toHaveURL(
      (u) => u.hash === "#programme-results" && u.searchParams.get("destination") === destination,
    );
    await expect(page.locator("#programme-results")).toBeInViewport();
    await expect(page.locator(".programme-result-count")).toContainText("2 programme guides");
    await expect(page.locator(".study-path-grid").first().locator("article")).toHaveCount(2);
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(100);
  }
});
test("all sixty guides are paginated and reset synchronizes filters", async ({ page }) => {
  await page.goto("/pathways");
  await expect(page.locator(".programme-result-count")).toContainText("60 programme guides");
  await expect(page.locator(".study-path-grid").first().locator("article")).toHaveCount(12);
  await page
    .getByRole("navigation", { name: "Programme pages", exact: true })
    .getByRole("link", { name: "Next →", exact: true })
    .click();
  await expect(page).toHaveURL((u) => u.searchParams.get("page") === "2" && u.hash === "#programme-results");
  await expect(page.locator("#programme-results")).toBeInViewport();
  await page.getByRole("combobox", { name: "Academic field", exact: true }).selectOption("Law");
  await page.getByRole("button", { name: "Explore paths", exact: true }).click();
  await expect(page.locator(".programme-result-count")).toContainText("6 programme guides");
  await page.getByRole("link", { name: "Reset", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Academic field", exact: true })).toHaveValue("");
  await expect(page.locator(".programme-result-count")).toContainText("60 programme guides");
});
