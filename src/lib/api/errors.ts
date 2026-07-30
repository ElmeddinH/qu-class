// ============================================================================
// src/lib/api/errors.ts
// `/api/v1` xəta kodlarının VAHİD MƏNBƏYİ.
//
// 🔴 NİYƏ SABİT KOD SİYAHISI: xarici inteqrasiya (mobil tətbiq, skript) xəta
// MƏTNİNƏ görə qərar verməməlidir — mətn azərbaycancadır və redaktə olunur.
// Maşın oxuyan `code` isə müqavilədir və dəyişmir. OpenAPI sənədi bu siyahını
// birbaşa `enum` kimi göstərir (`src/lib/api/openapi.ts`), yəni siyahıya yeni
// kod əlavə edilsə sənəd də dərhal yenilənir.
//
// ⚠️ `Record<ApiErrorCode, number>` tipi qəsdəndir: yeni kod əlavə edib
// `DEFAULT_ERROR_STATUS`-a yazmağı unutsan KOMPİLYASİYA sınır, ilk 500-lük
// cavabda deyil.
// ============================================================================

export const API_ERROR_CODES = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_FAILED",
  "UNSUPPORTED_MEDIA_TYPE",
  "TOO_MANY_REQUESTS",
  "INTERNAL",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const ApiErrorCode = Object.fromEntries(
  API_ERROR_CODES.map((code) => [code, code]),
) as { [K in ApiErrorCode]: K };

/**
 * Hər kodun standart HTTP statusu.
 *
 * ⚠️ `NOT_FOUND` = 404 və İCAZƏSİ OLMAYAN resurs üçün DƏ məhz bu işlədilir,
 * 403 yox: "bu resurs var, amma sənə yoxdur" cavabı mövcudluq faktını
 * sızdırır (CLAUDE.md §5 ruhu). `FORBIDDEN` yalnız ROL tələb edən əməliyyatlar
 * üçündür (koordinator paneli, moderasiya) — orada resursun mövcudluğu onsuz
 * da istifadəçiyə məlumdur.
 */
export const DEFAULT_ERROR_STATUS: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 422,
  UNSUPPORTED_MEDIA_TYPE: 415,
  TOO_MANY_REQUESTS: 429,
  INTERNAL: 500,
};

/** İstifadəçiyə göstərilən default mətnlər — azərbaycanca (CLAUDE.md §9). */
export const DEFAULT_ERROR_MESSAGE: Record<ApiErrorCode, string> = {
  UNAUTHENTICATED: "Bu əməliyyat üçün daxil olmalısınız.",
  FORBIDDEN: "Bu əməliyyat üçün icazəniz yoxdur.",
  NOT_FOUND: "Resurs tapılmadı.",
  VALIDATION_FAILED: "Göndərilən məlumat düzgün deyil.",
  UNSUPPORTED_MEDIA_TYPE: "Yalnız «application/json» məzmun tipi qəbul olunur.",
  TOO_MANY_REQUESTS: "Çox sayda cəhd edildi. Bir azdan yenidən yoxlayın.",
  INTERNAL: "Gözlənilməz xəta baş verdi.",
};

export function isApiErrorCode(value: string): value is ApiErrorCode {
  return (API_ERROR_CODES as readonly string[]).includes(value);
}
