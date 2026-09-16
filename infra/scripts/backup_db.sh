#!/usr/bin/env bash
# PostgreSQL kunlik backup + R2/B2'ga yuklash + muvaffaqiyatsizlikda Telegram
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; [ -f .env ] && source .env; set +a

DATE=$(date +%F_%H%M)
BACKUP_DIR=./backups
FILE="$BACKUP_DIR/db_$DATE.sql.gz"
mkdir -p "$BACKUP_DIR"

notify() {
  [ -n "${TELEGRAM_BOT_TOKEN:-}" ] || return 0
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="${TELEGRAM_CHAT_ID:-}" -d text="$1" >/dev/null || true
}

if docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$FILE"; then
  SIZE=$(stat -c%s "$FILE" 2>/dev/null || stat -f%z "$FILE")
  if [ "$SIZE" -lt 10240 ]; then
    notify "❌ Backup MUVAFFAQIYATSIZ: fayl juda kichik ($SIZE bayt)."
    exit 1
  fi
else
  notify "❌ Backup MUVAFFAQIYATSIZ: pg_dump xatolik."
  exit 1
fi

# Tashqi saqlashga (rclone sozlangan bo'lsa)
if command -v rclone >/dev/null && rclone copy "$FILE" r2:library-backups/db/ 2>/dev/null; then
  :
else
  notify "⚠️ Backup lokalda bor, lekin tashqi saqlashga yuklanmadi: $FILE"
fi

find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +14 -delete 2>/dev/null || true
notify "✅ Backup OK: $((SIZE/1024)) KB"
echo "Backup: $FILE ($((SIZE/1024)) KB)"
