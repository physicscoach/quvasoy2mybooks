"""PDF'ni onlayn o'qishga moslab qayta saqlash.

Muammo: ko'p PDF'larda sahifa obyektlari (har sahifaning kichik tavsifi) fayl bo'ylab katta
rasmlar orasiga sochilgan. pdf.js kitobni ochishda hamma sahifa obyektlarini o'qiydi —
Range rejimida har biri uchun butun bo'lak (rasmlar bilan) tortiladi va amalda butun fayl
yuklanadi (Alkimyogar: ochish uchun 4,2 MB). Sekin xalqaro kanalda bu daqiqalar degani.

Yechim: PyMuPDF bilan `use_objstms=1` — rasm bo'lmagan barcha obyektlar (sahifalar,
daraxt, shriftlar lug'ati) bir nechta siqilgan "object stream"ga yig'iladi. Natija:
Alkimyogar ochilishi 4 188 KB -> 252 KB, birinchi 10 bet 380 KB. Mazmun o'zgarmaydi.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

# Qayta saqlangan fayl asl nusxadan shuncha martadan ko'p kattalashsa — asl qoladi
MAX_GROWTH = 1.05


def optimize_pdf_bytes(data: bytes) -> bytes | None:
    """Optimallashtirilgan PDF baytlarini qaytaradi; foydasiz/xavfli bo'lsa None.

    Asl fayl hech qachon buzilmaydi: natija sahifalar soni bo'yicha tekshiriladi.
    """
    import fitz  # PyMuPDF

    try:
        src = fitz.open(stream=data, filetype="pdf")
    except Exception:  # noqa: BLE001
        return None
    try:
        if src.is_encrypted or src.page_count == 0:
            return None
        pages = src.page_count
        # no_new_id: natija barqaror bo'lsin — bir xil fayl qayta yuklansa checksum bir xil (dublikat aniqlanadi)
        out = src.tobytes(garbage=4, deflate=True, use_objstms=1, no_new_id=True)
    except Exception as exc:  # noqa: BLE001 - optimallashtirish ixtiyoriy qadam
        logger.warning("PDF optimallashtirilmadi: %s", exc)
        return None
    finally:
        src.close()

    if len(out) > len(data) * MAX_GROWTH:
        return None
    try:
        check = fitz.open(stream=out, filetype="pdf")
        ok = check.page_count == pages and not check.is_repaired
        check.close()
    except Exception:  # noqa: BLE001
        return None
    return out if ok else None
