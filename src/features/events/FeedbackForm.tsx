"use client";

// ============================================================================
// src/features/events/FeedbackForm.tsx
// Tədbir rəyi (spec §14): 1-5 ulduz + mətn.
//
// ⚠️ Ulduzlar native `<input type="radio">` qrupudur, düymə YIĞINI deyil.
// Səbəb `VisibilitySelector` ilə eynidir: radio qrupu klaviatura naviqasiyasını
// (ox düymələri, tək tab dayanacağı) və ekran oxuyucu semantikasını PULSUZ
// verir. `<button>`-larla qursaydıq `role="radiogroup"` + `aria-checked` +
// ox düymələrinin idarəsi ƏL İLƏ yazılmalı olardı (KUDS §21).
//
// ⚠️ Rəy ANONİM göstərilir: yekun hesabatda müəllif adı çıxmır (bax
// `services/event.service.ts` → `getEventReport`). Bu, formada da yazılıb ki,
// istifadəçi səmimi yazsın.
// ============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_EVENT_RATING, MIN_EVENT_RATING } from "@/lib/rsvp";
import { cn } from "@/lib/utils";

import { submitFeedbackAction } from "./actions";

interface FeedbackFormProps {
  eventId: string;
  /** Əvvəl yazılmış rəy — forma onunla doldurulur (redaktə mümkündür). */
  initialRating: number | null;
  initialFeedback: string | null;
}

const RATING_VALUES = Array.from(
  { length: MAX_EVENT_RATING - MIN_EVENT_RATING + 1 },
  (_, index) => MIN_EVENT_RATING + index,
);

const RATING_HINTS: Record<number, string> = {
  1: "Çox zəif",
  2: "Zəif",
  3: "Normal",
  4: "Yaxşı",
  5: "Əla",
};

export function FeedbackForm({
  eventId,
  initialRating,
  initialFeedback,
}: FeedbackFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState<number | null>(initialRating);
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (rating === null) {
      setError("Qiymət seçin.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await submitFeedbackAction({ eventId, rating, feedback });

      if (!result.ok) {
        toast.error(result.message ?? "Rəy göndərilmədi.");
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
      <div className="flex flex-col gap-1">
        <h2 className="text-h4 font-medium text-text-primary">Tədbiri qiymətləndirin</h2>
        <p className="text-small text-text-secondary">
          Rəyiniz təşkilatçıya ANONİM göstərilir — hesabatda adınız görünmür.
        </p>
      </div>

      <fieldset disabled={isPending} className="flex flex-col gap-2">
        <legend className="text-small font-medium text-text-primary">
          Qiymət (1—5)
        </legend>

        <div className="flex flex-wrap gap-2">
          {RATING_VALUES.map((value) => {
            const id = `event-rating-${value}`;
            const active = rating !== null && value <= rating;

            return (
              <div key={value}>
                <input
                  type="radio"
                  id={id}
                  name="event-rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={id}
                  title={RATING_HINTS[value]}
                  className={cn(
                    "flex cursor-pointer items-center gap-1 rounded-btn border border-border",
                    "bg-surface px-3 py-2 text-small transition-colors",
                    "hover:border-ku-green hover:text-ku-dark",
                    "peer-checked:border-ku-green peer-checked:bg-ku-soft peer-checked:font-medium peer-checked:text-ku-dark",
                    "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
                    active ? "text-ku-dark" : "text-text-secondary",
                  )}
                >
                  <Star
                    className={cn("h-4 w-4", active && "fill-ku-cream text-ku-dark")}
                    aria-hidden
                  />
                  {value}
                </label>
              </div>
            );
          })}
        </div>

        {rating !== null ? (
          <p className="text-caption text-text-secondary">{RATING_HINTS[rating]}</p>
        ) : null}
        {error ? <p className="text-small text-danger-strong">{error}</p> : null}
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="event-feedback">Rəyiniz</Label>
        <Textarea
          id="event-feedback"
          rows={4}
          maxLength={2000}
          disabled={isPending}
          value={feedback}
          placeholder="Nə yaxşı alındı, nəyi dəyişmək lazımdır?"
          onChange={(event) => setFeedback(event.target.value)}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="gap-2" disabled={isPending}>
          {isPending ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              Göndərilir…
            </>
          ) : initialRating === null ? (
            "Rəyi göndər"
          ) : (
            "Rəyi yenilə"
          )}
        </Button>
      </div>
    </form>
  );
}
