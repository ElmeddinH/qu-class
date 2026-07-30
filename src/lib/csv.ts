// ============================================================================
// src/lib/csv.ts
// CSV ixracı (KUDS §14 — cədvəllər üçün MƏCBURİ funksiya).
//
// 🔴 SAF MODUL: Prisma / React / `next/*` importu yoxdur. Server action
// sətirləri hazırlayır, bu fayl onları mətnə çevirir, client isə `Blob` kimi
// yükləyir.
//
// ÜÇ TƏLƏ, üçü də testlə bərkidilib (`csv.test.ts`):
//
// 1. FORMULA İNYEKSİYASI. `=`, `+`, `-`, `@`, TAB və CR ilə başlayan xana
//    Excel-də DÜSTUR kimi icra olunur. İstifadəçinin adı `=HYPERLINK(...)`
//    olsaydı, ixrac faylını açan koordinatorun kompüterində işləyərdi.
//    Belə xanaların əvvəlinə tək dırnaq qoyulur.
//
// 2. BOM. Excel BOM-suz UTF-8 faylı sistem kodlaşdırması ilə oxuyur və
//    azərbaycanca hərflər (`ə`, `ğ`, `ş`) zibilə çevrilir.
//
// 3. CRLF. Excel-in köhnə versiyaları tək LF ilə bütün faylı BİR sətir sayır.
// ============================================================================

import { asciiSlug } from "@/utils/slug";

/**
 * UTF-8 BOM — `EF BB BF` BAYTLARI.
 *
 * 🔴 NİYƏ SƏTİR DEYİL, BAYT: BOM fayl formatına aid BAYT məsələsidir, mətnin
 * özünə aid deyil. Blok 9-da o, `buildCsv`-in çıxışına `"﻿"` simvolu kimi
 * əlavə olunurdu və endirilən faylda YOX İDİ — server action-ın nəticəsi
 * brauzerə çatana qədər həmin kod nöqtəsi itirdi (U+FEFF eyni zamanda
 * "zero-width no-break space"-dir, yəni bir çox qat onu boşluq kimi görüb ata
 * bilir). Bayt massivi `Blob`-a birbaşa verilir və heç bir mətn qatından
 * keçmir — nəticə həmişə dəqiqdir.
 *
 * İstifadə (client):
 *   new Blob([new Uint8Array(CSV_BOM_BYTES), content], { type: "text/csv" })
 */
export const CSV_BOM_BYTES = [0xef, 0xbb, 0xbf] as const;

const CRLF = "\r\n";

/** Bu simvollarla başlayan xana Excel-də düstur kimi qiymətləndirilir. */
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

export type CsvCell = string | number | null | undefined;

/**
 * Tək xananın qaçırılması.
 *
 * Ardıcıllıq vacibdir: ƏVVƏLCƏ düstur prefiksi zərərsizləşdirilir, SONRA
 * dırnaqlanma qərarı verilir — əks halda əlavə edilən tək dırnaq dırnaqlanma
 * yoxlamasından kənarda qalardı.
 */
export function escapeCsvCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";

  let text = typeof value === "number" ? String(value) : value;

  // (1) Formula inyeksiyası — bax fayl başlığı.
  if (text.length > 0 && FORMULA_PREFIXES.includes(text[0])) {
    text = `'${text}`;
  }

  // Vergül, dırnaq və sətir sonu olan xana dırnaqlanır; daxili dırnaq ikiqat
  // yazılır (RFC 4180 §2).
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function csvRow(cells: readonly CsvCell[]): string {
  return cells.map(escapeCsvCell).join(",");
}

/**
 * Başlıq sətri + verilənlər → CSV MƏTNİ.
 *
 * ⚠️ BOM BURADA ƏLAVƏ OLUNMUR (bax `CSV_BOM_BYTES`) — funksiya saf mətn
 * qaytarır, bayt başlığını faylı quran tərəf (client) əlavə edir.
 *
 * `headers` azərbaycanca yazılır — fayl istifadəçi üçündür, kod üçün deyil.
 */
export function buildCsv(
  headers: readonly string[],
  rows: readonly (readonly CsvCell[])[],
): string {
  const lines = [csvRow(headers), ...rows.map(csvRow)];
  return `${lines.join(CRLF)}${CRLF}`;
}

/**
 * Yüklənən faylın adı — ASCII, tarix damğası ilə.
 *
 * Tarix ÇAĞIRAN tərəfdən gəlir (`new Date()` burada çağırılmır), çünki modul
 * saf qalmalıdır və test sabit nəticə gözləyir.
 */
export function csvFileName(prefix: string, at: Date): string {
  const slug = asciiSlug(prefix, 50);
  const stamp = at.toISOString().slice(0, 10);
  return `${slug === "" ? "export" : slug}-${stamp}.csv`;
}
