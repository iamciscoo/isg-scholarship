import { z } from "zod";
export const contactSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    email: z.email().trim().toLowerCase().max(254),
    whatsapp: z
      .string()
      .trim()
      .regex(/^(\+?[0-9][0-9 ()-]{6,19})?$/, "Enter a WhatsApp number in international format.")
      .optional(),
    topic: z.enum(["General enquiry", "Consultation", "Service fees", "Privacy request"]),
    message: z.string().trim().min(10, "Please include at least 10 characters.").max(2000),
    consent: z.literal(true, { error: "Please consent to a reply about your enquiry." }),
  })
  .strict();
export const contactRequestSchema = z
  .object({
    data: contactSchema,
    idempotencyKey: z.uuid(),
    turnstileToken: z.string().max(2048),
    website: z.string().max(100),
  })
  .strict();
