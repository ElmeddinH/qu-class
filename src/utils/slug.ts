// ============================================================================
// src/utils/slug.ts
// Azərbaycanca mətndən ASCII fayl adı / slug.
//
// NİYƏ LAZIMDIR: endirilən faylların adı (`.ics`, `.csv`) ASCII olmalıdır —
// `Content-Disposition`-un `filename` parametri qeyri-ASCII simvolları
// `filename*` (RFC 5987) olmadan dəstəkləmir və brauzerlərin bir hissəsi adı
// zibilə çevirir.
//
// ⚠️ SADƏCƏ QEYRİ-ASCII SİMVOLLARI ATMAQ AZDIR: "Görüş" → "g-r" olardı, yəni
// tanınmaz. Ona görə azərbaycan hərfləri ƏVVƏLCƏ ASCII qarşılığına çevrilir
// ("Görüş" → "gorus").
//
// ⚠️ Bu, URL slug-ı DEYİL və `Cohort.slug` / `Club.slug` üçün İŞLƏDİLMİR —
// onlar DB-də saxlanılan sabit dəyərlərdir və seed-dən gəlir. Bu funksiya
// yalnız birdəfəlik fayl adları üçündür.
// ============================================================================

/** Azərbaycan əlifbasının ASCII qarşılığı (kiçik hərflər — çevirmə əvvəl gəlir). */
const TRANSLITERATION: Record<string, string> = {
  ə: "e",
  ğ: "g",
  ı: "i",
  ö: "o",
  ü: "u",
  ç: "c",
  ş: "s",
  // `İ` kiçildikdə "i̇" (i + birləşən nöqtə) verir — nöqtə ayrıca kod
  // nöqtəsidir və aşağıdakı ümumi süzgəc onu onsuz da atır.
};

export function asciiSlug(value: string, maxLength: number): string {
  const lower = value.toLocaleLowerCase("az");

  let out = "";
  for (const char of lower) {
    out += TRANSLITERATION[char] ?? char;
  }

  return out
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    // Kəsmə hərfin ortasında defis buraxa bilər.
    .replace(/-+$/g, "");
}
