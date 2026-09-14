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
- **3 boîtes mail de capture, une par activité** (et non une boîte unique) :
  configurées et testées depuis Réglages (modèle `MailboxConnection`), pas
  fixées en dur dans `.env` au déploiement — au même titre que l'identité et
  la connexion PA. Le mot de passe IMAP est chiffré avant stockage
  (`src/lib/crypto.ts`, AES-256-GCM, clé `APP_ENCRYPTION_KEY`) et
  l'enregistrement déclenche un test de connexion immédiat
  (`src/lib/mailbox/imapTest.ts`, via `imapflow`). Chaque boîte sera
  surveillée par son propre workflow n8n en phase 5 ; la boîte d'origine
  (`mailboxActivity`) est transmise à `/api/agents/ingest` et stockée sur
  `Document.sourceMailboxActivity` : l'agent de classement l'utilise
  directement (elle est quasi certaine) au lieu de deviner l'activité depuis
  le contenu — seul le type d'écriture (recette/achat/immobilisation) reste
  à déterminer par l'IA dans ce cas (`classifyEntryType` dans
  `lib/mistral/agents.ts`). L'adresse dédiée mentionnée par ailleurs pour
  l'envoi des PDF/notifications reste une boîte séparée, utilisée uniquement
  en émission (configurée en variables d'environnement `SMTP_*`, plus simple
  car elle ne nécessite pas de test interactif ni de credentials par
  activité).

## 8. Phase 5 — PA (Abby), workflows n8n, alertes

- **Intégration Abby non finalisable à distance** : `docs.abby.fr`,
  `abby.fr` et le forum communautaire Abby sont inaccessibles depuis
  l'environnement où ce code a été écrit (proxy réseau restrictif). Le
  client (`src/lib/pa/abby.ts`) est donc construit sur une hypothèse
  raisonnable des endpoints (`POST /invoices`, `GET /me`) et du format de
  requête, **clairement marquée comme à confirmer** contre la documentation
  réelle avant le premier envoi effectif. Recherches croisées (comparatifs
  tiers, pas la doc officielle) : Abby a un plan gratuit à vie (devis/
  factures illimités, conforme facturation électronique 2026) ; l'accès à
  l'API générale semble lié à un plan payant (Solo 5,99€/mois ou Pro
  11,99€/mois, environ 9-15€/mois en engagement annuel) selon certaines
  sources, gratuit selon d'autres — à vérifier directement. Abby reste le
  choix le plus adapté parmi les PA orientées auto-entrepreneur comparées :
  Indy n'a pas d'API publique documentée, Tiime en a une uniquement "sur la
  roadmap" (pas encore livrée) ; Abby est la seule à avoir une documentation
  API existante aujourd'hui, pour un coût de toute façon négligeable.
- **Connexion PA gérée comme les boîtes mail** : clé API saisie et testée
  depuis Réglages (`PaConnection`, clé chiffrée), pas de variable
  d'environnement. Bouton "Envoyer via Abby" par facture dans chaque onglet
  Facturation (visible seulement si une connexion active existe) —
  transmission volontaire par l'utilisateur, pas automatique à la création.
- **Workflows n8n livrés comme modèles, pas testés en conditions réelles** :
  cette session n'a pas accès à l'instance n8n du VPS. Les 7 fichiers dans
  `n8n/workflows/` (3 captures email + 3 alertes + 1 rapport de clôture)
  utilisent les types de nœuds n8n stables depuis plusieurs années
  (`emailReadImap`, `httpRequest`, `scheduleTrigger`, `if`, `emailSend`),
  mais les noms de champs exacts en sortie du nœud IMAP (pièce jointe,
  expéditeur) peuvent varier selon la version de n8n installée — voir
  `n8n/workflows/README.md` pour la checklist de vérification après import.
  n8n **appelle** l'application (pas l'inverse) : `APP_URL` et
  `INGEST_API_TOKEN` sont à définir côté n8n, pas de nouvelle variable côté
  app.
- **Agent de suivi/alerte** (`src/server/services/alerts.ts`) : 3 endpoints
  protégés par le même jeton (`/api/agents/alerts/pending-entries`,
  `/failed-documents`, `/thresholds`), interrogés par les workflows n8n
  planifiés. Chaque alerte renvoyée est journalisée dans `NotificationLog`
  et exclue des réponses suivantes pendant 24h, pour qu'un workflow qui
  tourne plusieurs fois par jour ne spamme pas le même rappel.
- **PDF de clôture régénéré à la demande** (`/api/reports/closing`), à
  partir des écritures validées et des seuils calculés (phase 4) — pas de
  fichier stocké à synchroniser.
- **Bug trouvé en testant les PDF** : `Intl.NumberFormat("fr-FR")` insère une
  espace fine insécable (U+202F) comme séparateur de milliers, absente de la
  police Helvetica standard des PDF — elle s'affichait comme un "/"
  (`85/000,00 €` au lieu de `85 000,00 €`). Corrigé par un formateur dédié
  (`src/lib/pdf/format.ts`) utilisé par tous les documents PDF.

## 9. Phase 6 — authentification/2FA, déploiement, sauvegardes

- **Authentification maison, sans dépendance externe** : mot de passe hashé
  avec `scrypt` (natif Node, pas de bcrypt compilé), session en cookie signé
  HMAC-SHA256 (`src/lib/auth/session.ts`) plutôt qu'une table `sessions` —
  suffisant pour un compte unique. Signature/vérification via Web Crypto
  (`crypto.subtle`), pas `node:crypto`, pour que `proxy.ts` (middleware)
  reste compatible Edge runtime sans jamais importer Prisma.
- **2FA TOTP obligatoire dès la création du compte** (`otpauth` + `qrcode`
  pour le QR code) : `/setup` crée le compte unique v1 et bloque l'accès
  tant que le code à 6 chiffres n'est pas confirmé. Secret TOTP chiffré en
  base avec la même clé que les mots de passe IMAP/PA (`src/lib/crypto.ts`).
- **Bug trouvé en testant le flux complet** : si l'enrôlement 2FA est
  interrompu entre la création du compte et la confirmation du code (ex.
  navigateur fermé), la page `/setup` redirigeait systématiquement vers
  `/login` dès qu'un compte existait — rendant le compte définitivement
  bloqué (mot de passe correct, mais 2FA jamais activée donc connexion
  impossible). Corrigé : `/setup` reprend l'enrôlement en cours (même
  secret, donc le QR code déjà scanné reste valide) tant que `totpEnabled`
  est resté `false` (`resumeTotpEnrollment` dans `server/services/auth.ts`).
- **`middleware.ts` renommé en `proxy.ts`** : Next.js 16 a déprécié la
  convention `middleware` au profit de `proxy` (même mécanique, juste un
  renommage de fichier/fonction) — découvert via l'avertissement de build,
  migré avec le transform officiel (`@next/codemod middleware-to-proxy`)
  appliqué manuellement.
- **Audit log réellement rattaché à un utilisateur** : les appels à
  `validateEntry`/`correctEntry` passaient `null` faute d'authentification
  (phases 3-4) ; ils utilisent maintenant `getCurrentUserId()` — vérifié en
  base après un test réel (`validatedById` renseigné, plus `null`).
- **Déploiement Docker** : `apps/web/Dockerfile` en sortie `standalone`
  (`next.config.mjs`), testé localement (build + `node server.js` +
  vérification des assets statiques et du client Prisma généré) sans
  Docker lui-même (non disponible dans cet environnement de développement —
  seul le build Next.js et son exécution ont pu être vérifiés directement).
  `docker-compose.yml` complété avec le service `app` (healthcheck sur
  `db`, volumes pour les documents/logos). `Caddyfile.snippet` pour le
  sous-domaine, à fusionner manuellement dans le Caddyfile existant du VPS.
- **Sauvegardes chiffrées** (`scripts/backup.sh`/`restore.sh`) : dump
  PostgreSQL + archive des documents/logos, chiffrés en AES-256-CBC
  (`openssl`), envoyés vers un stockage S3-compatible séparé du VPS
  applicatif. Le mécanisme dump → chiffrement → déchiffrement → réimport a
  été testé de bout en bout contre la vraie base de développement
  (restauration dans une base temporaire, données retrouvées intactes) ;
  seul l'envoi/récupération vers un vrai bucket S3-compatible n'a pas pu
  être testé (aucun comptes de ce type disponible dans cet environnement).

## 10. Corrections post-déploiement (retour terrain de l'exploitant)

- **Revente Fruits/Légumes confirmée 100% vente directe** : la facturation
  reste disponible (toggle `invoicingEnabled` dans Réglages) mais désactivée
  par défaut, décision non ambiguë désormais (le message affiché sur
  `/fruits-legumes/factures` ne dit plus "à confirmer"). Le logo AB ne peut
  donc apparaître que sur les factures Maraîchage, faute de facture émise
  pour Fruits/Légumes.
- **Nouveau modèle `CashJournalEntry` (journal de caisse)**, distinct du
  livre des recettes lui-même : une saisie agrégée par jour et par activité
  de vente directe (Maraîchage, Fruits/Légumes — jamais Kerbooth 360, 100%
  facturé). Deux comptes bancaires étanches : Fruits/Légumes n'encaisse qu'en
  espèces (`checkAmount`/`cardAmount` forcés à 0, justificatif = photo du
  bordereau de dépôt) ; Maraîchage agrège espèces/chèques/CB (justificatifs =
  bordereau + capture d'écran Up2Pay pour la part CB). Formulaire dédié
  (`CashJournalForm`), jamais mêlé au pipeline de capture IA des achats.
- **Seuil légal de la saisie globale journalière (BOI-BIC-DECLA-30-30)** :
  autorisée uniquement pour des ventes unitaires ≤ 76 €
  (`CASH_JOURNAL_DAILY_THRESHOLD` dans `lib/thresholds`). Le formulaire de
  saisie propose un champ optionnel « vente exceptionnelle » pour toute vente
  dépassant ce seuil, stockée à part (`exceptionalSales`, JSON) et jamais
  agrégée dans les totaux espèces/chèques/CB du jour — tout en étant réintégrée
  au calcul du CA pour les seuils de franchise/plafond.
- **Livre des recettes vs journal de caisse — distinction clarifiée dans le
  code, pas seulement dans la documentation** : le journal de caisse n'est
  qu'une des sources qui alimentent le livre des recettes. Avant cette
  correction, `computeBicThresholds`/`computeBaThreshold` ne sommaient que la
  table `Entry` (issue de la capture IA) — or le moteur de facturation
  (`createInvoice`) n'a jamais créé de ligne `Entry` : le CA de Kerbooth 360
  (100% facturé) était donc invisible des seuils. Corrigé : le CA de chaque
  activité vient maintenant de la bonne source (`sumInvoicedTotal` pour les
  factures, `sumCashJournalTotal` pour le journal de caisse) — Fruits/Légumes
  = journal de caisse seul, Kerbooth 360 = factures seules, Maraîchage = les
  deux additionnés pour le seuil, mais jamais fusionnés à l'affichage.
  Concrètement : `/maraichage/recettes` affiche désormais une ligne par
  facture ET une ligne par jour de vente directe (badge distinct), y compris
  à date identique — jamais un total unique ; `/photobooth/recettes` n'est
  plus qu'un rappel en lecture seule des factures (la création reste sur
  l'onglet Facturation) ; `/fruits-legumes/recettes` est désormais le
  formulaire + tableau du journal de caisse (plus de capture IA sur cet
  onglet, qui n'a plus lieu d'être pour une activité 100% vente directe).
- **Moyenne triennale micro-BA vérifiée dynamique** : `computeBaThreshold`
  calculait déjà `[année - 2, année - 1, année]` à partir de
  `new Date().getFullYear()` par défaut — confirmé non codé en dur, aucun
  changement nécessaire sur ce point.
- **Email de contact des factures, configurable par activité facturante** :
  `ActivitySettings.contactEmail` (Maraîchage, Kerbooth 360), vide par défaut
  pour reprendre `CompanySettings.contactEmail` (valeur pré-remplie affichée
  en placeholder dans Réglages). La génération PDF (`/api/invoices/[id]/pdf`)
  utilise l'email de l'activité en priorité, celui de la société en repli.
- **Boîtes mail de capture confirmées bidirectionnelles** : l'agent de veille
  n8n s'y connecte en lecture seule (IMAP), ce qui ne restreint en rien
  l'usage normal (réponse aux correspondants) de ces mêmes boîtes par
  l'exploitant — aucun changement de code nécessaire, comportement déjà
  garanti par la nature read-only de la connexion IMAP du pipeline de
  capture.
