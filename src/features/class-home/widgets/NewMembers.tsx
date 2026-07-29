// ============================================================================
// spec §16 blok 9 — Yeni üzvlər.
//
// ⚠️ `listNewMembers` üzv siyahısını YALNIZ sinif üzvünə qaytarır və hər sətri
// `redactProfile`-dan keçirir. Üzv olmayan viewer boş massiv alır — aşağıdakı
// boş vəziyyət bunu izah edir (`isMember` ilə ayırd olunur).
// ============================================================================

import { Lock, UserPlus } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { getViewer } from "@/lib/auth";
import { listNewMembers } from "@/services/cohort.service";

import { MemberCard } from "../MemberCard";
import { WidgetCard } from "../WidgetCard";
import type { ClassHomeWidgetProps } from "../types";

const NEW_MEMBER_LIMIT = 4;

export async function NewMembers({ cohort, headingId }: ClassHomeWidgetProps) {
  const viewer = await getViewer();
  const members = await listNewMembers(viewer, cohort.id, NEW_MEMBER_LIMIT);

  return (
    <WidgetCard
      headingId={headingId}
      title="Yeni üzvlər"
      icon="userPlus"
      description="Sinfə ən son qoşulanlar."
      action={{ href: `/class/${cohort.slug}/directory`, label: "Kataloq" }}
    >
      {members.length === 0 ? (
        cohort.isMember ? (
          <EmptyState
            icon={UserPlus}
            title="Yeni üzv yoxdur"
            description="Sinfə yeni qoşulan olduqda burada göstəriləcək."
          />
        ) : (
          <EmptyState
            icon={Lock}
            title="Üzv siyahısı bağlıdır"
            description="Sinfin üzv siyahısı yalnız həmin sinfin üzvlərinə göstərilir."
          />
        )
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {members.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
