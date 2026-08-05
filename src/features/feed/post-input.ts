// ============================================================================
// src/features/feed/post-input.ts
// Doğrulanmış lent GİRİŞİ → servis GİRİŞİ. Saf çevirmə, sıfır DB, sıfır I/O.
//
// 🔴 NİYƏ AYRICA FAYL (Blok 14B): bu çevirmələr əvvəl `features/feed/
// actions.ts`-in İÇİNDƏ, ixrac olunmayan funksiyalar idi. Blok 14B-də EYNİ
// çevirmə `/api/v1` route handler-inə də lazım oldu — `actions.ts` isə
// `"use server"` faylıdır və oradan yalnız `async` funksiya ixrac oluna bilir
// (Next-in qaydası). İki nüsxə yazsaydıq, TƏHLÜKƏSİZLİK filtri (`isUploadPath`)
// yalnız birində düzələrdi.
//
// ⚠️ TƏLƏ T3 — sətir → `Date` və "" → `null` çevirməsi MƏHZ BURADA olur.
// Sxem tərəfində `z.coerce` işlədilmir, çünki o, RHF-in sahə tiplərini dağıdır
// (bax `features/feed/schemas.ts` başlığı).
//
// ⚠️ `cohortId` PARAMETRDİR, girişdən oxunmur: Server Action onu formadan
// (`data.cohortId`), REST route isə YOLDAN (`/cohorts/{slug}/…` → həll olunmuş
// `scope.cohort.id`) verir. Hər iki halda servis üzvlüyü DB-dən yenidən
// yoxlayır — dəyər müştəriyə etibar edilərək işlədilmir.
// ============================================================================

import { PostKind } from "@/lib/enums";
import type { CreatePostData, MediaAssetData } from "@/services/post.service";

import type { AchievementFanoutInput } from "./fanout";
import {
  emptyToNull,
  type AchievementDetailsInput,
  type MediaAssetInput,
  type PostContentInput,
} from "./schemas";

/**
 * Yüklənmiş şəklin ünvanı həqiqətən bizim yükləmə qovluğundandırmı?
 *
 * Media obyektləri müştəridən gəlir (`/api/upload` cavabı formada saxlanılır),
 * yəni ixtiyari `url` göndərilə bilər. Xarici ünvan qəbul etsək lent kartı
 * başqa saytdan şəkil çəkərdi (izləmə pikseli, qarışıq məzmun). Yalnız
 * `/uploads/` ilə başlayan nisbi yol keçir.
 */
export function isUploadPath(url: string): boolean {
  return url.startsWith("/uploads/") && !url.includes("..");
}

export function toMediaData(media: MediaAssetInput[]): MediaAssetData[] {
  return media
    .filter((asset) => isUploadPath(asset.url))
    .map((asset, index) => ({
      url: asset.url,
      thumbUrl: emptyToNull(asset.thumbUrl),
      type: asset.type,
      mimeType: emptyToNull(asset.mimeType),
      sizeBytes: asset.sizeBytes,
      width: asset.width,
      height: asset.height,
      caption: emptyToNull(asset.caption),
      // Sıra formadakı MÖVCUD ardıcıllıqdan götürülür — müştərinin göndərdiyi
      // `order` dəyərinə güvənilmir (təkrar və boşluq ola bilər).
      order: index,
    }));
}

/**
 * Inline nailiyyət formunu servis girişinə çevirir.
 * `null` qaytarır → nailiyyət tələb olunmur (sxem bunu artıq yoxlayıb).
 */
export function toAchievementInput(
  details: AchievementDetailsInput,
  required: boolean,
): AchievementFanoutInput | null {
  if (!required || !details.category) return null;

  return {
    category: details.category,
    title: details.title,
    organization: emptyToNull(details.organization),
    awardedAt: new Date(details.awardedAt),
    proofUrl: emptyToNull(details.proofUrl),
  };
}

/**
 * Doğrulanmış paylaşım girişini `createPost()` arqumentinə çevirir.
 *
 * ⚠️ `authorId` BURADA YOXDUR və olmamalıdır — müəllif viewer-dən götürülür
 * (servisin işi). Bu funksiya müştəri məlumatını yalnız NORMALLAŞDIRIR,
 * səlahiyyət qərarı VERMİR.
 */
export function toCreatePostData(
  input: PostContentInput,
  cohortId: string,
): CreatePostData {
  const needsAchievement =
    input.kind === PostKind.ACHIEVEMENT || input.showInAchievements;

  return {
    cohortId,
    category: input.category,
    kind: input.kind,
    visibility: input.visibility,
    body: emptyToNull(input.body),
    occurredAt: new Date(input.occurredAt),
    linkUrl: emptyToNull(input.linkUrl),
    linkTitle: emptyToNull(input.linkTitle),
    linkImage: emptyToNull(input.linkImage),
    referencedEventId: emptyToNull(input.referencedEventId),
    showOnTimeline: input.showOnTimeline,
    showInAchievements: input.showInAchievements,
    media: toMediaData(input.media),
    achievement: toAchievementInput(input.achievement, needsAchievement),
    memory:
      input.kind === PostKind.MEMORY && input.memory.type
        ? {
            type: input.memory.type,
            title: input.memory.title,
            body: input.memory.body,
            dedicatedTo: emptyToNull(input.memory.dedicatedTo),
          }
        : null,
  };
}
