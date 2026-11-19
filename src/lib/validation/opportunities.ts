import { z } from "zod";
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
export const opportunitySchema = z
  .object({
    name: title(200),
    provider: title(200),
    destination: title(100),
    studyLevel: title(80),
    field: title(),
    requirements: z.string().trim().max(10000),
    staffNotes: z.string().trim().max(5000),
    deadline: z.union([z.iso.date(), z.literal("")]),
    sourceUrl: z.url().refine((v) => v.startsWith("https://")),
    providerFee: z.union([z.string().regex(/^\d{1,9}(\.\d{1,2})?$/), z.literal("")]),
    providerCurrency: z.enum(["TZS", "USD", "EUR", "GBP", "RUB"]),
    image: marketingImageSchema,
    active: z.boolean(),
  })
  .strict();
export const promotionSchema = z
  .object({
    title: title(),
    destination: title(100),
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
  sourceUrl: z.url(),
  providerFee: z.number().nullable(),
  providerCurrency: z.string(),
});
export type Opportunity = {
  id: string;
  name: string;
  provider: string;
  destination: string;
  study_level: string;
  field: string;
  requirements: string;
  research_notes: string;
  deadline: string | null;
  source_url: string;
  provider_fee: number | null;
  provider_currency: string;
  image: string;
  active: boolean;
};
