// ============================================================================
// src/services/sis-import.service.ts
// SIS CSV importu — İKİ MƏRHƏLƏ: QURU İCRA (önizləmə), sonra YAZI (təsdiq).
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 TƏLƏ E — TOPLU İMPORT GERİ DÖNÜŞÜ OLMAYAN ƏMƏLİYYATDIR
// ────────────────────────────────────────────────────────────────────────────
// Qaydalar (hər biri testlə örtülüb):
//
//   1. `previewImport` BAZAYA YAZMIR. Yalnız oxuyur və hər sətir üçün nəticə
//      qaytarır: CREATE | UPDATE | REJECT (+ SƏBƏB + SƏTİR NÖMRƏSİ).
//   2. `commitImport` TƏK `prisma.$transaction`-dır — QİSMƏN YAZI OLMAZ.
//   3. Səhvli sətir SƏSSİZCƏ ATILMIR: faylda BİR rədd edilmiş sətir varsa
//      commit ÜMUMİYYƏTLƏ yazmır (`HAS_REJECTED_ROWS`). Admin faylı düzəldib
//      yenidən yükləyir. «Yaxşı sətirləri yazaq, pisləri atalım» yolu SEÇİLMƏDİ:
//      SIS ixracında bir sətrin pozulması adətən sütun sürüşməsi deməkdir və
//      "yaxşı" sətirlər də səhv məlumat daşıya bilər.
//   4. Təkrar e-poçt → mövcud istifadəçi YENİLƏNİR (yeni sətir yaranmır).
//   5. 🔴 ŞİFRƏ QƏBUL EDİLMİR — parse mərhələsində rədd olunur
//      (`lib/sis-import.ts`). Yeni hesab `UNSET_PASSWORD_HASH` ilə yaradılır və
//      girişə buraxılmır (`src/auth.ts`); istifadəçi şifrəsini özü təyin edir.
//   6. Bütün import → BİR AuditLog sətri (neçə yaradıldı / yeniləndi / rədd).
//
// ⚠️ Parse SAF moduldadır (`lib/sis-import.ts`) və DB-siz testlə örtülüdür.
// Burada yalnız DB kontekstinə bağlı qərarlar var: fakültə/ixtisas kodu
// tanınırmı, həmin qəbul ili üçün sinif açılıbmı, e-poçt artıq varmı.
// ============================================================================

import { assertFreshAdmin } from "@/lib/admin-guard";
import { UNSET_PASSWORD_HASH } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { AuditAction, CohortRole } from "@/lib/enums";
import {
  parseSisCsv,
  sisPreviewToken,
  type SisRow,
  type SisRowIssue,
} from "@/lib/sis-import";
import { DEFAULT_PRIVATE_FIELDS, defaultLevelFor, CONTROLLED_PROFILE_FIELDS } from "@/lib/visibility";
import type { Viewer } from "@/lib/visibility";
import { recordAudit } from "@/services/audit.service";

// ---------------------------------------------------------------------------
// Sətir nəticəsi
// ---------------------------------------------------------------------------

export type SisOutcome = "CREATE" | "UPDATE" | "REJECT";

/** DB kontekstindən doğan rədd səbəbləri (fayl səbəbləri `lib`-dədir). */
export type SisDbReason = "UNKNOWN_FACULTY" | "UNKNOWN_PROGRAM" | "NO_COHORT";

export const SIS_DB_MESSAGES: Record<SisDbReason, string> = {
  UNKNOWN_FACULTY: "Fakültə kodu tanınmır.",
  UNKNOWN_PROGRAM: "İxtisas kodu bu fakültədə yoxdur.",
  NO_COHORT:
    "Bu ixtisas və qəbul ili üçün sinif açılmayıb. Əvvəlcə /admin/cohorts-da sinif yaradın.",
};

export interface SisPreviewRow {
  line: number;
  email: string;
  fullName: string;
  outcome: SisOutcome;
  /** Rədd səbəbi (azərbaycanca) — `outcome = REJECT` olduqda dolur. */
  message: string | null;
  /** Hansı sinfə yazılacaq (tanınıbsa). */
  cohortName: string | null;
}

export interface SisPreview {
  /** `commitImport` bu jetonu tələb edir — önizləmə ilə yazı EYNİ fayl olsun. */
  token: string;
  rows: SisPreviewRow[];
  created: number;
  updated: number;
  rejected: number;
}

export type SisPreviewResult =
  | { ok: true; value: SisPreview }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Ortaq həll: fayl → DB kontekstinə bağlı sətir nəticələri
// ---------------------------------------------------------------------------

interface ResolvedRow {
  row: SisRow;
  outcome: SisOutcome;
  message: string | null;
  cohortId: string | null;
  cohortName: string | null;
  existingUserId: string | null;
}

/**
 * Faylın sətirlərini DB kontekstində həll edir. HEÇ NƏ YAZMIR.
 *
 * ⚠️ Sorğular TOPLU-dur (sətir başına sorğu YOX): fakültə + ixtisas kataloqu
 * bir dəfə, cohort-lar bir dəfə, mövcud e-poçtlar bir dəfə oxunur.
 */
async function resolveRows(rows: SisRow[], issues: SisRowIssue[]): Promise<{
  resolved: ResolvedRow[];
  rejectedFromFile: SisPreviewRow[];
}> {
  const rejectedFromFile: SisPreviewRow[] = issues.map((issue) => ({
    line: issue.line,
    email: "",
    fullName: "",
    outcome: "REJECT" as const,
    message: issue.message,
    cohortName: null,
  }));

  if (rows.length === 0) return { resolved: [], rejectedFromFile };

  const [faculties, programs, cohorts, existing] = await Promise.all([
    prisma.faculty.findMany({ select: { id: true, slug: true } }),
    prisma.program.findMany({ select: { id: true, slug: true, facultyId: true } }),
    prisma.cohort.findMany({
      select: { id: true, programId: true, admissionYear: true, displayName: true },
    }),
    prisma.user.findMany({
      where: { email: { in: rows.map((row) => row.email) } },
      select: { id: true, email: true },
    }),
  ]);

  // ⚠️ Kod = `slug`. SIS ixracında sütun adı "code"-dur, bizdə isə həmin dəyər
  // `Faculty.slug` / `Program.slug` sütunundadır — ayrı "code" sütunu açmaq
  // əvəzinə mövcud unikal açar işlədilir (seed-dəki dəyərlər: `eng`, `cs`…
  // deyil, tam slug-dır; qısa kod istənsə slug-ın özü yazılır).
  const facultyBySlug = new Map(faculties.map((f) => [f.slug, f]));
  const programBySlug = new Map(programs.map((p) => [p.slug, p]));
  const cohortByKey = new Map(
    cohorts.map((c) => [`${c.programId}:${c.admissionYear}`, c]),
  );
  const userByEmail = new Map(existing.map((u) => [u.email, u.id]));

  const resolved = rows.map<ResolvedRow>((row) => {
    const reject = (reason: SisDbReason): ResolvedRow => ({
      row,
      outcome: "REJECT",
      message: SIS_DB_MESSAGES[reason],
      cohortId: null,
      cohortName: null,
      existingUserId: null,
    });

    const faculty = facultyBySlug.get(row.facultyCode);
    if (!faculty) return reject("UNKNOWN_FACULTY");

    const program = programBySlug.get(row.programCode);
    if (!program || program.facultyId !== faculty.id) return reject("UNKNOWN_PROGRAM");

    const cohort = cohortByKey.get(`${program.id}:${row.admissionYear}`);
    if (!cohort) return reject("NO_COHORT");

    const existingUserId = userByEmail.get(row.email) ?? null;

    return {
      row,
      outcome: existingUserId === null ? "CREATE" : "UPDATE",
      message: null,
      cohortId: cohort.id,
      cohortName: cohort.displayName,
      existingUserId,
    };
  });

  return { resolved, rejectedFromFile };
}

function toPreviewRow(resolved: ResolvedRow): SisPreviewRow {
  return {
    line: resolved.row.line,
    email: resolved.row.email,
    fullName: `${resolved.row.firstName} ${resolved.row.lastName}`,
    outcome: resolved.outcome,
    message: resolved.message,
    cohortName: resolved.cohortName,
  };
}

// ---------------------------------------------------------------------------
// 1. QURU İCRA
// ---------------------------------------------------------------------------

/**
 * Önizləmə — sətir-sətir nəticə. 🔴 BAZAYA YAZMIR.
 *
 * ⚠️ Funksiyada `prisma.*.create` / `update` ÇAĞIRIŞI YOXDUR və bu, təsadüf
 * deyil: `tests/integration/admin.db.test.ts` önizləmədən əvvəl və sonra
 * `User` sayını müqayisə edir.
 */
export async function previewImport(
  viewer: Viewer,
  csv: string,
): Promise<SisPreviewResult> {
  await assertFreshAdmin(viewer);

  const parsed = parseSisCsv(csv);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const { resolved, rejectedFromFile } = await resolveRows(parsed.rows, parsed.issues);

  const rows = [...rejectedFromFile, ...resolved.map(toPreviewRow)].sort(
    (a, b) => a.line - b.line,
  );

  return {
    ok: true,
    value: {
      token: sisPreviewToken(csv),
      rows,
      created: rows.filter((row) => row.outcome === "CREATE").length,
      updated: rows.filter((row) => row.outcome === "UPDATE").length,
      rejected: rows.filter((row) => row.outcome === "REJECT").length,
    },
  };
}

// ---------------------------------------------------------------------------
// 2. YAZI
// ---------------------------------------------------------------------------

export type SisCommitFailure =
  | "PARSE_FAILED"
  | "TOKEN_MISMATCH"
  | "HAS_REJECTED_ROWS"
  | "NOTHING_TO_DO";

export const SIS_COMMIT_MESSAGES: Record<SisCommitFailure, string> = {
  PARSE_FAILED: "Fayl oxuna bilmədi.",
  TOKEN_MISMATCH:
    "Fayl önizlədikdən sonra dəyişib. Yenidən önizləyin — yazılan məlumat gördüyünüzlə eyni olmalıdır.",
  HAS_REJECTED_ROWS:
    "Faylda rədd edilmiş sətirlər var. Qismən yazı edilmir — səhvləri düzəldib yenidən yükləyin.",
  NOTHING_TO_DO: "Yazılacaq sətir yoxdur.",
};

export interface SisCommitSummary {
  created: number;
  updated: number;
}

export type SisCommitResult =
  | { ok: true; value: SisCommitSummary }
  | { ok: false; reason: SisCommitFailure; message: string; preview?: SisPreview };

/**
 * Sətirləri TƏK TRANSAKSİYADA yazır.
 *
 * 🔴 QİSMƏN YAZI OLMAZ: bütün `create` / `update` çağırışları eyni
 * `prisma.$transaction` bloğundadır. Ortada sınsa HEÇ NƏ yazılmır.
 *
 * ⚠️ Yeni istifadəçi üçün DEFAULT MƏXFİLİK SƏTİRLƏRİ də eyni transaksiyada
 * yaradılır (`phone` / `personalEmail` → `PRIVATE`, qalanlar `CLASS`) — bu,
 * qeydiyyat axını ilə eyni müqavilədir. Sətirlər yazılmasaydı `redactProfile`
 * defolta düşərdi və nəticə eyni olardı, amma istifadəçi öz məxfilik səhifəsində
 * "heç bir seçim etməmişəm" görməzdi.
 */
export async function commitImport(
  viewer: Viewer,
  csv: string,
  token: string,
): Promise<SisCommitResult> {
  const admin = await assertFreshAdmin(viewer);

  if (sisPreviewToken(csv) !== token) {
    return {
      ok: false,
      reason: "TOKEN_MISMATCH",
      message: SIS_COMMIT_MESSAGES.TOKEN_MISMATCH,
    };
  }

  const parsed = parseSisCsv(csv);
  if (!parsed.ok) {
    return { ok: false, reason: "PARSE_FAILED", message: parsed.message };
  }

  const { resolved, rejectedFromFile } = await resolveRows(parsed.rows, parsed.issues);

  const rows = [...rejectedFromFile, ...resolved.map(toPreviewRow)].sort(
    (a, b) => a.line - b.line,
  );
  const preview: SisPreview = {
    token,
    rows,
    created: rows.filter((row) => row.outcome === "CREATE").length,
    updated: rows.filter((row) => row.outcome === "UPDATE").length,
    rejected: rows.filter((row) => row.outcome === "REJECT").length,
  };

  // 🔴 BİR rədd edilmiş sətir → HEÇ NƏ yazılmır (fayl başlığı, qayda 3).
  if (preview.rejected > 0) {
    return {
      ok: false,
      reason: "HAS_REJECTED_ROWS",
      message: SIS_COMMIT_MESSAGES.HAS_REJECTED_ROWS,
      preview,
    };
  }

  if (resolved.length === 0) {
    return {
      ok: false,
      reason: "NOTHING_TO_DO",
      message: SIS_COMMIT_MESSAGES.NOTHING_TO_DO,
    };
  }

  const created = resolved.filter((r) => r.outcome === "CREATE");
  const updated = resolved.filter((r) => r.outcome === "UPDATE");

  await prisma.$transaction(async (tx) => {
    for (const item of created) {
      const user = await tx.user.create({
        data: {
          email: item.row.email,
          // 🔴 CSV-dən şifrə GƏLMİR — hesab şifrəsiz yaradılır.
          passwordHash: UNSET_PASSWORD_HASH,
          firstName: item.row.firstName,
          lastName: item.row.lastName,
          memberships: {
            create: {
              cohortId: item.cohortId as string,
              role: CohortRole.MEMBER,
              isPrimary: true,
            },
          },
          fieldVisibility: {
            create: CONTROLLED_PROFILE_FIELDS.map((field) => ({
              field,
              level: defaultLevelFor(field),
            })),
          },
        },
        select: { id: true },
      });

      // `User.stage` yalnız keşdir — girişdə `syncUserStage` düzəldir.
      void user;
    }

    for (const item of updated) {
      await tx.user.update({
        where: { id: item.existingUserId as string },
        data: { firstName: item.row.firstName, lastName: item.row.lastName },
      });

      // Üzvlük varsa toxunulmur, yoxdursa əlavə olunur (ikinci ixtisas halı).
      const membership = await tx.cohortMembership.findUnique({
        where: {
          userId_cohortId: {
            userId: item.existingUserId as string,
            cohortId: item.cohortId as string,
          },
        },
        select: { id: true },
      });

      if (!membership) {
        await tx.cohortMembership.create({
          data: {
            userId: item.existingUserId as string,
            cohortId: item.cohortId as string,
            role: CohortRole.MEMBER,
            isPrimary: false,
          },
        });
      }
    }

    // 🔴 BÜTÜN İMPORT → BİR AuditLog sətri (fayl başlığı, qayda 6).
    await recordAudit(tx, {
      actorId: admin.userId,
      action: AuditAction.CREATE,
      entityType: "SisImport",
      entityId: token,
      metadata: {
        operation: "commitImport",
        created: created.length,
        updated: updated.length,
        rejected: 0,
      },
    });
  });

  return { ok: true, value: { created: created.length, updated: updated.length } };
}

/** Məxfilik defoltlarının siyahısı — testdə istinad üçün açıq ixrac. */
export const IMPORT_PRIVATE_FIELDS = DEFAULT_PRIVATE_FIELDS;
