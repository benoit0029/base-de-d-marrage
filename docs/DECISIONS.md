# Journal des décisions — compta Kalonia

Ce fichier garde **toutes les décisions prises avec Benoît**, avec leurs
détails, pour qu'aucune conversation n'ait à relire tout l'historique.
Reconstitué le 24/09/2026 à partir de la conversation complète
(13/09 → 24/09/2026), puis tenu à jour au fil de l'eau.

**Comment l'utiliser**
- Lire d'abord le sommaire, puis seulement la section utile.
- Une décision n'est jamais effacée : si elle change, on la marque
  « remplacée par D-xx » et on ajoute la nouvelle.
- Chaque nouvelle décision validée par Benoît est ajoutée ici **dans le
  même commit que le code** (règle de `CLAUDE.md`).
- Aucun secret ici (clés API, mots de passe) : ils vivent dans les `.env`
  du serveur et dans n8n.

**Statut de vérification**
- ✅ vérifié sur une source officielle
- 👤 confirmé par Benoît (il a vérifié lui-même)
- 🔎 sourcé par des sites secondaires seulement
- ❓ non vérifié — à confirmer (Cerfrance, MSA, impôts…)

Autres fichiers de référence : `CLAUDE.md` (règles de travail),
`docs/MISE-EN-PRODUCTION.md` (reste à faire), `docs/ARCHITECTURE.md`
(code), `kerbooth360/architecture-decision.md` (Kerbooth).

## Sommaire
1. [Cadre : entreprise, activités, identité](#1-cadre--entreprise-activités-identité)
2. [Méthode de travail](#2-méthode-de-travail)
3. [Infrastructure et sécurité](#3-infrastructure-et-sécurité)
4. [Saisie assistée par IA](#4-saisie-assistée-par-ia)
5. [Recettes, journal de caisse, fiches vierges](#5-recettes-journal-de-caisse-fiches-vierges)
6. [Dépenses, immobilisations, Tesa+, cotisations](#6-dépenses-immobilisations-tesa-cotisations)
7. [Banque et rapprochement](#7-banque-et-rapprochement)
8. [Facturation](#8-facturation)
9. [TVA du Maraîchage (micro-BA)](#9-tva-du-maraîchage-micro-ba)
10. [Micro-BIC : TVA, déclaration, social, mémo](#10-micro-bic--tva-déclaration-social-mémo)
11. [Micro-BA : obligations, livres, 2042](#11-micro-ba--obligations-livres-2042)
12. [Facture électronique et Abby](#12-facture-électronique-et-abby)
13. [Kerbooth 360 : réservation, paiement, site](#13-kerbooth-360--réservation-paiement-site)
14. [Partenaire Kerbooth](#14-partenaire-kerbooth)
15. [Historique de l'appli (journal d'audit)](#15-historique-de-lappli-journal-daudit)
16. [Idées écartées ou abandonnées](#16-idées-écartées-ou-abandonnées)

---

## 1. Cadre : entreprise, activités, identité

- **D-001 (13/09)** — Trois activités : Maraîchage (micro-BA, TVA au réel
  simplifié agricole, 1 salarié), Revente fruits/légumes et Kerbooth 360
  (photobooth). Revente + Kerbooth = **une seule micro-BIC** (seuils
  communs). Maraîchage et Revente sont en bio (logo AB).
- **D-002 (21/09, confirmé 24/09)** — **Un seul SIRET pour les trois
  activités : 533 242 053 00015** (une seule adresse : Tourc'h). 👤
  (Remplace l'hypothèse de « deux SIRET » faite le 15/09.)
- **D-003 (24/09)** — Activité principale : agricole. La micro-BIC est
  rattachée à la MSA (une déclaration annuelle, appel de cotisations MSA
  pour le compte de l'URSSAF). 👤 situation déclarée par Benoît, ❓ à
  confirmer avec la MSA.
- **D-004 (14/09)** — Appli sur `compta.kalonia.fr` (VPS Hostinger
  srv1880024, dossier `~/compta-ferme`, branche `claude/nice-allen-01aafu`).
- **D-005 (14/09)** — Trois boîtes mail de capture sur Hostinger :
  `maraichage@kalonia.fr`, `fl@kalonia.fr`, `kerbooth@kalonia.fr`. Boîtes
  normales, Benoît y répond ; l'appli ne s'y connecte qu'en lecture (IMAP).
- **D-006 (21/09)** — Domaine `kerbooth360.fr` acheté pour le site
  Kerbooth. Adresse Kerbooth de Benoît : `kerbooth@kalonia.fr`.
- **D-007 (24/09)** — INPI : réponse favorable reçue le 24/09/2026. 👤

## 2. Méthode de travail

- **D-010 (13/09)** — Travail par phases, validation de Benoît à chaque
  étape importante ; Claude prend les décisions techniques seul.
- **D-011 (24/09)** — Ne jamais modifier une fonctionnalité existante
  (Recettes, Dépenses…) sans demander. Discuter avant toute nouveauté ou
  touche fiscale. (Dans `CLAUDE.md`.)
- **D-012 (23/09)** — Ne jamais modifier un texte juridique du site
  kerbooth360.fr sans montrer le nouveau texte à Benoît et obtenir son
  accord. (Dans `CLAUDE.md`.)
- **D-013 (23/09)** — « Boucle d'épreuve » : quand une même erreur revient
  deux fois, ajouter une consigne courte dans `CLAUDE.md` et le signaler.
- **D-014 (23/09)** — Toute affirmation fiscale/juridique dit si elle est
  vérifiée (officiel), sourcée (secondaire) ou non vérifiée.
- **D-015** — Redéploiement : toujours donner les 3 commandes, une par bloc
  (le terminal de Benoît colle mal le multi-lignes).
- **D-016 (24/09)** — Ce journal des décisions + règle de mise à jour dans
  `CLAUDE.md`. Conversations plus courtes, une par chantier, qui repartent
  des fichiers.

## 3. Infrastructure et sécurité

- **D-020 (13/09)** — Next.js + PostgreSQL + Prisma, Docker Compose, Caddy
  déjà en place (partagé avec n8n). Tout paramétrable (rien de spécifique
  codé en dur), en vue d'autres installations.
- **D-021 (13/09)** — Un seul compte utilisateur, double authentification
  (2FA) obligatoire ; secrets chiffrés en base (`APP_ENCRYPTION_KEY`).
- **D-022 (15/09)** — Fichiers (justificatifs, PDF) stockés sur **Scaleway
  Object Storage** (compte personnel, région Paris), migration validée en
  production le 15/09.
- **D-023** — Sauvegardes chiffrées automatiques : **pas encore en place,
  bloquant** avant de se fier à l'appli seule. Stockage chez un autre
  hébergeur que le VPS (Scaleway possible, bucket séparé).
- **D-024 (14-15/09, précisé 24/09)** — Mistral AI pour la lecture des
  documents, compte au nom de l'entreprise, **offre gratuite** 👤. Limites
  atteintes le 15/09 (erreurs 429). Depuis le 24/09, l'appli **réessaie
  automatiquement** (429 et pannes passagères 500/502/503/504 : jusqu'à 4
  nouveaux essais, attente demandée par Mistral ou 2, 4, 8, 16 s). ❓ conditions d'utilisation des
  données sur l'offre gratuite : à vérifier dans les réglages Mistral.
- **D-025 (24/09)** — Réglage `HIDDEN_ACTIVITIES` pour masquer des
  activités dans une installation (vide chez Benoît).

## 4. Saisie assistée par IA

- **D-030 (13/09)** — Quatre étapes IA : tri des mails, lecture (OCR),
  classement (activité + recette/achat/immobilisation), alertes. Tout
  arrive « en attente » ; Benoît valide en un clic.
- **D-031 (15/09)** — Tableaux simplifiés : Importer, Valider, Supprimer
  (en attente), Supprimer la ligne (validée) — suppression invisible mais
  conservée en base (soft-delete) en cas de contrôle.
- **D-032 (14/09)** — Détection des doublons (date + montant + type +
  empreinte du fichier) avec confirmation avant d'enregistrer deux fois.
- **D-033 (15/09)** — Date de paiement et pointage bancaire remplis
  automatiquement ; Benoît ne fait que valider.
- **D-034 (23/09)** — Lecture automatique aussi dans Tesa+, Cotisations non
  salarié et Acomptes.
- **D-035 (24/09)** — Bouton « Corriger » partout où l'IA peut se tromper
  de classement (activité, achat ↔ immobilisation), enregistré dans
  l'historique.
- **D-036 (24/09)** — Une photo peut contenir plusieurs fiches du jour :
  chacune est lue séparément.

## 5. Recettes, journal de caisse, fiches vierges

- **D-040 (14/09)** — Livre des recettes ≠ journal de caisse. Le livre
  contient toutes les recettes ; le journal de caisse n'est qu'une source.
  Au Maraîchage, une facture et une vente directe du même jour restent
  **deux lignes distinctes**, jamais additionnées.
- **D-041 (14/09)** — Ventes > 76 € saisies à part (saisie globale
  journalière réservée aux ventes ≤ 76 €, BOI-BIC-DECLA-30-30). 🔎
- **D-042 (22-23/09)** — On garde la **saisie du jour**, avec une photo
  prise **chaque jour de vente** (pas le bordereau de dépôt hebdomadaire),
  lue par l'IA. Fond de caisse fixe de 30 € par activité, jamais compté
  dans la recette.
- **D-043 (23/09)** — La date lue est celle du **jour de vente**, même si
  la saisie est faite plus tard.
- **D-044 (23-24/09)** — Fiches vierges PDF à imprimer, par activité :
  Revente = espèces ; Maraîchage = espèces, chèques, **CB**, répartition
  « fruits/légumes 5,5 % » et « plants potagers 10 % » ; champ **Lieu**
  (lu par l'IA et repris dans les livres).
- **D-045 (24/09)** — Justificatif CB Up2Pay supprimé (pas de détail TVA) :
  la CB est notée sur la fiche du jour.

## 6. Dépenses, immobilisations, Tesa+, cotisations

- **D-050 (14/09)** — Onglet « Achats/Immobilisations » renommé
  « Dépenses » dans les trois activités.
- **D-051 (14/09)** — « Paie » renommé **Tesa+** : simple import des
  documents (contrat, bulletins, cotisations, certificat, attestation,
  solde de tout compte), aucun calcul.
- **D-052 (14/09)** — Onglet **Cotisations non salarié** (appels MSA de
  Benoît) : chaque import crée une ligne de dépense.
- **D-053 (24/09)** — Immobilisations séparées des achats par la lecture
  automatique, avec bouton « Corriger » (achat ↔ immobilisation).
- **D-054 (24/09)** — Modifier le montant d'une dépense recalcule HT/TVA/TTC.

## 7. Banque et rapprochement

- **D-060 (22/09)** — **Import manuel** du relevé (CSV, ou Excel enregistré
  en CSV) dans l'onglet Relevé bancaire de l'activité. Pas de lecture des
  mails de la banque ni d'agent de tri (écarté, voir §16).
- **D-061 (22/09, confirmé 24/09)** — **3 comptes bancaires pro**, un par
  activité (Maraîchage, Revente, Kerbooth) 👤 → un onglet Relevé bancaire
  par activité, import dans le bon onglet.
- **D-062 (14/09)** — Rapprochement dans les deux sens : dépenses ↔ débits,
  recettes ↔ crédits ; candidats proposés sur une fenêtre de dates (des
  échéances peuvent aller jusqu'à 2 mois).
- **D-063 (23/09)** — Un dépôt hebdomadaire peut être rapproché de
  **plusieurs jours de vente** (somme), avec « + Ajouter un autre jour ».
- **D-064 (23/09)** — Annuler un rapprochement doit remettre le statut
  cohérent (bug corrigé le 23/09).

## 8. Facturation

- **D-070 (13-14/09)** — Un seul modèle de PDF paramétrable ; couleur
  d'accent en liseré seulement ; e-mail de contact par activité.
- **D-071 (14/09)** — Logo AB sur les factures Maraîchage uniquement (code
  organisme configurable, règles INAO non vérifiées ❓).
- **D-072 (14/09, précisé 24/09)** — Revente : 100 % vente directe, pas de
  facture en pratique ; l'onglet Factures reste « pour plus tard au cas
  où ».
- **D-073 (23/09)** — Répertoire clients et catalogue d'articles (liste
  déroulante, création rapide) ; **unités** (pièce, kg…) sur les lignes ;
  **TTC par ligne** sur factures et devis.
- **D-074 (24/09)** — Numérotation légale, deux suites sous le même SIRET,
  chacune avec sa lettre (choix de Benoît) : **FA-M2026-001** (Maraîchage)
  et **FA-K2026-001** (micro-BIC) ; avoirs AV-M… / AV-K… ; devis DE-M… /
  DE-K…. Sans trou, repart à 001 chaque année, refus d'une facture datée
  avant la dernière de sa suite. ❓ deux suites admises : à confirmer avec
  Cerfrance. (Remplace le format FA2026-001 du même jour.)
- **D-075 (24/09)** — **Pas de suppression de facture** : bouton « Annuler
  par un avoir ». Non payée → annulée ; payée → avoir à rembourser, compté
  en négatif à la date du remboursement.
- **D-076** — Le jour du nettoyage des données de test : remettre les
  compteurs de numéros à zéro.

## 9. TVA du Maraîchage (micro-BA)

- **D-080 (23/09)** — Déclaration annuelle nommée comme l'administration :
  **CA12A / 3517-AGR-SD (TVA)** ; alerte automatique d'échéance.
- **D-081 (23/09)** — Taux : fruits/légumes 5,5 %, plants potagers 10 %.
  Le registre TVA compte la TVA des ventes directes.
- **D-082 (24/09)** — Acomptes = 1/5 de la TVA nette de l'année précédente
  si ≥ 1 000 €, aux 5 mai, 5 août, 5 novembre, 5 février. ❓ (règle du
  document de Benoît, à confirmer avant le premier paiement).

## 10. Micro-BIC : TVA, déclaration, social, mémo

- **D-090 (20/09)** — Seuils micro-entreprise revalorisés pour 2026-2028 :
  ventes 203 100 €, services 83 600 €, micro-BA 129 200 € (moyenne
  triennale). 🔎
- **D-091 (23/09)** — Sortie de franchise TVA micro-BIC détectée
  automatiquement (année précédente et année en cours, seuil majoré), mais
  **rien ne bascule sans confirmation** de Benoît (date d'effet, n° de TVA,
  prix Kerbooth inchangé ou +20 %). Numéro de TVA obligatoire 👤, 20 % sur
  Kerbooth 👤, 5,5 % sur la Revente 👤 ; acomptes CA12 ❓.
- **D-092 (24/09)** — Synthèse micro-BIC organisée comme le Maraîchage :
  Obligations, Suivi des seuils, TVA, Déclaration 2042 (cases 5KO ventes /
  5KP services ❓), Cotisations sociales, E-reporting ; livres par activité.
- **D-093 (24/09)** — Abattements micro-BIC 71 % (ventes) et 50 %
  (services), minimum 305 €. 👤
- **D-094 (24/09)** — Taux URSSAF : 12,3 % ventes, 21,2 % services, + 0,1 %
  de CFP. 👤
- **D-095 (24/09)** — Régime social au choix dans Cotisations sociales ;
  Benoît = **MSA**, pas de rappel URSSAF. MSA et URSSAF restent séparés
  tant que la MSA n'a pas confirmé.
- **D-096 (24/09)** — **Mémo « ce qu'il te reste réellement »** en haut
  d'Obligations, en **tableau** (Kerbooth / Revente / Total) recalculé à
  chaque ouverture : CA, − charges sociales, − dépenses réelles, = reste,
  revenu déclaré ; message vert/rouge ; une barre par activité avec le
  repère de l'abattement et la marge restante ; explication en phrases
  dans « Comment ça marche ». Principe : si dépenses + cotisations restent
  sous l'abattement, on gagne plus que ce qu'on déclare.
- **D-097 (24/09)** — Seuil micro-BA de la Synthèse calculé en **HT**, même
  calcul que la page 2042 du Maraîchage.

## 11. Micro-BA : obligations, livres, 2042

- **D-100 (24/09)** — Onglets Maraîchage regroupés par sections : Vue
  d'ensemble / Comptable / Fiscal / Social / Abby, avec la date de mise en
  place de ce qui s'activera plus tard.
- **D-101 (24/09)** — **Livre des recettes** et **Livre des achats**
  (deux onglets séparés, lecture seule, totaux, PDF à pages numérotées) ;
  les onglets de saisie Recettes/Dépenses restent inchangés.
- **D-102 (24/09)** — Vraie page **Déclaration 2042** + saisie des recettes
  des années d'avant l'outil (moyenne triennale).
- **D-103 (24/09)** — Onglet **Employeur** (registre du personnel, visite
  d'information, DUERP, affichages, mutuelle, prévoyance).
- **D-104 (24/09)** — Ne jamais afficher « Cerfrance » dans l'appli :
  l'appli est construite pour Abby.

## 12. Facture électronique et Abby

- **D-110 (20/09, 24/09)** — L'appli reste le **moteur de facturation** ;
  Abby ne sert que de **canal de transmission** (plateforme agréée) : pas
  de factures refaites dans Abby (sinon deux numérotations).
- **D-111 (24/09)** — Réception des factures fournisseurs obligatoire depuis
  le 1/09/2026 : couverte par la plateforme actuelle de Benoît. Émission
  B2B + e-reporting au **1/09/2027**. 🔎
- **D-112 (24/09)** — Le Maraîchage fait des **factures à des
  professionnels** → facture électronique obligatoire, avec TVA → offre
  Abby **Maîtriser** (9 €/mois) minimum. « Pro » = Maîtriser, « Business »
  = Aller plus loin 👤. Connexion bancaire d'Abby inutile (relevés déjà
  importés dans l'appli).
- **D-113 (24/09)** — Mail de questions à Abby rédigé (docs/MISE-EN-
  PRODUCTION.md §6) — question 10 ajoutée le 24/09 : frais du paiement
  en ligne Stripe via Abby (total ou en plus des frais Stripe ? compte
  Stripe existant utilisable ?) ; calendrier : ne rien payer avant ~mai-juin 2027,
  changer de plateforme au 1er janvier idéalement, sans jamais un jour
  sans plateforme ; tout prêt avant le 1/09/2027.
- **D-114 (24/09)** — Onglet **E-reporting** : totaux des ventes aux
  particuliers par jour et par taux, export tableur ; transmission via Abby
  à activer.

## 13. Kerbooth 360 : réservation, paiement, site

- **D-120 (20/09)** — Réservations et unités dans la base de l'appli (pas
  de Supabase ni d'Abby pour l'instant). Deux unités : **Coquelicot** et
  **Hémérocalle**, renommables et extensibles dans Réglages.
- **D-121 (20/09)** — Contrat signé (Yousign) **avant** le paiement.
- **D-122 (20/09)** — **Paiement direct en une fois** (plus d'acompte ni de
  solde).
- **D-123 (20/09)** — Pas de droit de rétractation (prestation à date
  fixe, L221-28 12°) mais **information visible avant paiement** sur le
  site. Pas de lien d'annulation en libre-service : annulation manuelle.
- **D-124 (22/09)** — Signature et paiement **intégrés au site** (pas par
  mail) ; documents envoyés ensuite par mail ; mail de confirmation avec
  la facture et la **date de l'événement**.
- **D-125 (22/09)** — Caution : **chèque de 1 500 €**, restitué à la
  récupération du matériel, affiché de façon visible. Nettoyage : **150 €
  minimum, plafonné à la caution**, vérifié directement à l'installation.
- **D-126 (22/09)** — Site : téléphone inclus avec le photobooth ;
  « livraison possible autres secteurs » ; « réservation en ligne simple
  et rapide » ; mentions légales, CGV, politique de confidentialité ;
  cookies revus (23/09).
- **D-127 (22/09)** — Médiateur de la consommation : **CM2C** (48 € pour
  3 ans).
- **D-128 (21/09)** — Stripe, et Yousign en offre One ; passage en mode réel
  après l'assurance (INPI et SIRET déjà OK). Sur n8n, nœud Stripe en
  « Form URL Encoded » (non conservé à l'import).
- **D-129 (20/09)** — Rappel URSSAF mensuel : désormais inactif en régime
  MSA (D-095).

## 14. Partenaire Kerbooth

- **D-130 (23/09)** — Le partenaire aura **sa propre** installation : sa
  base, son Stripe, son Yousign, sa boîte mail — jamais partagés.
  Validation du montage par Cerfrance/un juriste avant tout.
- **D-131 (23/09)** — Sa boîte : `partenaire@kerbooth360.fr` (nom exact
  plus tard), abonnement à son nom ; Benoît n'ajoute que les DNS.
- **D-132 (23-24/09)** — Zip « jour J » (code figé + guide + mémo
  juridique) tenu à jour à chaque évolution ; chez lui
  `HIDDEN_ACTIVITIES=maraichage,fruits-legumes`, numéros FA-K…, régime
  URSSAF mensuel ou trimestriel.
- **D-133 (24/09)** — Guide et mémo du zip rangés dans `docs/partenaire/`
  (avec la façon de régénérer le zip) ; zip ressorti quand Benoît le
  demande.

## 15. Historique de l'appli (journal d'audit)

- **D-140 (24/09)** — Historique visible par personne dans l'appli (preuve
  en base seulement) ; lignes de plus de **10 ans effacées
  automatiquement**.

## 16. Idées écartées ou abandonnées

- **D-150 (15/09)** — Bouton de dictée vocale retiré partout (idée « type
  Jarvis » pour plus tard).
- **D-151 (22/09)** — Agent qui lit les mails de la banque et redistribue
  les relevés : écarté (téléchargement manuel de toute façon nécessaire).
- **D-152 (20/09)** — Lien d'annulation avec remboursement automatique :
  retiré (contradictoire avec D-123).
- **D-153 (20/09)** — Supabase / Abby pour Kerbooth dès maintenant : non.
- **D-154 (24/09)** — **SaaS** (vendre l'outil à d'autres agriculteurs) :
  **abandonné** par Benoît (trop compliqué).
