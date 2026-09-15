import { NextRequest, NextResponse } from "next/server";
import {
  TvaInstallmentAlreadyValidatedError,
  TvaInstallmentNotFoundError,
  validateTvaInstallment,
} from "@/server/services/tvaInstallments";
import { getCurrentUserId } from "@/lib/auth/currentUser";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  try {
    const item = await validateTvaInstallment(id, userId);
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof TvaInstallmentNotFoundError) {
      return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
    }
    if (err instanceof TvaInstallmentAlreadyValidatedError) {
      return NextResponse.json({ error: "Paiement déjà validé" }, { status: 409 });
    }
    throw err;
  }
}
