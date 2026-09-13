#!/usr/bin/env bash
# Sauvegarde chiffrée de la base de données + des documents/logos, envoyée
# vers un stockage S3-compatible distinct du VPS applicatif (voir §5 de
# docs/DEPLOYMENT.md pour la configuration et le test de restauration).
#
# Utilisation : ./scripts/backup.sh
# Variables requises (voir .env.example, section « Sauvegardes ») :
#   POSTGRES_USER, POSTGRES_DB, BACKUP_ENCRYPTION_PASSPHRASE,
#   BACKUP_S3_ENDPOINT, BACKUP_S3_BUCKET, BACKUP_S3_ACCESS_KEY, BACKUP_S3_SECRET_KEY
#
# Prérequis sur le VPS : docker compose (pour pg_dump via le conteneur db),
# openssl (chiffrement), aws-cli (upload S3-compatible : `apt install awscli`
# ou `pip install awscli` suffit, aucun compte AWS nécessaire).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

: "${POSTGRES_USER:?définir POSTGRES_USER}"
: "${POSTGRES_DB:?définir POSTGRES_DB}"
: "${BACKUP_ENCRYPTION_PASSPHRASE:?définir BACKUP_ENCRYPTION_PASSPHRASE}"
: "${BACKUP_S3_ENDPOINT:?définir BACKUP_S3_ENDPOINT}"
: "${BACKUP_S3_BUCKET:?définir BACKUP_S3_BUCKET}"
: "${BACKUP_S3_ACCESS_KEY:?définir BACKUP_S3_ACCESS_KEY}"
: "${BACKUP_S3_SECRET_KEY:?définir BACKUP_S3_SECRET_KEY}"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "[backup] Export de la base de données…"
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$TMP_DIR/db-$TIMESTAMP.sql"

echo "[backup] Archive des documents et logos…"
tar -czf "$TMP_DIR/files-$TIMESTAMP.tar.gz" \
  -C "$ROOT_DIR/apps/web" .data/documents public/uploads 2>/dev/null || true

echo "[backup] Chiffrement (AES-256-CBC)…"
for f in "$TMP_DIR"/db-"$TIMESTAMP".sql "$TMP_DIR"/files-"$TIMESTAMP".tar.gz; do
  [ -f "$f" ] || continue
  openssl enc -aes-256-cbc -pbkdf2 -salt \
    -pass "pass:$BACKUP_ENCRYPTION_PASSPHRASE" \
    -in "$f" -out "$f.enc"
done

echo "[backup] Envoi vers le stockage S3-compatible…"
export AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_KEY"
for f in "$TMP_DIR"/*.enc; do
  [ -f "$f" ] || continue
  aws --endpoint-url "$BACKUP_S3_ENDPOINT" s3 cp "$f" "s3://$BACKUP_S3_BUCKET/$(basename "$f")"
done

echo "[backup] Terminé : db-$TIMESTAMP.sql.enc, files-$TIMESTAMP.tar.gz.enc"
