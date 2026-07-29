# Projet : Dashboard agence IA

## Contexte
Dashboard pour piloter une agence IA. Construit avec l'aide de Claude Code.

## Décisions prises
- Front : Lovable (no-code/low-code, base React + shadcn/ui par défaut)
- Automatisation : n8n, self-hosted sur le VPS Hostinger (pas de plan Cloud)
- Hébergement : VPS Hostinger (dashboard + n8n)
- CRM / source de données : HubSpot
- Contrainte RGPD : hébergement et sous-traitants doivent être conformes (voir section RGPD du dernier échange)

## En attente de validation
- Librairie UI définitive (shadcn/ui par défaut via Lovable, alternative envisagée : Tremor)
- Outil de monitoring d'erreurs (Sentry envisagé, alternative envisagée : GlitchTip self-hosted pour rester RGPD-friendly)
- Objectif précis du dashboard, utilisateurs cibles, KPIs à afficher → en cours de cadrage via interview

## Historique des échanges
Ce fichier sert de mémoire de projet entre les sessions. À mettre à jour au fur et à mesure des décisions.
