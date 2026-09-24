-- Lieu de vente (marché, ferme…) de la saisie du jour, lu sur la fiche
ALTER TABLE "CashJournalEntry" ADD COLUMN "location" TEXT;
