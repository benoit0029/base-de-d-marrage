#!/bin/sh
# Importe (ou met à jour) les workflows n8n en UNE commande, depuis le
# dossier de l'appli sur le serveur :
#
#   ./scripts/n8n-import.sh                 → les workflows Kerbooth modifiés le 25-26/09/2026
#   ./scripts/n8n-import.sh fichier.json …  → seulement ces fichiers
#
# Ce que fait le script, sans rien toucher d'autre dans n8n :
#   1. trouve le conteneur n8n ;
#   2. sauvegarde tous les workflows actuels (n8n/sauvegardes/) ;
#   3. met à jour les workflows à leur place, en gardant les identifiants
#      déjà choisis (SMTP, Stripe…) — voir scripts/n8n-merge-credentials.js ;
#   4. les active, puis redémarre n8n (quelques secondes) pour que les
#      webhooks soient pris en compte.
set -eu

cd "$(dirname "$0")/.."

DEFAULT_WORKFLOWS="kerbooth-yousign-contract-signed.json kerbooth-stripe-payment-received.json kerbooth-quote-send.json kerbooth-quote-daily.json kerbooth-contact.json"
FILES="${*:-$DEFAULT_WORKFLOWS}"

# 1. Conteneur n8n (ou N8N_CONTAINER=nom ./scripts/n8n-import.sh)
C="${N8N_CONTAINER:-$(docker ps --format '{{.Names}} {{.Image}}' | awk '$2 ~ /n8n/ {print $1; exit}')}"
if [ -z "$C" ]; then
  echo "❌ Conteneur n8n introuvable (docker ps). Indique son nom : N8N_CONTAINER=nom ./scripts/n8n-import.sh"
  exit 1
fi
echo "→ Conteneur n8n : $C"

# Variables dont les workflows ont besoin (réglées une fois pour toutes dans n8n)
MISSING=""
for v in APP_URL INGEST_API_TOKEN SMTP_FROM NOTIFICATIONS_TO_EMAIL YOUSIGN_API_KEY; do
  docker exec "$C" printenv "$v" >/dev/null 2>&1 || MISSING="$MISSING $v"
done
[ -n "$MISSING" ] && echo "⚠️  Variables absentes dans n8n :$MISSING (les workflows qui s'en servent échoueront)"
if [ "$(docker exec "$C" printenv N8N_BLOCK_ENV_ACCESS_IN_NODE 2>/dev/null || true)" = "true" ]; then
  echo "⚠️  N8N_BLOCK_ENV_ACCESS_IN_NODE=true : les workflows ne peuvent pas lire APP_URL etc. Mets-la à false."
fi

T=/tmp/kalonia-n8n-import
docker exec "$C" sh -c "rm -rf $T && mkdir -p $T/in $T/out"
for f in $FILES; do
  src="n8n/workflows/$(basename "$f")"
  [ -f "$src" ] || { echo "❌ Fichier introuvable : $src"; exit 1; }
  docker cp "$src" "$C:$T/in/" >/dev/null
done
docker cp scripts/n8n-merge-credentials.js "$C:$T/merge.js" >/dev/null

# 2. Sauvegarde de l'existant (aussi utilisée pour reprendre les identifiants)
docker exec "$C" sh -c "n8n export:workflow --all --output=$T/existants.json >/dev/null 2>&1 || echo '[]' > $T/existants.json"
mkdir -p n8n/sauvegardes
BACKUP="n8n/sauvegardes/workflows-$(date +%Y%m%d-%H%M%S).json"
docker cp "$C:$T/existants.json" "$BACKUP" >/dev/null
echo "→ Sauvegarde de tous les workflows actuels : $BACKUP"

# 3. Reprise des identifiants puis import
docker exec "$C" node "$T/merge.js" "$T/existants.json" "$T/in" "$T/out"
# n8n refuse de remplacer un workflow actif : on le désactive juste avant
# (réactivé à l'étape 4). Sans effet pour un workflow encore inexistant.
for id in $(docker exec "$C" cat "$T/ids.txt"); do
  docker exec "$C" n8n unpublish:workflow --id="$id" >/dev/null 2>&1 \
    || docker exec "$C" n8n update:workflow --id="$id" --active=false >/dev/null 2>&1 \
    || true
done
if ! docker exec "$C" sh -c "n8n import:workflow --separate --input=$T/out > $T/import.log 2>&1"; then
  echo "❌ Import refusé par n8n (rien n'a été modifié) :"
  docker exec "$C" tail -20 "$T/import.log"
  exit 1
fi
echo "→ Import terminé"

# 4. Activation (commande différente selon la version de n8n) puis redémarrage
FAILED=""
for id in $(docker exec "$C" cat "$T/ids.txt"); do
  docker exec "$C" n8n publish:workflow --id="$id" >/dev/null 2>&1 \
    || docker exec "$C" n8n update:workflow --id="$id" --active=true >/dev/null 2>&1 \
    || FAILED="$FAILED $id"
done
docker exec "$C" rm -rf "$T"
echo "→ Redémarrage de n8n…"
docker restart "$C" >/dev/null
if [ -n "$FAILED" ]; then
  echo "⚠️  Activation automatique impossible pour :$FAILED — active-les d'un clic dans n8n (interrupteur en haut à droite)."
else
  echo "✅ Workflows importés et activés."
fi
