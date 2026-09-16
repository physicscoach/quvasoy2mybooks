# Elektron kutubxona — Foydalanish qo'llanmasi

Bu qo'llanma saytdan foydalanishning uch xil rolini tushuntiradi: **kitobxon**,
**kutubxonachi** va **administrator**.

Sayt manzili (local): **http://localhost** · Admin panel: **http://localhost/admin/**

---

## 1. KITOBXON uchun

### 1.1 Ro'yxatdan o'tish va kirish
1. Yuqori o'ng burchakdagi **"Ro'yxatdan o'tish"** tugmasini bosing.
2. Foydalanuvchi nomi, email va parol (kamida 8 belgi) kiriting.
3. Avtomatik tizimga kirasiz.
4. Keyingi kirishda **"Kirish"** — foydalanuvchi nomi **yoki email** + parol.

### 1.2 Kitob topish
- **Katalog** bo'limida barcha nashr qilingan kitoblar.
- Yuqoridagi qidiruv maydoniga kitob nomi yoki muallifni yozib **"Qidirish"**.
- Janr (dropdown) bo'yicha filtrlash.

### 1.3 Kitob o'qish
1. Kitob kartasini bosing → kitob sahifasi ochiladi.
2. **"O'qish"** tugmasi → o'quvchi (reader) ochiladi.
3. PDF: sahifalarni varaqlang, zoom (+/−), rejimni almashtiring.
   EPUB: keyingi/oldingi tugmalar bilan, foiz ko'rsatiladi.
4. O'qiganingiz avtomatik saqlanadi — keyin o'sha joydan davom etadi.

> **Muhim:** ball **haqiqiy o'qishdan** beriladi. Sahifani ochib qo'yib ketish,
> tez varaqlash yoki bir nechta oyna ochish ball bermaydi. Ball ~1 daqiqa
> kechikib qo'shiladi (o'qish tekshiruvidan keyin).

### 1.4 Ball, daraja, nishon
- **Profil** (avatar menyusi) — tanga, XP, daraja, kunlik seriya (streak).
- Har kuni ≥20 daqiqa o'qisangiz — **streak** o'sadi (🔥 navbar'da).
- **Nishonlar** — kitob tugatish, seriya, janr xilma-xilligi uchun avtomatik.
- **Reyting** — eng ko'p o'qigan kitobxonlar (XP bo'yicha).

### 1.5 Challenge va mukofot
- **Challenge** — vaqtli maqsad (masalan "oyda 5 kitob"). Bajarsangiz qo'shimcha ball.
- **Mukofotlar** — yig'gan **tanga**ni ramka, unvon, sertifikat, yuklash limitiga
  almashtiring. (Tanga sarflansa ham XP/daraja tushmaydi.)

### 1.6 Sharh
- Kitobni **tugatgach** sharh yozishingiz mumkin (1–5 yulduz + matn).
- Sharh kutubxonachi tasdig'idan keyin ko'rinadi.

### 1.7 Yuklab olish
- Ba'zi kitoblarda **"Yuklab olish"** tugmasi bor.
- Yuklangan PDF'da sizning ismingiz va noyob ID (watermark) bo'ladi —
  faylni tarqatmang, javobgarlik sizda.

### 1.8 Tungi rejim
- Navbar'dagi **oy/quyosh** ikonkasi bilan yorug'/tungi rejimni almashtiring.

---

## 2. KUTUBXONACHI uchun (admin panel)

Kirish: **http://localhost/admin/** — kutubxonachi hisobi bilan.

### 2.1 Kitob qo'shish (asosiy vazifa)
1. **Kitoblar → Qo'shish**.
2. Sarlavha, tavsif, til, muallif, janrni kiriting.
3. Pastda **Fayl** bo'limida PDF yoki EPUB yuklang.
4. **Saqlash** — tizim avtomatik: sahifa sonini aniqlaydi, muqova chiqaradi.
5. Holat **"Tayyor"** bo'lgach, **"Nashr qilish"** amalini tanlang.

> Chala kitob (muqova/fayl yo'q) nashr qilinmaydi — tizim ogohlantiradi.

### 2.2 Ommaviy import (ko'p kitob)
Terminalda (server ichida):
```bash
docker compose exec web python manage.py import_books /yuklash/papkasi --publish
```
Papkadagi har PDF/EPUB'dan kitob yaratiladi (sarlavha fayl nomidan).

### 2.3 Sharh moderatsiyasi
- **Sharhlar** bo'limi → kutayotgan sharhlarni tanlang.
- **"Tasdiqlash"** yoki **"Rad etish"** amali. Tasdiqlangach kitob reytingiga
  qo'shiladi va muallifga ball beriladi.

### 2.4 Yuklab olishni sozlash
- Kitob tahririda `is_downloadable` — yuklab olishga ruxsat.
- Fayl darajasida ham alohida sozlanadi.

---

## 3. ADMINISTRATOR uchun

Admin barcha kutubxonachi imkoniyatlari + qo'shimcha:

### 3.1 Gamifikatsiya sozlash
- **Gamifikatsiya qoidalari** — har hodisa uchun ball miqdorini deploysiz o'zgartiring.
- **Darajalar, Nishonlar, Challenge, Mukofotlar** — qo'shish/tahrirlash.

### 3.2 Anti-cheat nazorati
- **Shubhali faolliklar** — tizim aniqlagan shubhali foydalanuvchilar (risk bali bilan).
- Amallar: **e'tiborsiz qoldirish**, **ball qaytarish**, **bloklash**.

### 3.3 Tizim sozlamalari
- **SystemSetting** — anti-cheat chegaralari (sahifada minimal vaqt, soatlik limit)
  ni deploysiz o'zgartirish (pilot davrida sozlash uchun).
- **Foydalanuvchilar** — rol berish (kitobxon/kutubxonachi/admin).
- **Audit log** — muhim amallar tarixi.

---

## 4. Tez-tez so'raladigan savollar

**Ball kelmadi?** — Haqiqiy o'qish tekshiruvidan o'tishi kerak (sahifada yetarli
vaqt). Ball ~1 daqiqa kechikadi.

**Kitob ochilmadi?** — Fayl "Tayyor" holatda va kitob "Nashr qilingan" bo'lishi kerak.

**Tungi rejim saqlanmayapti?** — Brauzer sozlamalarida saqlanadi; boshqa qurilmada
qayta tanlanadi.

**Parolni unutdim** — hozircha admin panel orqali tiklanadi (v1'da o'zi tiklash qo'shiladi).
