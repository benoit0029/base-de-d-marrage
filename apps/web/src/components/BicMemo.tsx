import { CFP_RATE, pct, URSSAF_RATE_SERVICES, URSSAF_RATE_VENTES } from "@/lib/bic/social";
import { memoLine, type BicMemoLine } from "@/lib/bic/memo";

const NAME: Record<BicMemoLine["activity"], string> = {
  BIC_PHOTOBOOTH: "Kerbooth",
  BIC_FRUITS_LEGUMES: "Revente",
};

// Montants arrondis à l'euro : c'est un mémo, pas une déclaration.
const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const minus = (n: number) => (n > 0 ? `− ${eur(n)}` : eur(0));
const share = (part: number, whole: number) => (whole > 0 ? Math.max(0, (part / whole) * 100) : 0);

interface Column {
  key: string;
  label: string;
  ca: number;
  cotisations: number;
  depenses: number;
  reste: number;
  declared: number;
}

const toColumn = (l: BicMemoLine): Column => ({ key: l.activity, label: NAME[l.activity], ...l });

function Bar({ line }: { line: BicMemoLine }) {
  const abattement = line.ca - line.declared;
  const cotis = share(line.cotisations, line.ca);
  const dep = Math.min(share(line.depenses, line.ca), 100 - cotis);
  const reste = Math.max(0, 100 - cotis - dep);
  const marker = share(abattement, line.ca);
  const marge = line.maxDepenses - line.depenses;
  const minimumApplied = Math.abs(abattement - line.ca * line.abattementRate) > 0.01;

  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center gap-x-3 sm:flex-nowrap">
        <span className="w-full font-medium text-slate-700 sm:w-20 sm:shrink-0">{NAME[line.activity]}</span>
        <div className="relative min-w-0 flex-1 pb-5">
          <div className="flex h-6 overflow-hidden whitespace-nowrap rounded text-[11px] font-medium">
            <div className="flex items-center justify-center bg-amber-300 text-amber-950" style={{ width: `${cotis}%` }}>
              {cotis >= 16 ? `cotis. ${Math.round(cotis)} %` : ""}
            </div>
            <div className="flex items-center justify-center bg-slate-300 text-slate-800" style={{ width: `${dep}%` }}>
              {dep >= 16 ? `dép. ${Math.round(dep)} %` : ""}
            </div>
            <div className="flex items-center justify-center bg-emerald-400 text-emerald-950" style={{ width: `${reste}%` }}>
              {reste >= 16 ? `reste ${Math.round(reste)} %` : ""}
            </div>
          </div>
          <div className="absolute top-0 h-6 border-l-2 border-slate-900" style={{ left: `${marker}%` }} />
          <span
            className={`absolute top-6 whitespace-nowrap text-[11px] text-slate-600 ${marker > 60 ? "-translate-x-full" : "-translate-x-1/2"}`}
            style={{ left: `${Math.max(marker, 15)}%` }}
          >
            {marker > 60 ? "" : "▲ "}
            {minimumApplied ? "abattement mini." : `${pct(line.abattementRate)} % = abattement`}
            {marker > 60 ? " ▲" : ""}
          </span>
        </div>
      </div>
      <p className={`text-xs sm:ml-[5.75rem] ${marge >= 0 ? "text-slate-600" : "text-red-700"}`}>
        {marge >= 0
          ? `Marge restante : tu peux encore dépenser ${eur(marge)} avant de gagner moins que ce que tu déclares.`
          : `Dépenses + cotisations dépassent l'abattement de ${eur(-marge)} : tu gagnes moins que ce que tu déclares.`}
      </p>
    </div>
  );
}

// Mémo de la page Obligations micro-BIC, recalculé à chaque affichage à
// partir des recettes et dépenses validées de l'année : une colonne par
// activité qui a du chiffre d'affaires (chez le partenaire, Kerbooth seul),
// ou l'exemple de 20 000 € tant qu'il n'y en a pas.
export default function BicMemo({ year, lines, msa }: { year: number; lines: BicMemoLine[]; msa: boolean }) {
  const real = lines.filter((l) => l.ca > 0);
  const example = real.length === 0;
  const shown = example ? [memoLine("BIC_PHOTOBOOTH", 20000, 3000)] : real;
  const columns = shown.map(toColumn);
  if (columns.length > 1) {
    const sum = (k: keyof Omit<Column, "key" | "label">) => columns.reduce((s, c) => s + c[k], 0);
    columns.push({
      key: "total",
      label: "Total",
      ca: sum("ca"),
      cotisations: sum("cotisations"),
      depenses: sum("depenses"),
      reste: sum("reste"),
      declared: sum("declared"),
    });
  }
  const total = columns[columns.length - 1];
  const ahead = total.reste - total.declared;

  const rates = shown
    .map((l) =>
      l.activity === "BIC_PHOTOBOOTH"
        ? `${pct(URSSAF_RATE_SERVICES)} % + ${pct(CFP_RATE)} % CFP`
        : `${pct(URSSAF_RATE_VENTES)} % + ${pct(CFP_RATE)} % CFP`
    )
    .join(" / ");
  const abattements = shown.map((l) => `${pct(l.abattementRate)} %`).join(" / ");

  const row = (label: React.ReactNode, cell: (c: Column) => React.ReactNode, className = "") => (
    <tr className={className}>
      <td className="py-1.5 pr-3">{label}</td>
      {columns.map((c) => (
        <td key={c.key} className={`py-1.5 pl-3 text-right tabular-nums ${c.key === "total" ? "font-medium" : ""}`}>
          {cell(c)}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="rounded-lg border bg-white">
      <p className="border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Mémo — ce qu&apos;il te reste réellement ({example ? "exemple" : `${year}, depuis le 1er janvier`})
      </p>
      <div className="space-y-4 p-4">
        {example && (
          <p className="text-xs text-slate-500">
            Pas encore de chiffre d&apos;affaires cette année : exemple avec 20 000 € de CA Kerbooth et 3 000 € de
            dépenses. Les vrais chiffres s&apos;afficheront dès la première recette validée.
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-700">
            <thead className="text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th />
                {columns.map((c) => (
                  <th key={c.key} className="pb-1 pl-3 text-right font-medium">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {row("Chiffre d'affaires encaissé", (c) => eur(c.ca))}
              {row(
                <>
                  − Charges sociales
                  <span className="block text-xs text-slate-500">({rates})</span>
                </>,
                (c) => minus(c.cotisations)
              )}
              {row(
                <>
                  − Dépenses réelles
                  <span className="block text-xs text-slate-500">(onglet Dépenses)</span>
                </>,
                (c) => minus(c.depenses)
              )}
              {row(
                <>
                  <strong>= Ce qu&apos;il te reste vraiment</strong>
                  <span className="block text-xs text-slate-500">(avant impôt sur le revenu)</span>
                </>,
                (c) => <strong className="text-base">{eur(c.reste)}</strong>,
                "border-t-2 border-slate-300"
              )}
              {row(
                <>
                  Revenu déclaré aux impôts
                  <span className="block text-xs text-slate-500">(CA − abattement {abattements})</span>
                </>,
                (c) => eur(c.declared),
                "border-t border-slate-100"
              )}
            </tbody>
          </table>
        </div>

        <p className={`rounded px-3 py-2 text-sm ${ahead >= 0 ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {ahead >= 0
            ? `✅ Tu gardes ${eur(ahead)} de plus que ce que tu déclares : la micro est intéressante.`
            : `⚠️ Tu gagnes ${eur(-ahead)} de moins que ce que tu déclares : tes charges dépassent l'abattement. À voir avec un comptable.`}
        </p>

        <div className="space-y-3">
          {shown.map((l) => (
            <Bar key={l.activity} line={l} />
          ))}
        </div>

        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer text-slate-500">Comment ça marche</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              L&apos;abattement (50 % pour Kerbooth, 71 % pour la Revente) est censé couvrir toutes tes charges,
              cotisations comprises.
            </li>
            <li>
              Si dépenses + cotisations restent sous l&apos;abattement, il te reste plus que ce que tu déclares : la
              micro est intéressante.
            </li>
            <li>
              Exemple Kerbooth : 20 000 € de CA → 4 260 € de cotisations (21,3 %), 10 000 € déclarés ; tant que tes
              dépenses restent sous 5 740 € (10 000 − 4 260), tu gagnes plus que ce que tu déclares.
            </li>
            <li>
              Revente : les achats de marchandises et autres dépenses doivent rester sous 71 % − 12,4 % = 58,6 % du
              CA.
            </li>
          </ul>
        </details>

        {msa && (
          <p className="rounded bg-amber-50 p-2 text-xs text-amber-800">
            Tu es en régime MSA : tes vraies cotisations sont celles de l&apos;appel MSA. Le calcul ci-dessus utilise
            les taux URSSAF du micro-entrepreneur, à titre de comparaison, tant que ta situation n&apos;est pas
            confirmée.
          </p>
        )}
        <p className="text-xs text-slate-500">
          Recalculé à chaque ouverture de la page, à partir des recettes et dépenses validées. Avant impôt sur le
          revenu (il dépend de tout ton foyer). Taux URSSAF, CFP et abattements vérifiés le 24/09/2026.
        </p>
      </div>
    </div>
  );
}
