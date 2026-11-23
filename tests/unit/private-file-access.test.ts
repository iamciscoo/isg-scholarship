import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ file: vi.fn(), download: vi.fn(), auth: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mock.auth },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mock.file }) }) }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  adminClient: () => ({ storage: { from: () => ({ download: mock.download }) } }),
}));
import { GET } from "@/app/api/case-files/[id]/route";
const id = "80000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-only");
  mock.auth.mockResolvedValue({ data: { user: { id: "staff" } } });
  mock.file.mockResolvedValue({
    data: {
      storage_path: "owner/file.pdf",
      mime: "application/pdf",
      kind: "document",
      bytes: 20,
      original_name: 'certificate "é".pdf',
    },
  });
  mock.download.mockResolvedValue({ data: new Blob(["%PDF-test-only"]), error: null });
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
it("previews a permitted PDF privately and downloads it with its original name", async () => {
  const preview = await GET(new Request(`https://isg.example/api/case-files/${id}?preview=1`), {
    params: Promise.resolve({ id }),
  });
  expect(preview.status).toBe(200);
  expect(preview.headers.get("content-disposition")).toMatch(/^inline;/);
  expect(preview.headers.get("cache-control")).toBe("private, no-store");
  expect(preview.headers.get("content-security-policy")).toContain("sandbox");
  const download = await GET(new Request(`https://isg.example/api/case-files/${id}`), {
    params: Promise.resolve({ id }),
  });
  expect(download.headers.get("content-disposition")).toContain(
    "filename*=UTF-8''certificate%20%22%C3%A9%22.pdf",
  );
  expect(download.headers.get("content-disposition")).toMatch(/^attachment;/);
});
it("does not read storage when metadata permissions hide another applicant’s file", async () => {
  mock.file.mockResolvedValue({ data: null });
  expect(
    (await GET(new Request(`https://isg.example/api/case-files/${id}`), { params: Promise.resolve({ id }) }))
      .status,
  ).toBe(404);
  expect(mock.download).not.toHaveBeenCalled();
});
