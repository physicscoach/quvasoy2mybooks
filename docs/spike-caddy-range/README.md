# Spike: Caddy intercept + X-Accel-Redirect + HTTP Range

**Nima tekshiriladi:** Django faylni o'zi uzatmasdan, faqat `X-Accel-Redirect` header
qaytarganda, Caddy o'sha faylni `Range` so'rovlarini hurmat qilgan holda uzata oladimi.

**Nega muhim:** PDF.js kitobni sahifama-sahifa, `Range` so'rovlari bilan yuklaydi.
Agar bu ishlamasa, brauzerdagi reader katta PDF'larda ishlamaydi va zaxira variantga
(Django `FileResponse`) o'tish kerak bo'ladi — bu worker soni, RAM byudjeti va VPS
tanloviga ta'sir qiladi.

**Ishga tushirish** (Docker Desktop yoqilgan bo'lsin):

```bash
bash run.sh
```

Kutilgan natija: `status=206`, `Content-Range: bytes 1000-1099/5242880`, 100 bayt,
va "MUVAFFAQIYAT" xabari.
