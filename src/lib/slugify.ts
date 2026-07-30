// ============================================================================
// src/lib/slugify.ts
// Başlıqdan DETERMİNİSTİK slug — CMS-də «yarat» axını (Blok 12B).
//
// 🔴 DETERMİNİSTİK OLMALIDIR. Slug ictimai ünvanın bir hissəsidir
// (`/legal/<slug>`, `content-routes.ts`). Təsadüfi şəkilçi (`-a1b2`) əlavə
// etsək eyni başlıq hər dəfə fərqli ünvan verər və eyni səhifə iki dəfə
// yaradılanda bunu heç kim SEZMƏZ — dublikat sakitcə yaranar. Deterministik
// slug isə unikal indeksə çırpılır və istifadəçi xəbər tutur (P2002 →
// azərbaycanca mesaj).
//
// ⚠️ AZƏRBAYCAN HƏRFLƏRİ QATLANIR: `ə→e`, `ı→i`, `ş→s`, `ğ→g`, `ö→o`, `ü→u`,
// `ç→c`. Qatlama cədvəli `lib/text-search.ts`-dədir və TƏKRAR YAZILMIR —
// axtarış ilə slug eyni hərf qaydasını paylaşmalıdır, yoxsa biri dəyişəndə
// digəri səssizcə ayrılar.
//
// ⚠️ `İ` və `I` cədvəldə yoxdur: `toLocaleLowerCase("az")` onları `i` / `ı`-ya
// çevirir, `ı` isə cədvəldə `i`-yə düşür (bax `foldDiacritics` şərhi).
//
// ⚠️ Nəticə `admin/schemas.ts` → `slugField` regex-inə (`^[a-z0-9-]+$`) UYĞUN
// olmalıdır — `slugify.test.ts` bunu ölçür. Uyğun gəlməsə forma öz nəticəsini
// rədd edərdi.
// ============================================================================

import { foldDiacritics } from "./text-search";

/** `slugField` ilə eyni yuxarı hədd — sxem uzunluğa görə rədd etməsin. */
export const MAX_SLUG_LENGTH = 80;

/**
 * Başlığı slug-a çevirir.
 *
 * Boş nəticə (yalnız simvoldan ibarət başlıq) `""` qaytarır — çağıran tərəf
 * onu istifadəçiyə səhv kimi göstərməlidir, uydurma slug yaratmamalıdır.
 */
export function slugify(value: string): string {
  return foldDiacritics(value)
    // Hərf və rəqəm olmayan hər şey ayırıcıya çevrilir.
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    // Kəsmə defisin üstünə düşə bilər — sonluq yenidən təmizlənir.
    .replace(/-+$/g, "");
}
