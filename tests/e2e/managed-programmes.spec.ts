import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import AxeBuilder from "@axe-core/playwright";
import { login } from "./workflow-helpers";

test("programme editing, country availability, five stages and mobile feedback", async ({
  browser,
  baseURL,
}, info) => {
  test.skip(process.env.ISG_WORKFLOW_QA !== "true", "Requires isolated local QA");
  test.setTimeout(150_000);
  expect(new URL(baseURL!).hostname).toMatch(/^(localhost|127\.0\.0\.1)$/);
  expect(new URL(process.env.ISG_QA_URL!).hostname).toMatch(/^(localhost|127\.0\.0\.1)$/);
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const db = createClient(process.env.ISG_QA_URL!, process.env.ISG_QA_KEY!);
  const cleanup = await db.from("study_promotions").delete().eq("title", "QA programme exclusive");
  if (cleanup.error) throw cleanup.error;
  await page.goto("/pathways");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const level = await page.getByRole("combobox", { name: "Study level", exact: true }).boundingBox();
    const field = await page.getByRole("combobox", { name: "Academic field", exact: true }).boundingBox();
    expect(level!.y).toBe(field!.y);
    expect(field!.x).toBeGreaterThan(level!.x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /^Destination interest:/ }).click();
  await expect(page.getByRole("menuitem", { name: "Canada", exact: true }).locator("img")).toBeVisible();
  await page.getByRole("menuitem", { name: "Canada", exact: true }).click();
  await page.getByRole("button", { name: "Explore paths", exact: true }).click();
  await expect(page.locator(".programme-result-count")).toContainText("60 programme options");
  await expect(page.getByText(/These are general study interests/)).toHaveCount(0);
  await page
    .locator("#programme-filters")
    .screenshot({ path: info.outputPath("mobile-programme-filters.png") });
  const a11y = await new AxeBuilder({ page }).include("#programme-filters").analyze();
  expect(a11y.violations).toEqual([]);
  const explore = page.getByRole("button", { name: "Explore paths", exact: true });
  await explore.scrollIntoViewIfNeeded();
  const box = await explore.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await expect(explore).toHaveAttribute("data-isg-pressed", "");
  expect(await explore.evaluate((el) => getComputedStyle(el).filter)).toBe("brightness(0.82)");
  await page.screenshot({ path: info.outputPath("mobile-pressed-button.png") });
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await expect(explore).not.toHaveAttribute("data-isg-pressed", "");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await explore.hover();
  await page.mouse.down();
  await expect(explore).toHaveAttribute("data-isg-pressed", "");
  expect(await explore.evaluate((el) => getComputedStyle(el).scale)).toBe("none");
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await login(page, "admin", "/admin");
  await page.goto("/admin/packages?tab=programmes");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Scholar packages and programmes");
  await page.getByLabel("Programme title", { exact: true }).fill("QA programme exclusive");
  await page.getByRole("button", { name: /^Destinations:/ }).click();
  await page.getByRole("menuitemcheckbox", { name: "Tanzania", exact: true }).click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("textbox", { name: "Programme description", exact: true })
    .fill("Original QA description");
  await page.getByLabel("Available on Study Paths", { exact: true }).check();
  await page
    .locator(".unsaved-changes-bar")
    .getByRole("button", { name: "Save programme", exact: true })
    .click();
  await expect(page.getByRole("status").filter({ hasText: "Programme saved." })).toBeVisible();
  const record = await db
    .from("study_promotions")
    .select("id")
    .eq("title", "QA programme exclusive")
    .single();
  if (record.error) throw record.error;
  const id = record.data.id;
  await page.goto("/");
  await expect(
    page.locator(".hero-destinations").getByRole("link", { name: "Tanzania", exact: true }),
  ).toBeVisible();
  await page.goto(`/admin/packages?tab=programmes&edit=${id}`);
  await page.getByRole("button", { name: /^Destinations:/ }).click();
  await page.getByRole("menuitemcheckbox", { name: "Tanzania", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Kenya", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.locator(".unsaved-changes-bar").getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Destinations:/ })).toContainText("Tanzania");
  await page.getByRole("button", { name: /^Destinations:/ }).click();
  await page.getByRole("menuitemcheckbox", { name: "Tanzania", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Kenya", exact: true }).click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("textbox", { name: "Programme description", exact: true })
    .fill("Updated QA description");
  await page
    .locator(".unsaved-changes-bar")
    .getByRole("button", { name: "Save programme", exact: true })
    .click();
  await expect(page.getByRole("status").filter({ hasText: "Programme saved." })).toBeVisible();
  await page.goto("/pathways?destination=Kenya");
  await expect(page.locator(".study-path-card h3")).toHaveText("QA programme exclusive");
  await expect(page.locator(".study-path-card")).toContainText("Updated QA description");
  await page.goto("/");
  await expect(
    page.locator(".hero-destinations").getByRole("link", { name: "Kenya", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".hero-destinations").getByRole("link", { name: "Tanzania", exact: true }),
  ).toHaveCount(0);
  await page.goto(`/admin/packages?tab=programmes&edit=${id}`);
  await page.getByLabel("Available on Study Paths", { exact: true }).uncheck();
  await page
    .locator(".unsaved-changes-bar")
    .getByRole("button", { name: "Save programme", exact: true })
    .click();
  await expect(page.getByRole("status").filter({ hasText: "Programme saved." })).toBeVisible();
  await page.goto("/");
  await expect(
    page.locator(".hero-destinations").getByRole("link", { name: "Kenya", exact: true }),
  ).toHaveCount(0);
  await page.goto("/admin/packages?tab=programmes&q=QA%20programme%20exclusive");
  await page.getByRole("button", { name: "Delete programme", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator(".programme-admin-list > li")).toHaveCount(0);
  await page.goto("/pathways?destination=Kenya");
  await expect(page.locator(".programme-result-count")).toContainText("0 programme options");
  await expect(page.locator(".study-path-card")).toHaveCount(0);
  // The consultation fixture comes from the local-only setup, never a live applicant.
  const lead = await db.from("leads").select("id").limit(1).single();
  if (lead.error) throw lead.error;
  await page.goto(`/admin/leads/${lead.data.id}`);
  await expect(page.locator("#stage option")).toHaveText([
    "New",
    "Under review",
    "Needs information",
    "Completed",
    "Closed",
  ]);
  await expect(page.locator("main h2").first()).toHaveText("Consultation status");
  expect(errors).toEqual([]);
  await context.close();
});
