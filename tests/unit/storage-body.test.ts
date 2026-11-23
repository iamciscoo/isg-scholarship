import { expect, it } from "vitest";
import { storageBody } from "@/server/services/storage-body";

it("copies native shared image memory into an independent fetch-compatible upload body", async () => {
  const native = new Uint8Array(new SharedArrayBuffer(4));
  native.set([82, 73, 70, 70]);
  const body = storageBody(native);
  expect(body).toBeInstanceOf(ArrayBuffer);
  native[0] = 0;
  expect([...new Uint8Array(await new Response(body).arrayBuffer())]).toEqual([82, 73, 70, 70]);
});
