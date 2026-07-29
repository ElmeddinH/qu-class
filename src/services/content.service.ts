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
import type { ContentSection } from "@/lib/enums";

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
