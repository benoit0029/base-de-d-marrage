-- Numérotation légale (FA2026-001 / AV2026-001 / DE2026-001) par entreprise, compteur
-- qui ne recule jamais, factures d'avoir.
-- AlterEnum
ALTER TYPE "InvoiceType" ADD VALUE 'AVOIR';

-- DropIndex
DROP INDEX "Invoice_number_key";

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "creditedInvoiceId" TEXT,
ADD COLUMN     "series" TEXT NOT NULL DEFAULT 'BIC';

-- Série par entreprise : Maraîchage (exploitation agricole) = "BA", Revente +
-- Kerbooth (une seule micro-entreprise) = "BIC". Les factures déjà émises
-- gardent leur numéro (ancien format).
UPDATE "Invoice" SET "series" = 'BA' WHERE "activity" = 'BA_MARAICHAGE';

-- CreateTable
CREATE TABLE "InvoiceSequence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceSequence_tenantId_series_kind_year_key" ON "InvoiceSequence"("tenantId", "series", "kind", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_creditedInvoiceId_key" ON "Invoice"("creditedInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_series_number_key" ON "Invoice"("tenantId", "series", "number");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_creditedInvoiceId_fkey" FOREIGN KEY ("creditedInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceSequence" ADD CONSTRAINT "InvoiceSequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

