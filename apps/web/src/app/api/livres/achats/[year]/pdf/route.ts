import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { computePurchaseBook } from "@/lib/livres";
import { PurchaseBookDocument } from "@/lib/pdf/BooksDocument";
import { bookHeader, parseBookActivity, parseBookYear } from "@/app/api/livres/shared";

// PDF imprimable du livre des achats (Maraîchage) — protégé par la session.
export async function GET(req: NextRequest, { params }: { params: Promise<{ year: string }> }) {
  const year = parseBookYear((await params).year);
  if (year === null) return NextResponse.json({ error: "Année invalide" }, { status: 400 });

  const activity = parseBookActivity(req.nextUrl.searchParams.get("activity"));
  const [book, header] = await Promise.all([computePurchaseBook(year, activity), bookHeader("achats", activity)]);
  const buffer = await renderToBuffer(PurchaseBookDocument({ book, header }));
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${header.title.toLowerCase().replace(/ /g, "-")}-${year}.pdf"`,
    },
  });
}
