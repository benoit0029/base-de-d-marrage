-- Clé stable pour synchroniser un client HubSpot sans créer de doublons à chaque webhook.
alter table clients add column hubspot_id text unique;
