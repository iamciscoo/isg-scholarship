import { z } from "zod";
export const leadStages = [
  "new",
  "under_review",
  "qualified",
  "more_information",
  "not_currently_eligible",
  "converted",
  "closed",
] as const;
export const leadReviewSchema = z.object({
  id: z.uuid(),
  stage: z.enum(leadStages),
});
export function stageLabel(stage: string) {
  return stage.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
}
