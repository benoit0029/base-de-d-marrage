-- Schéma initial : dashboard interne agence (portefeuille clients artisans)
-- RLS par rôle (agence/client) sera ajouté en phase 2 avec la vue cliente.

create type offre_type as enum ('agent_vocal', 'gestion_globale');
create type statut_appel as enum ('decroche', 'manque', 'spam');
create type statut_validation as enum ('en_attente', 'valide', 'modifie', 'rejete');
create type type_action_validation as enum ('devis', 'relance_impaye', 'commande_fournisseur', 'email');
create type type_relance as enum ('j1', 'j15', 'mise_en_demeure');
create type statut_devis as enum ('brouillon', 'en_attente_validation', 'envoye', 'signe', 'refuse');
create type statut_facture as enum ('emise', 'payee', 'impayee');
create type role_utilisateur as enum ('agence_admin', 'agence_membre', 'client');

create table clients (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  secteur text not null,
  email text,
  telephone text,
  date_debut date not null default current_date,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create table client_offres (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  offre offre_type not null,
  date_activation date not null default current_date,
  unique (client_id, offre)
);

-- Couche personnalisable par client : credentials/paramètres (agenda, logiciel de facturation, seuils d'urgence...)
create table client_config (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  cle text not null,
  valeur jsonb not null,
  unique (client_id, cle)
);

create table appels (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  statut statut_appel not null,
  rdv_pris boolean not null default false,
  duree_secondes integer,
  created_at timestamptz not null default now()
);

create table urgences (
  id uuid primary key default gen_random_uuid(),
  appel_id uuid not null references appels(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  description text,
  sms_envoye boolean not null default false,
  transfert boolean not null default false,
  created_at timestamptz not null default now()
);

create table devis (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  montant numeric(10, 2) not null,
  statut statut_devis not null default 'brouillon',
  date_creation timestamptz not null default now(),
  date_envoi timestamptz
);

create table factures (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  devis_id uuid references devis(id),
  montant numeric(10, 2) not null,
  statut statut_facture not null default 'emise',
  date_emission timestamptz not null default now(),
  date_echeance date not null
);

create table relances (
  id uuid primary key default gen_random_uuid(),
  facture_id uuid not null references factures(id) on delete cascade,
  type type_relance not null,
  statut statut_validation not null default 'en_attente',
  date_prevue date not null,
  date_envoi timestamptz
);

create table commandes_fournisseurs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  devis_id uuid references devis(id),
  fournisseur text not null,
  montant numeric(10, 2),
  statut statut_validation not null default 'en_attente',
  created_at timestamptz not null default now()
);

-- File d'attente de validation humaine, transversale à tous les workflows sensibles
create table validations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  type_action type_action_validation not null,
  reference_id uuid not null,
  contenu_propose jsonb not null,
  statut statut_validation not null default 'en_attente',
  valide_par uuid,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table utilisateurs (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role role_utilisateur not null,
  client_id uuid references clients(id),
  created_at timestamptz not null default now()
);

create index on client_offres (client_id);
create index on client_config (client_id);
create index on appels (client_id);
create index on urgences (client_id);
create index on devis (client_id);
create index on factures (client_id);
create index on relances (facture_id);
create index on commandes_fournisseurs (client_id);
create index on validations (client_id, statut);
