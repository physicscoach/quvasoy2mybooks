#!/usr/bin/env bash
# Serverda deploy: backup -> pull -> migrate -> collectstatic -> up -> health
set -euo pipefail
cd "$(dirname "$0")/.."

echo ">>> DB backup (migratsiyadan oldin)..."
bash scripts/backup_db.sh || echo "OGOHLANTIRISH: backup o'tmadi, davom etilmoqda"

echo ">>> Yangi image'lar tortilmoqda..."
docker compose pull web worker next

echo ">>> Migratsiyalar..."
docker compose run --rm web python manage.py migrate --noinput

echo ">>> collectstatic..."
docker compose run --rm web python manage.py collectstatic --noinput

echo ">>> Servislar yangilanmoqda (5-15s uzilish mumkin)..."
docker compose up -d --remove-orphans

echo ">>> Fon vazifalari jadvali (bir marta)..."
docker compose exec -T web python manage.py setup_schedules || true

echo ">>> Eski image'lar tozalanmoqda..."
docker image prune -f

sleep 5
if curl -fsS http://localhost:8000/api/v1/health >/dev/null 2>&1 || \
   docker compose exec -T web python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/api/v1/health')"; then
  echo ">>> Deploy MUVAFFAQIYATLI."
else
  echo "XATO: web javob bermayapti!"; exit 1
fi
