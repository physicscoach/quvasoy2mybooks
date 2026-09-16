# Serverga chiqarish (M22)

To'liq reja: `../../Elektron-Kutubxona-Loyiha-Rejasi.md` (D ilovasi).

## Tayyor fayllar
- `docker-compose.yml` — caddy, web, worker, next, db (Postgres, Redis yo'q)
- `Caddyfile` — TLS + X-Accel-Redirect himoyalangan fayl yetkazish
- `.env.example` — barcha kerakli o'zgaruvchilar
- `scripts/deploy.sh` — backup → pull → migrate → collectstatic → up → health
- `scripts/backup_db.sh` — pg_dump + tashqi saqlash + Telegram xabar
- `../.github/workflows/` — ci.yml (test/lint) + deploy.yml (GHCR → SSH)

## Server tayyorlash (bir marta, ~5-6 soat)
1. VPS buyurtma (Contabo 8GB ~$6.6/oy — **renewal narxni checkout'da tekshiring**)
2. DNS A-record domenni VPS IP'ga
3. SSH: `apt update && apt upgrade`, sudo user, SSH kalit, `PermitRootLogin no`
4. `ufw` (22/80/443), `fail2ban`, `unattended-upgrades`
5. Docker Engine + Compose plugin, `systemctl enable docker`
6. Repo `/opt/kutubxona` ga klonlash
7. `cp infra/.env.example infra/.env` → to'ldiring:
   - `SECRET_KEY`, `JWT_SIGNING_KEY` (`python -c "import secrets;print(secrets.token_urlsafe(50))"`)
   - `POSTGRES_PASSWORD` (kuchli), `SITE_ADDRESS` (domen), `ADMIN_PATH` (maxfiy)
   - **`SSL_REDIRECT` qatorini OLIB TASHLANG** (prod'da SSL kerak; faqat local test uchun 0)
8. GitHub Secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`
9. Birinchi ishga tushirish: `cd infra && docker compose up -d --build`
10. `docker compose exec web python manage.py migrate && createsuperuser`
11. `docker compose exec web python manage.py setup_schedules` (fon vazifalari)
12. Caddy avto-SSL `https://domen` tekshirish
13. Backup: `bash scripts/backup_db.sh` + cron (`0 22 * * *`)
14. **Backup'dan tiklashni sinash** (vaqtinchalik konteynerda)
15. Sentry + UptimeRobot + Healthchecks.io ulash
16. Reboot → `docker compose ps` (hamma konteyner ko'tarildi)

## Keyingi deploy (avtomatik)
`git push origin main` → CI test → GHCR build → SSH → `deploy.sh`

## Xavfsizlik eslatmalari (M21 auditidan)
- Prod'da `SECRET_KEY`/`POSTGRES_PASSWORD` majburiy (fail-fast o'rnatilgan)
- `/api/docs` faqat DEBUG'da (prod'da yopiq)
- Caddy `X-Forwarded-For`ni to'g'ri o'rnatishi kerak (NUM_PROXIES — reja D ilovasi)
- Postgres porti tashqariga ochilmagan (faqat docker tarmoq)
