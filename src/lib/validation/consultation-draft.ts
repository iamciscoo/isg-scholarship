import { z } from "zod";
import { assessmentFields, assessmentSchema, type AssessmentInput } from "./assessment";
const draftSchema = assessmentSchema.partial().extend({ adultConfirmation: z.boolean().optional() });
export function restoreConsultationDraft(
  input: unknown,
  step: unknown,
): { data: Partial<AssessmentInput>; step: number } {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { data: {}, step: 0 };
  delete parsed.data.adultConfirmation;
  const requested = typeof step === "number" && Number.isInteger(step) ? Math.max(0, Math.min(3, step)) : 0;
  let completed = 0;
  for (let i = 0; i < requested; i++) {
    const valid = assessmentFields[i].every(
      (key) => assessmentSchema.shape[key].safeParse(parsed.data[key]).success,
    );
    if (!valid) break;
    completed++;
  }
  return { data: parsed.data, step: completed };
}
