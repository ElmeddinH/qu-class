// ============================================================================
// src/features/feed/ClassFeedSection.tsx
// Lentin SERVER qabığı — sorğular burada, müştəri konteyneri `ClassFeed`-dədir.
//
// 🔴 NİYƏ AYRICA FAYL (Blok 12D · S3-F4 · TƏLƏ C). Əvvəl `listFeed` və
// `listEvents` SƏHİFƏNİN gövdəsində çağırılırdı. Səhifə status qapılıdır
// (`notFound()` — naməlum sinif slug-ı 404 verməlidir), yəni seqmentə
// `loading.tsx` qoyula bilməz. Qalan yeganə yol səhifə daxili `<Suspense>`-dir,
// AMMA sərhəd yalnız İÇİNDƏ `await` edən komponenti bükəndə işləyir:
//
//     ❌ const page = await listFeed(...);          // valideyndə gözlənilib
//        <Suspense><ClassFeed initialPage={page} /></Suspense>   // boşa işləyir
//
//     ✅ <Suspense><ClassFeedSection … /></Suspense> // fetch sərhədin İÇİNDƏ
//
// Birinci variantda skeleton HEÇ VAXT görünmür, amma kod «edilmiş» kimi
// görünür — blokun ən asan səhv edilən yeri budur.
//
// ⚠️ `prisma.*` burada YOXDUR (CLAUDE.md §4): iki servis funksiyası çağırılır.
// ============================================================================

import type { PostCategory } from "@/lib/enums";
import type { Viewer } from "@/lib/visibility";
import { listEvents } from "@/services/event.service";
import { listFeed } from "@/services/post.service";

import { ClassFeed } from "./ClassFeed";
import { serializeFeedPage } from "./types";

/** İlk səhifədəki yazı sayı — sonrakılar müştəridə «daha çox» ilə gəlir. */
const FIRST_PAGE_SIZE = 20;
/** Kompozitorun tədbir seçicisi — bütün siyahı lazım deyil. */
const EVENT_OPTION_LIMIT = 50;

interface ClassFeedSectionProps {
  viewer: Viewer;
  cohortId: string;
  cohortSlug: string;
  canPost: boolean;
  category: PostCategory | null;
}

export async function ClassFeedSection({
  viewer,
  cohortId,
  cohortSlug,
  canPost,
  category,
}: ClassFeedSectionProps) {
  const [firstPage, events] = await Promise.all([
    listFeed(viewer, {
      cohortId,
      category: category ?? undefined,
      take: FIRST_PAGE_SIZE,
    }),
    listEvents(viewer, { cohortId, take: EVENT_OPTION_LIMIT }),
  ]);

  return (
    <ClassFeed
      cohortId={cohortId}
      cohortSlug={cohortSlug}
      canPost={canPost}
      category={category}
      initialPage={serializeFeedPage(firstPage)}
      events={events.map((event) => ({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt.toISOString(),
      }))}
    />
  );
}
