-- Onglet Employeur (Maraîchage) : registre unique du personnel et obligations à cocher
CREATE TABLE "StaffRegisterEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "sex" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "qualification" TEXT,
    "contractType" TEXT NOT NULL,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "exitDate" TIMESTAMP(3),
    "workPermit" TEXT,
    "infoVisitDoneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffRegisterEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmployerChecklistItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "doneAt" TIMESTAMP(3),
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployerChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StaffRegisterEntry_tenantId_hireDate_idx" ON "StaffRegisterEntry"("tenantId", "hireDate");

CREATE UNIQUE INDEX "EmployerChecklistItem_tenantId_key_key" ON "EmployerChecklistItem"("tenantId", "key");

ALTER TABLE "StaffRegisterEntry" ADD CONSTRAINT "StaffRegisterEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EmployerChecklistItem" ADD CONSTRAINT "EmployerChecklistItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
