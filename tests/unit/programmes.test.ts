import { expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { programmeFields, programmesPerPage } from "@/config/programme-areas";
import programmeAreas from "../fixtures/programme-catalogue.json";
import { filterProgrammes, programmeDestinations, type Programme } from "@/lib/programmes";
import { currentLeadStage, leadReviewSchema, leadStages, stageLabel } from "@/lib/validation/leads";
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
it("migrates all original guide copy into the managed catalogue", () => {
  const migration = readFileSync("supabase/migrations/202611230056_managed_programmes.sql", "utf8");
  for (const p of programmeAreas)
    for (const value of [p.key, p.title, p.level, p.field, p.text, p.image])
      expect(migration).toContain(value.replaceAll("'", "''"));
});
it("filters by real programme destinations and never restores removed countries", () => {
  const rows = [
    { id: "1", destinations: ["Canada", "Russia"], study_level: "Undergraduate", field: "Health" },
    { id: "2", destinations: ["Germany"], study_level: "Master's", field: "Law" },
  ] as Programme[];
  expect(filterProgrammes(rows, { destination: "Russia" }).map((p) => p.id)).toEqual(["1"]);
  expect(filterProgrammes(rows, { destination: "Russia", level: "Master's" })).toEqual([]);
  expect(programmeDestinations(rows)).toEqual(["Canada", "Germany", "Russia"]);
  expect(programmeDestinations(rows.slice(1))).toEqual(["Germany"]);
  expect(programmeDestinations([])).toEqual([]);
});
it("offers four clear consultation stages and preserves legacy meaning", () => {
  expect(leadStages).toHaveLength(4);
  expect(leadStages.map(stageLabel)).toEqual([
    "Under review",
    "Needs information",
    "Completed",
    "Closed",
  ]);
  expect(stageLabel("converted")).toBe("Completed");
  expect(stageLabel("not_currently_eligible")).toBe("Closed");
  expect(currentLeadStage("new")).toBe("under_review");
  expect(currentLeadStage("converted")).toBe("qualified");
  expect(currentLeadStage("not_currently_eligible")).toBe("closed");
  expect(
    leadReviewSchema.safeParse({ id: "00000000-0000-4000-8000-000000000001", stage: "converted" }).success,
  ).toBe(false);
});
