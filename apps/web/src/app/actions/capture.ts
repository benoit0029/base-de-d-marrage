"use server";

import { revalidatePath } from "next/cache";
import { ingestDocument } from "@/server/services/pipeline";
import type { Activity } from "@prisma/client";

const activityBasePath: Record<Activity, string> = {
  BA_MARAICHAGE: "/maraichage",
  BIC_FRUITS_LEGUMES: "/fruits-legumes",
  BIC_PHOTOBOOTH: "/photobooth",
};

export interface CaptureState {
  status: "idle" | "success" | "noise" | "error";
  message: string;
}

// Appelée directement depuis le formulaire de capture (photo/upload manuel) de
// l'application — pas d'appel HTTP, donc pas besoin du jeton qui protège
// /api/agents/ingest (réservé aux appelants externes comme n8n).
export async function captureDocument(
  _prevState: CaptureState,
  formData: FormData
): Promise<CaptureState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choisissez d'abord un fichier ou une photo." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await ingestDocument({
    source: "PHOTO",
    fileBuffer: buffer,
    mimeType: file.type || "application/octet-stream",
    originalName: file.name,
  });

  if (result.ignoredAsNoise) {
    return { status: "noise", message: "Document ignoré (jugé non pertinent par l'agent de tri)." };
  }

  if (result.failedStep) {
    return {
      status: "error",
      message: `Échec à l'étape ${result.failedStep} : ${result.errorMessage}`,
    };
  }

  if (result.entry) {
    const base = activityBasePath[result.entry.activity];
    revalidatePath(`${base}/recettes`);
    revalidatePath(`${base}/achats`);
    revalidatePath("/synthese");

    return {
      status: "success",
      message: `Écriture créée (${result.entry.activity} / ${result.entry.type}), en attente de validation.`,
    };
  }

  return { status: "error", message: "Résultat inattendu du pipeline." };
}
