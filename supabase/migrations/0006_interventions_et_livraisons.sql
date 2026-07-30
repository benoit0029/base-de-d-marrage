-- Planning/tournées : rendez-vous/chantiers à ordonnancer par jour et par client.
create type statut_intervention as enum ('planifiee', 'en_cours', 'terminee', 'retardee');

create table interventions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  date_prevue date not null,
  heure_prevue time,
  adresse text not null,
  statut statut_intervention not null default 'planifiee',
  ordre_tournee integer,
  created_at timestamptz not null default now()
);

create index on interventions (client_id, date_prevue);

-- Suivi des livraisons fournisseurs : statut distinct du statut de validation de la commande.
create type statut_livraison as enum ('en_attente', 'confirmee', 'livree', 'retard');

alter table commandes_fournisseurs add column statut_livraison statut_livraison not null default 'en_attente';
alter table commandes_fournisseurs add column date_livraison_prevue date;
alter table commandes_fournisseurs add column date_livraison_reelle date;
