// ============================================================================
// src/features/directory/DirectoryCard.tsx
// Kataloq profil kartı — KUDS §12: radius 12, border 1px, shadow SM, padding 24.
//
// Kimlik bloku (avatar + ad + rol rozeti) `components/shared/MemberIdentity`
// -dədir və "Yeni üzvlər" widget-i ilə ORTAQDIR — dublikat komponent yoxdur.
//
// ⚠️ HƏR SAHƏ ŞƏRTİDİR. Giriş obyekti `redactProfile`-dan keçmişdir: gizlədilən
// sahə obyektdə ÜMUMİYYƏTLƏ YOXDUR (`null` deyil). Yəni burada "sahə gizlidir"
// üçün ayrıca yoxlama etmək lazım deyil və ETMƏK OLMAZ — `undefined` yoxlaması
// həm boş dəyəri, həm gizlədilməni əhatə edir və ikisi eyni görünür (sahənin
// mövcudluğu belə sızmır).
//
// Sinif məlumatı (fakültə · ixtisas · qəbul/məzuniyyət ili) redaksiyaya tabe
// deyil — struktur məlumatdır və sorğuda yalnız viewer-in öz siniflərinə
// daraldılır (`user.service.ts` → `directorySelectFor`).
// ============================================================================

import { Briefcase, GraduationCap, MapPin } from "lucide-react";

import { MemberIdentity } from "@/components/shared/MemberIdentity";
import { Badge } from "@/components/ui/badge";
import { isSpecialRole } from "@/features/class-home/catalog";
import { cohortRoleLabel, industryLabel } from "@/lib/labels";
import type { DirectoryEntry } from "@/services/user.service";

/** Kartda göstərilən maksimum maraq çipi — qalanı "+N" kimi yığılır. */
const INTEREST_CHIP_LIMIT = 4;

function fullLocation(member: DirectoryEntry): string | null {
  const city = member.currentCity ?? null;
  const country = member.currentCountry ?? null;

  if (city && country) return `${city}, ${country}`;
  return city ?? country ?? member.hometown ?? null;
}

export function DirectoryCard({ member }: { member: DirectoryEntry }) {
  // Kataloq bir sinfin kontekstindədir; bir neçə üzvlük varsa əsas olan
  // birincidir (`directorySelectFor` → `isPrimary desc`).
  const cohort = member.cohorts[0] ?? null;

  const position =
    member.currentPosition && member.currentCompany
      ? `${member.currentPosition} · ${member.currentCompany}`
      : (member.currentPosition ?? member.currentCompany ?? null);

  const location = fullLocation(member);
  const interests = member.interests ?? [];
  const visibleInterests = interests.slice(0, INTEREST_CHIP_LIMIT);
  const hiddenInterestCount = interests.length - visibleInterests.length;

  return (
    // ⚠️ `min-w-0`: kart `ul.grid`-in xanasıdır və `min-width: auto` onu
    // uzun fakültə/ixtisas adının min-content enindən aşağı sıxılmağa qoymurdu.
    <li className="flex h-full min-w-0 flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds">
      <MemberIdentity
        id={member.id}
        firstName={member.firstName}
        lastName={member.lastName}
        avatarUrl={member.avatarUrl}
        subtitle={position}
        roleLabel={
          cohort && isSpecialRole(cohort.role) ? cohortRoleLabel(cohort.role) : null
        }
        size="lg"
      />

      <dl className="flex flex-col gap-2 text-caption text-text-secondary">
        {/* 🔴 `dt`/`dd` `dl > div`-in BİRBAŞA övladı olmalıdır (WCAG 1.3.1 —
            axe `dlitem` + `definition-list`). Əvvəl burada İKİ `div` qatı vardı
            (`dl > div > div > dt`) və HTML qruplaşdırma qaydası pozulurdu: bir
            `div` qatına icazə var, ikisinə yox. Sütun düzülüşü indi `dd`-nin
            İÇİNDƏ (`span`) qurulur — görünüş eynidir, semantika düzəlib. */}
        {cohort ? (
          <div className="flex items-start gap-2">
            <dt className="sr-only">Fakültə və ixtisas</dt>
            <dd className="flex min-w-0 items-start gap-2">
              <GraduationCap className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span className="flex min-w-0 flex-col">
                <span className="truncate">
                  {[cohort.facultyName, cohort.programName].filter(Boolean).join(" · ") ||
                    cohort.displayName}
                </span>
                <span>
                  {cohort.admissionYear}–{cohort.graduationYear}
                </span>
              </span>
            </dd>
          </div>
        ) : null}

        {location ? (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            <dt className="sr-only">Yaşadığı yer</dt>
            <dd className="truncate">{location}</dd>
          </div>
        ) : null}

        {member.industry ? (
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 shrink-0" aria-hidden />
            <dt className="sr-only">Fəaliyyət sahəsi</dt>
            <dd className="truncate">{industryLabel(member.industry)}</dd>
          </div>
        ) : null}
      </dl>

      {visibleInterests.length > 0 ? (
        <ul className="mt-auto flex flex-wrap gap-1">
          {visibleInterests.map((interest) => (
            <li key={interest}>
              <Badge className="bg-ku-blue text-caption font-normal text-text-primary hover:bg-ku-blue">
                {interest}
              </Badge>
            </li>
          ))}
          {hiddenInterestCount > 0 ? (
            <li>
              <Badge variant="outline" className="text-caption font-normal">
                +{hiddenInterestCount}
              </Badge>
            </li>
          ) : null}
        </ul>
      ) : null}
    </li>
  );
}
