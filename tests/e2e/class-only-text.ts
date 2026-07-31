// ============================================================================
// tests/e2e/class-only-text.ts
// «CLASS məzmunu ictimai səhifəyə sızmır» testləri üçün ORTAQ NEEDLE seçicisi.
//
// 🔴 PROBLEM (Blok 13B-də tapıldı). `landing.spec.ts` və `public.spec.ts` eyni
// invariantı yoxlayır: anonim səhifədə `visibility = CLASS` paylaşımın mətni
// OLMAMALIDIR. İkisi də needle-ı gövdənin BAŞINDAN götürürdü — biri ilk
// cümləni, biri ilk 40 simvolu.
//
// Seed gövdələri sabit hovuzdan (`POST_BODIES[category]`) DÖVRƏ ilə seçilir,
// yəni eyni mətn həm `CLASS`, həm `PUBLIC` paylaşımda görünür. Gövdələr eyni
// cümlə ilə başlayıb sonda ayrıldığı üçün BAŞ fraqment praktik olaraq HEÇ VAXT
// CLASS-a məxsus olmur: təzə seed-də belə fraqment sayı **sıfırdır** və hər iki
// test `expect(needle).toBeTruthy()` mərhələsində qırılırdı.
//
// ⚠️ Testlər əvvəl yaşıl görünürdü, çünki baza TƏMİZ SEED DEYİLDİ — əvvəlki
// e2e icraları öz paylaşımlarını qoyub getmişdi və onların gövdəsi unikal idi.
// Yəni yaşıl nəticə testin işlədiyini yox, bazanın sürüşdüyünü göstərirdi.
//
// HƏLL: fraqment gövdənin BAŞINDAN yox, TAM GÖVDƏDƏN götürülür və yalnız
// `PUBLIC` gövdələrin heç birində olmayan variant qəbul edilir. Təzə seed-də
// belə gövdə **15** ədəddir, yəni seçim determinist və mənalıdır.
//
// ⚠️ HTML QAÇIŞ SİMVOLLARI. Nəticə `page.content()` (xam HTML) ilə müqayisə
// olunur; orada `<`, `>`, `&`, dırnaqlar entity-ə çevrilir və düz müqayisə
// yalançı «sızma yoxdur» verərdi. Ona görə needle yalnız TƏHLÜKƏSİZ simvol
// aralığından seçilir.
//
// ⚠️ Modul YALNIZ OXUYUR — hər iki spec faylının «yalnız oxuyur» vədi qalır.
// ============================================================================

import type { PrismaClient } from "@prisma/client";

/** HTML-də entity-ə çevrilən simvollar — needle onları DAŞIMAMALIDIR. */
const HTML_UNSAFE = /[<>&"']/;

/** Bundan qısa fraqment təsadüfən üst-üstə düşə bilər — sübut gücü yoxdur. */
const MIN_NEEDLE_LENGTH = 30;

/**
 * `PUBLIC` paylaşımların heç birində OLMAYAN `CLASS` paylaşım mətni qaytarır.
 *
 * Sıra determinsitdir (`orderBy: id`), yəni eyni seed → eyni needle.
 *
 * @throws seed-də belə mətn yoxdursa — bu, testin səssizcə atlanmasından
 *   yaxşıdır: needle tapılmırsa invariant ÜMUMİYYƏTLƏ yoxlanıla bilmir.
 */
export async function classOnlyPostText(prisma: PrismaClient): Promise<string> {
  const [classPosts, publicPosts] = await Promise.all([
    prisma.post.findMany({
      where: { visibility: "CLASS", status: "ACTIVE", body: { not: null } },
      select: { body: true },
      orderBy: { id: "asc" },
    }),
    prisma.post.findMany({
      where: { visibility: "PUBLIC", status: "ACTIVE", body: { not: null } },
      select: { body: true },
    }),
  ]);

  const publicBodies = publicPosts.map((post) => post.body as string);

  for (const post of classPosts) {
    const body = (post.body as string).trim();

    if (body.length < MIN_NEEDLE_LENGTH) continue;
    if (HTML_UNSAFE.test(body)) continue;
    // 🔴 ƏSAS ŞƏRT: eyni mətn heç bir PUBLIC paylaşımda olmamalıdır — əks
    // halda tapılan uyğunluq sızma yox, ORTAQ HOVUZ olardı.
    if (publicBodies.some((publicBody) => publicBody.includes(body))) continue;

    return body;
  }

  throw new Error(
    "Seed-də yalnız CLASS-a məxsus paylaşım mətni tapılmadı — sızma testi " +
      "yoxlanıla bilmir. Baza təzə seed-dən gəlirmi? (npx prisma db seed)",
  );
}
