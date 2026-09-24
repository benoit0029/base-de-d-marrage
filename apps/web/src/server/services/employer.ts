import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";

// Onglet Employeur (Maraîchage) : registre unique du personnel, rappels et
// obligations à cocher. Contenu repris du document « Obligations micro-BA »
// de Benoît (non relu directement sur le code du travail depuis l'outil).

export const CHECKLIST_ITEMS = [
  {
    key: "duerp",
    label: "Document unique d'évaluation des risques (DUERP)",
    hint: "Obligatoire dès le 1er salarié ; à mettre à jour à chaque changement important ou nouveau risque connu (pas de mise à jour annuelle obligatoire sous 11 salariés).",
  },
  {
    key: "affichages",
    label: "Affichages obligatoires",
    hint: "Informations à afficher sur le lieu de travail (inspection du travail, médecine du travail, horaires…) — vérifier la liste à jour auprès de la MSA.",
  },
  {
    key: "mutuelle",
    label: "Mutuelle du salarié",
    hint: "Dès l'embauche — convention collective de la production agricole (IDCC 7024).",
  },
  {
    key: "prevoyance",
    label: "Prévoyance (salariés agricoles non cadres, Bretagne)",
    hint: "Dès l'embauche — accord régional de prévoyance des salariés agricoles de Bretagne.",
  },
] as const;

export type ChecklistKey = (typeof CHECKLIST_ITEMS)[number]["key"];

export interface StaffInput {
  lastName: string;
  firstName: string;
  nationality: string;
  birthDate: Date;
  sex: string;
  jobTitle: string;
  qualification?: string;
  contractType: string;
  hireDate: Date;
  exitDate?: Date | null;
  workPermit?: string;
  infoVisitDoneAt?: Date | null;
}

export async function listStaff() {
  const tenantId = await getDefaultTenantId();
  return prisma.staffRegisterEntry.findMany({ where: { tenantId }, orderBy: { hireDate: "asc" } });
}

export async function saveStaff(id: string | undefined, input: StaffInput) {
  const tenantId = await getDefaultTenantId();
  const data = {
    ...input,
    qualification: input.qualification || null,
    workPermit: input.workPermit || null,
    exitDate: input.exitDate ?? null,
    infoVisitDoneAt: input.infoVisitDoneAt ?? null,
  };
  if (id) {
    const existing = await prisma.staffRegisterEntry.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error("Salarié introuvable.");
    return prisma.staffRegisterEntry.update({ where: { id }, data });
  }
  return prisma.staffRegisterEntry.create({ data: { tenantId, ...data } });
}

export async function deleteStaff(id: string) {
  const tenantId = await getDefaultTenantId();
  await prisma.staffRegisterEntry.deleteMany({ where: { id, tenantId } });
}

export async function listChecklist() {
  const tenantId = await getDefaultTenantId();
  const rows = await prisma.employerChecklistItem.findMany({ where: { tenantId } });
  return CHECKLIST_ITEMS.map((item) => {
    const row = rows.find((r) => r.key === item.key);
    return { ...item, doneAt: row?.doneAt ?? null, note: row?.note ?? null };
  });
}

export async function saveChecklistItem(key: ChecklistKey, doneAt: Date | null, note: string | null) {
  const tenantId = await getDefaultTenantId();
  await prisma.employerChecklistItem.upsert({
    where: { tenantId_key: { tenantId, key } },
    create: { tenantId, key, doneAt, note },
    update: { doneAt, note },
  });
}

// Visite d'information et de prévention : dans les 3 mois suivant la prise
// de poste.
export function infoVisitDeadline(hireDate: Date): Date {
  const d = new Date(hireDate);
  d.setMonth(d.getMonth() + 3);
  return d;
}

export interface EmployerReminder {
  label: string;
  dueDate: Date | null;
  late: boolean;
}

// Rappels en cours : visites d'information à faire, obligations pas encore
// cochées alors qu'au moins un salarié figure au registre.
export async function computeEmployerReminders(today = new Date()): Promise<EmployerReminder[]> {
  const [staff, checklist] = await Promise.all([listStaff(), listChecklist()]);
  const reminders: EmployerReminder[] = [];
  for (const s of staff) {
    if (s.infoVisitDoneAt || s.exitDate) continue;
    const due = infoVisitDeadline(s.hireDate);
    reminders.push({
      label: `Visite d'information et de prévention — ${s.firstName} ${s.lastName}`,
      dueDate: due,
      late: due < today,
    });
  }
  if (staff.length > 0) {
    for (const item of checklist) {
      if (!item.doneAt) reminders.push({ label: item.label, dueDate: null, late: true });
    }
  }
  return reminders;
}
