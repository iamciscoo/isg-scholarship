import { it, expect } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { applicationPdf } from "@/server/services/application-pdf";
import { fullApplicationSchema } from "@/lib/validation/application-form";
it("renders a private application snapshot including the electronic declaration", async () => {
  const data = fullApplicationSchema.parse({
    firstName: "Amina",
    lastName: "Mbuyu",
    email: "student@example.invalid",
    phone: "+255700000000",
    studyInterest: "Engineering",
    programme: "Environmental Engineering",
    residence: "Tanzania",
    cityStreet: "Test-only address",
    highestEducation: "Bachelor's degree",
    institutionName: "Test institution",
    institutionCountry: "Tanzania",
    graduationYear: "2026",
    guardianFirstName: "Guardian",
    guardianLastName: "Test",
    guardianPhone: "+255700000001",
    guardianRelation: "Parent",
    guardianPermission: true,
  });
  const pdf = await applicationPdf({
    id: "80000000-0000-4000-8000-000000000001",
    version: "2026-11-18-application-v1",
    accepted_at: "2026-11-18T10:00:00Z",
    snapshot_hash: "a".repeat(64),
    data,
  });
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.subarray(-100).toString()).toContain("%%EOF");
  expect(pdf.toString("latin1")).toContain("/FontFile2");
  await mkdir("artifacts", { recursive: true });
  await writeFile("artifacts/application-pdf-fixture.pdf", pdf);
});
