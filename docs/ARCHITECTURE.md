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
│       │   │   │   ├── maraichage/         # BA : recettes, achats, TVA, paie, 2042, 3517-AGR-SD, factures
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
- **tva_declarations** — échéancier acomptes TVA / 3517-AGR-SD.
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

## 11. Tesa+, Cotisations non salarié, Dépenses, Relevé bancaire et rapprochement

- **Tesa+ (ex-« Paie »)** : l'ancien calculateur (fixture `payslipsFixture`,
  jamais branché sur de vraies données) est remplacé par un import simple
  (`SimpleImport`, catégories `TESA_*`) — upload + date + période de contrat,
  tous les types de documents (contrat, bulletin de paie, cotisations
  salariales, certificat de travail, attestation Pôle Emploi, solde de tout
  compte) traités de façon identique, sans aucun calcul. Les anciens modèles
  Prisma `PayrollEmployee`/`Payslip` restent en base (non supprimés, pour ne
  prendre aucun risque sur d'éventuelles données déjà présentes) mais ne sont
  plus utilisés par aucune page.
- **Cotisations non salarié (Maraîchage)**, même mécanisme `SimpleImport`
  (catégorie `COTISATION_NON_SALARIE`), séparé de Tesa+ : chaque import crée
  en plus, dans la même transaction, une écriture `Entry` (type `ACHAT`,
  statut `PENDING`) — la cotisation MSA de l'exploitant apparaît donc
  directement dans le registre des Dépenses, comme demandé.
- **Achats/Immobilisations renommé en "Dépenses"** dans les 3 activités
  (`lib/nav.ts`) — changement de libellé uniquement, ni le modèle `Entry`
  ni les routes (`/achats`) n'ont changé, pour ne pas casser de liens
  existants.
- **Relevé bancaire, un compte par activité** (confirmé : 3 comptes
  distincts, y compris Kerbooth 360) : nouveau modèle `BankTransaction`
  (import CSV uniquement en v1 — **pas de connexion DSP2**, jugée
  disproportionnée pour ce volume et plus gratuite nulle part). Le parseur
  CSV (`lib/bankStatement/parseCsv.ts`) est volontairement simple (détection
  de colonnes Date/Libellé/Débit-Crédit ou Montant par alias, délimiteur `;`
  ou `,`) : comme l'emplacement du logo AB ou l'API Abby, **le format réel
  de chaque banque n'a pas pu être testé dans cet environnement** et devra
  être ajusté au premier vrai relevé importé. Le PDF est accepté en
  principe par la spec utilisateur mais volontairement pas implémenté pour
  l'extraction ligne par ligne (parsing de mise en page PDF bancaire trop
  spécifique à chaque banque pour être fiable sans exemple réel) : seul le
  CSV est auto-découpé en opérations pour l'instant.
- **Rapprochement bidirectionnel** : plutôt qu'un modèle de jonction
  polymorphe, un simple FK nullable unique `bankTransactionId` a été ajouté
  directement sur `Entry`, `Invoice` et `CashJournalEntry` (cohérent avec le
  style déjà utilisé pour `Entry.sourceDocumentId`). L'initiation du
  rapprochement se fait depuis la page Relevé bancaire (sélection d'un
  candidat proposé dans une fenêtre large et asymétrique — jusqu'à 100 jours
  avant l'opération bancaire, 7 jours après, pour couvrir les délais de
  paiement à 30/60 jours et non un simple ±15 jours symétrique, corrigé après
  retour terrain), mais le statut « ✓ Pointé »
  s'affiche aussi côté Dépenses/Recettes — l'information reste consultable
  dans les deux sens même si la saisie ne l'est que d'un seul côté, choix
  pragmatique pour limiter la complexité de l'interface.
- **Détection de doublon transversale** (règle demandée pour Tesa+,
  Cotisations non salarié, Dépenses, Relevé bancaire) : `lib/dedup.ts`
  fournit un hash SHA-256 de fichier et une comparaison (même fichier, ou
  même date + montant). Pour les imports simples et le relevé bancaire
  (actions utilisateur synchrones), un doublon probable **bloque
  l'enregistrement** et demande une confirmation explicite (case à cocher)
  avant de l'écrire quand même. Pour le pipeline de capture IA (email/photo,
  `ingestDocument`), qui n'a personne en ligne pour confirmer au moment de
  l'ingestion (surtout pour les emails, traités par n8n de façon
  asynchrone), le même hash est calculé mais le doublon n'est que **signalé**
  (`Document.possibleDuplicateOfId`, badge « ⚠ Doublon probable » visible
  avant validation) — cohérent avec le principe déjà en place de tout
  laisser passer en PENDING pour revue humaine plutôt que de bloquer un
  pipeline automatisé.
- **Documents servis via une route protégée** : en écrivant les liens vers
  les justificatifs (bordereaux de caisse, imports Tesa+, relevés), une
  lacune préexistante a été comblée au passage — aucun fichier stocké en
  local (`local://...`) n'était auparavant consultable depuis l'interface
  (aucune route ne le servait). Ajout de `/api/documents/[filename]`
  (protégée par la session comme le reste de l'app, comme tout le reste,
  voir `proxy.ts`) et d'un petit utilitaire `lib/storage/url.ts` (sans
  dépendance à `node:fs`, donc utilisable depuis des composants clients)
  pour convertir une URL stockée en lien cliquable.

## 12. Cycle Valider/Supprimer généralisé, suppression douce, Registre TVA réel

- **Un même cycle PENDING/VALIDATED partout** : `BankTransaction` et
  `SimpleImport` n'avaient pas de statut au moment de leur import — corrigé
  pour uniformiser le comportement "Valider : confirme une ligne en attente,
  en un clic" sur tous les sous-onglets registre (Dépenses, Recettes, Tesa+,
  Cotisations non salarié, Relevé bancaire, Acompte TVA), pas seulement
  Entry/CashJournalEntry qui l'avaient déjà.
- **Deux suppressions bien distinctes**, mêmes règles partout
  (`RegisterActions`, composant partagé par tous ces tableaux) :
  - **"Supprimer"** (ligne encore PENDING) : suppression réelle en base —
    rien à conserver, la ligne n'a jamais fait foi.
  - **"Supprimer la ligne"** (ligne déjà VALIDATED) : suppression douce
    (`deletedAt` posé, jamais réaffichée nulle part) plutôt qu'une vraie
    suppression, pour garder une trace en cas de contrôle fiscal — ajouté
    sur `Entry`, `CashJournalEntry`, `SimpleImport`, `BankTransaction`,
    `TvaInstallment`. Toutes les requêtes de liste filtrent désormais
    `deletedAt: null` (y compris les candidats de rapprochement bancaire,
    pour ne jamais proposer une ligne masquée). `Invoice` n'a pas cette
    mécanique : la facturation reste un module à part (son cycle
    DRAFT/SENT/PAID/CANCELLED existant suffit), les lignes de facture dans
    les tableaux Recette restent en lecture seule, gérées depuis l'onglet
    Facturation.
- **Cotisations Tesa+ salariales alimentent aussi les Dépenses** : la
  logique déjà en place pour `COTISATION_NON_SALARIE` (créer une `Entry` à
  la validation, jamais à l'import) s'applique maintenant aussi à
  `TESA_COTISATIONS_SALARIALES` — les deux catégories partagent
  `CATEGORIES_GENERATING_ENTRY` dans `server/services/simpleImports.ts`.
- **Registre TVA réellement calculé** (`lib/tva`), plus une donnée de
  démonstration : par trimestre glissant (les 6 derniers, calculés
  dynamiquement depuis la date du jour, jamais codés en dur), TVA collectée
  = somme des factures Maraîchage validées/envoyées de la période, TVA
  déductible = somme des Dépenses validées (non supprimées) de la période.
  Le statut ("Réglé"/"À traiter") confronte ce calcul à l'existence d'un
  paiement d'acompte validé pour la même période (`TvaInstallment`,
  correspondance par libellé d'échéance).
- **Acompte TVA** (`TvaInstallment`, nouveau modèle) : même schéma qu'un
  import simple — enregistré après paiement, justificatif optionnel,
  détection de doublon, cycle Valider/Supprimer identique. Distinct de
  `TvaDeclaration` (préexistant, jamais branché, gardé pour un usage futur
  éventuel autour de la déclaration annuelle/3517-AGR-SD plutôt que des
  acomptes).
- **`PayrollEmployee`/`Payslip` restent orphelins** (déjà signalé phase
  précédente) : aucune donnée réelle n'y a jamais transité, aucune migration
  de suppression n'a été faite par prudence — à retirer un jour si confirmé
  définitivement inutile.

## 13. Comptabilité de caisse (correction majeure — reçue après coup, corrige des chiffres déjà en production)

- **Le principe** (BOFiP [BOI-BA-BASE-20-10](https://bofip.impots.gouv.fr/bofip/10605-PGP.html),
  même logique en micro-BIC) : en régime micro, c'est la date
  d'**encaissement/paiement effectif**, jamais la date de facture, qui
  détermine l'exercice fiscal d'une recette ou d'une dépense. Une facture
  émise en décembre mais payée en janvier appartient à l'exercice de
  janvier. **Avant cette correction, le Registre TVA et les seuils de CA
  étaient calculés sur `issueDate` (date de facture)** — donc faux dès
  qu'un paiement franchit une frontière d'exercice ou de trimestre.
- **`paidAt` ajouté sur `Invoice` et `Entry`** (nullable, distinct de
  `issueDate`/`date`) : une facture `SENT` sans `paidAt` est une **créance
  en cours**, une Dépense `VALIDATED` sans `paidAt` est une **dette en
  cours** — ni l'une ni l'autre n'entre dans un calcul de CA/seuil/TVA tant
  que cette date est vide. Statut affiché calculé par `lib/cashStatus.ts`
  ("Facturée — créance en cours"/"Encaissée", "Facture reçue — dette en
  cours"/"Payée") plutôt qu'un nouvel enum — combinaison du statut
  PENDING/VALIDATED (ou DRAFT/SENT/PAID/CANCELLED côté facture) et de la
  présence de `paidAt`. `CashJournalEntry` (vente directe) n'a pas ce
  champ : une vente au comptant est encaissée le jour même, sa propre
  `date` suffit.
- **`paidAt` se pose de deux façons** : automatiquement lors du
  rapprochement bancaire (`reconcileBankTransaction` pose `paidAt` = date
  de l'opération pointée — c'est le cas normal, le virement/chèque du
  client apparaît sur le relevé), ou manuellement via `MarkPaidButton`
  (`markEntryPaid`/`markInvoicePaid`, une date au choix) pour le cas où le
  paiement est connu avant tout import de relevé. Annuler un rapprochement
  (`unreconcileBankTransaction`) efface aussi le `paidAt` posé par ce
  rapprochement — cas non géré : une date saisie manuellement puis
  recouverte par un rapprochement se perd si ce rapprochement est annulé.
- **`lib/tva` et `lib/thresholds` recalculés sur `paidAt`**, plus
  `issueDate`/`date` : `sumInvoicedTotal` (seuils) et `computeTvaRegister`
  (TVA collectée/déductible) filtrent désormais sur la fenêtre de date
  appliquée à `paidAt`, jamais à la date de facture.
  ⚠️ **Non implémenté, à confirmer par Benoît auprès de la MSA/Cerfrance** :
  l'exception BOI-TVA-SECT-80-30-30 selon laquelle la TVA peut devenir
  exigible dès la facturation (et non à l'encaissement) si la facture est
  émise avant l'encaissement, hors facture d'acompte — le calcul actuel
  applique uniformément la règle par défaut (exigibilité à l'encaissement).
- **`CashJournalEntry` déjà conforme** sans changement : une vente directe
  passe au statut "Encaissée" dès sa validation, sa date de saisie faisant
  à la fois office de date de vente et de date d'encaissement — aucune
  notion de créance possible sur cette activité 100% comptant.
- **Reste à faire** : rien de ce périmètre — voir §16 pour la migration du
  stockage fichiers vers Scaleway Object Storage, désormais faite.

## 15 bis. Renommage CA12A → Cerfa n°10968 / 3517-AGR-SD

- **"CA12A" était une appellation informelle/obsolète** : le vrai nom du
  formulaire de déclaration de TVA du régime simplifié agricole est le
  Cerfa n°10968, dit formulaire 3517-AGR-SD. Renommé partout où il
  apparaissait : libellé du sous-onglet (`lib/nav.ts`), page de démo
  (`app/maraichage/ca12a/page.tsx`, fixture renommée
  `tvaAnnualDeclarationFixture`), commentaires du schéma Prisma
  (`TvaDeclaration.regime`) et de `docs/ARCHITECTURE.md`.
- **Slug d'URL `ca12a` volontairement conservé** (`/maraichage/ca12a`) :
  ce n'est qu'un identifiant technique interne, jamais affiché — le
  renommer n'apporterait rien et casserait un éventuel favori/lien
  existant sans aucun bénéfice.
- Cette page reste une **démonstration** (fixture statique, comme
  `declaration-annuelle`) : aucun calcul réel n'y est branché, seul le
  Registre TVA (§ ci-dessus, `lib/tva`) est déjà réellement calculé.

## 15 ter. Acomptes trimestriels de TVA activables/désactivables

- **Nouveau champ `ActivitySettings.tvaInstallmentsEnabled`** (défaut
  `true`), pertinent uniquement pour `BA_MARAICHAGE` (seule activité au
  régime simplifié agricole) — case à cocher affichée uniquement pour
  cette activité dans `ActivitySettingsForm`, jamais envoyée/écrasée pour
  les deux autres (voir `submitActivitySettings`, qui n'inclut ce champ
  dans la mise à jour que si `activity === "BA_MARAICHAGE"`, pour ne
  jamais réinitialiser silencieusement une case absente du formulaire des
  autres activités).
- **Ne change rien au calcul de la TVA nette due** (`computeTvaRegister`
  continue de la calculer normalement, à titre informatif) : seul le
  **statut affiché par trimestre** change, passant de "à traiter"/"réglé"
  à "dispensé" quand l'option est désactivée — pas de faux rappel à payer
  un acompte qui n'est légalement pas dû.
- **Formulaire d'ajout masqué** sur `/maraichage/acomptes` quand
  désactivé (bandeau explicatif à la place), mais **l'historique déjà
  enregistré reste visible** — cohérent avec le principe déjà appliqué à
  la facturation désactivée de Fruits/Légumes.
- **Dispense légale réelle** (BOI-TVA-DECLA-20-20) : sous 1 000 € de TVA
  due l'année précédente. Ce champ ne calcule/vérifie **jamais**
  automatiquement cette condition — à l'exploitant de la confirmer chaque
  année avant de décocher la case.

## 15 quater. Vue par exercice (sélecteur d'année + verrouillage visuel)

- **`YearFilter`** (`components/YearFilter.tsx`) : sélecteur générique
  piloté par le paramètre d'URL `?year=`, ajouté sur chaque sous-onglet
  registre (Recettes, Dépenses, Relevé bancaire, Acompte TVA, Tesa+,
  Cotisations non salarié — pas Registre TVA, déjà une vue glissante par
  trimestre, ni Facturation, dont les factures ne portent pas d'action de
  suppression). Filtrage fait côté page (`filterByYear`,
  `lib/fiscalYear/rowYear.ts`), pas dans les services : évite de complexifier
  les signatures `list*` pour un usage purement d'affichage.
- **Une ligne sans exercice connu reste toujours visible**, quel que soit le
  filtre choisi (`filterByYear` ne retire jamais une ligne dont la date de
  règlement est vide) — cohérent avec le principe déjà établi que les
  créances/dettes en cours ne sont rattachées à aucun exercice tant qu'elles
  ne sont pas réglées.
- **Verrouillage visuel** : chaque table registre reçoit maintenant
  `closedYears: number[]` (voir `listClosedYears`) et calcule un `locked`
  par ligne à partir de sa vraie date de rattachement fiscal (`paidAt` pour
  Entry/TvaInstallment, `date` pour CashJournalEntry/BankTransaction).
  `RegisterActions` affiche alors « 🔒 Exercice clôturé » à la place du
  bouton de suppression — un affichage anticipé seulement, le serveur
  (`assertDateNotInClosedYear`) reste la seule source de vérité en cas
  d'incohérence.
- **Bug de clôture corrigé au passage** : `softDeleteSimpleImport`
  supprimait la Dépense liée à un import Tesa+/cotisation sans jamais
  vérifier si l'exercice de son `paidAt` était clôturé — la garde de
  fermeture d'exercice (§15) ne couvrait par erreur que les 4 services
  qu'elle protégeait explicitement. Corrigé en y ajoutant le même appel à
  `assertDateNotInClosedYear`.
- **Cas `SimpleImportTable` approximatif, assumé** : le verrouillage visuel
  de cette table se base sur `item.date` (pas la vraie `paidAt` de la
  Dépense liée, non exposée dans `FakeSimpleImport`) et seulement pour les
  catégories qui génèrent une Dépense (cotisations) — purement indicatif,
  jamais la garde réelle.

## 16. Migration du stockage documentaire vers Scaleway Object Storage

- **Driver `s3` implémenté dans `lib/storage/index.ts`** (`@aws-sdk/client-s3`,
  compatible Scaleway Object Storage sans code spécifique — même API S3 que
  AWS), en plus du driver `local` déjà existant. Sélectionné par
  `STORAGE_DRIVER` (`local` ou `s3`) : aucun appelant (services, routes) n'a
  besoin de savoir lequel est actif, `saveDocumentFile`/`readDocumentFile`
  exposent la même signature dans les deux cas.
- **`/api/documents/[filename]` reste inchangée** : elle continue de
  streamer le fichier depuis l'app (jamais une redirection vers une URL
  Scaleway signée), donc toujours protégée par la session comme avant —
  changer de driver ne change rien à la confidentialité déjà en place.
  `toDocumentHref` route `local://` et `s3://` vers exactement la même URL
  applicative (`/api/documents/<filename>`).
- **Logos volontairement exclus** (`saveLogoFile` reste toujours local,
  quel que soit `STORAGE_DRIVER`) : ce sont des images de marque publiques,
  jamais soumises à une obligation de conservation légale — inutile de les
  faire transiter par un bucket privé.
- **Migration des fichiers déjà stockés en local** :
  `apps/web/scripts/migrate-storage-to-s3.ts` (`npm run
  storage:migrate-to-s3`), à lancer une seule fois, AVANT de basculer
  `STORAGE_DRIVER` sur `s3` (sinon l'app chercherait déjà les fichiers sur
  le bucket alors qu'ils n'y sont pas encore). Parcourt les 6 colonnes
  `local://...` connues (`Document.fileUrl`,
  `CashJournalEntry.depositSlipUrl`/`cardStatementUrl`,
  `SimpleImport.fileUrl`, `BankTransaction.sourceFileUrl`,
  `TvaInstallment.justificatifUrl`, `FiscalYearClosure.zipFileUrl`), envoie
  chaque fichier au bucket sous le même nom, et réécrit l'URL en base.
  Idempotent par construction (ne retraite que les URLs encore préfixées
  `local://`) : peut être relancé sans risque de doublon si interrompu.
- **Pas de vérification de bout en bout possible depuis le bac à sable de
  développement** : le proxy réseau sortant de cet environnement bloque les
  hôtes S3 arbitraires (`Host not in allowlist`), donc la connexion réelle
  au bucket Scaleway n'a pu être testée que jusqu'à ce point (la requête
  n'atteint jamais Scaleway). Le code suit fidèlement l'API S3 standard
  (identique au driver de sauvegarde `scripts/backup.sh`, qui utilise déjà
  le même type d'endpoint Scaleway avec succès), mais la première
  validation réelle se fera au déploiement sur le VPS (voir
  `docs/DEPLOYMENT.md` §9) — accès réseau non restreint là-bas.
- **`scripts/migrate-storage-to-s3.js` en JavaScript brut, pas TypeScript** :
  l'image Docker de production (build `standalone` de Next.js) n'embarque
  que ce que le code applicatif importe réellement — `tsx` (devDependency,
  jamais importée par l'app) en est donc absente, ce qui a fait échouer un
  premier essai en production (`tsx: not found`). Même limite préexistante
  pour `db:seed`, jamais remarquée faute d'avoir été lancée en prod. Plutôt
  que d'alourdir l'image avec `tsx` pour un script d'un seul usage, le
  script est écrit en CommonJS pur (`require`), exécuté par `node`
  directement — ses deux dépendances externes (`@prisma/client`,
  `@aws-sdk/client-s3`) sont déjà présentes dans l'image (la première
  copiée explicitement pour le CLI Prisma, la seconde tracée par le build
  standalone puisque `lib/storage/index.ts` l'importe). Le `Dockerfile`
  copie maintenant aussi `scripts/` dans l'image finale (absent du tracé
  standalone, comme `prisma/`).

## 16 bis. Correction des seuils légaux — barème triennal 2026-2028

- **`LEGAL_THRESHOLDS` (`lib/thresholds/index.ts`) codait le barème
  2024-2025**, devenu obsolète : les seuils micro-entreprise sont
  revalorisés tous les 3 ans, et la période 2026-2028 a relevé les
  plafonds (pas les franchises TVA, elles, inchangées) :
  - Plafond vente de marchandises : 188 700 € → **203 100 €**
  - Plafond prestations de services : 77 700 € → **83 600 €**
  - Plafond global activité mixte : 188 700 € → **203 100 €**
  - Moyenne triennale micro-BA : 91 900 € → **129 200 €**
- **La valeur micro-BA (91 900 €) était déjà fausse indépendamment de la
  revalorisation 2026** — le vrai seuil 2024-2025 était 120 000 €, jamais
  91 900 € ; ce chiffre semble avoir été une approximation non vérifiée
  lors de l'écriture initiale (déjà signalée "à reconfirmer" dans le
  commentaire du code à l'époque).
- **Détecté en croisant les seuils du dossier Kerbooth 360°** (qui citait
  203 100 € comme plafond mixte) avec ceux déjà codés ici (188 700 €) —
  recherche faite pour trancher, confirmant le chiffre du dossier Kerbooth
  et révélant que la correction allait plus loin (2 autres seuils
  également obsolètes).
- Franchises TVA (85 000/93 500 vente, 37 500/41 250 services) confirmées
  **inchangées** pour 2026 — seuls les plafonds de sortie du régime micro
  ont été relevés, pas les seuils d'assujettissement à la TVA.

## 17. Rapprochement bancaire suggéré automatiquement

- **Constat de Benoît en usage réel** : après avoir dû choisir manuellement
  parmi une liste de candidats non filtrée par montant pour rapprocher une
  ligne de relevé, il a demandé que l'application propose elle-même le
  rapprochement, l'utilisateur se contentant de valider — même logique que
  "Valider" partout ailleurs dans l'app plutôt qu'une recherche manuelle.
- **`suggestReconciliationMatch`** (`server/services/bankTransactions.ts`) :
  réutilise `listReconciliationCandidates` (même fenêtre de date, ±100/7
  jours) puis ne retient que les candidats dont le **montant correspond
  exactement**. Suggestion posée seulement si un **seul** candidat
  correspond — deux candidats au même montant dans la fenêtre, ou aucun,
  et l'utilisateur retombe sur la sélection manuelle existante (jamais de
  rapprochement risqué posé tout seul sur une ambiguïté).
- **Calculée en une passe pour toute la page** (`suggestReconciliationMatches`,
  appelée depuis les 3 pages `releve-bancaire`) : la suggestion est déjà
  affichée à l'ouverture de la page, pas seulement après avoir cliqué sur
  "Rapprocher" — c'est le changement demandé, l'utilisateur voit
  directement "Suggestion : Facture 2026-042" avec un bouton "Confirmer".
  "Choisir un autre" reste disponible pour retomber sur le sélecteur manuel
  en cas de faux positif (rare, mais un montant identique par coïncidence
  reste possible).
- **`reconcileBankTransaction` posait déjà `paidAt` automatiquement** (voir
  §13, comptabilité de caisse) : ce changement ne touche que la façon dont
  le rapprochement lui-même est proposé, pas ce qui se passe une fois
  confirmé — aucune "double étape" date de paiement + rapprochement à
  faire séparément, il n'y en a jamais eu.
- **Limite assumée** : le filtre est un montant strictement identique, sans
  tolérance (ex. frais bancaires de quelques centimes). Un rapprochement à
  quelques centimes près reste manuel via "Choisir un autre" — à revoir si
  ce cas s'avère fréquent en usage réel.

## 18. Dictée vocale des factures désactivée (temporairement)

- **Bouton "🎙️ Dicter le contenu" retiré de `InvoiceForm`** à la demande de
  Benoît : pas encore assez pertinent en l'état pour un usage quotidien,
  gardé pour une refonte future en assistant vocal complet ("type Jarvis")
  plutôt que ce bouton isolé sur le seul formulaire de facturation.
- **Rien de supprimé côté serveur** : `dictateInvoiceAction`
  (`app/actions/invoices.ts`), `transcribeInvoiceDictation`
  (`lib/mistral/agents.ts`) et `transcribeAudio`/Voxtral
  (`lib/mistral/client.ts`) restent en place, simplement plus appelés
  depuis l'UI — pas de perte de travail si la fonctionnalité revient sous
  une autre forme.

## 19. Kerbooth 360° — dispatch et réservations intégrés à l'outil compta

Voir `kerbooth360/` à la racine du dépôt (documents légaux corrigés,
décision d'architecture détaillée) — cette section résume ce qui a été
construit côté outil compta.

- **`KerboothUnit`/`KerboothBooking`** (nouveaux modèles Prisma) vivent
  dans la même base Postgres que le reste de l'outil, pas dans un Supabase
  séparé — décision Phase 1 (Benoît seul), migration vers un vrai projet
  Supabase partagé prévue seulement en Phase 2 (partenaire), voir
  `kerbooth360/architecture-decision.md`.
- **Dispatch automatique** (`server/services/kerbooth/dispatch.ts`) :
  réplique la logique SQL du dossier original en deux temps (unités sans
  réservation `CONFIRMED` chevauchante, puis la moins chargée en jours
  cumulés sur l'année) — en requêtes Prisma plutôt qu'en SQL brut, cohérent
  avec le reste du code. Une réservation `PENDING_PAYMENT`/
  `PENDING_SIGNATURE` ne bloque jamais une unité : seule une réservation
  confirmée compte comme "prise".
- **Facturation Kerbooth réutilise le moteur existant**
  (`server/services/invoices.ts`, activité `BIC_PHOTOBOOTH`) plutôt qu'Abby
  — une facture d'acompte à la réservation, une facture de solde à la fin
  de la location, toutes deux marquées payées immédiatement (`markInvoicePaid`)
  puisque le paiement Stripe qui les déclenche est déjà confirmé au moment
  de l'appel. Le bouton "Envoyer via Abby" déjà existant (PA) reste
  disponible sur ces factures pour les clients Entreprise (obligation
  d'e-invoicing B2B à venir).
- **API n8n-facing** (`/api/kerbooth/bookings*`, protégées par
  `INGEST_API_TOKEN` comme le reste du pipeline n8n) : créer une
  réservation (dispatch), marquer l'acompte payé, confirmer la signature,
  marquer le solde payé, annuler. Chaque transition vérifie l'état courant
  de la réservation (`KerboothBookingStateError`) — impossible de marquer
  un solde payé sur une réservation pas encore confirmée, par exemple.
- **`NoAvailableUnitError` → HTTP 409** sur la création : le workflow n8n
  doit afficher "complet à cette date" côté site plutôt que de laisser
  échouer silencieusement (déclencheur 2bis du dossier original).
- **Unités gérées comme un réglage** (`Réglages → Kerbooth 360° — Unités`),
  pas via n8n : se fait une fois (nommer les 2 unités), jamais au fil de
  l'eau — mêmes formulaires/actions serveur que le reste de Réglages.
- **Nouvel onglet "Réservations"** (`/photobooth/reservations`) : vue en
  lecture seule des réservations et de leur statut, pas d'action possible
  ici (tout passe par n8n) — juste pour suivre visuellement le dispatch
  sans avoir besoin d'ouvrir n8n.
- **Workflows n8n** (`n8n/workflows/kerbooth-*.json`) : 4 gabarits
  couvrant le chemin nominal (demande → acompte → signature → solde) —
  volontairement moins aboutis que les 7 workflows Phase 5 existants,
  faute de comptes Stripe/Yousign/HubSpot réels au moment de l'écriture.
  Détail des limites connues dans `n8n/workflows/README.md`. Encore à
  construire : relance/annulation contrat non signé à 48h, échec de
  prélèvement du solde, lien d'annulation en libre-service, rappel
  caution J-1, rappel de déclaration URSSAF Kerbooth.

## 14. Répertoire Clients et Catalogue Produits/Prestations

- **Deux nouveaux modèles, `Client` et `Product`**, scopés par activité
  (Maraîchage/Kerbooth 360, les deux seules activités facturantes), avec une
  contrainte unique `(tenantId, activity, name|label)` qui sert à la fois
  de clé d'upsert et de garde-fou anti-doublon. **Volontairement pas de FK
  depuis `Invoice`** : `clientName`/`clientAddress` y restent de simples
  chaînes, indépendantes d'une fiche client modifiable plus tard — cohérent
  avec le principe déjà en place qu'une facture, une fois émise, ne change
  jamais rétroactivement (voir `EntryStatus`/verrouillage après validation).
  Le répertoire n'est qu'un pense-bête réutilisable, pas la source de
  vérité d'une facture déjà créée.
- **Alimentation automatique, jamais un pré-requis** : `createInvoice`
  appelle `upsertClient`/`ensureProduct` après (pas avant) la création de la
  facture, dans un bloc `try/catch` qui avale toute erreur — un souci sur le
  répertoire ne doit jamais empêcher l'émission d'une facture, qui reste la
  vraie priorité métier.
- **Asymétrie volontaire Client vs Product à la mise à jour automatique** :
  `upsertClient` fusionne les nouveaux champs non vides sur une fiche
  existante (une adresse qui change au fil du temps est un cas normal,
  bénin à mettre à jour tout seul) ; `ensureProduct`, à l'inverse, **ne
  touche jamais** un produit déjà connu — sans quoi une remise ponctuelle
  tapée sur une seule facture corromprait silencieusement le prix par
  défaut de tout le catalogue. Modifier délibérément un prix passe par
  `createOrUpdateProductByLabel`/`updateProduct`, appelées uniquement depuis
  le petit formulaire de gestion (`ProductCatalog`), jamais depuis le flux
  de facturation.
- **UI** : un sélecteur au-dessus du champ client (et un par ligne de
  facture pour les produits) pré-remplit le formulaire depuis le
  répertoire/catalogue existant, sans empêcher la saisie libre — la
  sélection est un raccourci, jamais une contrainte. `ClientRepository`/
  `ProductCatalog` (des `<details>` repliés par défaut, sous le formulaire
  de facture) permettent de corriger une fiche à tout moment (SIRET, TVA
  intracommunautaire, prix), conformément à la demande explicite du prompt
  de construction ("modifiable/complétable à tout moment").
- **Dictée vocale** : déjà implémentée depuis une phase précédente
  (`dictateInvoiceAction`/Voxtral) et alimente le même formulaire que la
  saisie manuelle — rien à ajouter sur ce point du prompt de construction.

## 15. Module Clôture d'exercice

- **Un seul bouton transversal**, `Réglages → Clôture d'exercice`, jamais
  un bouton par activité : un exercice fiscal couvre les 3 activités à la
  fois. Modèle `FiscalYearClosure` (`server/services/fiscalYearClosure.ts`),
  une ligne = un exercice clos, unique par `(tenantId, year)`.
- **Blocage tant qu'il reste une ligne en attente n'importe où**
  (`listPendingBlockers`) : compte les `PENDING` non supprimés sur `Entry`,
  `CashJournalEntry`, `BankTransaction`, `SimpleImport` et
  `TvaInstallment`, groupés par activité, et affiche le détail
  (sous-onglet + nombre) plutôt qu'un refus opaque. Le blocage est
  volontairement **global**, pas limité à l'année qu'on tente de clôturer :
  une ligne encore en attente peut, une fois traitée, se rattacher à
  n'importe quel exercice (via sa date de paiement réelle).
- **Ne bloque jamais sur les créances/dettes en cours** (`paidAt` vide) :
  elles restent modifiables après clôture et rejoignent automatiquement
  l'exercice de leur règlement réel une fois payées — c'est déjà le
  comportement naturel de la comptabilité de caisse (§13), rien de
  spécifique à coder pour ce point.
- **Ordre chronologique imposé** (`suggestNextClosableYear`) : calculé à
  partir des seules années portant des mouvements **réglés** (`paidAt` non
  vide côté Entry/Invoice, `CashJournalEntry`/`TvaInstallment` validés) —
  une année sans aucun mouvement réglé n'a pas besoin d'être clôturée avant
  la suivante. `closeFiscalYear` refuse (`FiscalYearOrderError`) toute
  tentative de clôturer une année ultérieure tant qu'une année antérieure
  avec mouvements réglés reste ouverte.
- **Verrouillage en lecture seule effectif** : `assertDateNotInClosedYear`
  est appelée avant chaque suppression douce (`softDeleteEntry`,
  `softDeleteCashJournalEntry`, `softDeleteBankTransaction`,
  `softDeleteTvaInstallment`) et avant `unreconcileBankTransaction` — sur
  la date qui rattache réellement la ligne à un exercice (`paidAt` pour une
  dépense/facture, `date` pour une saisie de caisse/ligne de relevé/acompte
  TVA). Une dette/créance en cours (`paidAt` vide) n'est jamais bloquée par
  cette garde, conformément au point précédent. **Limite connue** : rien
  n'empêche aujourd'hui la création d'une toute nouvelle ligne `PENDING`
  datée dans un exercice déjà clos (ex. import tardif d'un relevé
  contenant une vieille opération) — elle suit son cycle normal de
  validation/suppression sans déclencher la garde, qui ne s'applique qu'à
  une ligne déjà validée/payée. Non traité en v1, à surveiller en usage
  réel.
- **Dossier ZIP généré à la clôture** (`archiver`, dépendance ajoutée pour
  cette seule fonctionnalité — Node n'a pas de writer ZIP natif) et stocké
  via `saveDocumentFile` (retéléchargeable depuis Réglages, jamais
  régénéré à la volée pour un exercice déjà clos puisque ses pièces sont
  figées) :
  - `synthese-cloture-<année>.pdf` : un seul PDF couvrant les 3 activités
    (recettes/dépenses/résultat + seuils), pas trois fichiers séparés —
    simplification délibérée, le détail par activité y est déjà présent
    en sections distinctes.
  - `creances-dettes-en-cours-<année>.pdf` : état des créances/dettes au
    moment de la clôture, transversal (pas rattaché à un exercice précis
    par nature).
  - `pieces/<activité>/<sous-onglet>/…` : pièces sources de l'exercice
    (justificatifs de dépense, bordereaux de caisse, relevés bancaires,
    PDF de facture régénérés à la volée via `renderInvoicePdfBuffer` —
    extrait de la route `/api/invoices/[id]/pdf` pour être réutilisé ici
    sans dupliquer la logique de rendu —, pièces Tesa+/cotisations/acompte
    TVA), organisées exactement comme les onglets registre de
    l'application pour rester lisibles hors contexte (contrôle fiscal,
    remise à un expert-comptable).
- **Bug corrigé au passage** : `sumCashJournalTotal` (`lib/thresholds`)
  n'excluait pas les saisies de caisse supprimées (`deletedAt`), ce qui
  aurait gonflé indéfiniment le CA retenu pour le suivi des seuils avec
  toute correction d'erreur. `generateClosingReportPdf`
  (`server/services/reports.ts`) utilisait par ailleurs `Entry.type =
  RECETTE`, un type que plus aucun flux ne produit depuis le passage à
  Invoice/CashJournalEntry comme sources de recettes (§13/14 précédents) —
  le rapport de clôture affichait donc 0 € de recettes pour toutes les
  activités. Les deux corrections réutilisent désormais les mêmes
  fonctions d'agrégation (`sumInvoicedTotal`/`sumCashJournalTotal`,
  nouvellement exportées, + `sumDepensesTotal` ajoutée) que le suivi des
  seuils, pour ne plus jamais dupliquer cette logique de calcul.
- **Irréversible depuis l'interface** : aucune fonction de réouverture
  d'exercice en v1. Une erreur découverte après clôture nécessite une
  intervention manuelle en base (hors périmètre de l'interface utilisateur,
  volontairement — une réouverture en un clic serait trop dangereuse pour
  un exercice déjà déclaré).
