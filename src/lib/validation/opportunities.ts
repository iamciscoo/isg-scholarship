import { z } from "zod";
import { countries } from "@/lib/countries";
export const approvedImages = [
  "/images/study-1.webp",
  "/images/study-2.webp",
  "/images/study-3.webp",
  "/images/university-campus-1.webp",
  "/images/university-campus-2.webp",
  "/images/university-campus-3.webp",
  "/images/study-together.webp",
  "/images/campus-life.webp",
  "/images/reference-campus.webp",
  "/images/reference-library.webp",
  "/images/reference-study-city.webp",
] as const;
export const marketingImageSchema = z.union([
  z.enum(approvedImages),
  z.string().regex(/^\/api\/marketing-images\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
]);
const title = (max = 160) => z.string().trim().min(1).max(max);
export function isPreviewPackage(name: unknown) {
  return typeof name === "string" && name.startsWith("Preview test · ");
}
export const scholarshipImageSchema = z.string().regex(/^\/api\/scholarship-images\/[0-9a-f-]{36}$/);
export const scholarshipPackageSchema = z
  .object({
    name: title(200),
    provider: title(200),
    destination: title(100),
    studyLevel: title(80),
    field: title(),
    requirements: z.string().trim().max(10000),
    deadline: z.union([z.iso.date(), z.literal("")]),
    supportSummary: z.string().trim().max(3000),
    packageFee: z
      .string()
      .trim()
      .regex(/^\d{1,9}$/)
      .transform(Number)
      .pipe(z.number().max(100000000)),
    providerFee: z.union([z.string().regex(/^\d{1,9}(\.\d{1,2})?$/), z.literal("")]),
    providerCurrency: z.enum(["TZS", "USD", "EUR", "GBP", "RUB"]),
    image: marketingImageSchema,
    active: z.boolean(),
    useGallery: z.boolean(),
  })
  .strict();
export const promotionSchema = z
  .object({
    title: title(),
    destinations: z
      .array(title(100))
      .min(1)
      .max(250)
      .refine(
        (values) =>
          new Set(values).size === values.length &&
          values.every((name) => countries.some((country) => country.name === name)),
        "Choose valid destinations.",
      ),
    studyLevel: title(80),
    field: title(),
    fundingType: title(200),
    eligibility: z.string().trim().max(2000),
    image: marketingImageSchema,
    published: z.boolean(),
  })
  .strict();
export const applicationStatuses = [
  "Starting",
  "Applying",
  "Waiting for decision",
  "Accepted",
  "Rejected",
  "Cancelled",
  "Completed",
] as const;
export const providerDecisions = ["Not received", "Pending", "Accepted", "Rejected", "Withdrawn"] as const;
export const proposalSchema = z.object({
  name: title(200),
  provider: title(200),
  destination: title(100),
  studyLevel: title(80),
  field: title(),
  requirements: z.string(),
  deadline: z.string().nullable(),
  providerFee: z.number().nullable(),
  providerCurrency: z.string(),
  packageFee: z.number().int().min(0).max(100000000).optional(),
  supportSummary: z.string().optional(),
  image: z.union([marketingImageSchema, scholarshipImageSchema]).optional(),
});
export type ScholarshipPackage = {
  id: string;
  name: string;
  provider: string;
  destination: string;
  study_level: string;
  field: string;
  requirements: string;
  deadline: string | null;
  provider_fee: number | null;
  provider_currency: string;
  image: string;
  active: boolean;
  package_fee_tzs: number | null;
  support_summary: string;
  private_image_id: string | null;
};
