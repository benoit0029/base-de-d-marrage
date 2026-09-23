-- Un dépôt bancaire (BankTransaction) peut désormais être rapproché avec
-- PLUSIEURS saisies de caisse (CashJournalEntry) : un dépôt hebdomadaire
-- regroupe souvent plusieurs jours de vente directe. On retire donc la
-- contrainte d'unicité côté CashJournalEntry.bankTransactionId (celle
-- d'Entry/Invoice, elles, restent 1↔1 et ne changent pas).
DROP INDEX "CashJournalEntry_bankTransactionId_key";

CREATE INDEX "CashJournalEntry_bankTransactionId_idx" ON "CashJournalEntry"("bankTransactionId");
