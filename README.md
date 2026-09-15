# Elektron kutubxona + gamifikatsiya

Elektron kitoblar (PDF/EPUB) kutubxonasi: brauzerda o'qish, o'qish telemetriyasiga
asoslangan gamifikatsiya, kutubxonachi uchun qulay admin panel.

To'liq reja: `../Elektron-Kutubxona-Loyiha-Rejasi.md`

## Tuzilma

```
backend/    Django 5 + DRF + PostgreSQL (django-unfold admin, django-q2 fon vazifalari)
frontend/   Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
infra/      docker-compose.yml, Caddyfile, .env.example
docs/       spike-caddy-range/ — fayl yetkazish arxitekturasi sinovi
```

## Dev rejimida ishga tushirish

**Backend** (sqlite bilan, Postgres shart emas):

```bash
cd backend
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements/dev.txt
.venv/Scripts/python.exe manage.py migrate
.venv/Scripts/python.exe manage.py createsuperuser
.venv/Scripts/python.exe manage.py runserver
```

Admin: http://localhost:8000/admin/ · API hujjati: http://localhost:8000/api/docs/

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

http://localhost:3000 — `/api` so'rovlari `next.config.ts` dagi `rewrites` orqali
`localhost:8000` ga proksi qilinadi, shuning uchun dev'da ham **bitta origin** bo'ladi
va CORS kerak emas.

**Fon vazifalari** (fayl qayta ishlash, telemetriya validatsiyasi):

```bash
cd backend && .venv/Scripts/python.exe manage.py qcluster
```

## Production

```bash
cd infra
cp .env.example .env   # to'ldiring: SECRET_KEY, parollar, domen
docker compose up -d --build
docker compose exec web python manage.py migrate
docker compose exec web python manage.py createsuperuser
```

## Muhim arxitektura qarorlari

- **Fayl yetkazish:** Django faqat ruxsat beradi, baytlarni Caddy uzatadi
  (`X-Accel-Redirect`). Django orqali stream qilinsa, bir necha parallel yuklash
  butun API'ni bloklaydi.
- **Auth:** JWT httpOnly cookie'da, Next va Django bitta origin ostida.
  Har autentifikatsiyalangan `fetch` da `cache: 'no-store'` — bu xavfsizlik talabi.
- **Ball hech qachon heartbeat so'rovida hisoblanmaydi.** Xom telemetriya saqlanadi,
  validatsiya va ball fon vazifasida — shuning uchun qoida o'zgarsa ball qayta
  hisoblanadi.
- **Ledger append-only:** `PointTransaction` dan qator o'chirilmaydi; bekor qilish =
  manfiy qator.
