import { z } from "zod";
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128)
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");
export const authSchema = z.object({
  email: z.email().trim().toLowerCase().max(254),
  password: z.string().min(1).max(128),
});
export function safeNext(value: string | null | undefined) {
  return value && /^\/(?:dashboard|admin|advisor|consultation)(?:\/[a-zA-Z0-9-]+)*$/.test(value)
    ? value
    : "/dashboard";
}
