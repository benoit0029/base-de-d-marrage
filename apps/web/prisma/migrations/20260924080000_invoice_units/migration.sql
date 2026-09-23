-- Unité (kg, pièce, botte…) sur les produits du catalogue et les lignes de facture
ALTER TABLE "Product" ADD COLUMN "unit" TEXT;
ALTER TABLE "InvoiceLine" ADD COLUMN "unit" TEXT;
