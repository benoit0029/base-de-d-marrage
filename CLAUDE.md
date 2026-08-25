# Projet : Dashboard agence IA "Kalonia"

## Contexte
Dashboard pour piloter Kalonia, une agence IA. Construit avec l'aide de Claude Code.
Nom retenu après vérification (aucune entreprise existante trouvée sous ce nom). Domaine **kalonia.fr acheté**.

## Recentrage de portée (décision importante)
**Priorité actuelle = dashboard interne agence uniquement.** Le pipeline technique complet pour un client artisan (agent vocal ElevenLabs + ingestion HubSpot branchés bout en bout) est **mis en pause**, pas abandonné définitivement. Pour le premier prospect artisan envisagé, l'agence va d'abord faire un **audit classique** de ses besoins réels avant de construire quoi que ce soit de spécifique pour lui — éviter de construire une solution avant d'avoir confirmé le problème.
Conséquence concrète : le compte ElevenLabs (agent de test "Heol", webhook) a été nettoyé/désactivé, les données de test Supabase liées à ce test ont été supprimées. Le compte HubSpot et ses propriétés personnalisées (`secteur`, `offres_souscrites`) restent en place (gratuit, inoffensif) mais ne sont plus une priorité immédiate.

## Décisions prises
- Front : codé directement (React + Vite + TypeScript + Tailwind + composants shadcn/ui faits à la main), géré via Claude Code. **Lovable abandonné pour la construction du dashboard** : son intégration GitHub ne permet pas d'importer proprement un dépôt existant codé à la main (testé et confirmé — seul un connecteur "GitHub API" pour appels API depuis une app Lovable existe, pas d'import de repo comme base de projet). Décision prise en connaissance de cause, pas un abandon technique.
- Automatisation : n8n, self-hosted sur le VPS Hostinger (pas de plan Cloud, pas de compte n8n.io nécessaire)
- Hébergement : VPS Hostinger KVM 2 (2 vCPU / 8 Go RAM / 100 Go NVMe), souscrit sans engagement (1 mois), renouvellement à conserver actif (utilisation confirmée en continu) — héberge n8n. n8n installé **manuellement via Docker + Caddy** (reverse proxy, HTTPS auto) sur `https://kalonia.fr`, suite à un premier essai via l'app en un clic Hostinger (abandonné, conteneurs supprimés). Le dashboard lui-même reste sur Vercel (voir section Déploiement) — pas sur ce VPS.
- CRM / source de données : HubSpot
- Contrainte RGPD : hébergement et sous-traitants doivent être conformes (voir section RGPD du dernier échange) — VPS Hostinger installé sur un datacenter européen
- Email agence pour la création de comptes outils : `kalonia0029@outlook.fr`
- GitHub : accès en écriture pour Claude Code débloqué en installant l'app GitHub officielle "Claude" (github.com/apps/claude) sur le dépôt — la simple autorisation OAuth ne suffit pas, il faut l'installation en plus

## Usage du dashboard
- **Deux surfaces distinctes** :
  1. **Dashboard interne agence** (usage exclusif agence, pas un livrable) : portefeuille agrégé sur 20+ clients avec recherche/filtre, + vue détaillée par client (drill-down)
  2. **Vue cliente légère** (accès artisan) : lecture seule de ses propres widgets/KPIs, avec possibilité de choisir/masquer quels widgets afficher (ex. nb d'appels) — PAS de modification des règles métier (horaires, seuils d'urgence, etc.), juste de l'affichage
- Pilote la livraison de deux offres agence chez des clients artisans (électricien, plombier, menuisier...) :
  1. **Agent IA vocal** (plateforme retenue : **ElevenLabs Conversational AI**, ~0,08-0,10 $/min packagé, moins cher que Synthflow ~0,15-0,24 $/min à ce jour ; à réévaluer si le tarif ElevenLabs augmente une fois le LLM facturé — bascule facile vers Synthflow ou un autre fournisseur grâce à la couche d'ingestion dédiée) : décroche 24/7, filtre le démarchage, prend RDV via agenda, détecte les urgences (transfert d'appel ou SMS prioritaire)
  2. **IA de gestion globale** : tri emails, planning/tournées optimisées, devis/factures/avoirs automatiques, relances impayés, suivi commandes/livraisons fournisseurs
- Architecture technique : une **base commune** (dashboard + workflows n8n) pour tous les clients + une **couche personnalisable** par client (paramètres/credentials, ex. logiciel de facturation différent par artisan)
- Alertes urgences : reporting après-coup dans le dashboard + SMS direct sur le téléphone de l'artisan (pas d'alerte live dans le dashboard)
- KPIs confirmés par offre :
  - *Agent vocal* : nb d'appels traités, taux de décroché, RDV pris, urgences détectées, spams filtrés
  - *Gestion globale* : devis en attente de signature, factures émises, impayés en cours (montant + ancienneté), CA piloté
- HubSpot = source de données en arrière-plan uniquement ; tout doit être consultable depuis l'interface unique du dashboard (pas besoin d'aller sur HubSpot)
- Plateforme unique pour agence et clients : 1 seule app (React + Supabase pour auth/DB), 1 seule base de données, 1 seul hébergement (VPS Hostinger) — cloisonnement par rôle/permissions, pas par instance séparée
- Devis/factures générés nativement par le système (pas de dépendance à un logiciel de facturation existant côté artisan) ; connexion à un outil tiers ajoutée seulement si un client le demande explicitement
- Couche personnalisable par client : chaque artisan a son propre catalogue tarifaire (matériaux + prestations/MO, table `catalogue_client`), utilisé pour chiffrer devis et commandes fournisseurs avec ses vrais prix
- **V1 = dashboard interne agence uniquement.** La vue cliente légère (widgets personnalisables) est reportée en **phase 2**, une fois le dashboard interne validé sur les premiers clients réels. L'architecture (rôles, cloisonnement des données) est prévue dès la V1 pour ne pas avoir à tout redécouper plus tard.

## Placement des agents IA / automatisations
- Règle générale : tout ce qui engage de l'argent ou une communication externe non générique passe par une **validation humaine avant envoi** (file d'attente d'approbation dans le dashboard). Le reste (extraction, classement, optimisation d'itinéraire, rappels standards) tourne en automatique.
- Agent vocal (ElevenLabs) : automatique de bout en bout, la validation humaine est déjà native à l'offre (urgence → SMS/transfert à l'artisan)
- Gestion globale : validation humaine requise avant devis, avant **chaque rappel de relance impayé (J+1, J+15, mise en demeure)**, avant bon de commande fournisseur, et avant réponse email si cas non générique. Facturation, tri emails génériques, optimisation planning = automatiques.
- Dashboard interne : agent superviseur possible (détection d'anomalies sur le portefeuille) qui alerte l'agence sans agir seul

## Ordre de construction (pour éviter les bugs de dépendance)
1. Schéma de données (Supabase/Postgres) — tout le reste en dépend
2. Composant file d'attente de validation humaine (transversal, réutilisé partout)
3. Squelette du dashboard interne (portefeuille + drill-down)
4. Workflows n8n un par un : ingestion (HubSpot/ElevenLabs → base) puis relance impayés (webhook d'approbation + boucle sur les factures en retard), devis, factures, commandes fournisseurs
5. Intégrations réelles (API ElevenLabs, API HubSpot) branchées en dernier, une fois la structure testée avec des données factices

## Ordre de création des comptes/outils
(distinct de l'ordre de construction du code ci-dessus — ici il s'agit des dépendances d'infrastructure : les clés API des étapes 3+ ne servent à rien tant que n8n ne tourne pas)
1. ✅ GitHub (existant)
2. ✅ Supabase (créé, migrations + RLS appliquées, credentials réelles branchées)
3. ✅ VPS Hostinger (créé, KVM 2, 1 mois sans engagement)
4. 🔄 n8n réinstallé manuellement sur le VPS (Docker + Caddy, guide externe suivi en autonomie) sur `https://kalonia.fr`, remplace l'installation précédente (app en un clic Hostinger, conteneurs supprimés). **À refaire à la reprise** : réimporter les 14 workflows `.json` (déjà prêts dans `n8n/workflows/`), rebrancher la credential Supabase native, reconfigurer les variables d'environnement SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY dans le `docker-compose.yml`.
5. ⏸️ ElevenLabs — compte créé (gratuit), agent de test "Heol" avait été configuré puis **nettoyé/désactivé** suite au recentrage de portée (voir section dédiée en haut du fichier). Bug non résolu à l'époque (lookup client_config par agent_id introuvable malgré données vérifiées correctes) — sans objet tant que ce chantier n'est pas repris.
6. ⏸️ HubSpot (CRM source) — compte créé (gratuit), clé de service créée (scopes companies/deals/contacts), propriétés personnalisées `secteur` et `offres_souscrites` créées sur l'objet Entreprise. **Découverte importante** : l'action "Webhook" dans les Workflows HubSpot nécessite un plan payant (Pro) — architecture prévue à la place : n8n interroge périodiquement l'API HubSpot (polling toutes les 30 min) au lieu d'un webhook poussé par HubSpot, 100% gratuit. Non prioritaire pour l'instant (voir recentrage de portée).
7. Anthropic API — clé (utilisée dans les workflows n8n pour tri emails, génération devis, etc.)
8. Brevo (ou équivalent) — compte + clé API pour l'envoi SMS/email des relances

## Déploiement
- Dashboard déployé sur **Vercel** (gratuit), connecté au dépôt GitHub, branche `claude/dashboard-agence-ia-outils-tqefcv` en Production. Variables d'environnement `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` configurées. Fichier `vercel.json` ajouté pour le routing SPA (sans lui, toute route autre que `/` renvoie une 404).
- Premier utilisateur agence créé dans Supabase Authentication, connexion testée avec succès en production. Portefeuille vide pour l'instant (normal, aucun client réel connecté — HubSpot pas encore branché).

## Exigence transverse critique
- **Sécurité & RGPD & contrôle d'accès client** : avec l'ajout d'une vue cliente (même légère), il faut un vrai cloisonnement des accès (un artisan ne doit voir QUE ses propres données), authentification séparée agence/client, et traitement RGPD-conforme des données clients exposées côté client. À valider dès la conception technique, pas en fin de projet.

## Sécurité — actions faites suite à un audit rapide (25 août)
- ✅ **Inscription publique désactivée** dans Supabase Auth ("Allow new users to sign up") — faille trouvée : la clé publique du frontend est visible de tous, et sans ce blocage n'importe qui pouvait s'auto-créer un compte et obtenir un accès complet (RLS ouverte à "authenticated" sans distinction).
- ✅ **2FA (TOTP)** ajouté : page `/securite` (activation avec QR code), `/mfa-challenge` (saisie du code à la connexion), `RequireAuth` bloque l'accès tant que l'AAL2 n'est pas validé si un facteur est enregistré.
- ⏸️ **Sauvegardes Supabase** : plan gratuit = aucune sauvegarde automatique. Décision : attendre les premiers clients payants avant de passer sur le plan Pro (25$/mois, 7 jours de rétention). Pas critique tant que seules des données de test existent.
- À faire plus tard : SPF/DKIM/DMARC sur `kalonia.fr` (éviter que les emails de facturation finissent en spam), monitoring d'erreurs (Sentry/GlitchTip), registre RGPD des sous-traitants avant onboarding de vrais clients.
- Email agence mis à jour : `benoit@kalonia.fr` (boîte réelle, Hostinger, remplace `kalonia0029@outlook.fr` utilisé au départ). Alias `agence@kalonia.fr` créé, redirige vers `benoit@kalonia.fr` — servira à couvrir plusieurs associés plus tard sans créer de boîte partagée. Chaque associé doit avoir sa propre vraie boîte, jamais de connexion dashboard partagée.

## En attente de validation
- Librairie UI définitive (shadcn/ui par défaut via Lovable, alternative envisagée : Tremor)
- Outil de monitoring d'erreurs (Sentry envisagé, alternative envisagée : GlitchTip self-hosted pour rester RGPD-friendly)
- Logiciel(s) de facturation utilisés par les clients artisans (inconnu pour l'instant — non bloquant, voir décision de génération native ci-dessus)
- Identité visuelle de l'agence : pas encore de logo/charte graphique, utilisateur va essayer de créer via Canva

## Historique des échanges
Ce fichier sert de mémoire de projet entre les sessions. À mettre à jour au fur et à mesure des décisions.
