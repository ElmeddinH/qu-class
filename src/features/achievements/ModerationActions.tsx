"use client";

// ============================================================================
// src/features/achievements/ModerationActions.tsx
// Bir nailiyyət üçün moderator qərarı: təsdiq · seçilmiş · rədd.
//
// ⚠️ RƏDD ÜÇÜN QEYD MƏCBURİDİR (server action-da Zod ilə də yoxlanılır):
// sahibə "arxivləndi" bildirişi səbəbsiz getməməlidir. Təsdiq üçün qeyd
// istəyə bağlıdır.
//
// ⚠️ Server action-dan sonra siyahı SERVERDƏ yenilənir (`revalidatePath` →
// `router.refresh()`), yəni nəticə dərhal deyil, növbəti render-lə gəlir —
// e2e testi bunu `expect.poll` ilə gözləyir (TƏLƏ T19).
// ============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  featureAchievementAction,
  rejectAchievementAction,
  verifyAchievementAction,
  type AchievementActionResult,
} from "./actions";

interface ModerationActionsProps {
  achievementId: string;
  cohortSlug: string;
  title: string;
}

export function ModerationActions({
  achievementId,
  cohortSlug,
  title,
}: ModerationActionsProps) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const noteId = `moderation-note-${achievementId}`;

  const run = (action: (input: unknown) => Promise<AchievementActionResult>) => {
    startTransition(async () => {
      const result = await action({ achievementId, cohortSlug, note });

      if (!result.ok) {
        toast.error(result.message ?? "Əməliyyat tamamlanmadı.");
        return;
      }

      toast.success(result.message ?? "Hazırdır.");
      setNote("");
      // Növbə server komponentidir — yenilənmiş siyahı üçün refresh lazımdır.
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={noteId} className="text-caption text-text-secondary">
          Moderator qeydi (rədd üçün məcburidir)
        </Label>
        <Textarea
          id={noteId}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          placeholder="Sənəd yoxlanıldı…"
          className="rounded-input"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => run(verifyAchievementAction)}
        >
          Təsdiqlə
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(featureAchievementAction)}
        >
          Seçilmişlərə əlavə et
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          aria-label={`«${title}» nailiyyətini rədd et`}
          onClick={() => run(rejectAchievementAction)}
        >
          Rədd et
        </Button>
      </div>
    </div>
  );
}
