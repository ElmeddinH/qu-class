"use server";

// ============================================================================
// src/features/admin/actions.ts
// Admin panelinin Server Action-ları (spec §17).
//
// Hər action eyni dörd addımı izləyir (Blok 8-in nümunəsi):
//   1. `getViewer()` — sessiyanı `Viewer`-ə çevir
//   2. Zod ilə girişi doğrula
//   3. Servisi çağır — 🔴 İCAZƏ ORADA, `assertFreshAdmin` ilə yoxlanılır
//   4. keşi təzələ, azərbaycanca nəticə qaytar
//
// 🔴 İCAZƏ BURADA YOXLANILMIR VƏ BU, QƏSDƏNDİR. Səhifə qapısı
// (`(admin)/layout.tsx` → `requireAdmin()`) TƏK qoruma sayılmır: server action
// birbaşa çağırıla bilər (səhifə heç vaxt açılmadan). Ona görə qapı ən aşağı
// qatdadır — servisdə. Burada yalnız `AdminForbiddenError` istifadəçi mesajına
// çevrilir.
//
// ⚠️ Bu fayl `prisma`-nı BİRBAŞA çağırmır (CLAUDE.md §4).
// ============================================================================

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { parseAdminUserParams, parseAuditParams } from "@/lib/admin-filters";
import { AdminForbiddenError } from "@/lib/admin-guard";
import { getViewer } from "@/lib/auth";
import { buildCsv, csvFileName } from "@/lib/csv";
import {
  ADMIN_USER_MESSAGES,
  changeCohortRole,
  changeSystemRole,
  exportAdminUsers,
  setUserActivation,
} from "@/services/admin-users.service";
import { listAuditLog } from "@/services/audit.service";
import {
  COHORT_FAILURE_MESSAGES,
  createCohort,
  updateCohort,
} from "@/services/admin-cohorts.service";
import {
  CONTENT_FAILURE_MESSAGES,
  updateContentPage,
  updateFaq,
  updateGuidePlace,
} from "@/services/admin-content.service";
import {
  decideReport,
  hideReportedContent,
  openModerationReview,
  type ModerationContent,
} from "@/services/moderation.service";
import {
  commitImport,
  previewImport,
  type SisPreview,
} from "@/services/sis-import.service";
import {
  activationSchema,
  cohortRoleSchema,
  contentPageSchema,
  createCohortSchema,
  decideReportSchema,
  faqSchema,
  guidePlaceSchema,
  hideContentSchema,
  importCommitSchema,
  importPreviewSchema,
  reviewReportSchema,
  systemRoleSchema,
  updateCohortSchema,
} from "./schemas";

export interface AdminActionResult<T = undefined> {
  ok: boolean;
  message?: string;
  value?: T;
}

const GENERIC_ERROR = "Əməliyyat tamamlanmadı. Bir azdan yenidən cəhd edin.";
const FORBIDDEN_MESSAGE = "Bu əməliyyat üçün administrator səlahiyyəti tələb olunur.";

/** Audit ixracının yuxarı həddi — brauzerdə açılan fayl idarə oluna bilməlidir. */
const AUDIT_EXPORT_LIMIT = 5000;

/**
 * Ortaq gövdə: xəta tutulur, `AdminForbiddenError` 403 mesajına çevrilir.
 *
 * ⚠️ `unstable_rethrow` MƏCBURİDİR — `redirect()` / `notFound()` Next-in daxili
 * idarəetmə xətalarıdır və udulsa səhifə 500 verər (Blok 9S-dəki eyni nümunə).
 */
async function run<T>(
  label: string,
  body: () => Promise<AdminActionResult<T>>,
): Promise<AdminActionResult<T>> {
  try {
    return await body();
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AdminForbiddenError) {
      return { ok: false, message: FORBIDDEN_MESSAGE };
    }
    console.error(`[admin] ${label}:`, error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

function invalid(message = "Giriş məlumatı düzgün deyil."): AdminActionResult<never> {
  return { ok: false, message };
}

// ---------------------------------------------------------------------------
// Moderasiya
// ---------------------------------------------------------------------------

const MODERATION_PATHS = ["/admin/moderation", "/admin", "/admin/audit"];

function revalidateModeration(): void {
  for (const path of MODERATION_PATHS) revalidatePath(path);
}

/**
 * 🔴 TƏLƏ A — ŞİKAYƏT OLUNAN MƏZMUNU AÇIR VƏ BUNU JURNALA YAZIR.
 *
 * Məzmun YALNIZ bu action-ın cavabında qayıdır: səhifə onu SERVER tərəfdə
 * render ETMİR, yəni «Moderasiya baxışı» düyməsinə basılmayana qədər HTML-də
 * mətnin izi belə yoxdur. Audit sətri servisdəki transaksiyanın BİRİNCİ
 * addımıdır (bax `moderation.service.ts`).
 */
export async function reviewReportAction(
  input: unknown,
): Promise<AdminActionResult<ModerationContent>> {
  return run("reviewReportAction", async () => {
    const viewer = await getViewer();
    const parsed = reviewReportSchema.safeParse(input);
    if (!parsed.success) return invalid();

    const result = await openModerationReview(viewer, parsed.data.reportId);
    if (!result.ok) {
      const messages: Record<typeof result.reason, string> = {
        NOT_FOUND: "Şikayət tapılmadı.",
        TARGET_MISSING: "Şikayət olunan obyekt artıq mövcud deyil.",
        FORBIDDEN: "Bu məzmunu moderasiya etmək icazəniz yoxdur.",
        NOT_CONTENT:
          "Bu, əlçatanlıq bileti­dir — baxılacaq istifadəçi məzmunu yoxdur.",
      };
      return { ok: false, message: messages[result.reason] };
    }

    // ⚠️ Audit səhifəsi dəyişdi (yeni sətir) — keş təzələnir.
    revalidatePath("/admin/audit");
    return { ok: true, value: result.value };
  });
}

export async function decideReportAction(input: unknown): Promise<AdminActionResult> {
  return run("decideReportAction", async () => {
    const viewer = await getViewer();
    const parsed = decideReportSchema.safeParse(input);
    if (!parsed.success) {
      return invalid(parsed.error.issues[0]?.message ?? undefined);
    }

    const result = await decideReport(viewer, {
      reportId: parsed.data.reportId,
      decision: parsed.data.decision,
      resolution: parsed.data.resolution ?? null,
    });

    if (!result.ok) {
      const messages: Record<typeof result.reason, string> = {
        NOT_FOUND: "Şikayət tapılmadı.",
        RESOLUTION_REQUIRED: "Qərarın səbəbini yazın.",
        ALREADY_CLOSED: "Bu şikayət artıq bağlanıb.",
      };
      return { ok: false, message: messages[result.reason] };
    }

    revalidateModeration();
    return { ok: true, message: "Qərar yazıldı və şikayətçiyə bildiriş göndərildi." };
  });
}

export async function hideContentAction(input: unknown): Promise<AdminActionResult> {
  return run("hideContentAction", async () => {
    const viewer = await getViewer();
    const parsed = hideContentSchema.safeParse(input);
    if (!parsed.success) return invalid();

    const result = await hideReportedContent(viewer, parsed.data.reportId);
    if (!result.ok) {
      const messages: Record<typeof result.reason, string> = {
        NOT_FOUND: "Şikayət tapılmadı.",
        TARGET_MISSING: "Məzmun artıq mövcud deyil.",
        NOT_HIDEABLE:
          "Bu növ gizlədilə bilməz. İstifadəçi üçün doğru alət hesabın deaktivasiyasıdır.",
      };
      return { ok: false, message: messages[result.reason] };
    }

    revalidateModeration();
    // ⚠️ Gizlədilən məzmun sinif səhifələrində də görünürdü — kök layout
    // səviyyəsində təzələnir (lent, xronologiya, xatirələr).
    revalidatePath("/", "layout");
    return { ok: true, message: "Məzmun gizlədildi və audit jurnalına yazıldı." };
  });
}

// ---------------------------------------------------------------------------
// İstifadəçi və rollar
// ---------------------------------------------------------------------------

function revalidateUsers(): void {
  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
  revalidatePath("/admin");
}

export async function changeSystemRoleAction(
  input: unknown,
): Promise<AdminActionResult> {
  return run("changeSystemRoleAction", async () => {
    const viewer = await getViewer();
    const parsed = systemRoleSchema.safeParse(input);
    if (!parsed.success) return invalid();

    const result = await changeSystemRole(viewer, parsed.data);
    if (!result.ok) {
      return { ok: false, message: ADMIN_USER_MESSAGES[result.reason] };
    }

    revalidateUsers();
    return {
      ok: true,
      message:
        "Sistem rolu dəyişdi. ⚠️ Dəyişiklik istifadəçinin növbəti girişində tam " +
        "qüvvəyə minir — cari sessiyası köhnə məlumatı daşıya bilər.",
    };
  });
}

export async function changeCohortRoleAction(
  input: unknown,
): Promise<AdminActionResult> {
  return run("changeCohortRoleAction", async () => {
    const viewer = await getViewer();
    const parsed = cohortRoleSchema.safeParse(input);
    if (!parsed.success) return invalid();

    const result = await changeCohortRole(viewer, parsed.data);
    if (!result.ok) {
      return { ok: false, message: ADMIN_USER_MESSAGES[result.reason] };
    }

    revalidateUsers();
    revalidatePath("/", "layout");
    return { ok: true, message: "Sinif rolu dəyişdi və istifadəçiyə bildiriş getdi." };
  });
}

export async function setActivationAction(input: unknown): Promise<AdminActionResult> {
  return run("setActivationAction", async () => {
    const viewer = await getViewer();
    const parsed = activationSchema.safeParse(input);
    if (!parsed.success) return invalid();

    const result = await setUserActivation(viewer, parsed.data);
    if (!result.ok) {
      return { ok: false, message: ADMIN_USER_MESSAGES[result.reason] };
    }

    revalidateUsers();
    return {
      ok: true,
      message: parsed.data.deactivate
        ? "Hesab deaktiv edildi. Məzmun silinmədi."
        : "Hesab bərpa edildi.",
    };
  });
}

/**
 * İstifadəçi cədvəlinin CSV ixracı.
 *
 * 🔴 `redactProfile`-DAN KEÇİR: sütun siyahısı ağ siyahıdır və «Şəhər»
 * dəyəri istifadəçinin görünürlük seçimindən asılıdır. `phone` /
 * `personalEmail` ÜMUMİYYƏTLƏ sorğulanmır — admin olmaq `PRIVATE` sahəni
 * görmək demək deyil.
 *
 * ⚠️ Action yalnız MƏTNİ qaytarır; BOM baytları və `Blob` client tərəfdədir
 * (bax `lib/csv.ts` → `CSV_BOM_BYTES` — U+FEFF mətn qatlarından keçəndə itir).
 */
export async function exportUsersCsvAction(
  input: unknown,
): Promise<AdminActionResult<{ content: string; fileName: string }>> {
  return run("exportUsersCsvAction", async () => {
    const viewer = await getViewer();
    const filters = parseAdminUserParams(
      (input as { params?: Record<string, string> } | null)?.params ?? {},
    );

    const { headers, rows } = await exportAdminUsers(viewer, filters);
    const at = new Date();

    return {
      ok: true,
      value: {
        content: buildCsv(headers, rows),
        fileName: csvFileName("qu-class-istifadeciler", at),
      },
    };
  });
}

/** Audit jurnalının CSV ixracı — YALNIZ OXU səthinin davamı (TƏLƏ D). */
export async function exportAuditCsvAction(
  input: unknown,
): Promise<AdminActionResult<{ content: string; fileName: string }>> {
  return run("exportAuditCsvAction", async () => {
    const viewer = await getViewer();
    const filters = parseAuditParams(
      (input as { params?: Record<string, string> } | null)?.params ?? {},
    );

    const entries = await listAuditLog(viewer, filters, AUDIT_EXPORT_LIMIT, 0);
    const at = new Date();

    return {
      ok: true,
      value: {
        content: buildCsv(
          ["Tarix", "Əməliyyat", "Obyekt növü", "Obyekt id", "Aktyor", "Metadata"],
          entries.map((entry) => [
            entry.createdAt.toISOString(),
            entry.action,
            entry.entityType,
            entry.entityId,
            entry.actor === null
              ? "Sistem"
              : `${entry.actor.firstName} ${entry.actor.lastName}`,
            entry.metadata ?? "",
          ]),
        ),
        fileName: csvFileName("qu-class-audit", at),
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Cohort
// ---------------------------------------------------------------------------

export async function createCohortAction(input: unknown): Promise<AdminActionResult> {
  return run("createCohortAction", async () => {
    const viewer = await getViewer();
    const parsed = createCohortSchema.safeParse(input);
    if (!parsed.success) {
      return invalid(parsed.error.issues[0]?.message ?? undefined);
    }

    const result = await createCohort(viewer, {
      programId: parsed.data.programId,
      admissionYear: parsed.data.admissionYear,
      graduationYear: parsed.data.graduationYear,
      academicStartsAt: new Date(parsed.data.academicStartsAt),
      graduatesAt: new Date(parsed.data.graduatesAt),
      welcomeMessage: parsed.data.welcomeMessage?.trim() || null,
    });

    if (!result.ok) {
      return { ok: false, message: COHORT_FAILURE_MESSAGES[result.reason] };
    }

    revalidatePath("/admin/cohorts");
    revalidatePath("/admin/audit");
    revalidatePath("/", "layout");
    return { ok: true, message: `«${result.value.displayName}» sinfi yaradıldı.` };
  });
}

export async function updateCohortAction(input: unknown): Promise<AdminActionResult> {
  return run("updateCohortAction", async () => {
    const viewer = await getViewer();
    const parsed = updateCohortSchema.safeParse(input);
    if (!parsed.success) {
      return invalid(parsed.error.issues[0]?.message ?? undefined);
    }

    const result = await updateCohort(viewer, {
      cohortId: parsed.data.cohortId,
      displayName: parsed.data.displayName,
      coverUrl: parsed.data.coverUrl?.trim() || null,
      welcomeMessage: parsed.data.welcomeMessage?.trim() || null,
      academicStartsAt: new Date(parsed.data.academicStartsAt),
      graduatesAt: new Date(parsed.data.graduatesAt),
    });

    if (!result.ok) {
      const messages: Record<typeof result.reason, string> = {
        NOT_FOUND: "Sinif tapılmadı.",
        ORDER: COHORT_FAILURE_MESSAGES.ORDER,
        SPAN: COHORT_FAILURE_MESSAGES.SPAN,
      };
      return { ok: false, message: messages[result.reason] };
    }

    revalidatePath("/admin/cohorts");
    revalidatePath(`/class/${result.value.slug}`);
    revalidatePath(`/class/${result.value.slug}/timeline`);
    return { ok: true, message: "Sinif yeniləndi." };
  });
}

// ---------------------------------------------------------------------------
// CMS
// ---------------------------------------------------------------------------

export async function updateContentPageAction(
  input: unknown,
): Promise<AdminActionResult> {
  return run("updateContentPageAction", async () => {
    const viewer = await getViewer();
    const parsed = contentPageSchema.safeParse(input);
    if (!parsed.success) {
      return invalid(parsed.error.issues[0]?.message ?? undefined);
    }

    const result = await updateContentPage(viewer, {
      id: parsed.data.id,
      slug: parsed.data.slug,
      title: parsed.data.title,
      excerpt: parsed.data.excerpt?.trim() || null,
      body: parsed.data.body,
      isPublished: parsed.data.isPublished,
    });

    if (!result.ok) {
      return { ok: false, message: CONTENT_FAILURE_MESSAGES[result.reason] };
    }

    revalidatePath("/admin/content");
    revalidatePath("/admin/audit");
    // İctimai səthdə də dəyişdi — açılış, məzmun səhifələri, hüquqi sənədlər.
    revalidatePath("/", "layout");
    return { ok: true, message: "Səhifə yeniləndi." };
  });
}

export async function updateFaqAction(input: unknown): Promise<AdminActionResult> {
  return run("updateFaqAction", async () => {
    const viewer = await getViewer();
    const parsed = faqSchema.safeParse(input);
    if (!parsed.success) {
      return invalid(parsed.error.issues[0]?.message ?? undefined);
    }

    const result = await updateFaq(viewer, parsed.data);
    if (!result.ok) return { ok: false, message: "Sual tapılmadı." };

    revalidatePath("/admin/content");
    revalidatePath("/faq");
    return { ok: true, message: "Sual yeniləndi." };
  });
}

export async function updateGuidePlaceAction(
  input: unknown,
): Promise<AdminActionResult> {
  return run("updateGuidePlaceAction", async () => {
    const viewer = await getViewer();
    const parsed = guidePlaceSchema.safeParse(input);
    if (!parsed.success) {
      return invalid(parsed.error.issues[0]?.message ?? undefined);
    }

    const result = await updateGuidePlace(viewer, {
      id: parsed.data.id,
      title: parsed.data.title,
      description: parsed.data.description,
      address: parsed.data.address?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
    });
    if (!result.ok) return { ok: false, message: "Məkan tapılmadı." };

    revalidatePath("/admin/content");
    revalidatePath("/khankendi");
    return { ok: true, message: "Bələdçi məkanı yeniləndi." };
  });
}

// ---------------------------------------------------------------------------
// SIS importu (TƏLƏ E)
// ---------------------------------------------------------------------------

/** 🔴 QURU İCRA — bazaya YAZMIR. */
export async function previewImportAction(
  input: unknown,
): Promise<AdminActionResult<SisPreview>> {
  return run("previewImportAction", async () => {
    const viewer = await getViewer();
    const parsed = importPreviewSchema.safeParse(input);
    if (!parsed.success) return invalid("Fayl oxunmadı.");

    const result = await previewImport(viewer, parsed.data.csv);
    if (!result.ok) return { ok: false, message: result.message };

    return { ok: true, value: result.value };
  });
}

/** Yazı — TƏK transaksiya. Rədd edilmiş sətir varsa HEÇ NƏ yazılmır. */
export async function commitImportAction(
  input: unknown,
): Promise<AdminActionResult<{ created: number; updated: number }>> {
  return run("commitImportAction", async () => {
    const viewer = await getViewer();
    const parsed = importCommitSchema.safeParse(input);
    if (!parsed.success) return invalid();

    const result = await commitImport(viewer, parsed.data.csv, parsed.data.token);
    if (!result.ok) return { ok: false, message: result.message };

    revalidatePath("/admin/users");
    revalidatePath("/admin/import");
    revalidatePath("/admin/audit");
    revalidatePath("/admin");
    return {
      ok: true,
      value: result.value,
      message: `${result.value.created} yeni, ${result.value.updated} yenilənmiş qeyd yazıldı.`,
    };
  });
}

// ---------------------------------------------------------------------------
// Nailiyyət təsdiqi
// ---------------------------------------------------------------------------
//
// ⚠️ BURADA ACTION YOXDUR VƏ BU, QƏSDƏNDİR: `/admin/achievements` səhifəsi
// Blok 8-in mövcud action-larını (`features/achievements/actions.ts` →
// `verify` / `feature` / `reject`) TƏKRAR İŞLƏDİR. Onların servis qapısı
// `canModerateCohort`-dur və `UNIVERSITY_ADMIN` orada onsuz da bütün
// siniflərdə keçir — kopyalasaydıq iki qərar yolu yaranardı və biri gec-tez
// AuditLog-suz qalardı.
//
// ⚠️ `"use server"` faylı YALNIZ async funksiya ixrac edə bilər — sxemlər
// `./schemas` modulundan birbaşa import olunur.
