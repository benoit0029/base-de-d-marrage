-- Devis Kerbooth entreprises (D-160), RIB par activité, SIREN/TVA du client figés sur la facture, e-mail client
-- CreateEnum
CREATE TYPE "KerboothQuoteStatus" AS ENUM ('DRAFT', 'TO_SEND', 'SENT', 'SIGNED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "ActivitySettings" ADD COLUMN     "bankBic" TEXT,
ADD COLUMN     "bankIban" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "clientSiren" TEXT,
ADD COLUMN     "clientVatNumber" TEXT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "KerboothBooking" ADD COLUMN     "quoteId" TEXT;

-- CreateTable
CREATE TABLE "KerboothQuote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "quoteInvoiceId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "clientEmail" TEXT NOT NULL,
    "formulaLabel" TEXT NOT NULL,
    "photoboothCount" INTEGER NOT NULL DEFAULT 1,
    "eventLocation" TEXT NOT NULL,
    "paymentTermDays" INTEGER NOT NULL DEFAULT 30,
    "status" "KerboothQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "sendRequestedAt" TIMESTAMP(3),
    "sendClaimedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "reminder1SentAt" TIMESTAMP(3),
    "reminder2SentAt" TIMESTAMP(3),
    "yousignRequestId" TEXT,
    "yousignSignerId" TEXT,
    "yousignCancelledAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KerboothQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KerboothQuotePeriod" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KerboothQuotePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KerboothQuote_quoteInvoiceId_key" ON "KerboothQuote"("quoteInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "KerboothQuote_invoiceId_key" ON "KerboothQuote"("invoiceId");

-- CreateIndex
CREATE INDEX "KerboothQuote_tenantId_status_idx" ON "KerboothQuote"("tenantId", "status");

-- CreateIndex
CREATE INDEX "KerboothQuotePeriod_quoteId_idx" ON "KerboothQuotePeriod"("quoteId");

-- CreateIndex
CREATE INDEX "KerboothBooking_quoteId_idx" ON "KerboothBooking"("quoteId");

-- AddForeignKey
ALTER TABLE "KerboothBooking" ADD CONSTRAINT "KerboothBooking_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "KerboothQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KerboothQuote" ADD CONSTRAINT "KerboothQuote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KerboothQuotePeriod" ADD CONSTRAINT "KerboothQuotePeriod_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "KerboothQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

