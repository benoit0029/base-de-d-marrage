import Link from "next/link";
import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { ca12aDeadline } from "@/lib/tva";
import { computeInstallmentSchedule } from "@/lib/tva/installments";
import { computeEmployerReminders } from "@/server/services/employer";
import { getPaConnection } from "@/server/services/pa";

export const dynamic = "force-dynamic";

const frDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

type Tone = "ok" | "todo" | "late" | "later";

interface Obligation {
  label: string;
  href: string;
  tab: string;
  status: string;
  tone: Tone;
}

const TONE_CLASS: Record<Tone, string> = {
  ok: "bg-emerald-100 text-emerald-800",
  todo: "bg-amber-100 text-amber-800",
  late: "bg-red-100 text-red-800",
  later: "bg-slate-100 text-slate-600",
};

// Vue d'ensemble des obligations du micro-BA (Maraîchage), par section —
// chaque ligne renvoie vers l'onglet qui la traite, avec la prochaine
// échéance ou la date de mise en service. Liste reprise du document
// « Obligations micro-BA » de Benoît.
export default async function Page() {
  const tenantId = await getDefaultTenantId();
  const today = new Date();
  const year = today.getFullYear();

  const [pendingRecettes, pendingDepenses, previousSchedule, currentSchedule, reminders, pa] = await Promise.all([
    prisma.cashJournalEntry.count({ where: { tenantId, activity: "BA_MARAICHAGE", status: "PENDING", deletedAt: null } }),
    prisma.entry.count({
      where: { tenantId, activity: "BA_MARAICHAGE", type: { in: ["ACHAT", "IMMOBILISATION"] }, status: "PENDING", deletedAt: null },
    }),
    computeInstallmentSchedule(year - 1),
    computeInstallmentSchedule(year),
    computeEmployerReminders(today),
    getPaConnection(),
  ]);

  // Prochain acompte de TVA non payé (4e acompte de l'an dernier en février, puis ceux de l'année).
  const nextInstallment = [previousSchedule, currentSchedule]
    .filter((s) => s.required)
    .flatMap((s) => s.installments)
    .find((i) => i.paid < i.amount - 0.005);
  const anyInstallment = previousSchedule.required || currentSchedule.required;

  // CA12A : celle des revenus de l'an dernier tant que sa date limite n'est pas passée.
  const ca12aYear = ca12aDeadline(year - 1) >= today ? year - 1 : year;
  const declarationYear = today.getMonth() < 6 ? year - 1 : year;
  const lateReminders = reminders.filter((r) => r.late).length;
  const connected = pa?.status === "CONNECTED";

  const sections: { title: string; items: Obligation[] }[] = [
    {
      title: "Comptable",
      items: [
        {
          label: "Saisir et valider les ventes du jour (journal de caisse)",
          href: "/maraichage/recettes",
          tab: "Recettes",
          status: pendingRecettes > 0 ? `${pendingRecettes} saisie(s) à valider` : "À jour",
          tone: pendingRecettes > 0 ? "todo" : "ok",
        },
        {
          label: "Saisir et valider les achats",
          href: "/maraichage/achats",
          tab: "Dépenses",
          status: pendingDepenses > 0 ? `${pendingDepenses} dépense(s) à valider` : "À jour",
          tone: pendingDepenses > 0 ? "todo" : "ok",
        },
        { label: "Pointer la banque", href: "/maraichage/releve-bancaire", tab: "Relevé bancaire", status: "À chaque relevé", tone: "ok" },
        { label: "Faire les factures (professionnels)", href: "/maraichage/facturation", tab: "Facturation", status: "Au fil de l'eau", tone: "ok" },
        { label: "Livre des recettes (ventes par taux, totaux par trimestre)", href: "/maraichage/livre-recettes", tab: "Livre des recettes", status: "Rempli automatiquement", tone: "ok" },
        { label: "Livre des achats (immobilisations / autres)", href: "/maraichage/livre-achats", tab: "Livre des achats", status: "Rempli automatiquement", tone: "ok" },
        { label: "Conserver les pièces (6 ans, 10 ans conseillés)", href: "/maraichage/achats", tab: "Automatique", status: "Aucune pièce validée n'est effacée", tone: "ok" },
      ],
    },
    {
      title: "Fiscal",
      items: [
        { label: "Suivre la TVA par trimestre", href: "/maraichage/tva", tab: "Registre TVA", status: "Calculé automatiquement", tone: "ok" },
        {
          label: "Payer les acomptes de TVA (si TVA de l'an dernier ≥ 1 000 €)",
          href: "/maraichage/acomptes",
          tab: "Acompte TVA",
          status: !anyInstallment
            ? "Pas d'acompte (TVA de l'an dernier sous 1 000 €)"
            : nextInstallment
              ? `Prochain : avant le ${frDate(nextInstallment.dueDate)}`
              : "Tous payés",
          tone: !anyInstallment ? "ok" : nextInstallment ? (nextInstallment.dueDate < today ? "late" : "todo") : "ok",
        },
        {
          label: "Déclarer la TVA de l'année + taxe ADAR",
          href: "/maraichage/ca12a",
          tab: "CA12A",
          status: `CA12A ${ca12aYear} : avant le ${frDate(ca12aDeadline(ca12aYear))}`,
          tone: "todo",
        },
        {
          label: "Déclarer les recettes (impôt et cotisations MSA)",
          href: "/maraichage/declaration-annuelle",
          tab: "Déclaration 2042",
          status: `Revenus ${declarationYear} : au printemps ${declarationYear + 1}`,
          tone: "later",
        },
        { label: "CFE", href: "/maraichage/obligations", tab: "—", status: "Exonérée (activité agricole)", tone: "ok" },
      ],
    },
    {
      title: "Social",
      items: [
        { label: "Tes cotisations d'exploitant (MSA)", href: "/maraichage/cotisations-non-salarie", tab: "Cotisations non salarié", status: "Calculées par la MSA depuis ta 2042", tone: "ok" },
        { label: "Paie du salarié : embauche, contrat, bulletins, DSN (TESA+)", href: "/maraichage/tesa-plus", tab: "Tesa+", status: "Chaque mois pendant le contrat", tone: "ok" },
        {
          label: "Registre du personnel, visite d'information, DUERP, affichages, mutuelle, prévoyance",
          href: "/maraichage/employeur",
          tab: "Employeur",
          status: reminders.length === 0 ? "Rien à faire en ce moment" : `${reminders.length} point(s) à faire`,
          tone: reminders.length === 0 ? "ok" : lateReminders > 0 ? "late" : "todo",
        },
      ],
    },
    {
      title: "Abby (facture électronique)",
      items: [
        {
          label: "Recevoir les factures fournisseurs électroniques",
          href: "/maraichage/e-reporting",
          tab: "Abby / E-reporting",
          status: connected ? "Via Abby" : "Depuis le 1/09/2026 — plateforme actuelle ; Abby à activer",
          tone: connected ? "ok" : "later",
        },
        {
          label: "Envoyer les factures aux professionnels",
          href: "/maraichage/e-reporting",
          tab: "Abby / E-reporting",
          status: "À activer avant le 1/09/2027",
          tone: "later",
        },
        {
          label: "E-reporting des ventes aux particuliers",
          href: "/maraichage/e-reporting",
          tab: "Abby / E-reporting",
          status: "Totaux prêts — transmission à activer avant le 1/09/2027",
          tone: "later",
        },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Toutes tes obligations — Maraîchage (micro-BA)</p>
        <p className="mt-1 text-xs text-slate-500">
          Chaque ligne renvoie vers l&apos;onglet qui s&apos;en occupe. Liste tirée de ton document « Obligations
          micro-BA » : en cas de doute sur une règle, la vérifier avant d&apos;agir.
        </p>
      </div>
      {sections.map((section) => (
        <div key={section.title} className="rounded-lg border bg-white">
          <p className="border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {section.title}
          </p>
          <ul className="divide-y divide-slate-100">
            {section.items.map((item) => (
              <li key={item.label} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <div>
                  <p className="text-slate-800">{item.label}</p>
                  <Link href={item.href} className="text-xs text-slate-500 underline">
                    {item.tab}
                  </Link>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASS[item.tone]}`}>
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
