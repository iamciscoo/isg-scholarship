import { afterEach, expect, it, vi } from "vitest";
import { requestId } from "@/lib/request-id";
afterEach(() => vi.unstubAllGlobals());
it("generates secure UUIDs on HTTP contexts without randomUUID", () => {
  const getRandomValues = crypto.getRandomValues.bind(crypto);
  vi.stubGlobal("crypto", { getRandomValues });
  const ids = Array.from({ length: 20 }, () => requestId());
  expect(new Set(ids).size).toBe(20);
  for (const id of ids)
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
