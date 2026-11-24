import { z } from "zod";
export const passwordRequirements = [
  { message: "Use at least 12 characters.", meets: (value: string) => value.length >= 12 },
  { message: "Include a lowercase letter.", meets: (value: string) => /[a-z]/.test(value) },
  { message: "Include an uppercase letter.", meets: (value: string) => /[A-Z]/.test(value) },
  { message: "Include a number.", meets: (value: string) => /[0-9]/.test(value) },
];
export const passwordSchema = passwordRequirements.reduce(
  (schema, rule) => schema.refine(rule.meets, rule.message),
  z.string().max(128, "Use at most 128 characters."),
);
export const authSchema = z.object({
  email: z.email().trim().toLowerCase().max(254),
  password: z.string().min(1).max(128),
});
export function safeNext(value: string | null | undefined) {
  return value && /^\/(?:dashboard|admin|advisor|consultation|reset-password)(?:\/[a-zA-Z0-9-]+)*$/.test(value)
    ? value
    : "/dashboard";
}
