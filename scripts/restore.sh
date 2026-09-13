#!/usr/bin/env bash
# Restauration à partir d'une sauvegarde chiffrée. À TESTER régulièrement sur
# une base de test, pas seulement lue une fois en phase 6 — voir §5 de
# docs/DEPLOYMENT.md (« test de restauration documenté »).
#
# Utilisation : ./scripts/restore.sh <chemin-vers-db-XXXX.sql.enc> [chemin-vers-files-XXXX.tar.gz.enc]
# Variables requises : POSTGRES_USER, POSTGRES_DB, BACKUP_ENCRYPTION_PASSPHRASE

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DB_BACKUP="${1:?Usage: restore.sh <db-backup.sql.enc> [files-backup.tar.gz.enc]}"
FILES_BACKUP="${2:-}"

: "${POSTGRES_USER:?définir POSTGRES_USER}"
: "${POSTGRES_DB:?définir POSTGRES_DB}"
: "${BACKUP_ENCRYPTION_PASSPHRASE:?définir BACKUP_ENCRYPTION_PASSPHRASE}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "[restore] ATTENTION : ceci écrase la base '$POSTGRES_DB' actuelle."
read -r -p "Continuer ? (oui/non) " CONFIRM
[ "$CONFIRM" = "oui" ] || { echo "Annulé."; exit 1; }

echo "[restore] Déchiffrement de la base…"
openssl enc -d -aes-256-cbc -pbkdf2 \
  -pass "pass:$BACKUP_ENCRYPTION_PASSPHRASE" \
  -in "$DB_BACKUP" -out "$TMP_DIR/db.sql"

echo "[restore] Réimport dans PostgreSQL…"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 < "$TMP_DIR/db.sql"

if [ -n "$FILES_BACKUP" ]; then
  echo "[restore] Déchiffrement et restauration des documents/logos…"
  openssl enc -d -aes-256-cbc -pbkdf2 \
    -pass "pass:$BACKUP_ENCRYPTION_PASSPHRASE" \
    -in "$FILES_BACKUP" -out "$TMP_DIR/files.tar.gz"
  tar -xzf "$TMP_DIR/files.tar.gz" -C "$ROOT_DIR/apps/web"
fi

echo "[restore] Terminé. Vérifier l'application (docker compose restart app)."
