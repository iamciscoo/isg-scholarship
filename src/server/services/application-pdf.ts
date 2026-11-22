import "server-only";
import PDFDocument from "pdfkit";
import path from "node:path";
import { applicationFields, declarationText, type FullApplication } from "@/lib/validation/application-form";
export async function applicationPdf(record: {
  id: string;
  version: string;
  accepted_at: string;
  data: FullApplication;
  snapshot_hash: string;
  submission_method?: string;
  submitted_by?: string | null;
}) {
  const font = path.join(process.cwd(), "public/fonts/Manrope.ttf");
  const doc = new PDFDocument({
    size: "A4",
    margin: 48,
    bufferPages: true,
    font,
    info: { Title: "ISG scholarship application details", Author: "International Scholarship Gateway" },
  });
  const chunks: Buffer[] = [];
  const complete = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c) => chunks.push(Buffer.from(c)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.fillColor("#0d2c62").fontSize(10).text("INTERNATIONAL SCHOLARSHIP GATEWAY", { characterSpacing: 1 });
  doc.moveDown().fontSize(24).text("Scholarship application details");
  doc
    .moveDown(0.5)
    .fontSize(10)
    .fillColor("#566274")
    .text(
      `${record.submission_method === "staff" ? "Information recorded by ISG staff." : "Applicant-declared information."} This is not a university admission or scholarship offer.`,
    );
  for (const section of applicationFields) {
    if (doc.y > 670) doc.addPage();
    doc.moveDown(1).fillColor("#0d2c62").fontSize(15).text(section.title);
    doc.moveDown(0.5);
    for (const field of section.fields) {
      if (doc.y > 700) doc.addPage();
      doc.fontSize(9).fillColor("#566274").text(field.label);
      doc
        .fontSize(11)
        .fillColor("#172b46")
        .text(String(record.data[field.key] || "Not provided"), { lineGap: 3 });
      doc.moveDown(0.5);
    }
  }
  if (doc.y > 570) doc.addPage();
  const staff = record.submission_method === "staff";
  doc
    .moveDown()
    .fillColor("#0d2c62")
    .fontSize(15)
    .text(staff ? "Staff record" : "Applicant declaration");
  doc
    .moveDown(0.5)
    .fontSize(10)
    .fillColor("#172b46")
    .text(
      staff
        ? "ISG staff recorded these details from information provided by the applicant. No applicant electronic signature was captured for this submission."
        : declarationText,
      { lineGap: 4 },
    );
  doc
    .moveDown()
    .text(`${staff ? "Recorded" : "Accepted electronically"}: ${new Date(record.accepted_at).toISOString()}`);
  if (staff && record.submitted_by) doc.text(`Recorded by staff account: ${record.submitted_by}`);
  doc.text(`Form version: ${record.version}`);
  doc.text(`Guardian contact permission: ${record.data.guardianPermission ? "Confirmed" : "Not confirmed"}`);
  doc.moveDown().fontSize(8).text(`Record: ${record.id}`).text(`Snapshot SHA-256: ${record.snapshot_hash}`);
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .fillColor("#566274")
      .text(
        `ISG - Private applicant record                                      ${i + 1} / ${range.count}`,
        48,
        790,
        { lineBreak: false },
      );
  }
  doc.end();
  return complete;
}
