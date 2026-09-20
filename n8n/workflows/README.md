# Workflows n8n — Phase 5 + Kerbooth 360°

Ces workflows sont des **modèles à importer et adapter**, pas des exports
testés sur une instance n8n réelle : cette session de développement n'a pas
d'accès à l'instance n8n du VPS. Compter environ 30 min de vérification par
workflow au premier import (davantage pour les 4 workflows Kerbooth, qui
dépendent de Stripe/Yousign — voir section dédiée ci-dessous).

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

## Workflows Kerbooth 360° (nouveau)

Voir `kerbooth360/architecture-decision.md` pour le contexte : ces workflows
appellent l'outil compta (nouveaux points d'API `/api/kerbooth/*`, mêmes
`APP_URL`/`INGEST_API_TOKEN` que ci-dessus) au lieu de Supabase/Abby comme
prévu dans le dossier Kerbooth original — Phase 1 (Benoît seul) uniquement.

**⚠️ Ordre revu le 20/09/2026 : le contrat se signe AVANT le paiement**, pas
après (contrairement au dossier Kerbooth original) — la page de signature
Yousign s'affiche en premier, la page de paiement Stripe ensuite.
`KerboothBookingStatus` reflète cet ordre : `PENDING_SIGNATURE` →
`PENDING_PAYMENT` → `CONFIRMED`.

**⚠️ Paiement direct en une fois, revu le 20/09/2026** : plus d'acompte/solde
séparés (ancienne version) — le client règle le montant total à la
confirmation du contrat, ce qui simplifie le prélèvement (plus de second
prélèvement à J+1 ni de risque d'échec de prélèvement du solde). Pas de
lien d'annulation en libre-service ni de délai de remboursement automatique
(décision de Benoît le 20/09/2026 — cette prestation n'y est de toute façon
pas légalement obligée, voir CGV article 5) : une annulation reste possible
manuellement, mais sans remboursement automatisé.

| Fichier | Déclencheur | Rôle |
|---|---|---|
| `kerbooth-booking-request.json` | Webhook (formulaire site/HubSpot) | Crée la réservation (dispatch automatique), envoie immédiatement le contrat à signer via Yousign, répond 409 "complet" si aucune unité disponible |
| `kerbooth-yousign-contract-signed.json` | Webhook Yousign (`signature_request.done`) | Passe la réservation en attente de paiement, crée la page de paiement Stripe (montant total), l'envoie au client |
| `kerbooth-stripe-payment-received.json` | Webhook Stripe (`checkout.session.completed`) | Crée et marque payée la facture dans l'outil compta, confirme la réservation, envoie la facture au client par email |
| `kerbooth-urssaf-reminder.json` | Planifié (1er de chaque mois) | Calcule le CA Kerbooth encaissé du mois précédent et le montant de cotisations (21,2 %) à déclarer sur autoentrepreneur.urssaf.fr — aucune télétransmission possible, juste un rappel avec le bon montant |

**⚠️ Ces 4 workflows sont nettement moins mûrs que les 7 premiers** : ils
n'ont pu être vérifiés ni contre une vraie instance n8n, ni contre les API
réelles de Stripe/Yousign/HubSpot (comptes pas encore créés au moment de
l'écriture). En particulier :
- Les nœuds Stripe/Yousign sont des `httpRequest` génériques avec des
  notes `"notes"` marquant explicitement ce qui reste à compléter (corps de
  requête, authentification) — préférer les nœuds natifs Stripe/Yousign de
  n8n s'ils sont disponibles sur votre instance, plus simples à configurer
  qu'un appel HTTP brut.
- Le `bookingId` doit être propagé en métadonnée à chaque étape externe
  (métadonnée Stripe à la création du paiement, `external_id` Yousign à la
  création de la demande de signature) pour que les webhooks de retour
  sachent quelle réservation mettre à jour — à vérifier avec les vrais
  identifiants de champs une fois les comptes créés.
- Manquent encore (prochaine itération, non bloquant pour un lancement
  minimal) : relance/annulation si le contrat n'est pas signé sous 48h,
  rappel du chèque de caution à J-1.
- **Faits depuis** : passage au paiement direct en une fois + lien
  d'annulation en libre-service (ci-dessus) et rappel de déclaration URSSAF
  (`kerbooth-urssaf-reminder.json`).

**Réglages complémentaires** (unités Kerbooth) : se font directement dans
l'outil compta (onglet Réglages → "Kerbooth 360° — Unités"), pas dans n8n —
donner un nom à chacune des 2 unités avant le premier test de dispatch.

## Ce qui reste à faire manuellement sur le VPS (hors de cette session)

- Créer les 3 boîtes mail de capture + l'adresse d'émission, si ce n'est pas
  déjà fait (fournisseur mail au choix).
- Importer et configurer les 7 premiers workflows.
- Créer les comptes Stripe/Yousign/HubSpot pour Kerbooth 360°, puis importer
  et connecter les 6 workflows Kerbooth (voir avertissements ci-dessus).
- Nommer les 2 unités Kerbooth dans Réglages avant le premier test.
- Vérifier que tout tourne sans erreur pendant quelques jours avant de faire
  confiance à la relance automatique.
