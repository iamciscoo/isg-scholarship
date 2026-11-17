import { expect, it } from "vitest";
import { notificationTemplate } from "@/lib/email/templates";
it("escapes applicant input in HTML email", () => {
  const template = notificationTemplate(
    "assessment_received",
    { firstName: '<script>"test"</script>', reference: "ISG-TEST" },
    "https://isg.example",
  );
  expect(template.html).not.toContain("<script>");
  expect(template.html).toContain("&lt;script&gt;");
  expect(template.text).toContain("not a scholarship eligibility decision");
});
it("keeps applicant PII out of staff alerts", () => {
  const template = notificationTemplate(
    "team_assessment",
    { firstName: "Private Name", reference: "ISG-TEST" },
    "https://isg.example",
  );
  expect(template.html).not.toContain("Private Name");
  expect(template.text).toContain("ISG-TEST");
});
