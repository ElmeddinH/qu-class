// ============================================================================
// src/features/class-home/ClassHome.tsx
// Class Page ana görünüşü — spec §16 (14 blok) + PLAN.md §4.6 (mərhələ keçidi).
//
// 🔴 TƏK KOMPONENT, üç mərhələ. `INCOMING`, `STUDENT` və `ALUMNI` üçün AYRI
// SƏHİFƏ YOXDUR — fərq yalnız widget SIRASINDADIR və o sıra `registry.ts`-dən
// gəlir. Bu fayl sıranı render edir, mərhələ haqqında heç bir `if` saxlamır.
//
// ⚠️ Mərhələ `cohort.stage`-dən gəlir və o, `getCohortHeader` içində
// `resolveStage(cohort)` ilə COHORT TARİXLƏRİNDƏN hesablanır. `User.stage`
// yalnız keşdir, UI-da ona güvənilmir (PLAN.md §4.6).
//
// Hər widget:
//   · SERVER komponentidir və məlumatını `services/`-dən özü çəkir,
//   · öz `<Suspense>` sərhədində render olunur — biri gec gələndə səhifənin
//     qalanı gözləmir (Next.js streaming),
//   · öz skeletonuna və boş vəziyyətinə malikdir (CLAUDE.md "Boş ekran buraxma").
// ============================================================================

import { Suspense } from "react";

import { cn } from "@/lib/utils";
import type { CohortHeader } from "@/services/cohort.service";

import { ClassCover } from "./ClassCover";
import {
  groupWidgetRows,
  widgetLayout,
  widgetOrder,
  type ClassHomeWidgetId,
} from "./order";
import { CLASS_HOME_WIDGET_COMPONENTS } from "./registry";
import { WidgetSkeleton } from "./WidgetCard";

/** `aria-labelledby` üçün sabit id — widget id-sindən qurulur. */
function headingIdOf(id: ClassHomeWidgetId): string {
  return `class-widget-${id}`;
}

export function ClassHome({ cohort }: { cohort: CohortHeader }) {
  const rows = groupWidgetRows(widgetOrder(cohort.stage));

  return (
    <div className="flex flex-col gap-6">
      {/* spec §16 blok 1-3 — mərhələdən asılı olmayaraq həmişə yuxarıda */}
      <ClassCover cohort={cohort} />

      {rows.map((row) => (
        <div
          key={row.join("+")}
          className={cn(
            "grid grid-cols-1 gap-6",
            // Yalnız `half` widget-lərdən ibarət sətir iki sütuna bölünür.
            row.length > 1 && "md:grid-cols-2",
          )}
        >
          {row.map((id, index) => {
            const Widget = CLASS_HOME_WIDGET_COMPONENTS[id];
            const headingId = headingIdOf(id);
            // Tək qalmış son `half` kart yanında boş xana buraxmasın deyə
            // bütün eni tutur.
            const isLoneTail = row.length > 1 && index === row.length - 1 && row.length % 2 === 1;

            return (
              <section
                key={id}
                aria-labelledby={headingId}
                className={cn(isLoneTail && "md:col-span-2")}
              >
                <Suspense
                  fallback={
                    <WidgetSkeleton
                      headingId={headingId}
                      rows={widgetLayout(id).skeletonRows}
                    />
                  }
                >
                  <Widget cohort={cohort} headingId={headingId} />
                </Suspense>
              </section>
            );
          })}
        </div>
      ))}
    </div>
  );
}
