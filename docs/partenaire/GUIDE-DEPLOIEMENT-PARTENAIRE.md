# Compta Kerbooth — appli pour ton partenaire (à déployer le jour J)

Ce zip contient une **copie figée du code** de `compta.kalonia.fr`, au commit
`e9781d8` (24/09/2026) — c'est-à-dire avec toutes les fonctionnalités
construites jusque-là : réservation Kerbooth (signature + paiement
embarqués), import de relevés bancaires, lecture automatique des documents,
factures numérotées FA-K2026-001 et avoirs AV-K2026-001, livre des recettes,
Synthèse micro-BIC complète (obligations, 2042, cotisations URSSAF,
e-reporting) et sortie de franchise TVA détectée automatiquement (voir §7).

**Pourquoi c'est simple malgré tes deux activités** : chez toi, la Synthèse
micro-BIC additionne Revente + Kerbooth (une seule micro-entreprise, un seul
SIRET). Chez ton partenaire, c'est **le même code, avec une base de données
vide et à lui** : la partie Revente reste à zéro, donc tous les chiffres de
sa Synthèse micro-BIC sont ceux de Kerbooth seul. Rien à fusionner ni à
séparer — seulement les réglages du §5.

**Avant d'utiliser ce zip**, une option à considérer : si plusieurs mois se
sont écoulés d'ici le jour J, il peut valoir le coup de me redemander une
version plus à jour du code (sur GitHub) plutôt que ce zip figé, pour
profiter des améliorations faites entre-temps. Ce zip est une sécurité "au
cas où", pas forcément la version à utiliser telle quelle.

**Rappel important, validé dans le mémo juridique** : ton partenaire doit
avoir sa **propre** base de données, son **propre** compte Stripe, son
**propre** compte Yousign, sa **propre** boîte mail — jamais les tiens
partagés. C'est la condition pour que sa micro-entreprise reste réellement
indépendante de la tienne (voir le mémo "Kerbooth — Statut à
deux"). **Avant de déployer quoi que ce soit, fais valider le montage exact
avec Cerfrance et un juriste**, comme prévu.

---

## 1. Ce qu'il faut avoir en main avant de commencer

- Un sous-domaine dédié pour ton partenaire — jamais `compta.kalonia.fr`
  (le tien). Cohérent avec le choix fait pour sa boîte mail : plutôt un
  sous-domaine de `kerbooth360.fr` (ex. `compta.kerbooth360.fr`) ou un
  domaine à lui, pas un sous-domaine de `kalonia.fr`.
- Un VPS (le tien avec un nouveau conteneur isolé, ou un VPS séparé — les
  deux fonctionnent, mais base de données et volumes doivent être
  entièrement séparés des tiens).
- Le compte Stripe de ton partenaire (clé API).
- Le compte Yousign de ton partenaire (clé API).
- Une boîte mail IMAP dédiée à son activité, sur le domaine partagé
  **`kerbooth360.fr`** — jamais sur `kalonia.fr` (ton domaine personnel,
  qui porte tes autres activités et dont tu es administrateur Hostinger).
  Adresse du type `partenaire@kerbooth360.fr` (prénom/nom exact à préciser
  le moment venu). **Abonnement indépendant côté partenaire** (son propre
  compte/sa propre facturation, chez le fournisseur de son choix — Titan
  Mail, Google Workspace, Zoho...) : toi tu ajoutes seulement les
  enregistrements DNS (MX/SPF/DKIM) qu'il te communique, dans la zone DNS
  de `kerbooth360.fr` sur ton Hostinger. Tu ne touches jamais à sa boîte
  mail elle-même — seul lui y a accès.

## 2. Déployer le code

```bash
# Sur le serveur, décompresser ce zip puis se placer dans le code
unzip kerbooth-partenaire-jourJ.zip
```
```bash
cd kerbooth-partenaire/code-source
```

```bash
cp .env.example .env
```
```bash
cp .env.example apps/web/.env
```

Éditer les deux fichiers `.env`. **Générer des secrets NEUFS, jamais ceux
de compta.kalonia.fr** :
```bash
openssl rand -base64 32   # → SESSION_SECRET
```
```bash
openssl rand -base64 32   # → APP_ENCRYPTION_KEY
```
```bash
openssl rand -base64 32   # → INGEST_API_TOKEN
```
```bash
openssl rand -base64 32   # → BACKUP_ENCRYPTION_PASSPHRASE
```

`APP_URL` = le nouveau sous-domaine (ex. `https://compta.kerbooth360.fr`).
`POSTGRES_PASSWORD` doit être identique dans `.env` (racine) et dans
`DATABASE_URL` de `apps/web/.env`.

Dans `apps/web/.env`, mettre aussi cette ligne : elle masque les onglets
Maraîchage et Revente, pour que ton partenaire ne voie que Kerbooth et la
Synthèse micro-BIC :
```
HIDDEN_ACTIVITIES=maraichage,fruits-legumes
```

```bash
docker compose up -d --build
```
```bash
docker compose logs -f app
```
`Ctrl+C` une fois que tu vois `Ready`.

## 3. Sous-domaine et HTTPS

Ajouter un bloc au Caddyfile existant du VPS (voir `Caddyfile.snippet` à la
racine de `code-source/`, à dupliquer avec le nouveau sous-domaine), puis
recharger Caddy.

## 4. Premier accès

Ouvrir `https://<nouveau-sous-domaine>/` → redirige vers `/setup`. **C'est
ton partenaire qui doit créer son propre compte et scanner son propre QR
code 2FA** — jamais toi à sa place.

## 5. Réglages, une fois connecté

- Identité de sa micro-entreprise (nom, SIRET, adresse) : elle apparaît
  sur ses factures.
- **Synthèse micro-BIC → Cotisations sociales** : choisir son régime —
  en principe « URSSAF mensuel » ou « URSSAF trimestriel », celui qu'il a
  choisi en créant sa micro (pas « MSA », qui est ton cas à toi). La page
  lui donne alors, période par période, le chiffre d'affaires à déclarer et
  ses cotisations (21,2 % + 0,1 % de CFP pour Kerbooth).
- Sa boîte mail IMAP dédiée.
- Rien à faire côté Abby/PA s'il n'en a pas besoin dès le départ.

Ce qui marche tout seul, sans réglage :
- **Numéros de facture** : sa base étant neuve, sa première facture sera
  FA-K<année>-001, ses avoirs AV-K<année>-001 — sa propre suite, indépendante
  de la tienne. Pas de suppression de facture : bouton « Annuler par un
  avoir ».
- **Livre des recettes** (Kerbooth → Livre des recettes) : rempli
  automatiquement, PDF à imprimer.
- **Déclaration 2042** : seule la case services (5KP) sera remplie ; la
  case ventes (5KO) restera à 0.
- **Mémo « ce qu'il te reste réellement »** en haut de Synthèse micro-BIC
  → Obligations : son chiffre d'affaires Kerbooth, ses cotisations URSSAF
  (21,2 % + 0,1 % de CFP), son revenu déclaré (50 % du CA) et le maximum de
  dépenses pour gagner plus que ce qu'il déclare.
- Les onglets **Maraîchage** et **Revente** sont masqués (réglage
  `HIDDEN_ACTIVITIES` du §2), ainsi que les lignes Revente de la Synthèse
  micro-BIC et la case 5KO de la déclaration 2042.

## 6. n8n — dupliquer les workflows Kerbooth

Les workflows (`code-source/n8n/workflows/kerbooth-*.json`) sont
**des modèles à dupliquer**, pas à réutiliser tels quels :

1. Importer une copie de chaque workflow Kerbooth
   (`kerbooth-booking-request`, `kerbooth-yousign-contract-signed`,
   `kerbooth-stripe-payment-received`, `kerbooth-booking-status`,
   `kerbooth-urssaf-reminder`) dans
   l'instance n8n — soit une instance n8n séparée pour ton partenaire, soit
   la même instance mais avec des credentials distincts par workflow.
2. Remplacer les credentials Yousign/Stripe/SMTP par ceux du partenaire
   (jamais les tiens). Sur le nœud Stripe, vérifier que "Body Content
   Type" est bien sur **Form URL Encoded** : ce réglage n'est pas conservé
   à l'import, et sans lui Stripe refuse la requête.
3. Pointer l'`APP_URL` de ces workflows vers la nouvelle appli compta du
   partenaire, pas vers `compta.kalonia.fr`. Le rappel URSSAF
   (`kerbooth-urssaf-reminder`) envoie son mail à **son** adresse, chaque
   mois ou chaque trimestre selon le régime choisi au §5 (aucun mail tant
   que le régime n'est pas choisi).
4. Si vous gardez un site de réservation commun (`kerbooth360.fr`), il
   faudra une règle claire pour savoir vers quel workflow (donc quel
   partenaire) router une demande de réservation donnée — à voir avec lui
   selon comment vous répartissez réellement les événements.

## 7. TVA : sortie de franchise

Déjà prévu dans le code, rien à ajouter. Sa micro-entreprise n'ayant que
Kerbooth (prestations de services), seul le seuil services compte :
37 500 € (seuil de base) et 41 250 € (seuil majoré). L'appli détecte le
dépassement sur l'année précédente et l'année en cours, lui envoie une
alerte, et la bascule se confirme en un clic dans Synthèse micro-BIC →
TVA, avec son propre numéro de TVA. Les onglets Revente restent vides
chez lui, ce qui ne change rien au calcul.

## 8. Sauvegardes

Comme pour `compta.kalonia.fr` (voir `code-source/docs/DEPLOYMENT.md` §8) :
compte de stockage S3-compatible **séparé** du tien, à mettre en place
avant la mise en production réelle.

---

Pour toute question le jour J, remets-moi ce fichier (ou juste dis-moi où
tu en es) — je repars de là où ça s'arrête ici.
