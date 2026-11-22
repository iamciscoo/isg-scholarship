import type { AssessmentInput } from "@/lib/validation/assessment";
import { qualifications, studyLevels } from "@/lib/validation/assessment";
export const consentFields = [
  { name: "adultConfirmation", text: "I confirm that I am 18 years of age or older." },
  {
    name: "processingConsent",
    text: "I consent to ISG processing my information to review this assessment and contact me about it.",
  },
  {
    name: "marketingConsent",
    text: "Optional: I would like occasional study guidance and service updates by email.",
  },
] as const;
export type AssessmentField = {
  name: keyof AssessmentInput;
  label: string;
  type?: string;
  options?: readonly string[];
  help?: string;
};
export const steps: AssessmentField[][] = [
  [
    { name: "firstName", label: "First name", type: "given-name" },
    { name: "lastName", label: "Last name", type: "family-name" },
    { name: "email", label: "Email address", type: "email" },
    { name: "phone", label: "Phone / WhatsApp number", type: "tel", help: "Include your country code." },
    { name: "nationality", label: "Nationality" },
    { name: "residence", label: "Country of residence", type: "country-name" },
  ],
  [
    { name: "qualification", label: "Highest completed qualification", options: qualifications },
    {
      name: "educationStatus",
      label: "Current education status",
      options: ["Currently studying", "Graduated", "Working", "Other"],
    },
    {
      name: "fieldOfStudy",
      label: "Current / most recent field of study",
      help: "e.g. Medicine, Business, Engineering, Telecom",
    },
  ],
  [
    { name: "studyLevel", label: "Desired study level", options: studyLevels },
    { name: "preferredFields", label: "Preferred academic fields", help: "e.g. Medicine, Telecom, Business" },
    {
      name: "destinations",
      label: "Preferred destinations (optional)",
      help: "e.g. Russia, England, Canada",
    },
    {
      name: "intake",
      label: "Intended intake",
      options: ["Next available intake", "2027", "2028", "2029 or later", "Still exploring"],
    },
    {
      name: "funding",
      label: "Funding preference",
      options: ["Full funding needed", "Partial funding considered", "Open to advice"],
    },
  ],
];
