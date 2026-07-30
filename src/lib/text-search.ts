// ============================================================================
// src/lib/text-search.ts
// 🔴 TƏLƏ T14 — SQLite-da hərf həssaslığı.
//
// Prisma-nın `mode: "insensitive"` seçimi SQLite provayderində DƏSTƏKLƏNMİR
// (P2009 / tip səhvi verir). `contains` isə `LIKE '%…%'`-a çevrilir və
// SQLite-ın standart `LIKE`-ı YALNIZ ASCII hərfləri üçün böyük-kiçik hərfi
// eyniləşdirir. Nəticə: "aysel" → "Aysel" tapılır, amma
//
//   "əli"   ↛ "Əli"        "şükür" ↛ "Şükür"      "ismayıl" ↛ "İsmayıl"
//
// yəni məhz azərbaycan hərfləri (Ə Ş Ğ İ Ö Ü Ç) sınır.
//
// ----------------------------------------------------------------------------
// SEÇİLƏN HƏLL: DB-də VARİANT OR-u
// ----------------------------------------------------------------------------
// Sorğu sətrindən üç variant qurulur (`az` lokalı ilə) — olduğu kimi, tam
// kiçik, tam böyük və "Baş hərf böyük" — və `contains` şərtləri OR ilə
// birləşdirilir. `LIKE` ASCII-ni onsuz da eyniləşdirdiyi üçün bu üç variant
// praktikada bütün adi yazılış hallarını (hamısı kiçik / hamısı böyük /
// adətən yazıldığı kimi) əhatə edir.
//
// NİYƏ SERVİSDƏ NORMALLAŞDIRILMIŞ MÜQAYİSƏ DEYİL: alternativ, sətirləri
// çəkib JS-də `toLocaleLowerCase("az")` ilə müqayisə etmək idi. Bu, CLAUDE.md
// §5-i pozur — JS-də filtrləmə səhifələməni sındırır (`skip`/`take` süzgəcdən
// ƏVVƏL tətbiq olunur, yəni 24-lük səhifədən 3 nəticə qalır və `total` yalan
// olur). Süzgəc DB-də qalmalıdır.
//
// ⚠️ Bilinən məhdudiyyət: "aYsEl" kimi qarışıq yazılış tapılmır. Əsl həll
// PostgreSQL-ə keçiddir — orada `mode: "insensitive"` işləyir (schema.prisma
// başlığındaki keçid qeydinə bax) və bu fayl tək sətirlik `contains`-a düşür.
//
// Modul SAFDIR (Prisma import etmir) — `where` obyektləri qurur, testlə
// örtülüdür (`text-search.test.ts`).
// ============================================================================

/**
 * Azərbaycan hərflərinin düzgün çevrilməsi üçün lokal (İ/ı fərqi).
 *
 * ⚠️ İXRAC OLUNUR, çünki `lib/geo.ts` (Blok 10B) şəhər/ölkə adlarını müqayisə
 * açarına çevirəndə MƏHZ bu lokalı işlətməlidir. İki modul öz lokalını yazsaydı
 * "İstanbul" bir yerdə `istanbul`, başqa yerdə `ıstanbul` olardı və xəritə
 * şəhəri "tanınmayan" sayardı.
 */
export const AZ_LOCALE = "az";

const LOCALE = AZ_LOCALE;

/**
 * Sorğu sətrinin hərf variantları — dublikatsız.
 * Tam ASCII sətir üçün bir neçə variant qaytarır, amma `LIKE` onları eyni
 * saydığı üçün nəticə dəyişmir; şərt bir neçə OR şaxəsi ilə böyüyür, o qədər.
 */
export function textVariants(value: string): string[] {
  const trimmed = value.trim();
  if (trimmed === "") return [];

  const lower = trimmed.toLocaleLowerCase(LOCALE);
  const upper = trimmed.toLocaleUpperCase(LOCALE);
  const capitalized =
    lower.charAt(0).toLocaleUpperCase(LOCALE) + lower.slice(1);

  return [...new Set([trimmed, lower, upper, capitalized])];
}

/** Sorğu sözlərə bölünür: "aysel məmmədova" → ["aysel", "məmmədova"]. */
export function searchTokens(query: string): string[] {
  return query.trim().split(/\s+/).filter((token) => token !== "");
}

/**
 * `{ OR: [{ field: { contains: variant } }, …] }` — bir söz, bir neçə sahə.
 *
 * Generic-dir, çünki `User`, `Post`, `Event`, `Achievement` fərqli
 * `WhereInput` tiplərinə malikdir, amma şərtin forması eynidir.
 */
export function containsAnyCase<W extends object>(
  fields: readonly string[],
  token: string,
): W {
  const variants = textVariants(token);

  return {
    OR: fields.flatMap((field) =>
      variants.map((variant) => ({ [field]: { contains: variant } })),
    ),
  } as W;
}

/**
 * Çoxsözlü axtarış: HƏR söz sahələrdən ən azı birinə uyğun gəlməlidir (AND),
 * söz daxilində isə sahələr və hərf variantları OR-lanır.
 *
 * Belə olanda "aysel məmmədova" `firstName = "Aysel"` + `lastName = "Məmmədova"`
 * sətrini tapır — tək `contains` bunu edə bilmir, çünki DB-də birləşmiş
 * "ad soyad" sütunu yoxdur.
 *
 * Sorğu boşdursa `null` qaytarır — çağıran şərti ümumiyyətlə əlavə etməsin
 * (boş obyekt `{}` bütün sətirləri seçir və bu, səhvən "filtr yoxdur" kimi
 * oxunur).
 */
export function tokenizedContains<W extends object>(
  fields: readonly string[],
  query: string,
): W | null {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return null;

  return {
    AND: tokens.map((token) => containsAnyCase<W>(fields, token)),
  } as W;
}
