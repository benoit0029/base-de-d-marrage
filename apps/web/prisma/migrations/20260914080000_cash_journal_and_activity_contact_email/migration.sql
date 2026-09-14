-- AlterTable
ALTER TABLE "ActivitySettings" ADD COLUMN "contactEmail" TEXT;

-- CreateTable
CREATE TABLE "CashJournalEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "activity" "Activity" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "cashAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "checkAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cardAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "depositSlipUrl" TEXT,
    "cardStatementUrl" TEXT,
    "exceptionalSales" JSONB,
    "status" "EntryStatus" NOT NULL DEFAULT 'PENDING',
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashJournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashJournalEntry_tenantId_activity_status_idx" ON "CashJournalEntry"("tenantId", "activity", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CashJournalEntry_tenantId_activity_date_key" ON "CashJournalEntry"("tenantId", "activity", "date");

-- AddForeignKey
ALTER TABLE "CashJournalEntry" ADD CONSTRAINT "CashJournalEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
