"use client";

// ============================================================================
// src/features/events/RsvpPanel.tsx
// RSVP düymələri (spec §14): Qəbul et · Rədd et · Qeydiyyatdan keç.
//
// 🔴 DÜYMƏLƏR NİYYƏTDİR, STATUS DEYİL. İstifadəçi `REGISTERED` statusunu
// birbaşa seçə bilməz — tutum doludursa server `WAITLISTED` qaytarır. Qərar
// `lib/rsvp.ts` → `resolveRsvpDecision`-dadır və serverdə verilir; bu komponent
// yalnız nəticəni göstərir.
//
// ⚠️ Düymələrin AKTİVLİYİ də serverdən gələn məlumatla hesablanır (tutum, son
// tarix, tədbir başlayıbmı) — amma bu, YALNIZ RAHATLIQ üçündür. Düyməni
// söndürmək qoruma deyil: eyni qaydalar servisdə yenidən tətbiq olunur.
// ============================================================================

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, LoaderCircle, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RsvpStatus } from "@/lib/enums";
import { rsvpStatusLabel } from "@/lib/labels";
import { type RsvpIntent } from "@/lib/rsvp";
import { cn } from "@/lib/utils";

import { rsvpAction } from "./actions";

interface RsvpPanelProps {
  eventId: string;
  /** Viewer-in cari statusu; heç bir sətir yoxdursa `null`. */
  currentStatus: string | null;
  /** Tutum dolubmu (viewer-in öz yeri nəzərə alınmadan)? */
  full: boolean;
  /** Qalan yer sayı; limitsiz tədbirdə `null`. */
  seatsLeft: number | null;
  /** Qeydiyyat son tarixi keçibmi? */
  registrationClosed: boolean;
  /** Tədbir artıq başlayıbmı / bitibmi? */
  finished: boolean;
  /** `Event.status` — `PUBLISHED` olmayan tədbirə RSVP verilmir. */
  eventStatus: string;
}

export function RsvpPanel({
  eventId,
  currentStatus,
  full,
  seatsLeft,
  registrationClosed,
  finished,
  eventStatus,
}: RsvpPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const closed = finished || eventStatus !== "PUBLISHED";

  function send(intent: RsvpIntent) {
    startTransition(async () => {
      const result = await rsvpAction({ eventId, intent });

      if (!result.ok) {
        toast.error(result.message ?? "Əməliyyat tamamlanmadı.");
        return;
      }

      // Gözləmə siyahısı istifadəçinin gözlədiyi nəticə DEYİL — ayrıca
      // xəbərdarlıq tonu ilə göstərilir.
      if (result.value?.waitlisted) toast.warning(result.message);
      else toast.success(result.message);

      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-sm-kuds">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-h4 font-medium text-text-primary">İştirakınız</h2>
        {currentStatus ? (
          <Badge
            variant="outline"
            className={cn(
              "text-caption font-normal",
              currentStatus === RsvpStatus.WAITLISTED
                ? "border-warning bg-warning/20 text-text-primary"
                : "text-text-secondary",
            )}
          >
            {rsvpStatusLabel(currentStatus)}
          </Badge>
        ) : null}
      </div>

      <p className="text-small text-text-secondary">
        {closed
          ? "Tədbir bağlıdır — yeni qeydiyyat qəbul edilmir."
          : full
            ? "Tutum doludur. Qeydiyyatdan keçsəniz gözləmə siyahısına düşəcəksiniz."
            : seatsLeft === null
              ? "İştirakçı limiti yoxdur."
              : `${seatsLeft} yer qalıb.`}
      </p>

      {registrationClosed && !closed ? (
        <p className="flex items-center gap-2 text-small text-warning-strong">
          <Clock className="h-4 w-4 shrink-0" aria-hidden />
          Qeydiyyat son tarixi keçib — dəvəti hələ də qəbul və ya rədd edə bilərsiniz.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="gap-2"
          disabled={isPending || closed || registrationClosed}
          onClick={() => send("REGISTER")}
        >
          {isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <UserPlus className="h-4 w-4" aria-hidden />
          )}
          Qeydiyyatdan keç
        </Button>

        <Button
          type="button"
          variant="outline"
          className="gap-2"
          disabled={isPending || closed}
          onClick={() => send("ACCEPT")}
        >
          <Check className="h-4 w-4" aria-hidden />
          Qəbul et
        </Button>

        <Button
          type="button"
          variant="outline"
          className="gap-2 text-danger-strong"
          disabled={isPending}
          onClick={() => send("DECLINE")}
        >
          <X className="h-4 w-4" aria-hidden />
          Rədd et
        </Button>
      </div>

      <p className="text-caption text-text-secondary">
        «Qəbul et» dəvətə cavabdır, «Qeydiyyatdan keç» isə yer tutur. Rədd etmək
        həmişə mümkündür — koordinatorun siyahısı düzgün qalsın deyə fikrinizi
        dəyişsəniz mütləq bildirin.
      </p>
    </div>
  );
}
