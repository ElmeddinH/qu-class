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

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClassFeed } from "@/features/feed/ClassFeed";
import { serializeFeedPage } from "@/features/feed/types";
import { requireUser } from "@/lib/auth";
import { PostCategorySchema } from "@/lib/enums";
import { getCohortHeader } from "@/services/cohort.service";
import { listEvents } from "@/services/event.service";
import { listFeed } from "@/services/post.service";

export const dynamic = "force-dynamic";

const FIRST_PAGE_SIZE = 20;
/** Kompozitorun tədbir seçicisi — bütün siyahı lazım deyil. */
const EVENT_OPTION_LIMIT = 50;

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

  const cohort = await getCohortHeader(viewer, slug);
  if (!cohort) notFound();

  // Naməlum kateqoriya 404 vermir — filtr sadəcə nəzərə alınmır (URL əl ilə
  // dəyişdirilə bilər, bu, səhv deyil).
  const rawCategory = Array.isArray(query.category) ? query.category[0] : query.category;
  const parsedCategory = rawCategory ? PostCategorySchema.safeParse(rawCategory) : null;
  const category = parsedCategory?.success ? parsedCategory.data : null;

  const [firstPage, events] = await Promise.all([
    listFeed(viewer, {
      cohortId: cohort.id,
      category: category ?? undefined,
      take: FIRST_PAGE_SIZE,
    }),
    listEvents(viewer, { cohortId: cohort.id, take: EVENT_OPTION_LIMIT }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 font-bold text-text-primary">Sinif lenti</h1>
        <p className="text-body text-text-secondary">
          {cohort.displayName} · {cohort.memberCount} üzv
        </p>
      </header>

      <ClassFeed
        cohortId={cohort.id}
        cohortSlug={cohort.slug}
        canPost={cohort.isMember}
        category={category}
        initialPage={serializeFeedPage(firstPage)}
        events={events.map((event) => ({
          id: event.id,
          title: event.title,
          startsAt: event.startsAt.toISOString(),
        }))}
      />
    </div>
  );
}
