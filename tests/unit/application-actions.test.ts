import { expect, it, vi } from "vitest";
import { saveFullApplication } from "@/features/applicants/application-actions";

const rpc = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
vi.mock("@/lib/auth/session", () => ({
  requireUser: async () => ({ db: { rpc }, user: { email: "account@example.invalid" } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/services/notification-delivery", () => ({ wakeNotifications: vi.fn() }));

it("saves the applicant's entered contact email in the draft", async () => {
  const data = new FormData();
  data.set("email", "contact@example.invalid");

  expect(await saveFullApplication({}, data)).toEqual({ message: "Application draft saved." });
  expect(rpc).toHaveBeenCalledWith("save_application_form", {
    p_declare: false,
    p_data: expect.objectContaining({ email: "contact@example.invalid" }),
  });
});
