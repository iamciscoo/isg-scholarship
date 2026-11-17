import type { AssessmentInput } from "@/lib/validation/assessment";
import { qualifications, studyLevels } from "@/lib/validation/assessment";
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
    { name: "fieldOfStudy", label: "Current / most recent field of study" },
    {
      name: "performance",
      label: "Academic performance range",
      options: [
        "Distinction / A range",
        "Upper second / B range",
        "Lower second / C range",
        "Other grading system",
        "Results pending",
      ],
    },
    { name: "graduationYear", label: "Graduation year (actual or expected)", type: "number" },
    {
      name: "englishStatus",
      label: "English-language proficiency",
      options: ["Test completed", "Test planned", "Studied in English", "Not yet assessed"],
    },
  ],
  [
    { name: "studyLevel", label: "Desired study level", options: studyLevels },
    { name: "preferredFields", label: "Preferred academic fields" },
    { name: "destinations", label: "Preferred destinations (optional)" },
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
    {
      name: "constraints",
      label: "Anything else to consider? (optional)",
      help: "Keep this general. Do not include financial account details or sensitive personal information.",
    },
  ],
];
