# Projet : Dashboard agence IA

## Contexte
Dashboard pour piloter une agence IA. Construit avec l'aide de Claude Code.

## Décisions prises
- Front : Lovable (no-code/low-code, base React + shadcn/ui par défaut)
- Automatisation : n8n, self-hosted sur le VPS Hostinger (pas de plan Cloud)
- Hébergement : VPS Hostinger (dashboard + n8n)
- CRM / source de données : HubSpot
- Contrainte RGPD : hébergement et sous-traitants doivent être conformes (voir section RGPD du dernier échange)

## Usage du dashboard
- **Deux surfaces distinctes** :
  1. **Dashboard interne agence** (usage exclusif agence, pas un livrable) : portefeuille agrégé sur 20+ clients avec recherche/filtre, + vue détaillée par client (drill-down)
  2. **Vue cliente légère** (accès artisan) : lecture seule de ses propres widgets/KPIs, avec possibilité de choisir/masquer quels widgets afficher (ex. nb d'appels) — PAS de modification des règles métier (horaires, seuils d'urgence, etc.), juste de l'affichage
- Pilote la livraison de deux offres agence chez des clients artisans (électricien, plombier, menuisier...) :
  1. **Agent IA vocal** (plateforme retenue : **Synthflow AI**) : décroche 24/7, filtre le démarchage, prend RDV via agenda, détecte les urgences (transfert d'appel ou SMS prioritaire)
  2. **IA de gestion globale** : tri emails, planning/tournées optimisées, devis/factures/avoirs automatiques, relances impayés, suivi commandes/livraisons fournisseurs
- Architecture technique : une **base commune** (dashboard + workflows n8n) pour tous les clients + une **couche personnalisable** par client (paramètres/credentials, ex. logiciel de facturation différent par artisan)
- Alertes urgences : reporting après-coup dans le dashboard + SMS direct sur le téléphone de l'artisan (pas d'alerte live dans le dashboard)
- KPIs confirmés par offre :
  - *Agent vocal* : nb d'appels traités, taux de décroché, RDV pris, urgences détectées, spams filtrés
  - *Gestion globale* : devis en attente de signature, factures émises, impayés en cours (montant + ancienneté), CA piloté
- HubSpot = source de données en arrière-plan uniquement ; tout doit être consultable depuis l'interface unique du dashboard (pas besoin d'aller sur HubSpot)
- Plateforme unique pour agence et clients : 1 seule app (Lovable + Supabase pour auth/DB), 1 seule base de données, 1 seul hébergement (VPS Hostinger) — cloisonnement par rôle/permissions, pas par instance séparée
- Devis/factures générés nativement par le système (pas de dépendance à un logiciel de facturation existant côté artisan) ; connexion à un outil tiers ajoutée seulement si un client le demande explicitement
- Couche personnalisable par client : chaque artisan a son propre catalogue tarifaire (matériaux + prestations/MO, table `catalogue_client`), utilisé pour chiffrer devis et commandes fournisseurs avec ses vrais prix
- **V1 = dashboard interne agence uniquement.** La vue cliente légère (widgets personnalisables) est reportée en **phase 2**, une fois le dashboard interne validé sur les premiers clients réels. L'architecture (rôles, cloisonnement des données) est prévue dès la V1 pour ne pas avoir à tout redécouper plus tard.

## Placement des agents IA / automatisations
- Règle générale : tout ce qui engage de l'argent ou une communication externe non générique passe par une **validation humaine avant envoi** (file d'attente d'approbation dans le dashboard). Le reste (extraction, classement, optimisation d'itinéraire, rappels standards) tourne en automatique.
- Agent vocal (Synthflow) : automatique de bout en bout, la validation humaine est déjà native à l'offre (urgence → SMS/transfert à l'artisan)
- Gestion globale : validation humaine requise avant devis, avant **chaque rappel de relance impayé (J+1, J+15, mise en demeure)**, avant bon de commande fournisseur, et avant réponse email si cas non générique. Facturation, tri emails génériques, optimisation planning = automatiques.
- Dashboard interne : agent superviseur possible (détection d'anomalies sur le portefeuille) qui alerte l'agence sans agir seul

## Ordre de construction (pour éviter les bugs de dépendance)
1. Schéma de données (Supabase/Postgres) — tout le reste en dépend
2. Composant file d'attente de validation humaine (transversal, réutilisé partout)
3. Squelette du dashboard interne (portefeuille + drill-down)
4. Workflows n8n un par un : ingestion (HubSpot/Synthflow → base) puis relance impayés (webhook d'approbation + boucle sur les factures en retard), devis, factures, commandes fournisseurs
5. Intégrations réelles (API Synthflow, API HubSpot) branchées en dernier, une fois la structure testée avec des données factices

## Exigence transverse critique
- **Sécurité & RGPD & contrôle d'accès client** : avec l'ajout d'une vue cliente (même légère), il faut un vrai cloisonnement des accès (un artisan ne doit voir QUE ses propres données), authentification séparée agence/client, et traitement RGPD-conforme des données clients exposées côté client. À valider dès la conception technique, pas en fin de projet.

## En attente de validation
- Librairie UI définitive (shadcn/ui par défaut via Lovable, alternative envisagée : Tremor)
- Outil de monitoring d'erreurs (Sentry envisagé, alternative envisagée : GlitchTip self-hosted pour rester RGPD-friendly)
- Logiciel(s) de facturation utilisés par les clients artisans (inconnu pour l'instant — non bloquant, voir décision de génération native ci-dessus)
- Identité visuelle de l'agence : pas encore de logo/charte graphique, utilisateur va essayer de créer via Canva

## Historique des échanges
Ce fichier sert de mémoire de projet entre les sessions. À mettre à jour au fur et à mesure des décisions.
