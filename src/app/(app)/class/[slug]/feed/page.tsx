// ============================================================================
// src/app/(app)/class/[slug]/feed/page.tsx
// Class Feed [M5] — sinfin canlı lenti.
//
// Səhifə NAZİKDİR (CLAUDE.md §8): cohort-u yoxlayır, ilk səhifəni servisdən
// çəkir və `features/feed/ClassFeed`-ə ötürür. `prisma.*` burada YOXDUR.
//
// ⚠️ TƏLƏ T5: səhifə DB-dən oxuyur və nəticə viewer-dən asılıdır →
// `dynamic = "force-dynamic"`. Bunsuz Next build zamanı statik render etməyə
// çalışır və bir istifadəçinin lenti keşlənib başqasına verilə bilər.
// ============================================================================

import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { ClassFeedSection } from "@/features/feed/ClassFeedSection";
import { requireUser } from "@/lib/auth";
import { PostCategorySchema } from "@/lib/enums";
import { getCohortHeader } from "@/services/cohort.service";

export const dynamic = "force-dynamic";

interface FeedPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string | string[] }>;
}

export async function generateMetadata({ params }: FeedPageProps): Promise<Metadata> {
  const viewer = await requireUser();
  const { slug } = await params;
  const cohort = await getCohortHeader(viewer, slug);

  return { title: cohort ? `Lent · ${cohort.displayName}` : "Sinif lenti" };
}

export default async function ClassFeedPage({ params, searchParams }: FeedPageProps) {
  const viewer = await requireUser();
  const [{ slug }, query] = await Promise.all([params, searchParams]);

  // 🔴 SIRA VACİBDİR (Blok 12D · TƏLƏ A): mövcudluq qapısı AXINDAN ƏVVƏL.
  // Seqmentə `loading.tsx` qoyulsaydı status hələ bura çatmamış 200 kimi
  // göndərilər və naməlum sinif slug-ı «yumşaq 404» verərdi.
  const cohort = await getCohortHeader(viewer, slug);
  if (!cohort) notFound();

  // Naməlum kateqoriya 404 vermir — filtr sadəcə nəzərə alınmır (URL əl ilə
  // dəyişdirilə bilər, bu, səhv deyil).
  const rawCategory = Array.isArray(query.category) ? query.category[0] : query.category;
  const parsedCategory = rawCategory ? PostCategorySchema.safeParse(rawCategory) : null;
  const category = parsedCategory?.success ? parsedCategory.data : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 font-bold text-text-primary">Sinif lenti</h1>
        <p className="text-body text-text-secondary">
          {cohort.displayName} · {cohort.memberCount} üzv
        </p>
      </header>

      {/* 🔴 TƏLƏ C: lent sorğuları BURADA DEYİL, `ClassFeedSection`-un içindədir
          — səbəb həmin faylın başlığındadır. `key` filtri dəyişəndə sərhədi
          yenidən qurur, yoxsa köhnə kateqoriyanın yazıları qalır. */}
      <Suspense
        key={category ?? "all"}
        fallback={<PageSkeleton variant="list" count={3} header={false} announce={false} />}
      >
        <ClassFeedSection
          viewer={viewer}
          cohortId={cohort.id}
          cohortSlug={cohort.slug}
          canPost={cohort.isMember}
          category={category}
        />
      </Suspense>
    </div>
  );
}
