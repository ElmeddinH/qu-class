"use client";

// ============================================================================
// src/features/events/manage/CompleteEventForm.tsx
// «Tədbiri tamamla» + yekun mətni (spec §14).
//
// ⚠️ `COMPLETED` status tədbiri GİZLƏTMİR: `PUBLIC_EVENT_STATUSES` onu da
// ehtiva edir (`lib/enums.ts`), yəni keçmiş tədbir siyahıda və arxivdə qalır.
// Statusun dəyişməsi yalnız yeni RSVP-ni bağlayır və hesabatı «yekunlaşmış»
// kimi işarələyir.
//
// ⚠️ Düymə tədbir BAŞLAMAMIŞ göstərilmir — gələcək tədbiri "tamamlanmış" elan
// etmək məntiqsizdir və qeydiyyatı vaxtından əvvəl bağlayardı.
// ============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EventStatus } from "@/lib/enums";
import { eventStatusLabel } from "@/lib/labels";

import { completeEventAction } from "../actions";

interface CompleteEventFormProps {
  eventId: string;
  status: string;
  summary: string | null;
  finished: boolean;
}

export function CompleteEventForm({
  eventId,
  status,
  summary,
  finished,
}: CompleteEventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState(summary ?? "");

  if (!finished) {
    return (
      <div className="rounded-card border border-border bg-surface p-6 text-small text-text-secondary shadow-sm-kuds">
        Tədbir hələ baş verməyib. Yekun mətni və «tamamlandı» işarəsi tədbir
        başladıqdan sonra aktivləşir.
      </div>
    );
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await completeEventAction({ eventId, summary: draft });

      if (!result.ok) {
        toast.error(result.message ?? "Əməliyyat tamamlanmadı.");
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-h4 font-medium text-text-primary">Yekun</h2>
        <span className="text-caption text-text-secondary">
          Status: {eventStatusLabel(status)}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="event-summary">Yekun mətni</Label>
        <Textarea
          id="event-summary"
          rows={4}
          maxLength={3000}
          disabled={isPending}
          value={draft}
          placeholder="Neçə nəfər gəldi, nə alındı, növbəti dəfə nə dəyişməlidir?"
          onChange={(event) => setDraft(event.target.value)}
        />
        <p className="text-caption text-text-secondary">
          Bu mətn tədbir səhifəsində və xronologiya qeydində göstərilir.
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="gap-2" disabled={isPending}>
          {isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <CheckCheck className="h-4 w-4" aria-hidden />
          )}
          {status === EventStatus.COMPLETED ? "Yekunu yenilə" : "Tədbiri tamamla"}
        </Button>
      </div>
    </form>
  );
}
