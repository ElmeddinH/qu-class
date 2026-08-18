// ============================================================================
// src/services/uploads-serve.ts
// Yüklənmiş şəklin diskdən OXUNMASI — `storage.ts`-in yazma tərəfinin cütü.
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 NİYƏ BU FAYL LAZIM OLDU (ölçülmüş davranış, təxmin deyil)
//
// Next.js istehsal rejimində `public/` qovluğunun məzmununu SERVER
// BAŞLAYANDA BİR DƏFƏ oxuyur və siyahını yaddaşda saxlayır
// (`next/dist/server/lib/router-utils/filesystem.js` → `publicFolderItems`,
// `recursiveReadDir` yalnız `!opts.dev` blokunda çağırılır). Sonrakı sorğuda
// diskə YENİDƏN baxılmır: `items.has(path)` uğursuzdursa cavab 404-dür.
//
// Nəticə — `next start` altında ölçülüb (Next 15.5.22, standalone çıxış):
//   · serverdən ƏVVƏL mövcud fayl   → `GET /uploads/boot/boot.svg`      200
//   · serverdən SONRA yaradılan fayl → `GET /uploads/runtime/x.svg`      404
//   · eyni fayl `next/image` ilə     → `GET /_next/image?url=…`          400
//
// Yəni istifadəçi şəkil yükləyir, `MediaAsset` sətri yaranır, feed kartı
// render olunur — və şəkil SERVER YENİDƏN BAŞLAYANA QƏDƏR açılmır. Bu, Next-in
// sənədləşmiş davranışıdır («only assets in the public directory at build time
// will be served»), TƏTBİQİN səhvi deyil, amma `dev` rejimində GÖRÜNMÜR:
// orada hər sorğuda diskə baxılır (`if (!matchedItem && opts.dev)` bloku).
//
// Bu route qatı həmin boşluğu bağlayır. Statik sürətli yol İTMİR: Next-in
// `getItem()` sıralaması `publicFolder`-i `appFile`-dan ƏVVƏL yoxlayır, yəni
// başlanğıcda mövcud olan fayllar yenə birbaşa `send` ilə verilir və bura
// yalnız start-dan SONRA yaranmış fayllar düşür.
//
// ────────────────────────────────────────────────────────────────────────────
// ⚠️ `storage.ts` TOXUNULMADI. O modul özünü «TƏK fayl sistemi girişi olan
// modul» elan edir və məqsədi S3/R2-yə keçidi tək faylla məhdudlaşdırmaqdır.
// Oxuma tərəfi ora əlavə edilsəydi imza dəyişərdi; ayrı fayl həmin müqaviləni
// pozmur, sadəcə onu TAMAMLAYIR — obyekt anbarına keçid günü hər ikisi eyni
// anda dəyişir və hər ikisi `src/services/` qatındadır (CLAUDE.md §4).
// ============================================================================

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

/**
 * 🔴 `storage.ts:52-53` ilə EYNİ dəyərlər. İki fayl arasında sabit paylaşmaq
 * üçün `storage.ts`-ə export əlavə etmək lazım gələrdi — o fayla toxunmamaq
 * qərarı verildiyinə görə dəyərlər burada təkrarlanır. Yol dəyişsə İKİSİ də
 * dəyişməlidir; `uploads-serve.test.ts` uyğunluğu qoruyur.
 */
const PUBLIC_DIR = "public";
const UPLOAD_SEGMENT = "uploads";

/**
 * Verilə bilən uzantılar → `Content-Type`.
 *
 * 🔴 SVG QƏSDƏN YOXDUR — `storage.ts:35-40` ilə eyni səbəb: SVG içində skript
 * daşıya bilir və eyni mənbədən (same-origin) verilir. `saveImage()` onsuz da
 * hər şeyi `.webp`-ə çevirir; qalan növlər yalnız köhnə faylların (əl ilə
 * qoyulmuş demo aktivləri) sınmaması üçün siyahıdadır.
 */
const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
};

/**
 * Fayl adı / qovluq adı üçün ağ siyahı.
 *
 * `storage.ts` `uploads/YYYY/MM/<cuid>.webp` və `<cuid>-thumb.webp` yazır —
 * hamısı bu şablona düşür. Ağ siyahı `..`, `/`, `\`, NUL və Unicode
 * normalizasiya hiylələrini birdəfəlik kəsir (qara siyahı yazmaqdansa).
 */
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export type UploadFile = { body: Buffer; contentType: string; size: number };

/** Yüklənmiş faylların KÖK qovluğu — `storage.ts`-dəki yazma yolu ilə eyni. */
export function uploadsRoot(): string {
  return path.join(process.cwd(), PUBLIC_DIR, UPLOAD_SEGMENT);
}

/**
 * URL seqmentlərini təhlükəsiz mütləq yola çevirir. Uyğunsuzluqda `null`.
 *
 * ⚠️ `fs.realpath` İŞLƏDİLMİR. İstehsalda `public/uploads` `/data/uploads`-a
 * SİMVOLİK KEÇİDDİR (bax `docker-entrypoint.sh`) — realpath nəticəsi kökün
 * ALTINDA olmazdı və hər sorğu yanlışlıqla rədd edilərdi. `path.resolve`
 * simvolik keçidi açmır, `..` isə onsuz da ağ siyahıda kəsilib.
 */
export function resolveUploadPath(segments: string[]): string | null {
  if (segments.length === 0 || segments.length > 8) return null;
  if (!segments.every((segment) => SAFE_SEGMENT.test(segment))) return null;

  const extension = path.extname(segments[segments.length - 1]).toLowerCase();
  if (!(extension in CONTENT_TYPES)) return null;

  const root = uploadsRoot();
  const target = path.resolve(root, ...segments);

  // Kəmərdən əlavə asqı: ağ siyahı keçsə belə nəticə kökün altında olmalıdır.
  if (target !== root && !target.startsWith(root + path.sep)) return null;

  return target;
}

/** Uzantıdan `Content-Type`. Naməlum uzantı bura HEÇ VAXT gəlmir. */
export function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

/**
 * Faylı oxuyur. Tapılmazsa / qovluqdursa / oxunmursa `null`.
 *
 * Şəkillər `saveImage()`-dən sonra ən çoxu bir neçə yüz KB olur (1600px WebP),
 * ona görə axın (stream) əvəzinə tam oxuma seçilib: `Response` üçün sadədir və
 * `Content-Length` dəqiq qoyulur.
 */
export async function readUpload(segments: string[]): Promise<UploadFile | null> {
  const filePath = resolveUploadPath(segments);
  if (!filePath) return null;

  try {
    const info = await stat(filePath);
    if (!info.isFile()) return null;

    return {
      body: await readFile(filePath),
      contentType: contentTypeFor(filePath),
      size: info.size,
    };
  } catch {
    return null;
  }
}
