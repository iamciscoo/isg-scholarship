import { assessmentFields, assessmentSchema, type AssessmentInput } from "./assessment";
export function restoreConsultationDraft(
  input: unknown,
  step: unknown,
): { data: Partial<AssessmentInput>; step: number } {
  const parsed = assessmentSchema.partial().safeParse(input);
  if (!parsed.success) return { data: {}, step: 0 };
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
