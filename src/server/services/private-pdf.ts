import "server-only";
import { PDFiumLibrary } from "@hyzyla/pdfium";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { casePdfLimit, casePdfPageLimit } from "@/lib/validation/case-file";

// Rebuilding costs a WASM init per call, so keep one library for the process lifetime.
let library: Promise<PDFiumLibrary> | null = null;
function pdfium() {
  library ??= PDFiumLibrary.init().catch(() => {
    library = null;
    console.error("pdfium_initialization_failed");
    throw Error("PDF processing is temporarily unavailable. Try again later.");
  });
  return library;
}

// Rebuild from rendered pages so links, JavaScript, attachments and other PDF objects
// cannot carry over. Only PDFium's WebAssembly renderer reads the submitted PDF.
export async function rebuildPrivatePdf(input: Buffer, compact = false) {
  const pdf = await pdfium();
  const output = new PDFDocument({ autoFirstPage: false, margin: 0 });
  try {
    const document = await pdf.loadDocument(input).catch(() => {
      throw Error("This PDF could not be read. Choose a complete, unlocked PDF.");
    });
    try {
      const pages = [...document.pages()];
      if (!pages.length) throw Error("This PDF has no readable pages.");
      if (pages.length > casePdfPageLimit)
        throw Error(`Choose a PDF with up to ${casePdfPageLimit} pages. You can upload it in parts.`);

      let imageBytes = 0;
      const imageBudget = casePdfLimit - 64 * 1024;
      let remaining = pages.length;
      // Rasterising a page dominates the rebuild, so render a window of pages at once.
      for (let start = 0; start < pages.length; start += 4) {
        const rendered = await Promise.all(
          pages.slice(start, start + 4).map(async (page) => {
            try {
              const { originalWidth, originalHeight } = page.getOriginalSize();
              if (
                !Number.isFinite(originalWidth) ||
                !Number.isFinite(originalHeight) ||
                originalWidth < 1 ||
                originalHeight < 1
              )
                throw Error("This PDF has an unreadable page.");
              const scale = (compact ? 1600 : 1800) / Math.max(originalWidth, originalHeight);
              const raster = await page.render({
                width: Math.max(1, Math.round(originalWidth * scale)),
                height: Math.max(1, Math.round(originalHeight * scale)),
                renderFormFields: true,
              }).catch(() => {
                throw Error("This PDF has an unreadable page.");
              });
              return { ...raster, originalWidth, originalHeight };
            } finally {
              page.close();
            }
          }),
        );

        for (const page of rendered) {
          const pixels = sharp(page.data, {
            raw: { width: page.width, height: page.height, channels: 4 },
          }).removeAlpha();
          const pageBudget = (imageBudget - imageBytes) / remaining;
          let image = await pixels.clone().jpeg({ quality: compact ? 74 : 84, mozjpeg: true }).toBuffer();
          if (image.length > pageBudget)
            image = await pixels.clone().jpeg({ quality: 73, mozjpeg: true }).toBuffer();
          if (image.length > pageBudget)
            image = await pixels.resize({ width: 1450, height: 1450, fit: "inside", withoutEnlargement: true })
              .jpeg({ quality: 68, mozjpeg: true }).toBuffer();
          imageBytes += image.length;
          remaining -= 1;
          if (imageBytes > imageBudget)
            throw Error("This PDF is too large after processing. Upload it in smaller parts.");
          const size: [number, number] = [page.originalWidth, page.originalHeight];
          output.addPage({ size }).image(image, 0, 0, { width: size[0], height: size[1] });
        }
      }
    } finally {
      document.destroy();
    }
    output.end();
    const chunks: Buffer[] = [];
    for await (const chunk of output) chunks.push(chunk);
    const result = Buffer.concat(chunks);
    if (result.length > casePdfLimit)
      throw Error("This PDF is too large after processing. Upload it in smaller parts.");
    return result;
  } finally {
    output.destroy();
  }
}
