import { describe, it, expect } from "vitest";
import { fullApplicationSchema, applicationDraftSchema } from "@/lib/validation/application-form";
describe("Later application boundary", () => {
  const draft = {
    firstName: "",
    lastName: "",
    email: "student@example.invalid",
    phone: "",
    studyInterest: "",
    programme: "",
    residence: "",
    cityStreet: "",
    highestEducation: "",
    institutionName: "",
    institutionCountry: "",
    graduationYear: "",
    guardianFirstName: "",
    guardianLastName: "",
    guardianPhone: "",
    guardianRelation: "",
    guardianPermission: false,
  };
  it("permits incomplete drafts but not submitted declarations", () => {
    expect(applicationDraftSchema.safeParse(draft).success).toBe(true);
    expect(fullApplicationSchema.safeParse(draft).success).toBe(false);
  });
  it("does not accept authority, acceptance time or arbitrary fields from the applicant", () => {
    expect(applicationDraftSchema.safeParse({ ...draft, accepted_at: "2020-01-01" }).success).toBe(false);
    expect(applicationDraftSchema.safeParse({ ...draft, role: "admin" }).success).toBe(false);
  });
  it("rejects malformed guardian dates and huge data", () => {
    expect(applicationDraftSchema.safeParse({ ...draft, guardianDob: "tomorrow" }).success).toBe(false);
    expect(applicationDraftSchema.safeParse({ ...draft, institutionName: "a".repeat(161) }).success).toBe(
      false,
    );
  });
  const complete = {
    firstName: "Student",
    lastName: "Test",
    email: "student@example.invalid",
    phone: "+255700000000",
    studyInterest: "Engineering",
    programme: "Engineering",
    residence: "Tanzania",
    cityStreet: "Test city",
    highestEducation: "Bachelor",
    institutionName: "Test institution",
    institutionCountry: "Tanzania",
    graduationYear: "2026",
    guardianFirstName: "Guardian",
    guardianLastName: "Test",
    guardianPhone: "+255700000001",
    guardianRelation: "Parent",
    guardianPermission: true,
  };
  it("normalizes omitted optional answers for accepted snapshots and PDF generation", () => {
    const parsed = fullApplicationSchema.parse(complete);
    for (const key of [
      "middleName",
      "poBox",
      "institutionCity",
      "institutionStreet",
      "maritalStatus",
      "guardianMiddleName",
      "guardianDob",
      "guardianEmail",
    ] as const)
      expect(parsed[key]).toBe("");
    expect(fullApplicationSchema.parse(parsed)).toEqual(parsed);
  });
  it.each(["1949", "2100", "2026junk", "", "2026.5"])(
    "rejects invalid graduation year %s",
    (graduationYear) => {
      expect(fullApplicationSchema.safeParse({ ...complete, graduationYear }).success).toBe(false);
      if (graduationYear !== "")
        expect(applicationDraftSchema.safeParse({ ...draft, graduationYear }).success).toBe(false);
    },
  );
  it("requires actual guardian permission for accepted snapshots", () => {
    expect(fullApplicationSchema.safeParse({ ...complete, guardianPermission: "true" }).success).toBe(false);
  });
});
