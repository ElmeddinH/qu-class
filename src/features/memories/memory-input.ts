// ============================================================================
// src/features/memories/memory-input.ts
// Doğrulanmış xatirə GİRİŞİ → servis GİRİŞİ. Saf çevirmə, sıfır DB, sıfır I/O.
//
// 🔴 NİYƏ AYRICA FAYL (Blok 14C, `features/feed/post-input.ts` ilə EYNİ SƏBƏB):
// bu çevirmələr əvvəl `features/memories/actions.ts`-in İÇİNDƏ, ixrac
// olunmayan funksiyalar idi. İndi EYNİ çevirmə `/api/v1` route handler-inə də
// lazımdır — `actions.ts` isə `"use server"` faylıdır və oradan yalnız `async`
// funksiya ixrac oluna bilir (Next-in qaydası). İki nüsxə yazsaydıq,
// TƏHLÜKƏSİZLİK filtri (`toUploadPath`) yalnız birində düzələrdi.
//
// ⚠️ TƏLƏ T3 — sətir → `Date` və "" → `null` çevirməsi MƏHZ BURADA olur.
// Sxemdə `z.coerce` işlədilmir, çünki o, RHF-in sahə tiplərini dağıdır (bax
// `features/memories/schemas.ts` başlığı).
// ============================================================================

import { MemoryTypeSchema, VisibilitySchema } from "@/lib/enums";
import type { MemoryItem, MemoryWriteData } from "@/services/memory.service";

import { emptyToNull, type MemoryFieldsInput } from "./schemas";

/**
 * Yüklənmiş şəklin ünvanı həqiqətən bizim yükləmə qovluğundandırmı?
 * (`features/feed/post-input.ts` → `isUploadPath` ilə eyni səbəb: xarici ünvan
 * qəbul etsək kart başqa saytdan şəkil çəkərdi.)
 */
export function toUploadPath(value: string): string | null {
  const url = emptyToNull(value);
  if (url === null) return null;
  return url.startsWith("/uploads/") && !url.includes("..") ? url : null;
}

/**
 * Doğrulanmış forma / gövdə dəyərlərini servis girişinə çevirir.
 *
 * ⚠️ `authorId` və `cohortId` BURADA YOXDUR: müəllif viewer-dən götürülür,
 * sinif isə çağıran tərəfdən (forma sahəsi və ya `{slug}`) gəlir və servis onu
 * DB-dən yenidən yoxlayır. Bu funksiya səlahiyyət qərarı VERMİR.
 */
export function toMemoryWriteData(data: MemoryFieldsInput): MemoryWriteData {
  return {
    type: data.type,
    title: data.title,
    body: data.body,
    dedicatedTo: emptyToNull(data.dedicatedTo),
    imageUrl: toUploadPath(data.imageUrl),
    occurredAt: new Date(data.occurredAt),
    guidePlaceId: emptyToNull(data.guidePlaceId),
    visibility: data.visibility,
    showInProfile: data.showInProfile,
    showInFeed: data.showInFeed,
    showInTimeline: data.showInTimeline,
    showInYearbook: data.showInYearbook,
  };
}

/**
 * `PATCH /api/v1/memories/{id}` — QİSMƏN yeniləmə üçün birləşdirmə.
 *
 * 🔴 `updateMemory` BÜTÜN sahələri MƏCBURİ alır (`MemoryWriteData`), çünki
 * servis səthləri (`showInFeed` / `showInTimeline`) yenidən qurur və bunun
 * üçün son vəziyyəti bilməlidir. Ona görə göndərilməyən sahə CARİ dəyərdən
 * doldurulur — `?? false` / `?? ""` yazsaydıq, tək bayraq göndərən müştəri
 * xatirənin mətnini və ya digər səthlərini SƏSSİZCƏ söndürərdi (paylaşım
 * `PATCH`-i ilə eyni qərar, bax `app/api/v1/posts/[id]/route.ts`).
 *
 * ⚠️ Cari dəyərlər `MemoryItem`-dən gəlir və orada `type` / `visibility` XAM
 * SƏTİRDİR (Prisma sütunu `String`-dir, SQLite-da enum yoxdur). `*Schema.parse`
 * onları yenidən enum tipinə daraldır — `as` çevirməsi işlətmirik ki, bazada
 * qalmış naməlum dəyər səssizcə keçməsin.
 *
 * ⚠️ `TIMELINE_REQUIRES_FEED` BURADA YOXLANILMIR: birləşmiş nəticəni servis
 * onsuz da yoxlayır (`updateMemory`-nin ilk sətri) və route yalnız həmin
 * `reason`-u 422-yə çevirir. İkinci nüsxə qaydanı ikiyə bölərdi.
 */
export function mergeMemoryWriteData(
  current: MemoryItem,
  patch: Partial<MemoryFieldsInput>,
): MemoryWriteData {
  return {
    type: patch.type ?? MemoryTypeSchema.parse(current.type),
    title: patch.title ?? current.title,
    body: patch.body ?? current.body,
    dedicatedTo:
      patch.dedicatedTo === undefined
        ? current.dedicatedTo
        : emptyToNull(patch.dedicatedTo),
    imageUrl:
      patch.imageUrl === undefined ? current.imageUrl : toUploadPath(patch.imageUrl),
    occurredAt:
      patch.occurredAt === undefined ? current.occurredAt : new Date(patch.occurredAt),
    guidePlaceId:
      patch.guidePlaceId === undefined
        ? current.guidePlaceId
        : emptyToNull(patch.guidePlaceId),
    visibility: patch.visibility ?? VisibilitySchema.parse(current.visibility),
    showInProfile: patch.showInProfile ?? current.showInProfile,
    showInFeed: patch.showInFeed ?? current.showInFeed,
    showInTimeline: patch.showInTimeline ?? current.showInTimeline,
    showInYearbook: patch.showInYearbook ?? current.showInYearbook,
  };
}
