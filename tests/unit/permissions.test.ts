import { expect, it } from "vitest";
import { canReviewLead, canAssignAdvisor } from "@/lib/auth/permissions";
import { safeNext, passwordSchema } from "@/lib/validation/auth";
it("denies applicant access even to their own staff record", () =>
  expect(canReviewLead("applicant", "a", "a", true, "aal2")).toBe(false));
it("denies an unassigned advisor", () =>
  expect(canReviewLead("advisor", "a", "b", true, "aal2")).toBe(false));
it("denies staff without MFA", () => expect(canReviewLead("admin", "a", null, true, "aal1")).toBe(false));
it("denies suspended administrators", () =>
  expect(canReviewLead("admin", "a", null, false, "aal2")).toBe(false));
it("permits an active assigned advisor with MFA", () =>
  expect(canReviewLead("advisor", "a", "a", true, "aal2")).toBe(true));
it("reserves assignments for active MFA administrators", () => {
  expect(canAssignAdvisor("advisor", true, "aal2")).toBe(false);
  expect(canAssignAdvisor("admin", true, "aal2")).toBe(true);
});
it.each([
  "https://example.com",
  "//evil.invalid",
  "/\\evil.invalid",
  "/admin?redirect=https://evil.invalid",
  "/api/jobs/notifications",
])("rejects redirect %s", (value) => expect(safeNext(value)).toBe("/dashboard"));
it("allows a protected internal destination", () =>
  expect(safeNext("/admin/leads/abc-123")).toBe("/admin/leads/abc-123"));
it("requires a strong password", () => {
  expect(passwordSchema.safeParse("short").success).toBe(false);
  expect(passwordSchema.safeParse("LongTestPassword123").success).toBe(true);
});
