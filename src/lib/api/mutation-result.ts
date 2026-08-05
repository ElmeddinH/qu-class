// ============================================================================
// src/lib/api/mutation-result.ts
// SERVİS NƏTİCƏSİ → HTTP CAVABI. `/api/v1`-in yazma əməliyyatlarının TƏK
// tərcümə nöqtəsi.
//
// 🔴 PROBLEM: servislər HTTP bilmir və bilməməlidir. Onlar
// `{ ok: false, reason: "NOT_A_MEMBER" }` qaytarır — bu, DOMEN dilidir və
// Server Action da, REST route da eyni nəticəni oxuyur. Route-un işi həmin
// səbəbi status koduna çevirməkdir. Əgər hər route bunu ÖZÜ etsə:
//   · biri `FORBIDDEN`-ə 403, digəri 404 verər → müqavilə pozulur,
//   · yeni `reason` əlavə olunanda route-lar onu tanımaz və `undefined`
//     status ilə 500 qaytarar — SƏSSİZ nasazlıq.
//
// 🔴 HƏLL: TƏK xəritə + `satisfies Record<MutationFailureReason, …>`.
// `satisfies` seçimi qəsdəndir: `Record<…>` kimi ANNOTASİYA yazsaydıq
// xəritənin dəyər tipləri genişlənərdi (`code: ApiErrorCode`), `satisfies` isə
// həm TAM ƏHATƏNİ məcbur edir, həm də literal tipləri saxlayır. Yəni
// `post.service.ts`-ə yeni `reason` əlavə edən adam `npx tsc --noEmit`-də
// DAYANDIRILIR, ilk 500-lük cavabda deyil.
//
// ⚠️ Səbəblərin siyahısı BURADA TƏKRAR YAZILMIR — üç servisin `*MutationFailure`
// birləşməsindən TÖRƏYİR. Servis siyahını dəyişəndə bu fayl avtomatik ondan
// xəbər tutur (`Omit`/`Exclude` yoxdur, sadə birləşmə).
//
// ---------------------------------------------------------------------------
// 🔴 STATUS SEÇİMLƏRİ — hər biri MƏXFİLİK qərarıdır, üslub məsələsi deyil
// ---------------------------------------------------------------------------
//
// `NOT_A_MEMBER` → **404**, 403 YOX.
//   "Bu sinif var, amma sən üzv deyilsən" cavabı sinfin MÖVCUDLUĞUNU sızdırır
//   və hücumçu slug-ları sıralayıb real sinifləri siyahılaya bilər. `lib/api/
//   cohort-scope.ts` eyni qərarı verir — iki qapı EYNİ cavabı verməlidir,
//   yoxsa fərqin özü siqnal olur.
//
// `FORBIDDEN` → **403**, AMMA yalnız GÖRÜNÜRLÜK QAPISINDAN SONRA.
//   🔴 BU, BLOKUN ƏN İNCƏ YERİDİR. `updatePostSurfaces` və `deletePost`
//   post-u `findUnique({ where: { id } })` ilə oxuyur — orada `activeVisibleWhere`
//   YOXDUR (onların işi sahiblik yoxlamaqdır, görünürlük yox). Yəni route
//   birbaşa servisi çağırsaydı:
//       · mövcud olmayan id  → NOT_FOUND → 404
//       · BAŞQA sinfin CLASS postu → FORBIDDEN → 403
//   fərqi yaranardı və 403/404 fərqi MÖVCUDLUQ ORAKULUNA çevrilərdi.
//   Ona görə `posts/[id]/route.ts` PATCH və DELETE-dən ƏVVƏL `getPost(viewer,
//   id)` çağırır (servis, təkrar filtr DEYİL) və görünməyən post üçün 404
//   verir. Bundan sonra `FORBIDDEN` yalnız "postu GÖRÜRSƏN, amma müəllifi
//   deyilsən" mənasını daşıyır — mövcudluq viewer-ə onsuz da məlumdur və
//   `errors.ts`-in qaydası ("403 yalnız rol/sahiblik qapılarında") tam ödənir.
//
//   ⚠️ 14C ÜÇÜN ŞƏRT: memories və events endpoint-ləri bu xəritəni işlədəndə
//   EYNİ nümunəni saxlamalıdır — yazma əməliyyatından əvvəl görünürlük qapısı
//   (`getMemory` / `getEvent`). Qapısız route-da `FORBIDDEN` yenidən sızmaya
//   çevrilir və xəritə bunu KOMPİLYASİYA ilə tuta bilmir.
//
// `*_NOT_FOUND` / `*_REQUIRED` / `INVALID_DATES` → **422**.
//   Bunlar GÖNDƏRİLƏN GÖVDƏNİN qüsurlarıdır, ünvanlanan resursun yox:
//   `referencedEventId` görünməyən tədbirə işarə edirsə cavab 404 olsaydı
//   müştəri "paylaşım tapılmadı" deyə anlayardı. 422 + `details` düzgün
//   sahəni göstərir. ⚠️ Sızma yoxdur: MÖVCUD OLMAYAN və GÖRÜNMƏYƏN tədbir
//   EYNİ 422-ni alır.
//
// RSVP rədləri (`EVENT_CLOSED` · `REGISTRATION_CLOSED` · `EVENT_FINISHED`)
//   → **409**, kod `VALIDATION_FAILED`.
//   Gövdə düzgündür, RESURSUN VƏZİYYƏTİ imkan vermir — 409 məhz budur.
//   ⚠️ `API_ERROR_CODES`-a yeni `CONFLICT` kodu ƏLAVƏ EDİLMƏDİ: layihədə 409
//   üçün artıq nümunə var — `auth/register` təkrar e-poçtda
//   `fail("VALIDATION_FAILED", { status: 409 })` qaytarır. İkinci bir kod
//   əlavə etsək eyni statusun iki maşın-oxunan adı olardı və mövcud müştərilər
//   köhnə adı gözləməyə davam edərdi.
//
// ⚠️ MESAJLAR SERVER ACTION MESAJLARINDAN FƏRQLİDİR — qəsdən.
// `features/feed/actions.ts` → `FAILURE_MESSAGES` formada göstərilir və
// istifadəçiyə kömək edir ("Bu sinifdə paylaşım etmək üçün üzv olmalısınız").
// API-də həmin mətn 404-ün gizlətdiyini AÇIQLAYARDI. Burada mesaj statusdan
// ARTIQ heç nə demir.
// ============================================================================

import type { EventMutationFailure } from "@/services/event.service";
import type { MemoryMutationFailure } from "@/services/memory.service";
import type { PostMutationFailure } from "@/services/post.service";

import type { ApiErrorCode } from "./errors";
import { fail } from "./respond";

/**
 * Yazma servislərinin qaytardığı BÜTÜN səbəblər.
 *
 * ⚠️ `EventMutationFailure` `RsvpRejection`-u da (`lib/rsvp.ts`) daxil edir —
 * ayrıca sadalamağa ehtiyaq yoxdur.
 */
export type MutationFailureReason =
  | PostMutationFailure
  | MemoryMutationFailure
  | EventMutationFailure;

export interface MutationErrorMapping {
  code: ApiErrorCode;
  /** Kodun default statusundan FƏRQLİ olduqda (məs. 409). */
  status?: number;
  /** İstifadəçiyə göstərilən mətn — statusdan artıq məlumat verməməlidir. */
  message: string;
}

/**
 * `reason` → cavab. `satisfies` TAM ƏHATƏNİ məcbur edir.
 *
 * 🔴 Bu obyektə açar əlavə etməyi UNUTMAQ mümkün deyil: servisə yeni `reason`
 * yazılan anda `satisfies` sınır. Səssiz 500 yolu bağlıdır.
 */
export const MUTATION_ERROR_MAP = {
  // --- Görünürlük qapısı → 404 ---
  NOT_FOUND: {
    code: "NOT_FOUND",
    message: "Resurs tapılmadı və ya artıq silinib.",
  },
  NOT_A_MEMBER: {
    // ⚠️ 403 DEYİL — `cohort-scope.ts` ilə eyni cavab (mövcudluq sızmasın).
    code: "NOT_FOUND",
    message: "Sinif tapılmadı.",
  },

  // --- Sahiblik / rol qapısı → 403 (yalnız görünürlükdən sonra) ---
  FORBIDDEN: {
    code: "FORBIDDEN",
    message: "Bu əməliyyat üçün icazəniz yoxdur.",
  },

  // --- Gövdənin qüsurları → 422 ---
  EVENT_NOT_FOUND: {
    code: "VALIDATION_FAILED",
    message: "Göstərilən tədbir tapılmadı.",
  },
  ACHIEVEMENT_DETAILS_REQUIRED: {
    code: "VALIDATION_FAILED",
    message: "Nailiyyət üçün kateqoriya, ad və tarix göndərilməlidir.",
  },
  PLACE_NOT_FOUND: {
    code: "VALIDATION_FAILED",
    message: "Göstərilən məkan tapılmadı.",
  },
  TIMELINE_REQUIRES_FEED: {
    // Xatirə xronologiyaya yalnız lentdə də paylaşılırsa düşə bilir.
    code: "VALIDATION_FAILED",
    message: "Xronologiyaya əlavə etmək üçün xatirə lentdə də paylaşılmalıdır.",
  },
  COHORT_REQUIRED: {
    code: "VALIDATION_FAILED",
    message: "Bu əməliyyat üçün tədbir bir sinfə bağlı olmalıdır.",
  },
  FACULTY_REQUIRED: {
    code: "VALIDATION_FAILED",
    message: "Fakültə səviyyəli tədbir üçün fakültə seçilməlidir.",
  },
  INVALID_DATES: {
    code: "VALIDATION_FAILED",
    message: "Tədbirin bitmə vaxtı başlama vaxtından əvvəl ola bilməz.",
  },

  // --- Resursun VƏZİYYƏTİ imkan vermir → 409 ---
  EVENT_CLOSED: {
    code: "VALIDATION_FAILED",
    status: 409,
    message: "Tədbir qeydiyyata açıq deyil.",
  },
  REGISTRATION_CLOSED: {
    code: "VALIDATION_FAILED",
    status: 409,
    message: "Qeydiyyat müddəti bitib.",
  },
  EVENT_FINISHED: {
    code: "VALIDATION_FAILED",
    status: 409,
    message: "Tədbir artıq başa çatıb.",
  },
} satisfies Record<MutationFailureReason, MutationErrorMapping>;

/**
 * Servisin `reason`-unu hazır HTTP cavabına çevirir.
 *
 * ```ts
 * const result = await deletePost(viewer, params.id);
 * if (!result.ok) return failMutation(result.reason);
 * return noContent();
 * ```
 */
export function failMutation(reason: MutationFailureReason) {
  const mapping: MutationErrorMapping = MUTATION_ERROR_MAP[reason];

  return fail(mapping.code, {
    message: mapping.message,
    ...(mapping.status === undefined ? {} : { status: mapping.status }),
  });
}
