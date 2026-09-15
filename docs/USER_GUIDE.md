# Guide de test — avant de te passer de ton expert-comptable

Objectif : valider chaque module avec tes vraies données, en parallèle de
ton expert-comptable actuel, avant de t'en passer. Compte environ 2 à 3
semaines d'usage réel avant de basculer complètement — pas un test d'un
après-midi.

Coche au fur et à mesure. Note tout écart constaté (montant, seuil, mention
manquante...) — c'est justement ce que ce test doit révéler.

## 0. Accès et premiers réglages

- [ ] Je me connecte à l'adresse du sous-domaine, je crée mon compte et
      j'active la 2FA (obligatoire dès la première connexion).
- [ ] Dans **Réglages** : je renseigne l'identité (nom, adresse, SIREN, TVA
      intracommunautaire).
- [ ] Dans **Réglages** : je mets un logo par activité, et le code AB
      (FR-BIO-XX) pour Maraîchage et Fruits/Légumes si applicable.
      *Je ne compte pas encore sur l'emplacement du logo AB sur les PDF —
      il reste à valider contre le guide INAO avant de m'y fier pour de
      vrai (voir docs/ARCHITECTURE.md).*
- [ ] Dans **Réglages** : je saisis les identifiants des 3 boîtes mail de
      capture (une par activité) et je vérifie que chacune affiche
      « Connectée » après le test automatique.
- [ ] Dans **Réglages** : je tente la connexion à Abby (si j'ai déjà une
      clé API). Si ça échoue, ce n'est pas bloquant pour la suite — la
      facturation locale (PDF) fonctionne sans elle.

## 1. Capture et validation des achats — à refaire sur chaque activité

Le pipeline de capture IA (email/photo) ne concerne que l'onglet **Achats**
des 3 activités : les recettes ne passent plus par là (voir section 1 bis).

Pour chacune des 3 activités (Maraîchage, Fruits/Légumes, Kerbooth 360) :

- [ ] J'envoie une **vraie facture reçue par email** à la boîte de capture
      dédiée à cette activité. Je vérifie qu'elle apparaît dans l'onglet
      Achats en quelques minutes, avec le bon statut « en attente ».
- [ ] Je **prends une vraie photo** d'un ticket/reçu papier via le bouton
      « Ajouter une facture ou un reçu » de l'onglet Achats. Même vérification.
- [ ] Je compare les champs extraits (date, montant HT/TTC, TVA, tiers,
      nature) à la vraie pièce. **Une extraction imparfaite est normale** —
      c'est prévu : je corrige à la main avant de valider.
- [ ] Je clique sur **Valider**. Je vérifie que la ligne passe au vert
      (« Validée ») et qu'elle ne peut plus être modifiée.
- [ ] Je vérifie que l'activité assignée est la bonne. Si elle vient d'un
      email, elle doit être quasi systématiquement correcte (déterminée
      par la boîte mail d'origine). Si elle vient d'une photo, l'IA a dû
      deviner depuis le contenu — plus d'attention à porter là.

**But du test** : sur au moins 15-20 pièces réelles par activité, mesurer
le taux d'extractions correctes sans aucune correction. C'est ce chiffre,
pas une démo isolée, qui dit si le pipeline est fiable pour toi.

## 1 bis. Journal de caisse et livre des recettes

- [ ] Sur **Fruits/Légumes** (Recettes) : je saisis une vraie journée de
      vente directe (montant espèces réel) avec la photo du bordereau de
      dépôt. Je vérifie qu'elle apparaît en attente, puis je la valide.
- [ ] Sur **Maraîchage** (Recettes) : je saisis une vraie journée de vente
      directe avec la répartition espèces/chèques/CB réelle, la photo du
      bordereau ET la capture d'écran Up2Pay pour la part CB.
- [ ] Si une vente réelle dépasse 76 € à l'unité, je vérifie que je ne l'ai
      **pas** mise dans les totaux agrégés, mais bien dans le champ « vente
      exceptionnelle » du formulaire — c'est une obligation légale
      (BOI-BIC-DECLA-30-30), pas un détail.
- [ ] Sur **Maraîchage**, je crée aussi une vraie facture le même jour qu'une
      saisie de caisse, et je vérifie dans l'onglet Recettes que les deux
      apparaissent comme **deux lignes distinctes** (badge « Facture » vs
      « Vente directe »), jamais comme un seul total additionné.
- [ ] Sur **Kerbooth 360** (Recettes) : je vérifie que cette page n'affiche
      que des factures (lecture seule) — c'est le registre légal de
      l'activité, pas un espace de saisie ; la création de facture reste
      dans l'onglet Facturation.

## 2. Facturation

- [ ] Sur Maraîchage : je crée une vraie facture pour un vrai client, avec
      TVA (seule activité assujettie). Je vérifie le calcul HT/TVA/TTC.
- [ ] Sur Kerbooth 360 : je crée une vraie facture pour un événement
      réel. Je vérifie la mention « TVA non applicable, art. 293 B du
      CGI ».
- [ ] Je télécharge le PDF (bouton PDF dans le tableau) et je le regarde
      vraiment : mentions légales, numéro, montants, lisibilité. Je le
      compare à un modèle que mon expert-comptable jugerait correct.
- [ ] Je teste la **dictée vocale** : je décris oralement une prestation
      et je vérifie que les lignes proposées correspondent avant de
      valider (je corrige si besoin, comme pour la capture).
- [ ] Si Abby est connectée : j'envoie une facture via le bouton « Envoyer
      via Abby » et je vérifie côté Abby qu'elle est bien arrivée.
- [ ] Fruits/Légumes reste confirmé 100% vente directe (facturation
      désactivée) : le livre des recettes de cette activité se tient
      uniquement via le journal de caisse (section 1 bis), pas ici.
- [ ] Je crée une facture pour un **nouveau** client : je vérifie qu'il
      apparaît automatiquement dans **« Répertoire clients »** (déplié en
      bas de la page) sans que j'aie eu à le saisir là-bas.
- [ ] Je crée une deuxième facture pour ce **même** client : je le
      sélectionne dans le menu déroulant en haut du formulaire et je
      vérifie que son nom/adresse se remplissent automatiquement.
- [ ] Même test avec un produit/une prestation dans **« Catalogue
      produits/prestations »** : nouvelle désignation → apparaît seule
      automatiquement ; désignation déjà connue → sélectionnable pour
      pré-remplir prix et TVA sur une ligne.
- [ ] Je corrige le SIRET d'un client existant depuis le Répertoire, puis
      je vérifie que ça n'a pas changé le nom/l'adresse déjà enregistrés
      pour rien.
- [ ] Je modifie le prix d'un produit depuis le Catalogue : je vérifie que
      ça ne change **pas** les factures déjà émises avec l'ancien prix
      (une facture, une fois créée, ne bouge plus).

## 3. Seuils et synthèse — le test le plus important

- [ ] J'ouvre l'onglet **Synthèse micro-BIC**. Je compare le CA cumulé
      affiché à ce que je sais déjà par ailleurs (mes propres relevés, ou
      ce que ton expert-comptable t'a donné pour l'année en cours). Ce CA
      vient maintenant de la bonne source par activité (factures pour
      Kerbooth 360, journal de caisse pour Fruits/Légumes, les deux pour
      Maraîchage) — un écart par rapport à un ancien test vaut la peine
      d'être signalé.
- [ ] Je vérifie que la distinction vente (Fruits/Légumes) / service
      (Kerbooth 360) correspond à ce que tu attends — ce sont deux seuils
      de franchise TVA différents (85 000 € vs 37 500 €), pas un seuil
      unique.
- [ ] Sur Maraîchage : je regarde la moyenne triennale micro-BA affichée
      et je la confronte à ce que ton expert-comptable calcule.
- [ ] **Ne prends aucune décision fiscale sur la seule foi de ces
      chiffres** tant que tu ne les as pas fait valider une fois par ton
      expert-comptable ou sur impots.gouv.fr — l'app le rappelle déjà à
      l'écran, mais ça vaut la peine de le répéter ici.

## 3 bis. Comptabilité de caisse — créances et dettes (le plus important à vérifier)

Correction majeure : les recettes/dépenses comptent maintenant sur la date
d'**encaissement/paiement réel**, jamais la date de facture — c'est la
règle légale, mais elle change des chiffres déjà affichés avant.

- [ ] Je crée une vraie facture (Maraîchage ou Kerbooth 360) : je vérifie
      qu'elle affiche **« Facturée — créance en cours »**, pas encore
      encaissée, tant que je n'ai rien fait d'autre.
- [ ] Je vérifie qu'elle **n'apparaît pas** dans le CA du Registre TVA ni
      dans les seuils de la Synthèse tant qu'elle reste une créance.
- [ ] Je clique sur **« Marquer encaissée »** avec une vraie date de
      paiement : le statut passe à **« Encaissée »**, et le montant
      apparaît maintenant dans le bon trimestre du Registre TVA (celui de
      la date d'encaissement, pas celui de la date de facture si les deux
      diffèrent).
- [ ] Je fais le test inverse en important un relevé bancaire : je
      rapproche une facture non encaissée avec sa ligne de crédit — je
      vérifie que la date d'encaissement se remplit **automatiquement**
      avec la date de l'opération bancaire, sans que j'aie besoin de la
      ressaisir.
- [ ] Même test côté **Dépenses** : une dépense validée mais pas encore
      payée doit afficher **« Facture reçue — dette en cours »**, et ne pas
      compter dans la TVA déductible tant que je ne la marque pas payée
      (ou que je ne la rapproche pas d'un débit du relevé).
- [ ] Si j'annule un rapprochement fait par erreur, je vérifie que la date
      d'encaissement/paiement disparaît aussi (elle redevient à saisir).

⚠️ **Cas particulier non géré, à vérifier auprès de ta MSA/Cerfrance** : si
une clause d'exigibilité "sur facture" a été retenue pour tes ventes
(possible en régime simplifié agricole), la TVA pourrait être due dès la
facturation plutôt qu'à l'encaissement — l'outil applique uniquement la
règle par défaut (exigibilité à l'encaissement) pour l'instant.

## 4. Déclaration 2042, TVA 3517-AGR-SD (Maraîchage) — encore en démonstration

Ces deux sous-onglets affichent encore des données de démonstration à ce
stade. **Ne t'y fie pas encore** ; à traiter dans une itération ultérieure
si tu veux les rendre opérationnels.

**Registre TVA et Acompte TVA ne sont plus concernés** : ils sont
maintenant calculés/enregistrés pour de vrai (voir section 4 ter).
**Tesa+** (ex-« Paie ») non plus : c'est un vrai import de documents (voir
section 4 bis), pas une donnée de démonstration.

## 4 bis. Tesa+, Cotisations non salarié, Dépenses, Relevé bancaire

- [ ] Sur **Tesa+** (Maraîchage) : j'importe un vrai document lié au
      salarié (contrat, bulletin de paie, cotisations salariales, certificat
      de travail, attestation Pôle Emploi ou solde de tout compte). Je
      vérifie qu'il apparaît dans la liste avec le bon type et la bonne
      période — pas de calcul automatique attendu ici, seulement l'archivage.
- [ ] Sur **Cotisations non salarié** (Maraîchage) : j'importe un vrai appel
      de cotisation MSA me concernant, avec son montant. Je vérifie qu'une
      ligne apparaît automatiquement dans **Dépenses**, en attente de
      validation.
- [ ] Sur **Dépenses** (ex-« Achats / immobilisations », les 3 activités) :
      je vérifie que le renommage n'a rien cassé — mes écritures existantes
      sont toujours là.
- [ ] Sur **Relevé bancaire** (les 3 activités, un compte par activité) :
      j'exporte un vrai relevé CSV depuis mon espace bancaire en ligne et je
      l'importe. Je vérifie que les lignes apparaissent dans le bon ordre
      chronologique, avec le bon sens (débit/crédit). **Le format CSV varie
      selon les banques** — si l'import échoue ou lit mal les colonnes, dis-le
      moi avec un extrait du fichier (sans les données sensibles), le
      parseur devra sans doute être ajusté à ton relevé réel.
- [ ] Je **rapproche** une ligne de débit avec une Dépense existante, et une
      ligne de crédit avec une facture ou une saisie de caisse existante.
      Je vérifie que le statut passe à « ✓ Pointé » des deux côtés (sur la
      ligne de relevé ET sur la Dépense/Recette elle-même).
- [ ] Je vérifie que je peux **annuler** un rapprochement fait par erreur.
- [ ] Je teste la détection de doublon : j'importe deux fois le même
      fichier (Tesa+, cotisation, ou relevé bancaire) sans cocher la case de
      confirmation, et je vérifie que rien n'est enregistré deux fois tant
      que je ne confirme pas explicitement.
- [ ] Sur n'importe lequel de ces registres (Tesa+, Cotisations non
      salarié, Dépenses, Relevé bancaire) : je **valide** une ligne en
      attente, puis je clique sur **« Supprimer la ligne »**. Je vérifie
      qu'elle disparaît bien de l'affichage — c'est le comportement attendu,
      la donnée reste en base pour un contrôle fiscal éventuel, jamais
      visible à l'écran. Je vérifie aussi qu'une ligne encore **en attente**
      (jamais validée) propose bien **« Supprimer »** (sans le "la ligne") —
      les deux boutons ne doivent jamais apparaître ensemble sur une même
      ligne.

## 4 ter. Registre TVA et Acompte TVA (Maraîchage)

- [ ] Sur **Acompte TVA** : j'enregistre un vrai paiement déjà effectué
      (échéance, montant, date, justificatif si j'en ai un), je le valide.
- [ ] Sur **Registre TVA** : je vérifie que le trimestre correspondant
      passe au statut **« Réglé »** une fois l'acompte validé pour la même
      échéance (le libellé doit correspondre exactement, ex. « 2026-T3»).
- [ ] Je compare les montants de TVA collectée/déductible affichés à mes
      propres calculs pour au moins un trimestre déjà clos — **ce calcul
      n'a pas encore été validé en conditions réelles**, un écart vaut la
      peine d'être signalé avant de s'y fier pour de vrai.
- [ ] Dans **Réglages → Maraîchage**, je décoche « Acomptes trimestriels
      de TVA actifs » (uniquement si je sais être dispensé — moins de
      1 000 € de TVA due l'année précédente) : je vérifie que le
      formulaire d'ajout disparaît sur **Acompte TVA** et que le Registre
      TVA affiche « Dispensé » au lieu de « À traiter » sur les
      trimestres suivants, sans changer le montant de TVA nette calculé.

## 4 ter bis. Vue par exercice (sélecteur d'année)

- [ ] Sur chaque sous-onglet registre (Recettes, Dépenses, Relevé
      bancaire, Acompte TVA, Tesa+, Cotisations non salarié), je vérifie
      que le sélecteur **« Exercice »** en haut à droite filtre bien les
      lignes affichées, et que « Toutes les années » remet tout.
- [ ] Je vérifie qu'une créance (facture non encaissée) ou une dette
      (dépense non payée) reste visible **quel que soit** l'exercice
      sélectionné — normal, elle n'est rattachée à aucune année tant
      qu'elle n'est pas réglée.
- [ ] Sur un exercice déjà clôturé, je vérifie que les lignes réglées
      affichent **🔒 Exercice clôturé** à la place du bouton « Supprimer la
      ligne ».

## 4 quater. Clôture d'exercice (Réglages)

- [ ] En bas de la page **Réglages**, je vérifie que le bandeau « Lignes
      encore en attente » liste bien, avec le bon nombre, toute écriture
      que je laisse volontairement non validée sur n'importe quel
      sous-onglet (Recettes, Dépenses, Relevé bancaire, Tesa+, Acompte
      TVA...) — le bouton de clôture doit rester invisible tant qu'il en
      reste au moins une.
- [ ] Une fois tout validé (ou supprimé), je vérifie que le bouton
      **« Clôturer l'exercice [année] »** propose bien la bonne année (la
      plus ancienne qui a des mouvements réglés et n'est pas encore
      clôturée) — jamais une année plus récente en sautant une année
      antérieure non traitée.
- [ ] Après clôture, je télécharge le dossier ZIP et je vérifie qu'il
      contient : la synthèse PDF (recettes/dépenses par activité), le
      récapitulatif des créances/dettes en cours, et les pièces sources
      rangées par activité puis par sous-onglet (Dépenses, Recettes,
      Relevé bancaire, Facturation, etc.).
- [ ] Je vérifie qu'une facture encaissée ou une dépense payée **dans
      l'exercice clôturé** ne peut plus être supprimée (« Supprimer la
      ligne » doit refuser avec un message explicite).
- [ ] Je vérifie à l'inverse qu'une créance (facture envoyée, pas encore
      encaissée) ou une dette (dépense validée, pas encore payée) reste
      normalement modifiable même après la clôture — c'est volontaire,
      elle rejoindra l'exercice de son règlement réel une fois payée.
- [ ] **Il n'existe aucune fonction de réouverture** d'un exercice clos
      depuis l'interface : à tester uniquement quand tu es sûr de toi, ou
      sur une base de test (voir §6 Sauvegarde) la première fois.

## 5. Alertes automatiques (n8n)

- [ ] Une fois les workflows n8n importés (voir `n8n/workflows/README.md`) :
      je laisse une écriture volontairement « en attente » plus de 3 jours
      et je vérifie que je reçois bien l'email de rappel.
- [ ] Je vérifie que je ne reçois **pas** le même rappel deux jours de
      suite pour la même écriture (déduplication).
- [ ] Je force une anomalie (ex. j'envoie un fichier illisible en photo) et
      je vérifie l'email de notification correspondant.

## 6. Sauvegarde

- [ ] Je vérifie qu'une sauvegarde s'exécute (manuellement d'abord :
      `./scripts/backup.sh`, voir `docs/DEPLOYMENT.md` §8).
- [ ] Je fais **une vraie restauration test** (`./scripts/restore.sh`) sur
      une base de test, jamais directement en production, et je vérifie
      que mes écritures et factures réelles sont bien là après coup.

## Avant de basculer complètement

Ne te passe de ton expert-comptable que lorsque :

- [ ] Les 3 activités ont chacune au moins 3 à 4 semaines d'écritures
      réelles capturées, validées et cohérentes.
- [ ] Le taux d'extraction correcte (section 1) te semble raisonnable pour
      ton volume — sinon, continue à corriger manuellement, ce n'est pas
      grave, mais sache-le avant de compter dessus les yeux fermés.
- [ ] Les seuils affichés en Synthèse ont été confrontés au moins une fois
      aux chiffres de ton expert-comptable et concordent.
- [ ] Tu as fait au moins une restauration de sauvegarde réussie.
- [ ] Tu as toi-même relu et compris le calcul de TVA sur au moins une
      facture Maraîchage réelle (le jour où ce sera faux, ce sera à toi de
      le repérer).

Rien n'empêche de garder ton expert-comptable en parallèle un moment, le
temps que ces cases soient toutes cochées avec confiance.
