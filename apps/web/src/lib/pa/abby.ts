// Client pour la Plateforme Agréée Abby (facturation électronique).
//
// ⚠️ IMPORTANT — À CONFIRMER AVANT UTILISATION EN PRODUCTION :
// docs.abby.fr et abby.fr sont inaccessibles depuis l'environnement où ce
// code a été écrit (proxy réseau restrictif). Les endpoints, le format des
// requêtes/réponses et le niveau d'abonnement requis pour l'accès API
// ci-dessous sont donc une best-effort basée sur des recherches indirectes,
// PAS une lecture de la documentation officielle. Avant le premier envoi
// réel : se connecter à https://docs.abby.fr avec le compte Abby, vérifier
// les chemins exacts (probablement sous api.abby.fr ou app.abby.fr/api),
// l'en-tête d'authentification (Bearer vs clé API dédiée) et le schéma JSON
// attendu pour une facture, puis ajuster ce fichier en conséquence.
//
// Ce qu'on sait avec un peu plus de confiance (recherches croisées) :
// - Abby a un plan gratuit à vie (devis/factures illimités, conforme
//   facturation électronique 2026) ; l'accès à l'API REST générale semble
//   dépendre du plan (Solo 5,99€/mois ou Pro 11,99€/mois selon les sources,
//   avec des informations contradictoires sur si le plan gratuit y donne
//   aussi accès) — à vérifier directement dans l'espace développeur Abby.
// - Abby expose par ailleurs une API "Tiers de Prestation" distincte, pour
//   l'avance immédiate de crédit d'impôt URSSAF — sans rapport avec l'envoi
//   de factures électroniques, ne pas confondre les deux.

const API_BASE = process.env.ABBY_API_BASE_URL ?? "https://api.abby.fr/v1";

export class AbbyApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly body: string) {
    super(message);
  }
}

async function abbyFetch(apiKey: string, pathname: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AbbyApiError(`Appel Abby ${pathname} en échec (${res.status})`, res.status, text);
  }

  return res.json().catch(() => ({}));
}

/**
 * Test de connexion : endpoint exact à confirmer (placeholder /me). Doit
 * simplement échouer proprement (401/404) si la clé ou le chemin sont
 * invalides plutôt que de planter l'appelant.
 */
export async function testAbbyConnection(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await abbyFetch(apiKey, "/me");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export interface AbbyInvoicePayload {
  number: string;
  type: "invoice" | "quote";
  issueDate: string; // YYYY-MM-DD
  dueDate?: string;
  client: { name: string; address?: string };
  lines: Array<{ description: string; quantity: number; unitPrice: number; vatRate: number }>;
  totalHt: number;
  totalVat: number;
  totalTtc: number;
  vatApplicable: boolean;
}

export interface AbbySendResult {
  externalId: string;
}

/**
 * Transmet une facture/devis à Abby. Schéma du corps de requête à confirmer
 * contre la documentation réelle — la forme ci-dessous est une hypothèse
 * raisonnable (champs explicites, types simples), pas une certitude.
 */
export async function sendInvoiceToAbby(
  apiKey: string,
  invoice: AbbyInvoicePayload
): Promise<AbbySendResult> {
  const json = await abbyFetch(apiKey, "/invoices", {
    method: "POST",
    body: JSON.stringify(invoice),
  });

  const externalId = json.id ?? json.invoiceId;
  if (typeof externalId !== "string") {
    throw new AbbyApiError("Réponse Abby inattendue (pas d'identifiant renvoyé)", 0, JSON.stringify(json));
  }

  return { externalId };
}
