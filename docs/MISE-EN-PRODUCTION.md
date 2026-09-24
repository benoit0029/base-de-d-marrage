# Reste à faire avant la mise en production — par ordre de priorité

État au 23/09/2026. L'appli tourne déjà sur le vrai serveur
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
hébergeur que le serveur** (Scaleway Object Storage, OVH Object Storage ou
Backblaze B2 — quelques centimes par mois pour ce volume). Tu crées un
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

## 5. Arrivée du partenaire (Phase 2 — pas avant qu'il crée sa micro)

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
- le seuil micro-BA de la page Synthèse compte encore la vente directe en
  TTC au lieu du HT ;
- les immobilisations sont classées par la lecture automatique des pièces,
  sans bouton pour corriger le classement dans Dépenses ;
- facture électronique : l'outil produit le PDF ; si Abby exige un fichier
  structuré (Factur-X) pour le dépôt, il faudra l'ajouter ;
- remarques sur le document : il appelle « CA12 » la déclaration agricole,
  qui est la **CA12A** (3517-AGR-SD) ; conservation 6 ans pour le fiscal
  agricole, 10 ans conseillés pour les activités commerciales.

---

## Petits points techniques (sans urgence)

- Avertissement `prisma:warn … libssl/openssl` au démarrage : sans effet,
  corrigeable en ajoutant OpenSSL à l'image Docker.
- Jours fériés non pris en compte dans le calcul de la date limite CA12A
  (seulement les week-ends) : vérifier la date chaque année sur
  impots.gouv.fr.
