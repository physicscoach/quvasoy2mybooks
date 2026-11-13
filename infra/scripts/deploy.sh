#!/usr/bin/env bash
# Serverda deploy: backup -> git pull -> build -> migrate -> collectstatic -> up -> health
# (image'lar serverning o'zida yig'iladi; repo read-only deploy key bilan tortiladi)
set -euo pipefail
cd "$(dirname "$0")/.."

echo ">>> DB backup (migratsiyadan oldin)..."
bash scripts/backup_db.sh || echo "OGOHLANTIRISH: backup o'tmadi, davom etilmoqda"

echo ">>> Yangi kod tortilmoqda..."
git -C .. pull --ff-only

echo ">>> Image'lar yig'ilmoqda (eski versiya shu payt ishlab turadi)..."
docker compose build web worker next

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

# gunicorn ko'tarilishini 60 soniyagacha kutamiz
for i in $(seq 1 12); do
  sleep 5
  if docker compose exec -T web python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/api/v1/health')" >/dev/null 2>&1; then
    echo ">>> Deploy MUVAFFAQIYATLI ($(git -C .. log -1 --format='%h %s'))."
    exit 0
  fi
done
echo "XATO: web javob bermayapti!"; docker compose logs web --tail 40; exit 1
