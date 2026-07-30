"use client";

// ============================================================================
// src/features/events/TimelinePublishCard.tsx
// «Class Timeline-a əlavə et» (spec §14) — tədbirdən sonrakı əməliyyat.
//
// ⚠️ Yaranan `TimelineEntry`-nin görünürlüyü TƏDBİRDƏN KOPYALANIR və ondan
// daha AÇIQ ola bilməz (`features/feed/fanout.ts` → `buildEventTimelineEntry`
// → `derivedVisibility`). Bu, düymənin altında istifadəçiyə də yazılır —
// «xronologiyaya əlavə etsəm kim görəcək?» sualı burada cavablanmalıdır.
//
// ⚠️ Düymə yalnız KEÇMİŞ tədbirdə göstərilir: xronologiya baş vermiş hadisələr
// üçündür, gələcək plan üçün deyil (sistem milestone-larında da eyni qayda —
// `lib/milestones.ts` gələcək tarixli qeyd yaratmır).
// ============================================================================

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, LoaderCircle, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { VisibilityBadge } from "@/components/shared/VisibilityBadge";

import { addEventToTimelineAction, removeEventFromTimelineAction } from "./actions";

interface TimelinePublishCardProps {
  eventId: string;
  cohortSlug: string | null;
  visibility: string;
  addedToTimeline: boolean;
}

export function TimelinePublishCard({
  eventId,
  cohortSlug,
  visibility,
  addedToTimeline,
}: TimelinePublishCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(add: boolean) {
    startTransition(async () => {
      const result = add
        ? await addEventToTimelineAction({ eventId })
        : await removeEventFromTimelineAction({ eventId });

      if (!result.ok) {
        toast.error(result.message ?? "Əməliyyat tamamlanmadı.");
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-sm-kuds">
      <h2 className="text-h4 font-medium text-text-primary">Sinif xronologiyası</h2>

      <p className="text-small text-text-secondary">
        Tədbiri xronologiyaya əlavə etsəniz o, sinfin tarixçəsində qalır.
        Xronologiya qeydinin görünürlüyü tədbirdən kopyalanır:
      </p>

      <VisibilityBadge level={visibility} className="w-fit" />

      {cohortSlug === null ? (
        <p className="text-small text-warning-strong">
          Bu tədbir heç bir sinfə bağlı deyil — xronologiyaya əlavə edilə bilməz.
        </p>
      ) : addedToTimeline ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-2 text-small text-success-strong">
            <CalendarCheck className="h-4 w-4 shrink-0" aria-hidden />
            Xronologiyaya əlavə olunub.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isPending}
            onClick={() => run(false)}
          >
            {isPending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Undo2 className="h-4 w-4" aria-hidden />
            )}
            Çıxar
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          className="w-fit gap-2"
          disabled={isPending}
          onClick={() => run(true)}
        >
          {isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <CalendarCheck className="h-4 w-4" aria-hidden />
          )}
          Class Timeline-a əlavə et
        </Button>
      )}
    </div>
  );
}
