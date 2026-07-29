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
- Outil **interne** (pas un livrable client) pour piloter la livraison de deux offres agence chez des clients artisans (électricien, plombier, menuisier...) :
  1. **Agent IA vocal** : décroche 24/7, filtre le démarchage, prend RDV via agenda, détecte les urgences (transfert d'appel ou SMS prioritaire)
  2. **IA de gestion globale** : tri emails, planning/tournées optimisées, devis/factures/avoirs automatiques, relances impayés, suivi commandes/livraisons fournisseurs
- Vue principale : **portefeuille agrégé** (vue globale sur tous les clients), avec accent fort sur une UI simple/visuelle/intuitive
- Architecture souhaitée : une **base commune** (dashboard + workflows n8n) pour tous les clients + une **couche personnalisable** par client (chaque artisan peut avoir des outils différents, ex. logiciel de facturation)
- Plateforme voix retenue : **Synthflow AI**
- Alertes urgences : reporting après-coup dans le dashboard + SMS direct sur le téléphone de l'artisan (pas d'alerte live dans le dashboard)

## En attente de validation
- Librairie UI définitive (shadcn/ui par défaut via Lovable, alternative envisagée : Tremor)
- Outil de monitoring d'erreurs (Sentry envisagé, alternative envisagée : GlitchTip self-hosted pour rester RGPD-friendly)
- Volume de clients artisans visé (ordre de grandeur à préciser)
- KPIs précis à afficher par offre (vocal / gestion globale)
- Rôle exact de HubSpot dans ce périmètre (CRM des clients artisans de l'agence, distinct de Synthflow)
- Logiciel(s) de facturation utilisés par les clients artisans (à interfacer via n8n, potentiellement différent par client)
- Identité visuelle de l'agence (logo/couleurs) à refléter dans le dashboard

## Historique des échanges
Ce fichier sert de mémoire de projet entre les sessions. À mettre à jour au fur et à mesure des décisions.
