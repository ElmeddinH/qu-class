// ============================================================================
// src/services/academic.service.ts
// Akademik struktur (fakültə → ixtisas → cohort) sorğuları.
//
// Bu qat İCTİMAİDİR: qeydiyyat forması giriş etməmiş ziyarətçiyə fakültə,
// ixtisas və qəbul ili siyahısını göstərməlidir. Burada şəxsi məlumat yoxdur
// (yalnız kataloq), buna görə `visibilityWhere` tətbiq olunmur — məxfilik
// süzgəci istifadəçi məzmununa (Post / Memory / Achievement / Event) aiddir.
// ============================================================================

import { prisma } from "@/lib/db";
import { CohortScope } from "@/lib/enums";

export interface ProgramOption {
  id: string;
  name: string;
  /** Bu ixtisas üzrə sinif səhifəsi açılmış qəbul illəri (azalan sırada). */
  admissionYears: number[];
}

export interface FacultyOption {
  id: string;
  name: string;
  programs: ProgramOption[];
}

/**
 * Qeydiyyat formasının asılı select-ləri üçün kataloq:
 * fakültə → ixtisas → qəbul ili.
 *
 * ⚠️ Yalnız `scope = PROGRAM` cohort-u MÖVCUD OLAN ixtisas/il cütləri qaytarılır.
 * Səbəb: qeydiyyat uyğun cohort tapmalıdır (PLAN.md §4.5) — seçilə bilən, amma
 * sinif səhifəsi olmayan variant istifadəçini çıxılmaz vəziyyətə salır.
 */
export async function listRegistrationCatalog(): Promise<FacultyOption[]> {
  const cohorts = await prisma.cohort.findMany({
    where: { scope: CohortScope.PROGRAM, programId: { not: null } },
    orderBy: [{ admissionYear: "desc" }],
    select: {
      admissionYear: true,
      program: {
        select: {
          id: true,
          name: true,
          faculty: { select: { id: true, name: true } },
        },
      },
    },
  });

  const faculties = new Map<string, FacultyOption>();
  const programs = new Map<string, ProgramOption>();

  for (const cohort of cohorts) {
    const program = cohort.program;
    if (!program) continue;

    let faculty = faculties.get(program.faculty.id);
    if (!faculty) {
      faculty = { id: program.faculty.id, name: program.faculty.name, programs: [] };
      faculties.set(faculty.id, faculty);
    }

    let programOption = programs.get(program.id);
    if (!programOption) {
      programOption = { id: program.id, name: program.name, admissionYears: [] };
      programs.set(program.id, programOption);
      faculty.programs.push(programOption);
    }

    if (!programOption.admissionYears.includes(cohort.admissionYear)) {
      programOption.admissionYears.push(cohort.admissionYear);
    }
  }

  const collator = new Intl.Collator("az");
  const sorted = [...faculties.values()].sort((a, b) => collator.compare(a.name, b.name));
  for (const faculty of sorted) {
    faculty.programs.sort((a, b) => collator.compare(a.name, b.name));
  }

  return sorted;
}
