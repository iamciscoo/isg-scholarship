import { expect, it } from "vitest";
import { usdQuote } from "@/lib/format";

it("rounds the USD quote up to the nearest ten", () => {
  expect(usdQuote(50_000)).toBe(20);
  expect(usdQuote(2_501)).toBe(10);
  expect(usdQuote(2_500)).toBe(10);
  expect(usdQuote(375_000)).toBe(150);
  expect(usdQuote(0)).toBe(0);
});
