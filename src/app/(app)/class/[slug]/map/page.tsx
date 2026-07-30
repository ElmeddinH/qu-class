// ============================================================================
// src/app/(app)/class/[slug]/map/page.tsx
// "İndi haradayıq?" [M11] — spec §13.
//
// 🔴 ROUTE MƏHZ `/map`-DİR, `/where-are-we-now` DEYİL.
// `src/layouts/nav.ts` → `buildAppNav()` sol menyuda «İndi haradayıq?» linkini
// `${base}/map` kimi qurur (Blok 4-dən bəri). Səhifəni başqa ünvanda yaratsaq
// menyu 404 verər — istifadəçi üçün bu, "sayt sınıb" deməkdir.
// `lib/map-filters.ts` → `mapHref()` də eyni yolu qaytarır və testlə bərkidilib.
//
// Səhifə NAZİKDİR (CLAUDE.md §8): cohort-u yoxlayır, URL-i oxuyur və
// `features/where-are-we-now`-a ötürür. `prisma.*` burada YOXDUR.
//
// ⚠️ Route icazəsi: `/class` prefiksi `lib/routes.ts` → `APP_ROUTE_PREFIXES`-də
// artıq var, yəni bu alt-səhifə üçün əlavə qeyd LAZIM DEYİL.
//
// ⚠️ TƏLƏ T5: nəticə viewer-dən asılıdır (görünürlük + razılıq süzgəci) →
// `dynamic = "force-dynamic"`.
// ============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WhereAreWeNowPanel } from "@/features/where-are-we-now/WhereAreWeNowPanel";
import { requireUser } from "@/lib/auth";
import { parseMapParams } from "@/lib/map-filters";
import { getCohortHeader } from "@/services/cohort.service";

export const dynamic = "force-dynamic";

interface MapPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: MapPageProps): Promise<Metadata> {
  const viewer = await requireUser();
  const { slug } = await params;
  const cohort = await getCohortHeader(viewer, slug);

  return { title: cohort ? `İndi haradayıq? · ${cohort.displayName}` : "İndi haradayıq?" };
}

export default async function MapPage({ params, searchParams }: MapPageProps) {
  const viewer = await requireUser();
  const [{ slug }, rawParams] = await Promise.all([params, searchParams]);

  const cohort = await getCohortHeader(viewer, slug);
  if (!cohort) notFound();

  // Naməlum tab 404 vermir — default görünüşə düşür.
  const filters = parseMapParams(rawParams);

  return <WhereAreWeNowPanel cohort={cohort} filters={filters} />;
}
