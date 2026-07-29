# Workflows n8n

## Import
Dans n8n : Workflows → Import from File → sélectionner le `.json` voulu.

## Credentials à créer une fois dans n8n
- **Supabase - Dashboard agence** (type "Supabase API") : URL du projet + clé anon/service, utilisée par les nœuds Supabase natifs.
- **Supabase - Service role key** (type "Header Auth") : deux en-têtes, `apikey` et `Authorization: Bearer <service_role_key>` — nécessaire pour les appels REST directs (upsert) qui contournent les policies RLS.
- Variable d'environnement n8n `SUPABASE_URL` = URL du projet Supabase.

## ingestion-appels-synthflow.json
Chaque agent Synthflow doit être configuré pour appeler :
```
POST https://<votre-n8n>/webhook/synthflow/appel-termine?client_id=<uuid du client>
```
Corps attendu (à adapter au format réel de Synthflow une fois branché, cf. tâche 5) :
```json
{ "decroche": true, "spam": false, "rdv_pris": true, "duree_secondes": 180,
  "urgence_detectee": false, "urgence_description": null,
  "urgence_sms_envoye": false, "urgence_transfert": false }
```
Test local avec des données factices :
```bash
curl -X POST "https://<votre-n8n>/webhook/synthflow/appel-termine?client_id=<uuid>" \
  -H "Content-Type: application/json" \
  -d '{"decroche": true, "rdv_pris": true, "duree_secondes": 120, "urgence_detectee": true, "urgence_description": "Fuite d'\''eau active"}'
```

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

## Limite actuelle
Ces workflows sont écrits à la main au format d'export n8n et validés en JSON, mais **pas encore exécutés sur une instance n8n réelle** (pas d'instance n8n disponible dans cet environnement de travail). À importer et tester avec les commandes `curl` ci-dessus une fois n8n installé sur le VPS Hostinger.
