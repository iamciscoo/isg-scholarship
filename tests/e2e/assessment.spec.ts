import { expect, test } from "@playwright/test";
test("assessment validates each step, preserves progress and stays honest without configuration", async ({
  page,
}) => {
  await page.goto("/eligibility");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("#firstName-error")).not.toBeEmpty();
  for (const [label, value] of [
    ["First name", "Test"],
    ["Last name", "Applicant"],
    ["Email address", "test@example.invalid"],
    ["Phone / WhatsApp number", "+255700000000"],
    ["Nationality", "Tanzanian"],
    ["Country of residence", "Tanzania"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Your academics", exact: true })).toBeVisible();
  await page.getByLabel("Highest completed qualification").selectOption("Bachelor's degree");
  await page.getByLabel("Current education status").selectOption("Graduated");
  await page.getByLabel("Current / most recent field of study").fill("Engineering");
  await page.getByLabel("Academic performance range").selectOption("Upper second / B range");
  await page.getByLabel("Graduation year (actual or expected)").fill("2025");
  await page.getByLabel("English-language proficiency").selectOption("Studied in English");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Desired study level").selectOption("Master's");
  await page.getByLabel("Preferred academic fields").fill("Renewable energy");
  await page.getByLabel("Intended intake").selectOption("2027");
  await page.getByLabel("Funding preference").selectOption("Full funding needed");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Test Applicant", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit assessment" })).toBeDisabled();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Preferred academic fields")).toHaveValue("Renewable energy");
  await expect(page.getByText(/Assessment submission opens after/)).toBeVisible();
});
