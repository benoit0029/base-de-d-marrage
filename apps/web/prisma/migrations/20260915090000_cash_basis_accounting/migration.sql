-- AlterTable
ALTER TABLE "Entry" ADD COLUMN "paidAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "paidAt" TIMESTAMP(3);
