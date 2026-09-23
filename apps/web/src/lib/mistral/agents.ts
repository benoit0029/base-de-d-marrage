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
  // Date de la VENTE notée sur la photo (pas la date de la photo elle-même)
  // — l'exploitant peut enregistrer en retard (ex. vente le 25/07, photo/
  // saisie le 27/07) : sans lecture de cette date, l'appli attribuerait la
  // recette au jour de la saisie plutôt qu'au jour réel de vente, ce qui
  // fausserait le livre de recettes (BOI-BIC-DECLA-30-10, obligation
  // jour par jour).
  date: z.string().nullable(), // format ISO 8601 (YYYY-MM-DD) ou null si absente
  cashAmount: z.number().nullable(),
  checkAmount: z.number().nullable(),
  // Part DÉJÀ INCLUSE dans cashAmount/checkAmount (pas un montant en plus)
  // correspondant à de la vente de plants (Maraîchage, taxée à 10% plutôt
  // que 5,5% pour les fruits/légumes) — voir CashJournalEntry.plantSalesAmount.
  plantSalesAmount: z.number().nullable(),
});

export type CashJournalAmountExtraction = z.infer<typeof cashJournalAmountSchema>;

export async function extractCashJournalAmount(
  buffer: Buffer,
  mimeType: string
): Promise<CashJournalAmountExtraction> {
  const ocr = await ocrExtract(buffer, mimeType);
  const today = new Date().toISOString().slice(0, 10);

  const raw = await chatJson({
    system:
      "Tu lis une photo de comptage de caisse (manuscrit ou ticket de caisse imprimé) pour la " +
      "recette d'UNE SEULE journée de vente directe (marché, vente à la ferme). Réponds " +
      'uniquement en JSON avec les clés "date" (date de la VENTE écrite sur la photo, au format ' +
      'YYYY-MM-DD, ou null si aucune date n\'y est notée — ne mets JAMAIS la date d\'aujourd\'hui ' +
      'par défaut, laisse null si tu ne la vois pas), "cashAmount" (montant en espèces de la ' +
      'recette du jour, nombre ou null si absent/illisible), "checkAmount" (montant en chèques ' +
      'du jour, nombre ou null si absent/non applicable) et "plantSalesAmount" (part de vente de ' +
      "plants DÉJÀ INCLUSE dans cashAmount/checkAmount, PAS un montant en plus — nombre ou null si " +
      "aucune vente de plants n'est mentionnée ce jour-là). Si une date est écrite sans année " +
      `(ex. "25/07"), déduis l'année à partir d'aujourd'hui (${today}) : année en cours, sauf si ` +
      "cela donnerait une date dans le futur, auquel cas année précédente. N'invente aucun montant " +
      "ni aucune date : si tu ne peux pas lire un champ avec certitude, réponds null pour ce champ " +
      "plutôt que de deviner.",
    user: ocr.fullText.slice(0, 2000),
  });

  return cashJournalAmountSchema.parse(raw);
}

// Même principe pour la part CB (Maraîchage uniquement) : lue sur la capture
// d'écran de l'appli bancaire Up2Pay plutôt que sur la photo de comptage de
// caisse ci-dessus — deux justificatifs, deux sources distinctes.
const cardStatementAmountSchema = z.object({
  cardAmount: z.number().nullable(),
});

export type CardStatementAmountExtraction = z.infer<typeof cardStatementAmountSchema>;

export async function extractCardStatementAmount(
  buffer: Buffer,
  mimeType: string
): Promise<CardStatementAmountExtraction> {
  const ocr = await ocrExtract(buffer, mimeType);

  const raw = await chatJson({
    system:
      "Tu lis une capture d'écran de l'application bancaire Up2Pay (terminal de paiement par " +
      "carte) pour trouver le total encaissé par carte bancaire sur UNE SEULE journée de vente " +
      'directe. Réponds uniquement en JSON avec la clé "cardAmount" (montant total CB du jour, ' +
      "nombre ou null si absent/illisible). N'invente aucun montant : si tu ne peux pas lire un " +
      "chiffre avec certitude, réponds null plutôt que de deviner.",
    user: ocr.fullText.slice(0, 2000),
  });

  return cardStatementAmountSchema.parse(raw);
}

// ---------------------------------------------------------------------------
// Agent de lecture des documents importés hors Dépenses (Tesa+, appel de
// cotisation MSA, justificatif d'acompte TVA) : pré-remplit date/montant (et
// selon le cas période, type de document ou échéance) — l'exploitant vérifie
// avant d'enregistrer, rien n'est enregistré par cet agent.
// ---------------------------------------------------------------------------

export type ImportedDocumentKind = "tesa" | "cotisation_msa" | "acompte_tva";

export const TESA_DOCUMENT_TYPES = [
  "TESA_CONTRAT",
  "TESA_BULLETIN_PAIE",
  "TESA_COTISATIONS_SALARIALES",
  "TESA_CERTIFICAT_TRAVAIL",
  "TESA_ATTESTATION_POLE_EMPLOI",
  "TESA_SOLDE_TOUT_COMPTE",
] as const;

const importedDocumentSchema = z.object({
  date: z.string().nullable(),
  amount: z.number().nullable(),
  period: z.string().nullable(),
  category: z.string().nullable(), // validé contre TESA_DOCUMENT_TYPES par l'appelant
  dueLabel: z.string().nullable(),
});

export type ImportedDocumentExtraction = z.infer<typeof importedDocumentSchema>;

const KIND_INSTRUCTIONS: Record<ImportedDocumentKind, string> = {
  tesa:
    "Le document est un document TESA+ (MSA) lié à un salarié agricole : contrat, bulletin de paie, " +
    "récapitulatif de cotisations salariales, certificat de travail, attestation Pôle Emploi/France " +
    'Travail ou solde de tout compte. "date" = date d\'émission du document ; "amount" = montant ' +
    "total à payer ou net versé s'il y en a un (null pour un contrat ou un certificat sans montant) ; " +
    '"period" = mois concerné au format YYYY-MM (ex. mois de paie), ou null ; "category" = l\'une des ' +
    `valeurs ${TESA_DOCUMENT_TYPES.join(", ")} selon le type de document, ou null si incertain ; ` +
    '"dueLabel" = null.',
  cotisation_msa:
    "Le document est un appel de cotisations sociales MSA de l'exploitant agricole non salarié. " +
    '"date" = date d\'émission de l\'appel ; "amount" = montant total à payer ; "period" = période ' +
    "couverte au format YYYY-MM (premier mois de la période si elle en couvre plusieurs), ou null ; " +
    '"category" = null ; "dueLabel" = null.',
  acompte_tva:
    "Le document est un justificatif de paiement de TVA (accusé de paiement impots.gouv.fr, avis de " +
    'prélèvement ou relevé). "date" = date du paiement ; "amount" = montant payé ; "dueLabel" = ' +
    'l\'échéance concernée au format "YYYY-Tn" (trimestre, ex. "2026-T3") s\'il s\'agit d\'un acompte ' +
    'trimestriel, ou "Régularisation annuelle YYYY" s\'il s\'agit du solde de la déclaration annuelle ' +
    '(CA12A/3517-AGR-SD), ou null si incertain ; "period" = null ; "category" = null.',
};

export async function extractImportedDocument(
  buffer: Buffer,
  mimeType: string,
  kind: ImportedDocumentKind
): Promise<ImportedDocumentExtraction> {
  const ocr = await ocrExtract(buffer, mimeType);

  const raw = await chatJson({
    system:
      "Tu lis un document administratif d'une exploitation agricole pour pré-remplir un formulaire. " +
      KIND_INSTRUCTIONS[kind] +
      ' Réponds uniquement en JSON avec les clés "date" (YYYY-MM-DD ou null), "amount" (nombre ou ' +
      'null), "period", "category" et "dueLabel". N\'invente rien : si un champ est absent ou illisible, ' +
      "réponds null pour ce champ plutôt que de deviner.",
    user: ocr.fullText.slice(0, 6000),
  });

  return importedDocumentSchema.parse(raw);
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
