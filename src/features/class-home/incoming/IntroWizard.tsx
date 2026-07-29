// ============================================================================
// INCOMING widget-i — "Özünü təqdim et" onboarding sihirbazı (spec §16).
//
// Dörd addım + tamamlanma faizi. Faiz ADDIM sayına görə deyil, TƏLƏB sayına
// görə hesablanır (`lib/onboarding.ts`) — iki sahəlik addımın yarısını
// dolduran istifadəçi də irəliləyiş görür.
//
// ⚠️ Sorğu yalnız viewer-in ÖZ profilinə gedir (`getOnboardingProgress`
// `viewer.userId`-dən başqa `userId` qəbul etmir) — başqasının tamamlanma
// vəziyyətini oxumaq mümkün deyil.
// ============================================================================

import Link from "next/link";
import { Check, UserRoundPen } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth";
import { onboardingStepHref } from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import { getOnboardingProgress } from "@/services/user.service";

import { WidgetCard } from "../WidgetCard";
import type { ClassHomeWidgetProps } from "../types";
import { ONBOARDING_STEP_META } from "./steps";

export async function IntroWizard({ cohort, headingId }: ClassHomeWidgetProps) {
  const viewer = await getViewer();
  const progress = await getOnboardingProgress(viewer);

  if (!progress) {
    return (
      <WidgetCard headingId={headingId} title="Özünü təqdim et" icon="userCheck">
        <EmptyState
          icon={UserRoundPen}
          title="Profil məlumatı əlçatan deyil"
          description="Sihirbaz yalnız öz hesabınızla giriş etdikdə göstərilir."
        />
      </WidgetCard>
    );
  }

  const done = progress.percent === 100;
  const nextStep = progress.nextStep;
  const nextMeta = nextStep ? ONBOARDING_STEP_META[nextStep] : null;

  return (
    <WidgetCard
      headingId={headingId}
      title="Özünü təqdim et"
      icon="userCheck"
      description={
        done
          ? "Profiliniz tamamdır — sinif yoldaşlarınız sizi tapa bilər."
          : `${cohort.displayName} sinfinə xoş gəldiniz. Profilinizi tamamlayın ki, tanışlıq kartları sizi də göstərsin.`
      }
      footer={
        nextStep && nextMeta ? (
          <Button asChild className="gap-2">
            <Link href={onboardingStepHref(nextStep)}>{nextMeta.cta}</Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/me/privacy">Məxfilik seçimlərini nəzərdən keçir</Link>
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-small text-text-secondary">
            {progress.completedSteps}/{progress.totalSteps} addım tamamlanıb
          </span>
          <span className="text-h3 font-semibold text-ku-green">{progress.percent}%</span>
        </div>

        {/* Yerli progress elementi: shadcn `progress` primitivi layihəyə
            əlavə edilməyib, yeni asılılıq isə soruşmadan gətirilmir. */}
        <div
          className="h-2 w-full overflow-hidden rounded-badge bg-border"
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profilin tamamlanma faizi"
        >
          <div
            className="h-full rounded-badge bg-ku-green transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      <ol className="flex flex-col gap-2">
        {progress.steps.map((step, index) => {
          const meta = ONBOARDING_STEP_META[step.key];
          const isNext = step.key === progress.nextStep;

          return (
            <li
              key={step.key}
              className={cn(
                "flex items-start gap-3 rounded-card border p-3",
                step.done && "border-border bg-background",
                isNext && "border-ku-green bg-ku-soft/30",
                !step.done && !isNext && "border-border",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-avatar text-caption font-medium",
                  step.done
                    ? "bg-ku-green text-white"
                    : "border border-border bg-surface text-text-secondary",
                )}
                aria-hidden
              >
                {step.done ? <Check className="h-3 w-3" /> : index + 1}
              </span>

              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-small font-medium text-text-primary">
                    {meta.title}
                  </span>
                  {step.required > 1 ? (
                    <span className="text-caption text-text-secondary">
                      {step.filled}/{step.required}
                    </span>
                  ) : null}
                  <span className="sr-only">
                    {step.done ? "tamamlanıb" : "tamamlanmayıb"}
                  </span>
                </div>

                <p className="text-caption text-text-secondary">{meta.description}</p>

                {!step.done ? (
                  <Link
                    href={onboardingStepHref(step.key)}
                    className="w-fit text-caption text-ku-green underline-offset-4 hover:underline"
                  >
                    {meta.cta}
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </WidgetCard>
  );
}
