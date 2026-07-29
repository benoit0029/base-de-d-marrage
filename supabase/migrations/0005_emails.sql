-- Suivi des emails entrants (tri automatique) pour rester consultable depuis le dashboard.
create type statut_email as enum ('repondu_auto', 'en_attente_validation', 'envoye', 'rejete', 'ignore');

create table emails (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  expediteur text not null,
  sujet text,
  corps text not null,
  categorie text not null,
  reponse text,
  statut statut_email not null default 'en_attente_validation',
  created_at timestamptz not null default now()
);

create index on emails (client_id, statut);
