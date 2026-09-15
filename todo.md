# Elektron kutubxona — ish rejasi (checklist)

To'liq texnik reja: `../Elektron-Kutubxona-Loyiha-Rejasi.md`

**Qanday ishlaymiz:** modullar ketma-ket bajariladi — pastdagi tartib bog'liqlik
tartibi, uni buzmaslik kerak. Har modul o'z **Tekshiruv** shartidan o'tmaguncha
keyingisiga o'tilmaydi.

**Har modul oxirida majburiy rituallar:**
1. `python manage.py check` va `migrate` xatosiz (backend moduli bo'lsa)
2. `npm run build` xatosiz (frontend moduli bo'lsa)
3. `git add -A && git commit` — modul nomi bilan
4. Shu faylda modul `[x]` deb belgilanadi

**Jami:** 24 modul · ~340 soat · 4 bosqich

| Bosqich | Modullar | Soat | Natija |
|---|---|---|---|
| 0. Poydevor | M0–M2 | ~40 | Ishlaydigan skelet + auth |
| 1. O'qiladigan kutubxona | M3–M10 | ~115 | Kitob qo'shiladi va o'qiladi |
| 2. Gamifikatsiya | M11–M14 | ~70 | Ball, daraja, nishon, reyting |
| 3. v1 kengaytmalar | M15–M20 | ~80 | EPUB, sharh, challenge, mukofot |
| 4. Production | M21–M24 | ~55 | Serverda, pilot, PWA |

---

## 0-BOSQICH — POYDEVOR

### M0 — Loyiha skeleti · ~14 soat · tugallandi
Bog'liq: yo'q

- [x] Papka tuzilmasi (`backend/`, `frontend/`, `infra/`, `docs/`)
- [x] Django `config/` — settings ajratmasi (base/dev/prod), urls, wsgi, manage.py
- [x] 8 ta bo'sh app: core, accounts, catalog, ingestion, delivery, reading, gamification, integrity
- [x] `requirements/base.txt` + `dev.txt`
- [x] DRF sozlamasi — **default permission YOPIQ** (`IsAuthenticated`)
- [x] JWT httpOnly cookie konstantalari, `READING` anti-cheat chegaralari
- [x] `infra/docker-compose.yml` — caddy, web, worker, next, db (Redis yo'q)
- [x] `infra/Caddyfile` — X-Accel-Redirect bilan himoyalangan yetkazish
- [x] `backend/Dockerfile`, `.env.example`, `.gitignore`, `README.md`
- [x] `git init`

**Tekshiruv:** papka tuzilmasi joyida, `git status` ishlaydi.

---

### M0.5 — Caddy Range spike (KRITIK) · ~4 soat
Bog'liq: M0 · Agent: yo'q (qo'lda)

> Butun reader va fayl yetkazish arxitekturasi shu bitta farazga tayanadi.
> Ishlamasa — M5 va M8 boshqacha quriladi. Kodga kirishdan oldin javob kerak.

- [x] Sinov muhiti tayyor (`docs/spike-caddy-range/`)
- [ ] Docker Desktop yoqilgan
- [ ] `bash docs/spike-caddy-range/run.sh` ishga tushirildi
- [ ] Natija: `206 Partial Content` + `Content-Range` + baytlar mos
- [ ] Agar MUVAFFAQIYATSIZ bo'lsa: zaxira variant tanlandi (Django `FileResponse`)
      va M5 rejasi shunga moslashtirildi

**Tekshiruv:** "MUVAFFAQIYAT" xabari yoki zaxira variant bo'yicha yozma qaror.

---

### M1 — Baza yadrosi: core + accounts · ~12 soat · boshlang'ich kod tayyor (tekshirildi)
Bog'liq: M0 · Agent: `django-drf-backend`

- [x] `core.models`: `TimeStampedModel` (abstract, `public_id` UUID + created/updated)
- [x] `core.models.SystemSetting` — anti-cheat chegaralarini deploysiz o'zgartirish uchun
- [x] `core.pagination.StandardPagination`
- [x] `core.views.health` — DB tekshiruvi bilan
- [x] `core.events.emit()` — fasad; domen app'lari gamifikatsiyani **import qilmaydi**
- [x] `accounts.User` — `AbstractUser`dan, `role` (admin/librarian/reader),
      `public_id`, `token_version`
- [x] `accounts.ReaderStats` — 1:1, `points_balance`, `points_lifetime`, `level`,
      `current_streak`, `longest_streak`, `CHECK >= 0`
- [x] **Birinchi migratsiya custom User bilan** (keyin almashtirish deyarli imkonsiz)
- [x] `unfold` admin ishlayapti, `createsuperuser` o'tadi

**Tekshiruv:** `migrate` toza o'tadi · `/admin/` unfold dizaynida ochiladi ·
`/api/v1/health/` 200 qaytaradi.

---

### M2 — Autentifikatsiya (JWT httpOnly cookie) · ~16 soat
Bog'liq: M1 · Agent: `django-drf-backend`

- [x] `accounts.authentication.CookieJWTAuthentication` — `at` cookie'dan o'qiydi,
      `token_version` ni solishtiradi
- [x] `POST /auth/register/` — email tasdiqlash (yoki v1'ga qoldirish qarori)
- [x] `POST /auth/login/` — access (15 daq) + refresh (14 kun) cookie o'rnatadi
- [x] `POST /auth/refresh/` — **rotatsiya bilan**, eski jti qayta ishlatilsa oila bekor
- [x] `POST /auth/logout/` — blacklist + cookie o'chirish
- [x] `GET /auth/me/`
- [x] `accounts.permissions`: `IsLibrarian`, `IsAdmin`, `IsOwner`
- [x] Throttle: login 5/min, register 3/soat
- [x] Testlar: login→me→refresh→logout zanjiri, noto'g'ri parol, muddati o'tgan token

**Tekshiruv:** `curl` bilan to'liq zanjir ishlaydi · cookie'lar `HttpOnly` ·
`token_version` oshirilsa eski token darhol rad etiladi.

---

## 1-BOSQICH — O'QILADIGAN KUTUBXONA

### M3 — Katalog modellari va API · ~18 soat
Bog'liq: M1 · Agent: `django-drf-backend`

- [x] `Author`, `Category` modellari
- [x] `Book` — status (draft/processing/ready/published/hidden), `is_downloadable`,
      `protection_level`, **`rights_status`** (mualliflik huquqi maqomi — 1-xavf),
      `page_count`, `cover`, `slug`, `language`
- [x] `BookAuthor`, `BookCategory` (N:M through)
- [x] `BookFile` — format (pdf/epub), **`sha256` UNIQUE** (dublikat), `size_bytes`,
      `page_count`, `is_downloadable`
- [x] Public API (`AllowAny`, faqat `published`): kitob ro'yxati, detali, janr, muallif
- [x] Qidiruv (`pg_trgm`/`icontains`) + janr/til filtri + saralash
- [x] Status o'tish validatsiyasi: `PUBLISHED` ga faqat `READY` dan, muqova va
      `page_count` bo'lsa
- [x] Indekslar (B ilovasi 4.3-bo'limi)

**Tekshiruv:** admin'da qo'lda kitob yaratiladi · `/api/v1/books/` anonim ochiladi ·
`draft` kitob public ro'yxatda **ko'rinmaydi**.

---

### M4 — Kutubxonachi ish joyi: unfold admin + fayl quvuri · ~20 soat
Bog'liq: M3 · Agent: `django-drf-backend`

> Bu kutubxonachining ASOSIY ish joyi — qulayligi mahsulot sifati bilan teng.

- [x] `Book` unfold admin: fayl inline, status filtri, `publish`/`unpublish` action
- [x] Avtomatik to'ldiriladigan maydonlar `readonly` (page_count, sha256, size)
- [x] `ingestion.tasks.process_book_file()` — django-q2 vazifasi
- [x] Validatsiya: magic bytes, hajm ≤200MB, parol bilan himoyalanmaganmi
- [x] `sha256` → dublikat aniqlash (bir xil fayl ikki marta yuklanmasin)
- [x] PDF: PyMuPDF bilan sahifa soni + 0-sahifadan muqova (WebP 600px + 200px thumb)
- [x] EPUB: ebooklib bilan OPF metadata (nom, muallif, til) + muqova
- [x] Xatoda `status=failed` + sabab admin'da ko'rinadi
- [x] `qcluster` ishlayotganini tekshirish

**Tekshiruv:** admin'da PDF tashlanadi → 10 soniyada sahifa soni va muqova
avtomatik paydo bo'ladi → `READY` → `Publish` bosiladi → public API'da ko'rinadi.

---

### M5 — Himoyalangan fayl yetkazish · ~14 soat
Bog'liq: M3, **M0.5** · Agent: `django-drf-backend`

- [x] `delivery.tickets` — HMAC-SHA256 stateless tiket
      (`user_id, book_id, file_id, mode, exp, jti`)
- [x] `POST /delivery/tickets/` — ruxsat + kunlik limit tekshiradi, TTL: o'qish 120s,
      yuklash 60s (bir martalik)
- [x] `GET /files/t/<token>` — tiketni tekshiradi, **`X-Accel-Redirect` qaytaradi**
      (faylni O'ZI stream qilmaydi)
- [x] `DownloadLog` — kim, qachon, qaysi fayl, IP, status (rad etish ham loglanadi)
- [x] Yagona `can_download(user, file)` funksiyasi + unga test
- [x] Kunlik limit darajaga qarab (reja 7.3)
- [x] Fayllar `BOOKS_ROOT` da, Caddy `root` ularni ko'rmaydi

**Tekshiruv:** tiketsiz `/files/...` → 403 · muddati o'tgan tiket → 403 ·
boshqa foydalanuvchi tiketi → 403 · to'g'ri tiket bilan fayl keladi va
`DownloadLog` yoziladi.

---

### M6 — Frontend poydevori · ~24 soat
Bog'liq: M2 · Agent: `react-frontend`

- [x] `create-next-app` (TS, Tailwind, App Router, src-dir)
- [x] **`next.config.ts` rewrites:** `/api/:path*` → `localhost:8000` (dev'da ham
      bitta origin → CORS yo'q)
- [x] shadcn/ui init + kerakli komponentlar
- [x] Papka tuzilmasi (C ilovasi 2-bo'limi)
- [x] `lib/api/client.ts` — **single-flight refresh** (majburiy)
- [x] `app/api/auth/{login,refresh,logout}/route.ts` — DRF proksi + cookie
- [x] `middleware.ts` — himoyalangan route'lar
- [x] Layout: navbar, footer, tungi rejim, mobil menyu
- [x] `/login`, `/register` sahifalari
- [x] Har auth'li `fetch` da `cache: 'no-store'` — **xavfsizlik talabi**

**Tekshiruv:** `npm run build` toza · login → cookie o'rnatiladi → `/profile`
ochiladi · logout → himoyalangan sahifa `/login` ga qaytaradi.

---

### M7 — Katalog UI · ~22 soat
Bog'liq: M6, M3 · Agent: `react-frontend`

- [x] `/` bosh sahifa — tavsiya etilgan kitoblar
- [x] `/books` — qidiruv, janr filtri, sahifalash (URL query bilan)
- [x] `/books/[slug]` — detali, "O'qish" va (ruxsat bo'lsa) "Yuklab olish"
- [x] `BookCard`, `BookGrid`, `SearchFilters`, `Pagination`
- [x] Skeleton / bo'sh holat / xato holatlari (oq ekran YO'Q)
- [x] `next/image` bilan muqovalar, `generateMetadata` (SEO)
- [x] Mobil (~400px) tekshiruvi

**Tekshiruv:** 20 ta sinov kitobi bilan katalog ishlaydi · qidiruv natija beradi ·
telefon kengligida buzilmaydi.

---

### M8 — PDF reader · ~24 soat
Bog'liq: M7, M5 · Agent: `react-frontend`

> Eng qiyin frontend qismi. Alohida vaqt ajrating, shoshmang.

- [ ] `react-pdf` (PDF.js) — `next/dynamic({ssr:false})` bilan, alohida chunk
- [ ] **`ReaderEngine` interfeysi** — keyin EPUB qo'shilganda toolbar va tracker
      o'zgarmasligi uchun
- [ ] Imzolangan URL: `POST /delivery/tickets/` dan olinadi, muddat tugashiga
      1 daqiqa qolganda fon rejimida yangilanadi, joriy sahifa saqlanadi
- [ ] Sahifa navigatsiyasi, zoom, toolbar (mobil'da avtomatik yashirinadi)
- [ ] Sozlamalar: shrift/zoom, tungi rejim, sahifa/scroll — Zustand + persist
- [ ] Oxirgi o'qilgan joyni saqlash va tiklash (qurilmalar orasida sinxron)
- [ ] Touch: swipe bilan sahifa almashtirish
- [ ] Yumshoq himoya: `contextmenu` bloklash, print CSS, `user-select: none`
- [ ] `ReaderErrorBoundary` — xatoda tushunarli xabar
- [ ] **iOS Safari va Android Chrome'da real qurilmada sinov**

**Tekshiruv:** 50 MB PDF ochiladi va sahifalab yuklanadi (butun fayl emas) ·
o'qishni to'xtatib qayta kirilsa o'sha sahifadan davom etadi · telefonda ishlaydi.

---

### M9 — O'qish telemetriyasi (backend) · ~20 soat
Bog'liq: M3 · Agent: `django-drf-backend`
*Boshlang'ich kod yozilgan — tekshirish va to'ldirish kerak*

- [x] `ReadingSession` — partial UNIQUE: **bir foydalanuvchida bitta aktiv seans**
- [x] `ReadingHeartbeat` — `UNIQUE(session, client_seq)`
- [x] `ReadingPageCredit` — `UNIQUE(user, book, page)`
- [x] `ReadingProgress`, `DailyActivity`
- [x] Sessiya ochish — eskisini `superseded` qilib yopadi (`select_for_update`)
- [x] **Batch heartbeat endpoint** — massiv qabul qiladi, `bulk_create(ignore_conflicts)`,
      maqsad ~10ms, **ball hisoblamaydi**
- [x] `validation.py` — reja 6.3-dagi **11 ta tekshiruvning hammasi**
- [x] `flush_dirty_sessions()` (har 60s) + `close_stale_sessions()` (har 2 daq)
- [x] django-q2 `Schedule` yozuvlari yaratildi
- [x] Testlar: soxta `active_seconds`, tez varaqlash, ikki tab, replay, sakrash

**Tekshiruv:** soxta telemetriya yuborib ko'rish — ball berilmasligi kerak ·
haqiqiy o'qish sahifa krediti beradi · ikkinchi tab birinchisini yopadi.

---

### M10 — Telemetriya (frontend tracker) · ~14 soat
Bog'liq: M8, M9 · Agent: `react-frontend`

- [ ] `hooks/useReadingTracker.ts` — har 30s hisoblanadi, har 2 daqiqada
      **batch** yuboriladi
- [ ] Faollik sharti: `visibilityState==='visible'` VA `hasFocus()` VA oxirgi 60s
      da harakat
- [ ] `client_seq` qat'iy o'suvchi (server takrorni tashlaydi)
- [ ] `pagehide`/`visibilitychange` da `navigator.sendBeacon`
- [ ] Offline navbat (IndexedDB) + `online` hodisasida yuborish
- [ ] Reader bilan integratsiya, foydalanuvchiga ko'rinmaydi
- [ ] "O'qish hisobga olinmoqda" indikatori (ball ~1 daqiqa kechikadi)

**Tekshiruv:** 5 daqiqa o'qib, internetni uzib-ulab ko'rish — telemetriya
yo'qolmasligi kerak · tabni yopganda oxirgi bufer yetib borishi kerak.

> ### ✅ 1-BOSQICH TUGADI — kitob qo'shiladi va o'qiladi
> Shu yerda **ichki sinov**: 5 kishi, 20 kitob, 1 hafta. Telemetriya to'g'ri
> yig'ilayotganini tekshiring — ball hali yoqilmagan, lekin xom ma'lumot
> to'planyapti va keyin retroaktiv hisoblanadi.

---

## 2-BOSQICH — GAMIFIKATSIYA

### M11 — Ball dvigateli · ~18 soat
Bog'liq: M9 · Agent: `django-drf-backend`
*Boshlang'ich kod yozilgan — tekshirish kerak*

- [x] `Level`, `GamificationRule`, `GamificationEvent` (navbat)
- [x] **`PointTransaction`** — append-only ledger, `idempotency_key` UNIQUE,
      `balance_after`, `reverses_id`
- [x] `award_points()` servisi — `atomic()` + `select_for_update`, cap/cooldown,
      `IntegrityError` tutilsa **muvaffaqiyat** deb qaytariladi
- [x] `PointTransaction.save()` override — servis tashqarisida `RuntimeError`
- [x] `process_events()` vazifasi
- [x] `UNIQUE(user, book)` — `BOOK_COMPLETED` abadiy bir marta
- [x] Ball qoidalari va darajalar data-migratsiyada seed qilingan (7.1/7.3)
- [x] `recompute(user, from_date)` — xom telemetriyadan qayta hisoblash
- [x] Kunlik yarashtirish: `SUM(ledger) != balance` bo'lsa ogohlantirish

**Tekshiruv:** bitta kitobni ikki marta "tugatish" — ball bir marta beriladi ·
ledger yig'indisi balansga teng · qoida o'zgartirilib qayta hisoblansa to'g'ri
farq yoziladi.

---

### M12 — Nishon, streak, daraja · ~12 soat
Bog'liq: M11 · Agent: `django-drf-backend`

- [ ] `Badge`, `UserBadge` — 8 ta MVP nishoni seed qilingan
- [ ] Streak hisoblash `DailyActivity` dan (kunlik job)
- [ ] `streak_3/7/30` hodisalarini emit qilish
- [ ] Daraja o'tish + imtiyozlar (yuklash limiti darajaga bog'lanadi)
- [ ] **XP va tanga ajratilgan** (`points_lifetime` vs `points_balance`)
- [ ] Reyting jadvali API — `ReaderStats` indeksidan, snapshot'siz
- [ ] `DailyActivity` foydalanuvchi vaqt zonasida hisoblansin

**Tekshiruv:** 3 kun ketma-ket o'qilsa `streak_3` beriladi · bir kun tashlab
ketilsa streak nolga tushadi · mukofot sotib olinsa daraja tushmaydi.

---

### M13 — Anti-cheat nazorati (integrity) · ~16 soat
Bog'liq: M11 · Agent: `django-drf-backend`

- [ ] `SuspiciousActivity` modeli
- [ ] Kechalik `scan_users()` — risk skor (reja 6.5-jadvali, 8 signal)
- [ ] Admin sahifasi: "Shubhali faollik" — sabablar, dwell grafigi, ball tarixi
- [ ] Amallar: e'tiborsiz qoldirish / **ballni qaytarish** / reytingdan chiqarish
- [ ] Ballni qaytarish = manfiy ledger qatori + `AuditLog`
- [ ] `risk >= 85` da reader'da yumshoq "Hali o'qiyapsizmi?" so'rovi
- [ ] **Avtomatik bloklash YO'Q** (noto'g'ri pozitiv real o'quvchini haydaydi)

**Tekshiruv:** sun'iy "bot" ssenariysi yaratib, risk skor yuqori chiqishini
tekshirish · oddiy foydalanuvchi hech qachon flag olmasligi.

---

### M14 — Gamifikatsiya UI · ~18 soat
Bog'liq: M12, M7 · Agent: `react-frontend`

- [ ] Ball toast (`sonner`), daraja progress bar, streak indikatori
- [ ] `/profile` — ball, daraja, statistika, o'qish tarixi
- [ ] `/badges` — olingan va olinmagan nishonlar
- [ ] `/leaderboard` — haftalik/oylik/umumiy, o'z o'rni ajratilgan
- [ ] Nishon olinganda modal
- [ ] O'qish heatmap (DailyActivity dan)

**Tekshiruv:** o'qilgach ball ko'rinadi · reytingda o'z o'rni to'g'ri ·
mobil'da buzilmaydi.

> ### ✅ 2-BOSQICH TUGADI — to'liq gamifikatsiya ishlaydi

---

## 3-BOSQICH — v1 KENGAYTMALAR

### M15 — EPUB reader · ~20 soat
Bog'liq: M8 · Agent: `react-frontend`

- [ ] `epub.js` integratsiyasi, `ReaderEngine` interfeysi ustida
- [ ] CFI (lokatsiya) bilan progress saqlash
- [ ] Shrift o'lchami, mavzu, sahifalash rejimi
- [ ] Telemetriya: sahifa o'rniga "virtual sahifa" (so'z soni asosida)
- [ ] `MIN_PAGE_DWELL` EPUB uchun so'z soniga qarab hisoblanadi

**Tekshiruv:** EPUB ochiladi, progress saqlanadi, ball PDF bilan bir xil mantiqda.

---

### M16 — Sharh va moderatsiya · ~14 soat
Bog'liq: M11 · Agent: `django-drf-backend` + `react-frontend`

- [ ] `Review` modeli — `UNIQUE(user, book)`, moderatsiya statusi
- [ ] Sharh yozish faqat kitob **tugatilgan** bo'lsa
- [ ] Kutubxonachi uchun moderatsiya navbati (unfold admin)
- [ ] Tasdiqlangach `review_approved` hodisasi → ball
- [ ] Kitob reytingi faqat tasdiqlangan sharhlardan
- [ ] Frontend: sharh ro'yxati + yozish formasi

---

### M17 — Challenge'lar · ~16 soat
Bog'liq: M12

- [ ] `Challenge`, `UserChallengeProgress` modellari
- [ ] Admin'da challenge yaratish (shartlar JSON bilan)
- [ ] Progress hisoblash + tugaganda ball
- [ ] Frontend: `/challenges` sahifasi, progress bar

---

### M18 — Mukofot do'koni · ~14 soat
Bog'liq: M12

- [ ] `Reward`, `RewardRedemption` modellari
- [ ] `spend_points()` — zaxira va balans tekshiruvi bilan
- [ ] **Mukofot yetkazish jarayoni tayyor bo'lgandagina yoqing** — bajarilmagan
      mukofot eng yomon foydalanuvchi tajribasi
- [ ] Frontend: `/rewards` sahifasi

---

### M19 — Watermark · ~12 soat
Bog'liq: M5

- [ ] PyMuPDF bilan PDF watermark (ism + ID + sana + domen)
- [ ] Talab bo'yicha generatsiya, `202 Accepted` + poll
- [ ] Kesh: `/data/derived/wm/`, **5 GB LRU limit + cron tozalash**
- [ ] Nusxa ID `DownloadLog` ga bog'lanadi (manbani aniqlash uchun)
- [ ] EPUB: faqat metadata izi (himoya emas, iz)

**Tekshiruv:** yuklangan PDF'da ism ko'rinadi · kesh limiti oshsa eskisi o'chadi.

---

### M20 — Bulk import + ISBN autofill · ~12 soat
Bog'liq: M4

- [ ] ZIP yuklash → har fayl uchun `DRAFT` kitob
- [ ] Ichki metadata bilan avtomatik to'ldirish
- [ ] Ommaviy `Publish` action
- [ ] ISBN → Open Library / Google Books API autofill tugmasi

**Tekshiruv:** 50 kitoblik ZIP yuklanadi, kutubxonachi faqat tekshirib chiqadi.

> ### ✅ 3-BOSQICH TUGADI

---

## 4-BOSQICH — PRODUCTION

### M21 — Xavfsizlik auditi · ~10 soat
Bog'liq: M14 · Agent: **`backend-code-reviewer`**

> Serverga chiqishdan OLDIN. Bu qadam tashlab ketilmaydi.

- [ ] Ruxsatlar: har endpoint uchun rol tekshiruvi (RBAC jadvali bo'yicha)
- [ ] `cache: 'no-store'` barcha auth'li fetch'da
- [ ] N+1 so'rovlar
- [ ] Maxfiy kalitlar repoda yo'q, `NEXT_PUBLIC_` da maxfiy narsa yo'q
- [ ] Fayl yetkazishda obyekt darajasidagi tekshiruv
- [ ] Ledger'ga faqat servis orqali yozilishi
- [ ] Rate limiting ishlayaptimi

---

### M22 — Serverga chiqarish · ~20 soat
Bog'liq: M21 · Agent: `vps-deploy-ops`

- [ ] VPS buyurtma (**renewal narxini checkout'da tasdiqlang**)
- [ ] Domen + DNS
- [ ] SSH kalit, `ufw`, `fail2ban`, `unattended-upgrades`
- [ ] Docker + Compose o'rnatish
- [ ] `.env` to'ldirish (kuchli `SECRET_KEY`, parollar)
- [ ] `frontend/Dockerfile` (standalone output)
- [ ] GitHub Actions → GHCR → SSH deploy (**build faqat CI'da**, VPS'da emas)
- [ ] `deploy.sh` (backup → pull → migrate → collectstatic → up -d → health)
- [ ] Caddy avto-SSL ishlayapti
- [ ] django-q2 `Schedule` yozuvlari production'da
- [ ] `backup_db.sh` + cron + R2/B2 ga yuklash
- [ ] **Backup muvaffaqiyatsizligida Telegram xabari + Healthchecks.io**
- [ ] **Backup'dan tiklashni sinab ko'rish** (sinalmagan backup = backup emas)
- [ ] Sentry + UptimeRobot + disk monitoring
- [ ] Reboot qilib, hamma konteyner ko'tarilishini tekshirish

**Tekshiruv:** domen ochiladi · admin ishlaydi · kitob yuklanadi va o'qiladi ·
20 parallel yuklash simulyatsiyasida sayt javob beradi.

---

### M23 — Pilot · ~10 soat
Bog'liq: M22

- [ ] 20 kitobxon, 2 hafta
- [ ] Anti-cheat chegaralarini **real ma'lumot bilan** sozlash
      (`MIN_PAGE_DWELL_SEC`, `MAX_PAGES_PER_HOUR` — `SystemSetting` orqali,
      deploysiz)
- [ ] Ballni qayta hisoblash (chegara o'zgargach)
- [ ] Fikr-mulohaza yig'ish, UX tuzatishlari
- [ ] Reader'ni turli qurilmalarda sinash

---

### M24 — PWA · ~15 soat
Bog'liq: M23

- [ ] `manifest.json` + ikonkalar
- [ ] Service worker (`next-pwa` yoki qo'lda)
- [ ] Offline: katalog keshi + o'qilgan sahifalar
- [ ] "Bosh ekranga qo'shish" taklifi
- [ ] Offline telemetriya navbati bilan integratsiya

> ### ✅ LOYIHA TUGADI

---

## Doimiy e'tibordagi masalalar

- [ ] **Mualliflik huquqi** — har kitobga `rights_status` va manba hujjati.
      Bu loyihaning 1-xavfi va texnik emas, tashkiliy masala.
- [ ] Takedown (kitobni olib tashlash) tartibi yozma holda tayyor
- [ ] Kutubxonachi uchun yozma qoida: ruxsatsiz kitob yuklanmaydi
- [ ] Disk to'lishini kuzatish (watermark keshi eng tez o'sadi)
- [ ] Scope creep — yangi nishon/qoida **konfiguratsiya orqali**, kod yozmasdan

## Ochiq savollar (javob kerak)

- [ ] Kitoblarning huquqiy maqomi qanday?
- [ ] Kitobxon o'zi ro'yxatdan o'tadimi yoki kutubxonachi yaratadimi?
- [ ] Domen bormi?
- [ ] EPUB 1-bosqichda kerakmi yoki M15 da qolaveradimi?
- [ ] Email tasdiqlash kerakmi (SMS emas)?
