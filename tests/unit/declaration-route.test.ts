import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Declaration from "@/app/(staff)/admin/declarations/[id]/page";

const { requireStaff, from, select, eq, maybeSingle } = vi.hoisted(() => ({
  requireStaff: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireStaff }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("Not found");
  },
}));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("@/components/layout/workspace", () => ({ Workspace: "main" }));

const declarationId = "80000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000201";
beforeEach(() => {
  vi.stubGlobal("React", React);
  const query = { select, eq, maybeSingle };
  from.mockReturnValue(query);
  select.mockReturnValue(query);
  eq.mockReturnValue(query);
  requireStaff.mockResolvedValue({ db: { from }, user: { email: "admin@example.invalid" }, role: "admin" });
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

it("opens the exact accepted PDF and its applicant case after administrator authorization", async () => {
  maybeSingle.mockResolvedValue({
    data: {
      id: declarationId,
      user_id: userId,
      version: "2026-11-18-application-v1",
      accepted_at: "2026-11-18T10:00:00Z",
    },
    error: null,
  });
  const tree = await Declaration({ params: Promise.resolve({ id: declarationId }) });
  const links: string[] = [];
  function collect(node: React.ReactNode) {
    if (Array.isArray(node)) return node.forEach(collect);
    if (!React.isValidElement<{ href?: string; children?: React.ReactNode }>(node)) return;
    if (node.props.href) links.push(node.props.href);
    collect(node.props.children);
  }
  collect(tree);
  expect(requireStaff).toHaveBeenCalledWith(true);
  expect(from).toHaveBeenCalledWith("application_declarations");
  expect(eq).toHaveBeenCalledWith("id", declarationId);
  expect(links).toEqual([`/api/application-pdf/${declarationId}`, `/admin/cases/${userId}`]);
});
it("does not query declarations when administrator authorization fails", async () => {
  requireStaff.mockRejectedValue(new Error("Unauthorized"));
  await expect(Declaration({ params: Promise.resolve({ id: declarationId }) })).rejects.toThrow(
    "Unauthorized",
  );
  expect(from).not.toHaveBeenCalled();
});
it("returns not found for malformed declaration IDs", async () => {
  await expect(Declaration({ params: Promise.resolve({ id: "invalid" }) })).rejects.toThrow("Not found");
  expect(from).not.toHaveBeenCalled();
});
it("returns not found when no declaration is visible through the staff session", async () => {
  maybeSingle.mockResolvedValue({ data: null, error: null });
  await expect(Declaration({ params: Promise.resolve({ id: declarationId }) })).rejects.toThrow("Not found");
});
