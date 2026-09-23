-- Bascule de la micro-BIC hors franchise en base de TVA (date confirmée par
-- l'exploitant + choix de prix Kerbooth), voir lib/tva/bic.
ALTER TABLE "CompanySettings" ADD COLUMN "bicVatLiableFrom" TIMESTAMP(3);
ALTER TABLE "CompanySettings" ADD COLUMN "bicVatPricing" TEXT;
