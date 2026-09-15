export { cn } from "cn";

/** Sana(vaqt)ni o'zbekcha formatda ko'rsatish, masalan: 14-sentabr, 2026. */
export function formatDateUz(value: string | Date, withTime = false): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

/** Sonni o'zbekcha formatda ko'rsatish (masalan: 1 234). */
export function formatNumberUz(value: number): string {
  return new Intl.NumberFormat("uz-UZ").format(value);
}
