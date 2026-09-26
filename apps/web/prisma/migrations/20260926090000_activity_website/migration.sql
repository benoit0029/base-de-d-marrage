-- Site web par activité, affiché sur les devis et factures (D-165).
ALTER TABLE "ActivitySettings" ADD COLUMN "websiteUrl" TEXT;

-- Kerbooth 360 : https://kerbooth360.fr (marque commune, aussi chez le
-- partenaire), sans écraser une adresse déjà saisie.
INSERT INTO "ActivitySettings" ("id", "tenantId", "activity", "websiteUrl", "invoicingEnabled", "abLogoEnabled", "tvaInstallmentsEnabled", "updatedAt")
SELECT gen_random_uuid()::text, t."id", 'BIC_PHOTOBOOTH', 'https://kerbooth360.fr', true, false, true, CURRENT_TIMESTAMP
FROM "Tenant" t
ON CONFLICT ("tenantId", "activity") DO UPDATE
SET "websiteUrl" = COALESCE("ActivitySettings"."websiteUrl", EXCLUDED."websiteUrl");
