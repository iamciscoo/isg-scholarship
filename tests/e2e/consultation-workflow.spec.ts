import { test, expect as playwrightExpect, type Page } from "@playwright/test";
import PDFDocument from "pdfkit";
import sharp from "sharp";

const expect = playwrightExpect.configure({ timeout: 15_000 });

async function login(page: Page, account: string, landing: string) {
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill(`isg-qa-${account}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(process.env.ISG_WORKFLOW_QA_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${landing}$`));
}

async function submitConsultation(page: Page) {
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/notifications")),
    page.goto("/consultation"),
  ]);
  for (const [name, value] of Object.entries({
    firstName: "QA",
    lastName: "Scholar",
    phone: "+255700000000",
    nationality: "Tanzanian",
    residence: "Tanzania",
  }))
    await page.locator(`#${name}`).fill(value);
  const first = await page.locator("#firstName").boundingBox();
  const last = await page.locator("#lastName").boundingBox();
  expect(first?.y).toBe(last?.y);
  const next = page.getByRole("button", { name: "Continue", exact: true });
  await next.click();
  await page.locator("#qualification").selectOption("Diploma");
  await page.locator("#educationStatus").selectOption("Graduated");
  await page.locator("#fieldOfStudy").fill("Engineering");
  await next.click();
  await page.locator("#studyLevel").selectOption("Undergraduate");
  await page.locator("#preferredFields").fill("Engineering");
  await page.locator("#destinations").fill("Canada");
  await page.locator("#intake").selectOption("Next available intake");
  await page.locator("#funding").selectOption("Open to advice");
  await expect(page.getByText("Questions for your advisor", { exact: true })).toHaveCount(0);
  await next.click();
  await page.locator('[name="adultConfirmation"]').check();
  await page.locator('[name="processingConsent"]').check();
  await page.getByRole("button", { name: "Submit consultation" }).click();
  await expect(page).toHaveURL(/\/dashboard\/consultations#consultation-payment$/);
  await page.goto("/consultation");
  await expect(page).toHaveURL(/\/dashboard\/consultations$/);
}

async function samplePdf() {
  const doc = new PDFDocument({ size: "A6" });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.text("Isolated browser QA only. No funds were transferred.").end();
  return result;
}

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

  await student
    .getByLabel("Private payment receipt")
    .setInputFiles({ name: "receipt.pdf", mimeType: "application/pdf", buffer: pdf });
  await student.getByRole("button", { name: "Upload receipt" }).click();
  await expect(student.getByText("We’ll review your receipt and update this page.")).toBeVisible({
    timeout: 20_000,
  });
  await student.getByLabel("Supporting files (optional)").setInputFiles([
    { name: "support-photo.png", mimeType: "image/png", buffer: png },
    { name: "support-letter.pdf", mimeType: "application/pdf", buffer: pdf },
  ]);
  await student.getByRole("button", { name: "Upload files", exact: true }).click();
  await expect(student.getByRole("link", { name: "support-letter.pdf" })).toBeVisible({ timeout: 20_000 });
  await expect(student.getByRole("link", { name: "support-photo.png" })).toBeVisible();
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
  await expect(admin.getByRole("link", { name: "Contact on WhatsApp" })).toBeVisible();
  await admin.locator('select[name="opportunity"]').selectOption({ index: 1 });
  await admin.getByRole("button", { name: "Assign package" }).click();
  await expect(admin.getByRole("link", { name: "Local workflow QA", exact: true })).toBeVisible();
  await student.goto("/dashboard/applications");
  await student.getByRole("link", { name: "View application" }).click();
  await expect(student.getByRole("button", { name: "Save my decision" })).toHaveCount(0);
  await student
    .getByLabel("Private payment receipt")
    .setInputFiles({ name: "package-receipt.pdf", mimeType: "application/pdf", buffer: pdf });
  await student.getByRole("button", { name: "Upload receipt" }).click();
  await expect(
    student.getByText("ISG is checking your receipt. Your application form opens after verification."),
  ).toBeVisible({ timeout: 20000 });
  await openReceipt();
  await admin.getByRole("button", { name: "Verify payment received" }).click();
  await student.reload();
  await student.getByRole("link", { name: "Fill application form" }).click();
  await expect(student.getByRole("heading", { name: "Application details" })).toBeVisible();

  const awards = student
    .locator("article")
    .filter({ has: student.getByRole("heading", { name: "Achievement certificates", exact: true }) });
  await awards.locator('input[type="file"]').setInputFiles([
    { name: "award-one.pdf", mimeType: "application/pdf", buffer: pdf },
    { name: "award-two.png", mimeType: "image/png", buffer: png },
  ]);
  await awards.getByRole("button", { name: "Upload files", exact: true }).click();
  await expect(awards.getByRole("link", { name: "award-one.pdf" })).toBeVisible({ timeout: 20_000 });
  await expect(awards.getByRole("link", { name: "award-two.png" })).toBeVisible();
  for (const [name, value] of Object.entries({
    cityStreet: "QA Street",
    institutionName: "QA College",
    institutionCountry: "Tanzania",
    graduationYear: "2025",
    guardianFirstName: "QA",
    guardianLastName: "Contact",
    guardianPhone: "+255700000001",
    guardianRelation: "Parent",
  }))
    await student.locator(`[name="${name}"]`).fill(value);
  await student.locator('[name="guardianPermission"]').check();
  await student.locator('[name="declaration"]').check();
  await student.getByRole("button", { name: "Submit application" }).click();
  await expect(student.getByRole("link", { name: "Download submitted application" })).toBeVisible();

  await admin.goto("/admin/applications");
  await admin.getByRole("link", { name: "View application" }).click();
  await admin.getByRole("link", { name: "Review application", exact: true }).click();
  await expect(admin.getByText("QA College", { exact: true })).toBeVisible();
  await expect(admin.getByRole("link", { name: "award-two.png" })).toBeVisible();
  const applicationUrl = admin.url();
  const documentPath = await admin.getByRole("link", { name: "award-one.pdf" }).getAttribute("href");
  const file = await admin.request.get(documentPath!);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toBe("application/pdf");
  expect(file.headers()["content-disposition"]).toMatch(/^attachment/);
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

  await login(other, "other", "/dashboard");
  expect((await other.request.get(documentPath!)).status()).toBe(404);
  await other.goto(applicationUrl);
  await expect(other).toHaveURL(/\/dashboard$/);
  await student.screenshot({ path: info.outputPath("student-application.png") });
  await admin.screenshot({ path: info.outputPath("admin-application.png") });
});
