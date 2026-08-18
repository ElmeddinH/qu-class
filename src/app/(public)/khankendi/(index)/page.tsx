// ============================================================================
// src/app/(public)/khankendi/page.tsx
// /khankendi — Xankəndi bələdçisi [M3] (spec §3).
//
// Səhifə NAZİKDİR (CLAUDE.md §8): URL-i `parseGuideParams` ilə oxuyur, sorğunu
// `content.service`-ə verir, render `features/guide`-dədir.
//
// ⚠️ İCTİMAİ SƏHİFƏ — `getViewer()` YOXDUR. `listGuidePlaces` `Viewer` almır
// (redaksiya məzmunu). Səhifədəki yeganə istifadəçi məzmunu MƏKAN
// XATİRƏLƏRİDİR və o, detal səhifəsindəki `PlaceMemories` komponentindədir;
// həmin komponent viewer-i özü qurur və məxfilik şərtindən keçir.
//
// ⚠️ `force-dynamic` — kateqoriya filtri URL-dədir və məzmun DB-dən gəlir.
// ============================================================================

import type { Metadata } from "next";

import { GuideDirectory } from "@/features/guide/GuideDirectory";
import { parseGuideParams } from "@/lib/guide-filters";
import { listGuidePlaces } from "@/services/content.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Xankəndi bələdçisi — QU CLASS",
  description:
    "Yeni tələbələr üçün Xankəndi: nəqliyyat, universitetə gediş yolları, marketlər, sağlamlıq, mədəniyyət və təcili əlaqə məlumatları.",
};

interface GuidePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function KhankendiPage({ searchParams }: GuidePageProps) {
  // Naməlum kateqoriya 404 vermir — filtr sadəcə nəzərə alınmır.
  const filters = parseGuideParams(await searchParams);
  const places = await listGuidePlaces(filters.category ?? undefined);

  return <GuideDirectory places={places} filters={filters} />;
}
