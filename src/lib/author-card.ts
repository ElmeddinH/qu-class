// ============================================================================
// src/lib/author-card.ts
// «Müəllif kartı» — ad, soyad və REDAKSİYADAN KEÇMİŞ profil şəkli.
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 TƏLƏ T40 — `redactProfile` YALNIZ ÇAĞIRILDIĞI YERDƏ İŞLƏYİR
// ────────────────────────────────────────────────────────────────────────────
// `avatarUrl` `CONTROLLED_PROFILE_FIELDS`-in üzvüdür (`lib/visibility.ts`):
// istifadəçi `/me/privacy` panelindən onu `PRIVATE` edə bilir. Amma bu sahə
// `User` cədvəlində qalır və «müəllif kartı» formasında DOQQUZ ayrı sorğuda
// təkrarlanır — lent, şərh, xatirə, məkan xatirəsi, nailiyyət, tədbir, tədbir
// əlaqələndiricisi, bildiriş, admin cədvəli.
//
// Blok 12A auditində onların səkkizi redaksiyadan KEÇMİRDİ, yəni ayar
// praktikada heç bir yerdə işləmirdi (CLAUDE.md: «həmin məxfilik açarı
// SƏSSİZCƏ işləmir — bu, ən təhlükəli səhv növüdür»).
//
// Bu modul həmin təkrarı BİR yerə yığır:
//   · `AUTHOR_SELECT`  — sorğunun `select`-i (avatar + üzvlük + sahə səviyyələri)
//   · `toAuthorCard()` — sətri `redactProfile`-dan keçirən çevirici
//
// 🔴 QAYDA: istifadəçi kartı qaytaran yeni `select` yazırsansa xam
// `avatarUrl: true` YAZMA — `AUTHOR_SELECT`-i işlət və nəticəni
// `toAuthorCard(row, viewer)`-dən keçir.
//
// ⚠️ SAF MODULDUR: `prisma` və React importu yoxdur (`directory-filters.ts` ilə
// eyni səbəb — məxfilik qaydası bazasız, süni sətirlərlə sınana bilməlidir).
// `AUTHOR_SELECT` adi obyekt literalıdır; çağıran tərəf onu `satisfies
// Prisma.UserSelect` ilə tiplə bağlayır.
//
// ⚠️ AD-SOYAD REDAKSİYAYA TABE DEYİL və burada da elə qalır: mühərrik onu heç
// vaxt gizlətmir (platformanın işləməsi üçün minimum — `redactProfile` şərhi).
// Şəkil gizlədiləndə UI baş hərflərə düşür (`AvatarFallback`).
//
// ⚠️ `fieldVisibility` TAM seçilir, `where: { field: "avatarUrl" }` ilə
// DARALDILMIR. Səbəb: kimsə sabahı gün karta ikinci idarə olunan sahə əlavə
// etsə (məs. `bio` önizləməsi), daraldılmış dəst həmin sahə üçün sətir
// tapmazdı və `redactProfile` `defaultLevelFor()`-a düşərdi — yəni real
// səviyyədən DAHA AÇIQ davranardı. Tam dəst fail-closed istiqamətdədir.
// ============================================================================

import { redactProfile, type ProfileView, type Viewer } from "@/lib/visibility";

/** Sorğunun qaytarmalı olduğu XAM forma. */
export interface AuthorRow {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  /** Sahibin üzvlükləri — `redactProfile`-ın `sharesClass` hesablaması üçün. */
  memberships: Array<{ cohortId: string }>;
  fieldVisibility: Array<{ field: string; level: string }>;
}

/** İstifadəçiyə qaytarılan forma: kimlik qalır, şəkil şərtidir. */
export interface AuthorCard {
  id: string;
  firstName: string;
  lastName: string;
  /** İdarə olunan sahə — gizlədilibsə `null` (UI baş hərfləri göstərir). */
  avatarUrl: string | null;
}

/**
 * Müəllif kartı üçün Prisma `select`.
 *
 * İstifadə:
 *   author: { select: AUTHOR_SELECT }   // `satisfies Prisma.PostSelect` altında
 */
export const AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  memberships: { select: { cohortId: true } },
  fieldVisibility: { select: { field: true, level: true } },
} as const;

/**
 * Xam sətri redaksiyadan keçmiş kartа çevirir.
 *
 * `redactProfile` gizlədilmiş sahəni obyektdən TAMAMİLƏ silir (null qoymur),
 * ona görə nəticə `?? null` ilə normallaşdırılır: çıxış tipi sabit qalsın,
 * amma dəyər getsin.
 */
export function toAuthorCard(row: AuthorRow, viewer: Viewer): AuthorCard {
  const view: ProfileView = {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    cohortIds: row.memberships.map((membership) => membership.cohortId),
    avatarUrl: row.avatarUrl,
  };

  const redacted = redactProfile(view, viewer, row.fieldVisibility);

  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    avatarUrl: (redacted.avatarUrl as string | null | undefined) ?? null,
  };
}

/** `AuthorRow | null` üçün qısayol — `Event.contact` kimi ixtiyari əlaqələr. */
export function toAuthorCardOrNull(
  row: AuthorRow | null,
  viewer: Viewer,
): AuthorCard | null {
  return row === null ? null : toAuthorCard(row, viewer);
}
