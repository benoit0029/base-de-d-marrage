-- V1 : dashboard interne agence uniquement. Tout accès requiert une connexion
-- (rôle "authenticated"), l'accès anonyme est totalement bloqué. Les rôles
-- fins agence/client seront ajoutés en phase 2 avec la vue cliente.

alter table clients enable row level security;
alter table client_offres enable row level security;
alter table client_config enable row level security;
alter table appels enable row level security;
alter table urgences enable row level security;
alter table devis enable row level security;
alter table factures enable row level security;
alter table relances enable row level security;
alter table commandes_fournisseurs enable row level security;
alter table validations enable row level security;
alter table utilisateurs enable row level security;
alter table catalogue_client enable row level security;
alter table emails enable row level security;
alter table interventions enable row level security;

-- Les vues s'exécutent par défaut avec les droits du créateur : security_invoker
-- force l'application des policies RLS de l'utilisateur qui interroge la vue.
alter view client_portefeuille set (security_invoker = on);

create policy "agence_full_access" on clients for all to authenticated using (true) with check (true);
create policy "agence_full_access" on client_offres for all to authenticated using (true) with check (true);
create policy "agence_full_access" on client_config for all to authenticated using (true) with check (true);
create policy "agence_full_access" on appels for all to authenticated using (true) with check (true);
create policy "agence_full_access" on urgences for all to authenticated using (true) with check (true);
create policy "agence_full_access" on devis for all to authenticated using (true) with check (true);
create policy "agence_full_access" on factures for all to authenticated using (true) with check (true);
create policy "agence_full_access" on relances for all to authenticated using (true) with check (true);
create policy "agence_full_access" on commandes_fournisseurs for all to authenticated using (true) with check (true);
create policy "agence_full_access" on validations for all to authenticated using (true) with check (true);
create policy "agence_full_access" on utilisateurs for all to authenticated using (true) with check (true);
create policy "agence_full_access" on catalogue_client for all to authenticated using (true) with check (true);
create policy "agence_full_access" on emails for all to authenticated using (true) with check (true);
create policy "agence_full_access" on interventions for all to authenticated using (true) with check (true);
