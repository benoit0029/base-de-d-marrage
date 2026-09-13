# Déploiement

Ce document sera complété en phase 6 (déploiement sur le VPS Hostinger,
sous-domaine dédié, Caddy, 2FA, sauvegardes). Pour l'instant, il documente
uniquement ce qui est nécessaire pour faire tourner le pipeline de la phase 3
en local.

## Développement local (phase 3)

Prérequis : Node.js 22, Docker (ou un PostgreSQL local).

```bash
cd apps/web
cp ../../.env.example .env   # puis ajuster DATABASE_URL si besoin
npm install

# Base de données
docker compose -f ../../docker-compose.yml up -d db
npm run db:migrate     # applique prisma/migrations
npm run db:seed        # données de démonstration (sans appeler Mistral)

npm run dev            # http://localhost:3000
```

Variables à renseigner dans `apps/web/.env` pour tester le pipeline IA de bout
en bout (capture → extraction → classement) :

- `MISTRAL_API_KEY` — voir « Créer une clé API Mistral » ci-dessous.
- `INGEST_API_TOKEN` — un secret que vous choisissez, exigé par
  `/api/agents/ingest` (appelé par n8n en phase 5). Sans clé Mistral valide,
  le pipeline s'arrête proprement à l'étape d'extraction et le document est
  marqué `FAILED` avec le message d'erreur exact — c'est le comportement
  normal tant que la clé n'est pas configurée.

Le formulaire « Ajouter une facture ou un reçu » dans l'application (onglets
Recettes/Achats) n'utilise pas ce jeton : il appelle le pipeline directement
via une Server Action Next.js, réservée à l'utilisateur déjà dans l'app.

### Créer une clé API Mistral

À détailler pas à pas en phase 6 avec des copies d'écran. En résumé :
1. Créer un compte sur [console.mistral.ai](https://console.mistral.ai).
2. Générer une clé API dans la section « API Keys ».
3. La coller dans `MISTRAL_API_KEY` (jamais dans le code, jamais commitée).

## n8n, PA et alertes (phase 5)

- Workflows n8n : voir `n8n/workflows/README.md` pour l'import et la
  checklist de vérification (non testés en conditions réelles depuis cette
  session, voir docs/ARCHITECTURE.md §8).
- Connexion Abby : à configurer depuis Réglages (clé API), pas en `.env`.
  Le client (`src/lib/pa/abby.ts`) a des endpoints à confirmer contre
  `docs.abby.fr` — inaccessible depuis cette session, voir ARCHITECTURE.md.
- `APP_ENCRYPTION_KEY` (chiffrement des mots de passe IMAP et de la clé PA)
  doit être générée une fois (`openssl rand -base64 32`) et ne jamais
  changer ensuite.

## VPS Hostinger (phase 6)

À rédiger : sous-domaine, bloc Caddy, build de l'image Docker de `apps/web`,
variables d'environnement de production, 2FA, sauvegardes chiffrées vers un
stockage S3-compatible séparé, test de restauration.
