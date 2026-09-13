// Client bas niveau pour l'API Mistral (OCR + chat completions).
// Référence : https://docs.mistral.ai/capabilities/document_ai/ (OCR) et
// https://docs.mistral.ai/api/ (chat completions). À revérifier lors du
// déploiement (phase 6) si l'API a évolué depuis l'écriture de ce client.

const API_BASE = "https://api.mistral.ai/v1";
const OCR_MODEL = process.env.MISTRAL_OCR_MODEL ?? "mistral-ocr-latest";
const CHAT_MODEL = process.env.MISTRAL_CHAT_MODEL ?? "mistral-small-latest";
const TRANSCRIPTION_MODEL = process.env.MISTRAL_TRANSCRIPTION_MODEL ?? "voxtral-mini-latest";

export class MistralConfigError extends Error {}
export class MistralApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly body: string) {
    super(message);
  }
}

function getApiKey(): string {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) {
    throw new MistralConfigError(
      "MISTRAL_API_KEY n'est pas configurée. Voir docs/DEPLOYMENT.md pour créer une clé."
    );
  }
  return key;
}

async function mistralFetch(pathname: string, body: unknown) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new MistralApiError(
      `Appel Mistral ${pathname} en échec (${res.status})`,
      res.status,
      text
    );
  }

  return res.json();
}

export interface OcrPage {
  index: number;
  markdown: string;
}

export interface OcrResult {
  pages: OcrPage[];
  fullText: string;
}

export async function ocrExtract(buffer: Buffer, mimeType: string): Promise<OcrResult> {
  const base64 = buffer.toString("base64");
  const isPdf = mimeType === "application/pdf";
  const document = isPdf
    ? { type: "document_url", document_url: `data:${mimeType};base64,${base64}` }
    : { type: "image_url", image_url: `data:${mimeType};base64,${base64}` };

  const json = await mistralFetch("/ocr", {
    model: OCR_MODEL,
    document,
  });

  const pages: OcrPage[] = (json.pages ?? []).map((p: { index: number; markdown: string }) => ({
    index: p.index,
    markdown: p.markdown,
  }));

  return {
    pages,
    fullText: pages.map((p) => p.markdown).join("\n\n"),
  };
}

export async function chatJson(params: {
  system: string;
  user: string;
}): Promise<unknown> {
  const json = await mistralFetch("/chat/completions", {
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new MistralApiError("Réponse Mistral inattendue (pas de contenu JSON)", 0, JSON.stringify(json));
  }

  return JSON.parse(content);
}

/**
 * Transcription vocale (modèle Voxtral) pour la saisie dictée des devis/
 * factures. Référence : https://docs.mistral.ai/capabilities/audio/ — à
 * revérifier lors du déploiement si l'API a évolué.
 */
export async function transcribeAudio(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  const form = new FormData();
  form.append("model", TRANSCRIPTION_MODEL);
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);

  const res = await fetch(`${API_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getApiKey()}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new MistralApiError(`Appel Mistral /audio/transcriptions en échec (${res.status})`, res.status, text);
  }

  const json = await res.json();
  if (typeof json.text !== "string") {
    throw new MistralApiError("Réponse de transcription inattendue", 0, JSON.stringify(json));
  }
  return json.text;
}
