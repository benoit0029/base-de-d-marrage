import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument, type InvoicePdfData } from "@/lib/pdf/InvoiceDocument";

const mimeByExt: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

async function logoToDataUri(logoUrl: string | null | undefined): Promise<string | undefined> {
  if (!logoUrl || !logoUrl.startsWith("/uploads/")) return undefined;
  const ext = path.extname(logoUrl).toLowerCase();
  const mime = mimeByExt[ext];
  if (!mime || mime === "image/svg+xml") return undefined; // @react-pdf/renderer ne supporte pas le SVG en <Image>

  try {
    const filePath = path.join(process.cwd(), "public", logoUrl);
    const buffer = await readFile(filePath);
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function renderInvoicePdf(
  data: Omit<InvoicePdfData, "logoDataUri"> & { logoUrl?: string | null }
): Promise<Buffer> {
  const logoDataUri = await logoToDataUri(data.logoUrl);
  return renderToBuffer(InvoiceDocument({ ...data, logoDataUri }));
}
