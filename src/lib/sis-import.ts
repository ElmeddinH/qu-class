// ============================================================================
// src/lib/sis-import.ts
// SIS (tələbə informasiya sistemi) CSV importunun PARSE + DOĞRULAMA qatı.
//
// 🔴 SAF MODUL: Prisma / React / `next/*` importu YOXDUR. Bütün DB yoxlaması
// (fakültə kodu mövcuddurmu, e-poçt artıq varmı, cohort açılıbmı) servisdədir
// — burada YALNIZ faylın özündən çıxarıla bilən qərarlar verilir. Səbəb: toplu
// import geri dönüşü olmayan əməliyyatdır və onun ən çox səhv edən hissəsi
// (kodlaşdırma, sətir sonu, dırnaq, sütun sırası) DB-siz testlə örtülməlidir.
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 ŞİFRƏ SÜTUNU QƏBUL EDİLMİR — PARSE MƏRHƏLƏSİNDƏ RƏDD OLUNUR
// ────────────────────────────────────────────────────────────────────────────
// Fayl `password` (və ya `parol` / `sifre`) sütunu daşıyırsa BÜTÜN import
// dayanır. Üç səbəb:
//   1. Şifrə düz mətnlə CSV faylında gəzir — e-poçtla göndərilir, yükləmə
//      qovluğunda qalır, ekran paylaşımında görünür.
//   2. Universitet SIS-i istifadəçinin şifrəsini BİLMİR və bilməməlidir.
//   3. Seed-in sabit duzu (`$2a$10$…seedSalt…`) DEMO üçündür və buraya
//      KOPYALANMIR — sabit duz istehsalda bütün hesabları eyni açarla açar.
//
// Yeni istifadəçi ŞİFRƏSİZ yaradılır (`UNSET_PASSWORD_HASH`) və hesabı
// qeydiyyat / şifrə bərpası axını ilə aktivləşdirir.
//
// ────────────────────────────────────────────────────────────────────────────
// FAYL FORMASI
// ────────────────────────────────────────────────────────────────────────────
//   · UTF-8 BOM qəbul edilir və KƏSİLİR (Excel BOM-la yazır; kəsilməsə ilk
//     sütunun adı "﻿email" olardı və başlıq tanınmazdı)
//   · CRLF və LF ikisi də
//   · Dırnaqlı dəyərlər: `"Əliyev, Nicat"` — daxili dırnaq ikiqat yazılır
//   · Ölçü limiti `SIS_MAX_BYTES`, MIME `text/csv`
//   · Boş sətirlər SƏSSİZCƏ atılır (fayl sonundakı yeni sətir normaldır)
// ============================================================================

import {
  MIN_ADMISSION_YEAR,
  UNIVERSITY_EMAIL_DOMAIN,
  isUniversityEmail,
  normalizeEmail,
} from "@/lib/constants";

// ---------------------------------------------------------------------------
// Müqavilə
// ---------------------------------------------------------------------------

/** Gözlənilən sütunlar — SIRA DA MÜQAVİLƏNİN BİR HİSSƏSİDİR. */
export const SIS_COLUMNS = [
  "email",
  "firstName",
  "lastName",
  "facultyCode",
  "programCode",
  "admissionYear",
] as const;

export type SisColumn = (typeof SIS_COLUMNS)[number];

/**
 * Faylda GÖRÜNMƏSİ QADAĞAN olan sütun adları (kiçik hərfə salınıb müqayisə
 * olunur). Siyahı azərbaycanca və ingiliscə variantları da tutur — SIS ixracı
 * hansı dildə gəlsə də eyni cavab verilməlidir.
 */
export const SIS_FORBIDDEN_COLUMNS = [
  "password",
  "passwordhash",
  "password_hash",
  "pass",
  "parol",
  "sifre",
  "şifrə",
  "sifrə",
] as const;

/** Fayl ölçüsü limiti — 2 MB (~20 000 sətir). */
export const SIS_MAX_BYTES = 2 * 1024 * 1024;

/** Qəbul edilən MIME tipi. */
export const SIS_MIME_TYPE = "text/csv";

/** UTF-8 BOM-un kod nöqtəsi. */
const BOM = "﻿";

// ---------------------------------------------------------------------------
// Rədd səbəbləri
// ---------------------------------------------------------------------------

/** Bütün faylı dayandıran səhvlər. */
export type SisFileReason =
  | "EMPTY_FILE"
  | "MISSING_COLUMN"
  | "FORBIDDEN_COLUMN"
  | "TOO_LARGE"
  | "NO_DATA_ROWS";

/** Tək sətri rədd edən səhvlər — qalan sətirlər oxunmağa davam edir. */
export type SisRowReason =
  | "COLUMN_COUNT"
  | "INVALID_EMAIL"
  | "NOT_UNIVERSITY_EMAIL"
  | "MISSING_NAME"
  | "MISSING_CODE"
  | "INVALID_YEAR"
  | "DUPLICATE_IN_FILE";

export const SIS_FILE_MESSAGES: Record<SisFileReason, string> = {
  EMPTY_FILE: "Fayl boşdur.",
  MISSING_COLUMN: `Başlıq sətrində tələb olunan sütunlar yoxdur: ${SIS_COLUMNS.join(", ")}.`,
  FORBIDDEN_COLUMN:
    "Faylda şifrə sütunu var. Şifrə CSV ilə qəbul edilmir — hesab şifrəsiz yaradılır və istifadəçi onu özü təyin edir.",
  TOO_LARGE: `Fayl ${Math.round(SIS_MAX_BYTES / 1024 / 1024)} MB-dan böyükdür.`,
  NO_DATA_ROWS: "Faylda başlıqdan başqa sətir yoxdur.",
};

export const SIS_ROW_MESSAGES: Record<SisRowReason, string> = {
  COLUMN_COUNT: "Sütun sayı başlıqla uyğun gəlmir.",
  INVALID_EMAIL: "E-poçt düzgün formada deyil.",
  NOT_UNIVERSITY_EMAIL: `E-poçt @${UNIVERSITY_EMAIL_DOMAIN} domenində olmalıdır.`,
  MISSING_NAME: "Ad və soyad boş ola bilməz.",
  MISSING_CODE: "Fakültə və ixtisas kodu boş ola bilməz.",
  INVALID_YEAR: `Qəbul ili tam ədəd olmalıdır (ən azı ${MIN_ADMISSION_YEAR}).`,
  DUPLICATE_IN_FILE: "Eyni e-poçt faylda təkrarlanır — yalnız birinci sətir götürülür.",
};

// ---------------------------------------------------------------------------
// Nəticə tipləri
// ---------------------------------------------------------------------------

export interface SisRow {
  /** Faylda sətir nömrəsi (1-dən, BAŞLIQ DAXİL) — hesabatda göstərilir. */
  line: number;
  email: string;
  firstName: string;
  lastName: string;
  facultyCode: string;
  programCode: string;
  admissionYear: number;
}

export interface SisRowIssue {
  line: number;
  reason: SisRowReason;
  message: string;
  /** Sətrin xam mətni — hesabatda "harada səhv var?" sualına cavab verir. */
  raw: string;
}

export type SisParseResult =
  | { ok: false; reason: SisFileReason; message: string }
  | { ok: true; rows: SisRow[]; issues: SisRowIssue[] };

// ---------------------------------------------------------------------------
// Aşağı səviyyə: CSV mətnindən xanalara
// ---------------------------------------------------------------------------

/**
 * BOM-u kəsir və sətir sonlarını normallaşdırır.
 *
 * ⚠️ BOM ancaq FAYLIN ƏVVƏLİNDƏN kəsilir. Ortada rast gəlinən U+FEFF adi
 * simvoldur və xanadan silinsə dəyər səssizcə dəyişərdi.
 */
export function normalizeSisText(text: string): string {
  const withoutBom = text.startsWith(BOM) ? text.slice(BOM.length) : text;
  return withoutBom.replace(/\r\n?/g, "\n");
}

/**
 * RFC 4180 vəziyyət maşını: dırnaqlı xanalar, xana içindəki vergül / sətir
 * sonu, ikiqat dırnaqla qaçırılmış dırnaq.
 *
 * Qaytarılan hər element BİR SƏTİRDİR. Sətir NÖMRƏSİ də qaytarılır, çünki
 * dırnaq içindəki sətir sonu nömrəni sürüşdürür — hesabatdakı "sətir 12"
 * faylın 12-ci fiziki sətri olmalıdır.
 */
export function parseCsvRows(text: string): Array<{ line: number; cells: string[] }> {
  const source = normalizeSisText(text);
  const rows: Array<{ line: number; cells: string[] }> = [];

  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let rowStartLine = 1;
  let started = false;

  const endCell = () => {
    cells.push(cell);
    cell = "";
  };

  const endRow = () => {
    endCell();
    rows.push({ line: rowStartLine, cells });
    cells = [];
    started = false;
  };

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (!started) {
      rowStartLine = line;
      started = true;
    }

    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        if (char === "\n") line += 1;
        cell += char;
      }
      continue;
    }

    if (char === '"' && cell === "") {
      quoted = true;
      continue;
    }

    if (char === ",") {
      endCell();
      continue;
    }

    if (char === "\n") {
      endRow();
      line += 1;
      continue;
    }

    cell += char;
  }

  // Fayl yeni sətirlə bitmirsə son sətir hələ bağlanmayıb.
  if (started || cell !== "" || cells.length > 0) endRow();

  return rows;
}

// ---------------------------------------------------------------------------
// Başlıq
// ---------------------------------------------------------------------------

/** Başlıq xanasının müqayisə forması: kənar boşluqlar + kiçik hərf. */
function headerKey(value: string): string {
  return value.trim().toLowerCase();
}

/** Sütun adının kanonik forması — `firstName` / `first_name` / `First Name`. */
function canonicalHeader(value: string): string {
  return headerKey(value).replace(/[\s_-]/g, "");
}

const CANONICAL_COLUMN = new Map<string, SisColumn>(
  SIS_COLUMNS.map((column) => [canonicalHeader(column), column]),
);

// ---------------------------------------------------------------------------
// Əsas funksiya
// ---------------------------------------------------------------------------

/**
 * CSV mətnini sətirlərə çevirir.
 *
 * ⚠️ Bu funksiya BAZAYA MÜRACİƏT ETMİR. "Bu e-poçt artıq var" və ya "bu
 * fakültə kodu tanınmır" qərarları `previewImport` servisindədir — burada
 * yalnız faylın öz bütövlüyü yoxlanılır.
 */
export function parseSisCsv(text: string): SisParseResult {
  if (text.length === 0) {
    return { ok: false, reason: "EMPTY_FILE", message: SIS_FILE_MESSAGES.EMPTY_FILE };
  }

  const rows = parseCsvRows(text).filter(
    (row) => !(row.cells.length === 1 && row.cells[0].trim() === ""),
  );

  if (rows.length === 0) {
    return { ok: false, reason: "EMPTY_FILE", message: SIS_FILE_MESSAGES.EMPTY_FILE };
  }

  const header = rows[0].cells.map((cell) => cell.trim());

  // 🔴 ŞİFRƏ SÜTUNU — hər şeydən ƏVVƏL yoxlanılır (fayl başlığına bax).
  const forbidden = header.find((cell) =>
    (SIS_FORBIDDEN_COLUMNS as readonly string[]).includes(headerKey(cell)),
  );
  if (forbidden !== undefined) {
    return {
      ok: false,
      reason: "FORBIDDEN_COLUMN",
      message: SIS_FILE_MESSAGES.FORBIDDEN_COLUMN,
    };
  }

  // Sütun indeksləri — SIRA sərbəstdir, ADLAR məcburidir.
  const indexOf = new Map<SisColumn, number>();
  header.forEach((cell, index) => {
    const column = CANONICAL_COLUMN.get(canonicalHeader(cell));
    if (column !== undefined && !indexOf.has(column)) indexOf.set(column, index);
  });

  const missing = SIS_COLUMNS.filter((column) => !indexOf.has(column));
  if (missing.length > 0) {
    return {
      ok: false,
      reason: "MISSING_COLUMN",
      message: `${SIS_FILE_MESSAGES.MISSING_COLUMN} Çatışmayan: ${missing.join(", ")}.`,
    };
  }

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) {
    return { ok: false, reason: "NO_DATA_ROWS", message: SIS_FILE_MESSAGES.NO_DATA_ROWS };
  }

  const accepted: SisRow[] = [];
  const issues: SisRowIssue[] = [];
  const seen = new Set<string>();

  for (const row of dataRows) {
    const raw = row.cells.join(",");
    const reject = (reason: SisRowReason) => {
      issues.push({ line: row.line, reason, message: SIS_ROW_MESSAGES[reason], raw });
    };

    if (row.cells.length !== header.length) {
      reject("COLUMN_COUNT");
      continue;
    }

    const at = (column: SisColumn) => row.cells[indexOf.get(column)!].trim();

    const email = normalizeEmail(at("email"));
    // Minimal forma yoxlaması — domen yoxlaması ayrıca səbəb verir ki,
    // hesabatda "domen səhvdir" ilə "ümumiyyətlə e-poçt deyil" ayrılsın.
    if (email === "" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      reject("INVALID_EMAIL");
      continue;
    }
    if (!isUniversityEmail(email)) {
      reject("NOT_UNIVERSITY_EMAIL");
      continue;
    }

    const firstName = at("firstName");
    const lastName = at("lastName");
    if (firstName === "" || lastName === "") {
      reject("MISSING_NAME");
      continue;
    }

    const facultyCode = at("facultyCode");
    const programCode = at("programCode");
    if (facultyCode === "" || programCode === "") {
      reject("MISSING_CODE");
      continue;
    }

    const yearText = at("admissionYear");
    const admissionYear = Number.parseInt(yearText, 10);
    if (
      !/^\d{4}$/.test(yearText) ||
      !Number.isInteger(admissionYear) ||
      admissionYear < MIN_ADMISSION_YEAR
    ) {
      reject("INVALID_YEAR");
      continue;
    }

    // ⚠️ Təkrar e-poçt FAYL DAXİLİNDƏ səhvdir; BAZADAKI mövcud e-poçt isə
    // səhv deyil — o, YENİLƏMƏ (`UPDATE`) deməkdir və servisdə həll olunur.
    if (seen.has(email)) {
      reject("DUPLICATE_IN_FILE");
      continue;
    }
    seen.add(email);

    accepted.push({
      line: row.line,
      email,
      firstName,
      lastName,
      facultyCode,
      programCode,
      admissionYear,
    });
  }

  return { ok: true, rows: accepted, issues };
}

// ---------------------------------------------------------------------------
// Önizləmə → təsdiq körpüsü
// ---------------------------------------------------------------------------

/**
 * Önizləmə jetonu — FNV-1a 32 bit.
 *
 * 🔴 NİYƏ LAZIMDIR: import İKİ MƏRHƏLƏLİDİR (önizləmə → təsdiq) və təsdiq
 * mərhələsi admin-in GÖRDÜYÜ faylı yazmalıdır. Jeton olmasa istifadəçi
 * önizləmədən sonra başqa fayl seçib «Təsdiqlə» düyməsinə basa bilərdi və
 * yazılan məlumat ekranda göstərilənlə uyğun gəlməzdi.
 *
 * ⚠️ Bu, KRİPTOQRAFİK imza DEYİL və olmamalıdır — jeton serverdə saxlanılmır,
 * yalnız "eyni fayldır?" sualına cavab verir. Faylı dəyişdirən adam onsuz da
 * admin-dir və öz önizləməsini yenidən aça bilər.
 */
export function sisPreviewToken(text: string): string {
  const normalized = normalizeSisText(text);
  let hash = 0x811c9dc5;

  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    // FNV prime (16777619) — 32 bitlik daşma üçün `Math.imul`.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

/** Şablon fayl — «Nümunə CSV» düyməsi bunu yükləyir. */
export const SIS_TEMPLATE_CSV = [
  SIS_COLUMNS.join(","),
  "nicat.aliyev@qu.edu.az,Nicat,Əliyev,eng,cs,2026",
  "leyla.memmedova@qu.edu.az,Leyla,Məmmədova,econ,fin,2026",
].join("\r\n");
