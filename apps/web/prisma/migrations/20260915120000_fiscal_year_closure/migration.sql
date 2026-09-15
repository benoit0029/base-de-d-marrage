-- CreateTable
CREATE TABLE "FiscalYearClosure" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "closedById" TEXT,
    "zipFileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiscalYearClosure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FiscalYearClosure_tenantId_year_key" ON "FiscalYearClosure"("tenantId", "year");

-- AddForeignKey
ALTER TABLE "FiscalYearClosure" ADD CONSTRAINT "FiscalYearClosure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
