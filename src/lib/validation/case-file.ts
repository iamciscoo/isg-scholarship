export const caseFileLimit = 4 * 1024 * 1024;
export const casePdfLimit = 5 * 1024 * 1024;
export const casePdfSizeError = "Choose a PDF that is 5 MB or smaller.";
export const casePdfPageLimit = 20;
export const caseFileSizeError = "Choose a file that is 4 MB or smaller.";
export const caseUploadKinds = ["receipt", "document"] as const;
export type CaseUploadKind = (typeof caseUploadKinds)[number];

export function isCasePdf(file: Pick<File, "type" | "name">) {
  return file.type === "application/pdf" ||
    ((!file.type || file.type === "application/octet-stream") && /\.pdf$/i.test(file.name));
}
