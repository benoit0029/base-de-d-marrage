import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { computeBaThreshold, computeBicThresholds, levelFor } from "@/lib/thresholds";
import { computeAnnualTvaDeclaration, TVA_INSTALLMENT_THRESHOLD } from "@/lib/tva";

const DEDUP_WINDOW_HOURS = 24;

// Exportée pour être réutilisée par les alertes Kerbooth 360°
// (server/services/kerbooth/alerts.ts) — même mécanisme de déduplication,
// pas de raison d'en écrire un second.
export async function alreadyNotifiedIds(type: string, tenantId: string): Promise<Set<string>> {
  const since = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000);
  const logs = await prisma.notificationLog.findMany({
    where: { tenantId, type, sentAt: { gte: since } },
    select: { payload: true },
  });
  const ids = logs
    .map((l) => (l.payload as { entityId?: string } | null)?.entityId)
    .filter((id): id is string => Boolean(id));
  return new Set(ids);
}

/**
 * Agent de suivi/alerte — écritures laissées "en attente" trop longtemps.
 * Ne renvoie (et ne notifie) que les écritures pas déjà signalées dans les
 * dernières 24h, pour que le workflow n8n (déclenché plusieurs fois par
 * jour) n'envoie pas le même rappel en boucle.
 */
export async function checkPendingEntriesTooLong(minDays = 3) {
  const tenantId = await getDefaultTenantId();
  const threshold = new Date(Date.now() - minDays * 24 * 60 * 60 * 1000);

  const [candidates, notified] = await Promise.all([
    prisma.entry.findMany({
      where: { tenantId, status: "PENDING", createdAt: { lte: threshold } },
      orderBy: { createdAt: "asc" },
    }),
    alreadyNotifiedIds("ENTRY_PENDING_TOO_LONG", tenantId),
  ]);

  const toNotify = candidates.filter((e) => !notified.has(e.id));

  if (toNotify.length > 0) {
    await prisma.notificationLog.createMany({
      data: toNotify.map((e) => ({
        tenantId,
        channel: "N8N",
        type: "ENTRY_PENDING_TOO_LONG",
        payload: { entityId: e.id, activity: e.activity, nature: e.nature, createdAt: e.createdAt },
      })),
    });
  }

  return toNotify.map((e) => ({
    entryId: e.id,
    activity: e.activity,
    type: e.type,
    counterpartyName: e.counterpartyName,
    nature: e.nature,
    amountTtc: Number(e.amountTtc),
    pendingSinceDays: Math.floor((Date.now() - e.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
  }));
}

/** Anomalies du pipeline : documents dont le traitement a échoué. */
export async function checkFailedDocuments() {
  const tenantId = await getDefaultTenantId();

  const [candidates, notified] = await Promise.all([
    prisma.document.findMany({
      where: { tenantId, status: "FAILED" },
      include: { extractionJobs: { where: { status: "FAILED" }, orderBy: { startedAt: "desc" }, take: 1 } },
      orderBy: { receivedAt: "desc" },
    }),
    alreadyNotifiedIds("DOCUMENT_FAILED", tenantId),
  ]);

  const toNotify = candidates.filter((d) => !notified.has(d.id));

  if (toNotify.length > 0) {
    await prisma.notificationLog.createMany({
      data: toNotify.map((d) => ({
        tenantId,
        channel: "N8N",
        type: "DOCUMENT_FAILED",
        payload: { entityId: d.id, source: d.source, receivedAt: d.receivedAt },
      })),
    });
  }

  return toNotify.map((d) => ({
    documentId: d.id,
    source: d.source,
    emailFrom: d.emailFrom,
    receivedAt: d.receivedAt,
    failedStep: d.extractionJobs[0]?.step ?? null,
    error: d.extractionJobs[0]?.error ?? null,
  }));
}

/** Seuils passés en vigilance/dépassement, non notifiés dans les dernières 24h. */
export async function checkThresholdAlerts() {
  const tenantId = await getDefaultTenantId();
  const currentYear = new Date().getFullYear();

  const [bic, ba, tvaInstallmentsEnabled, currentYearTva, notified] = await Promise.all([
    computeBicThresholds(),
    computeBaThreshold(),
    prisma.activitySettings
      .findUnique({
        where: { tenantId_activity: { tenantId, activity: "BA_MARAICHAGE" } },
        select: { tvaInstallmentsEnabled: true },
      })
      .then((s) => s?.tvaInstallmentsEnabled ?? true),
    computeAnnualTvaDeclaration(currentYear),
    alreadyNotifiedIds("THRESHOLD_ALERT", tenantId),
  ]);

  const checks = [
    { key: "franchise-vente", ...bic.franchiseVente },
    { key: "franchise-service", ...bic.franchiseService },
    { key: "plafond-mixte", ...bic.plafondGlobalMixte },
    { key: "ba-moyenne-triennale", ...ba.check },
    // Bascule du seuil de dispense d'acomptes TVA (art. 1693 bis du CGI,
    // voir lib/tva) : seulement pertinent tant que les acomptes sont encore
    // désactivés dans Réglages — une fois activés, plus rien à signaler.
    ...(!tvaInstallmentsEnabled
      ? [
          {
            key: "tva-acomptes-seuil",
            label: `Seuil de dispense des acomptes TVA (Maraîchage, ${currentYear})`,
            caCumule: currentYearTva.netVat,
            seuil: TVA_INSTALLMENT_THRESHOLD,
            level: levelFor(currentYearTva.netVat, TVA_INSTALLMENT_THRESHOLD),
          },
        ]
      : []),
  ];

  const alerting = checks.filter((c) => c.level !== "ok" && !notified.has(c.key));

  if (alerting.length > 0) {
    await prisma.notificationLog.createMany({
      data: alerting.map((c) => ({
        tenantId,
        channel: "N8N",
        type: "THRESHOLD_ALERT",
        payload: { entityId: c.key, label: c.label, level: c.level, caCumule: c.caCumule, seuil: c.seuil },
      })),
    });
  }

  return alerting.map(({ key, ...c }) => c);
}
