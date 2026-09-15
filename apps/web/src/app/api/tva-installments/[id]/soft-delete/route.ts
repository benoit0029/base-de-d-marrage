import { NextRequest, NextResponse } from "next/server";
import {
  TvaInstallmentNotFoundError,
  TvaInstallmentNotValidatedError,
  softDeleteTvaInstallment,
} from "@/server/services/tvaInstallments";
import { FiscalYearClosedError } from "@/server/services/fiscalYearClosure";
import { getCurrentUserId } from "@/lib/auth/currentUser";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  try {
    await softDeleteTvaInstallment(id, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TvaInstallmentNotFoundError) {
      return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
    }
    if (err instanceof TvaInstallmentNotValidatedError || err instanceof FiscalYearClosedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
