import { prisma } from "@/server/db/client";

const DEFAULT_TENANT_NAME = "Exploitation (v1)";

let cachedTenantId: string | null = null;

// V1 est mono-tenant : une seule ligne Tenant existe, créée au premier accès.
// Toute la logique métier passe déjà par tenantId pour rester prête pour la v2 multi-client.
export async function getDefaultTenantId(): Promise<string> {
  if (cachedTenantId) return cachedTenantId;

  const existing = await prisma.tenant.findFirst();
  if (existing) {
    cachedTenantId = existing.id;
    return existing.id;
  }

  const created = await prisma.tenant.create({
    data: { name: DEFAULT_TENANT_NAME },
  });
  cachedTenantId = created.id;
  return created.id;
}
