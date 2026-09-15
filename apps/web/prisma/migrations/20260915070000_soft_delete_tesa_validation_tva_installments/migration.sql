-- AlterTable
ALTER TABLE "Entry" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CashJournalEntry" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BankTransaction" ADD COLUMN "status" "EntryStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "validatedById" TEXT,
ADD COLUMN "validatedAt" TIMESTAMP(3),
ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SimpleImport" ADD COLUMN "status" "EntryStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "validatedById" TEXT,
ADD COLUMN "validatedAt" TIMESTAMP(3),
ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TvaInstallment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dueLabel" TEXT NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "justificatifUrl" TEXT,
    "fileHash" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'PENDING',
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TvaInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TvaInstallment_tenantId_status_idx" ON "TvaInstallment"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "TvaInstallment" ADD CONSTRAINT "TvaInstallment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
