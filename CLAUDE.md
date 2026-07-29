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

## Exigence transverse critique
- **Sécurité & RGPD & contrôle d'accès client** : avec l'ajout d'une vue cliente (même légère), il faut un vrai cloisonnement des accès (un artisan ne doit voir QUE ses propres données), authentification séparée agence/client, et traitement RGPD-conforme des données clients exposées côté client. À valider dès la conception technique, pas en fin de projet.

## En attente de validation
- Librairie UI définitive (shadcn/ui par défaut via Lovable, alternative envisagée : Tremor)
- Outil de monitoring d'erreurs (Sentry envisagé, alternative envisagée : GlitchTip self-hosted pour rester RGPD-friendly)
- Logiciel(s) de facturation utilisés par les clients artisans (à interfacer via n8n, potentiellement différent par client)
- Identité visuelle de l'agence : pas encore de logo/charte graphique, utilisateur va essayer de créer via Canva
- Portée V1 exacte de la vue cliente (widgets personnalisables) : inclus dès le lancement ou phase 2 ?

## Historique des échanges
Ce fichier sert de mémoire de projet entre les sessions. À mettre à jour au fur et à mesure des décisions.
