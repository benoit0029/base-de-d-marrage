import { prisma } from "@/server/db/client";

// Historique de l'appli (AuditLog) : conservé 10 ans — durée de conservation
// conseillée des pièces comptables des activités commerciales (6 ans pour le
// fiscal agricole), décision de Benoît du 24/09/2026. Au-delà, les lignes sont
// effacées automatiquement (voir instrumentation.ts) : jamais plus récentes.
export const AUDIT_LOG_RETENTION_YEARS = 10;

export async function purgeOldAuditLogs(now = new Date()): Promise<number> {
  const limit = new Date(now);
  limit.setFullYear(limit.getFullYear() - AUDIT_LOG_RETENTION_YEARS);
  const { count } = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: limit } } });
  return count;
}
