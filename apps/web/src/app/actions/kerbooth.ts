"use server";

import { revalidatePath } from "next/cache";
import { createUnit, setUnitActive, KerboothUnitError } from "@/server/services/kerbooth/units";

export interface KerboothUnitFormState {
  status: "idle" | "success" | "error";
  message: string;
}

export async function submitKerboothUnit(
  _prev: KerboothUnitFormState,
  formData: FormData
): Promise<KerboothUnitFormState> {
  const label = formData.get("label")?.toString() ?? "";
  const baseLocation = formData.get("baseLocation")?.toString() ?? "";

  try {
    await createUnit(label, baseLocation);
  } catch (err) {
    if (err instanceof KerboothUnitError) {
      return { status: "error", message: err.message };
    }
    throw err;
  }

  revalidatePath("/reglages");
  return { status: "success", message: "Unité ajoutée." };
}

export async function toggleKerboothUnitAction(unitId: string, active: boolean): Promise<void> {
  await setUnitActive(unitId, active);
  revalidatePath("/reglages");
}
