# Architecture — Outil de comptabilité auto-hébergé (Phase 1)

Statut : **proposition à valider**, aucune logique métier codée à ce stade.

## 1. Contexte figé pour cette phase

- Le code applicatif est développé et poussé sur ce dépôt (branche `claude/nice-allen-01aafu`) ; le déploiement sur le VPS Hostinger (Docker + Caddy existant + n8n existant) sera fait manuellement par l'exploitant à partir de ce dépôt (guide fourni en phase 6).
- Sous-domaine définitif non choisi → tout est paramétré par variables d'environnement, valeur d'exemple `compta.example.fr` dans `.env.example`. Rien n'est codé en dur.
- PA de facturation électronique : **Abby** (plan gratuit), à intégrer en phase 5. L'intégration passe par un client HTTP isolé (`lib/pa/`) pour pouvoir changer de PA plus tard sans toucher au reste.
- Clé API Mistral : pas encore créée. Le guide de déploiement (phase 6) inclura les étapes de création de compte + génération de clé + dépôt dans `.env` chiffré.

## 2. Stack technique retenue

| Brique | Choix | Pourquoi |
|---|---|---|
| Frontend + backend | **Next.js 16 (App Router, TypeScript)** — voir §7 | Un seul codebase pour l'UI, les API routes et les server actions (formulaire de saisie vocale/manuelle unifié). Bon support PWA. Facile à conteneuriser. |
| Base de données | **PostgreSQL 16** | Robuste, gère bien les montants (types `numeric`), supporte le futur multi-tenant. |
| ORM | **Prisma** | Schéma typé, migrations versionnées, lisible pour un futur relecteur non-dev. |
| Authentification | Auth maison (credentials + session cookie signé) + **2FA TOTP** (`otplib`) | Un seul compte en v1, pas besoin d'un provider OAuth ; le TOTP est obligatoire dès la création du compte. |
| Génération PDF (factures/devis) | **@react-pdf/renderer** | Un moteur de template unique piloté par des données JSON (couleur d'accent, logo, mentions), pas de navigateur headless à maintenir dans le conteneur. |
| IA / OCR / extraction | **API Mistral** (OCR + chat completion) via `lib/mistral/` | Déjà décidé dans le besoin fonctionnel. Clé en variable d'environnement chiffrée, jamais en dur. |
| Orchestration périphérique | **n8n existant**, nouveaux workflows isolés dans `n8n/workflows/` | Réutilise l'instance déjà en place sur le VPS, pas de nouveau service à maintenir. |
| Reverse proxy | **Caddy existant** | Nouveau bloc de config pour le sous-domaine, fourni en `Caddyfile.snippet`, à fusionner manuellement dans le Caddyfile de prod. |
| Conteneurisation | **Docker + docker-compose** | `docker-compose.yml` (app + db) pensé pour un déploiement "un client = une stack", zéro valeur codée en dur (tout via `.env`). |
| Stockage fichiers (factures, pièces jointes) | Volume Docker local en v1, **compatible S3** via variables d'environnement (`STORAGE_ENDPOINT`, `STORAGE_BUCKET`) | Permet de brancher un bucket S3-compatible séparé en phase 6 (sauvegardes) sans changer le code. |

## 3. Structure de dossiers proposée

```
base-de-d-marrage/
├── apps/
│   └── web/
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/                 # connexion + 2FA
│       │   │   ├── (dashboard)/
│       │   │   │   ├── maraichage/         # BA : recettes, achats, TVA, paie, 2042, CA12A, factures
│       │   │   │   ├── fruits-legumes/     # BIC : recettes, achats, factures, seuils
│       │   │   │   ├── photobooth/         # BIC : recettes, achats, factures, seuils
│       │   │   │   ├── synthese/           # CA cumulé BIC, alertes seuils, 2042 C PRO
│       │   │   │   └── reglages/           # identité, logos, code AB, connexion PA
│       │   │   └── api/
│       │   │       ├── agents/             # webhooks n8n : ingestion email/photo, extraction, classement, alertes
│       │   │       └── pa/                 # callbacks Abby
│       │   ├── components/
│       │   ├── lib/
│       │   │   ├── mistral/                # client OCR + classification
│       │   │   ├── pa/                     # client Abby (isolé, remplaçable)
│       │   │   ├── pdf/                    # moteur de template unique factures/devis
│       │   │   ├── thresholds/             # calcul seuils micro-BA / micro-BIC
│       │   │   └── audit/                  # journal d'audit
│       │   ├── server/
│       │   │   ├── services/               # logique métier (écritures, factures, seuils)
│       │   │   └── db/                     # client Prisma
│       │   └── styles/
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── public/                         # manifest PWA, icônes, logo AB
│       ├── Dockerfile
│       └── package.json
├── n8n/
│   └── workflows/                          # export JSON des workflows dédiés (veille email, relances, alertes)
├── docker-compose.yml
├── docker-compose.prod.yml
├── Caddyfile.snippet
├── .env.example
└── docs/
    ├── ARCHITECTURE.md                     # ce document
    ├── DEPLOYMENT.md                       # rempli en phase 6
    └── USER_GUIDE.md                       # rempli en phase 7
```

## 4. Principes de conception pour la ré-utilisabilité (v2 multi-client)

- Toutes les tables métier portent un `tenant_id` (une seule ligne dans `tenants` en v1).
- L'identité de l'exploitant, les logos, le code AB et les mentions légales vivent en **base de données** (`activity_settings`, `company_settings`), modifiables depuis Réglages — jamais codés en dur dans le code source.
- Seuls les secrets (clé Mistral, identifiants DB, clé API PA, secret de session) vivent en `.env`.
- Un seul moteur de rendu PDF paramétré par activité (couleur, logo, mentions), pas un template par activité.

## 5. Schéma de base de données (proposition)

Voir `prisma/schema.prisma`. Résumé des entités :

- **tenants** — support multi-client futur (1 ligne en v1).
- **users** — compte(s) applicatif(s), hash de mot de passe, secret TOTP.
- **audit_log** — qui a validé/modifié quoi, quand, avant/après.
- **company_settings** — identité globale (nom, adresse, SIREN, TVA intracom).
- **activity_settings** — un enregistrement par activité (BA_MARAICHAGE, BIC_FRUITS, BIC_PHOTOBOOTH) : logo, couleur d'accent, code organisme certificateur AB (nullable, format `FR-BIO-XX`), mentions légales spécifiques.
- **documents** — toute pièce entrante (email, photo, upload) avant/après traitement IA.
- **extraction_jobs** — trace de chaque étape des 4 agents (veille email, OCR, classement, résultat).
- **entries** — écritures (recette / achat / immobilisation) par activité, statut `pending` → `validated` (verrouillée après validation).
- **invoices** / **invoice_lines** — factures et devis, moteur unique, activable par activité.
- **payroll_employees** / **payslips** — volet paie du salarié (micro-BA).
- **tva_declarations** — échéancier acomptes TVA / CA12A.
- **threshold_snapshots** — suivi périodique des seuils (BIC combiné, plafonds).
- **pa_connections** — connexion à la PA (Abby), clé API chiffrée.
- **notification_log** — traçabilité des rappels/alertes envoyés via n8n/email.

## 6. Points ouverts pour la suite (pas bloquants pour valider la phase 1)

1. Nom de domaine définitif → à fournir avant la phase 6 (déploiement).
2. Compte Abby + clé API → à créer avant la phase 5.
3. Compte Mistral AI + clé API → guide fourni en phase 6, à créer par l'exploitant.
4. Emplacement/taille exacte du logo AB sur les factures → configurable (pas figé), à valider avec le guide INAO avant la phase 4.
5. Facturation active par défaut sur Revente Fruits/Légumes (facture par vente vs ticket agrégé) → décision à prendre avant activation en phase 4, moteur déjà prévu pour supporter les deux.

---

**Validation attendue avant de passer à la phase 2** (squelette d'interface) : stack, structure de dossiers et schéma de données ci-dessus + dans `prisma/schema.prisma`.

## 7. Ajustements faits en cours de route

- **Next.js 16.3.5** (et non 15) : la 15.1.6 initialement prévue avait une CVE
  critique (RCE, GHSA-9qr9-h5gf-34mp) ; la 16 stable est la première version
  saine disponible au moment de coder la phase 2.
- **Prisma 6.19.3** (et non 7) : Prisma 7 supprime `url = env(...)` dans le
  schéma au profit d'un système de « driver adapters » configuré dans
  `prisma.config.ts`, encore très récent. La 6.x reste stable, documentée et
  suffisante pour ce projet (mono-instance, PostgreSQL uniquement) ; à
  reconsidérer plus tard si un besoin (ex. edge runtime) le justifie.
  `prisma/schema.prisma` vit dans `apps/web/prisma/` (et non à la racine du
  dépôt comme esquissé en phase 1), au même endroit que le reste de l'app.
- **Endpoint `/api/agents/ingest` protégé par jeton** (`INGEST_API_TOKEN`) :
  cet endpoint sera appelé par n8n depuis l'extérieur du conteneur applicatif
  dès la phase 5, avant que l'authentification utilisateur (phase 6) existe.
  Un jeton partagé simple évite de le laisser ouvert à toute requête externe
  en attendant. La capture depuis l'application elle-même (formulaire photo/
  upload) n'utilise pas cet endpoint HTTP : elle appelle le pipeline via une
  Server Action Next.js, qui ne nécessite pas d'exposer ce secret au
  navigateur.
