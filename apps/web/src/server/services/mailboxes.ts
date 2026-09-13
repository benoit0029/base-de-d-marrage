import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { testImapConnection } from "@/lib/mailbox/imapTest";
import type { Activity } from "@prisma/client";

const ALL_ACTIVITIES: Activity[] = ["BA_MARAICHAGE", "BIC_FRUITS_LEGUMES", "BIC_PHOTOBOOTH"];

export async function listMailboxConnections() {
  const tenantId = await getDefaultTenantId();
  const existing = await prisma.mailboxConnection.findMany({ where: { tenantId } });
  const byActivity = new Map(existing.map((m) => [m.activity, m]));

  return ALL_ACTIVITIES.map(
    (activity) =>
      byActivity.get(activity) ?? {
        id: "",
        tenantId,
        activity,
        imapHost: null,
        imapPort: 993,
        imapUser: null,
        imapPasswordEncrypted: null,
        status: "NOT_TESTED",
        lastError: null,
        lastTestedAt: null,
        updatedAt: new Date(),
      }
  );
}

export interface MailboxInput {
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword?: string; // vide = conserver le mot de passe déjà enregistré
}

/**
 * Enregistre les identifiants puis teste la connexion immédiatement (le mot
 * de passe n'est jamais renvoyé au navigateur ensuite, seul le statut l'est).
 */
export async function saveAndTestMailboxConnection(activity: Activity, input: MailboxInput) {
  const tenantId = await getDefaultTenantId();

  const existing = await prisma.mailboxConnection.findUnique({
    where: { tenantId_activity: { tenantId, activity } },
  });

  const imapPasswordEncrypted = input.imapPassword
    ? encryptSecret(input.imapPassword)
    : existing?.imapPasswordEncrypted;

  if (!imapPasswordEncrypted) {
    throw new Error("Mot de passe IMAP requis pour la première configuration.");
  }

  const testPassword = input.imapPassword ?? decryptSecret(imapPasswordEncrypted);
  const result = await testImapConnection({
    host: input.imapHost,
    port: input.imapPort,
    user: input.imapUser,
    password: testPassword,
  });

  return prisma.mailboxConnection.upsert({
    where: { tenantId_activity: { tenantId, activity } },
    update: {
      imapHost: input.imapHost,
      imapPort: input.imapPort,
      imapUser: input.imapUser,
      imapPasswordEncrypted,
      status: result.ok ? "CONNECTED" : "ERROR",
      lastError: result.error ?? null,
      lastTestedAt: new Date(),
    },
    create: {
      tenantId,
      activity,
      imapHost: input.imapHost,
      imapPort: input.imapPort,
      imapUser: input.imapUser,
      imapPasswordEncrypted,
      status: result.ok ? "CONNECTED" : "ERROR",
      lastError: result.error ?? null,
      lastTestedAt: new Date(),
    },
  });
}
