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
  reason: z.string().trim().min(5, "Explain the review in at least 5 characters.").max(1500),
  advisorId: z.union([z.uuid(), z.literal("")]),
  followUp: z.union([z.iso.date(), z.literal("")]),
});
export function stageLabel(stage: string) {
  return stage.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
}
