import { NextRequest, NextResponse } from "next/server";
import {
  TvaInstallmentLockedError,
  TvaInstallmentNotFoundError,
  deleteTvaInstallment,
} from "@/server/services/tvaInstallments";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await deleteTvaInstallment(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TvaInstallmentNotFoundError) {
      return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
    }
    if (err instanceof TvaInstallmentLockedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
