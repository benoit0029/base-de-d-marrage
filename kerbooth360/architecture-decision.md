# Kerbooth 360° — Décision d'architecture (Phase 1, solo)

Résout les points laissés ouverts dans `architecture-technique-kerbooth360.md`
à la lumière de la contrainte de lancement à 15 jours et de la demande
explicite de Benoît d'intégrer Kerbooth dans l'outil compta existant.

## Décisions actées le 20/09/2026

### 1. Pas de Supabase en Phase 1 — report à la Phase 2

Le dossier original prévoit Supabase comme base commune obligatoire pour
`units`/`bookings`/`recettes`. **Reporté** : en Phase 1 (Benoît seul, 2
unités), le dispatch est trivial (cf. section dispatch de
`architecture-technique-kerbooth360.md` : "aucun enjeu de répartition
financière" avec une seule personne). Créer un compte Supabase maintenant
ajoute une dépendance externe et un délai de mise en place pour un besoin
qui n'existe pas encore.

**À la place** : les tables `Unit` et `Booking` deviennent de nouveaux
modèles Prisma dans la base Postgres déjà déployée sur le VPS (celle de
l'outil compta) — même serveur, zéro compte à créer, zéro coût
supplémentaire, déployable immédiatement avec `docker compose up -d --build`
comme le reste de l'outil.

**Migration prévue en Phase 2** (quand le partenaire rejoint, "par la
suite" — brand/site/Supabase/domaine deviennent alors réellement communs
aux deux, comme confirmé par Benoît) : à ce moment-là, `Unit`/`Booking`
migrent vers un vrai projet Supabase partagé, propriété commune des deux
associés — cohérent avec le principe déjà acté qu'aucune des deux
comptabilités personnelles (chacune dans son propre outil) n'a à héberger
les données de dispatch de l'autre. Pas à construire maintenant.

### 2. Pas d'Abby comme moteur de facturation Kerbooth — réutilisation de l'outil compta

Le dossier original prévoit qu'Abby (API) génère les factures Kerbooth.
**Remplacé** : l'outil compta a déjà un moteur de facturation complet pour
`BIC_PHOTOBOOTH` (numérotation automatique, PDF avec mentions légales,
TVA non applicable art. 293B, gestion cash-basis des encaissements) —
utilisé pour créer la facture directement, sans passer par Abby.

**Sauf pour un point que Benoît a raison de soulever** : la **facturation
électronique via Plateforme Agréée (PA) est obligatoire pour les factures
B2B** (formule Entreprise) à partir de l'échéance réglementaire — le
dossier Kerbooth le note déjà (émission obligatoire B2B à partir du 1er
septembre 2027, réception déjà obligatoire depuis le 1er septembre 2026).
L'outil compta a déjà ce circuit tout prêt : le bouton **"Envoyer via
Abby"** existant (`PaConnection`/`SendToPaButton`) transmet une facture
déjà créée vers la PA — construit à l'origine pour Maraîchage/Fruits-
Légumes, directement réutilisable pour les factures Entreprise de
Kerbooth sans rien reconstruire. Un compte Abby reste donc utile, mais
uniquement comme **PA de transmission**, pas comme générateur de
factures — inutile de payer le plan Pro pour son API si l'outil compta
fait déjà la facture elle-même.

Pour les clients particuliers (Essentiel/Populaire), pas de transmission
PA nécessaire dans l'immédiat (hors périmètre e-invoicing B2B) — la
facture de l'outil compta suffit.

### 3. Déclaration URSSAF — rappel automatisé, pas de télétransmission

Il n'existe pas d'API publique pour déclarer et payer les cotisations
URSSAF à la place de l'exploitant — cette étape reste manuelle
(autoentrepreneur.urssaf.fr). **Construit** : `kerbooth-urssaf-reminder.json`,
un rappel n8n mensuel calculant le CA encaissé du mois précédent à partir
des factures Kerbooth déjà enregistrées dans l'outil compta
(`computeUrssafReminder`), au taux de 21,2 %. Envoyé chaque mois quelle
que soit la périodicité de déclaration réellement choisie (mensuelle ou
trimestrielle) — un rappel de trop coûte moins cher qu'une échéance
manquée.

### 4. Signature du contrat AVANT le paiement de l'acompte (revu le 20/09/2026)

Le dossier original prévoyait : dispatch → paiement de l'acompte → envoi
du contrat à signer → confirmation. **Benoît a demandé l'inverse** : la
page de signature doit s'afficher avant la page de paiement — le client
signe d'abord, paie ensuite. `KerboothBookingStatus` reflète ce nouvel
ordre (`PENDING_SIGNATURE` → `PENDING_PAYMENT` → `CONFIRMED`), et les
workflows n8n ont été réordonnés en conséquence (voir
`n8n/workflows/README.md`).

### 5. Échec de prélèvement du solde — construit

`checkSoldeOverdue` (`server/services/kerbooth/alerts.ts`) détecte les
réservations confirmées dont l'événement est terminé sans facture de
solde : relance simple du client à partir de J+2, alerte prioritaire à
Benoît à partir de J+5 (répétée chaque jour tant que non résolu — la
caution reste la garantie de dernier recours, CGV article 5bis). Workflow :
`kerbooth-solde-overdue-alert.json`.

### 6. Lien d'annulation en libre-service — EN ATTENTE D'ARBITRAGE

Benoît a demandé un lien d'annulation en libre-service **"donc
remboursement automatique"**. Or les CGV corrigées le 20/09/2026 (à sa
demande explicite, critique 2) posent que **l'acompte n'est remboursable
en aucun cas**. Ces deux demandes se contredisent frontalement — non
implémenté tant que ce point n'est pas tranché avec Benoît :
- Soit le lien d'annulation libre-service ne rembourse jamais l'acompte
  (cohérent avec les CGV telles qu'elles sont aujourd'hui) : il ne fait
  qu'annuler la réservation et libérer l'unité, sans aucun mouvement
  d'argent.
- Soit la politique de remboursement doit être révisée de nouveau (CGV,
  contrat, politique d'annulation, email de confirmation à corriger une
  seconde fois) pour prévoir un remboursement automatique sous certaines
  conditions (délai avant l'événement ?), ce qui annule la simplification
  actée le 20/09/2026.
`cancelBooking` (déjà construit) gère déjà l'annulation sans mouvement
financier — reste à brancher un lien public (page ou email) qui l'appelle,
une fois la question du remboursement tranchée.

### 4. n8n reste l'orchestrateur, HubSpot/Stripe/Yousign/LumaBooth inchangés

Rien ne change sur ces 4 outils, déjà correctement positionnés comme
externes et autonomes dans le dossier original. n8n appelle désormais
l'outil compta (nouveaux points d'API, protégés par le même
`INGEST_API_TOKEN` que le pipeline de capture existant) au lieu d'appeler
Abby/Supabase directement pour la facturation et le dispatch.

## Schéma résultant (Phase 1)

```
Site (formulaire) → n8n → [Unit/Booking dans Postgres compta] → dispatch
                        → Stripe (acompte) → outil compta (créer facture,
                          BIC_PHOTOBOOTH) → Yousign (contrat) → si signé,
                          confirmer Booking
                        → J+1 : Stripe (solde) → outil compta (marquer
                          facture payée / facture de solde)
                        → si formule Entreprise : bouton "Envoyer via
                          Abby" (PA) sur la facture, déjà existant
```

## Ce que ça change concrètement à construire

- Nouveaux modèles Prisma `KerboothUnit`, `KerboothBooking` (voir schema.prisma).
- Nouveaux points d'API pour n8n : dispatch, création de facture Kerbooth,
  marquage payé, confirmation de réservation.
- Workflows n8n adaptés (appellent l'outil compta au lieu de
  Supabase/Abby) : les 14 déclencheurs du dossier original restent la
  référence fonctionnelle, seule la cible technique change.
- Rappel URSSAF Kerbooth (nouveau workflow, extension du principe déjà
  en place).
