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

## Limite actuelle
Ces workflows sont écrits à la main au format d'export n8n et validés en JSON, mais **pas encore exécutés sur une instance n8n réelle** (pas d'instance n8n disponible dans cet environnement de travail). À importer et tester avec les commandes `curl` ci-dessus une fois n8n installé sur le VPS Hostinger.
