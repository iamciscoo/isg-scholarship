import { expect, it } from "vitest";
import { existsSync } from "node:fs";
import { programmeAreas, programmeFields, programmesPerPage } from "@/config/programme-areas";
it("provides 60 distinct guides across ten fields and all three study levels", () => {
  expect(programmeAreas).toHaveLength(60);
  expect(new Set(programmeAreas.map((p) => p.title)).size).toBe(60);
  expect(programmeFields).toHaveLength(10);
  for (const level of ["Undergraduate", "Master's", "PhD / Research"]) {
    expect(programmeAreas.filter((p) => p.level === level)).toHaveLength(20);
    for (const field of programmeFields)
      expect(programmeAreas.filter((p) => p.level === level && p.field === field.value)).toHaveLength(2);
  }
  expect(programmesPerPage).toBe(12);
});
it("uses existing WebP photography for each guide", () => {
  for (const p of programmeAreas) {
    expect(p.image).toMatch(/\.webp$/);
    expect(existsSync(`public${p.image}`)).toBe(true);
  }
});
