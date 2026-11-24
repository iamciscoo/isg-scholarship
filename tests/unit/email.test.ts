import { expect, it } from "vitest";
import { notificationTemplate } from "@/lib/email/templates";
it("directs recipients of staff messages to their private inbox", () => {
  const template = notificationTemplate("account_notification_published", {}, "https://isg.example");
  expect(template.subject).toBe("ISG New account message");
  expect(template.text).toContain("open Notifications to read your new message");
  expect(template.html).toContain('href="https://isg.example/dashboard"');
  expect(template.html).toContain('src="https://isg.example/brand/email-logo.png"');
  expect(template.html).toContain('alt="International Scholarship Gateway"');
  expect(template.html).toContain("<h1 ");
});
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
it.each(["document_request", "document_update"])("links %s directly to the document workspace", (event) => {
  const template = notificationTemplate(event, { reference: "ISG consultation" }, "https://isg.example");
  expect(template.text).toContain("https://isg.example/dashboard/application#application-documents");
  expect(template.html).toContain('href="https://isg.example/dashboard/application#application-documents"');
});

it("explains a rejected receipt and links to the upload workspace", () => {
  const template = notificationTemplate(
    "payment_update",
    {
      firstName: "Test Applicant",
      reference: "ISG-TEST",
      status: "Rejected",
      nextStep: "Upload a replacement receipt.",
    },
    "https://isg.example",
  );
  expect(template.subject).toContain("New consultation receipt needed");
  expect(template.text).toContain("Hello Test Applicant");
  expect(template.text).toContain("Status: Rejected");
  expect(template.text).toContain("https://isg.example/dashboard/consultations");
});

it("includes scheduled time and allows the advisor's HTTPS meeting link", () => {
  const template = notificationTemplate(
    "meeting_scheduled",
    {
      startsAt: "2026-11-25T10:30:00.000Z",
      meetUrl: "https://example.com/join?a=1&b=2",
    },
    "https://isg.example",
  );
  expect(template.text).toContain("2026-11-25 10:30 UTC");
  expect(template.html).toContain('href="https://example.com/join?a=1&amp;b=2"');
});
