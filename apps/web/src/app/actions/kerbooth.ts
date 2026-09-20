"use server";

import { revalidatePath } from "next/cache";
import { createUnit, setUnitActive, updateUnit, KerboothUnitError } from "@/server/services/kerbooth/units";

export interface KerboothUnitFormState {
  status: "idle" | "success" | "error";
  message: string;
}

export async function submitKerboothUnit(
  _prev: KerboothUnitFormState,
  formData: FormData
): Promise<KerboothUnitFormState> {
  const id = formData.get("id")?.toString() || undefined;
  const label = formData.get("label")?.toString() ?? "";
  const baseLocation = formData.get("baseLocation")?.toString() ?? "";

  try {
    if (id) {
      await updateUnit(id, label, baseLocation);
    } else {
      await createUnit(label, baseLocation);
    }
  } catch (err) {
    if (err instanceof KerboothUnitError) {
      return { status: "error", message: err.message };
    }
    throw err;
  }

  revalidatePath("/reglages");
  return { status: "success", message: id ? "Unité modifiée." : "Unité ajoutée." };
}

export async function toggleKerboothUnitAction(unitId: string, active: boolean): Promise<void> {
  await setUnitActive(unitId, active);
  revalidatePath("/reglages");
}
