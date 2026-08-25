# Registre des sous-traitants — Kalonia

Document de suivi RGPD (article 30 du RGPD, registre des activités de traitement côté sous-traitance). À tenir à jour à chaque ajout/retrait d'outil. À transformer en document formel avant l'onboarding de vrais clients (vérifier les DPA — Data Processing Agreements — de chaque prestataire à ce moment-là).

## Outils en production

| Outil | Rôle | Données concernées | Localisation d'hébergement | Statut |
|---|---|---|---|---|
| **Supabase** | Base de données + authentification | Toutes les données clients (contacts, factures, devis, avoirs, appels) + comptes agence | AWS eu-west-1 (Irlande, UE) | ✅ En production |
| **Hostinger** | VPS (n8n) + domaine + emails | Automatisations en transit, boîtes email agence | Datacenter Francfort (Allemagne, UE) | ✅ En production |
| **Vercel** | Hébergement du frontend (code de l'app uniquement) | Aucune donnée client stockée ; logs d'accès (IP visiteurs) possibles hors UE | Réseau mondial (CDN), société américaine | ✅ En production — risque mineur noté (logs d'accès), acceptable en usage interne actuel |
| **Sentry** | Monitoring d'erreurs techniques | Traces d'erreurs techniques (pas de contenu client volontairement — Session Replay désactivé, `sendDefaultPii: false`) | Région UE (Allemagne, `ingest.de.sentry.io`) | ✅ En production |
| **Cloudflare** | DNS de `kalonia.fr` | Aucune donnée client, juste résolution de nom de domaine | Infrastructure mondiale, société américaine | ✅ En production |

## Outils créés mais mis en pause (recentrage de portée)

| Outil | Rôle prévu | Données concernées | Localisation | Statut |
|---|---|---|---|---|
| **ElevenLabs** | Agent vocal IA (décroche les appels clients) | Enregistrements/transcriptions d'appels, coordonnées appelants | À vérifier au moment de la reprise (US par défaut, options UE à confirmer selon le plan) | ⏸️ Compte créé, agent de test nettoyé, non utilisé actuellement |
| **HubSpot** | CRM (source des nouveaux clients agence) | Coordonnées prospects/clients (nom, email, téléphone, secteur) | À vérifier au moment de la reprise (US par défaut sur plan gratuit, UE possible sur plans payants) | ⏸️ Compte créé, propriétés personnalisées configurées, non branché activement |
| **Google (Drive/Slides/Sheets)** | Génération de factures (template, archivage, log) | Contenu des factures (montants, noms clients) dans les fichiers archivés | À vérifier selon le compte Google utilisé | ⏸️ Workflow prêt, credential pas encore connectée |

## Points à traiter avant d'onboarder de vrais clients (pas avant)
- Vérifier/signer les DPA de chaque prestataire encore actif à ce moment-là
- Confirmer la localisation UE réelle d'ElevenLabs et HubSpot si ces chantiers reprennent (sinon envisager des alternatives européennes ou accepter le risque avec clause dédiée dans les CGU/CGV clients)
- Rédiger une politique de confidentialité publique pour `kalonia.fr` mentionnant ces sous-traitants
- Passer Supabase sur un plan avec sauvegardes (actuellement plan gratuit, aucune sauvegarde automatique)
