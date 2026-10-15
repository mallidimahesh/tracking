#!/usr/bin/env bash
# ==============================================================================
# VIT Shuttle — Database Restore Script
# ==============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <path_to_backup_file.sqlite.gz>"
    echo "Example: $0 ~/backups/vit-shuttle/vit_shuttle_backup_20261015_120000.sqlite.gz"
    exit 1
fi

BACKUP_ARCHIVE="$1"
TARGET_DB="/opt/vit-shuttle/data/vit_shuttle.db"

if [ ! -f "${BACKUP_ARCHIVE}" ]; then
    echo "[!] Error: Backup file ${BACKUP_ARCHIVE} not found."
    exit 1
fi

echo "[*] Stopping backend services to prevent write locks..."
cd /opt/vit-shuttle/aws && docker compose -f docker-compose.prod.yml stop backend || true

echo "[*] Creating safety snapshot of current database..."
if [ -f "${TARGET_DB}" ]; then
    cp "${TARGET_DB}" "${TARGET_DB}.pre-restore-$(date +%s)"
fi

echo "[*] Extracting and restoring database..."
gunzip -c "${BACKUP_ARCHIVE}" > "${TARGET_DB}"
sudo chown -R 1000:1000 "${TARGET_DB}"

echo "[*] Restarting backend services..."
cd /opt/vit-shuttle/aws && docker compose -f docker-compose.prod.yml start backend

echo "[✓] Database restoration completed successfully."
