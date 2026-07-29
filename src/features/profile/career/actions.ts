"use server";

// ============================================================================
// src/features/profile/career/actions.ts
// `/me/career` Server Action-ları — karyera, təhsil və dəstək təklifləri.
//
// ⚠️ `prisma` BURADA YOXDUR — DB girişi `services/career.service.ts`-dədir
// (CLAUDE.md §4). Buradakı iş: sessiya → `Viewer`, Zod doğrulaması, sətir →
// `Date` / `number` çevirməsi (T3) və azərbaycanca nəticə.
//
// 🔴 SAHİBLİK: `entryId` müştəridən gəlir, amma TƏK BAŞINA ETİBARLI DEYİL.
// Servis hər yazıda `where: { id, userId: viewer.userId }` şərti qurur, yəni
// başqasının qeydini redaktə etmək cəhdi `NOT_FOUND` ilə bitir. Burada əlavə
// yoxlama YOXDUR və olmamalıdır — iki yerdə yoxlama biri köhnələndə səhv
// təhlükəsizlik hissi yaradır.
// ============================================================================

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { emptyToNull } from "@/lib/form-fields";
import {
  createCareerEntry,
  createEducationEntry,
  deleteCareerEntry,
  deleteEducationEntry,
  updateCareerEntry,
  updateEducationEntry,
  updateSupportSettings,
  type CareerMutationFailure,
} from "@/services/career.service";

import {
  careerEntrySchema,
  educationEntrySchema,
  entryIdSchema,
  supportSettingsSchema,
} from "../schemas";

export interface CareerActionResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const GENERIC_ERROR = "Əməliyyat tamamlanmadı. Bir azdan yenidən cəhd edin.";

const FAILURE_MESSAGES: Record<CareerMutationFailure, string> = {
  UNAUTHENTICATED: "Sessiya bitib. Yenidən daxil olun.",
  // ⚠️ "Sənin deyil" ilə "yoxdur" QƏSDƏN eyni mesajdır: qeydin mövcudluğu da
  // məlumatdır və başqasının sətrinin varlığını təsdiqləməməliyik.
  NOT_FOUND: "Qeyd tapılmadı və ya sizə aid deyil.",
  INVALID_INPUT: "Göndərilən məlumat tanınmadı. Səhifəni yeniləyin.",
};

function toFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/**
 * Karyera məlumatının göründüyü səthlər.
 *
 * `/class/[slug]/map` (Where Are We Now) hələ qurulmayıb (Blok 10), amma
 * mövcud olmayan yol üçün `revalidatePath` təhlükəsizdir — blok gələndə
 * `includeInStats` dəyişikliyi dərhal əks olunacaq.
 */
function revalidateCareerSurfaces(userId: string): void {
  revalidatePath("/me/career");
  revalidatePath(`/u/${userId}`);
}

// ---------------------------------------------------------------------------
// Karyera qeydi
// ---------------------------------------------------------------------------

export async function saveCareerEntryAction(input: unknown): Promise<CareerActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = careerEntrySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: "Formada düzəliş tələb olunur.",
        fieldErrors: toFieldErrors(parsed.error.issues),
      };
    }

    const data = parsed.data;
    const payload = {
      company: data.company,
      position: data.position,
      industry: emptyToNull(data.industry),
      city: emptyToNull(data.city),
      country: emptyToNull(data.country),
      // T3: sətir → `Date` MƏHZ BURADA.
      startDate: new Date(data.startDate),
      endDate: data.endDate === "" ? null : new Date(data.endDate),
      isCurrent: data.isCurrent,
      description: emptyToNull(data.description),
      visibility: data.visibility,
      includeInStats: data.includeInStats,
    };

    const result = data.entryId
      ? await updateCareerEntry(viewer, data.entryId, payload)
      : await createCareerEntry(viewer, payload);

    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidateCareerSurfaces(viewer.userId);
    return { ok: true, message: data.entryId ? "Qeyd yeniləndi." : "Qeyd əlavə olundu." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[career] saveCareerEntryAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function deleteCareerEntryAction(input: unknown): Promise<CareerActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = entryIdSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Qeyd tapılmadı." };

    const result = await deleteCareerEntry(viewer, parsed.data.entryId);
    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidateCareerSurfaces(viewer.userId);
    return { ok: true, message: "Qeyd silindi." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[career] deleteCareerEntryAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Təhsil qeydi
// ---------------------------------------------------------------------------

export async function saveEducationEntryAction(input: unknown): Promise<CareerActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = educationEntrySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: "Formada düzəliş tələb olunur.",
        fieldErrors: toFieldErrors(parsed.error.issues),
      };
    }

    const data = parsed.data;
    const payload = {
      institution: data.institution,
      degree: data.degree,
      field: emptyToNull(data.field),
      country: emptyToNull(data.country),
      // T3: sətir → `number` MƏHZ BURADA (`Int` sütunu).
      startYear: Number.parseInt(data.startYear, 10),
      endYear: data.endYear === "" ? null : Number.parseInt(data.endYear, 10),
      isCurrent: data.isCurrent,
      visibility: data.visibility,
      includeInStats: data.includeInStats,
    };

    const result = data.entryId
      ? await updateEducationEntry(viewer, data.entryId, payload)
      : await createEducationEntry(viewer, payload);

    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidateCareerSurfaces(viewer.userId);
    return { ok: true, message: data.entryId ? "Qeyd yeniləndi." : "Qeyd əlavə olundu." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[career] saveEducationEntryAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function deleteEducationEntryAction(input: unknown): Promise<CareerActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = entryIdSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Qeyd tapılmadı." };

    const result = await deleteEducationEntry(viewer, parsed.data.entryId);
    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidateCareerSurfaces(viewer.userId);
    return { ok: true, message: "Qeyd silindi." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[career] deleteEducationEntryAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Dəstək təklifləri — ÜÇÜNCÜ razılıq
// ---------------------------------------------------------------------------

export async function updateSupportSettingsAction(
  input: unknown,
): Promise<CareerActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = supportSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: "Formada düzəliş tələb olunur.",
        fieldErrors: toFieldErrors(parsed.error.issues),
      };
    }

    const data = parsed.data;

    const result = await updateSupportSettings(viewer, {
      openToSupport: data.openToSupport,
      // Yalnız işarələnmiş növlər sətir kimi saxlanılır; qeyd mətni isə
      // formada qalır (istifadəçi işarəni götürüb yenidən qoya bilər).
      offers: data.offers
        .filter((offer) => offer.selected)
        .map((offer) => ({ type: offer.type, note: emptyToNull(offer.note) })),
    });

    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidateCareerSurfaces(viewer.userId);
    // Sinif səhifəsindəki "Dəstək təklifləri" widget-i də bu bayraqdan asılıdır.
    revalidatePath("/home");

    return {
      ok: true,
      message: data.openToSupport
        ? "Dəstək seçimləriniz yeniləndi."
        : "Seçimlər saxlanıldı, amma «dəstəyə açığam» sönülüdür — təkliflər göstərilmir.",
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[career] updateSupportSettingsAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}
