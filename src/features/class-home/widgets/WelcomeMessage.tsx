// ============================================================================
// spec §16 blok 4 — Welcome Message.
// Cohort sətrindən gəlir (`Cohort.welcomeMessage`), əlavə sorğu tələb etmir.
// ============================================================================

import { MessageSquareQuote } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";

import { WidgetCard } from "../WidgetCard";
import type { ClassHomeWidgetProps } from "../types";

export function WelcomeMessage({ cohort, headingId }: ClassHomeWidgetProps) {
  return (
    <WidgetCard
      headingId={headingId}
      title="Xoş gəlmisiniz"
      icon="sparkles"
      description="Sinif nümayəndəsinin bütün üzvlərə mesajı."
    >
      {cohort.welcomeMessage ? (
        <blockquote className="border-l-2 border-ku-green pl-4 text-body text-text-primary">
          {cohort.welcomeMessage}
        </blockquote>
      ) : (
        <EmptyState
          icon={MessageSquareQuote}
          title="Salamlama mesajı hələ yazılmayıb"
          description="Sinif nümayəndəsi və ya moderator bu mesajı Class Page tənzimləmələrindən əlavə edə bilər."
        />
      )}
    </WidgetCard>
  );
}
