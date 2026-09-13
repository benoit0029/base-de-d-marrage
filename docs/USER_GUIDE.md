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

## 1. Capture et validation — à refaire sur chaque activité

Pour chacune des 3 activités (Maraîchage, Fruits/Légumes, Kerbooth 360) :

- [ ] J'envoie une **vraie facture reçue par email** à la boîte de capture
      dédiée à cette activité. Je vérifie qu'elle apparaît dans l'onglet
      Achats en quelques minutes, avec le bon statut « en attente ».
- [ ] Je **prends une vraie photo** d'un ticket/reçu papier via le bouton
      « Ajouter une facture ou un reçu » de l'onglet Recettes ou Achats.
      Même vérification.
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
- [ ] Sur Fruits/Légumes : je décide si je veux facturer chaque vente ou
      garder un simple ticket agrégé dans le livre des recettes, puis
      j'active/désactive « Facturation active » dans Réglages en
      conséquence.

## 3. Seuils et synthèse — le test le plus important

- [ ] J'ouvre l'onglet **Synthèse micro-BIC**. Je compare le CA cumulé
      affiché à ce que je sais déjà par ailleurs (mes propres relevés, ou
      ce que ton expert-comptable t'a donné pour l'année en cours).
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

## 4. Paie, TVA, déclarations (Maraîchage)

Ces sous-onglets (Registre TVA, Acomptes, Paie, Déclaration 2042, CA12A)
affichent encore des données de démonstration à ce stade — ils n'ont pas
été branchés sur tes écritures réelles pendant les 6 premières phases.
**Ne t'y fie pas encore** ; à traiter dans une itération ultérieure si tu
veux les rendre opérationnels.

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
