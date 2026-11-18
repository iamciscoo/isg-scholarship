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
      { key: "email", label: "Account email", type: "email" },
      { key: "phone", label: "Phone / WhatsApp" },
      { key: "studyInterest", label: "What you want to study" },
      { key: "programme", label: "Preferred programme" },
    ],
  },
  {
    title: "Where you stay",
    fields: [
      { key: "poBox", label: "P.O. Box", optional: true },
      { key: "residence", label: "Country of residence" },
      { key: "cityStreet", label: "City and street" },
      {
        key: "maritalStatus",
        label: "Marital status",
        optional: true,
        options: ["Single", "Married", "Divorced", "Widowed", "Prefer not to say"],
      },
    ],
  },
  {
    title: "Education history",
    fields: [
      { key: "highestEducation", label: "Highest education level" },
      { key: "institutionName", label: "Education institution" },
      { key: "institutionCountry", label: "Institution country" },
      { key: "institutionCity", label: "Institution city", optional: true },
      { key: "institutionStreet", label: "Institution street", optional: true },
      { key: "graduationYear", label: "Graduation year", type: "number" },
    ],
  },
  {
    title: "Guardian or nominated contact",
    fields: [
      { key: "guardianFirstName", label: "Guardian first name" },
      { key: "guardianMiddleName", label: "Guardian middle name", optional: true },
      { key: "guardianLastName", label: "Guardian last name" },
      { key: "guardianRelation", label: "Relationship" },
      { key: "guardianPhone", label: "Guardian phone", type: "tel" },
      { key: "guardianEmail", label: "Guardian email", type: "email", optional: true },
      {
        key: "guardianDob",
        label: "Guardian date of birth (only if requested by your advisor)",
        type: "date",
        optional: true,
      },
    ],
  },
];
