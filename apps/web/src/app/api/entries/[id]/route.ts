import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  EntryAlreadyValidatedError,
  EntryNotFoundError,
  correctEntry,
} from "@/server/services/entries";

const patchSchema = z.object({
  date: z.string().optional(),
  counterpartyName: z.string().min(1).optional(),
  nature: z.string().min(1).optional(),
  amountHt: z.number().optional(),
  amountVat: z.number().optional(),
  amountTtc: z.number().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = patchSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  try {
    const entry = await correctEntry(id, null, body.data);
    return NextResponse.json({ entry });
  } catch (err) {
    if (err instanceof EntryNotFoundError) {
      return NextResponse.json({ error: "Écriture introuvable" }, { status: 404 });
    }
    if (err instanceof EntryAlreadyValidatedError) {
      return NextResponse.json({ error: "Écriture verrouillée (déjà validée)" }, { status: 409 });
    }
    throw err;
  }
}
