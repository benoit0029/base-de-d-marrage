-- CreateTable
CREATE TABLE "MailboxConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "activity" "Activity" NOT NULL,
    "imapHost" TEXT,
    "imapPort" INTEGER NOT NULL DEFAULT 993,
    "imapUser" TEXT,
    "imapPasswordEncrypted" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_TESTED',
    "lastError" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailboxConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MailboxConnection_tenantId_activity_key" ON "MailboxConnection"("tenantId", "activity");

-- AddForeignKey
ALTER TABLE "MailboxConnection" ADD CONSTRAINT "MailboxConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
