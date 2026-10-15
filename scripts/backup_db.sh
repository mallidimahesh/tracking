#!/usr/bin/env bash
# ==============================================================================
# VIT Shuttle — Automated Database Backup Script (SQLite / EBS)
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${HOME}/backups/vit-shuttle"
DATA_SOURCE="/opt/vit-shuttle/data/vit_shuttle.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/vit_shuttle_backup_${TIMESTAMP}.sqlite"

mkdir -p "${BACKUP_DIR}"

if [ ! -f "${DATA_SOURCE}" ]; then
    echo "[!] Error: Source database ${DATA_SOURCE} does not exist."
    exit 1
fi

echo "[*] Creating atomic SQLite backup..."
# Uses sqlite3 .backup command for safe online backup without corrupting active transactions
sqlite3 "${DATA_SOURCE}" ".backup '${BACKUP_FILE}'"

# Compress backup
gzip -9 "${BACKUP_FILE}"
echo "[✓] Backup created successfully: ${BACKUP_FILE}.gz"

# Keep only last 14 days of backups
find "${BACKUP_DIR}" -name "vit_shuttle_backup_*.sqlite.gz" -mtime +14 -delete
echo "[✓] Old backups pruned (retention: 14 days)."
