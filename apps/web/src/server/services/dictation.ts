import { transcribeInvoiceDictation } from "@/lib/mistral/agents";

export async function transcribeAndStructureInvoice(buffer: Buffer, mimeType: string) {
  const { structured } = await transcribeInvoiceDictation(buffer, mimeType);
  return {
    clientName: structured.clientName ?? undefined,
    lines: structured.lines,
  };
}
