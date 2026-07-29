// ============================================================================
// INCOMING widget-i — kampusa hazırlıq materialları (spec §16).
//
// Mənbə: `ContentPage` · `section = NEWCOMERS`. Bu, universitetin REDAKSİYA
// məzmunudur (şəxsi məlumat yoxdur), ona görə servis `Viewer` almır —
// `academic.service.ts` ilə eyni səbəb (bax `services/content.service.ts`).
// Yeganə süzgəc `isPublished`-dir.
// ============================================================================

import Link from "next/link";
import { BookOpenCheck } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ContentSection } from "@/lib/enums";
import { listContentPages } from "@/services/content.service";

import { WidgetCard } from "../WidgetCard";
import type { ClassHomeWidgetProps } from "../types";

const PREP_LIMIT = 4;

export async function CampusPrep({ headingId }: ClassHomeWidgetProps) {
  const pages = await listContentPages(ContentSection.NEWCOMERS, PREP_LIMIT);

  return (
    <WidgetCard
      headingId={headingId}
      title="Kampusa hazırlıq"
      icon="guide"
      description="İlk həftədə lazım olacaq praktik materiallar."
      action={{ href: "/newcomers", label: "Hamısı" }}
    >
      {pages.length === 0 ? (
        <EmptyState
          icon={BookOpenCheck}
          title="Material hələ dərc olunmayıb"
          description="Universitet yeni qəbul üçün bələdçi materialları hazırlayır — dərc olunan kimi burada görünəcək."
          action={{ href: "/faq", label: "Tez-tez verilən suallar" }}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {pages.map((page) => (
            <li key={page.id}>
              {/* ⚠️ `ContentPage.slug` üçün AYRICA marşrut YOXDUR (PLAN.md §4.2):
                  (public) qrupunda bölmə səhifələri var — `/newcomers`,
                  `/campus-life`, `/services`. Ona görə keçid bölmə səhifəsinə +
                  lövbərə gedir; həmin səhifə Blok 11-də hər ContentPage-i
                  `id={slug}` ilə render edəcək. `/${page.slug}` yazsaq 404 olardı. */}
              <Link
                href={`/newcomers#${page.slug}`}
                className="flex h-full flex-col gap-1 rounded-card border border-border p-4 transition-colors hover:border-ku-green hover:bg-ku-soft/30"
              >
                <span className="text-small font-medium text-text-primary">
                  {page.title}
                </span>
                {page.excerpt ? (
                  <span className="line-clamp-2 text-caption text-text-secondary">
                    {page.excerpt}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
