import { expect, it } from "vitest";
import { restoreConsultationDraft } from "@/lib/validation/consultation-draft";
it("rejects invalid or unexpected draft data before rendering it", () => {
  expect(restoreConsultationDraft({ firstName: { malicious: "object" } }, 3)).toEqual({ data: {}, step: 0 });
  expect(restoreConsultationDraft({ unexpected: "value" }, 3)).toEqual({ data: {}, step: 0 });
});
it("does not skip required steps when a stored draft is incomplete", () => {
  const result = restoreConsultationDraft({ firstName: "Student" }, 3);
  expect(result.step).toBe(0);
  expect(result.data.firstName).toBe("Student");
});
it("restores legacy drafts without collecting age confirmation again", () => {
  expect(restoreConsultationDraft({ firstName: "Student", adultConfirmation: false }, 0)).toEqual({
    data: { firstName: "Student" },
    step: 0,
  });
});
it("restores the next step only after the preceding personal fields are valid", () => {
  const data = {
    firstName: "Real",
    lastName: "Applicant",
    email: "test@example.invalid",
    phone: "+255700000000",
    nationality: "Tanzanian",
    residence: "Tanzania",
  };
  expect(restoreConsultationDraft(data, 2).step).toBe(1);
});
