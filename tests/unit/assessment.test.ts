import { describe, expect, it } from "vitest";
import { assessmentSchema, intakeSchema } from "@/lib/validation/assessment";
import { assessment } from "../fixtures/assessment";
describe("Assessment boundary", () => {
  it("accepts an assessment without marketing consent", () =>
    expect(assessmentSchema.parse(assessment).marketingConsent).toBe(false));
  it("requires processing consent", () =>
    expect(assessmentSchema.safeParse({ ...assessment, processingConsent: false }).success).toBe(false));
  it("rejects hidden role escalation fields", () =>
    expect(assessmentSchema.safeParse({ ...assessment, role: "admin" }).success).toBe(false));
  it("normalizes the email for verified ownership linking", () =>
    expect(assessmentSchema.parse({ ...assessment, email: "Student@Example.invalid" }).email).toBe(
      "student@example.invalid",
    ));
  it.each(["1949", "2100", "tomorrow"])("rejects invalid graduation year %s", (year) =>
    expect(assessmentSchema.safeParse({ ...assessment, graduationYear: year }).success).toBe(false),
  );
  it("limits free-form sensitive text", () =>
    expect(assessmentSchema.safeParse({ ...assessment, constraints: "a".repeat(401) }).success).toBe(false));
  it("requires a UUID idempotency key", () =>
    expect(
      intakeSchema.safeParse({ data: assessment, idempotencyKey: "1", turnstileToken: "a", website: "" })
        .success,
    ).toBe(false));
});
