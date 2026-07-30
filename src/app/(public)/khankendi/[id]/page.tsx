// ============================================================================
// src/app/(public)/khankendi/[id]/page.tsx
// /khankendi/[id] — məkan detalı [M3] + sinif xatirələri (M9 ↔ M3).
//
// ⚠️ Tapılmayan `id` → `notFound()` (404). Bələdçi kataloqu tamamilə ictimaidir,
// yəni mövcudluğu gizlətmək məsələsi yoxdur (`lib/api/cohort-scope.ts`-dəki
// 404/403 qaydası SİNİF məzmununa aiddir).
//
// 🔴 Səhifə İCTİMAİDİR, amma içindəki `PlaceMemories` MƏXFİLİK ŞƏRTİNDƏN keçir:
// komponent `getViewer()` çağırır və `listMemoriesForPlace` `activeVisibleWhere`
// tətbiq edir. Anonim ziyarətçi yalnız `PUBLIC` xatirələri görür
// (`features/guide/GuidePlaceDetail.tsx` başlığına bax).
//
// ⚠️ `force-dynamic` — səhifənin bir hissəsi (xatirələr) VIEWER-dən asılıdır,
// yəni statik render iki fərqli istifadəçiyə eyni HTML-i verərdi (TƏLƏ T5).
// ============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GuidePlaceDetail } from "@/features/guide/GuidePlaceDetail";
import { GuideCategorySchema } from "@/lib/enums";
import { getGuidePlace, listGuidePlaces } from "@/services/content.service";

export const dynamic = "force-dynamic";

/** Yan panelde göstərilən «qonşu məkan» sayı. */
const RELATED_LIMIT = 3;

interface PlacePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PlacePageProps): Promise<Metadata> {
  const { id } = await params;
  const place = await getGuidePlace(id);

  if (!place) return { title: "Məkan tapılmadı — QU CLASS" };

  return {
    title: `${place.title} — Xankəndi bələdçisi`,
    // Təsvir uzun ola bilər; meta üçün ilk cümlə kifayətdir.
    description: place.description.slice(0, 160),
  };
}

export default async function Page({ params }: PlacePageProps) {
  const { id } = await params;
  const place = await getGuidePlace(id);

  if (!place) notFound();

  // Eyni kateqoriyadaki digər məkanlar. ⚠️ DB sütunu `String`-dir, yəni
  // naməlum dəyər gələ bilər — `safeParse` ilə yoxlanılır, əks halda sorğu
  // boş qayıdır və "qonşu yoxdur" görünür (sınmır).
  const parsedCategory = GuideCategorySchema.safeParse(place.category);
  const sameCategory = parsedCategory.success
    ? await listGuidePlaces(parsedCategory.data, RELATED_LIMIT + 1)
    : [];

  const related = sameCategory.filter((item) => item.id !== place.id).slice(0, RELATED_LIMIT);

  return <GuidePlaceDetail place={place} related={related} />;
}
