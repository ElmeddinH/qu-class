// ============================================================================
// src/features/admin/UniversityAchievementQueue.tsx
// `/admin/achievements` — UNİVERSİTET səviyyəli nailiyyət təsdiqi.
//
// 🔴 Blok 8-in `ModerationQueue`-si SİNİF səviyyəsidir və rol qapısı
// `CLASS_MODERATOR`-dur. Bu ekran AYRI servis funksiyasından oxuyur:
// `listUniversityModerationQueue` — qapısı `assertFreshAdmin`, əhatəsi bütün
// siniflər. İki icazə modeli bir funksiyada birləşdirilməyib (səbəb
// `services/achievement.service.ts`-dədir).
//
// ⚠️ QƏRAR düymələri Blok 8-in `ModerationActions` komponentini TƏKRAR
// İŞLƏDİR — kopyalanmır. Onun action-ları `canModerateCohort` qapısından keçir
// və `UNIVERSITY_ADMIN` orada bütün siniflərdə onsuz da icazəlidir.
// ============================================================================

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { MemberIdentity } from "@/components/shared/MemberIdentity";
import { VisibilityBadge } from "@/components/shared/VisibilityBadge";
import { Badge } from "@/components/ui/badge";
import { ModerationActions } from "@/features/achievements/ModerationActions";
import { getViewer } from "@/lib/auth";
import { listUniversityModerationQueue } from "@/services/achievement.service";
import { shortDate } from "@/utils/date";

import { AdminPageHeader } from "./AdminPageHeader";

export async function UniversityAchievementQueue({
  cohortId,
}: {
  cohortId?: string;
}) {
  const viewer = await getViewer();
  const items = await listUniversityModerationQueue(viewer, { cohortId });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Nailiyyət təsdiqi"
        description={`Bütün siniflərdə təsdiq gözləyən ${items.length} nailiyyət. Hər qərar audit jurnalına yazılır və sahibinə bildiriş göndərilir.`}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Növbə boşdur"
          description="Universitet miqyasında təsdiq gözləyən nailiyyət yoxdur."
          action={{ href: "/admin", label: "İdarə panelinə qayıt" }}
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-2">
                  <h2 className="text-h4 font-medium text-text-primary">{item.title}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-normal">
                      {item.category}
                    </Badge>
                    <VisibilityBadge level={item.visibility} />
                    <span className="text-caption text-text-secondary">
                      {shortDate(item.awardedAt)}
                    </span>
                    <Link
                      href={`/class/${item.cohort.slug}/achievements`}
                      className="text-caption text-ku-green hover:underline"
                    >
                      {item.cohort.displayName}
                    </Link>
                  </div>
                </div>

                <MemberIdentity
                  id={item.owner.id}
                  firstName={item.owner.firstName}
                  lastName={item.owner.lastName}
                  avatarUrl={item.owner.avatarUrl}
                  subtitle={item.organization}
                />
              </div>

              {item.description === null ? null : (
                <p className="text-small text-text-secondary">{item.description}</p>
              )}

              <ModerationActions
                achievementId={item.id}
                cohortSlug={item.cohort.slug}
                title={item.title}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
