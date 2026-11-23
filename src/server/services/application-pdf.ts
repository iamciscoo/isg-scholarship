import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { applicationFields, declarationText, type FullApplication } from "@/lib/validation/application-form";

const colors = {
  navy: "#0d2c62",
  ink: "#172b46",
  muted: "#526074",
  gold: "#b88a35",
  cream: "#f6f5f0",
  rule: "#dbe2e9",
};
const margin = 42;
const columnGap = 18;
const rowGap = 6;
const labelSize = 8.5;
const valueSize = 10.5;

type Field = { label: string; value: string };
type FieldKey = Exclude<keyof FullApplication, "guardianPermission">;

const fieldLabels = new Map(
  applicationFields.flatMap(({ fields }) => fields.map(({ key, label }) => [key, label] as const)),
);
const sections: { title: string; keys: FieldKey[] }[] = [
  {
    title: "Applicant details",
    keys: [
      "firstName",
      "middleName",
      "lastName",
      "email",
      "phone",
      "maritalStatus",
      "residence",
      "cityStreet",
      "poBox",
    ],
  },
  {
    title: "Study plan and education",
    keys: [
      "studyInterest",
      "programme",
      "highestEducation",
      "institutionName",
      "institutionCountry",
      "graduationYear",
      "institutionCity",
      "institutionStreet",
    ],
  },
  {
    title: "Guardian details",
    keys: [
      "guardianFirstName",
      "guardianMiddleName",
      "guardianLastName",
      "guardianDob",
      "guardianPhone",
      "guardianEmail",
      "guardianRelation",
    ],
  },
];

function measureRow(doc: PDFKit.PDFDocument, fields: Field[], width: number) {
  return fields.map(({ label, value }) => {
    const options = { width, lineGap: 0 };
    const labelHeight = doc.font("Bold").fontSize(labelSize).heightOfString(label, options);
    const valueHeight = doc.font("Regular").fontSize(valueSize).heightOfString(value, options);
    return { label, value, labelHeight, height: labelHeight + 1 + valueHeight };
  });
}

function drawRow(
  doc: PDFKit.PDFDocument,
  fields: ReturnType<typeof measureRow>,
  x: number,
  y: number,
  width: number,
) {
  fields.forEach(({ label, value, labelHeight }, index) => {
    const left = x + index * (width + columnGap);
    doc.font("Bold").fontSize(labelSize).fillColor(colors.muted).text(label, left, y, { width });
    doc
      .font("Regular")
      .fontSize(valueSize)
      .fillColor(colors.ink)
      .text(value, left, y + labelHeight + 1, { width });
  });
}

export async function applicationPdf(record: {
  id: string;
  version: string;
  accepted_at: string;
  data: FullApplication;
  snapshot_hash: string;
  submission_method?: string;
  submitted_by?: string | null;
}) {
  const regular = path.join(process.cwd(), "public/fonts/Manrope-Regular.ttf");
  const bold = path.join(process.cwd(), "public/fonts/Manrope-Bold.ttf");
  const logo = await sharp(path.join(process.cwd(), "public/brand/logo.svg"))
    .trim()
    .resize({ width: 820 })
    .png()
    .toBuffer();
  const title = "Scholarship application details";
  const doc = new PDFDocument({
    size: "A4",
    // Rows and footer use measured positions and reserve their own space.
    margins: { top: margin, left: margin, right: margin, bottom: 0 },
    bufferPages: true,
    font: regular,
    info: { Title: `ISG ${title.toLowerCase()}`, Author: "International Scholarship Gateway" },
  });
  doc.registerFont("Regular", regular).registerFont("Bold", bold);
  const chunks: Buffer[] = [];
  const complete = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const staff = record.submission_method === "staff";
  const right = doc.page.width - margin;
  const width = right - margin;
  const bottom = doc.page.height - 58;
  const fieldWidth = (width - 2 * columnGap) / 3;
  const rule = (y: number) =>
    doc.lineWidth(0.7).strokeColor(colors.rule).moveTo(margin, y).lineTo(right, y).stroke();
  const continuePage = () => {
    doc.addPage();
    doc.image(logo, margin, 36, { width: 122 });
    doc
      .font("Bold")
      .fontSize(9)
      .fillColor(colors.navy)
      .text(title, margin + 140, 46, { width: width - 140, align: "right" });
    rule(78);
    return 94;
  };

  doc.image(logo, margin, 38, { width: 172 });
  doc
    .font("Bold")
    .fontSize(8)
    .fillColor(colors.muted)
    .text("PRIVATE APPLICANT RECORD", margin + 190, 55, {
      width: width - 190,
      align: "right",
      characterSpacing: 0.8,
    });
  rule(96);
  doc
    .lineWidth(1.6)
    .strokeColor(colors.gold)
    .moveTo(margin, 96)
    .lineTo(margin + 36, 96)
    .stroke();
  doc.font("Bold").fontSize(29).fillColor(colors.navy).text(title, margin, 110, { width });
  doc
    .font("Regular")
    .fontSize(10)
    .fillColor(colors.muted)
    .text(
      `${staff ? "Information recorded by ISG staff." : "Applicant-declared information."} This is not a university admission or scholarship offer.`,
      margin,
      doc.y + 3,
      { width },
    );
  let y = doc.y + 17;

  const heading = (label: string, top: number) => {
    rule(top);
    doc
      .font("Bold")
      .fontSize(12)
      .fillColor(colors.navy)
      .text(label, margin, top + 5, { width });
    return doc.y + 4;
  };
  for (const section of sections) {
    const fields = section.keys.map((key) => ({
      label: fieldLabels.get(key)!,
      value: record.data[key].replace(/\s+/g, " ").trim() || "Not provided",
    }));
    const rows = [];
    for (let i = 0; i < fields.length; i += 3) {
      const cells = measureRow(doc, fields.slice(i, i + 3), fieldWidth);
      rows.push({ cells, height: Math.max(...cells.map(({ height }) => height)) });
    }
    if (y + 26 + rows[0].height > bottom) y = continuePage();
    y = heading(section.title, y);
    for (const { cells, height } of rows) {
      if (y + height > bottom) y = heading(`${section.title} (continued)`, continuePage());
      drawRow(doc, cells, margin, y, fieldWidth);
      y += height + rowGap;
    }
    y += 5;
  }

  const statement = staff
    ? "ISG staff recorded these details from information provided by the applicant. No applicant electronic signature was captured for this submission."
    : declarationText;
  const inset = 14;
  const innerWidth = width - 2 * inset;
  const detailsWidth = (innerWidth - 2 * columnGap) / 3;
  const details = measureRow(
    doc,
    [
      {
        label: staff ? "Recorded" : "Accepted electronically",
        value: new Date(record.accepted_at).toISOString(),
      },
      {
        label: "Guardian contact permission",
        value: record.data.guardianPermission ? "Confirmed" : "Not confirmed",
      },
      { label: "Form version", value: record.version },
    ],
    detailsWidth,
  );
  const statementOptions = { width: innerWidth, lineGap: 1 };
  const statementHeight = doc.font("Regular").fontSize(9.5).heightOfString(statement, statementOptions);
  const detailsHeight = Math.max(...details.map(({ height }) => height));
  const staffHeight = staff && record.submitted_by ? 17 : 0;
  const declarationHeight = 31 + statementHeight + 9 + detailsHeight + staffHeight + 12;
  const referenceLines = [`Record ID: ${record.id}`, `Snapshot SHA-256: ${record.snapshot_hash}`];
  if (y + declarationHeight + 35 > bottom) y = continuePage();
  doc.roundedRect(margin, y, width, declarationHeight, 8).fill(colors.cream);
  doc
    .font("Bold")
    .fontSize(13)
    .fillColor(colors.navy)
    .text(staff ? "Staff record" : "Applicant declaration", margin + inset, y + 10, { width: innerWidth });
  doc
    .font("Regular")
    .fontSize(9.5)
    .fillColor(colors.ink)
    .text(statement, margin + inset, y + 31, statementOptions);
  const detailsTop = y + 31 + statementHeight + 9;
  drawRow(doc, details, margin + inset, detailsTop, detailsWidth);
  if (staff && record.submitted_by) {
    doc
      .font("Regular")
      .fontSize(9)
      .fillColor(colors.ink)
      .text(
        `Recorded by staff account: ${record.submitted_by}`,
        margin + inset,
        detailsTop + detailsHeight + 5,
        { width: innerWidth },
      );
  }
  doc
    .font("Regular")
    .fontSize(8)
    .fillColor(colors.muted)
    .text(referenceLines.join("\n"), margin, y + declarationHeight + 10, { width, lineGap: 1 });

  const { count } = doc.bufferedPageRange();
  for (let index = 0; index < count; index++) {
    doc.switchToPage(index);
    const footer = doc.page.height - 40;
    rule(footer);
    doc
      .font("Regular")
      .fontSize(8)
      .fillColor(colors.muted)
      .text("International Scholarship Gateway", margin, footer + 8, { width: width / 2 });
    doc.text(`${index + 1} / ${count}`, margin + width / 2, footer + 8, { width: width / 2, align: "right" });
  }
  doc.end();
  return complete;
}
