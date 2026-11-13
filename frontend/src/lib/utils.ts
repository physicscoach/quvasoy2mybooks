export { cn } from "cn";

const OYLAR = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

/** Sana(vaqt)ni o'zbekcha formatda ko'rsatish, masalan: 14-sentabr, 2026.
 *  Intl'ga tayanmaymiz: ko'p brauzerlarda uz-UZ oy nomlari yo'q ("2026 M09 14" chiqadi). */
export function formatDateUz(value: string | Date, withTime = false, withYear = true): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  let out = `${date.getDate()}-${OYLAR[date.getMonth()]}`;
  if (withYear) out += `, ${date.getFullYear()}`;
  if (withTime) {
    out += `, ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }
  return out;
}

/** Sonni o'zbekcha formatda ko'rsatish (masalan: 1 234). */
export function formatNumberUz(value: number): string {
  return new Intl.NumberFormat("uz-UZ").format(value);
}
