import { NextRequest, NextResponse } from "next/server";
import { getInvoiceWithLines } from "@/server/services/invoices";
import { getCompanySettings, listActivitySettings } from "@/server/services/settings";
import { renderInvoicePdf } from "@/lib/pdf/render";
import { activities } from "@/lib/nav";

const activityLabel: Record<string, string> = {
  BA_MARAICHAGE: "Maraîchage",
  BIC_FRUITS_LEGUMES: "Revente Fruits/Légumes",
  BIC_PHOTOBOOTH: "Kerbooth 360",
};

const activitySlugByDb: Record<string, string> = {
  BA_MARAICHAGE: "maraichage",
  BIC_FRUITS_LEGUMES: "fruits-legumes",
  BIC_PHOTOBOOTH: "photobooth",
};

// Le PDF est régénéré à chaque demande à partir des données en base (source
// de vérité) plutôt que stocké au moment de la création : pas de fichier à
// tenir synchronisé, et la « archive » de la facture est l'enregistrement
// Invoice/InvoiceLine lui-même.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const invoice = await getInvoiceWithLines(id);
  if (!invoice) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  }

  const [company, activitySettingsList] = await Promise.all([
    getCompanySettings(),
    listActivitySettings(),
  ]);
  const activitySettings = activitySettingsList.find((s) => s.activity === invoice.activity);
  const navEntry = activities.find((a) => a.slug === activitySlugByDb[invoice.activity]);

  const pdf = await renderInvoicePdf({
    activityLabel: activityLabel[invoice.activity] ?? invoice.activity,
    accentColorHex: navEntry ? accentHex(invoice.activity) : "#1e293b",
    documentTitle: invoice.type === "DEVIS" ? "Devis" : "Facture",
    number: invoice.number,
    issueDate: invoice.issueDate.toLocaleDateString("fr-FR"),
    dueDate: invoice.dueDate?.toLocaleDateString("fr-FR"),
    company: {
      legalName: company?.legalName ?? "(identité non renseignée — voir Réglages)",
      address: company?.address ?? "",
      siren: company?.siren ?? "",
      vatNumber: company?.vatNumber ?? undefined,
      // Email par activité en priorité (voir Réglages) ; à défaut, l'email
      // de contact général de la micro-entreprise.
      contactEmail: activitySettings?.contactEmail ?? company?.contactEmail ?? undefined,
    },
    client: { name: invoice.clientName, address: invoice.clientAddress ?? undefined },
    lines: invoice.lines.map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      vatRate: Number(l.vatRate),
      lineTotal: Number(l.lineTotal),
    })),
    totalHt: Number(invoice.totalHt),
    totalVat: Number(invoice.totalVat),
    totalTtc: Number(invoice.totalTtc),
    vatApplicable: invoice.vatApplicable,
    logoUrl: activitySettings?.logoUrl,
    abMentionText:
      activitySettings?.abLogoEnabled && activitySettings.abCertificationCode
        ? `Certifié Agriculture Biologique — ${activitySettings.abCertificationCode}`
        : undefined,
    extraLegalMentions: activitySettings?.legalMentions ?? undefined,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
    },
  });
}

// Couleurs d'accent définies dans tailwind.config.ts ; dupliquées ici en hex
// car ce fichier tourne côté serveur (génération PDF), hors du pipeline CSS.
function accentHex(activity: string): string {
  switch (activity) {
    case "BA_MARAICHAGE":
      return "#2f7d4f";
    case "BIC_FRUITS_LEGUMES":
      return "#c9762c";
    case "BIC_PHOTOBOOTH":
      return "#7a4fc9";
    default:
      return "#1e293b";
  }
}
