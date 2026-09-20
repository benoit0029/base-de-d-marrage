import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";

// Unités physiques (photobooth + iPhone associé, même nom collé en sticker
// sur les deux — voir kerbooth360/feuille-de-route). Phase 1 : Benoît seul,
// 2 unités attendues, gérées ici comme un simple réglage (voir Réglages),
// pas comme un flux n8n — se fait une fois, jamais au fil de l'eau.
export async function listUnits() {
  const tenantId = await getDefaultTenantId();
  return prisma.kerboothUnit.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } });
}

export class KerboothUnitError extends Error {}

export async function createUnit(label: string, baseLocation: string, ownerLabel = "Benoît") {
  const tenantId = await getDefaultTenantId();
  const trimmed = label.trim();
  if (!trimmed) throw new KerboothUnitError("Le nom de l'unité est obligatoire.");
  return prisma.kerboothUnit.create({
    data: { tenantId, label: trimmed, baseLocation: baseLocation.trim(), ownerLabel },
  });
}

export async function setUnitActive(id: string, active: boolean) {
  return prisma.kerboothUnit.update({ where: { id }, data: { active } });
}

export async function updateUnit(id: string, label: string, baseLocation: string) {
  const trimmedLabel = label.trim();
  if (!trimmedLabel) throw new KerboothUnitError("Le nom de l'unité est obligatoire.");
  return prisma.kerboothUnit.update({
    where: { id },
    data: { label: trimmedLabel, baseLocation: baseLocation.trim() },
  });
}
