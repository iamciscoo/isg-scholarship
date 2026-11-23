import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requireStaff: vi.fn(),
  rpc: vi.fn(),
  remove: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireStaff: mocks.requireStaff }));
vi.mock("@/lib/supabase/admin", () => ({
  adminClient: () => ({
    storage: { from: () => ({ remove: mocks.remove }) },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { deleteScholarshipPackage } from "@/features/admin/scholarship-package-actions";
import { deletePromotion } from "@/features/admin/opportunity-actions";

const id = "80000000-0000-4000-8000-000000000001";
const form = () => {
  const fd = new FormData();
  fd.set("id", id);
  return fd;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireStaff.mockResolvedValue({ db: { rpc: mocks.rpc }, user: {}, role: "admin" });
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  mocks.remove.mockResolvedValue({ error: null });
});

it("deletes a package and its stored image", async () => {
  mocks.rpc.mockResolvedValue({ data: "image-1", error: null });
  expect(await deleteScholarshipPackage({}, form())).toEqual({ message: "Package deleted." });
  expect(mocks.rpc).toHaveBeenCalledWith("delete_scholarship_package", { p_id: id });
  expect(mocks.remove).toHaveBeenCalledWith(["image-1.webp"]);
});

it("keeps a package that an application already references", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "23503" } });
  expect(await deleteScholarshipPackage({}, form())).toEqual({
    error: "This package is attached to an application. Archive it instead of deleting.",
  });
  expect(mocks.remove).not.toHaveBeenCalled();
});

it("deletes a public promotion", async () => {
  expect(await deletePromotion({}, form())).toEqual({ message: "Programme deleted." });
  expect(mocks.rpc).toHaveBeenCalledWith("delete_study_promotion", { p_id: id });
});
