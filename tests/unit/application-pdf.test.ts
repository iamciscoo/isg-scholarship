import { it, expect } from "vitest";
import { PDFiumLibrary } from "@hyzyla/pdfium";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { applicationPdf } from "@/server/services/application-pdf";
import { applicationFields, fullApplicationSchema } from "@/lib/validation/application-form";

const sample = fullApplicationSchema.parse({
  firstName: "Amina",
  middleName: "Neema",
  lastName: "Mbuyu",
  email: "amina.mbuyu@example.invalid",
  phone: "+255700000000",
  studyInterest: "Engineering",
  programme: "Environmental Engineering",
  poBox: "P.O. Box 120",
  residence: "Tanzania",
  cityStreet: "Mikocheni, Dar es Salaam",
  highestEducation: "Bachelor's degree",
  institutionName: "Kijani Institute of Technology",
  institutionCountry: "Tanzania",
  institutionCity: "Arusha",
  institutionStreet: "Mwangaza Road",
  graduationYear: "2026",
  maritalStatus: "Prefer not to say",
  guardianFirstName: "Baraka",
  guardianLastName: "Mbuyu",
  guardianDob: "1977-03-15",
  guardianPhone: "+255700000001",
  guardianEmail: "baraka.mbuyu@example.invalid",
  guardianRelation: "Parent",
  guardianPermission: true,
});
const record = {
  id: "80000000-0000-4000-8000-000000000001",
  version: "2026-11-18-application-v1",
  accepted_at: "2026-11-18T10:00:00Z",
  snapshot_hash: createHash("sha256").update(JSON.stringify(sample)).digest("hex"),
  data: sample,
};

async function pageCount(pdf: Buffer) {
  const library = await PDFiumLibrary.init();
  try {
    const document = await library.loadDocument(pdf);
    try {
      return document.getPageCount();
    } finally {
      document.destroy();
    }
  } finally {
    library.destroy();
  }
}

it("fits a typical application and declaration on one branded A4 page", async () => {
  const pdf = await applicationPdf(record);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.subarray(-100).toString()).toContain("%%EOF");
  expect(pdf.toString("latin1")).toContain("/FontFile2");
  expect(pdf.toString("latin1")).toContain("/Subtype /Image");
  await mkdir("artifacts", { recursive: true });
  await writeFile("artifacts/application-pdf-fixture.pdf", pdf);
  expect(await pageCount(pdf)).toBe(1);
});

it("adds continuation pages when long field values exceed one page", async () => {
  const data = { ...record.data };
  for (const { key, type, options } of applicationFields.flatMap((section) => section.fields)) {
    if (key !== "maritalStatus" && !options && !["number", "date", "email"].includes(type || "")) {
      data[key] = "W".repeat(160);
    }
  }
  const pdf = await applicationPdf({
    ...record,
    data: fullApplicationSchema.parse(data),
    submission_method: "staff",
    submitted_by: "80000000-0000-4000-8000-000000000002",
  });
  expect(await pageCount(pdf)).toBeGreaterThan(1);
});
