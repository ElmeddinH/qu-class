// ============================================================================
// src/features/class-home/HeadlineStats.tsx
// Class Page başlığındaki rəqəm zolağı (Blok 10A).
//
// «N üzv · X şəhərdən · Y ölkədən · Z klubda · W nailiyyət» — sinfin ölçüsünü
// bir sətirdə göstərir.
//
// 🔴 SİYAHI YOX, YALNIZ SAY. Kimin harada olduğu bu zolaqda göstərilmir; adlar
// və şəhər siyahısı Blok 10B-nin («İndi haradayıq?» xəritəsi) işidir.
//
// 🔴 KİÇİK SİNİFDƏ ZOLAQ ÜMUMİYYƏTLƏ RENDER OLUNMUR: servis `null` qaytarır
// (`getCohortHeadlineStats` → `isHeadlineStatsVisible`), komponent isə `null`
// üçün heç nə çıxarmır — "gizlədilib" yazısı da məlumatdır.
//
// SERVER komponentidir və öz `<Suspense>` sərhədində gəlir (`ClassHome`).
// ============================================================================

import { Building2, Globe2, MapPin, Sparkles, Trophy, Users } from "lucide-react";

import { getViewer } from "@/lib/auth";
import type { CohortHeader } from "@/services/cohort.service";
import { getCohortHeadlineStats } from "@/services/stats.service";

const ICONS = {
  members: Users,
  cities: MapPin,
  countries: Globe2,
  clubs: Building2,
  achievements: Trophy,
} as const;

export async function HeadlineStats({ cohort }: { cohort: CohortHeader }) {
  const viewer = await getViewer();
  const stats = await getCohortHeadlineStats(viewer, cohort.id);

  // Kiçik sinif → zolaq YOXDUR (yer tutucu da yoxdur).
  if (stats === null) return null;

  const items = [
    { key: "members", value: stats.memberCount, label: "üzv" },
    { key: "cities", value: stats.cityCount, label: "şəhərdən" },
    { key: "countries", value: stats.countryCount, label: "ölkədən" },
    { key: "clubs", value: stats.clubCount, label: "klubda" },
    { key: "achievements", value: stats.achievementCount, label: "nailiyyət" },
  ] as const;

  return (
    <section
      aria-label="Sinif rəqəmləri"
      className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card border border-border bg-surface px-6 py-4 shadow-xs-kuds"
    >
      {items.map((item) => {
        const Icon = ICONS[item.key];
        return (
          <div key={item.key} className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-ku-green" aria-hidden />
            <span className="text-h4 font-semibold text-text-primary">{item.value}</span>
            <span className="text-small text-text-secondary">{item.label}</span>
          </div>
        );
      })}

      <p className="flex items-center gap-2 text-caption text-text-secondary">
        <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
        Yalnız sənə görünən məlumatlar sayılır.
      </p>
    </section>
  );
}

/** Zolağın skeleton hündürlüyü — `ClassHome`-dakı `Suspense` üçün. */
export function HeadlineStatsSkeleton() {
  return (
    <div
      aria-hidden
      className="h-14 w-full animate-pulse rounded-card border border-border bg-surface"
    />
  );
}
