import { z } from "zod";
const text = (max = 100) => z.string().trim().min(1, "This field is required.").max(max);
export const studyLevels = ["Undergraduate", "Master's", "PhD / Research"] as const;
export const qualifications = [
  "Secondary school",
  "Diploma",
  "Bachelor's degree",
  "Master's degree",
  "Doctorate",
  "Other",
] as const;
export const assessmentFields = [
  ["firstName", "lastName", "email", "phone", "nationality", "residence"],
  ["qualification", "educationStatus", "fieldOfStudy"],
  ["studyLevel", "preferredFields", "destinations", "intake", "funding"],
  ["processingConsent"],
] as const;
export const assessmentSchema = z
  .object({
    firstName: text(80),
    lastName: text(80),
    email: z.email("Enter a valid email address.").trim().toLowerCase().max(254),
    phone: z
      .string()
      .trim()
      .min(7, "Include your country code and phone number.")
      .max(25)
      .regex(/^\+?[\d\s()-]+$/, "Enter a valid phone number."),
    nationality: text(80),
    residence: text(80),
    qualification: z.enum(qualifications, { error: "Choose your highest completed qualification." }),
    educationStatus: z.enum(["Currently studying", "Graduated", "Working", "Other"], {
      error: "Choose your current education status.",
    }),
    fieldOfStudy: text(150),
    performance: z.union([
      z.literal(""),
      z.enum([
        "Distinction / A range",
        "Upper second / B range",
        "Lower second / C range",
        "Other grading system",
        "Results pending",
      ]),
    ]),
    graduationYear: z
      .string()
      .regex(/^(19[5-9]\d|20\d\d)?$/, "Enter a four-digit year between 1950 and 2099."),
    englishStatus: z.union([
      z.literal(""),
      z.enum(["Test completed", "Test planned", "Studied in English", "Not yet assessed"]),
    ]),
    studyLevel: z.enum(studyLevels, { error: "Choose the study level you want." }),
    preferredFields: text(200),
    destinations: z.string().trim().max(200),
    intake: z.enum(["Next available intake", "2027", "2028", "2029 or later", "Still exploring"], {
      error: "Choose your intended intake.",
    }),
    funding: z.enum(["Full funding needed", "Partial funding considered", "Open to advice"], {
      error: "Choose a funding preference.",
    }),
    constraints: z.string().trim().max(400),
    processingConsent: z.boolean().refine((v) => v, "Consent is required to review your assessment."),
    marketingConsent: z.boolean(),
  })
  .strict();
export type AssessmentInput = z.infer<typeof assessmentSchema>;
export const intakeSchema = z
  .object({
    data: assessmentSchema.extend({ adultConfirmation: z.boolean().optional() }),
    idempotencyKey: z.uuid(),
    turnstileToken: z.string().max(2048),
    website: z.string().max(100),
  })
  .strict();
