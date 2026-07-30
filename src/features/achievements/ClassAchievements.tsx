// ============================================================================
// src/features/achievements/ClassAchievements.tsx
// Class Achievements ekranı [M10] — spec §12 (+ GW analizi əlavə #3).
//
// Üç bölmə:
//   1. 🏆 SEÇİLMİŞ NAİLİYYƏTLƏR (`status = FEATURED`) — səhifənin başında,
//      3 sütunlu vurğu qridi
//   2. Statistika zolağı (StatCard)
//   3. 12 kateqoriya filtri + əsas qrid
//
// ⚠️ KARUSEL YOXDUR — QƏSDƏN. Avtomatik fırlanan karusel KUDS §21 (WCAG 2.2)
// baxımından problemlidir: fokus itir, animasiya dayandırıla bilməlidir,
// klaviatura ilə naviqasiya mürəkkəbləşir. Responsiv qrid eyni təsiri verir və
// əlçatandır.
//
// ⚠️ Bütün sorğular servisdəndir (`prisma.*` yoxdur) və hər biri məxfilikdən
// keçir — o cümlədən STATİSTİKA SAYLARI (görünməyən nailiyyət saya düşmür).
// ============================================================================

import { Suspense } from "react";
import { Layers, Sparkles, Trophy } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PagerNav } from "@/components/shared/PagerNav";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer } from "@/lib/auth";
import { CohortRole } from "@/lib/enums";
import {
  achievementPageCount,
  achievementQueryString,
  achievementSkipOf,
  achievementsHref,
  emptyAchievementFilters,
  type AchievementFilterState,
} from "@/lib/achievement-filters";
import { achievementCategoryMeta } from "@/features/feed/catalog";
import {
  ACHIEVEMENT_PAGE_SIZE,
  countAchievements,
  listAchievements,
  listFeaturedAchievements,
  getAchievementStats,
} from "@/services/achievement.service";
import type { CohortHeader } from "@/services/cohort.service";
import Link from "next/link";

import { AchievementCard } from "./AchievementCard";
import { AchievementFilters } from "./AchievementFilters";

interface ClassAchievementsProps {
  cohort: CohortHeader;
  filters: AchievementFilterState;
}

export function ClassAchievements({ cohort, filters }: ClassAchievementsProps) {
  // Moderasiya keçidi YALNIZ görünmə qərarıdır — əsl icazə səhifənin özündə
  // `requireCohortRole` ilə yoxlanılır (düyməni gizlətmək qoruma deyil).
  const canSeeQueue = cohort.viewerRole === CohortRole.CLASS_MODERATOR;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 font-bold text-text-primary">Sinif nailiyyətləri</h1>
          <p className="text-body text-text-secondary">
            {cohort.displayName} · təsdiqlənmiş nailiyyətlər və seçilmiş uğur hekayələri.
          </p>
        </div>

        {canSeeQueue ? (
          <Button asChild variant="outline">
            <Link href={`/class/${cohort.slug}/achievements/moderation`}>
              Təsdiq növbəsi
            </Link>
          </Button>
        ) : null}
      </header>

      <Suspense
        key={achievementQueryString(filters)}
        fallback={<AchievementsSkeleton />}
      >
        <AchievementsBody cohort={cohort} filters={filters} />
      </Suspense>
    </div>
  );
}

async function AchievementsBody({ cohort, filters }: ClassAchievementsProps) {
  const viewer = await getViewer();

  const [featured, stats, items, total] = await Promise.all([
    listFeaturedAchievements(viewer, cohort.id),
    getAchievementStats(viewer, cohort.id),
    listAchievements(viewer, {
      cohortId: cohort.id,
      category: filters.category ?? undefined,
      take: ACHIEVEMENT_PAGE_SIZE,
      skip: achievementSkipOf(filters, ACHIEVEMENT_PAGE_SIZE),
    }),
    countAchievements(viewer, {
      cohortId: cohort.id,
      category: filters.category ?? undefined,
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      {featured.length > 0 ? (
        <section aria-labelledby="featured-achievements" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2
              id="featured-achievements"
              className="text-h2 font-semibold text-text-primary"
            >
              Seçilmiş nailiyyətlər
            </h2>
            <p className="text-small text-text-secondary">
              Sinfin ən çox iz qoyan uğurları — moderator tərəfindən seçilib.
            </p>
          </div>

          {/* Responsiv vurğu qridi — karusel DEYİL (fayl başlığındakı qeyd). */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} featured />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-label="Nailiyyət statistikası" className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Trophy}
          value={stats.verifiedCount}
          label="Təsdiqlənmiş nailiyyət"
        />
        <StatCard icon={Layers} value={stats.categoryCount} label="Kateqoriya" />
        <StatCard
          icon={Sparkles}
          value={
            stats.topCategory ? achievementCategoryMeta(stats.topCategory.category).label : "—"
          }
          label="Ən çox nailiyyət"
          hint={stats.topCategory ? `${stats.topCategory.count} qeyd` : undefined}
        />
      </section>

      <section aria-labelledby="all-achievements" className="flex flex-col gap-4">
        <h2 id="all-achievements" className="text-h2 font-semibold text-text-primary">
          Bütün nailiyyətlər
        </h2>

        <AchievementFilters />

        <p className="text-small text-text-secondary" aria-live="polite">
          {total} nailiyyət
        </p>

        {items.length === 0 ? (
          filters.category ? (
            <div className="flex flex-col items-center gap-3">
              <EmptyState
                icon={Trophy}
                title="Bu kateqoriyada nailiyyət yoxdur"
                description="Başqa kateqoriya seçin və ya filtri sıfırlayın."
                className="w-full"
              />
              <Button asChild variant="outline" size="sm">
                <Link href={achievementsHref(cohort.slug, emptyAchievementFilters())}>
                  Filtri sıfırla
                </Link>
              </Button>
            </div>
          ) : (
            <EmptyState
              icon={Trophy}
              title="Hələ təsdiqlənmiş nailiyyət yoxdur"
              description="Nailiyyət paylaşımda «Nailiyyətlərdə göstər» seçimi ilə göndərilir və sinif moderatorunun təsdiqindən sonra burada görünür."
              action={{ href: `/class/${cohort.slug}/feed`, label: "Nailiyyət göndər" }}
            />
          )
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        )}

        <PagerNav
          page={filters.page}
          pageCount={achievementPageCount(total, ACHIEVEMENT_PAGE_SIZE)}
          hrefFor={(page) => achievementsHref(cohort.slug, { ...filters, page })}
          label="Nailiyyət səhifələri"
        />
      </section>
    </div>
  );
}

function AchievementsSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-64 w-full rounded-card" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-20 w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}
