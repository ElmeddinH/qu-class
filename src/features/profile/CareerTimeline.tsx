// ============================================================================
// src/features/profile/CareerTimeline.tsx
// Məzun profilinin karyera XRONOLOGİYASI və təhsil siyahısı.
//
// CV cədvəli deyil, VAXT OXUDUR (spec §9 — profil hekayədir): qeydlər şaquli
// xətt üzərində, ən yenisi yuxarıda. "İndi" qeydi ayrıca rozetlə işarələnir.
//
// ⚠️ Sətirlərin özü artıq süzülüb: `buildProfileView` hər `CareerEntry` /
// `EducationEntry` sətrinə `visibilityWhereForUserOwned()` tətbiq edir (DB-də).
// Yəni burada görünməməli qeyd ÜMUMİYYƏTLƏ yoxdur — komponentdə filtr YAZMA.
//
// ⚠️ Yalnız ŞƏHƏR/ÖLKƏ göstərilir. Dəqiq ünvan profildə də görünmür (spec §13).
// ============================================================================

import { Building2, GraduationCap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { degreeLabel, industryLabel } from "@/lib/labels";
import type {
  ProfileCareerEntry,
  ProfileEducationEntry,
} from "@/services/user.service";

/**
 * "Oktyabr 2022" — gün göstərilmir.
 *
 * `utils/date.ts`-dəki `shortDate` günü də yazır ("5 İyul 2026") və lent
 * kartları üçün doğrudur; iş yeri dövrü isə ay dəqiqliyində göstərilir.
 */
const MONTH_FORMATTER = new Intl.DateTimeFormat("az", {
  year: "numeric",
  month: "long",
});

function monthYear(value: Date): string {
  return MONTH_FORMATTER.format(value);
}

interface TimelineRowProps {
  title: string;
  subtitle: string;
  period: string;
  isCurrent: boolean;
  description?: string | null;
  isLast: boolean;
}

/** Vaxt oxunun bir qeydi: nöqtə + şaquli xətt + məzmun. */
function TimelineRow({
  title,
  subtitle,
  period,
  isCurrent,
  description,
  isLast,
}: TimelineRowProps) {
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {/* Şaquli xətt — sonuncu qeyddə çəkilmir ki, oxun sonu görünsün. */}
      {!isLast ? (
        <span
          className="absolute left-[7px] top-4 h-full w-px bg-border"
          aria-hidden
        />
      ) : null}

      <span
        className={`relative mt-1.5 h-4 w-4 shrink-0 rounded-avatar border-2 ${
          isCurrent ? "border-ku-green bg-ku-green" : "border-border bg-surface"
        }`}
        aria-hidden
      />

      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-body font-medium text-text-primary">{title}</p>
          {isCurrent ? (
            <Badge className="bg-ku-soft text-caption text-ku-dark hover:bg-ku-soft">
              İndi
            </Badge>
          ) : null}
        </div>

        <p className="text-small text-text-secondary">{subtitle}</p>
        <p className="text-caption text-text-secondary">{period}</p>

        {description ? (
          <p className="whitespace-pre-line text-small text-text-secondary">{description}</p>
        ) : null}
      </div>
    </li>
  );
}

export function CareerTimeline({ entries }: { entries: ProfileCareerEntry[] }) {
  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => {
        const place = [entry.city, entry.country].filter(Boolean).join(", ");
        const details = [place, entry.industry ? industryLabel(entry.industry) : null]
          .filter(Boolean)
          .join(" · ");

        return (
          <TimelineRow
            key={entry.id}
            title={entry.position}
            subtitle={
              details ? `${entry.company} · ${details}` : entry.company
            }
            period={`${monthYear(entry.startDate)} — ${
              entry.endDate ? monthYear(entry.endDate) : "indiyədək"
            }`}
            isCurrent={entry.isCurrent}
            description={entry.description}
            isLast={index === entries.length - 1}
          />
        );
      })}
    </ol>
  );
}

export function EducationList({ entries }: { entries: ProfileEducationEntry[] }) {
  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => {
        const details = [entry.field, entry.country].filter(Boolean).join(" · ");

        return (
          <TimelineRow
            key={entry.id}
            title={entry.institution}
            subtitle={
              details ? `${degreeLabel(entry.degree)} · ${details}` : degreeLabel(entry.degree)
            }
            period={`${entry.startYear} — ${entry.endYear ?? "indiyədək"}`}
            isCurrent={entry.isCurrent}
            isLast={index === entries.length - 1}
          />
        );
      })}
    </ol>
  );
}

/** Bölmə başlıqlarında işlədilən ikonlar — kartın kontekstini bir baxışda verir. */
export const CAREER_ICON = Building2;
export const EDUCATION_ICON = GraduationCap;
