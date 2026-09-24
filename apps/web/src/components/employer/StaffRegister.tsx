"use client";

import { useActionState, useState, useTransition } from "react";
import { removeStaff, submitStaff, type EmployerFormState } from "@/app/actions/employer";

export interface StaffView {
  id: string;
  lastName: string;
  firstName: string;
  nationality: string;
  birthDate: string; // AAAA-MM-JJ
  sex: string;
  jobTitle: string;
  qualification: string | null;
  contractType: string;
  hireDate: string;
  exitDate: string | null;
  workPermit: string | null;
  infoVisitDoneAt: string | null;
  infoVisitDeadline: string;
}

const initialState: EmployerFormState = { status: "idle", message: "" };
const frDay = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const input = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2";

// Registre unique du personnel : formulaire d'ajout/modification + tableau
// dans l'ordre des embauches.
export default function StaffRegister({ staff }: { staff: StaffView[] }) {
  const [editing, setEditing] = useState<StaffView | null>(null);
  const [state, formAction, pending] = useActionState(submitStaff, initialState);
  const [removeMessage, setRemoveMessage] = useState<EmployerFormState | null>(null);
  const [removing, startRemove] = useTransition();
  const shown = removeMessage ?? state;

  function handleRemove(s: StaffView) {
    if (
      !window.confirm(
        `Retirer ${s.firstName} ${s.lastName} du registre ? À faire seulement pour une ligne saisie par erreur : le registre doit être conservé 5 ans après le départ du salarié.`
      )
    )
      return;
    startRemove(async () => setRemoveMessage(await removeStaff(s.id)));
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-sm font-medium text-slate-700">Registre unique du personnel</p>
      <p className="mt-1 text-xs text-slate-500">
        Une ligne par salarié, à remplir à chaque embauche (et la date de sortie au départ). À conserver 5 ans après
        le départ du salarié.
      </p>

      <form
        action={(fd) => {
          setRemoveMessage(null);
          formAction(fd);
        }}
        key={editing?.id ?? "new"}
        className="mt-3 grid gap-3 sm:grid-cols-3"
      >
        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <label className="text-sm">
          <span className="text-slate-600">Nom *</span>
          <input name="lastName" defaultValue={editing?.lastName} required className={input} />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Prénom(s) *</span>
          <input name="firstName" defaultValue={editing?.firstName} required className={input} />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Nationalité *</span>
          <input name="nationality" defaultValue={editing?.nationality ?? "Française"} required className={input} />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Date de naissance *</span>
          <input type="date" name="birthDate" defaultValue={editing?.birthDate} required className={input} />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Sexe *</span>
          <select name="sex" defaultValue={editing?.sex ?? ""} required className={input}>
            <option value="" disabled>
              —
            </option>
            <option value="F">Femme</option>
            <option value="M">Homme</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Emploi *</span>
          <input name="jobTitle" defaultValue={editing?.jobTitle ?? "Ouvrier maraîcher"} required className={input} />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Qualification</span>
          <input name="qualification" defaultValue={editing?.qualification ?? ""} className={input} />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Type de contrat *</span>
          <input name="contractType" defaultValue={editing?.contractType ?? "CDD saisonnier"} required className={input} />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Titre de travail (salarié étranger)</span>
          <input name="workPermit" defaultValue={editing?.workPermit ?? ""} placeholder="Type et n°" className={input} />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Date d&apos;embauche *</span>
          <input type="date" name="hireDate" defaultValue={editing?.hireDate ?? today} required className={input} />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Date de sortie</span>
          <input type="date" name="exitDate" defaultValue={editing?.exitDate ?? ""} className={input} />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Visite d&apos;information faite le</span>
          <input type="date" name="infoVisitDoneAt" defaultValue={editing?.infoVisitDoneAt ?? ""} className={input} />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Enregistrement…" : editing ? "Mettre à jour" : "Ajouter au registre"}
          </button>
          {editing && (
            <button type="button" onClick={() => setEditing(null)} className="text-sm text-slate-500 underline">
              Annuler la modification
            </button>
          )}
          {shown.status !== "idle" && (
            <span className={`text-sm ${shown.status === "success" ? "text-emerald-700" : "text-red-600"}`}>
              {shown.message}
            </span>
          )}
        </div>
      </form>

      {staff.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-left uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2">Nom, prénom</th>
                <th className="px-2 py-2">Nationalité</th>
                <th className="px-2 py-2">Naissance</th>
                <th className="px-2 py-2">Sexe</th>
                <th className="px-2 py-2">Emploi / qualification</th>
                <th className="px-2 py-2">Contrat</th>
                <th className="px-2 py-2">Entrée</th>
                <th className="px-2 py-2">Sortie</th>
                <th className="px-2 py-2">Visite d&apos;info</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((s) => (
                <tr key={s.id}>
                  <td className="px-2 py-1.5 font-medium">
                    {s.lastName} {s.firstName}
                    {s.workPermit && <span className="block text-slate-400">Titre : {s.workPermit}</span>}
                  </td>
                  <td className="px-2 py-1.5">{s.nationality}</td>
                  <td className="px-2 py-1.5">{frDay(s.birthDate)}</td>
                  <td className="px-2 py-1.5">{s.sex}</td>
                  <td className="px-2 py-1.5">
                    {s.jobTitle}
                    {s.qualification && <span className="block text-slate-400">{s.qualification}</span>}
                  </td>
                  <td className="px-2 py-1.5">{s.contractType}</td>
                  <td className="px-2 py-1.5">{frDay(s.hireDate)}</td>
                  <td className="px-2 py-1.5">{frDay(s.exitDate)}</td>
                  <td className="px-2 py-1.5">
                    {s.infoVisitDoneAt ? (
                      <span className="text-emerald-700">faite le {frDay(s.infoVisitDoneAt)}</span>
                    ) : (
                      <span className={s.infoVisitDeadline < today ? "text-red-600" : "text-amber-700"}>
                        avant le {frDay(s.infoVisitDeadline)}
                      </span>
                    )}
                  </td>
                  <td className="space-x-2 whitespace-nowrap px-2 py-1.5 text-right">
                    <button type="button" onClick={() => setEditing(s)} className="text-slate-600 underline">
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(s)}
                      disabled={removing}
                      className="text-red-600 underline disabled:opacity-50"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
