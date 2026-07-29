// ============================================================================
// spec §16 blok 13 — "Tədbir yarat" düyməsi.
//
// ⚠️ Düymə YALNIZ tədbir yarada bilən cohort rollarına göstərilir (spec §17:
// sinif nümayəndəsi, tədbir koordinatoru, moderator). Bu, RAHATLIQ üçündür —
// ƏSL icazə tədbir yaratma səhifəsində `requireCohortRole()` ilə yoxlanılır.
// Düyməni gizlətmək qoruma DEYİL.
// ============================================================================

import Link from "next/link";
import { CalendarPlus, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cohortRoleLabel } from "@/lib/labels";

import { canCreateEvents } from "../catalog";
import { WidgetCard } from "../WidgetCard";
import type { ClassHomeWidgetProps } from "../types";

export function CreateEventCta({ cohort, headingId }: ClassHomeWidgetProps) {
  const allowed = canCreateEvents(cohort.viewerRole);

  return (
    <WidgetCard
      headingId={headingId}
      title="Tədbir yarat"
      icon="calendarPlus"
      description="Görüş, səyahət, seminar və ya məzunlar görüşü elan et."
      footer={
        allowed ? (
          // PLAN.md §4.2-də ayrıca `/events/new` marşrutu yoxdur — tədbir
          // yaratma sinif tədbirləri səhifəsindən açılır (lentdəki kompozitor
          // nümunəsi ilə eyni). Ekranın özü Blok 9-dadır.
          <Button asChild className="gap-2">
            <Link href={`/class/${cohort.slug}/events`}>
              <CalendarPlus className="h-4 w-4" aria-hidden />
              Yeni tədbir
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={`/class/${cohort.slug}/events`}>Tədbirlərə bax</Link>
          </Button>
        )
      }
    >
      {allowed ? (
        <p className="text-small text-text-secondary">
          Rolunuz: <strong className="font-medium text-text-primary">
            {cohortRoleLabel(cohort.viewerRole ?? "")}
          </strong>
          . Tədbir yaradanda tarix, yer, iştirak həddi və görünürlük səviyyəsini
          təyin edə, sonra qeydiyyatları izləyə bilərsiniz.
        </p>
      ) : (
        <p className="flex items-start gap-2 text-small text-text-secondary">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ku-green" aria-hidden />
          Tədbiri sinif nümayəndəsi, tədbir koordinatoru və ya moderator yaradır.
          Təklifiniz varsa onlara yazın — mövcud tədbirlərə isə buradan qoşula
          bilərsiniz.
        </p>
      )}
    </WidgetCard>
  );
}
