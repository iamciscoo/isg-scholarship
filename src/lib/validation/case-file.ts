export const caseFileLimit = 4 * 1024 * 1024;
export const casePdfPageLimit = 20;
export const caseFileSizeError = "Choose a file that is 4 MB or smaller.";
export const caseUploadKinds = ["receipt", "support", "document"] as const;
export type CaseUploadKind = (typeof caseUploadKinds)[number];
