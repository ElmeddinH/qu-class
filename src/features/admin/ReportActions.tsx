"use client";

// ============================================================================
// src/features/admin/ReportActions.tsx
// Bir şikayət sətri üçün moderator əməliyyatları.
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 TƏLƏ A — MƏZMUN YALNIZ «MODERASİYA BAXIŞI» İLƏ AÇILIR
// ────────────────────────────────────────────────────────────────────────────
// Bu komponent SERVERDƏN məzmun ALMIR: `props`-da nə `body`, nə `title` var.
// Mətn yalnız düymə basıldıqdan sonra, `reviewReportAction`-ın cavabında gəlir
// və o action servisdə AuditLog sətrini ƏVVƏLCƏ yazır (eyni transaksiyada).
// Yəni səhifənin HTML-ində baxışdan əvvəl məzmunun izi belə yoxdur.
//
// ⚠️ Açılan mətn `state`-də saxlanılır və səhifə yenilənəndə itir — bu,
// qəsdəndir: baxış BİR DƏFƏLİK hərəkətdir və hər açılış jurnalda yeni sətir
// yaradır.
//
// ⚠️ `ACCESSIBILITY` qeydlərində baxış düyməsi GÖSTƏRİLMİR: `entityId` DB
// sətri deyil, SƏHİFƏ YOLUDUR (11A qərarı) — açılacaq məzmun yoxdur.
// ============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VisibilityBadge } from "@/components/shared/VisibilityBadge";
import { ReportStatus } from "@/lib/enums";
import { exactDateTime } from "@/utils/date";
import type { ModerationContent } from "@/services/moderation.service";

import {
  decideReportAction,
  hideContentAction,
  reviewReportAction,
} from "./actions";

interface ReportActionsProps {
  reportId: string;
  /** Şikayət bağlanıbmı? Bağlıdırsa qərar düymələri göstərilmir. */
  closed: boolean;
  /** Əlçatanlıq bileti — ayrı həll düymələri, məzmun baxışı YOX. */
  accessibility: boolean;
  /** Məzmun gizlədilə bilirmi? (`POST` / `COMMENT` / `MEMORY`) */
  hideable: boolean;
  /** Hədəf hələ mövcuddurmu? */
  targetExists: boolean;
}

/**
 * Əlçatanlıq bileti üçün hazır həll mətnləri.
 * ⚠️ «Məzmunu gizlət» ilə həll olunmur — bu, texniki nasazlıq biletidir.
 */
const ACCESSIBILITY_RESOLUTIONS = [
  { label: "Qeydə alındı", text: "Qeydə alındı — texniki iş siyahısına əlavə edildi." },
  { label: "Düzəldildi", text: "Maneə aradan qaldırıldı." },
] as const;

export function ReportActions({
  reportId,
  closed,
  accessibility,
  hideable,
  targetExists,
}: ReportActionsProps) {
  const [content, setContent] = useState<ModerationContent | null>(null);
  const [resolution, setResolution] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const resolutionId = `report-resolution-${reportId}`;

  const review = () => {
    startTransition(async () => {
      const result = await reviewReportAction({ reportId });
      if (!result.ok || result.value === undefined) {
        toast.error(result.message ?? "Baxış açılmadı.");
        return;
      }
      setContent(result.value);
      toast.success("Baxış audit jurnalına yazıldı.");
      // Jurnal səhifəsi dəyişdi — açıq olan başqa tab-da köhnə qalmasın.
      router.refresh();
    });
  };

  const decide = (decision: "IN_REVIEW" | "RESOLVED" | "REJECTED", text?: string) => {
    startTransition(async () => {
      const result = await decideReportAction({
        reportId,
        decision,
        resolution: text ?? resolution,
      });

      if (!result.ok) {
        toast.error(result.message ?? "Qərar yazılmadı.");
        return;
      }

      toast.success(result.message ?? "Qərar yazıldı.");
      setResolution("");
      router.refresh();
    });
  };

  const hide = () => {
    startTransition(async () => {
      const result = await hideContentAction({ reportId });
      if (!result.ok) {
        toast.error(result.message ?? "Əməliyyat tamamlanmadı.");
        return;
      }
      toast.success(result.message ?? "Məzmun gizlədildi.");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* --- Moderasiya baxışı (TƏLƏ A) --- */}
      {accessibility ? null : (
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || !targetExists}
            onClick={review}
            className="w-fit"
          >
            <Eye className="mr-2 h-4 w-4" aria-hidden />
            Moderasiya baxışı
          </Button>

          <p className="text-caption text-text-secondary">
            {targetExists
              ? "Məzmun yalnız bu düymə ilə açılır və hər açılış audit jurnalına yazılır."
              : "Şikayət olunan obyekt artıq mövcud deyil."}
          </p>

          {content === null ? null : (
            <div className="flex flex-col gap-2 rounded-card border border-warning bg-warning/10 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-normal">
                  {content.kind}
                </Badge>
                {content.visibility === null ? null : (
                  <VisibilityBadge level={content.visibility} />
                )}
                <span className="text-caption text-text-primary">
                  {content.author === null
                    ? "Müəllif bilinmir"
                    : `${content.author.firstName} ${content.author.lastName}`}
                </span>
                {content.createdAt === null ? null : (
                  <span className="text-caption text-text-secondary">
                    {exactDateTime(content.createdAt)}
                  </span>
                )}
              </div>

              {content.title === null ? null : (
                <p className="text-small font-medium text-text-primary">
                  {content.title}
                </p>
              )}
              <p className="whitespace-pre-wrap text-small text-text-primary">
                {content.body ?? "— mətn yoxdur —"}
              </p>
            </div>
          )}
        </div>
      )}

      {closed ? null : (
        <div className="flex flex-col gap-3">
          {accessibility ? (
            <div className="flex flex-wrap gap-2">
              {ACCESSIBILITY_RESOLUTIONS.map((option) => (
                <Button
                  key={option.label}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => decide(ReportStatus.RESOLVED, option.text)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor={resolutionId} className="text-caption text-text-secondary">
                  Qərarın izahı (həll və rədd üçün məcburidir)
                </Label>
                <Textarea
                  id={resolutionId}
                  value={resolution}
                  onChange={(event) => setResolution(event.target.value)}
                  rows={2}
                  placeholder="Şikayət yoxlanıldı…"
                  className="rounded-input"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => decide(ReportStatus.IN_REVIEW)}
                >
                  Baxışa götür
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => decide(ReportStatus.RESOLVED)}
                >
                  Həll edildi
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => decide(ReportStatus.REJECTED)}
                >
                  Rədd et
                </Button>

                {hideable && targetExists ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={hide}
                  >
                    <EyeOff className="mr-2 h-4 w-4" aria-hidden />
                    Məzmunu gizlət
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
