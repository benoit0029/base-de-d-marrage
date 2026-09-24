"use client";

import { useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  submitCashJournalEntry,
  submitCashJournalSheets,
  extractCashJournalPhotoAmount,
  type CashJournalFormState,
  type CashJournalSheetRead,
} from "@/app/actions/cashJournal";
import type { Activity } from "@prisma/client";

const initialState: CashJournalFormState = { status: "idle", message: "" };
const today = () => new Date().toISOString().slice(0, 10);
const toNumber = (v: string) => (v.trim() === "" ? 0 : Number(v.replace(",", ".")));
const fmt = (n: number) => n.toFixed(2).replace(".", ",");

function formatFrDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

export default function CashJournalForm({
  activity,
  knownLocations = [],
}: {
  activity: Activity;
  knownLocations?: string[]; // lieux déjà saisis, proposés en suggestion
}) {
  const isMaraichage = activity === "BA_MARAICHAGE";
  const boundAction = submitCashJournalEntry.bind(null, activity);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  // Lecture automatique du montant sur la photo du jour (voir
  // extractCashJournalPhotoAmount) : pré-remplit les champs ci-dessous, que
  // l'exploitant garde la main pour corriger avant d'enregistrer.
  const [dateValue, setDateValue] = useState(today());
  const [location, setLocation] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [checkAmount, setCheckAmount] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [reducedRateAmount, setReducedRateAmount] = useState("");
  const [plantSalesAmount, setPlantSalesAmount] = useState("");
  const [readNotice, setReadNotice] = useState<string | null>(null);
  const [isReadPending, startReadTransition] = useTransition();

  // Plusieurs fiches sur la même photo (saisie en retard) : liste des fiches
  // lues, enregistrables en une fois (voir submitCashJournalSheets).
  const router = useRouter();
  const [sheets, setSheets] = useState<CashJournalSheetRead[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [sheetsMessage, setSheetsMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSheetsPending, startSheetsTransition] = useTransition();

  // Contrôle en direct (Maraîchage) : 5,5 % + 10 % doivent égaler le total
  // espèces + chèques + CB, comme sur la fiche du jour.
  const dayTotal = toNumber(cashAmount) + toNumber(checkAmount) + toNumber(cardAmount);
  const splitTotal = toNumber(reducedRateAmount) + toNumber(plantSalesAmount);
  const splitMismatch = reducedRateAmount.trim() !== "" && Math.abs(splitTotal - dayTotal) > 0.01;

  // Les champs montants sont désormais contrôlés (pré-remplissage par
  // lecture automatique) : le reset natif du formulaire après un envoi
  // réussi ne les efface plus tout seul, on le refait ici.
  useEffect(() => {
    if (state.status === "success") {
      setDateValue(today());
      setLocation("");
      setCashAmount("");
      setCheckAmount("");
      setCardAmount("");
      setReducedRateAmount("");
      setPlantSalesAmount("");
      setReadNotice(null);
    }
  }, [state]);

  // Remplit le formulaire avec une fiche lue sur la photo.
  function fillFromSheet(sheet: CashJournalSheetRead) {
    const str = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));
    // Date de la VENTE lue sur la fiche (pas la date d'aujourd'hui) : permet
    // une saisie en retard sans attribuer la recette au mauvais jour.
    setDateValue(sheet.date ?? today());
    setLocation(sheet.location ?? "");
    setCashAmount(str(sheet.cashAmount));
    setCheckAmount(isMaraichage ? str(sheet.checkAmount) : "");
    setCardAmount(isMaraichage ? str(sheet.cardAmount) : "");
    setReducedRateAmount(isMaraichage ? str(sheet.reducedRateAmount) : "");
    setPlantSalesAmount(isMaraichage ? str(sheet.plantSalesAmount) : "");
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReadNotice(null);
    setSheets([]);
    setSheetsMessage(null);
    setPhotoFile(file);
    const photoData = new FormData();
    photoData.set("photo", file);
    startReadTransition(async () => {
      const result = await extractCashJournalPhotoAmount(photoData);
      if (result.status === "error" || result.sheets.length === 0) {
        setReadNotice(result.message ?? "Lecture automatique impossible — saisis le montant toi-même.");
        return;
      }
      if (result.sheets.length > 1) {
        setSheets(result.sheets);
        setReadNotice(`${result.sheets.length} fiches trouvées sur la photo — vérifie-les ci-dessous.`);
        return;
      }
      const sheet = result.sheets[0];
      fillFromSheet(sheet);
      const notices: string[] = [];
      if (sheet.date !== null) notices.push(`date de vente lue : ${formatFrDate(sheet.date)}`);
      if (sheet.location) notices.push(`lieu lu : ${sheet.location}`);
      if (sheet.cashAmount === null && sheet.checkAmount === null && sheet.cardAmount === null) {
        notices.push("aucun montant lu");
      } else {
        notices.push("montant lu");
      }
      setReadNotice(`Lecture automatique (${notices.join(", ")}) — vérifie avant d'enregistrer.`);
    });
  }

  function saveAllSheets() {
    if (!photoFile) return;
    const data = new FormData();
    data.set("photo", photoFile);
    data.set("sheets", JSON.stringify(sheets));
    setSheetsMessage(null);
    startSheetsTransition(async () => {
      const result = await submitCashJournalSheets(activity, data);
      setSheetsMessage({ ok: result.status === "success", text: result.message });
      if (result.status === "success") {
        setSheets([]);
        setReadNotice(null);
        router.refresh();
      }
    });
  }

  const sheetTotal = (sh: CashJournalSheetRead) =>
    (sh.cashAmount ?? 0) + (isMaraichage ? (sh.checkAmount ?? 0) + (sh.cardAmount ?? 0) : 0);
  const euros = (n: number | null) => (n === null ? "—" : `${fmt(n)} €`);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-white p-4">
      <div>
        <p className="text-sm font-medium text-slate-700">Saisie du jour — vente directe</p>
        <p className="text-xs text-slate-500">
          Un seul enregistrement par jour : renvoyer ce formulaire le même
          jour met à jour la saisie précédente tant qu&apos;elle n&apos;est
          pas encore validée.
          {isMaraichage
            ? " Espèces, chèques et CB sont trois flux agrégés séparément."
            : " Espèces uniquement pour cette activité."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[12rem_1fr] sm:max-w-2xl">
        <label className="block text-sm">
          <span className="text-slate-600">
            Date <span className="text-xs text-slate-400">(de la vente)</span>
          </span>
          <input
            type="date"
            name="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">
            Lieu <span className="text-xs text-slate-400">(marché, ferme…)</span>
          </span>
          <input
            name="location"
            list="known-locations"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={100}
            placeholder="ex. Marché de Quimper"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
          <datalist id="known-locations">
            {knownLocations.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </label>
      </div>

      <div className={`grid gap-3 ${isMaraichage ? "sm:grid-cols-3" : "sm:grid-cols-1 sm:max-w-xs"}`}>
        <label className="text-sm">
          <span className="text-slate-600">Espèces (€)</span>
          <input
            type="text"
            inputMode="decimal"
            name="cashAmount"
            placeholder="0,00"
            value={cashAmount}
            onChange={(e) => setCashAmount(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        {isMaraichage && (
          <>
            <label className="text-sm">
              <span className="text-slate-600">Chèques (€)</span>
              <input
                type="text"
                inputMode="decimal"
                name="checkAmount"
                placeholder="0,00"
                value={checkAmount}
                onChange={(e) => setCheckAmount(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-slate-600">CB (€)</span>
              <input
                type="text"
                inputMode="decimal"
                name="cardAmount"
                placeholder="0,00"
                value={cardAmount}
                onChange={(e) => setCardAmount(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
          </>
        )}
      </div>

      {isMaraichage && (
        <div className="space-y-1">
          <p className="text-sm text-slate-600">
            Répartition du total par taux de TVA{" "}
            <span className="text-xs text-slate-400">— les deux parts du même total, pas des montants en plus</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2 sm:max-w-xl">
            <label className="text-sm">
              <span className="text-slate-600">Fruits / légumes 5,5 % (€)</span>
              <input
                type="text"
                inputMode="decimal"
                name="reducedRateAmount"
                placeholder="0,00"
                value={reducedRateAmount}
                onChange={(e) => setReducedRateAmount(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-slate-600">Plants potagers 10 % (€)</span>
              <input
                type="text"
                inputMode="decimal"
                name="plantSalesAmount"
                placeholder="0,00"
                value={plantSalesAmount}
                onChange={(e) => setPlantSalesAmount(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
          {splitMismatch && (
            <p className="text-xs text-red-600">
              5,5 % + 10 % = {fmt(splitTotal)} € ≠ total espèces + chèques + CB = {fmt(dayTotal)} €
            </p>
          )}
        </div>
      )}

      <label className="block text-sm sm:max-w-md">
        <span className="text-slate-600">
          Photo du jour — fiche de comptage de caisse (pas le bordereau de dépôt en banque)
        </span>
        <input
          type="file"
          name="depositSlip"
          accept="image/*,application/pdf"
          capture="environment"
          onChange={handlePhotoChange}
          className="mt-1 w-full text-sm text-slate-500"
        />
        {isReadPending && <span className="mt-1 block text-xs text-slate-400">Lecture automatique du montant…</span>}
        {readNotice && !isReadPending && <span className="mt-1 block text-xs text-amber-700">{readNotice}</span>}
      </label>

      {sheets.length > 0 && (
        <div className="space-y-2 rounded-md border border-sky-200 bg-sky-50 p-3">
          <p className="text-sm font-medium text-sky-900">
            {sheets.length > 1 ? `${sheets.length} fiches lues sur la photo` : "Fiche restante lue sur la photo"}
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="px-2 py-1">Fiche</th>
                  <th className="px-2 py-1">Date</th>
                  <th className="px-2 py-1">Lieu</th>
                  <th className="px-2 py-1 text-right">Espèces</th>
                  {isMaraichage && (
                    <>
                      <th className="px-2 py-1 text-right">Chèques</th>
                      <th className="px-2 py-1 text-right">CB</th>
                      <th className="px-2 py-1 text-right">5,5 %</th>
                      <th className="px-2 py-1 text-right">10 %</th>
                    </>
                  )}
                  <th className="px-2 py-1 text-right">Total</th>
                  <th className="px-2 py-1" />
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100">
                {sheets.map((sh, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className={`px-2 py-1 ${sh.date ? "" : "text-red-600"}`}>{sh.date ? formatFrDate(sh.date) : "date illisible"}</td>
                    <td className="px-2 py-1">{sh.location ?? "—"}</td>
                    <td className="px-2 py-1 text-right">{euros(sh.cashAmount)}</td>
                    {isMaraichage && (
                      <>
                        <td className="px-2 py-1 text-right">{euros(sh.checkAmount)}</td>
                        <td className="px-2 py-1 text-right">{euros(sh.cardAmount)}</td>
                        <td className="px-2 py-1 text-right">{euros(sh.reducedRateAmount)}</td>
                        <td className="px-2 py-1 text-right">{euros(sh.plantSalesAmount)}</td>
                      </>
                    )}
                    <td className="px-2 py-1 text-right font-medium">{fmt(sheetTotal(sh))} €</td>
                    <td className="space-x-2 whitespace-nowrap px-2 py-1 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          fillFromSheet(sh);
                          setSheets(sheets.filter((_, j) => j !== i));
                        }}
                        className="text-sky-800 underline"
                      >
                        Corriger dans le formulaire
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveAllSheets}
              disabled={isSheetsPending}
              className="rounded-md bg-sky-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {isSheetsPending
                ? "Enregistrement…"
                : sheets.length > 1
                  ? `Enregistrer ces ${sheets.length} fiches`
                  : "Enregistrer cette fiche"}
            </button>
            <span className="text-xs text-slate-500">
              Chacune devient une saisie du jour en attente de validation. « Corriger dans le formulaire » sort une
              fiche de la liste pour la modifier et l&apos;enregistrer à part.
            </span>
          </div>
        </div>
      )}
      {sheetsMessage && (
        <p className={`text-sm ${sheetsMessage.ok ? "text-emerald-700" : "text-red-600"}`}>{sheetsMessage.text}</p>
      )}

      <details className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
        <summary className="cursor-pointer font-medium text-amber-800">
          Vente exceptionnelle au-delà de 76 € (optionnel)
        </summary>
        <p className="mt-2 text-xs text-amber-800">
          La saisie globale journalière n&apos;est autorisée que pour des
          ventes unitaires ≤ 76 € (BOI-BIC-DECLA-30-30). Toute vente
          dépassant ce seuil doit être saisie ici, à part — ne l&apos;incluez
          pas dans les totaux ci-dessus.
        </p>
        <div className="mt-3 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-3">
              <input
                type="text"
                inputMode="decimal"
                name={`exceptionalAmount${i}`}
                placeholder="Montant (€)"
                className="rounded-md border border-amber-300 px-2 py-1.5 text-sm"
              />
              <select
                name={`exceptionalMethod${i}`}
                defaultValue="especes"
                className="rounded-md border border-amber-300 px-2 py-1.5 text-sm"
              >
                <option value="especes">Espèces</option>
                <option value="cheque">Chèque</option>
                <option value="cb">CB</option>
              </select>
              <input
                type="text"
                name={`exceptionalDescription${i}`}
                placeholder="Description (optionnel)"
                className="rounded-md border border-amber-300 px-2 py-1.5 text-sm"
              />
            </div>
          ))}
        </div>
      </details>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Enregistrer la saisie du jour"}
        </button>
        {state.status !== "idle" && (
          <span
            className={`text-sm ${state.status === "success" ? "text-emerald-700" : "text-red-600"}`}
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
