import { purgeOldAuditLogs } from "@/server/services/auditLogRetention";

// Tâches de fond du serveur (Node.js uniquement) : effacement de l'historique
// de plus de 10 ans au démarrage puis une fois par jour. Jamais bloquant :
// une erreur (ex. base pas encore prête) est seulement journalisée.
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function runPurge() {
  try {
    const count = await purgeOldAuditLogs();
    if (count > 0) console.log(`[historique] ${count} ligne(s) de plus de 10 ans effacée(s).`);
  } catch (err) {
    console.error("[historique] effacement automatique impossible :", err);
  }
}

void runPurge();
setInterval(runPurge, ONE_DAY_MS).unref();
