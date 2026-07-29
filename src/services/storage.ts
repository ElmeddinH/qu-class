// ============================================================================
// src/services/storage.ts
// Şəkil yükləmə və optimizasiya — TƏK fayl sistemi girişi olan modul.
//
// 🔴 `node:fs` / `node:path` import etməyə YALNIZ bu faylın icazəsi var.
// Səbəb: v1-də şəkillər `public/uploads/` altında saxlanılır, istehsalda isə
// S3 / R2-yə keçmək lazım gələcək. O keçid TƏK faylı dəyişməklə olmalıdır —
// route handler, server action və komponentlər `saveImage()` imzasına baxır,
// fayl yoluna yox.
//
// ⚠️ Çıxış obyekti `MediaAsset` sətrinin sahələrini daşıyır (url, thumbUrl,
// type, mimeType, sizeBytes, width, height), amma sətri ÖZÜ yaratmır: yükləmə
// anında hələ `postId` yoxdur. Sətir `createPost` transaksiyasında yaranır.
// ============================================================================

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { MediaType } from "@/lib/enums";

// ---------------------------------------------------------------------------
// Limitlər və ağ siyahı
// ---------------------------------------------------------------------------

/** 10 MB — brauzerdən gələn XAM faylın ölçüsü (optimizasiyadan ƏVVƏL). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * MIME ağ siyahısı. Qara siyahı DEYİL: naməlum növ avtomatik rədd olunur
 * (fail closed). SVG QƏSDƏN yoxdur — içində skript daşıya bilir və `public/`
 * altından eyni mənbədə (same-origin) verilir.
 */
export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/** Optimizasiyadan sonra maksimum en — böyüdülmə YOXDUR (withoutEnlargement). */
const MAX_WIDTH = 1600;
/** Kart qalereyasında göstərilən kiçik variant. */
const THUMB_WIDTH = 400;
const WEBP_QUALITY = 82;
const THUMB_QUALITY = 74;

const PUBLIC_DIR = "public";
const UPLOAD_SEGMENT = "uploads";

// ---------------------------------------------------------------------------
// Nəticə tipləri
// ---------------------------------------------------------------------------

/** `MediaAsset` yaratmaq üçün hazır məlumat dəsti. */
export interface StoredImage {
  url: string;
  thumbUrl: string;
  type: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
}

export type StorageFailureReason =
  | "EMPTY"
  | "TOO_LARGE"
  | "UNSUPPORTED_TYPE"
  | "DECODE_FAILED"
  | "WRITE_FAILED";

export type SaveImageResult =
  | { ok: true; asset: StoredImage }
  | { ok: false; reason: StorageFailureReason };

// ---------------------------------------------------------------------------
// Fayl adı
// ---------------------------------------------------------------------------

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * cuid-formatlı fayl adı: `c` + vaxt damğası + təsadüfi hissə.
 *
 * Prisma `@default(cuid())`-i DB tərəfdə tətbiq edir, fayl adı isə DB-yə
 * yazılmamışdan ƏVVƏL lazımdır. Yeni asılılıq gətirmək əvəzinə eyni formada
 * kifayət qədər unikal ad qurulur (vaxt damğası + 12 təsadüfi simvol).
 */
function createFileId(): string {
  const stamp = Date.now().toString(36);
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("");
  return `c${stamp}${random}`;
}

/**
 * `uploads/YYYY/MM` — aylıq qovluqlar. Tək qovluqda on minlərlə fayl
 * saxlamaq həm siyahılamağı, həm ehtiyat nüsxəni yavaşladır.
 */
function monthlySegments(now: Date): { year: string; month: string } {
  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, "0"),
  };
}

function isAllowedMime(mime: string): boolean {
  return (ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(mime);
}

// ---------------------------------------------------------------------------
// Optimizasiya
// ---------------------------------------------------------------------------

/**
 * Şəkli WebP-yə çevirir (əsas + thumb).
 *
 * Qaytarır: nəticə obyekti · `"UNSUPPORTED"` (format ağ siyahıda deyil) ·
 * `null` (oxunmadı). Dönüş tipi QƏSDƏN yazılmayıb — `sharp` `export =` ilə
 * ixrac olunur və `sharp.OutputInfo` tipinə `import sharp from` yolu ilə
 * müraciət etmək olmur; çıxarılmış (inferred) tip eyni işi görür.
 */
async function optimize(input: Buffer, isAnimated: boolean) {
  try {
    const meta = await sharp(input, { animated: isAnimated }).metadata();

    // MIME başlığı istifadəçidən gəlir və saxtalaşdırıla bilər. `sharp` faylı
    // ancaq həqiqətən şəkil olduqda oxuya bilir — ikinci qapı budur.
    if (!meta.width || !meta.height) return null;
    if (!meta.format || !isAllowedMime(`image/${meta.format}`)) {
      return "UNSUPPORTED" as const;
    }

    const main = await sharp(input, { animated: isAnimated })
      .rotate() // EXIF orientasiyasını tətbiq edir (telefon şəkilləri yan düşür)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    const thumb = await sharp(input, { animated: isAnimated })
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer();

    return { main, thumb };
  } catch (error) {
    console.error("[storage] şəkil oxunmadı:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Əsas funksiya
// ---------------------------------------------------------------------------

/**
 * Şəkli optimizasiya edib diskə yazır və `MediaAsset` sahələrini qaytarır.
 *
 * Addımlar:
 *   1. Ölçü və MIME yoxlaması (ağ siyahı)
 *   2. `sharp` ilə metadata oxunur — MIME başlığı yalan ola bilər, əsl
 *      format buradan bilinir
 *   3. maks. 1600px en, WebP (animasiyalı GIF animasiyasını saxlayır)
 *   4. 400px thumb
 *   5. `public/uploads/YYYY/MM/<id>.webp` + `<id>-thumb.webp`
 *
 * Xəta atmır — nəticəni birləşmə tipi (`SaveImageResult`) kimi qaytarır ki,
 * route handler istifadəçiyə anlaşılan mesaj göstərsin.
 */
export async function saveImage(
  file: File,
  now: Date = new Date(),
): Promise<SaveImageResult> {
  if (file.size === 0) return { ok: false, reason: "EMPTY" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "TOO_LARGE" };
  if (!isAllowedMime(file.type)) return { ok: false, reason: "UNSUPPORTED_TYPE" };

  const input = Buffer.from(await file.arrayBuffer());

  // GIF-də animasiya kadrlarını saxlamaq üçün `animated: true` lazımdır;
  // digər formatlarda o, lüzumsuz yükdür.
  const isAnimated = file.type === "image/gif";

  const optimized = await optimize(input, isAnimated);
  if (optimized === null) return { ok: false, reason: "DECODE_FAILED" };
  if (optimized === "UNSUPPORTED") return { ok: false, reason: "UNSUPPORTED_TYPE" };

  const { main, thumb } = optimized;

  const id = createFileId();
  const { year, month } = monthlySegments(now);
  const relativeDir = path.posix.join(UPLOAD_SEGMENT, year, month);
  const absoluteDir = path.join(process.cwd(), PUBLIC_DIR, UPLOAD_SEGMENT, year, month);

  try {
    await mkdir(absoluteDir, { recursive: true });
    await Promise.all([
      writeFile(path.join(absoluteDir, `${id}.webp`), main.data),
      writeFile(path.join(absoluteDir, `${id}-thumb.webp`), thumb),
    ]);
  } catch (error) {
    console.error("[storage] fayl yazılmadı:", error);
    return { ok: false, reason: "WRITE_FAILED" };
  }

  // ⚠️ Animasiyalı WebP-də `info.height` BÜTÜN kadrların cəmidir (şaquli
  // lövhə kimi verilir). Kartda düzgün nisbət üçün tək kadrın hündürlüyü
  // lazımdır — `pageHeight` varsa o götürülür.
  const height = main.info.pageHeight ?? main.info.height;

  return {
    ok: true,
    asset: {
      url: `/${relativeDir}/${id}.webp`,
      thumbUrl: `/${relativeDir}/${id}-thumb.webp`,
      type: MediaType.IMAGE,
      mimeType: "image/webp",
      sizeBytes: main.info.size,
      width: main.info.width,
      height,
    },
  };
}
