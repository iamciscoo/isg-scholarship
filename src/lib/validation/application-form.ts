import { z } from "zod";
const short = z.string().trim().max(160);
const required = short.min(1, "This field is required.");
const email = z.union([z.email().max(254), z.literal("")]);
export const declarationVersion = "2026-11-18-application-v1";
export const declarationText =
  "I confirm that the information I have given is true. I understand that submitting this form does not guarantee a scholarship, admission, visa or travel.";
export const fullApplicationSchema = z
  .object({
    firstName: required,
    middleName: short.default(""),
    lastName: required,
    email: z.email().max(254),
    phone: required,
    studyInterest: required,
    programme: required,
    poBox: short.default(""),
    residence: required,
    cityStreet: required,
    highestEducation: required,
    institutionName: required,
    institutionCountry: required,
    institutionCity: short.default(""),
    institutionStreet: short.default(""),
    graduationYear: z.string().regex(/^(19[5-9]\d|20\d\d)$/, "Enter a year between 1950 and 2099."),
    maritalStatus: z.enum(["", "Single", "Married", "Divorced", "Widowed", "Prefer not to say"]).default(""),
    guardianFirstName: required,
    guardianMiddleName: short.default(""),
    guardianLastName: required,
    guardianDob: z.union([z.iso.date(), z.literal("")]).default(""),
    guardianPhone: required,
    guardianEmail: email.default(""),
    guardianRelation: required,
    guardianPermission: z
      .boolean()
      .refine(Boolean, "Confirm that you informed your guardian before sharing their details."),
  })
  .strict();
export const applicationDraftSchema = fullApplicationSchema
  .partial()
  .extend({
    firstName: short,
    lastName: short,
    phone: short,
    studyInterest: short,
    programme: short,
    residence: short,
    cityStreet: short,
    highestEducation: short,
    institutionName: short,
    institutionCountry: short,
    graduationYear: z.union([z.string().regex(/^(19[5-9]\d|20\d\d)$/), z.literal("")]),
    guardianFirstName: short,
    guardianLastName: short,
    guardianPhone: short,
    guardianRelation: short,
    guardianPermission: z.boolean(),
  })
  .strict();
export type FullApplication = z.infer<typeof fullApplicationSchema>;
export function applicationFieldErrors(issues: readonly { path: PropertyKey[]; message: string }[]) {
  return Object.fromEntries(issues.map(({ path, message }) => [String(path[0]), message]).reverse());
}
export const applicationFields: {
  title: string;
  fields: {
    key: keyof Omit<FullApplication, "guardianPermission">;
    label: string;
    type?: string;
    optional?: boolean;
    options?: string[];
  }[];
}[] = [
  {
    title: "Contact and study interest",
    fields: [
      { key: "firstName", label: "First name" },
      { key: "middleName", label: "Middle name", optional: true },
      { key: "lastName", label: "Last name" },
      { key: "email", label: "Email address", type: "email" },
      { key: "studyInterest", label: "What you want to study" },
    ],
  },
  {
    title: "Guardian details",
    fields: [
      { key: "guardianFirstName", label: "First name" },
      { key: "guardianMiddleName", label: "Middle name", optional: true },
      { key: "guardianLastName", label: "Last name" },
      { key: "guardianDob", label: "Date of birth", type: "date", optional: true },
      { key: "guardianPhone", label: "Phone number", type: "tel" },
      { key: "guardianEmail", label: "Email address", type: "email", optional: true },
      { key: "guardianRelation", label: "Relation to the guardian" },
    ],
  },
  {
    title: "Where you stay",
    fields: [
      { key: "poBox", label: "P.O. Box", optional: true },
      { key: "residence", label: "Place you stay" },
    ],
  },
  {
    title: "Education",
    fields: [
      { key: "highestEducation", label: "Highest level of education" },
      { key: "institutionName", label: "Name of the education institution" },
      { key: "institutionCountry", label: "Country of the institution" },
      { key: "institutionCity", label: "City of the institution", optional: true },
      { key: "institutionStreet", label: "Street of the institution", optional: true },
      { key: "graduationYear", label: "Year you graduated", type: "number" },
    ],
  },
  {
    title: "Study plan and personal details",
    fields: [
      { key: "programme", label: "Program you want to study" },
      { key: "phone", label: "Phone number with country code", type: "tel" },
      {
        key: "maritalStatus",
        label: "Marital status",
        optional: true,
        options: ["Single", "Married", "Divorced", "Widowed", "Prefer not to say"],
      },
      { key: "cityStreet", label: "City and street where you stay" },
    ],
  },
];
