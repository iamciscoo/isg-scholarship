import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { login } from "./workflow-helpers";
import { dictionaries } from "../../src/lib/i18n/messages";
import { languages, locales } from "../../src/lib/i18n/config";

test("dashboard languages, mobile lists and cancel/save validation", async ({ browser, baseURL }, info) => {
  test.skip(process.env.ISG_WORKFLOW_QA !== "true", "Requires local QA fixtures");
  test.setTimeout(180_000);
  expect(new URL(baseURL!).hostname).toMatch(/^(localhost|127\.0\.0\.1)$/);
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
  const admin = await context.newPage();
  const errors: string[] = [];
  admin.on("pageerror", (error) => errors.push(error.message));
  await login(admin, "admin", "/admin");
  await admin.goto("/admin/consultations");
  for (const width of [320, 390, 768, 1440]) {
    await admin.setViewportSize({ width, height: 844 });
    const summaries = admin.locator(".consultation-summary .stat-box");
    await expect(summaries).toHaveCount(3);
    await expect
      .poll(() =>
        summaries.evaluateAll(
          (items) => new Set(items.map((item) => Math.round(item.getBoundingClientRect().y))).size,
        ),
      )
      .toBe(1);
    expect(await admin.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width < 600) {
      await expect(admin.locator(".mobile-case-list")).toBeVisible();
      await expect(admin.locator(".desktop-case-table")).toBeHidden();
      expect((await admin.locator(".case-filters").boundingBox())!.height).toBeLessThan(340);
      await admin.screenshot({ path: info.outputPath(`consultations-${width}.png`), fullPage: true });
    }
  }
  await admin.setViewportSize({ width: 390, height: 844 });
  await admin.getByText("More filters", { exact: true }).click();
  await expect(admin.locator("#filter-advisor")).toBeVisible();
  await admin.getByText("More filters", { exact: true }).click();
  for (const locale of locales) {
    await admin.locator(".language-trigger").click();
    await admin.getByRole("menuitemradio", { name: languages[locale].name, exact: true }).click();
    await expect(admin.locator("html")).toHaveAttribute("lang", locale);
    await expect(admin.getByRole("heading", { level: 1 })).toHaveText(
      dictionaries[locale].workspace["Consultations"],
    );
    await admin.goto("/admin/users");
    await expect(admin.getByRole("heading", { level: 1 })).toHaveText(
      dictionaries[locale].workspace["Users"],
    );
    await expect(admin.locator(".user-directory-cards")).toBeVisible();
    expect(await admin.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await admin.goto("/admin/consultations");
  }
  await admin.locator(".language-trigger").click();
  await admin.getByRole("menuitemradio", { name: "English", exact: true }).click();
  const db = createClient(process.env.ISG_QA_URL!, process.env.ISG_QA_KEY!);
  const { data: lead, error } = await db.from("leads").select("id").order("created_at").limit(1).single();
  if (error) throw error;
  await admin.goto(`/admin/leads/${lead.id}`);
  await expect(admin.locator("main h2").first()).toHaveText("Consultation status");
  const original = await admin.locator("#stage").inputValue();
  const next = original === "under_review" ? "qualified" : "under_review";
  await admin.locator("#stage").selectOption(next);
  const banner = admin.locator(".unsaved-changes-bar");
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(admin.locator("#stage")).toHaveValue(original);
  await expect(banner).toBeHidden();
  await admin.locator("#stage").selectOption(next);
  await admin.locator('input[name="id"]').evaluate((el) => {
    (el as HTMLInputElement).value = "00000000-0000-4000-8000-000000000000";
  });
  await banner.getByRole("button", { name: "Save status", exact: true }).click();
  await expect(admin.locator(".notice-error[role=alert]")).toContainText("permission");
  await expect(admin.locator("#stage")).toHaveValue(next);
  await expect(banner).toBeVisible();
  await admin.locator('input[name="id"]').evaluate((el, id) => {
    (el as HTMLInputElement).value = id;
  }, lead.id);
  await banner.getByRole("button", { name: "Save status", exact: true }).click();
  await expect(admin.getByRole("status").filter({ hasText: "Consultation status saved." })).toBeVisible();
  await expect(banner).toBeHidden();
  await admin.reload();
  await expect(admin.locator("#stage")).toHaveValue(next);
  await admin.goto("/dashboard/profile");
  const first = admin.locator("#first_name");
  const savedName = await first.inputValue();
  await first.fill("");
  await banner.getByRole("button", { name: "Save profile", exact: true }).click();
  expect(await first.evaluate((el) => (el as HTMLInputElement).validity.valid)).toBe(false);
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(first).toHaveValue(savedName);
  await expect(banner).toBeHidden();
  await first.fill("Unsaved QA");
  await admin.screenshot({ path: info.outputPath("mobile-save-banner.png"), fullPage: false });
  await banner.getByRole("button", { name: "Cancel", exact: true }).click();
  await admin.goto("/admin/users?q=QA%20Scholar");
  await expect(admin.locator(".user-directory-cards > li")).toHaveCount(1);
  await admin.screenshot({ path: info.outputPath("mobile-users.png"), fullPage: true });
  const studentContext = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
  const student = await studentContext.newPage();
  student.on("pageerror", (error) => errors.push(error.message));
  await login(student, "student", "/dashboard");
  for (const locale of locales) {
    await student.locator(".language-trigger").click();
    await student.getByRole("menuitemradio", { name: languages[locale].name, exact: true }).click();
    await expect(student.locator("html")).toHaveAttribute("lang", locale);
    await student.goto("/dashboard");
    await expect(
      student.getByText(dictionaries[locale].workspace["Current stage"], { exact: true }),
    ).toBeVisible();
    await student.goto("/dashboard/application");
    await expect(student.getByRole("heading", { level: 1 })).toHaveText(
      dictionaries[locale].workspace["Scholarship application"],
    );
    await student.goto("/dashboard/profile");
    await expect(student.getByRole("heading", { level: 1 })).toHaveText(
      dictionaries[locale].workspace["Your personal details."],
    );
    await expect(student.locator("#first_name")).toHaveValue("QA");
    expect(await student.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    if (locale === "ar")
      await student.screenshot({ path: info.outputPath("arabic-user-profile.png"), fullPage: true });
  }
  await studentContext.close();
  expect(errors).toEqual([]);
  await context.close();
});
