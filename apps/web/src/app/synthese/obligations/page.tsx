import Link from "next/link";
import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { getCompanySettings } from "@/server/services/settings";
import { getPaConnection } from "@/server/services/pa";
import { getBicVatSettings } from "@/lib/tva/bic";
import { asBicSocialRegime, BIC_SOCIAL_LABEL } from "@/lib/bic/social";
import { computeBicMemo } from "@/lib/bic/memo";
import BicMemo from "@/components/BicMemo";
import { isActivityHidden } from "@/lib/visibility";

export const dynamic = "force-dynamic";

type Tone = "ok" | "todo" | "late" | "later";

interface Obligation {
  label: string;
  links: { href: string; tab: string }[];
  status: string;
  tone: Tone;
  reventeOnly?: boolean; // masquée si la Revente est masquée (installation du partenaire)
}

const TONE_CLASS: Record<Tone, string> = {
  ok: "bg-emerald-100 text-emerald-800",
  todo: "bg-amber-100 text-amber-800",
  late: "bg-red-100 text-red-800",
  later: "bg-slate-100 text-slate-600",
};

const frDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// Vue d'ensemble des obligations de la micro-BIC (Revente + Kerbooth, une
// seule micro-entreprise), par section — chaque ligne renvoie vers l'onglet
// qui la traite. Règles connues, non relues sur les textes officiels depuis
// l'outil : à vérifier en cas de doute.
export default async function Page() {
  const tenantId = await getDefaultTenantId();
  const today = new Date();
  const year = today.getFullYear();
  const bic = ["BIC_FRUITS_LEGUMES", "BIC_PHOTOBOOTH"] as const;

  const [pendingRecettes, pendingDepenses, openInvoices, vat, company, pa, memo, reventeHidden] = await Promise.all([
    prisma.cashJournalEntry.count({ where: { tenantId, activity: "BIC_FRUITS_LEGUMES", status: "PENDING", deletedAt: null } }),
    prisma.entry.count({ where: { tenantId, activity: { in: [...bic] }, status: "PENDING", deletedAt: null } }),
    prisma.invoice.count({ where: { tenantId, activity: { in: [...bic] }, type: "FACTURE", status: "SENT", paidAt: null } }),
    getBicVatSettings(),
    getCompanySettings(),
    getPaConnection(),
    computeBicMemo(year),
    isActivityHidden("fruits-legumes"),
  ]);
  const regime = asBicSocialRegime(company?.bicSocialRegime);
  const declarationYear = today.getMonth() < 6 ? year - 1 : year;

  const sections: { title: string; items: Obligation[] }[] = [
    {
      title: "Comptable",
      items: [
        {
          label: "Saisir et valider les ventes du jour (Revente)",
          links: [{ href: "/fruits-legumes/recettes", tab: "Revente → Recettes" }],
          status: pendingRecettes > 0 ? `${pendingRecettes} saisie(s) à valider` : "À jour",
          tone: pendingRecettes > 0 ? "todo" : "ok",
          reventeOnly: true,
        },
        {
          label: "Saisir et valider les dépenses",
          links: [
            { href: "/fruits-legumes/achats", tab: "Revente → Dépenses" },
            { href: "/photobooth/achats", tab: "Kerbooth → Dépenses" },
          ],
          status: pendingDepenses > 0 ? `${pendingDepenses} dépense(s) à valider` : "À jour",
          tone: pendingDepenses > 0 ? "todo" : "ok",
        },
        {
          label: "Factures numérotées (FA2026-001…, avoirs AV…) — une seule suite pour la micro-entreprise",
          links: [
            { href: "/photobooth/factures", tab: "Kerbooth → Factures" },
            { href: "/fruits-legumes/factures", tab: "Revente → Factures" },
          ],
          status: openInvoices > 0 ? `${openInvoices} facture(s) pas encore encaissée(s)` : "Numérotation automatique",
          tone: openInvoices > 0 ? "todo" : "ok",
        },
        {
          label: "Livre-journal des recettes (obligatoire)",
          links: [
            { href: "/fruits-legumes/livre-recettes", tab: "Revente → Livre des recettes" },
            { href: "/photobooth/livre-recettes", tab: "Kerbooth → Livre des recettes" },
          ],
          status: "Rempli automatiquement",
          tone: "ok",
        },
        {
          label: "Registre des achats (vente de marchandises)",
          links: [{ href: "/fruits-legumes/registre-achats", tab: "Revente → Registre des achats" }],
          status: "Rempli automatiquement",
          tone: "ok",
          reventeOnly: true,
        },
        {
          label: "Conserver les pièces (10 ans pour une activité commerciale)",
          links: [],
          status: "Aucune pièce validée n'est effacée",
          tone: "ok",
        },
      ],
    },
    {
      title: "Fiscal",
      items: [
        {
          label: "Surveiller les seuils (franchise de TVA, plafonds micro-BIC)",
          links: [{ href: "/synthese/seuils", tab: "Suivi des seuils" }],
          status: "Calculé automatiquement",
          tone: "ok",
        },
        {
          label: "TVA (franchise ou CA12 après la bascule)",
          links: [{ href: "/synthese/tva", tab: "TVA micro-BIC" }],
          status: vat.liableFrom ? `Assujetti depuis le ${frDate(vat.liableFrom)} — CA12 annuelle` : "Franchise en base (art. 293 B)",
          tone: vat.liableFrom ? "todo" : "ok",
        },
        {
          label: "Déclarer le chiffre d'affaires (ventes et services séparés)",
          links: [{ href: "/synthese/declaration", tab: "Déclaration 2042" }],
          status: `Revenus ${declarationYear} : au printemps ${declarationYear + 1}`,
          tone: "later",
        },
        {
          label: "CFE (cotisation foncière des entreprises)",
          links: [],
          status: "Avis en fin d'année sur impots.gouv — exonérations possibles, à vérifier",
          tone: "later",
        },
      ],
    },
    {
      title: "Social",
      items: [
        {
          label: "Cotisations sociales de la micro-BIC",
          links: [{ href: "/synthese/social", tab: "Cotisations sociales" }],
          status: regime ? BIC_SOCIAL_LABEL[regime] : "Régime à choisir",
          tone: regime ? "ok" : "todo",
        },
      ],
    },
    {
      title: "Abby (facture électronique)",
      items: [
        {
          label: "Recevoir les factures fournisseurs électroniques",
          links: [{ href: "/synthese/e-reporting", tab: "Abby / E-reporting" }],
          status: pa?.status === "CONNECTED" ? "Via Abby" : "Depuis le 1/09/2026 — Abby à activer",
          tone: pa?.status === "CONNECTED" ? "ok" : "later",
        },
        {
          label: "Envoyer les factures aux professionnels",
          links: [{ href: "/synthese/e-reporting", tab: "Abby / E-reporting" }],
          status: "À activer avant le 1/09/2027",
          tone: "later",
        },
        {
          label: "E-reporting des ventes et prestations aux particuliers",
          links: [{ href: "/synthese/e-reporting", tab: "Abby / E-reporting" }],
          status: "Totaux prêts — transmission à activer avant le 1/09/2027",
          tone: "later",
        },
      ],
    },
  ];

  // Installation sans Revente (partenaire) : ni lignes ni liens Revente.
  const visibleSections = sections.map((section) => ({
    ...section,
    items: section.items
      .filter((item) => !(reventeHidden && item.reventeOnly))
      .map((item) => ({
        ...item,
        links: reventeHidden ? item.links.filter((l) => !l.href.startsWith("/fruits-legumes")) : item.links,
      })),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm font-medium text-slate-700">
          Toutes tes obligations — micro-BIC{reventeHidden ? " (Kerbooth)" : " (Revente + Kerbooth)"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Une seule micro-entreprise (même SIRET) : livres et saisies par activité, déclarations communes ici. Règles
          connues, non relues sur les textes officiels depuis l&apos;outil : en cas de doute, vérifier avant
          d&apos;agir.
        </p>
      </div>
      <BicMemo year={year} lines={memo} msa={regime === "MSA"} />
      {visibleSections.map((section) => (
        <div key={section.title} className="rounded-lg border bg-white">
          <p className="border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{section.title}</p>
          <ul className="divide-y divide-slate-100">
            {section.items.map((item) => (
              <li key={item.label} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <div>
                  <p className="text-slate-800">{item.label}</p>
                  <p className="space-x-3 text-xs">
                    {item.links.map((l) => (
                      <Link key={l.href} href={l.href} className="text-slate-500 underline">
                        {l.tab}
                      </Link>
                    ))}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASS[item.tone]}`}>{item.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
