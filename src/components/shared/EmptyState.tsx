// ============================================================================
// src/components/shared/EmptyState.tsx
// Boş vəziyyət — CLAUDE.md "Boş ekran buraxma" qaydasının vahid forması.
//
// Boş siyahı ≠ boş ekran: istifadəçi NƏYİN olmadığını və NƏ EDƏ biləcəyini
// görməlidir. Ona görə `title` və `description` məcburidir, `action` isə
// mümkün olduqda verilir.
//
// ⚠️ SERVER komponentidir (`"use client"` YOXDUR) — Class Page widget-ləri
// serverdə render olunur. İkon KOMPONENT kimi ötürülür və bu təhlükəsizdir,
// çünki sərhəd keçilmir; client komponentindən işlədiləcəksə ikonu client
// tərəfdə reyestrdən çevir (CLAUDE.md §12).
// ============================================================================

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { href: string; label: string };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-card border border-dashed border-border px-6 py-8 text-center",
        className,
      )}
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-avatar bg-ku-soft"
        aria-hidden
      >
        <Icon className="h-6 w-6 text-ku-dark" />
      </span>

      <div className="flex flex-col gap-1">
        <p className="text-h4 font-medium text-text-primary">{title}</p>
        <p className="text-small text-text-secondary">{description}</p>
      </div>

      {action ? (
        <Button asChild variant="outline" size="sm">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}
