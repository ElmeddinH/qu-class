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

/**
 * Fakültə kataloqu — tədbir formasının «fakültə» seçimi (Blok 9).
 *
 * ⚠️ `listRegistrationCatalog`-dan FƏRQLİDİR: orada yalnız cohort-u OLAN
 * fakültələr gəlir (qeydiyyat uyğun sinif tapmalıdır), burada isə HAMISI —
 * fakültə səviyyəli tədbir hələ heç bir sinfi olmayan fakültədə də keçirilə
 * bilər.
 */
export async function listFacultyOptions(): Promise<Array<{ id: string; name: string }>> {
  return prisma.faculty.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

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

// ---------------------------------------------------------------------------
// Fakültə səhifələri [M2] — `/faculties` və `/faculties/[slug]`
// ---------------------------------------------------------------------------

export interface FacultyCard {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** Fakültənin ixtisas sayı — STRUKTUR rəqəmi. */
  programCount: number;
  /** Bu fakültədə açılmış sinif səhifələrinin sayı. */
  cohortCount: number;
}

/**
 * `/faculties` — dörd fakültə kartı.
 *
 * 🔴 AQREQASİYA QAYDASI: burada ÜZV SAYI YOXDUR (10A-nın başlıq zolağı qaydası
 * və `getStructureCounts` şərhi ilə eyni). Göstərilən iki rəqəm universitetin
 * AÇIQ strukturudur — neçə ixtisas var, neçə sinif səhifəsi açılıb. «Bu
 * fakültədə 42 tələbə var» isə ictimai səhifədə fərdiləşməyə açılan qapıdır:
 * kiçik siniflərdə say + qəbul ili + ixtisas üçlüyü konkret adamı işarələyir.
 *
 * ⚠️ Bura `Viewer` GƏLMİR — fakültə/ixtisas redaksiya-struktur məlumatıdır
 * (fayl başlığındaki səbəb). Sayğaclar isə İSTİFADƏÇİ sətirlərini deyil,
 * struktur sətirlərini sayır, yəni `visibilityWhere` tətbiq ediləcək məzmun
 * yoxdur.
 */
export async function listFacultyCards(): Promise<FacultyCard[]> {
  const faculties = await prisma.faculty.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      _count: { select: { programs: true, cohorts: true } },
    },
  });

  return faculties.map((faculty) => ({
    id: faculty.id,
    slug: faculty.slug,
    name: faculty.name,
    description: faculty.description,
    programCount: faculty._count.programs,
    cohortCount: faculty._count.cohorts,
  }));
}

export interface FacultyProgramDetail {
  id: string;
  slug: string;
  name: string;
  degree: string;
  /** Bu ixtisas üzrə AÇILMIŞ sinif səhifələrinin sayı (spec §2 tələbi). */
  openClassCount: number;
  /** Sinif səhifəsi açılmış qəbul illəri (azalan). */
  admissionYears: number[];
}

export interface FacultyDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  programs: FacultyProgramDetail[];
}

/**
 * `/faculties/[slug]` — fakültə detalı.
 *
 * 🔴 «AÇIQ SİNİFLƏRİN SAYI» GÖSTƏRİLİR, ÜZV SAYI YOX. Fərq spec §2-nin
 * "fakültələr və ixtisaslar" bəndi ilə məxfilik qaydası arasındakı sərhəddir:
 * sinif səhifəsinin MÖVCUDLUĞU açıq faktdır (qeydiyyat forması onsuz da
 * göstərir), içindəki adam sayı isə deyil.
 *
 * Tapılmasa `null` → səhifə `notFound()` çağırır.
 */
export async function getFacultyDetail(slug: string): Promise<FacultyDetail | null> {
  const faculty = await prisma.faculty.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      programs: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          degree: true,
          // ⚠️ Yalnız `PROGRAM` scope-lu cohort-lar sayılır: fakültə və
          // universitet səviyyəli cohort-un `programId`-si onsuz da `null`-dır,
          // amma şərt AÇIQ yazılır ki, sxem dəyişsə say səssizcə şişməsin.
          cohorts: {
            where: { scope: CohortScope.PROGRAM },
            orderBy: { admissionYear: "desc" },
            select: { admissionYear: true },
          },
        },
      },
    },
  });

  if (!faculty) return null;

  return {
    id: faculty.id,
    slug: faculty.slug,
    name: faculty.name,
    description: faculty.description,
    programs: faculty.programs.map((program) => ({
      id: program.id,
      slug: program.slug,
      name: program.name,
      degree: program.degree,
      openClassCount: program.cohorts.length,
      admissionYears: [...new Set(program.cohorts.map((c) => c.admissionYear))],
    })),
  };
}

/** `generateStaticParams` və e2e testi üçün — bütün fakültə slug-ları. */
export async function listFacultySlugs(): Promise<string[]> {
  const faculties = await prisma.faculty.findMany({ select: { slug: true } });
  return faculties.map((faculty) => faculty.slug);
}

// ---------------------------------------------------------------------------
// Struktur rəqəmləri — açılış səhifəsinin "Rəqəmlərlə" zolağı
// ---------------------------------------------------------------------------

export interface StructureCounts {
  faculties: number;
  programs: number;
  /** Açılmış sinif səhifələrinin sayı (`Cohort`). */
  cohorts: number;
}

/**
 * Açılış səhifəsində göstərilən STRUKTUR rəqəmləri.
 *
 * 🔴 BURADA ÜZV SAYI YOXDUR və olmayacaq. Aqreqasiya qaydası (CLAUDE.md
 * "Məxfilik modeli"): şəxsi və ya sinif səviyyəli sayğac ictimai səhifədə
 * göstərilmir — 3 nəfərlik sinifdə "üzv sayı: 3" faktı özü fərdi məlumatdır və
 * `suppressSmallBuckets()` məhz buna qarşıdır. Fakültə / ixtisas / sinif sayı
 * isə universitetin AÇIQ strukturudur (qeydiyyat forması onsuz da göstərir).
 */
export async function getStructureCounts(): Promise<StructureCounts> {
  const [faculties, programs, cohorts] = await Promise.all([
    prisma.faculty.count(),
    prisma.program.count(),
    prisma.cohort.count(),
  ]);

  return { faculties, programs, cohorts };
}
