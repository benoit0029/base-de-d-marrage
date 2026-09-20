-- CreateEnum
CREATE TYPE "KerboothFormula" AS ENUM ('ESSENTIEL', 'POPULAIRE', 'ENTREPRISE');

-- CreateEnum
CREATE TYPE "KerboothBookingStatus" AS ENUM ('PENDING_SIGNATURE', 'PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "KerboothUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "baseLocation" TEXT NOT NULL,
    "ownerLabel" TEXT NOT NULL DEFAULT 'Benoît',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KerboothUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KerboothBooking" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unitId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "eventDateStart" TIMESTAMP(3) NOT NULL,
    "eventDateEnd" TIMESTAMP(3) NOT NULL,
    "formula" "KerboothFormula" NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "status" "KerboothBookingStatus" NOT NULL DEFAULT 'PENDING_SIGNATURE',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "stripeCustomerId" TEXT,
    "yousignRequestId" TEXT,
    "invoiceId" TEXT,
    "contractSignedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KerboothBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KerboothUnit_tenantId_label_key" ON "KerboothUnit"("tenantId", "label");

-- CreateIndex
CREATE INDEX "KerboothBooking_tenantId_eventDateStart_eventDateEnd_idx" ON "KerboothBooking"("tenantId", "eventDateStart", "eventDateEnd");

-- CreateIndex
CREATE INDEX "KerboothBooking_tenantId_status_idx" ON "KerboothBooking"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "KerboothUnit" ADD CONSTRAINT "KerboothUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KerboothBooking" ADD CONSTRAINT "KerboothBooking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KerboothBooking" ADD CONSTRAINT "KerboothBooking_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "KerboothUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
