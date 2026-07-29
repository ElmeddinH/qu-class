// ============================================================================
// src/features/class-home/MemberCard.tsx
// Üzv kartı — "Yeni üzvlər" və "Tanışlıq kartları" widget-lərinin ortaq parçası.
//
// ⚠️ Giriş obyekti `redactProfile`-dan KEÇMİŞ formadır: gizlədilmiş sahə
// obyektdə ÜMUMİYYƏTLƏ YOXDUR (`null` deyil). Buna görə hər sahə `?`-lə
// yoxlanılır — "sahə var, amma boşdur" ilə "sahə görünmür" eyni cür,
// yəni sadəcə göstərilməmək kimi davranır.
//
// Avatar + ad + rol rozeti bloku `components/shared/MemberIdentity`-dədir:
// Class Directory kartı (Blok 6) eyni blokdan istifadə edir, dublikat yoxdur.
// ============================================================================

import { MemberIdentity } from "@/components/shared/MemberIdentity";
import { Badge } from "@/components/ui/badge";
import { cohortRoleLabel } from "@/lib/labels";
import type { CohortMemberCard } from "@/services/cohort.service";

import { isSpecialRole } from "./catalog";

interface MemberCardProps {
  member: CohortMemberCard;
  /** Kartın altında göstərilən ortaq taqlar (tanışlıq kartları üçün). */
  sharedTags?: string[];
}

export function MemberCard({ member, sharedTags }: MemberCardProps) {
  const subtitle =
    member.currentPosition && member.currentCompany
      ? `${member.currentPosition} · ${member.currentCompany}`
      : (member.hometown ?? member.currentCity ?? null);

  return (
    <li className="flex h-full flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <MemberIdentity
        id={member.id}
        firstName={member.firstName}
        lastName={member.lastName}
        avatarUrl={member.avatarUrl}
        subtitle={subtitle}
        roleLabel={isSpecialRole(member.role) ? cohortRoleLabel(member.role) : null}
      />

      {member.bio ? (
        <p className="line-clamp-2 text-caption text-text-secondary">{member.bio}</p>
      ) : null}

      {sharedTags && sharedTags.length > 0 ? (
        <div className="mt-auto flex flex-col gap-1">
          <span className="text-caption text-text-secondary">Ortaq maraqlar</span>
          <ul className="flex flex-wrap gap-1">
            {sharedTags.map((tag) => (
              <li key={tag}>
                <Badge className="bg-ku-blue text-caption font-normal text-text-primary hover:bg-ku-blue">
                  {tag}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}
