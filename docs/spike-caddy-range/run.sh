#!/usr/bin/env bash
# Caddy intercept + X-Accel-Redirect + HTTP Range sinovi.
# Reja 18.1-bo'limi: butun reader va fayl yetkazish arxitekturasi shunga tayanadi.
# Ishga tushirish: Docker Desktop yoqilgan holda `bash run.sh`
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p data/books
[ -f data/books/test.bin ] || head -c 5242880 /dev/urandom > data/books/test.bin

docker compose up -d
sleep 4

echo "--- 1. To'liq so'rov (Range'siz) ---"
curl -s -o /dev/null -w "status=%{http_code} hajm=%{size_download}\n" http://localhost:8080/files/t/abc

echo "--- 2. Range so'rovi: bytes=1000-1099 (100 bayt kutilyapti) ---"
curl -s -D - -o /tmp/range_out -H "Range: bytes=1000-1099" http://localhost:8080/files/t/abc \
  | grep -iE "^(HTTP|content-range|content-length|accept-ranges)" || true
echo "olingan bayt: $(wc -c < /tmp/range_out)"

echo "--- 3. Baytlar to'g'rimi (originalning o'sha bo'lagi bilan solishtirish) ---"
if cmp -s <(dd if=data/books/test.bin bs=1 skip=1000 count=100 2>/dev/null) /tmp/range_out; then
  echo "NATIJA: MUVAFFAQIYAT — Range to'g'ri ishlaydi, arxitektura tasdiqlandi."
else
  echo "NATIJA: MUVAFFAQIYATSIZ — zaxira variantga o'ting (Django FileResponse)."
fi

docker compose down
