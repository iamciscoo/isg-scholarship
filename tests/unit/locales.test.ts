import { describe, expect, it } from "vitest";
import { dictionaries } from "@/lib/i18n/messages";
import { locales, isLocale } from "@/lib/i18n/config";
function shape(value: unknown): unknown {
  if (typeof value === "string") return "string";
  if (Array.isArray(value)) return value.map(shape);
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, shape(v)]));
}
describe("language packs", () => {
  it("has complete matching public interface and content for every language", () => {
    for (const locale of locales) expect(shape(dictionaries[locale]), locale).toEqual(shape(dictionaries.en));
  });
  it("accepts only the supported locale identifiers", () => {
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("../../private")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});
