"use client";

// ============================================================================
// src/features/feed/ReactionBar.tsx
// Dörd reaksiya düyməsi — OPTİMİSTİK yenilənmə ilə.
//
// ⚠️ TƏLƏ T12: `Reaction` PK-sı `@@id([postId, userId])` — istifadəçi başına
// BİR reaksiya. Müştəri tərəf də eyni qaydaya tabedir: yeni növ seçiləndə
// köhnəsinin sayı azalır, eyni növ təkrar basılanda reaksiya LƏĞV olunur.
// Server də eyni nəticəni verir (`upsert` / `delete`), yəni optimistik hal
// serverin cavabı ilə üst-üstə düşür.
// ============================================================================

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { toggleReactionAction } from "./actions";
import { FEED_ICONS, REACTION_META, REACTION_OPTIONS } from "./catalog";

export interface ReactionState {
  /** Növ → say. Sıfır olan növlər olmaya bilər. */
  counts: Record<string, number>;
  /** Viewer-in seçimi — yoxdursa `null`. */
  viewerReaction: string | null;
}

interface ReactionBarProps {
  postId: string;
  initial: ReactionState;
}

/** Optimistik keçid — serverin `toggleReaction` məntiqinin eynisi. */
function applyToggle(state: ReactionState, type: string): ReactionState {
  const counts = { ...state.counts };
  const previous = state.viewerReaction;

  if (previous) {
    counts[previous] = Math.max(0, (counts[previous] ?? 1) - 1);
    if (counts[previous] === 0) delete counts[previous];
  }

  // Eyni növ təkrar basıldı → ləğv.
  if (previous === type) return { counts, viewerReaction: null };

  counts[type] = (counts[type] ?? 0) + 1;
  return { counts, viewerReaction: type };
}

export function ReactionBar({ postId, initial }: ReactionBarProps) {
  const [, startTransition] = useTransition();

  // `useOptimistic` bazası birbaşa server məlumatıdır: sorğu uğursuz olarsa
  // React avtomatik ona qayıdır və istifadəçi yanlış vəziyyət görmür.
  const [state, addOptimistic] = useOptimistic(initial, applyToggle);

  const total = Object.values(state.counts).reduce((sum, n) => sum + n, 0);

  function toggle(type: string) {
    startTransition(async () => {
      addOptimistic(type);
      const result = await toggleReactionAction({ postId, type });
      if (!result.ok) toast.error(result.message ?? "Reaksiya saxlanmadı.");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {REACTION_OPTIONS.map((type) => {
        const meta = REACTION_META[type];
        const Icon = FEED_ICONS[meta.icon];
        const count = state.counts[type] ?? 0;
        const isActive = state.viewerReaction === type;

        return (
          <Button
            key={type}
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={isActive}
            aria-label={`${meta.label}${count > 0 ? ` (${count})` : ""}`}
            onClick={() => toggle(type)}
            className={cn(
              "gap-2",
              isActive && "border-ku-green bg-ku-soft text-ku-dark hover:bg-ku-soft",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{meta.label}</span>
            {count > 0 ? <span className="tabular-nums">{count}</span> : null}
          </Button>
        );
      })}

      {total > 0 ? (
        <span className="text-caption text-text-secondary">Cəmi {total} reaksiya</span>
      ) : null}
    </div>
  );
}
