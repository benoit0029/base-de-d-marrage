import { CFP_RATE, pct, URSSAF_RATE_SERVICES, URSSAF_RATE_VENTES } from "@/lib/bic/social";
import { memoLine, type BicMemoLine } from "@/lib/bic/memo";

const LABEL: Record<BicMemoLine["activity"], string> = {
  BIC_PHOTOBOOTH: "Kerbooth (prestations de services)",
  BIC_FRUITS_LEGUMES: "Revente fruits/légumes (ventes de marchandises)",
};

// Montants arrondis à l'euro : c'est un mémo, pas une déclaration.
const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function MemoBlock({ line, example }: { line: BicMemoLine; example?: boolean }) {
  const baseRate = line.activity === "BIC_FRUITS_LEGUMES" ? URSSAF_RATE_VENTES : URSSAF_RATE_SERVICES;
  const abattement = line.ca - line.declared;
  const minimumApplied = Math.abs(abattement - line.ca * line.abattementRate) > 0.01;
  const ahead = line.reste - line.declared;

  return (
    <div className="px-4 py-3 text-sm">
      <p className="font-medium text-slate-800">
        {example ? "Exemple — " : ""}
        {LABEL[line.activity]}
      </p>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-slate-700">
        <li>
          Chiffre d&apos;affaires : <strong>{eur(line.ca)}</strong>
        </li>
        <li>
          Charges sociales URSSAF : {pct(baseRate)} % + {pct(CFP_RATE)} % de CFP = {pct(line.urssafRate)} %, soit{" "}
          <strong>{eur(line.cotisations)}</strong>.
        </li>
        <li>
          Revenu déclaré aux impôts : {eur(line.ca)} −{" "}
          {minimumApplied ? "abattement minimum de 305 €" : `${pct(line.abattementRate)} % d'abattement`} ={" "}
          <strong>{eur(line.declared)}</strong>.
        </li>
        <li>
          L&apos;abattement {minimumApplied ? "minimum" : `de ${pct(line.abattementRate)} %`} ({eur(abattement)}) est
          censé couvrir toutes tes charges, cotisations comprises.
        </li>
        <li>
          Si dépenses + cotisations restent sous {eur(abattement)}, il te reste plus que ce que tu déclares. La micro
          est alors intéressante.
        </li>
        <li>
          {line.maxDepenses > 0 ? (
            <>
              Ici, tant que tes dépenses restent sous <strong>{eur(line.maxDepenses)}</strong> ({eur(abattement)} −{" "}
              {eur(line.cotisations)}
              {minimumApplied
                ? ""
                : `, soit ${pct(line.abattementRate)} % − ${pct(line.urssafRate)} % = ${pct(line.abattementRate - line.urssafRate)} % du CA`}
              ), tu gagnes plus que ce que tu déclares.
            </>
          ) : (
            <>Ici, les cotisations dépassent déjà l&apos;abattement : tu gagnes moins que ce que tu déclares.</>
          )}
        </li>
        {!example && (
          <li className={ahead >= 0 ? "text-emerald-800" : "text-red-700"}>
            Tes dépenses enregistrées cette année (onglet Dépenses) : {eur(line.depenses)}. Il te reste donc{" "}
            <strong>{eur(line.reste)}</strong> ({eur(line.ca)} − {eur(line.cotisations)} − {eur(line.depenses)}), soit{" "}
            <strong>
              {eur(Math.abs(ahead))} {ahead >= 0 ? "de plus" : "de moins"}
            </strong>{" "}
            que ce que tu déclares
            {ahead >= 0 ? "." : " : tes charges dépassent l'abattement."}
          </li>
        )}
      </ul>
    </div>
  );
}

// Mémo de la page Obligations micro-BIC : une explication par activité qui
// a du chiffre d'affaires dans l'année (chez le partenaire, Kerbooth seul),
// ou l'exemple de 20 000 € tant qu'il n'y en a pas.
export default function BicMemo({ year, lines, msa }: { year: number; lines: BicMemoLine[]; msa: boolean }) {
  const shown = lines.filter((l) => l.ca > 0);
  return (
    <div className="rounded-lg border bg-white">
      <p className="border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Mémo — ce qu&apos;il te reste réellement ({year}, depuis le 1er janvier)
      </p>
      <div className="divide-y divide-slate-100">
        {shown.length > 0 ? (
          shown.map((l) => <MemoBlock key={l.activity} line={l} />)
        ) : (
          <MemoBlock line={memoLine("BIC_PHOTOBOOTH", 20000, 0)} example />
        )}
      </div>
      {msa && (
        <p className="mx-4 mb-3 rounded bg-amber-50 p-2 text-xs text-amber-800">
          Tu es en régime MSA : tes vraies cotisations sont celles de l&apos;appel MSA. Le calcul ci-dessus utilise
          les taux URSSAF du micro-entrepreneur, à titre de comparaison, tant que ta situation n&apos;est pas
          confirmée.
        </p>
      )}
      <p className="px-4 pb-3 text-xs text-slate-500">
        Avant impôt sur le revenu : l&apos;impôt lui-même dépend de tout ton foyer. Taux URSSAF, CFP et abattements
        vérifiés le 24/09/2026.
      </p>
    </div>
  );
}
