import Link from "next/link";
import { computeEmployerReminders, infoVisitDeadline, listChecklist, listStaff } from "@/server/services/employer";
import StaffRegister, { type StaffView } from "@/components/employer/StaffRegister";
import ChecklistItemForm from "@/components/employer/ChecklistItemForm";

export const dynamic = "force-dynamic";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const isoOrNull = (d: Date | null) => (d ? iso(d) : null);
const frDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// Onglet Employeur (Maraîchage) : ce que TESA+ ne fait pas — registre unique
// du personnel, rappels et obligations à cocher. Voir server/services/employer.
export default async function Page() {
  const [staff, checklist, reminders] = await Promise.all([listStaff(), listChecklist(), computeEmployerReminders()]);

  const staffView: StaffView[] = staff.map((s) => ({
    id: s.id,
    lastName: s.lastName,
    firstName: s.firstName,
    nationality: s.nationality,
    birthDate: iso(s.birthDate),
    sex: s.sex,
    jobTitle: s.jobTitle,
    qualification: s.qualification,
    contractType: s.contractType,
    hireDate: iso(s.hireDate),
    exitDate: isoOrNull(s.exitDate),
    workPermit: s.workPermit,
    infoVisitDoneAt: isoOrNull(s.infoVisitDoneAt),
    infoVisitDeadline: iso(infoVisitDeadline(s.hireDate)),
  }));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Obligations d&apos;employeur</p>
        <p className="mt-1 text-xs text-slate-500">
          TESA+ (MSA) fait la déclaration d&apos;embauche, le contrat, les bulletins de paie et la DSN : ces documents
          s&apos;archivent dans l&apos;onglet{" "}
          <Link href="/maraichage/tesa-plus" className="underline">
            Tesa+
          </Link>
          . Ici, le reste : registre du personnel, visite d&apos;information, DUERP, affichages, mutuelle et
          prévoyance. Obligations reprises de ton document « Obligations micro-BA », à confirmer auprès de la MSA en
          cas de doute.
        </p>
        {reminders.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm">
            {reminders.map((r, i) => (
              <li key={i} className={r.late ? "text-red-700" : "text-amber-700"}>
                • {r.label}
                {r.dueDate ? ` — avant le ${frDate(r.dueDate)}` : " — à faire"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-emerald-700">
            {staff.length === 0 ? "Aucun salarié au registre pour l'instant." : "Rien à faire en ce moment."}
          </p>
        )}
      </div>

      <StaffRegister staff={staffView} />

      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm font-medium text-slate-700">À mettre en place dès le premier salarié</p>
        {checklist.map((item) => (
          <ChecklistItemForm
            key={item.key}
            itemKey={item.key}
            label={item.label}
            hint={item.hint}
            doneAt={isoOrNull(item.doneAt)}
            note={item.note}
          />
        ))}
      </div>
    </div>
  );
}
