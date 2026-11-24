import { test, expect as playwrightExpect } from "@playwright/test";
import sharp from "sharp";
import { chooseCountry, login, submitConsultation, samplePdf, submittedConsultation } from "./workflow-helpers";
import { seedPagination } from "./pagination-fixtures";

const expect = playwrightExpect.configure({ timeout: 15_000 });

test("consultation, receipt correction, admin package assignment, application and review", async ({
  browser,
  baseURL,
}, info) => {
  test.skip(process.env.ISG_WORKFLOW_QA !== "true", "Requires fresh local Supabase fixtures");
  test.setTimeout(180_000);
  expect(new URL(baseURL!).hostname).toMatch(/^(localhost|127\.0\.0\.1)$/);
  const [student, admin, other] = await Promise.all(
    [390, 1100, 900].map(async (width) => {
      const context = await browser.newContext({ baseURL, viewport: { width, height: 850 } });
      return context.newPage();
    }),
  );
  const [pdf, png] = await Promise.all([
    samplePdf(),
    sharp({ create: { width: 320, height: 200, channels: 3, background: "white" } })
      .png()
      .toBuffer(),
  ]);
  await Promise.all([login(student, "student", "/dashboard"), login(admin, "admin", "/admin")]);
  await admin.goto("/admin/packages");
  for (const [name, value] of Object.entries({
    name: "Local workflow QA",
    provider: "QA University",
    destination: "Canada",
    studyLevel: "Undergraduate",
    field: "Engineering",
    packageFee: "100000",
  }))
    await admin.locator(`[name="${name}"]`).fill(value);
  await admin.getByRole("button", { name: "Create package", exact: true }).click();
  await expect(admin.getByText("Scholarship package created.")).toBeVisible();
  await student.goto("/dashboard/application");
  await expect(
    student.getByText("Your application form opens after ISG verifies your package payment."),
  ).toBeVisible();
  await submitConsultation(student);

  await admin.goto("/admin/consultations");
  const row = admin.getByRole("row").filter({ hasText: "QA Scholar" });
  await expect(row.getByRole("cell").first()).toHaveText("1");
  await row.getByRole("cell", { name: "Payment needed", exact: true }).click();
  await expect(admin.getByRole("heading", { name: "QA Scholar", exact: true })).toBeVisible();
  await admin
    .getByLabel("Private payment receipt")
    .setInputFiles({ name: "receipt.pdf", mimeType: "application/pdf", buffer: pdf });
  await admin.getByRole("button", { name: "Upload receipt" }).click();
  await expect(admin.getByRole("link", { name: "Review receipt", exact: true })).toBeVisible();
  await student.reload();
  await expect(student.getByText("We’ll review your receipt and update this page.")).toBeVisible();
  await expect(student.getByRole("heading", { name: "Consultation supporting files" })).toHaveCount(0);
  expect(await student.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  async function openReceipt() {
    await admin.goto("/admin/payments");
    await admin.getByRole("link", { name: /^Review receipt/ }).click();
    await expect(admin.getByRole("heading", { name: /pending verification/i })).toBeVisible();
  }
  await openReceipt();
  const caseLink = await admin.getByRole("link", { name: /Open consultation/ }).getAttribute("href");
  await admin.getByLabel("Feedback to the applicant (optional)").fill("Please send a clearer receipt.");
  await admin.getByRole("button", { name: "Request a new receipt" }).click();
  await expect(admin.getByRole("heading", { name: /· rejected/i })).toBeVisible();
  await student.reload();
  await expect(student.getByText("Please send a clearer receipt.")).toBeVisible();
  await student
    .getByLabel("Private payment receipt")
    .setInputFiles({ name: "receipt-new.png", mimeType: "image/png", buffer: png });
  await student.getByRole("button", { name: "Upload receipt" }).click();
  await expect(student.getByText("We’ll review your receipt and update this page.")).toBeVisible();
  await openReceipt();
  await admin.getByRole("button", { name: "Verify payment received" }).click();
  await expect(admin.getByRole("heading", { name: /· approved/i })).toBeVisible();

  await student.reload();
  await expect(student.getByRole("button", { name: /Request.*call|Request.*meeting/ })).toHaveCount(0);
  await student.goto("/dashboard/application");
  await expect(
    student.getByText("Your application form opens after ISG verifies your package payment."),
  ).toBeVisible();
  await admin.goto(caseLink!);
  await admin.setViewportSize({ width: 874, height: 850 });
  const actions = await admin.locator(".case-actions").evaluate((element) => ({
    display: getComputedStyle(element).display,
    gap: parseFloat(getComputedStyle(element).gap),
    heights: Array.from(element.querySelectorAll("a")).map((link) => link.getBoundingClientRect().height),
  }));
  expect(actions.display).toBe("flex");
  expect(actions.gap).toBeGreaterThanOrEqual(12);
  await expect
    .poll(() =>
      admin
        .locator(".case-actions > a")
        .evaluateAll((links) => links.every((link) => link.getBoundingClientRect().height >= 44)),
    )
    .toBe(true);
  await admin.screenshot({ path: info.outputPath("consultation-actions.png") });
  await admin.getByRole("link", { name: "Consultation details", exact: true }).click();
  await expect(admin.getByLabel("Follow-up date (optional)")).toHaveCount(0);
  await admin.goto(caseLink!);
  await admin.setViewportSize({ width: 1100, height: 850 });
  await expect(admin.getByRole("link", { name: "Contact on WhatsApp" })).toBeVisible();
  await admin.locator('select[name="opportunity"]').selectOption({ index: 1 });
  await admin.getByRole("button", { name: "Assign package" }).click();
  await expect(admin.getByRole("link", { name: "Local workflow QA", exact: true })).toBeVisible();
  await student.goto("/dashboard/applications");
  const packageHref = await student.getByRole("link", { name: "View application" }).getAttribute("href");
  await student.getByRole("link", { name: "View application" }).click();
  await expect(student).toHaveURL(/\/dashboard\/applications\/[0-9a-f-]+$/);
  await expect(student.getByRole("button", { name: "Save my decision" })).toHaveCount(0);
  const packagePath = packageHref!.replace("/dashboard/", "/admin/");
  await admin.goto(packagePath);
  await admin
    .getByLabel("Private payment receipt")
    .setInputFiles({ name: "package-receipt.pdf", mimeType: "application/pdf", buffer: pdf });
  await admin.getByRole("button", { name: "Upload receipt" }).click();
  await expect(
    admin.getByText("ISG is checking your receipt. Your application form opens after verification."),
  ).toBeVisible();
  await student.reload();
  await expect(
    student.getByText("ISG is checking your receipt. Your application form opens after verification."),
  ).toBeVisible();
  await openReceipt();
  await admin.getByRole("button", { name: "Verify payment received" }).click();
  await expect(admin.getByRole("heading", { name: /· approved/i })).toBeVisible();
  await student.reload();
  await student.getByRole("link", { name: "Fill application form" }).click();
  await expect(student.getByRole("heading", { name: "Application details" })).toBeVisible();
  await expect(student.locator("#application-residence")).toHaveValue("Tanzania");
  await student.getByRole("button", { name: "Submit application", exact: true }).click();
  await expect(student.locator("#application-institutionName-error")).toHaveText("This field is required.");
  await expect(student.locator("#application-guardianDob-error")).toHaveText("This field is required.");

  const detailsTab = student.getByRole("tab", { name: "Details", exact: true });
  const documentsTab = student.getByRole("tab", { name: "Documents", exact: true });
  await student.locator('[name="cityStreet"]').fill("QA Street");
  await documentsTab.click();
  const awards = student
    .locator("article")
    .filter({ has: student.getByRole("heading", { name: "Achievement certificates", exact: true }) });
  await expect(awards.getByRole("button", { name: "Upload files", exact: true })).toBeDisabled();
  const xref = pdf.lastIndexOf("startxref");
  const largePdf = Buffer.concat([
    pdf.subarray(0, xref),
    Buffer.from("%"),
    Buffer.alloc(5 * 1024 * 1024 - pdf.length - 2, 0x20),
    Buffer.from("\n"),
    pdf.subarray(xref),
  ]);
  await awards.locator('input[type="file"]').setInputFiles([
    { name: "award-one.pdf", mimeType: "application/pdf", buffer: largePdf },
    { name: "award-two.png", mimeType: "image/png", buffer: png },
  ]);
  await awards.getByRole("checkbox", { name: "Compress PDF when possible" }).check();
  await detailsTab.click();
  await expect(student.locator('[name="cityStreet"]')).toHaveValue("QA Street");
  await documentsTab.click();
  const directUpload = student.waitForResponse((response) =>
    response.request().method() === "PUT" && response.url().includes("/object/upload/sign/case-pdf-staging/"),
  );
  await awards.getByRole("button", { name: "Upload files", exact: true }).click();
  expect((await directUpload).ok()).toBe(true);
  await expect(awards.getByRole("link", { name: "award-one.pdf", exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await expect(awards.getByRole("link", { name: "award-two.png", exact: true })).toBeVisible();
  await detailsTab.click();
  await chooseCountry(student, "application-institutionCountry", "Tanzania");
  for (const [name, value] of Object.entries({
    institutionName: "QA College",
    graduationYear: "2025",
    guardianFirstName: "QA",
    guardianLastName: "Contact",
    guardianDob: "1975-05-04",
    guardianPhone: "+255700000001",
    guardianRelation: "Parent",
  }))
    await student.locator(`[name="${name}"]`).fill(value);
  await student.locator('[name="guardianPermission"]').check();
  await student.locator('[name="declaration"]').check();
  await student.getByRole("button", { name: "Submit application" }).click();
  await expect(student.getByRole("link", { name: "Download submitted application" })).toBeVisible();

  await admin.goto("/admin/applications");
  const applicationRow = admin.getByRole("row").filter({ hasText: "QA Scholar" });
  await expect(applicationRow.getByRole("cell").first()).toHaveText("1");
  await applicationRow.getByRole("cell", { name: "Local workflow QA", exact: true }).click();
  await admin.getByRole("link", { name: "Review application", exact: true }).click();
  await expect(admin.getByText("QA College", { exact: true })).toBeVisible();
  await expect(admin.getByRole("link", { name: "award-two.png", exact: true })).toBeVisible();
  const applicationUrl = admin.url();
  const documentPath = await admin
    .getByRole("link", { name: "award-one.pdf", exact: true })
    .getAttribute("href");
  const file = await admin.request.get(documentPath!);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toBe("application/pdf");
  expect(file.headers()["content-disposition"]).toMatch(/^attachment/);
  expect(file.headers()["content-disposition"]).toContain("award-one.pdf");
  const preview = await admin.request.get(documentPath! + "?preview=1");
  expect(preview.status()).toBe(200);
  expect(preview.headers()["content-disposition"]).toMatch(/^inline/);
  expect(preview.headers()["cache-control"]).toBe("private, no-store");
  const pdfView = await admin.context().newPage();
  await pdfView.goto(new URL(documentPath! + '?preview=1', baseURL).href);
  await pdfView.screenshot({ path: info.outputPath('document-preview.png') });
  await pdfView.close();
  const reviewNote = "Please confirm your preferred programme.";
  await admin.getByLabel("Application status").selectOption("needs_information");
  await admin.getByLabel("Note for the applicant (optional)").fill(reviewNote);
  await admin.getByRole("button", { name: "Save status" }).click();
  await expect(admin.getByText(reviewNote, { exact: true })).toBeVisible();
  await student.goto("/dashboard");
  await expect(student.getByText("Information requested", { exact: true }).first()).toBeVisible();
  await student.goto("/dashboard/application");
  await expect(student.getByText(reviewNote, { exact: true })).toBeVisible();
  await student.getByLabel("Note for ISG (optional)").fill("Engineering is my first choice.");
  await student.getByRole("button", { name: "Send for review" }).click();
  await expect(student.getByText("Engineering is my first choice.", { exact: true })).toBeVisible();

  await admin.getByRole("link", { name: "Edit application", exact: true }).click();
  const staffForm = admin.locator("form").filter({ has: admin.locator('[name="institutionName"]') });
  await staffForm.locator('[name="institutionName"]').fill("Staff entered college");
  await staffForm.locator('[name="declaration"]').check();
  await admin.getByRole("button", { name: "Save application for applicant" }).click();
  await expect(admin.getByText("Application recorded. You can add files below.")).toBeVisible();
  const extra = admin
    .locator("article")
    .filter({ has: admin.getByRole("heading", { name: "Other supporting documents", exact: true }) });
  await extra.locator('input[type="file"]').setInputFiles([
    { name: "staff-document.pdf", mimeType: "application/pdf", buffer: pdf },
    { name: "staff-image.png", mimeType: "image/png", buffer: png },
  ]);
  await extra.getByRole("button", { name: "Upload files", exact: true }).click();
  await expect(extra.getByRole("link", { name: "staff-document.pdf", exact: true })).toBeVisible();
  await expect(extra.getByRole("link", { name: "staff-image.png", exact: true })).toBeVisible();
  const fieldPosition = await staffForm.locator('[name="firstName"]').boundingBox();
  const filePosition = await extra.locator('input[type="file"]').boundingBox();
  expect(fieldPosition!.y).toBeLessThan(filePosition!.y);
  await admin.getByRole("link", { name: "Review recorded application" }).click();
  await expect(admin.getByText("Recorded by ISG staff", { exact: true })).toBeVisible();
  await expect(admin.getByText("Staff entered college", { exact: true })).toBeVisible();
  await student.goto("/dashboard");
  await student.goto("/dashboard/application#application-documents");
  await expect(student.getByRole("link", { name: "staff-document.pdf", exact: true })).toBeVisible();
  await detailsTab.click();
  await expect(student.locator('[name="institutionName"]')).toHaveValue("Staff entered college");

  await student.goto("/dashboard");
  const bell = student.getByRole("button", { name: /^Notifications/ });
  await expect(bell).toHaveAccessibleName(/Notifications \(\d+\)/);
  let notificationGets = 0;
  student.on("request", (request) => {
    if (request.url().endsWith("/api/notifications") && request.method() === "GET") notificationGets++;
  });
  for (let i = 0; i < 2; i++) {
    await bell.click();
    await expect(student.locator(".notification-popover")).toBeVisible();
    await student.keyboard.press("Escape");
  }
  expect(notificationGets).toBeLessThanOrEqual(1);
  await bell.click();
  const popover = student.locator(".notification-popover");
  await expect(popover.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
  let releasePatch!: () => void;
  const delayedPatch = new Promise<void>((resolve) => {
    releasePatch = resolve;
  });
  await student.route("**/api/notifications", async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    const response = await route.fetch();
    await delayedPatch;
    await route.fulfill({ response });
  });
  await popover.getByRole("button", { name: "Mark all as read" }).click();
  await expect(popover.getByRole("button", { name: "Mark all as read" })).toHaveCount(0);
  releasePatch();
  await student.unrouteAll({ behavior: "wait" });
  await popover.getByRole("link").first().click();
  await expect(popover).toHaveCount(0);

  await login(other, "other", "/dashboard");
  expect((await other.request.get(documentPath!)).status()).toBe(404);
  await other.goto(applicationUrl);
  await expect(other).toHaveURL(/\/dashboard$/);
  await student.goto("/dashboard");
  await student.screenshot({ path: info.outputPath("student-application.png") });
  await admin.screenshot({ path: info.outputPath("admin-application.png") });
  await seedPagination(submittedConsultation!);
  await admin.goto("/admin/consultations?page=2");
  const secondPageConsultation = admin.locator("tbody tr").first();
  await expect(secondPageConsultation.getByRole("cell").first()).toHaveText("21");
  await secondPageConsultation.getByRole("cell").nth(2).click();
  await expect(admin).toHaveURL(/\/admin\/cases\/[0-9a-f-]+$/);
  await admin.goto("/admin/applications?page=2");
  const secondPageApplication = admin.locator("tbody tr").first();
  await expect(secondPageApplication.getByRole("cell").first()).toHaveText("21");
  await admin.screenshot({ path: info.outputPath("numbered-applications.png") });
  await secondPageApplication.getByRole("cell").nth(2).click();
  await expect(admin).toHaveURL(/\/admin\/applications\/[0-9a-f-]+$/);
});
