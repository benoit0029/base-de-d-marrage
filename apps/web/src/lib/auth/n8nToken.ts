import type { NextRequest } from "next/server";

/**
 * Vérifie le jeton partagé utilisé par tous les appels n8n → application
 * (ingestion, alertes, rapports). Voir docs/ARCHITECTURE.md — même mécanisme
 * que /api/agents/ingest depuis la phase 3, factorisé ici car réutilisé par
 * plusieurs routes en phase 5.
 */
export function isAuthorizedN8nRequest(req: NextRequest): boolean {
  const token = process.env.INGEST_API_TOKEN;
  if (!token) return false; // pas de secret configuré = endpoints fermés par défaut
  const header = req.headers.get("authorization");
  return header === `Bearer ${token}`;
}
