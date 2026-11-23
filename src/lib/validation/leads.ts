import { z } from "zod";
export const leadStages = ["new", "under_review", "more_information", "qualified", "closed"] as const;
export const leadReviewSchema = z.object({
  id: z.uuid(),
  stage: z.enum(leadStages),
});
export function stageLabel(stage: string) {
  const labels: Record<string, string> = {
    new: "New",
    under_review: "Under review",
    more_information: "Needs information",
    qualified: "Completed",
    converted: "Completed",
    not_currently_eligible: "Closed",
    closed: "Closed",
  };
  if (labels[stage]) return labels[stage];
  return stage.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
}
export function currentLeadStage(stage: string) {
  return stage === "converted" ? "qualified" : stage === "not_currently_eligible" ? "closed" : stage;
}
