import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mock.rpc }) }));
import { GET, PATCH } from "@/app/api/notifications/route";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3005");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-only");
  mock.rpc.mockResolvedValue({ data: { items: [], unread: 0 }, error: null });
});
afterEach(() => vi.unstubAllEnvs());
function request(id: unknown, origin = "http://localhost:3005") {
  return new Request("http://localhost:3005/api/notifications", {
    method: "PATCH",
    headers: { origin, host: "localhost:3005", "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}
it("marks the authenticated inbox read without an extra profile lookup or page mutation", async () => {
  expect((await PATCH(request(null))).status).toBe(200);
  expect(mock.rpc).toHaveBeenCalledExactlyOnceWith("read_account_notifications", { p_id: null });
});
it("rejects a foreign origin before touching notifications", async () => {
  expect((await PATCH(request(null, "https://other.invalid"))).status).toBe(403);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("rejects invalid notification identifiers", async () => {
  expect((await PATCH(request("anything"))).status).toBe(400);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("reports expired sessions instead of an unavailable inbox", async () => {
  mock.rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "Access denied" } });
  expect((await GET()).status).toBe(401);
  expect((await PATCH(request(null))).status).toBe(401);
});
