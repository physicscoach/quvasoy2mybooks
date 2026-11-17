// pdf.js JPEG2000 / JBIG2 rasmlarni ochishi uchun wasm dekoderlar kerak (pdfjs-dist 5+).
// Ular o'rnatilgan pdfjs-dist versiyasidan public/pdfjs/wasm/ ga ko'chiriladi —
// versiya har doim kutubxona bilan bir xil bo'lsin (build/dev oldidan avtomatik).
import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const src = join(dirname(require.resolve("pdfjs-dist/package.json")), "wasm");
const dst = join(process.cwd(), "public", "pdfjs", "wasm");
mkdirSync(dst, { recursive: true });
for (const f of ["openjpeg.wasm", "openjpeg_nowasm_fallback.js", "jbig2.wasm", "jbig2_nowasm_fallback.js", "qcms_bg.wasm"]) {
  cpSync(join(src, f), join(dst, f));
}
console.log("pdf.js wasm ->", dst);
