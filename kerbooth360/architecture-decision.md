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

**Confirmé le 20/09/2026** (Benoît a redemandé si le report posait un
risque pour la Phase 2) : non, ce choix ne complique pas l'arrivée du
partenaire. `KerboothUnit`/`KerboothBooking` n'ont que deux dépendances
vers le reste de la base compta de Benoît : `tenantId` (son tenant) et
`invoiceId` (ses factures `BIC_PHOTOBOOTH`) — aucune autre table ne
pointe vers elles. Migrer ces deux modèles vers Supabase en Phase 2
consistera à exporter leurs lignes, les réimporter dans le nouveau projet
partagé, et remplacer les deux champs ci-dessus (le partenaire aura sa
propre facturation, dans son propre outil, avec son propre lien vers ses
propres factures) — un export/import classique, pas une restructuration.
Rien dans le code actuel n'ancre ces modèles à la base de Benoît au-delà
de ces deux champs.

**Abby comme PA n'a aucune dépendance envers Supabase** (point soulevé par
Benoît le 20/09/2026, "si besoin du PA pour septembre 2027 autant utilisé
tout de suite abby supabase") : ce sont deux produits indépendants — Abby
transmet des factures déjà créées vers la plateforme agréée, Supabase est
juste une base de données. Créer un compte Abby maintenant plutôt qu'en
2027 n'a aucun lien technique avec la question Supabase, et n'apporte rien
avant que l'obligation B2B n'entre en vigueur (le bouton "Envoyer via
Abby" existant suffira le moment venu, voir point 2). Migrer vers Supabase
maintenant, à l'inverse, ajouterait un compte et une dépendance externe
pour un besoin qui n'existe pas encore en Phase 1 solo — la recommandation
reste donc : aucun des deux tout de suite, comme confirmé par Benoît.

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

### 4. Signature du contrat AVANT le paiement (revu le 20/09/2026)

Le dossier original prévoyait : dispatch → paiement de l'acompte → envoi
du contrat à signer → confirmation. **Benoît a demandé l'inverse** : la
page de signature doit s'afficher avant la page de paiement — le client
signe d'abord, paie ensuite. `KerboothBookingStatus` reflète ce nouvel
ordre (`PENDING_SIGNATURE` → `PENDING_PAYMENT` → `CONFIRMED`), et les
workflows n8n ont été réordonnés en conséquence (voir
`n8n/workflows/README.md`).

### 5. Paiement direct en une fois, sans lien d'annulation ni remboursement automatique (revu le 20/09/2026, remplace les points 5-6 initiaux)

Benoît est revenu sur le découpage acompte/solde : **"j'enlève l'acompte et
je fais paiement direct, ça évite des flux"**. Décision actée, elle résout
au passage la contradiction du point 6 initial (acompte non remboursable vs
lien d'annulation en libre-service) :

- **Paiement en une fois** à la confirmation du contrat (`totalAmount`
  unique, `KerboothBooking` n'a plus qu'une seule facture). Plus de second
  prélèvement Stripe à J+1, donc plus d'échec de prélèvement du solde à
  gérer (`checkSoldeOverdue` supprimé, ainsi que `kerbooth-solde-overdue-
  alert.json` et `kerbooth-stripe-solde-paid.json`) — simplification nette
  du nombre de flux et de points de défaillance.
- **Pas de lien d'annulation en libre-service ni de remboursement
  automatique** : Benoît a d'abord demandé un tel lien "donc remboursement
  automatique", proposition initialement implémentée avec un délai de
  courtoisie de 14 jours (`REFUND_WINDOW_DAYS`) — puis **explicitement
  retirée le même jour** ("supprime le lien d'annulation et délai de
  rétractation si pas obligatoire"), cette prestation n'y étant de toute
  façon pas légalement obligée (art. L221-28 12° du Code de la
  consommation, "activités de loisirs à date déterminée"). `cancelBooking`
  (`server/services/kerbooth/bookings.ts`) se contente donc d'annuler la
  réservation et de libérer l'unité ; un remboursement éventuel reste un
  geste manuel de Benoît, cohérent avec la politique CGV article 5.

### 6. n8n reste l'orchestrateur, HubSpot/Stripe/Yousign/LumaBooth inchangés

Rien ne change sur ces 4 outils, déjà correctement positionnés comme
externes et autonomes dans le dossier original. n8n appelle désormais
l'outil compta (nouveaux points d'API, protégés par le même
`INGEST_API_TOKEN` que le pipeline de capture existant) au lieu d'appeler
Abby/Supabase directement pour la facturation et le dispatch.

## Schéma résultant (Phase 1)

```
Site (formulaire) → n8n → [Unit/Booking dans Postgres compta] → dispatch
                        → Yousign (contrat) → si signé, réservation en
                          attente de paiement
                        → Stripe (paiement en une fois) → outil compta
                          (créer facture BIC_PHOTOBOOTH, la marquer payée,
                          confirmer Booking) → email facture au client
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
