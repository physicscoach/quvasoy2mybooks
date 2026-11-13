"""`.po` tarjima fayllarini `.mo` ga yig'adi (gettext/msgfmt o'rnatilmagan kompyuterlar uchun).

Ishlatish (backend papkasida):  python locale/yig.py
`.po` faylni o'zgartirgach shu skriptni ishga tushiring va serverni qayta yoqing.
"""
import ast
import re
import struct
from pathlib import Path

HERE = Path(__file__).resolve().parent


def parse_po(path: Path) -> dict[str, str]:
    """{kalit: tarjima}. Kalit gettext qoidasi bo'yicha: kontekst\\x04msgid, ko'plik — msgid\\0msgid_plural."""
    entries, cur, key = [], {}, None

    def flush():
        if "msgid" in cur:
            entries.append(dict(cur))
        cur.clear()

    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        m = re.match(r'^(msgctxt|msgid_plural|msgid|msgstr(?:\[\d+\])?)\s+(".*")$', line)
        if m:
            key = m.group(1)
            if key == "msgctxt" or (key == "msgid" and ("msgid" in cur)):
                flush()
            cur[key] = ast.literal_eval(m.group(2))
        elif line.startswith('"') and key:
            cur[key] += ast.literal_eval(line)
        elif not line:
            flush()
            key = None
    flush()

    out = {}
    for e in entries:
        msgid = e["msgid"]
        if "msgid_plural" in e:
            forms = [e[k] for k in sorted(k for k in e if k.startswith("msgstr["))]
            if not any(forms):
                continue
            msgid = f"{msgid}\x00{e['msgid_plural']}"
            msgstr = "\x00".join(forms)
        else:
            msgstr = e.get("msgstr", "")
            if not msgstr and msgid:
                continue
        if "msgctxt" in e:
            msgid = f"{e['msgctxt']}\x04{msgid}"
        out[msgid] = msgstr
    return out


def write_mo(messages: dict[str, str], path: Path) -> None:
    keys = sorted(messages)
    ids = b""
    strs = b""
    offsets = []
    for k in keys:
        kb, vb = k.encode("utf-8"), messages[k].encode("utf-8")
        offsets.append((len(ids), len(kb), len(strs), len(vb)))
        ids += kb + b"\x00"
        strs += vb + b"\x00"
    n = len(keys)
    key_table = 7 * 4
    val_table = key_table + n * 8
    ids_start = val_table + n * 8
    strs_start = ids_start + len(ids)
    out = struct.pack("Iiiiiii", 0x950412DE, 0, n, key_table, val_table, 0, 0)
    for o1, l1, _, _ in offsets:
        out += struct.pack("ii", l1, o1 + ids_start)
    for _, _, o2, l2 in offsets:
        out += struct.pack("ii", l2, o2 + strs_start)
    path.write_bytes(out + ids + strs)


if __name__ == "__main__":
    for po in sorted(HERE.glob("*/LC_MESSAGES/*.po")):
        messages = parse_po(po)
        write_mo(messages, po.with_suffix(".mo"))
        print(f"{po.relative_to(HERE)}: {len(messages) - 1} ta tarjima")
