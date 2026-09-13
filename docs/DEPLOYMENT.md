# Déploiement

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

### 1. Prérequis sur le VPS

Docker + Docker Compose et Caddy déjà en place (utilisés par n8n). Rien
d'autre à installer pour l'application elle-même — `aws-cli` et `openssl`
sont nécessaires uniquement pour les sauvegardes (§5).

### 2. Récupérer le code

```bash
git clone <url-du-dépôt> compta-ferme
cd compta-ferme
```

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env               # POSTGRES_* lues par docker-compose.yml
cp .env.example apps/web/.env      # variables applicatives
```

Éditer les deux fichiers. Valeurs à générer une fois et ne **jamais**
changer ensuite (les secrets déjà chiffrés avec deviendraient illisibles) :

```bash
openssl rand -base64 32   # → SESSION_SECRET
openssl rand -base64 32   # → APP_ENCRYPTION_KEY
openssl rand -base64 32   # → INGEST_API_TOKEN
openssl rand -base64 32   # → BACKUP_ENCRYPTION_PASSPHRASE
```

`APP_URL` doit être le sous-domaine définitif (ex.
`https://compta.exemple.fr`) — à me communiquer si tu veux que je l'inscrive
en dur quelque part, mais il n'y en a nul besoin : tout le code le lit
depuis cette variable.

`POSTGRES_PASSWORD` doit être identique dans `.env` (racine) et repris dans
`DATABASE_URL` de `apps/web/.env` (voir commentaires dans `.env.example`).

### 4. Lancer l'application

```bash
docker compose up -d --build
docker compose logs -f app   # vérifier que la migration + le démarrage se passent bien
```

Le conteneur `app` applique automatiquement les migrations Prisma au
démarrage (`prisma migrate deploy`, voir `apps/web/Dockerfile`) — aucune
commande manuelle à lancer pour ça.

### 5. Sous-domaine et Caddy

Ajouter le bloc de `Caddyfile.snippet` (racine du dépôt) au Caddyfile
existant du VPS, en remplaçant `compta.example.fr` par le sous-domaine réel,
puis recharger Caddy (`systemctl reload caddy` ou équivalent selon
l'installation). HTTPS est automatique (Let's Encrypt via Caddy).

### 6. Premier accès : créer le compte + activer la 2FA

Ouvrir `https://<sous-domaine>/` : redirige automatiquement vers `/setup`
tant qu'aucun compte n'existe. Un seul compte est autorisé en v1 — la 2FA
(scanner le QR code avec une app d'authentification) est obligatoire avant
de pouvoir utiliser l'outil, pas une option à activer plus tard.

**Ici, il faudra que tu te connectes toi-même** pour créer ce compte (email
+ mot de passe de ton choix) et scanner le QR code — c'est une étape qui ne
peut pas être automatisée à ta place, pour des raisons évidentes de
sécurité.

### 7. Réglages restants (indépendants, dans n'importe quel ordre)

Depuis l'onglet Réglages de l'application :
- Identité de la micro-entreprise, logos, code AB par activité.
- Les 3 boîtes mail de capture (IMAP), testées immédiatement à
  l'enregistrement.
- Connexion à la Plateforme Agréée (Abby).

Puis, sur l'instance n8n existante du VPS : importer les workflows de
`n8n/workflows/` (voir son README pour la checklist de vérification —
credentials IMAP/SMTP à créer dans n8n, variables d'environnement n8n à
définir).

### 8. Sauvegardes chiffrées (obligatoire avant de basculer en production)

**Il te faudra créer un compte** chez un fournisseur de stockage
S3-compatible **distinct du VPS applicatif** (ex. Scaleway Object Storage,
OVH Object Storage, Backblaze B2 — quelques centimes/mois pour ce volume) et
me transmettre : endpoint, nom du bucket, clé d'accès et secret. Une fois
renseignés dans `.env` (`BACKUP_S3_*`) :

```bash
# Sauvegarde manuelle (à tester une première fois) :
set -a; source .env; set +a
./scripts/backup.sh
```

Puis planifier une exécution quotidienne, par exemple avec cron :

```bash
crontab -e
# ajouter :
0 3 * * * cd /chemin/vers/compta-ferme && set -a && . .env && set +a && ./scripts/backup.sh >> /var/log/compta-backup.log 2>&1
```

**Test de restauration à faire dès la mise en place**, sur une base de
test (jamais directement sur la production) :

```bash
set -a; source .env; set +a
./scripts/restore.sh /chemin/vers/db-XXXXX.sql.enc /chemin/vers/files-XXXXX.tar.gz.enc
```

Documenter la date et le résultat de ce test quelque part (ex. ce fichier,
ou un simple fichier `RESTORE_LOG.md`) : une sauvegarde jamais restaurée ne
garantit rien.

### Ce qui reste hors de portée de cette session

- Le nom de domaine et le sous-domaine définitifs.
- La création effective du compte utilisateur + scan du QR code 2FA (étape
  volontairement manuelle).
- Le compte de stockage S3-compatible pour les sauvegardes.
- L'import et la vérification des workflows n8n sur l'instance réelle.
- La confirmation de l'accès API Abby (voir docs/ARCHITECTURE.md §8).
