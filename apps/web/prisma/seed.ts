// Données de démonstration pour le développement local. N'appelle jamais le
// pipeline IA (pas besoin de clé Mistral) : insère directement des Document +
// Entry pour vérifier l'affichage et le flux de validation.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: "seed-tenant" },
    update: {},
    create: { id: "seed-tenant", name: "Exploitation (v1)" },
  });

  await prisma.activitySettings.upsert({
    where: { tenantId_activity: { tenantId: tenant.id, activity: "BA_MARAICHAGE" } },
    update: {},
    create: { tenantId: tenant.id, activity: "BA_MARAICHAGE", invoicingEnabled: true },
  });
  await prisma.activitySettings.upsert({
    where: { tenantId_activity: { tenantId: tenant.id, activity: "BIC_FRUITS_LEGUMES" } },
    update: {},
    create: { tenantId: tenant.id, activity: "BIC_FRUITS_LEGUMES", invoicingEnabled: false },
  });
  await prisma.activitySettings.upsert({
    where: { tenantId_activity: { tenantId: tenant.id, activity: "BIC_PHOTOBOOTH" } },
    update: {},
    create: { tenantId: tenant.id, activity: "BIC_PHOTOBOOTH", invoicingEnabled: true },
  });

  const sampleDocs: Array<{
    activity: "BA_MARAICHAGE" | "BIC_FRUITS_LEGUMES" | "BIC_PHOTOBOOTH";
    type: "RECETTE" | "ACHAT";
    status: "PENDING" | "VALIDATED";
    counterpartyName: string;
    nature: string;
    amountHt: number;
    source: "EMAIL" | "PHOTO" | "UPLOAD";
  }> = [
    { activity: "BA_MARAICHAGE", type: "RECETTE", status: "VALIDATED", counterpartyName: "Marché de Quimper", nature: "Vente de légumes bio", amountHt: 320, source: "UPLOAD" },
    { activity: "BA_MARAICHAGE", type: "ACHAT", status: "PENDING", counterpartyName: "Graineterie du Ponant", nature: "Semences bio", amountHt: 145.5, source: "EMAIL" },
    { activity: "BIC_FRUITS_LEGUMES", type: "RECETTE", status: "VALIDATED", counterpartyName: "Vente directe ferme", nature: "Cagette de pommes", amountHt: 45, source: "UPLOAD" },
    { activity: "BIC_FRUITS_LEGUMES", type: "ACHAT", status: "PENDING", counterpartyName: "Grossiste Primeur Sud", nature: "Achat de fruits pour revente", amountHt: 210, source: "EMAIL" },
    { activity: "BIC_PHOTOBOOTH", type: "RECETTE", status: "PENDING", counterpartyName: "Mariage Le Guennec", nature: "Location Kerbooth 360°", amountHt: 450, source: "EMAIL" },
    { activity: "BIC_PHOTOBOOTH", type: "ACHAT", status: "VALIDATED", counterpartyName: "Photobooth Store", nature: "Accessoires photobooth", amountHt: 89, source: "PHOTO" },
  ];

  for (const s of sampleDocs) {
    const document = await prisma.document.create({
      data: {
        tenantId: tenant.id,
        source: s.source,
        status: "EXTRACTED",
        fileUrl: "local://seed-placeholder",
        mimeType: "application/pdf",
        extractionJson: { counterpartyName: s.counterpartyName, nature: s.nature },
      },
    });

    await prisma.entry.create({
      data: {
        tenantId: tenant.id,
        activity: s.activity,
        type: s.type,
        status: s.status,
        date: new Date(),
        amountHt: s.amountHt,
        amountVat: 0,
        amountTtc: s.amountHt,
        counterpartyName: s.counterpartyName,
        nature: s.nature,
        sourceDocumentId: document.id,
        ...(s.status === "VALIDATED" ? { validatedAt: new Date() } : {}),
      },
    });
  }

  console.log("Seed terminé.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
