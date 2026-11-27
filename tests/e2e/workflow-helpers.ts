import { expect as playwrightExpect, type Page } from "@playwright/test";
import PDFDocument from "pdfkit";
const expect = playwrightExpect.configure({ timeout: 15_000 });
export let submittedConsultation: Record<string, unknown> | undefined;
export async function chooseCountry(page: Page, id: string, country: string) {
  await page.locator(`#${id}`).fill(country);
  await page.getByRole("option", { name: new RegExp(`^${country}(?: |$)`) }).click();
}
export async function login(page: Page, account: string, landing: string) {
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill(`isg-qa-${account}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(process.env.ISG_WORKFLOW_QA_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${landing}$`));
}

export async function submitConsultation(page: Page) {
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/notifications")),
    page.goto("/consultation"),
  ]);
  // The form hydrates separately from the shared notification bell. Wait for its
  // account prefill before editing uncontrolled React Hook Form fields.
  await expect(page.locator("#email")).toHaveValue("isg-qa-student@example.com");
  for (const [name, value] of Object.entries({
    firstName: "QA",
    lastName: "Scholar",
    phone: "+255700000000",
  }))
    await page.locator(`#${name}`).fill(value);
  await chooseCountry(page, "nationality", "Tanzania");
  await chooseCountry(page, "residence", "Tanzania");
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
  await expect(page.locator('[name="adultConfirmation"]')).toHaveCount(0);
  await page.locator('[name="processingConsent"]').check();
  const request = page.waitForRequest(
    (request) => request.url().endsWith("/api/assessments") && request.method() === "POST",
  );
  await page.getByRole("button", { name: "Submit consultation" }).click();
  submittedConsultation = (await request).postDataJSON().data;
  await expect(page).toHaveURL(/\/dashboard\/consultations#consultation-payment$/);
  await page.goto("/consultation");
  await expect(page).toHaveURL(/\/dashboard\/consultations$/);
}

export async function samplePdf() {
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
