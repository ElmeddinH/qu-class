// ============================================================================
// src/app/uploads/[...path]/route.ts
// GET /uploads/** — istifadəçi yükləmələrinin EHTİYAT verilmə yolu.
//
// 🔴 Bu route ADƏTƏN İŞƏ DÜŞMÜR və bu, qəsdəndir. Next.js `getItem()`
// sıralamasında `publicFolder` `appFile`-dan ƏVVƏLDİR, yəni server
// başlayanda `public/uploads` altında mövcud olan hər fayl yenə birbaşa
// statik olaraq (`send`, sıfır JS) verilir. Bura YALNIZ serverin start-ından
// SONRA yaradılmış fayllar düşür — yəni məhz canlı yükləmələr.
//
// Səbəb və ölçmə: `src/services/uploads-serve.ts` başlığı.
//
// ⚠️ AUTENTİFİKASİYA YOXDUR — bu, mövcud davranışın QORUNMASIDIR, yeni
// qərar deyil. Fayllar indiyədək `public/` altından anonim verilirdi; adlar
// cuid-dir (`storage.ts:88`), yəni təxminlə tapılmır. Məxfilik səviyyəsi
// MƏZMUNA (`Post`, `Memory`) tətbiq olunur — şəkil ünvanını görmək üçün
// əvvəlcə həmin məzmunu görmək lazımdır. Ünvan sızsa fayl açılır; bu, `public/`
// qovluğunun ilk gündən verdiyi zəmanətdir və burada dəyişdirilmir.
// Dəyişdirilsəydi seed məzmunu və `next/image` keşi ilə uyğunsuzluq yaranardı.
// ============================================================================

import { readUpload } from "@/services/uploads-serve";

/**
 * `force-dynamic` MƏCBURİDİR: fayl dəsti runtime-da dəyişir. Statik render
 * build anındakı vəziyyəti dondurardı — problemin ÖZÜ elə budur.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path: segments } = await params;
  const file = await readUpload(segments);

  if (!file) {
    return new Response(null, { status: 404 });
  }

  return new Response(new Uint8Array(file.body), {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      // Fayl adı məzmunla birlikdə dəyişir (cuid) → əbədi keş təhlükəsizdir
      // və statik yolun (`send`) qoyduğu başlıqla eynidir.
      "Cache-Control": "public, max-age=31536000, immutable",
      // Brauzer MIME-ı təxmin etməsin: siyahı `uploads-serve.ts`-dədir.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
