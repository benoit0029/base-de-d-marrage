"use server";

import { ZodError } from "zod";
import {
  extractImportedDocument,
  TESA_DOCUMENT_TYPES,
  type ImportedDocumentKind,
} from "@/lib/mistral/agents";
import { MistralApiError, MistralConfigError } from "@/lib/mistral/client";

export interface ImportedDocumentReadResult {
  status: "ok" | "error";
  date: string | null;
  amount: number | null;
  period: string | null;
  category: string | null;
  dueLabel: string | null;
  message?: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PERIOD_RE = /^\d{4}-\d{2}$/;
const DUE_LABEL_RE = /^(\d{4}-T[1-4]|Régularisation annuelle \d{4})$/;

const EMPTY = { date: null, amount: null, period: null, category: null, dueLabel: null };

/**
 * Lecture automatique d'un document importé dans Tesa+, Cotisations non
 * salarié ou Acompte TVA, pour pré-remplir le formulaire — pure lecture,
 * rien n'est enregistré ici. Chaque champ lu est revérifié (format) avant
 * d'être proposé : une valeur douteuse est ignorée plutôt que pré-remplie.
 */
export async function readImportedDocument(
  kind: ImportedDocumentKind,
  formData: FormData
): Promise<ImportedDocumentReadResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", ...EMPTY, message: "Aucun fichier reçu." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const r = await extractImportedDocument(buffer, file.type || "application/pdf", kind);
    return {
      status: "ok",
      date: r.date && ISO_DATE_RE.test(r.date) ? r.date : null,
      amount: r.amount !== null && Number.isFinite(r.amount) && r.amount >= 0 ? r.amount : null,
      period: r.period && PERIOD_RE.test(r.period) ? r.period : null,
      category:
        r.category && (TESA_DOCUMENT_TYPES as readonly string[]).includes(r.category) ? r.category : null,
      dueLabel: r.dueLabel && DUE_LABEL_RE.test(r.dueLabel) ? r.dueLabel : null,
    };
  } catch (err) {
    if (err instanceof MistralConfigError || err instanceof MistralApiError || err instanceof ZodError || err instanceof SyntaxError) {
      return {
        status: "error",
        ...EMPTY,
        message: "Lecture automatique impossible — remplis les champs toi-même.",
      };
    }
    throw err;
  }
}
