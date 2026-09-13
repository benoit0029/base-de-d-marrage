# Workflows n8n — Phase 5

Ces 7 workflows sont des **modèles à importer et adapter**, pas des exports
testés sur une instance n8n réelle : cette session de développement n'a pas
d'accès à l'instance n8n du VPS. Compter environ 30 min de vérification par
workflow au premier import.

## Import

Dans n8n : **Workflows → Import from File**, un fichier à la fois. Chaque
workflow est importé désactivé (`active: false`) — l'activer seulement après
vérification manuelle des points ci-dessous.

## À vérifier après chaque import (obligatoire)

1. **Noms de nœuds IMAP / Email Send** : les types de nœuds
   (`n8n-nodes-base.emailReadImap`, `n8n-nodes-base.emailSend`) et leurs
   paramètres peuvent avoir changé selon la version de n8n installée sur le
   VPS. Ouvrir chaque nœud, comparer avec l'équivalent disponible dans votre
   version, ajuster si besoin.
2. **Champs de sortie de l'email** (`$json.from`, `$json.subject`,
   `attachment_0`) : à vérifier avec le bouton *Test step* du nœud IMAP —
   le nom exact du champ contenant la pièce jointe binaire dépend de la
   version du nœud. Ajuster l'expression dans le nœud HTTP Request si le nom
   diffère.
3. **Credentials à créer dans n8n** (jamais incluses dans ces fichiers, pour
   des raisons de sécurité) :
   - `IMAP Maraîchage`, `IMAP Fruits/Légumes`, `IMAP Photobooth` — mêmes
     identifiants que ceux testés dans Réglages de l'application (mais
     saisis une seconde fois ici : n8n a son propre stockage de credentials,
     séparé de la base de l'application).
   - `SMTP — adresse dédiée (émission)` — l'adresse `SMTP_*` de
     `.env.example`, réservée à l'envoi (jamais à la réception).
4. **Variables d'environnement n8n** à définir (Settings → Environment, ou
   fichier `.env` de l'instance n8n) :
   - `APP_URL` — URL publique de l'application (ex. `https://compta.exemple.fr`)
   - `INGEST_API_TOKEN` — la même valeur que `INGEST_API_TOKEN` dans le
     `.env` de l'application (voir `.env.example`)
   - `SMTP_FROM` — adresse d'expédition des notifications
   - `NOTIFICATIONS_TO_EMAIL` — adresse de l'exploitant qui reçoit les
     rappels/alertes

## Contenu

| Fichier | Déclencheur | Rôle |
|---|---|---|
| `capture-email-maraichage.json` | Nouvel email (IMAP dédié) | Transmet la pièce jointe à `/api/agents/ingest` avec `mailboxActivity=BA_MARAICHAGE` |
| `capture-email-fruits-legumes.json` | idem | `mailboxActivity=BIC_FRUITS_LEGUMES` |
| `capture-email-photobooth.json` | idem | `mailboxActivity=BIC_PHOTOBOOTH` |
| `alert-pending-entries.json` | Planifié (8h/jour) | Rappelle par email les écritures en attente depuis plus de 3 jours (dédoublonné côté application, pas de spam si relancé plusieurs fois) |
| `alert-thresholds.json` | Planifié (8h/jour) | Alerte si un seuil micro-BA/micro-BIC passe en vigilance ou est dépassé |
| `alert-failed-documents.json` | Planifié (8h/jour) | Notifie les échecs du pipeline de capture (à traiter manuellement) |
| `closing-report-email.json` | Planifié (le 5 de chaque mois) | Génère le PDF de synthèse (`/api/reports/closing`) et l'envoie par email |

Les workflows d'alerte appellent des endpoints protégés par
`INGEST_API_TOKEN` (même jeton que l'ingestion) — voir
`src/lib/auth/n8nToken.ts` côté application.

## Ce qui reste à faire manuellement sur le VPS (hors de cette session)

- Créer les 3 boîtes mail de capture + l'adresse d'émission, si ce n'est pas
  déjà fait (fournisseur mail au choix).
- Importer et configurer ces 7 workflows.
- Vérifier qu'ils tournent sans erreur pendant quelques jours avant de faire
  confiance à la relance automatique.
