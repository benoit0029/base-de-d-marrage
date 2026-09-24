-- Recettes HT des années passées saisies à la main (page Déclaration 2042)
CREATE TABLE "PriorYearRevenue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "activity" "Activity" NOT NULL,
    "year" INTEGER NOT NULL,
    "amountHt" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriorYearRevenue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PriorYearRevenue_tenantId_activity_year_key" ON "PriorYearRevenue"("tenantId", "activity", "year");

ALTER TABLE "PriorYearRevenue" ADD CONSTRAINT "PriorYearRevenue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
