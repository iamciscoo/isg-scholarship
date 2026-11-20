import { describe, expect, it } from "vitest";
import { meetingRequestNote } from "@/features/consultations/meeting-options";

describe("meetingRequestNote", () => {
  it("states the slot, zone and topic", () => {
    expect(meetingRequestNote("2026-11-25", "10:00", "Africa/Dar_es_Salaam", "Application review")).toBe(
      "Preferred 2026-11-25 at 10:00 (Africa/Dar_es_Salaam) · Application review",
    );
  });
  it("appends optional details", () => {
    expect(
      meetingRequestNote("2026-11-25", "14:00", "Europe/London", "Other", "Bring my transcript"),
    ).toBe("Preferred 2026-11-25 at 14:00 (Europe/London) · Other · Bring my transcript");
  });
});