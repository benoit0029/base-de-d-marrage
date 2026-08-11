create table avoirs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  facture_id uuid references factures(id),
  montant numeric(10, 2) not null,
  motif text,
  date_emission timestamptz not null default now()
);

alter table avoirs enable row level security;

create policy "agence_full_access" on avoirs for all to authenticated using (true) with check (true);
