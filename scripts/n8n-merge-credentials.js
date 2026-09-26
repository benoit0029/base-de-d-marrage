// Prépare les workflows à importer dans n8n SANS perdre ce qui est déjà
// réglé sur le serveur (utilisé par scripts/n8n-import.sh, exécuté DANS le
// conteneur n8n avec son propre Node.js) :
//   - un workflow déjà présent (même id, ou même nom) est mis à jour à sa
//     place, jamais dupliqué ;
//   - chaque nœud reprend les identifiants (credentials) qu'il avait déjà
//     (même nom de nœud) ;
//   - un nouveau nœud d'envoi de mail / Stripe reprend l'identifiant du même
//     type déjà utilisé ailleurs dans n8n (SMTP, Stripe…).
// Usage : node n8n-merge-credentials.js <existants.json> <dossier-nouveaux> <dossier-sortie>

const fs = require("fs");
const path = require("path");

const [existingFile, inputDir, outputDir] = process.argv.slice(2);
let existing = [];
try {
  existing = JSON.parse(fs.readFileSync(existingFile, "utf8"));
  if (!Array.isArray(existing)) existing = [existing];
} catch {
  existing = []; // n8n encore vide
}

// Type d'identifiant attendu par un nœud qui n'en a pas dans le fichier.
function neededCredentialType(node) {
  if (node.type === "n8n-nodes-base.emailSend") return "smtp";
  const p = node.parameters || {};
  if (node.type === "n8n-nodes-base.httpRequest" && p.authentication === "predefinedCredentialType") {
    return p.nodeCredentialType;
  }
  return null; // IMAP par activité, etc. : jamais deviné
}

// Identifiant le plus utilisé de chaque type dans le n8n actuel.
const usage = {};
for (const wf of existing) {
  for (const node of wf.nodes || []) {
    for (const [type, cred] of Object.entries(node.credentials || {})) {
      const key = `${type}|${cred.id}`;
      usage[key] = usage[key] || { type, cred, count: 0 };
      usage[key].count++;
    }
  }
}
const bestByType = {};
for (const u of Object.values(usage)) {
  if (!bestByType[u.type] || u.count > bestByType[u.type].count) bestByType[u.type] = u;
}

fs.mkdirSync(outputDir, { recursive: true });
const report = [];
const ids = [];

for (const file of fs.readdirSync(inputDir).filter((f) => f.endsWith(".json")).sort()) {
  const wf = JSON.parse(fs.readFileSync(path.join(inputDir, file), "utf8"));
  const old = existing.find((e) => e.id === wf.id) || existing.find((e) => e.name === wf.name);
  if (old) wf.id = old.id;
  const lines = [`${old ? "Mis à jour" : "Nouveau"} : ${wf.name}`];

  for (const node of wf.nodes || []) {
    if (node.credentials && Object.keys(node.credentials).length) continue;
    const oldNode = old && (old.nodes || []).find((n) => n.name === node.name && n.type === node.type);
    if (oldNode && oldNode.credentials && Object.keys(oldNode.credentials).length) {
      node.credentials = oldNode.credentials;
      continue;
    }
    const type = neededCredentialType(node);
    if (!type) continue;
    if (bestByType[type]) {
      node.credentials = { [type]: bestByType[type].cred };
      lines.push(`   « ${node.name} » : identifiant ${type} « ${bestByType[type].cred.name} » repris`);
    } else {
      lines.push(`   ⚠️ « ${node.name} » : aucun identifiant ${type} trouvé dans n8n — à choisir à la main`);
    }
  }

  wf.active = false; // activé ensuite par le script, après l'import
  fs.writeFileSync(path.join(outputDir, file), JSON.stringify(wf, null, 2));
  ids.push(wf.id);
  report.push(lines.join("\n"));
}

fs.writeFileSync(path.join(outputDir, "..", "ids.txt"), ids.join("\n") + "\n");
console.log(report.join("\n"));
