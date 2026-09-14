-- CreateEnum
CREATE TYPE "SimpleImportCategory" AS ENUM ('TESA_CONTRAT', 'TESA_BULLETIN_PAIE', 'TESA_COTISATIONS_SALARIALES', 'TESA_CERTIFICAT_TRAVAIL', 'TESA_ATTESTATION_POLE_EMPLOI', 'TESA_SOLDE_TOUT_COMPTE', 'COTISATION_NON_SALARIE');

-- CreateEnum
CREATE TYPE "BankTransactionDirection" AS ENUM ('DEBIT', 'CREDIT');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "fileHash" TEXT,
ADD COLUMN "possibleDuplicateOfId" TEXT;

-- AlterTable
ALTER TABLE "Entry" ADD COLUMN "bankTransactionId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "bankTransactionId" TEXT;

-- AlterTable
ALTER TABLE "CashJournalEntry" ADD COLUMN "bankTransactionId" TEXT;

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "activity" "Activity" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "direction" "BankTransactionDirection" NOT NULL,
    "sourceFileUrl" TEXT,
    "sourceFileHash" TEXT,
    "possibleDuplicateOfId" TEXT,
    "duplicateConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimpleImport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "activity" "Activity" NOT NULL,
    "category" "SimpleImportCategory" NOT NULL,
    "period" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "amountTtc" DECIMAL(12,2),
    "linkedEntryId" TEXT,
    "possibleDuplicateOfId" TEXT,
    "duplicateConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimpleImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Entry_bankTransactionId_key" ON "Entry"("bankTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_bankTransactionId_key" ON "Invoice"("bankTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "CashJournalEntry_bankTransactionId_key" ON "CashJournalEntry"("bankTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "SimpleImport_linkedEntryId_key" ON "SimpleImport"("linkedEntryId");

-- CreateIndex
CREATE INDEX "BankTransaction_tenantId_activity_direction_date_idx" ON "BankTransaction"("tenantId", "activity", "direction", "date");

-- CreateIndex
CREATE INDEX "SimpleImport_tenantId_activity_category_idx" ON "SimpleImport"("tenantId", "activity", "category");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_possibleDuplicateOfId_fkey" FOREIGN KEY ("possibleDuplicateOfId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashJournalEntry" ADD CONSTRAINT "CashJournalEntry_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_possibleDuplicateOfId_fkey" FOREIGN KEY ("possibleDuplicateOfId") REFERENCES "BankTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimpleImport" ADD CONSTRAINT "SimpleImport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimpleImport" ADD CONSTRAINT "SimpleImport_linkedEntryId_fkey" FOREIGN KEY ("linkedEntryId") REFERENCES "Entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimpleImport" ADD CONSTRAINT "SimpleImport_possibleDuplicateOfId_fkey" FOREIGN KEY ("possibleDuplicateOfId") REFERENCES "SimpleImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
