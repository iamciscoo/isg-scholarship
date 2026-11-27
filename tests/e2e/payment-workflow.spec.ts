import { test, expect as playwrightExpect, type Page } from "@playwright/test";
import sharp from "sharp";
import { chooseCountry } from "./workflow-helpers";

const qa = process.env.ISG_PAYMENT_QA === "true";
const expect = playwrightExpect.configure({ timeout: 15000 });
const title = "Preview test · Engineering workflow";
const fixture = "Browser workflow sample, no funds transferred";

async function login(page: Page, role: "student" | "admin" | "advisor", landing: string) {
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill(`${role}@isg-qa.example`);
  await page.getByLabel("Password", { exact: true }).fill(process.env.ISG_PAYMENT_QA_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${landing}$`));
}

async function submitConsultation(page: Page) {
  await page.goto("/consultation");
  for (const [field, value] of Object.entries({
    firstName: "Preview",
    lastName: "Student",
    phone: "+255700000000",
  }))
    await page.locator(`#${field}`).fill(value);
  for (const id of ["nationality", "residence"]) await chooseCountry(page, id, "Tanzania");
  const next = page.getByRole("button", { name: "Continue", exact: true });
  await next.click();
  await page.locator("#qualification").selectOption("Diploma");
  await page.locator("#educationStatus").selectOption("Graduated");
  await page.locator("#fieldOfStudy").fill("Engineering");
  await next.click();
  await page.locator("#studyLevel").selectOption("Undergraduate");
  await page.locator("#preferredFields").fill("Engineering");
  await page.locator("#intake").selectOption("Next available intake");
  await page.locator("#funding").selectOption("Open to advice");
  await next.click();
  await expect(page.locator('[name="adultConfirmation"]')).toHaveCount(0);
  await page.locator('[name="processingConsent"]').check();
  await page.getByRole("button", { name: "Submit consultation" }).click();
  await page.getByRole("link", { name: "View payment instructions" }).click();
}

test("applicant, admin and advisor complete both payment workflows", async ({ browser, baseURL }) => {
  test.skip(!qa, "Run against the isolated Supabase QA instance with fixture accounts");
  test.setTimeout(180000);
  expect(new URL(baseURL!).hostname).toMatch(/^(localhost|127\.0\.0\.1)$/);
  const [student, admin, advisor] = await Promise.all(
    [330, 1000, 900].map(async (width) => {
      const context = await browser.newContext({
        baseURL,
        viewport: { width, height: 890 },
        timezoneId: "UTC",
      });
      return context.newPage();
    }),
  );
  await login(admin, "admin", "/admin");
  await admin.goto("/admin/packages");
  for (const [field, value] of Object.entries({
    name: title,
    provider: "Example University",
    destination: "Tanzania",
    studyLevel: "Undergraduate",
    field: "Engineering",
    packageFee: "125000",
  }))
    await admin.locator(`input[name="${field}"]`).fill(value);
  await admin.getByRole("button", { name: "Create package" }).click();
  await expect(admin.getByText("Scholarship package created.")).toBeVisible();
  await login(student, "student", "/dashboard");
  await submitConsultation(student);
  await expect(student.getByRole("button", { name: "Request an advisor meeting" })).toHaveCount(0);
  const bell = student.getByRole("button", { name: /^Notifications/ });
  await expect(bell).toHaveAccessibleName("Notifications (1)");
  await bell.click();
  await expect(student.getByRole("heading", { name: "Upload your receipt" })).toBeVisible();
  await bell.click();
  await admin.goto("/admin/payments");
  await expect(
    admin.getByText("Awaiting upload", { exact: true }).filter({ visible: true }).last(),
  ).toBeVisible();
  const casePath = await admin.getByRole("link", { name: "Open consultation" }).getAttribute("href");
  const image = await sharp(
    Buffer.from(
      '<svg width="420" height="280"><rect width="100%" height="100%" fill="white"/><text x="28" y="80" font-size="28">SAMPLE RECEIPT</text><text x="28" y="135" font-size="18">No money transferred</text></svg>',
    ),
  )
    .png()
    .toBuffer();
  const upload = async () => {
    await student
      .locator('input[type="file"]')
      .setInputFiles({ name: "preview-receipt.png", mimeType: "image/png", buffer: image });
    await student.getByRole("button", { name: "Upload receipt", exact: true }).click();
    await expect(student.getByText(/We’ll review your receipt|ISG is checking the receipt/)).toBeVisible();
  };
  const openReview = async (amount: string) => {
    await admin.goto("/admin/payments");
    await admin
      .locator("article")
      .filter({ hasText: amount })
      .getByRole("link", { name: "Review receipt" })
      .click();
    const preview = admin.getByRole("img", { name: "Uploaded payment receipt" });
    await expect(preview).toBeVisible();
    await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    const source = await preview.getAttribute("src");
    const response = await admin.request.get(source!);
    expect(response.headers()["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers()["content-disposition"]).toMatch(/^inline/);
  };
  await upload();
  await openReview("50,000");
  await admin.getByLabel("Feedback to the applicant (optional)").fill("OK");
  await admin.getByRole("button", { name: "Request a new receipt" }).click();
  const requestDialog = admin.getByRole("dialog", { name: "Request a new receipt?" });
  await expect(requestDialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await requestDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(requestDialog).toBeHidden();
  await admin.getByRole("button", { name: "Request a new receipt" }).click();
  await requestDialog.getByRole("button", { name: "Request a new receipt" }).click();
  await expect(admin.getByRole("heading", { name: /· rejected/i })).toBeVisible();
  await student.bringToFront();
  await bell.click();
  await expect(student.getByRole("heading", { name: "Upload a replacement receipt" })).toBeVisible({
    timeout: 10000,
  });
  await student.getByRole("link", { name: "Open payment" }).click();
  await expect(student.getByText("New receipt needed", { exact: true })).toBeVisible();
  await upload();
  await openReview("50,000");
  await admin.getByRole("button", { name: "Verify payment received" }).click();
  await expect(admin.getByRole("heading", { name: /· approved/i })).toBeVisible();
  await student.reload();
  await expect(student.getByText(/ISG will assign an advisor/)).toBeVisible();
  await admin.goto(casePath!);
  await admin.locator('select[name="advisor"]').selectOption({ index: 1 });
  await admin.getByRole("button", { name: "Assign advisor" }).click();
  await expect(admin.getByRole("heading", { name: "Assigned advisor" })).toBeVisible();
  await student.reload();
  await student.getByLabel("Availability and topics").fill("Tomorrow afternoon, UTC");
  await student.getByRole("button", { name: "Request an advisor meeting" }).click();
  await expect(student.getByText("Tomorrow afternoon, UTC", { exact: true })).toBeVisible();
  await student.getByLabel("Your question", { exact: true }).fill("Can we review the engineering package?");
  await student.getByRole("button", { name: "Send question" }).click();
  await expect(student.getByText("Can we review the engineering package?", { exact: true })).toBeVisible();
  await student.goto("/dashboard/applications");
  await student
    .locator("article")
    .filter({ hasText: title })
    .getByRole("button", { name: "I’m interested" })
    .click();
  await expect(student.getByText("Interested", { exact: true })).toBeVisible();
  const applicationPath = new URL(student.url()).pathname;
  await login(advisor, "advisor", "/advisor");
  await advisor.goto(casePath!.replace("/admin/", "/advisor/"));
  await expect(advisor.getByText("Can we review the engineering package?", { exact: true })).toBeVisible();
  await advisor
    .locator('input[type="datetime-local"]')
    .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  await advisor.getByLabel("Google Meet link").fill("https://meet.google.com/abc-defg-hij");
  await advisor.getByLabel("Related request").selectOption({ index: 1 });
  await advisor.getByRole("button", { name: "Schedule Google Meet" }).click();
  await expect(advisor.getByRole("link", { name: "Join Google Meet" })).toBeVisible();
  await advisor.locator('select[name="opportunity"]').selectOption({ index: 1 });
  await advisor.getByRole("button", { name: "Recommend package" }).click();
  await expect(advisor.getByText("Package recommended.", { exact: false })).toBeVisible();
  await student.reload();
  const decision = student.getByRole("combobox", { name: "Decision", exact: true });
  await expect(decision).toBeVisible();
  await decision.selectOption("true");
  await student.getByRole("button", { name: "Save my decision" }).click();
  await expect(student.getByText(/Preview test only/)).toBeVisible();
  await expect(student.getByText(/125,000/).first()).toBeVisible();
  await admin.goto("/admin/payments");
  await expect(
    admin.locator("article").filter({ hasText: title }).getByText("Awaiting upload", { exact: true }),
  ).toBeVisible();
  await upload();
  const advisorPath = applicationPath.replace("/dashboard/", "/advisor/");
  await advisor.goto(advisorPath);
  await expect(advisor.getByRole("heading", { name: "Record a workflow update" })).toHaveCount(0);
  await openReview("125,000");
  await admin.getByRole("button", { name: "Request a new receipt" }).click();
  await requestDialog.getByRole("button", { name: "Request a new receipt" }).click();
  await expect(admin.getByRole("heading", { name: /· rejected/i })).toBeVisible();
  await student.reload();
  await upload();
  await openReview("125,000");
  await admin.getByRole("button", { name: "Verify payment received" }).click();
  await expect(admin.getByRole("heading", { name: /· approved/i })).toBeVisible();
  await advisor.reload();
  await advisor.getByLabel("ISG workflow").selectOption("Applying");
  await advisor.getByLabel("History note visible to applicant").fill(fixture);
  await advisor.getByRole("button", { name: "Save dated update" }).click();
  await student.reload();
  await expect(student.getByText(fixture, { exact: true })).toBeVisible();
  await expect(student.getByText("The full package fee has been verified.")).toBeVisible();
  await admin.goto("/admin/payments");
  await expect(admin.getByText("2 payments", { exact: false })).toBeVisible();
  await admin.screenshot({ path: test.info().outputPath("verified-test-payments.png") });
});
