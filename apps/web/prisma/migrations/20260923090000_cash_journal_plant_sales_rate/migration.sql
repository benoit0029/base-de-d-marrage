-- Part de vente de plants (10%) déjà incluse dans le total du jour, pour
-- calculer correctement la TVA collectée sur vente directe (deux taux
-- mélangés : 5,5% fruits/légumes, 10% plants) — voir lib/tva.
ALTER TABLE "CashJournalEntry" ADD COLUMN "plantSalesAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
