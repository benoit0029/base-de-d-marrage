import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { computePurchaseBook } from "@/lib/livres";
import { PurchaseBookDocument } from "@/lib/pdf/BooksDocument";
import { bookHeader, parseBookYear } from "@/app/api/livres/shared";

// PDF imprimable du livre des achats (Maraîchage) — protégé par la session.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ year: string }> }) {
  const year = parseBookYear((await params).year);
  if (year === null) return NextResponse.json({ error: "Année invalide" }, { status: 400 });

  const [book, header] = await Promise.all([computePurchaseBook(year), bookHeader()]);
  const buffer = await renderToBuffer(PurchaseBookDocument({ book, header }));
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="livre-des-achats-${year}.pdf"`,
    },
  });
}
