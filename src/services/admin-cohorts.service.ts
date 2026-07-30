// ============================================================================
// src/services/admin-cohorts.service.ts
// Cohort (class page) yaratma və idarəsi (spec §18, Blok 11B).
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 TƏLƏ F — COHORT SLUG-U SXEM SƏVİYYƏSİNDƏ QORUNMUR
// ────────────────────────────────────────────────────────────────────────────
// `@@unique([scope, facultyId, programId, admissionYear])` DUBLİKATI HƏMİŞƏ
// DAYANDIRMIR: SQL-də iki `NULL` bir-birindən FƏRQLİ sayılır, yəni
// `scope = UNIVERSITY` (facultyId və programId null) halında məhdudiyyət
// ümumiyyətlə pozulmur. Sxem şərhi bunu açıq yazır.
//
// Əsl qoruyucu `Cohort.slug @unique`-dir və o, YALNIZ slug DETERMİNİSTİK
// olduqda işləyir: eyni ixtisas + eyni məzuniyyət ili → eyni slug → ikinci
// yaratma cəhdi unikal indeksə çırpılır. Formul `lib/admin-rules.ts` →
// `cohortSlugOf`-dadır və seed ilə EYNİDİR.
//
// Yoxlama TRANSAKSİYA İÇİNDƏDİR: kənarda `findUnique` etsək iki eyni anlı
// yaratma sorğusu hər ikisi "boşdur" görüb keçərdi. Üstəlik `P2002` (unikal
// indeks pozuntusu) də tutulur — DB son sözü deyəndir.
//
// ────────────────────────────────────────────────────────────────────────────
// SİLMƏ YOXDUR
// ────────────────────────────────────────────────────────────────────────────
// `Cohort` silinsə `onDelete: Cascade` sinfin BÜTÜN məzmununu aparır: post,
// şərh, reaksiya, xatirə, nailiyyət, xronologiya, tədbir və üzvlüklər. Bu,
// «məzuniyyətdən sonra sinif əlaqəsi davam edir» vədinin əksidir. Sxemdə
// «arxivlə» sahəsi də yoxdur, ona görə əməliyyat UI-da TƏKLİF EDİLMİR —
// mövcud olmayan düymə səhvən basıla bilməz.
// ============================================================================

import { assertFreshAdmin } from "@/lib/admin-guard";
import {
  COHORT_DATE_MESSAGES,
  checkCohortDates,
  cohortDisplayNameOf,
  cohortSlugOf,
  type CohortDateRejection,
} from "@/lib/admin-rules";
import { prisma } from "@/lib/db";
import { AuditAction, CohortScope } from "@/lib/enums";
import { resolveStage } from "@/lib/stage";
import type { Viewer } from "@/lib/visibility";
import { recordAudit } from "@/services/audit.service";
import { ensureCohortMilestones } from "@/services/timeline.service";

// ---------------------------------------------------------------------------
// Siyahı
// ---------------------------------------------------------------------------

export interface AdminCohortRow {
  id: string;
  slug: string;
  displayName: string;
  scope: string;
  facultyName: string | null;
  programName: string | null;
  admissionYear: number;
  graduationYear: number;
  academicStartsAt: Date;
  graduatesAt: Date;
  coverUrl: string | null;
  welcomeMessage: string | null;
  memberCount: number;
  /** 🔴 `User.stage` KEŞİNDƏN DEYİL — cohort tarixlərindən HESABLANIR. */
  stage: string;
}

export async function listAdminCohorts(
  viewer: Viewer,
  now: Date = new Date(),
): Promise<AdminCohortRow[]> {
  await assertFreshAdmin(viewer);

  const rows = await prisma.cohort.findMany({
    orderBy: [{ admissionYear: "desc" }, { displayName: "asc" }],
    select: {
      id: true,
      slug: true,
      displayName: true,
      scope: true,
      admissionYear: true,
      graduationYear: true,
      academicStartsAt: true,
      graduatesAt: true,
      coverUrl: true,
      welcomeMessage: true,
      faculty: { select: { name: true } },
      program: { select: { name: true } },
      _count: { select: { members: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    scope: row.scope,
    facultyName: row.faculty?.name ?? null,
    programName: row.program?.name ?? null,
    admissionYear: row.admissionYear,
    graduationYear: row.graduationYear,
    academicStartsAt: row.academicStartsAt,
    graduatesAt: row.graduatesAt,
    coverUrl: row.coverUrl,
    welcomeMessage: row.welcomeMessage,
    memberCount: row._count.members,
    stage: resolveStage(
      { academicStartsAt: row.academicStartsAt, graduatesAt: row.graduatesAt },
      now,
    ),
  }));
}

/** Yaratma formasının kataloqu: fakültə → ixtisas. */
export interface AdminProgramOption {
  id: string;
  name: string;
  slug: string;
  facultyId: string;
  facultyName: string;
}

export async function listAdminProgramOptions(
  viewer: Viewer,
): Promise<AdminProgramOption[]> {
  await assertFreshAdmin(viewer);

  const programs = await prisma.program.findMany({
    orderBy: [{ faculty: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      facultyId: true,
      faculty: { select: { name: true } },
    },
  });

  return programs.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    facultyId: p.facultyId,
    facultyName: p.faculty.name,
  }));
}

// ---------------------------------------------------------------------------
// Yaratma
// ---------------------------------------------------------------------------

export type CohortCreateFailure =
  | "PROGRAM_NOT_FOUND"
  | "SLUG_TAKEN"
  | CohortDateRejection;

export const COHORT_FAILURE_MESSAGES: Record<CohortCreateFailure, string> = {
  PROGRAM_NOT_FOUND: "İxtisas tapılmadı.",
  SLUG_TAKEN:
    "Bu ixtisas və məzuniyyət ili üçün sinif ARTIQ MÖVCUDDUR. Slug deterministikdir, ona görə təkrar yaradıla bilməz.",
  ...COHORT_DATE_MESSAGES,
};

export interface CreateCohortInput {
  programId: string;
  admissionYear: number;
  graduationYear: number;
  academicStartsAt: Date;
  graduatesAt: Date;
  welcomeMessage: string | null;
}

export type CreateCohortResult =
  | { ok: true; value: { id: string; slug: string; displayName: string } }
  | { ok: false; reason: CohortCreateFailure };

/** Prisma-nın unikal indeks pozuntusu kodu. */
const UNIQUE_VIOLATION = "P2002";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}

/**
 * Yeni sinif yaradır.
 *
 * TƏK TRANSAKSİYA:
 *   1. slug-ın mövcudluğu yoxlanılır (TƏLƏ F — kənarda deyil, İÇƏRİDƏ)
 *   2. `Cohort` yaradılır
 *   3. AuditLog
 *
 * ⚠️ `ensureCohortMilestones` transaksiyadan SONRA çağırılır: o, öz
 * transaksiyasını açır (iç-içə transaksiya SQLite-da dəstəklənmir) və
 * idempotentdir — sinxronlaşma uğursuz olsa belə sinif yaradılmış qalır və
 * xronologiya səhifəsinin ilk açılışı milestone-ları özü qurur.
 */
export async function createCohort(
  viewer: Viewer,
  input: CreateCohortInput,
): Promise<CreateCohortResult> {
  const admin = await assertFreshAdmin(viewer);

  const dateRejection = checkCohortDates(input.academicStartsAt, input.graduatesAt);
  if (dateRejection !== null) return { ok: false, reason: dateRejection };

  const program = await prisma.program.findUnique({
    where: { id: input.programId },
    select: { id: true, name: true, slug: true, facultyId: true },
  });
  if (!program) return { ok: false, reason: "PROGRAM_NOT_FOUND" };

  const slug = cohortSlugOf(program.slug, input.graduationYear);
  const displayName = cohortDisplayNameOf(program.name, input.graduationYear);

  let createdId: string | null = null;
  let taken = false;

  try {
    await prisma.$transaction(async (tx) => {
      // (1) Mövcudluq yoxlaması TRANSAKSİYA İÇİNDƏ — fayl başlığına bax.
      const existing = await tx.cohort.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (existing) {
        taken = true;
        return;
      }

      const created = await tx.cohort.create({
        data: {
          scope: CohortScope.PROGRAM,
          facultyId: program.facultyId,
          programId: program.id,
          admissionYear: input.admissionYear,
          graduationYear: input.graduationYear,
          academicStartsAt: input.academicStartsAt,
          graduatesAt: input.graduatesAt,
          displayName,
          slug,
          welcomeMessage: input.welcomeMessage,
        },
        select: { id: true },
      });
      createdId = created.id;

      await recordAudit(tx, {
        actorId: admin.userId,
        action: AuditAction.CREATE,
        entityType: "Cohort",
        entityId: created.id,
        metadata: { operation: "createCohort", slug, to: displayName },
      });
    });
  } catch (error) {
    // (2) İKİNCİ QAT: unikal indeks. Yoxlama ilə yazma arasında başqa proses
    // eyni slug-ı yarada bilər — DB son sözü deyəndir.
    if (isUniqueViolation(error)) return { ok: false, reason: "SLUG_TAKEN" };
    throw error;
  }

  if (taken || createdId === null) return { ok: false, reason: "SLUG_TAKEN" };

  await ensureCohortMilestones(createdId);

  return { ok: true, value: { id: createdId, slug, displayName } };
}

// ---------------------------------------------------------------------------
// Redaktə
// ---------------------------------------------------------------------------

export interface UpdateCohortInput {
  cohortId: string;
  displayName: string;
  coverUrl: string | null;
  welcomeMessage: string | null;
  academicStartsAt: Date;
  graduatesAt: Date;
}

export type UpdateCohortResult =
  | { ok: true; value: { id: string; slug: string } }
  | { ok: false; reason: "NOT_FOUND" | CohortDateRejection };

/**
 * Sinfin redaktəsi.
 *
 * 🔴 `slug` REDAKTƏ EDİLMİR: o, mövcud ünvanların (`/class/<slug>/…`) açarıdır
 * və dəyişsə bütün paylaşılmış linklər, bildiriş `url`-ləri və seed-dəki
 * istinadlar sınardı. Slug ixtisas + məzuniyyət ilindən TÖRƏYİR — dəyişməsi
 * lazımdırsa səbəb məhz onlardadır.
 *
 * ⚠️ TARİX DƏYİŞƏNDƏ `ensureCohortMilestones` YENİDƏN çağırılır: o,
 * idempotentdir və siyahıda olmayan köhnə milestone-ları SİLİR, yəni "Dərslər
 * başladı" qeydi köhnə tarixdə asılı qalmır (bax `timeline.service.ts`).
 */
export async function updateCohort(
  viewer: Viewer,
  input: UpdateCohortInput,
): Promise<UpdateCohortResult> {
  const admin = await assertFreshAdmin(viewer);

  const dateRejection = checkCohortDates(input.academicStartsAt, input.graduatesAt);
  if (dateRejection !== null) return { ok: false, reason: dateRejection };

  const cohort = await prisma.cohort.findUnique({
    where: { id: input.cohortId },
    select: {
      id: true,
      slug: true,
      displayName: true,
      academicStartsAt: true,
      graduatesAt: true,
    },
  });
  if (!cohort) return { ok: false, reason: "NOT_FOUND" };

  const datesChanged =
    cohort.academicStartsAt.getTime() !== input.academicStartsAt.getTime() ||
    cohort.graduatesAt.getTime() !== input.graduatesAt.getTime();

  await prisma.$transaction(async (tx) => {
    await tx.cohort.update({
      where: { id: cohort.id },
      data: {
        displayName: input.displayName,
        coverUrl: input.coverUrl,
        welcomeMessage: input.welcomeMessage,
        academicStartsAt: input.academicStartsAt,
        graduatesAt: input.graduatesAt,
      },
    });

    await recordAudit(tx, {
      actorId: admin.userId,
      action: AuditAction.UPDATE,
      entityType: "Cohort",
      entityId: cohort.id,
      metadata: {
        operation: "updateCohort",
        from: cohort.displayName,
        to: input.displayName,
        slug: cohort.slug,
      },
    });
  });

  if (datesChanged) await ensureCohortMilestones(cohort.id);

  return { ok: true, value: { id: cohort.id, slug: cohort.slug } };
}

/** Tək sinif — redaktə formasının ilkin dəyərləri. */
export async function getAdminCohort(
  viewer: Viewer,
  cohortId: string,
  now: Date = new Date(),
): Promise<AdminCohortRow | null> {
  const rows = await listAdminCohorts(viewer, now);
  return rows.find((row) => row.id === cohortId) ?? null;
}
