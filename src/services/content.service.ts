// ============================================================================
// src/services/content.service.ts
// Redaksiya məzmunu (`ContentPage`) sorğuları — Welcome Page (spec §2) və
// Incoming rejimindəki "kampusa hazırlıq" materialları (spec §16).
//
// Bu qat İCTİMAİDİR və `academic.service.ts` ilə eyni səbəbdən `Viewer`
// ALMIR: `ContentPage` universitetin redaksiya məzmunudur, şəxsi məlumat
// daşımır. Məxfilik mühərriki istifadəçi məzmununa (Post / Memory /
// Achievement / Event / profil) aiddir.
//
// Yeganə süzgəc redaksiya vəziyyətidir: `isPublished`. Qaralama səhifə heç
// kimə göstərilmir (admin redaktə ekranı Blok 11-dədir və öz sorğusunu yazır).
// ============================================================================

import { prisma } from "@/lib/db";
import type { ContentSection, FaqCategory, GuideCategory } from "@/lib/enums";

export interface ContentPageCard {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  section: string;
  updatedAt: Date;
}

const CONTENT_PAGE_LIMIT = 12;

/**
 * Bölmə üzrə dərc olunmuş səhifələr — redaksiya sırası ilə (`order`, sonra ad).
 *
 * ⚠️ `body` (Markdown) QƏSDƏN seçilmir: kart siyahısı üçün lazım deyil və
 * səhifə başına bir neçə KB mətn deməkdir. Tam mətn `getContentPage`-dədir.
 */
export async function listContentPages(
  section: ContentSection,
  take: number = CONTENT_PAGE_LIMIT,
): Promise<ContentPageCard[]> {
  return prisma.contentPage.findMany({
    where: { section, isPublished: true },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    take,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverUrl: true,
      section: true,
      updatedAt: true,
    },
  });
}

// ---------------------------------------------------------------------------
// FAQ (spec §2, açılış səhifəsinin akkordeonu)
// ---------------------------------------------------------------------------

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
}

const FAQ_LIMIT = 30;

/**
 * Dərc olunmuş suallar — redaksiya sırası ilə.
 *
 * `listContentPages` ilə eyni səbəbdən `Viewer` ALMIR: FAQ universitetin
 * redaksiya məzmunudur. Yeganə süzgəc `isPublished`-dir.
 */
export async function listFaqs(
  category?: FaqCategory,
  take: number = FAQ_LIMIT,
): Promise<FaqItem[]> {
  return prisma.faq.findMany({
    where: { isPublished: true, ...(category ? { category } : {}) },
    orderBy: [{ order: "asc" }, { question: "asc" }],
    take,
    select: { id: true, question: true, answer: true, category: true, order: true },
  });
}

// ---------------------------------------------------------------------------
// Xankəndi bələdçisi (spec §3)
// ---------------------------------------------------------------------------

export interface GuidePlaceItem {
  id: string;
  category: string;
  title: string;
  description: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  phone: string | null;
  openingHours: string | null;
  websiteUrl: string | null;
  isEmergency: boolean;
  order: number;
}

const GUIDE_PLACE_LIMIT = 40;

/**
 * Bələdçi yazıları — kateqoriya üzrə süzülə bilər.
 *
 * ⚠️ `address` / `latitude` / `longitude` BURADA QAYTARILIR və bu, məxfilik
 * qaydasının pozulması DEYİL. CLAUDE.md-dəki "ictimai görünüşdə dəqiq
 * ünvan/koordinat heç vaxt göstərilmir" qaydası İSTİFADƏÇİ məkanına aiddir
 * (Where Are We Now aqreqasiyası, `coarsenLocation`). `GuidePlace` isə şəhərin
 * İCTİMAİ obyektidir — aptek, market, avtobus dayanacağı — və ünvanı bələdçinin
 * bütün mənasıdır (spec §3 xəritə görünüşü tələb edir).
 */
export async function listGuidePlaces(
  category?: GuideCategory,
  take: number = GUIDE_PLACE_LIMIT,
): Promise<GuidePlaceItem[]> {
  return prisma.guidePlace.findMany({
    where: category ? { category } : {},
    // Təcili əlaqələr önə çıxır (spec §3: təhlükəsizlik / təcili məlumat).
    orderBy: [{ isEmergency: "desc" }, { order: "asc" }, { title: "asc" }],
    take,
    select: {
      id: true,
      category: true,
      title: true,
      description: true,
      address: true,
      latitude: true,
      longitude: true,
      imageUrl: true,
      phone: true,
      openingHours: true,
      websiteUrl: true,
      isEmergency: true,
      order: true,
    },
  });
}
