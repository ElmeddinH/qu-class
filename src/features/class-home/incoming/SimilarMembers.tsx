// ============================================================================
// INCOMING widget-i — tanışlıq kartları: "sənin kimi maraqları olanlar".
//
// Uyğunluq `UserTag` üst-üstə düşməsindən gəlir (maraq / hobbi / bacarıq / dil).
//
// ⚠️ MƏXFİLİK: maraqlarını `PRIVATE` işarələyən istifadəçi namizəd OLMUR
// (süzgəc DB-dədir — bax `cohort.service.ts` → `listSimilarMembers`), və
// göstərilən ortaq taqlar `redactProfile`-dan SONRA hesablanır. Yəni gizlədilən
// maraq nə siyahıda iştirakla, nə də rozetlə sızmır.
// ============================================================================

import { Lock, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { getViewer } from "@/lib/auth";
import { listSimilarMembers } from "@/services/cohort.service";

import { MemberCard } from "../MemberCard";
import { WidgetCard } from "../WidgetCard";
import type { ClassHomeWidgetProps } from "../types";

const SIMILAR_LIMIT = 4;

export async function SimilarMembers({ cohort, headingId }: ClassHomeWidgetProps) {
  const viewer = await getViewer();
  const members = await listSimilarMembers(viewer, cohort.id, SIMILAR_LIMIT);

  return (
    <WidgetCard
      headingId={headingId}
      title="Sənin kimi maraqları olanlar"
      icon="compass"
      description="Ortaq maraq, hobbi və bacarıqlara görə seçilmiş sinif yoldaşların."
      action={{ href: `/class/${cohort.slug}/directory`, label: "Kataloq" }}
    >
      {members.length === 0 ? (
        cohort.isMember ? (
          <EmptyState
            icon={Sparkles}
            title="Hələ uyğunluq tapılmadı"
            description="Profilinizə maraq, hobbi və bacarıq əlavə etdikcə burada sizə yaxın adamlar görünəcək."
            action={{ href: "/me", label: "Maraqlarımı əlavə et" }}
          />
        ) : (
          <EmptyState
            icon={Lock}
            title="Tanışlıq kartları bağlıdır"
            description="Bu bölmə yalnız həmin sinfin üzvlərinə göstərilir."
          />
        )
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {members.map((member) => (
            <MemberCard key={member.id} member={member} sharedTags={member.sharedTags} />
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
