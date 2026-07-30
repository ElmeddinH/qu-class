// ============================================================================
// src/lib/notification-links.ts
// Bildirişin `url` sahəsinin YOXLANMASI — SAF modul.
//
// 🔴 NİYƏ LAZIMDIR: `Notification.url` bildiriş YARADILARKƏN yazılır, yəni
// SƏTİR ölüdür — route xəritəsi sonra dəyişsə (və ya bildiriş köhnə versiyada
// yaradılıbsa) link 404-ə aparır. Bildiriş mərkəzi Blok 11A-da gəldi və
// seed-dəki sətirlərin bir hissəsi məhz belə idi (`/feed/<id>`,
// `/achievements/<id>`, `/directory/<id>` — heç biri mövcud route deyil).
//
// İKİ QAT DÜZƏLİŞ EDİLDİ və ikisi də lazımdır:
//   1. `prisma/seed.ts` — dəyərlər real ünvanlara yönəldildi (məlumat düzəlişi)
//   2. bu modul       — OXU tərəfində naməlum yol linkə ÇEVRİLMİR (davranış)
// Yalnız birincisi olsaydı istehsalda yaranan köhnə sətir yenə 404 verərdi;
// yalnız ikincisi olsaydı demo məlumatı linksiz görünərdi.
//
// ⚠️ AĞ SİYAHI, qara siyahı DEYİL. Naməlum forma linkə çevrilmir — bu, həm
// 404-ün, həm də açıq yönləndirmənin (`//evil.example.com`) qarşısını alır.
// `safeCallbackUrl` (routes.ts) eyni prinsipi giriş axınında tətbiq edir.
// ============================================================================

/**
 * Bildirişin apara biləcəyi ünvan formaları.
 *
 * ⚠️ Siyahı ROUTE XƏRİTƏSİNİ (PLAN.md §4.2) təkrarlayır. Yeni bildiriş növü
 * əlavə edən adam ünvan formasını da bura yazmalıdır — əks halda link səssizcə
 * yox olur (404 vermir, sadəcə mətn qalır) və bu, gözlə görünən davranışdır.
 *
 * `[^/]+` seqmenti: identifikator və ya slug. Sonda `/` və ya `?` gəlmir —
 * bildiriş ünvanları sadədir və sorğu parametri daşımır.
 */
const KNOWN_URL_PATTERNS: readonly RegExp[] = [
  /^\/home$/,
  /^\/notifications$/,
  /^\/search$/,
  /^\/me(\/(edit|privacy|career))?$/,
  /^\/u\/[^/]+$/,
  /^\/events\/[^/]+$/,
  /^\/class\/[^/]+$/,
  /^\/class\/[^/]+\/(feed|directory|timeline|achievements|memories|yearbook|support|events|map|incoming)$/,
  /^\/admin(\/[^/]+)?$/,
  /^\/khankendi(\/[^/]+)?$/,
  /^\/faculties(\/[^/]+)?$/,
];

/**
 * Bildiriş linki göstərilə bilərmi?
 *
 * Şərtlər: dəyər var, sayt daxilində MÜTLƏQ yoldur (`/` ilə başlayır, `//`
 * ilə YOX — o, protokolsuz XARİCİ ünvandır) və tanınan formalardan birinə
 * uyğun gəlir.
 */
export function isKnownNotificationUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (!url.startsWith("/") || url.startsWith("//")) return false;

  return KNOWN_URL_PATTERNS.some((pattern) => pattern.test(url));
}

/** Göstərilə bilən link, yoxsa `null` (kart mətn kimi qalır). */
export function safeNotificationUrl(url: string | null | undefined): string | null {
  return isKnownNotificationUrl(url) ? (url as string) : null;
}
