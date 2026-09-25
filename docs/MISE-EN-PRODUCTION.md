# Reste à faire avant la mise en production — par ordre de priorité

État au 24/09/2026. L'appli tourne déjà sur le vrai serveur
(`https://compta.kalonia.fr`) et enregistre pour de vrai, mais elle n'est pas
encore "en production" au sens où l'on pourrait s'y fier seule pour ses
déclarations. Chaque point ci-dessous dit pourquoi il compte, ce qu'il faut
de ton côté, et comment le faire.

---

## 1. Sauvegardes chiffrées — BLOQUANT

**Pourquoi** : aujourd'hui toute la compta vit sur un seul serveur. Panne
disque, erreur de manipulation ou piratage = tout est perdu, y compris les
justificatifs à conserver 10 ans pour un contrôle fiscal.

**Ce qu'il te faut** : un compte de stockage S3-compatible **chez un autre
hébergeur que le serveur** — le compte **Scaleway** déjà ouvert pour les
justificatifs convient, avec un bucket séparé réservé aux sauvegardes
(sinon OVH Object Storage ou Backblaze B2 ; quelques centimes par mois pour
ce volume). Tu crées un
"bucket" privé et une clé d'accès, puis tu me donnes : l'endpoint, le nom du
bucket, la clé d'accès et le secret.

**Comment (je te guide le moment venu, une commande à la fois)** :
1. Renseigner dans `.env` (racine du serveur) : `BACKUP_S3_ENDPOINT`,
   `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY`, `BACKUP_S3_SECRET_KEY`, et
   `BACKUP_ENCRYPTION_PASSPHRASE` (une longue phrase secrète, à noter aussi
   sur papier : sans elle, les sauvegardes sont illisibles).
2. Lancer une première sauvegarde manuelle : `./scripts/backup.sh`.
3. Planifier une sauvegarde automatique chaque nuit (cron, 3 h du matin).
4. **Tester une restauration** sur une base de test (`./scripts/restore.sh`)
   — une sauvegarde jamais restaurée ne prouve rien. Noter la date du test.

Détails techniques : `docs/DEPLOYMENT.md` §8.

## 2. Supprimer les données de test

**Pourquoi** : les saisies, relevés bancaires, réservations Kerbooth et
factures créés pendant les tests fausseraient le chiffre d'affaires, la TVA,
les seuils et les déclarations.

**Comment** :
- Relevés bancaires : bouton "Supprimer ce relevé" (onglet Relevé bancaire,
  bloc "Relevés déjà importés").
- Saisies du jour, dépenses, imports Tesa+/MSA/acomptes : "Supprimer" sur
  chaque ligne encore en attente.
- Lignes déjà **validées** et factures/réservations Kerbooth de test : elles
  ne se suppriment pas depuis l'appli (protection contrôle fiscal) — je te
  donnerai des commandes de base de données précises, en vérifiant d'abord
  ce qu'elles vont supprimer, comme pour les nettoyages Kerbooth précédents.
- Idéalement juste avant de commencer la vraie saisie (1er jour d'activité
  réelle ou 1er janvier).
- **Numérotation des factures** : le même jour, après suppression des
  factures de test, remettre à zéro les compteurs (table
  `InvoiceSequence`) pour que la première vraie facture soit bien
  FA-M2026-001 / FA-K2026-001 (ou 2027). Les factures de test créées avant le
  24/09/2026 gardent leur ancien numéro tant qu'elles existent.

## 3. Sortie de franchise TVA micro-BIC (Revente + Kerbooth) — CONSTRUIT

**Ce qui est en place** (page Synthèse micro-BIC → "TVA de la micro-BIC") :
- détection automatique sur l'année précédente ET l'année en cours
  (seuil de base dépassé l'an dernier → TVA depuis le 1er janvier ; dépassé
  cette année → au 1er janvier suivant ; seuil majoré dépassé → dès
  l'opération qui le franchit), avec alerte n8n ;
- bascule seulement après **ta confirmation** : date d'effet, numéro de TVA
  (à demander au SIE), choix du prix Kerbooth (inchangé ou +20 %) ;
- factures Kerbooth avec TVA 20 % extraite du montant payé (au centime
  près), TVA 5,5 % sur la Revente, déclaration annuelle CA12 (3517-S-SD)
  préparée automatiquement, acomptes semestriels calculés.

**Vérification des règles** (23/09/2026) :
- confirmés par Benoît : numéro de TVA obligatoire sur les factures, 20 %
  sur la location Kerbooth, 5,5 % sur les fruits et légumes ;
- sourcés seulement par des sites secondaires (sites officiels
  inaccessibles depuis l'outil) : date d'effet de la sortie de franchise,
  **suppression ou non de la tolérance sur deux années** ;
- non vérifiés : acomptes semestriels de la CA12 (juillet 55 %, décembre
  40 %, dispense sous 1 000 €).
→ À faire valider par Cerfrance avant de confirmer la bascule.

**Le jour où ça arrive** : obtenir le numéro de TVA, confirmer sur la page,
retirer la mention "TVA non applicable, art. 293 B" des CGV du site (et
mettre à jour les prix si tu choisis +20 %), faire valider la première
déclaration par Cerfrance.

## 4. Passer Kerbooth en mode réel (Stripe + Yousign)

**Pourquoi** : aujourd'hui aucun vrai paiement ni aucune vraie signature ne
passe (clés de test / sandbox).

**Quand** : après les retours INPI, assurance et SIRET définitifs.
INPI : **réponse favorable reçue le 24/09/2026** ; SIRET définitif :
**533 242 053 00015** (24/09/2026, déjà celui affiché sur kerbooth360.fr) —
reste l'assurance.

**Comment** :
1. Stripe : activer le compte (pièces d'identité, IBAN), récupérer les clés
   **live** (`pk_live_…`, `sk_live_…`), remplacer la clé publique dans
   `kerbooth360/site/index.html` et la clé secrète dans n8n, recréer le
   webhook `checkout.session.completed` côté live.
2. Yousign : passer de l'environnement sandbox à la production (nouvelle clé
   API, nouveau webhook, domaine iFrame `kerbooth360.fr` à ré-autoriser).
3. Dans n8n, sur le nœud Stripe, vérifier que "Body Content Type" est bien
   sur **Form URL Encoded** (ce réglage n'est pas conservé quand on recolle
   un nœud).
4. Faire une vraie réservation test de faible montant, puis la rembourser.

## 4bis. Devis entreprise par mail (construit le 25/09/2026, D-160)

**Ce qui est en place** : Kerbooth 360 → Factures → Devis (e-mail, formule
libre, nombre de photobooths, dates, lieu, délai de paiement) → bouton
« Envoyer au client » (photobooths bloqués) → devis + contrat signés dans
la même fenêtre Yousign → relances J+3 / J+10, expiration J+15 → facture
envoyée par mail, payable par virement (RIB sur la facture).

**À faire de ton côté, dans cet ordre** :
1. **Réglages** → Kerbooth 360 (et les autres activités) : saisir l'**IBAN**
   et le **BIC** du compte pro ; Maraîchage : vérifier que le code
   certificateur AB est **FR-BIO-01**.
2. Conditions générales de location aux professionnels : définitives et
   sourcées (`kerbooth360/documents/cgv-professionnels.md`) ; relecture
   Cerfrance conseillée à l'occasion, non bloquante.
3. **n8n** : importer `kerbooth-quote-send.json` et
   `kerbooth-quote-daily.json`, **réimporter**
   `kerbooth-yousign-contract-signed.json` et
   `kerbooth-stripe-payment-received.json` (facture jointe au mail du site),
   activer, vérifier
   `SMTP_FROM = kerbooth@kalonia.fr`.
4. **Test complet en sandbox** avec ta propre adresse mail comme client :
   devis → envoi → signature → facture reçue ; puis un devis laissé sans
   signature pour voir la relance.

 (Phase 2 — pas avant qu'il crée sa micro)

Tout est préparé dans l'archive `kerbooth-partenaire-jourJ.zip` (code +
guide de déploiement + mémo juridique) et dans le mémo en ligne "Kerbooth —
Statut à deux". Point préalable obligatoire : validation du montage par
Cerfrance/un juriste.

## 6. Facture électronique (Plateforme Agréée, PA)

**Ce qui s'applique à toi** (sources secondaires seulement, sites officiels
inaccessibles depuis l'outil, à confirmer avec Cerfrance) :
- **Recevoir** les factures fournisseurs au format électronique : obligatoire
  depuis le **1er septembre 2026**, pour toutes les entreprises, micro et
  franchise comprises → déjà couvert pour l'instant (PA actuelle de
  Benoît, 24/09/2026).
- **Émettre** les factures aux professionnels via une PA, et transmettre
  les totaux des ventes aux particuliers (**e-reporting**) : à partir du
  **1er septembre 2027** pour les petites entreprises.
- L'exclusion des exploitants au remboursement forfaitaire agricole (RFA) ne
  te concerne pas : tu es au réel simplifié agricole.

**Choix retenu : l'appli reste construite sur Abby.** Bascule sur Abby
prévue quand Benoît quittera sa PA actuelle — idéalement au 1er janvier
(pas d'exercice coupé en deux) et en tout cas avant le **1er septembre
2027**. Le jour de la bascule : créer le compte Abby, se faire inscrire à
l'annuaire avec Abby (changement de plateforme), puis :
- vérifier si Abby peut renvoyer par mail les factures reçues vers la boîte
  de capture Maraîchage (tout automatique, rien à construire) ;
- sinon, liaison directe appli ↔ Abby (API, peut-être payante) ;
- tester le bouton « Envoyer via Abby » (écrit sans accès à la
  documentation d'Abby, jamais testé) ;
- e-reporting : onglet « E-reporting » (Maraîchage) construit le 24/09/2026
  — totaux des ventes aux particuliers par jour et par taux, export
  tableur ; reste la transmission via Abby (format et fréquence à
  confirmer).

**Réponse du chat Abby (24/09/2026, à reconfirmer au moment de souscrire —
tarifs non vérifiés)** : l'offre **gratuite** permet seulement de créer et
envoyer factures et devis (numérotation légale, conforme facture
électronique). Réservé aux offres payantes : factures **avec TVA** et totaux
TVA / e-reporting (Pro), **dépôt de factures faites ailleurs** (Pro),
**API** (Pro/Business), renvoi automatique des factures fournisseurs par
mail (payant). Conséquences :
- Maraîchage (assujetti TVA) : l'offre gratuite ne suffit pas → **Abby Pro**
  nécessaire, que ce soit pour l'envoi automatique depuis l'appli (API) ou
  pour le dépôt manuel des PDF ;
- micro-BIC en franchise : l'offre gratuite obligerait à refaire les
  factures dans Abby (deux numérotations en parallèle → à éviter) ;
- Revente : ventes directes aux particuliers seulement → e-reporting, pas
  de facture ;
- décision à prendre avant le 1er septembre 2027.

**Grille Abby transmise par Benoît (24/09/2026, prix par mois, HT ou TTC
non précisé)** : Basique gratuit ; Commencer 5,40 € ; Maîtriser 9,00 € ;
Aller plus loin 19,80 €. D'après la grille : facturation électronique dès
le gratuit ; envoi des documents par e-mail dès Commencer ; **factures et
devis avec TVA, déclaration de TVA et « Automatisation / intégrations »
(bêta) à partir de Maîtriser**. Paiement en ligne avec Stripe : non sur
Basique ; 3,4 % + 0,60 € (Commencer) ; 1,9 % + 0,50 € (Maîtriser) ;
1,5 % + 0,25 € (Aller plus loin) — on ne sait pas si c'est le total ou
une commission Abby en plus des frais Stripe (question 10 du mail).
Benoît a déjà son propre compte Stripe (celui de Kerbooth). À faire confirmer par Abby (voir le
mail ci-dessous) : l'offre Maîtriser (= « Pro ») permet le dépôt
de factures faites ailleurs, l'API et l'e-reporting ? un abonnement par
entreprise (micro-BA et micro-BIC) ?

Précisions de Benoît (24/09/2026) : le Maraîchage fait des **factures à
des professionnels** → facture électronique via une plateforme agréée
obligatoire au 1/09/2027, avec TVA → offre **Maîtriser (9 €/mois)
minimum** si Abby. « Pro » = Maîtriser (1 compte bancaire) et
« Business » = Aller plus loin (comptes bancaires illimités) — confirmé par
Benoît le 24/09/2026 :
la connexion bancaire d'Abby n'est pas utile ici, les relevés s'importent
déjà dans l'appli (onglet Relevé bancaire).

### Mail à envoyer à Abby (rédigé le 24/09/2026)

À envoyer depuis ton compte ou le formulaire de contact d'Abby. Compléter
les [crochets] avant l'envoi.

> **Objet : Questions avant souscription — un SIRET, trois activités,
> factures émises depuis mon propre logiciel, e-reporting**
>
> Bonjour,
>
> Je prévois de passer par Abby comme plateforme agréée pour la facturation
> électronique avant l'échéance du 1er septembre 2027. Avant de choisir une
> offre, j'ai besoin de confirmations précises.
>
> **Ma situation : un seul SIRET (533 242 053 00015), trois activités**
> 1. Maraîchage (micro-BA, **assujetti à la TVA** au réel simplifié
>    agricole) : ventes directes aux particuliers (marchés, vente à la
>    ferme) et **factures à des professionnels** (restaurants, magasins),
>    TVA à 5,5 %, 10 % et 20 %.
> 2. Revente de fruits et légumes (micro-BIC, **franchise de TVA**) :
>    vente directe aux particuliers uniquement.
> 3. Location d'un photobooth (micro-BIC, **franchise de TVA**) : surtout
>    des particuliers, parfois des professionnels.
>
> Mes factures et avoirs sont déjà produits par mon propre logiciel de
> comptabilité (deux suites continues sous le même SIRET : FA-M2026-001
> pour le maraîchage, FA-K2026-001 pour la micro-BIC ; avoirs AV-M… et
> AV-K… ; PDF).
> Je souhaite garder ce logiciel et utiliser Abby uniquement pour la
> transmission (factures électroniques, e-reporting, réception des factures
> fournisseurs).
>
> **Mes questions**
> 1. **Dépôt de factures produites ailleurs** : puis-je déposer dans Abby les
>    factures émises par mon logiciel pour qu'Abby les transmette comme
>    factures électroniques, **en gardant ma propre numérotation** ? À partir
>    de quelle offre ? Quel format faut-il : PDF simple, Factur-X, UBL ou CII ?
> 2. **API** : l'offre « Maîtriser » donne-t-elle accès à une API pour
>    envoyer ces factures et avoirs automatiquement depuis mon logiciel ?
>    La ligne « Automatisation / intégrations (bêta) » correspond-elle à cette
>    API ? Où trouver la documentation ?
> 3. **E-reporting** : pour les ventes aux particuliers (vente directe,
>    location), Abby transmet-elle l'e-reporting à l'administration ? À partir
>    de quelle offre, y compris pour une entreprise en franchise de TVA ?
>    Puis-je importer des totaux par jour et par taux de TVA (fichier CSV ou
>    API) ? À quelle fréquence faut-il transmettre ?
> 4. **Un SIRET, deux régimes de TVA** : un seul abonnement « Maîtriser »
>    peut-il gérer, sous le même SIRET, des factures avec TVA (maraîchage)
>    et des factures sans TVA avec la mention « TVA non applicable, art.
>    293 B du CGI » (micro-BIC) ? L'e-reporting peut-il séparer les
>    activités ?
> 5. **Réception des factures fournisseurs** : est-elle incluse dans l'offre
>    gratuite ? Comment les récupérer vers mon logiciel : renvoi
>    automatique par e-mail, API ou téléchargement ? À partir de quelle offre ?
> 6. **Changement de plateforme** : je suis aujourd'hui inscrit à l'annuaire
>    via une autre plateforme agréée. Quelle est la démarche pour passer chez
>    Abby, et en combien de temps est-elle effective ?
> 7. **Avoirs** : les avoirs (montants négatifs, liés à la facture
>    d'origine) sont-ils acceptés par dépôt ou par API ?
> 8. **Calendrier** : quel délai prévoir entre la souscription et la
>    première transmission ? Y a-t-il une période d'essai sur « Maîtriser » ?
> 9. **Sortie** : si je quitte Abby, comment récupérer mes factures et
>    données ?
> 10. **Paiement en ligne avec Stripe** : votre grille indique « Non » sur
>    Basique, puis 3,4 % + 0,60 € (Commencer), 1,9 % + 0,50 € (Maîtriser)
>    et 1,5 % + 0,25 € (Aller plus loin). J'ai **déjà mon propre compte
>    Stripe**. À quoi correspondent exactement ces pourcentages et ces
>    montants fixes : est-ce le **total** prélevé par paiement (frais
>    Stripe compris), ou une **commission Abby qui s'ajoute** aux frais
>    de Stripe ? Par paiement ou par facture ? Pour toutes les cartes
>    (européennes, hors UE, professionnelles) ? Puis-je **connecter mon
>    compte Stripe existant** à Abby, et dans ce cas quels frais
>    s'appliquent ? Le paiement en ligne est-il facultatif (aucuns frais
>    si je ne l'active pas) ?
>
> Merci d'avance pour vos réponses précises, offre par offre.
>
> Cordialement,
> Benoît [nom]
> [téléphone]

### Méthode et calendrier de souscription (à ajuster avec les réponses)

1. **Maintenant** : envoyer le mail, sans rien souscrire. Me transmettre la
   réponse ; j'adapte l'appli si besoin (fichier Factur-X, liaison API,
   format de l'e-reporting).
2. **Au moment de quitter ta plateforme actuelle** (idéalement au
   1er janvier, pour ne pas couper l'année en deux) : créer le compte Abby
   (offre gratuite si elle suffit pour recevoir les factures fournisseurs)
   et changer l'inscription à l'annuaire. La réception est obligatoire
   depuis le 1er septembre 2026 : ne jamais rester un seul jour sans
   plateforme (ouvrir Abby avant de fermer l'ancienne).
3. **Vers mai–juin 2027** : souscrire **Maîtriser** pour le Maraîchage
   (période d'essai si elle existe), puis tester en vrai : une facture à un
   professionnel, un avoir, un envoi d'e-reporting.
4. **Juillet–août 2027** : corriger ce qui coince ; tout doit fonctionner
   avant le **1er septembre 2027**.
5. **Micro-BIC** : même SIRET que le Maraîchage (confirmé par Benoît le
   24/09/2026) → un seul compte Abby pour les trois activités, sous
   réserve de la réponse à la question 4.

## 7. Obligations micro-BA — construit le 24/09/2026

Onglets Maraîchage regroupés par section (Vue d'ensemble / Comptable /
Fiscal / Social / Abby), d'après le document « Obligations micro-BA » :
- **Obligations** (vue d'ensemble, échéances, ce qui reste à activer) ;
- **Livre des recettes** et **Livre des achats** (lecture seule, totaux
  par trimestre et par an, PDF à pages numérotées) ;
- **Registre TVA** : compte désormais la TVA des ventes directes ;
- **Acompte TVA** : acomptes attendus = 1/5 de la TVA nette de l'année
  précédente si elle atteint 1 000 €, aux 5 mai, 5 août, 5 novembre et
  5 février (règle du document, non vérifiée par l'outil — à confirmer
  avant le premier paiement) ;
- **Déclaration 2042** : vraie page + saisie des années d'avant l'outil ;
- **Employeur** : registre unique du personnel, rappel de la visite
  d'information (3 mois), DUERP, affichages, mutuelle, prévoyance ;
- **Abby / E-reporting** : calendrier, état de la connexion, totaux ;
- Recettes : CB notée sur la fiche du jour (plus de capture Up2Pay),
  répartition fruits/légumes 5,5 % + plants 10 % avec contrôle du total.

Reste :
- les immobilisations sont classées par la lecture automatique des pièces ;
  bouton « Corriger » dans Dépenses (achat ↔ immobilisation) ajouté le
  24/09/2026 ;
- facture électronique : l'outil produit le PDF ; si Abby exige un fichier
  structuré (Factur-X) pour le dépôt, il faudra l'ajouter ;
- remarques sur le document : il appelle « CA12 » la déclaration agricole,
  qui est la **CA12A** (3517-AGR-SD) ; conservation 6 ans pour le fiscal
  agricole, 10 ans conseillés pour les activités commerciales.

## 8. Facturation légale et micro-BIC — construit le 24/09/2026

- Seuil micro-BA (Synthèse → Suivi des seuils) : corrigé le 24/09/2026,
  mêmes recettes HT que la page Déclaration 2042 du Maraîchage (vente
  directe ramenée au HT, années saisies à la main comprises).
- Réglage `HIDDEN_ACTIVITIES` (fichier `apps/web/.env`) : masque des
  activités dans une installation — chez le partenaire
  `HIDDEN_ACTIVITIES=maraichage,fruits-legumes`. Vide chez Benoît.

- **Numéros de facture** (modifié le 24/09/2026 : un seul SIRET pour les
  trois activités) : FA-M2026-001 pour le Maraîchage, FA-K2026-001 pour la
  micro-BIC ; avoirs AV-M… / AV-K…, devis DE-M… / DE-K… ; deux suites (micro-BA d'un côté, micro-BIC
  Revente + Kerbooth de l'autre), sans trou, remise à 001 chaque année.
  L'appli refuse une facture datée avant la dernière facture de la même
  suite.
- **Pas de suppression de facture** : bouton « Annuler par un avoir ».
  Facture pas encore payée → annulée, sans effet sur les comptes ; facture
  payée → avoir à rembourser, compté en négatif dans le livre des recettes
  à la date du remboursement (« Marquer remboursé »).
- **Revente et Kerbooth** : mêmes sections que le Maraîchage (Livre des
  recettes, Registre des achats pour la Revente) ; Synthèse micro-BIC avec
  Obligations, Suivi des seuils, TVA, Déclaration 2042 (cases 5KO ventes /
  5KP services, à vérifier sur le formulaire de l'année), Cotisations
  sociales, E-reporting.
- **Cotisations sociales micro-BIC** : régime à choisir dans Synthèse
  micro-BIC → Cotisations sociales. Benoît : **MSA** (activité principale
  agricole, une déclaration annuelle, appel de cotisations MSA) → plus de
  rappel URSSAF mensuel. Taux vérifiés par Benoît le 24/09/2026 : 12,3 %
  ventes, 21,2 % services, + 0,1 % de CFP ; abattements 71 % / 50 %
  (minimum 305 €). À mettre à jour dans `apps/web/src/lib/bic/social.ts`
  quand ils changent.
- **Mémo « ce qu'il te reste réellement »** en haut de Synthèse micro-BIC →
  Obligations : CA, cotisations URSSAF + CFP, revenu déclaré, dépenses
  maximum pour gagner plus que ce qu'on déclare, et reste réel. Pour
  Benoît (MSA) : calcul au taux URSSAF à titre de comparaison — cotisations
  MSA réelles de la micro-BIC **à confirmer** (MSA / Cerfrance).
- **n8n** : réimporter `n8n/workflows/kerbooth-urssaf-reminder.json` (texte
  du mail modifié ; il n'envoie plus rien en régime MSA).

---

## Historique de l'appli (journal d'audit)

Visible par personne dans l'appli : il est seulement dans la base de
données du serveur, comme preuve en cas de contrôle (qui a validé, corrigé,
déplacé ou supprimé quoi, et quand). Lignes de plus de **10 ans effacées
automatiquement** (au démarrage du serveur puis chaque jour) — décision du
24/09/2026.

## Petits points techniques (sans urgence)

- Avertissement `prisma:warn … libssl/openssl` au démarrage : sans effet,
  corrigeable en ajoutant OpenSSL à l'image Docker.
- Jours fériés non pris en compte dans le calcul de la date limite CA12A
  (seulement les week-ends) : vérifier la date chaque année sur
  impots.gouv.fr.
