# Workflows n8n

## Import
Dans n8n : Workflows → Import from File → sélectionner le `.json` voulu.

## Credentials à créer une fois dans n8n
- **Supabase - Dashboard agence** (type "Supabase API") : URL du projet + clé service role, utilisée par les nœuds Supabase natifs (la plupart des workflows).
- **Anthropic API key** (type "Header Auth", en-tête `x-api-key`) : utilisée par les nœuds "Claude" (extraction/génération IA dans generation-devis, commandes-fournisseurs-generation, tri-emails).
- Variables d'environnement n8n (à définir sur le conteneur Docker, pas dans l'UI) :
  - `SUPABASE_URL` = URL du projet Supabase
  - `SUPABASE_SERVICE_ROLE_KEY` = clé service role Supabase (Settings → API) — utilisée par `ingestion-clients-hubspot.json` (upsert) et par le nœud "Résoudre le client (agent ElevenLabs)" de `ingestion-appels-elevenlabs.json` (lookup sur une colonne jsonb), qui font des appels REST directs au lieu du nœud Supabase natif et lisent donc directement ces deux en-têtes (`apikey` + `Authorization: Bearer ...`) via variable d'environnement plutôt que via une credential n8n.

## ingestion-appels-elevenlabs.json
Plateforme vocale retenue : **ElevenLabs Conversational AI** (moins cher que Synthflow à ce jour, ~0,08-0,10 $/min packagé — à réévaluer si le tarif LLM devient payant chez eux). Chaque client a son propre agent ElevenLabs ; l'association `agent_id` ElevenLabs ↔ `client_id` est stockée dans `client_config` (clé `elevenlabs_agent_id`), pas passée en query param comme on l'aurait fait avec Synthflow.

Configurer le **webhook post-call** de l'agent ElevenLabs vers :
```
POST https://<votre-n8n>/webhook/elevenlabs/appel-termine
```
Le format exact du payload (`data.analysis.data_collection_results`, `data.metadata.call_duration_secs`, etc.) est celui documenté par ElevenLabs pour les webhooks post-appel ; les champs personnalisés (`rdv_pris`, `spam`, `urgence_detectee`, `urgence_description`, ...) doivent être configurés dans l'onglet "Data collection" de l'agent — **à vérifier et ajuster une fois le compte ElevenLabs créé** (tâche 5), le mapping exact n'est pas garanti tant qu'on n'a pas un vrai payload sous les yeux.

Test local avec des données factices une fois n8n en place :
```bash
curl -X POST "https://<votre-n8n>/webhook/elevenlabs/appel-termine" \
  -H "Content-Type: application/json" \
  -d '{"data": {"agent_id": "<id agent ElevenLabs>", "status": "done", "metadata": {"call_duration_secs": 120}, "analysis": {"data_collection_results": {"rdv_pris": {"value": true}, "urgence_detectee": {"value": true}, "urgence_description": {"value": "Fuite d'\''eau active"}}}}}'
```

**Basculer vers un autre fournisseur vocal (Synthflow ou autre) plus tard** : seul ce workflow d'ingestion change (webhook + mapping des champs) — le reste du système (dashboard, validations, autres workflows) reste identique, voir `CLAUDE.md`.

## ingestion-clients-hubspot.json
Déclenché par un workflow HubSpot quand un deal passe au statut "Client actif". Propriété deal `offres` = `agent_vocal`, `gestion_globale` ou les deux séparées par une virgule.
```bash
curl -X POST "https://<votre-n8n>/webhook/hubspot/client-actif" \
  -H "Content-Type: application/json" \
  -d '{"company_id": "hs-123", "company_name": "Dupont Électricité", "secteur": "Électricien", "contact_email": "contact@dupont.fr", "offres": "agent_vocal,gestion_globale"}'
```
Rejouer la même requête ne doit pas créer de doublon (upsert sur `hubspot_id`, ignore-duplicates sur `client_offres`).

## detection-relances-impayes.json + envoi-relance-apres-validation.json
Deux workflows liés pour la relance impayés, avec validation humaine à **chaque** rappel (J+1, J+15, mise en demeure) :

1. **Détection quotidienne** (cron 8h) : boucle sur les factures impayées (`Loop Over Items`), crée une ligne `relances` + une ligne `validations` pour chaque échéance du jour. Rien n'est envoyé automatiquement.
2. **Envoi après validation** : un **Database Webhook Supabase** (à créer dans Supabase → Database → Webhooks) sur `UPDATE` de la table `validations`, filtré sur `type_action = relance_impaye AND statut IN ('valide','modifie')`, appelle ce workflow n8n. Il marque la relance envoyée et déclenche le SMS/email (fournisseur à brancher en tâche 5, nœud "Envoyer SMS/email" en placeholder).

Rien ne part au client tant que vous n'avez pas approuvé/modifié la relance dans la file de validation du dashboard — le rejet arrête la chaîne.

## generation-devis.json + envoi-devis-apres-validation.json
Même principe que la relance impayés, appliqué au devis :

1. **Génération** : reçoit une note (vocale transcrite, ou texte issu d'un mail) via webhook, récupère le **catalogue tarifaire du client** (`catalogue_client` — couche personnalisable par client : matériaux et prestations/MO avec leurs vrais prix), appelle Claude pour en extraire les lignes de prestation chiffrées avec ces tarifs et un montant total, crée un devis en `en_attente_validation` + une entrée dans la file de validation. **Rien n'est envoyé au client à ce stade.**
2. **Envoi après validation** : Database Webhook Supabase sur `validations` (type_action = devis, statut IN valide/modifie) → marque le devis "envoyé" et déclenche la génération PDF + l'envoi email (fournisseur à choisir en tâche 5).

Non résolu pour l'instant, à trancher en tâche 5 :
- Comment la note vocale est capturée et transcrite (quel canal : message WhatsApp, appli dédiée, autre ?)
- Clé API Anthropic à configurer (credential `anthropicApi`)
- Outil de génération PDF + envoi email

## facturation-automatique.json
Déclenché quand un chantier est marqué terminé (webhook `chantier/termine` avec `devis_id`). **Aucune validation humaine** : règle fixe (échéance J+30), décision déjà actée dans `CLAUDE.md`. Crée la facture et déclenche l'envoi PDF/email directement.

## commandes-fournisseurs-generation.json + commandes-fournisseurs-envoi-apres-validation.json
Même patron que devis/relances, déclenché quand un devis passe à "signé" (webhook `devis/signe`) :

1. **Génération** : récupère le devis + le fournisseur habituel du client (`client_config`, clé `fournisseur_habituel` — c'est la couche personnalisable par client), demande à Claude la liste des matériaux et un montant estimé, crée une commande en `en_attente` + une entrée de validation. **Rien n'est envoyé au fournisseur à ce stade.**
2. **Envoi après validation** : Database Webhook Supabase sur `validations` (type_action = commande_fournisseur) → marque la commande envoyée et déclenche l'envoi réel (canal à choisir en tâche 5 : email, EDI...).

## tri-emails.json + envoi-email-apres-validation.json
Tri automatique des emails entrants (webhook `emails/recu`) :

- **Claude classe** l'email (demande_devis / urgence / pub_spam / question_recurrente / autre) et rédige une réponse si la question est générique.
- **Spam** → archivé, rien d'autre.
- **Générique** → réponse envoyée automatiquement (décision projet : pas de validation humaine sur ce cas).
- **Non générique** (demande de devis, urgence, cas ambigu...) → réponse proposée mise en file de validation ; envoyée seulement après votre approbation/modification via le hook Supabase habituel.

Tout est tracé dans la nouvelle table `emails`, consultable depuis le dashboard.

## planning-optimisation-tournees.json + planning-notification-retard.json
Automatiques (décision projet : optimisation planning = pas de validation humaine) :

1. **Optimisation quotidienne** (cron 6h) : récupère les interventions du jour, les regroupe par client (chaque artisan a sa propre tournée), calcule un itinéraire optimisé (service à brancher en tâche 5) et met à jour l'ordre de passage.
2. **Notification de retard** : webhook déclenché quand un artisan signale un retard sur le chantier en cours → identifie le prochain client de la tournée → l'avertit par SMS automatiquement (notification standard, pas d'engagement financier).

## suivi-livraisons-fournisseurs.json
Complète les commandes fournisseurs avec le suivi de livraison (colonnes `statut_livraison`, `date_livraison_prevue`, `date_livraison_reelle` sur `commandes_fournisseurs`) :

- Un webhook reçoit la confirmation du fournisseur (canal à interfacer en tâche 5 : email/EDI).
- Un contrôle quotidien (cron 7h) signale automatiquement en `retard` toute commande dont la date prévue est dépassée sans livraison confirmée — c'est l'agent superviseur : il rend l'anomalie visible dans le dashboard, il n'envoie rien lui-même.

## Limite actuelle
Ces workflows sont écrits à la main au format d'export n8n et validés en JSON, mais **pas encore exécutés sur une instance n8n réelle** (pas d'instance n8n disponible dans cet environnement de travail). À importer et tester avec les commandes `curl` ci-dessus une fois n8n installé sur le VPS Hostinger.
