"use server";

// ============================================================================
// src/features/memories/actions.ts
// Share Memories [M9] Server Action-ları.
//
// ⚠️ Bu fayl `prisma`-nı BİRBAŞA çağırmır — bütün DB girişi
// `services/memory.service.ts`-dədir (CLAUDE.md §4). Buradakı iş dörd addımdır:
//   1. `requireUser()` — sessiyanı `Viewer`-ə çevir
//   2. Zod ilə girişi doğrula (`features/memories/schemas.ts`)
//   3. Sətirləri `Date` / `null`-a çevir (TƏLƏ T3 — coerce formada işlədilmir)
//   4. Servisi çağır, keşi təzələ, azərbaycanca nəticə qaytar
//
// ⚠️ `authorId` və `cohortId` MÜŞTƏRİNİN SÖZÜ İLƏ qəbul edilmir: müəllif
// viewer-dən götürülür, cohort üzvlüyü isə servisdə DB-dən yenidən yoxlanılır.
// ============================================================================

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { requireUser } from "@/lib/auth";
import {
  createMemory,
  deleteMemory,
  updateMemory,
  type MemoryMutationFailure,
  type MemoryWriteData,
} from "@/services/memory.service";

import {
  createMemorySchema,
  emptyToNull,
  memoryIdSchema,
  updateMemorySchema,
  TIMELINE_REQUIRES_FEED_MESSAGE,
  type CreateMemoryInput,
  type UpdateMemoryInput,
} from "./schemas";

export interface MemoryActionResult<T = undefined> {
  ok: boolean;
  message?: string;
  /** Sahə → səhv mesajı (Zod). Formada göstərilir. */
  fieldErrors?: Record<string, string>;
  value?: T;
}

const GENERIC_ERROR = "Əməliyyat tamamlanmadı. Bir azdan yenidən cəhd edin.";

const FAILURE_MESSAGES: Record<MemoryMutationFailure, string> = {
  NOT_A_MEMBER: "Bu sinifdə xatirə yazmaq üçün üzv olmalısınız.",
  NOT_FOUND: "Xatirə tapılmadı və ya artıq silinib.",
  FORBIDDEN: "Bu əməliyyat üçün icazəniz yoxdur.",
  PLACE_NOT_FOUND: "Seçilmiş məkan tapılmadı.",
  TIMELINE_REQUIRES_FEED: TIMELINE_REQUIRES_FEED_MESSAGE,
};

/** Zod səhvlərini `{ "showInTimeline": "…" }` formasına gətirir. */
function toFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/**
 * Xatirənin göründüyü BÜTÜN səthlər.
 * `showInFeed` / `showInTimeline` bayraqları lentdə və xronologiyada törəmə
 * sətirlər yaradır (TƏLƏ A), ona görə onlar da təzələnir.
 */
function revalidateMemorySurfaces(slug: string): void {
  revalidatePath(`/class/${slug}/memories`);
  revalidatePath(`/class/${slug}/yearbook`);
  revalidatePath(`/class/${slug}/feed`);
  revalidatePath(`/class/${slug}/timeline`);
  revalidatePath(`/class/${slug}`);
}

/**
 * Yüklənmiş şəklin ünvanı həqiqətən bizim yükləmə qovluğundandırmı?
 * (`features/feed/actions.ts` → `isUploadPath` ilə eyni səbəb: xarici ünvan
 * qəbul etsək kart başqa saytdan şəkil çəkərdi.)
 */
function toUploadPath(value: string): string | null {
  const url = emptyToNull(value);
  if (url === null) return null;
  return url.startsWith("/uploads/") && !url.includes("..") ? url : null;
}

/** Forma dəyərlərini servis girişinə çevirir — TƏLƏ T3-ün ödənişi MƏHZ BURADA. */
function toWriteData(data: CreateMemoryInput | UpdateMemoryInput): MemoryWriteData {
  return {
    type: data.type,
    title: data.title,
    body: data.body,
    dedicatedTo: emptyToNull(data.dedicatedTo),
    imageUrl: toUploadPath(data.imageUrl),
    occurredAt: new Date(data.occurredAt),
    guidePlaceId: emptyToNull(data.guidePlaceId),
    visibility: data.visibility,
    showInProfile: data.showInProfile,
    showInFeed: data.showInFeed,
    showInTimeline: data.showInTimeline,
    showInYearbook: data.showInYearbook,
  };
}

// ---------------------------------------------------------------------------
// createMemory
// ---------------------------------------------------------------------------

export async function createMemoryAction(
  input: unknown,
  cohortSlug: string,
): Promise<MemoryActionResult<{ memoryId: string }>> {
  try {
    const viewer = await requireUser();

    const parsed = createMemorySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: "Formada düzəliş tələb olunur.",
        fieldErrors: toFieldErrors(parsed.error.issues),
      };
    }

    const result = await createMemory(viewer, {
      cohortId: parsed.data.cohortId,
      ...toWriteData(parsed.data),
    });

    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidateMemorySurfaces(cohortSlug);
    return { ok: true, message: "Xatirə paylaşıldı.", value: result.value };
  } catch (error) {
    // `requireUser()` sessiya yoxdursa NEXT_REDIRECT atır — naviqasiyadır.
    unstable_rethrow(error);
    console.error("[memories] createMemoryAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// updateMemory
// ---------------------------------------------------------------------------

export async function updateMemoryAction(
  input: unknown,
  cohortSlug: string,
): Promise<MemoryActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = updateMemorySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: "Formada düzəliş tələb olunur.",
        fieldErrors: toFieldErrors(parsed.error.issues),
      };
    }

    const result = await updateMemory(viewer, {
      memoryId: parsed.data.memoryId,
      ...toWriteData(parsed.data),
    });

    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidateMemorySurfaces(cohortSlug);
    return { ok: true, message: "Xatirə yeniləndi." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[memories] updateMemoryAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// deleteMemory (T4 — soft delete + əl ilə təmizləmə servisdədir)
// ---------------------------------------------------------------------------

export async function deleteMemoryAction(
  input: unknown,
  cohortSlug: string,
): Promise<MemoryActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = memoryIdSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Xatirə tapılmadı." };

    const result = await deleteMemory(viewer, parsed.data.memoryId);
    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidateMemorySurfaces(cohortSlug);
    return { ok: true, message: "Xatirə silindi." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[memories] deleteMemoryAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}
