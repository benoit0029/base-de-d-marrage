import { z } from "zod";
import { chatJson, ocrExtract, transcribeAudio } from "@/lib/mistral/client";

// ---------------------------------------------------------------------------
// Agent de veille email : filtre le bruit (newsletters, spam) avant extraction.
// ---------------------------------------------------------------------------

const emailTriageSchema = z.object({
  relevant: z.boolean(),
  reason: z.string(),
});

export async function classifyEmailRelevance(params: {
  subject: string;
  from: string;
}): Promise<z.infer<typeof emailTriageSchema>> {
  const raw = await chatJson({
    system:
      "Tu tries les emails d'une boîte dédiée à la réception de factures et reçus " +
      "pour une micro-entreprise agricole. Réponds uniquement en JSON avec les clés " +
      '"relevant" (booléen : true si cet email contient probablement une facture, un reçu ' +
      "ou une pièce comptable à traiter) et \"reason\" (courte explication en français).",
    user: `Expéditeur : ${params.from}\nObjet : ${params.subject}`,
  });

  return emailTriageSchema.parse(raw);
}

// ---------------------------------------------------------------------------
// Agent d'extraction : OCR du document + structuration des champs comptables.
// ---------------------------------------------------------------------------

const extractedFieldsSchema = z.object({
  date: z.string().nullable(), // format ISO 8601 (YYYY-MM-DD) si trouvée
  amountHt: z.number().nullable(),
  amountVat: z.number().nullable(),
  amountTtc: z.number().nullable(),
  counterpartyName: z.string().nullable(),
  nature: z.string().nullable(),
  documentType: z.enum(["facture", "recu", "devis", "autre"]),
});

export type ExtractedFields = z.infer<typeof extractedFieldsSchema>;

export async function extractDocumentFields(
  buffer: Buffer,
  mimeType: string
): Promise<{ ocrText: string; fields: ExtractedFields }> {
  const ocr = await ocrExtract(buffer, mimeType);

  const raw = await chatJson({
    system:
      "Tu extrais les champs comptables d'une facture, d'un reçu ou d'un devis à partir " +
      "de son texte OCR. Réponds uniquement en JSON avec les clés : " +
      '"date" (YYYY-MM-DD ou null), "amountHt" (nombre ou null), "amountVat" (nombre ou null), ' +
      '"amountTtc" (nombre ou null), "counterpartyName" (nom du fournisseur ou client, ou null), ' +
      '"nature" (courte description de la nature de l\'achat/vente, ou null), ' +
      '"documentType" ("facture", "recu", "devis" ou "autre"). ' +
      "Si un montant TTC est visible mais pas le HT/TVA, calcule-les seulement si le taux de TVA est explicite, sinon laisse-les à null.",
    user: ocr.fullText.slice(0, 12000),
  });

  return { ocrText: ocr.fullText, fields: extractedFieldsSchema.parse(raw) };
}

// ---------------------------------------------------------------------------
// Agent de lecture de recette : lit le montant du jour sur une photo de
// comptage de caisse (manuscrit ou ticket Z), pour pré-remplir la saisie du
// jour du journal de caisse (vente directe) sans ressaisie manuelle — voir
// server/actions/cashJournal.ts. L'exploitant n'y note jamais le fond de
// caisse fixe (30 €), qui n'a donc pas besoin d'être isolé ici.
// ---------------------------------------------------------------------------

const cashJournalAmountSchema = z.object({
  cashAmount: z.number().nullable(),
  checkAmount: z.number().nullable(),
});

export type CashJournalAmountExtraction = z.infer<typeof cashJournalAmountSchema>;

export async function extractCashJournalAmount(
  buffer: Buffer,
  mimeType: string
): Promise<CashJournalAmountExtraction> {
  const ocr = await ocrExtract(buffer, mimeType);

  const raw = await chatJson({
    system:
      "Tu lis une photo de comptage de caisse (manuscrit ou ticket de caisse imprimé) pour la " +
      "recette d'UNE SEULE journée de vente directe (marché, vente à la ferme). Réponds " +
      'uniquement en JSON avec les clés "cashAmount" (montant en espèces de la recette du jour, ' +
      'nombre ou null si absent/illisible) et "checkAmount" (montant en chèques du jour, nombre ' +
      "ou null si absent/non applicable). N'invente aucun montant : si tu ne peux pas lire un " +
      "chiffre avec certitude, réponds null pour ce champ plutôt que de deviner.",
    user: ocr.fullText.slice(0, 2000),
  });

  return cashJournalAmountSchema.parse(raw);
}

// ---------------------------------------------------------------------------
// Agent de classement/ventilation : détermine l'activité et le type d'écriture.
// ---------------------------------------------------------------------------

const classificationSchema = z.object({
  activity: z.enum(["BA_MARAICHAGE", "BIC_FRUITS_LEGUMES", "BIC_PHOTOBOOTH"]),
  entryType: z.enum(["RECETTE", "ACHAT", "IMMOBILISATION"]),
  confidence: z.number().min(0).max(1),
});

export type Classification = z.infer<typeof classificationSchema>;

export async function classifyActivityAndType(params: {
  fields: ExtractedFields;
  ocrText: string;
}): Promise<Classification> {
  const raw = await chatJson({
    system:
      "Tu ventiles une pièce comptable pour un exploitant qui a 3 activités dans la même " +
      "micro-entreprise sauf le maraîchage qui est une exploitation agricole distincte (micro-BA) : " +
      "1) BA_MARAICHAGE : maraîchage bio (semences, matériel agricole, ventes de légumes en direct, marchés) ; " +
      "2) BIC_FRUITS_LEGUMES : revente de fruits/légumes achetés à des grossistes ; " +
      "3) BIC_PHOTOBOOTH : location d'un photobooth \"Kerbooth 360°\" pour événements (mariages, entreprises). " +
      "Détermine aussi le type d'écriture : RECETTE (vente), ACHAT (dépense courante) ou " +
      "IMMOBILISATION (matériel durable de valeur significative). " +
      'Réponds uniquement en JSON avec les clés "activity", "entryType" et "confidence" (0 à 1).',
    user: `Champs extraits : ${JSON.stringify(params.fields)}\n\nTexte du document :\n${params.ocrText.slice(0, 4000)}`,
  });

  return classificationSchema.parse(raw);
}

const entryTypeSchema = z.object({
  entryType: z.enum(["RECETTE", "ACHAT", "IMMOBILISATION"]),
  confidence: z.number().min(0).max(1),
});

export type EntryTypeClassification = z.infer<typeof entryTypeSchema>;

/**
 * Variante allégée utilisée quand l'activité est déjà connue avec quasi-
 * certitude (boîte mail dédiée à l'activité — voir pipeline.ts) : on ne
 * redemande pas à l'IA de deviner l'activité, seulement le type d'écriture.
 */
export async function classifyEntryType(params: {
  fields: ExtractedFields;
  ocrText: string;
  activityHint: "BA_MARAICHAGE" | "BIC_FRUITS_LEGUMES" | "BIC_PHOTOBOOTH";
}): Promise<EntryTypeClassification> {
  const raw = await chatJson({
    system:
      `Cette pièce comptable concerne à coup sûr l'activité ${params.activityHint} ` +
      "(reçue sur la boîte mail dédiée à cette activité). Détermine seulement le type " +
      "d'écriture : RECETTE (vente), ACHAT (dépense courante) ou IMMOBILISATION " +
      "(matériel durable de valeur significative). " +
      'Réponds uniquement en JSON avec les clés "entryType" et "confidence" (0 à 1).',
    user: `Champs extraits : ${JSON.stringify(params.fields)}\n\nTexte du document :\n${params.ocrText.slice(0, 4000)}`,
  });

  return entryTypeSchema.parse(raw);
}

// ---------------------------------------------------------------------------
// Saisie vocale des devis/factures : transcription (Voxtral) puis structuration
// en lignes, qui alimentent le même formulaire de validation que la saisie
// manuelle (voir src/app/actions/invoices.ts).
// ---------------------------------------------------------------------------

const invoiceDictationSchema = z.object({
  clientName: z.string().nullable(),
  lines: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().positive(),
      unitPrice: z.number().nonnegative(),
    })
  ),
});

export type InvoiceDictation = z.infer<typeof invoiceDictationSchema>;

export async function transcribeInvoiceDictation(
  buffer: Buffer,
  mimeType: string
): Promise<{ transcript: string; structured: InvoiceDictation }> {
  const transcript = await transcribeAudio(buffer, mimeType, "dictation");

  const raw = await chatJson({
    system:
      "Tu structures une dictée orale en lignes de devis/facture pour une micro-entreprise " +
      "agricole. Réponds uniquement en JSON avec les clés \"clientName\" (nom du client cité, " +
      "ou null si absent) et \"lines\" (tableau d'objets \"description\", \"quantity\" (nombre), " +
      "\"unitPrice\" (prix unitaire HT en euros, nombre)). Déduis les quantités/prix explicitement " +
      "cités ; si un prix total est donné pour plusieurs unités, calcule le prix unitaire.",
    user: transcript,
  });

  return { transcript, structured: invoiceDictationSchema.parse(raw) };
}
