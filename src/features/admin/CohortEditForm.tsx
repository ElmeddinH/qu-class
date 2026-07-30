"use client";

// ============================================================================
// src/features/admin/CohortEditForm.tsx
// Mövcud sinfin redaktəsi: ad, üz qabığı, xoş gəldin mesajı, tarixlər.
//
// 🔴 SLUG REDAKTƏ EDİLMİR — o, bütün `/class/<slug>/…` ünvanlarının,
// paylaşılmış linklərin və bildiriş `url`-lərinin açarıdır.
//
// ⚠️ TARİX DƏYİŞƏNDƏ `ensureCohortMilestones` SERVERDƏ yenidən çağırılır və
// idempotent olduğu üçün köhnə «Dərslər başladı» milestone-u avtomatik
// düzəlir (Blok 8). Burada əlavə iş lazım deyil — istifadəçiyə yalnız izah.
// ============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { updateCohortAction } from "./actions";

interface CohortEditFormProps {
  cohort: {
    id: string;
    displayName: string;
    coverUrl: string | null;
    welcomeMessage: string | null;
    /** ISO sətri — `Date` obyekti server → client sərhədindən keçməsin. */
    academicStartsAt: string;
    graduatesAt: string;
  };
}

/** `YYYY-MM-DD` — `<input type="date">` yalnız bu formanı qəbul edir. */
function dateValue(iso: string): string {
  return iso.slice(0, 10);
}

export function CohortEditForm({ cohort }: CohortEditFormProps) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(cohort.displayName);
  const [coverUrl, setCoverUrl] = useState(cohort.coverUrl ?? "");
  const [welcomeMessage, setWelcomeMessage] = useState(cohort.welcomeMessage ?? "");
  const [academicStartsAt, setStarts] = useState(dateValue(cohort.academicStartsAt));
  const [graduatesAt, setGraduates] = useState(dateValue(cohort.graduatesAt));
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => setOpen(true)}
        aria-label={`${cohort.displayName} sinfini redaktə et`}
      >
        Redaktə et
      </Button>
    );
  }

  const submit = () => {
    startTransition(async () => {
      const result = await updateCohortAction({
        cohortId: cohort.id,
        displayName,
        coverUrl,
        welcomeMessage,
        academicStartsAt,
        graduatesAt,
      });

      if (!result.ok) {
        toast.error(result.message ?? "Yenilənmədi.");
        return;
      }

      toast.success(result.message ?? "Sinif yeniləndi.");
      setOpen(false);
      router.refresh();
    });
  };

  const fieldId = (name: string) => `cohort-${cohort.id}-${name}`;

  return (
    <form
      aria-label={`${cohort.displayName} redaktə formu`}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-3 rounded-card border border-border bg-background p-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId("name")}>Göstərilən ad</Label>
          <Input
            id={fieldId("name")}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="rounded-input"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId("cover")}>Üz qabığı (URL)</Label>
          <Input
            id={fieldId("cover")}
            value={coverUrl}
            onChange={(event) => setCoverUrl(event.target.value)}
            className="rounded-input"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId("starts")}>Dərslərin başlaması</Label>
          <Input
            id={fieldId("starts")}
            type="date"
            value={academicStartsAt}
            onChange={(event) => setStarts(event.target.value)}
            className="rounded-input"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId("graduates")}>Məzuniyyət tarixi</Label>
          <Input
            id={fieldId("graduates")}
            type="date"
            value={graduatesAt}
            onChange={(event) => setGraduates(event.target.value)}
            className="rounded-input"
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor={fieldId("welcome")}>Xoş gəldin mesajı</Label>
          <Textarea
            id={fieldId("welcome")}
            value={welcomeMessage}
            onChange={(event) => setWelcomeMessage(event.target.value)}
            rows={2}
            className="rounded-input"
          />
        </div>
      </div>

      <p className="text-caption text-text-secondary">
        Tarix dəyişsə sistem milestone-ları (qəbul, dərs başlanğıcı, məzuniyyət)
        avtomatik yenilənir. Ünvan (slug) dəyişmir.
      </p>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Yadda saxla
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(false)}
        >
          Ləğv et
        </Button>
      </div>
    </form>
  );
}
