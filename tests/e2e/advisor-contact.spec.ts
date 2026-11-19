import { test, expect } from "@playwright/test";
test("About is concise and legacy photographs redirect to WebP", async ({ page, request }) => {
  await page.goto("/about");
  await expect(page.locator("h1")).toBeVisible();
  expect((await page.locator(".page-body").innerText()).split(/\s+/).length).toBeLessThan(140);
  await expect(page.getByRole("heading", { name: "Our purpose", exact: true })).toHaveCount(0);
  const old = await request.get("/images/study-together.jpg", { maxRedirects: 0 });
  expect(old.status()).toBe(308);
  expect(old.headers().location).toBe("/images/study-together.webp");
  const photo = await request.get("/images/study-together.webp");
  expect(photo.status()).toBe(200);
  expect(photo.headers()["content-type"]).toContain("image/webp");
});
for (const width of [320, 390, 768])
  test(`hero advisor and consultation links share a row at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.locator(".hero-copy h1")).toBeVisible();
    const primary = page.locator(".hero-actions .button"),
      advisor = page.locator(".hero-actions .text-link");
    const a = await primary.boundingBox(),
      b = await advisor.boundingBox();
    expect(a && b).toBeTruthy();
    expect(Math.abs(a!.y + a!.height / 2 - b!.y - b!.height / 2)).toBeLessThan(5);
    if (width === 390) {
      await expect
        .poll(() =>
          page
            .locator(".hero-destinations img")
            .evaluateAll((images) =>
              images.every(
                (i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0,
              ),
            ),
        )
        .toBe(true);
      await page.screenshot({ path: "artifacts/advisor-home-mobile.png" });
    }
    await advisor.click();
    await expect(page).toHaveURL(/contact\?topic=consultation/);
    await expect(page.getByLabel("What would you like to discuss?", { exact: true })).toHaveValue(
      "Consultation",
    );
    await expect(page.getByText(/online enquiry form is awaiting service setup/)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
