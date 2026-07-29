-- Couche personnalisable par client : catalogue de matériaux et de prestations/MO
-- utilisé pour chiffrer les devis et les commandes fournisseurs avec les vrais tarifs du client.
create type type_ligne_catalogue as enum ('materiau', 'prestation');

create table catalogue_client (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  type type_ligne_catalogue not null,
  designation text not null,
  unite text,
  prix_unitaire numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create index on catalogue_client (client_id, type);
