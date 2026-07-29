-- Vue d'agrégation utilisée par le portefeuille agrégé du dashboard interne.
create view client_portefeuille as
select
  c.id,
  c.nom,
  c.secteur,
  c.actif,
  coalesce(array_agg(distinct co.offre) filter (where co.offre is not null), '{}') as offres,
  count(distinct a.id) as nb_appels,
  count(distinct a.id) filter (where a.statut = 'decroche') as nb_appels_decroches,
  count(distinct a.id) filter (where a.rdv_pris) as nb_rdv_pris,
  count(distinct a.id) filter (where a.statut = 'spam') as nb_spams,
  count(distinct u.id) as nb_urgences,
  count(distinct d.id) filter (where d.statut = 'en_attente_validation') as nb_devis_en_attente,
  count(distinct f.id) filter (where f.statut = 'impayee') as nb_factures_impayees,
  coalesce(sum(f.montant) filter (where f.statut = 'impayee'), 0) as montant_impaye,
  coalesce(sum(f.montant) filter (where f.statut = 'payee'), 0) as ca_pilote
from clients c
left join client_offres co on co.client_id = c.id
left join appels a on a.client_id = c.id
left join urgences u on u.client_id = c.id
left join devis d on d.client_id = c.id
left join factures f on f.client_id = c.id
group by c.id, c.nom, c.secteur, c.actif;
