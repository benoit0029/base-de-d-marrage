// Migration ponctuelle des documents déjà stockés en local (local://...) vers
// Scaleway Object Storage (s3://...), une fois pour toutes après avoir
// renseigné STORAGE_S3_* dans .env. À exécuter AVANT de passer
// STORAGE_DRIVER=local à STORAGE_DRIVER=s3 dans .env — sinon l'app tenterait
// déjà de lire ces fichiers depuis S3 alors qu'ils n'y sont pas encore.
//
// En JavaScript brut (pas TypeScript) : ce script tourne dans l'image Docker
// de production, qui n'embarque pas tsx (devDependency absente du build
// standalone Next.js) — voir docs/DEPLOYMENT.md §9.
//
// Utilisation (depuis le conteneur app) : npm run storage:migrate-to-s3
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const prisma = new PrismaClient();
const LOCAL_DIR = process.env.STORAGE_LOCAL_DIR ?? ".data/documents";
const bucket = process.env.STORAGE_S3_BUCKET;

const s3 = new S3Client({
  region: process.env.STORAGE_S3_REGION ?? "fr-par",
  endpoint: process.env.STORAGE_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.STORAGE_S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.STORAGE_S3_SECRET_KEY ?? "",
  },
});

async function migrateFile(localUrl) {
  const filename = localUrl.slice("local://".length);
  const buffer = await readFile(path.join(process.cwd(), LOCAL_DIR, filename));
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: filename, Body: buffer }));
  return `s3://${filename}`;
}

async function main() {
  if (!bucket) {
    throw new Error("STORAGE_S3_BUCKET manquant : renseignez STORAGE_S3_* dans .env avant de lancer cette migration.");
  }

  let migrated = 0;

  for (const doc of await prisma.document.findMany({ where: { fileUrl: { startsWith: "local://" } } })) {
    await prisma.document.update({ where: { id: doc.id }, data: { fileUrl: await migrateFile(doc.fileUrl) } });
    console.log(`[migrate] Document ${doc.id}`);
    migrated++;
  }

  for (const entry of await prisma.cashJournalEntry.findMany({
    where: { depositSlipUrl: { startsWith: "local://" } },
  })) {
    await prisma.cashJournalEntry.update({
      where: { id: entry.id },
      data: { depositSlipUrl: await migrateFile(entry.depositSlipUrl) },
    });
    console.log(`[migrate] CashJournalEntry.depositSlipUrl ${entry.id}`);
    migrated++;
  }

  for (const entry of await prisma.cashJournalEntry.findMany({
    where: { cardStatementUrl: { startsWith: "local://" } },
  })) {
    await prisma.cashJournalEntry.update({
      where: { id: entry.id },
      data: { cardStatementUrl: await migrateFile(entry.cardStatementUrl) },
    });
    console.log(`[migrate] CashJournalEntry.cardStatementUrl ${entry.id}`);
    migrated++;
  }

  for (const item of await prisma.simpleImport.findMany({ where: { fileUrl: { startsWith: "local://" } } })) {
    await prisma.simpleImport.update({ where: { id: item.id }, data: { fileUrl: await migrateFile(item.fileUrl) } });
    console.log(`[migrate] SimpleImport ${item.id}`);
    migrated++;
  }

  for (const tx of await prisma.bankTransaction.findMany({
    where: { sourceFileUrl: { startsWith: "local://" } },
  })) {
    await prisma.bankTransaction.update({
      where: { id: tx.id },
      data: { sourceFileUrl: await migrateFile(tx.sourceFileUrl) },
    });
    console.log(`[migrate] BankTransaction ${tx.id}`);
    migrated++;
  }

  for (const item of await prisma.tvaInstallment.findMany({
    where: { justificatifUrl: { startsWith: "local://" } },
  })) {
    await prisma.tvaInstallment.update({
      where: { id: item.id },
      data: { justificatifUrl: await migrateFile(item.justificatifUrl) },
    });
    console.log(`[migrate] TvaInstallment ${item.id}`);
    migrated++;
  }

  for (const closure of await prisma.fiscalYearClosure.findMany({
    where: { zipFileUrl: { startsWith: "local://" } },
  })) {
    await prisma.fiscalYearClosure.update({
      where: { id: closure.id },
      data: { zipFileUrl: await migrateFile(closure.zipFileUrl) },
    });
    console.log(`[migrate] FiscalYearClosure ${closure.id}`);
    migrated++;
  }

  console.log(`[migrate] Terminé : ${migrated} fichier(s) migré(s) vers s3://${bucket}.`);
  console.log("[migrate] Vous pouvez maintenant passer STORAGE_DRIVER=s3 dans .env et redéployer.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
