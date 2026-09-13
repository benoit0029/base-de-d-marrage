import { ImapFlow } from "imapflow";

export interface ImapCredentials {
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface ImapTestResult {
  ok: boolean;
  error?: string;
}

/**
 * Test de connexion immédiat déclenché depuis Réglages : se connecte,
 * s'authentifie, puis se déconnecte — ne lit ni ne modifie aucun message.
 */
export async function testImapConnection(creds: ImapCredentials): Promise<ImapTestResult> {
  const client = new ImapFlow({
    host: creds.host,
    port: creds.port,
    secure: true,
    auth: { user: creds.user, pass: creds.password },
    logger: false,
  });

  try {
    await client.connect();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  } finally {
    try {
      await client.logout();
    } catch {
      // déjà déconnecté / jamais connecté : rien à faire
    }
  }
}
