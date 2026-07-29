// ============================================================================
// src/features/profile/PreviewBanner.tsx
// "Preview as" idarəedicisi — rejim keçidləri və xəbərdarlıq banneri.
//
// Client JS-ə ehtiyac yoxdur: rejimlər adi link-lərdir (`?as=`), server
// komponenti onları oxuyur. Beləliklə preview yalnız serverdəki əsl məxfilik
// yolundan keçir.
// ============================================================================

import Link from "next/link";
import { Eye, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  PREVIEW_DESCRIPTIONS,
  PREVIEW_LABELS,
  PREVIEW_MODES,
  PREVIEW_PARAM,
  type PreviewMode,
} from "./preview";

interface PreviewBannerProps {
  userId: string;
  /** `null` — preview sönülüdür (öz profilini olduğu kimi görürsən). */
  mode: PreviewMode | null;
  /** Cari rejimdə gizlədilmiş idarə olunan sahələrin sayı. */
  hiddenFieldCount: number;
}

export function PreviewBanner({ userId, mode, hiddenFieldCount }: PreviewBannerProps) {
  const basePath = `/u/${userId}`;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-avatar",
            mode ? "bg-warning" : "bg-ku-soft",
          )}
          aria-hidden
        >
          {mode ? (
            <TriangleAlert className="h-4 w-4 text-text-primary" />
          ) : (
            <Eye className="h-4 w-4 text-ku-dark" />
          )}
        </span>

        <div className="flex flex-col gap-1">
          <p className="text-body font-medium text-text-primary">
            {mode
              ? `Nümayiş rejimi: ${PREVIEW_LABELS[mode]}`
              : "Profilinizə başqasının gözü ilə baxın"}
          </p>
          <p className="text-small text-text-secondary">
            {mode
              ? `${PREVIEW_DESCRIPTIONS[mode]} Bu, real görünüşdür — məxfilik tənzimləmələriniz ${hiddenFieldCount} sahəni gizlədir.`
              : "Aşağıdakı rejimlərdən birini seçin. Bu, sizin gördüyünüz görünüşü dəyişmir, yalnız başqalarının nə gördüyünü göstərir."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Nümayiş rejimi">
        <PreviewLink href={basePath} active={mode === null}>
          Öz görünüşüm
        </PreviewLink>

        {PREVIEW_MODES.map((option) => (
          <PreviewLink
            key={option}
            href={`${basePath}?${PREVIEW_PARAM}=${option}`}
            active={mode === option}
          >
            {PREVIEW_LABELS[option]}
          </PreviewLink>
        ))}
      </div>
    </div>
  );
}

function PreviewLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-btn border px-3 py-2 text-small transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "border-ku-green bg-ku-soft font-medium text-ku-dark"
          : "border-border bg-surface text-text-secondary hover:border-ku-green hover:text-ku-dark",
      )}
    >
      {children}
    </Link>
  );
}
