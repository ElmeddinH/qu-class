"use server";

// ============================================================================
// src/features/feed/actions.ts
// Class Feed Server Action-ları.
//
// ⚠️ Bu fayl `prisma`-nı BİRBAŞA çağırmır — bütün DB girişi
// `services/post.service.ts` və `services/report.service.ts`-dədir
// (CLAUDE.md §4). Buradakı iş dörd addımdır:
//   1. `requireUser()` — sessiyanı `Viewer`-ə çevir
//   2. Zod ilə girişi doğrula (`features/feed/schemas.ts`)
//   3. Sətirləri `Date` / `null`-a çevir (TƏLƏ T3 — coerce formada işlədilmir)
//   4. Servisi çağır, keşi təzələ, azərbaycanca nəticə qaytar
//
// ⚠️ `authorId` və `cohortId` MÜŞTƏRİNİN SÖZÜ İLƏ qəbul edilmir: müəllif
// viewer-dən götürülür, cohort üzvlüyü isə servisdə DB-dən yenidən yoxlanılır.
// ============================================================================

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { ReportEntityType } from "@/lib/enums";
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  listComments,
  toggleReaction,
  updatePostSurfaces,
  type FeedComment,
  type PostMutationFailure,
} from "@/services/post.service";
import { createReport } from "@/services/report.service";

// ⚠️ Çevirmə köməkçiləri Blok 14B-də `post-input.ts`-ə köçdü: `/api/v1`
// route-ları da onları işlədir və `"use server"` faylından saf funksiya ixrac
// oluna bilmir. Davranış eynidir, yalnız yeri dəyişib.
import { toAchievementInput, toCreatePostData } from "./post-input";
import {
  createCommentSchema,
  createPostSchema,
  deleteCommentSchema,
  emptyToNull,
  postIdSchema,
  reportPostSchema,
  toggleReactionSchema,
  updatePostSurfacesSchema,
} from "./schemas";

// ---------------------------------------------------------------------------
// Nəticə forması
// ---------------------------------------------------------------------------

export interface FeedActionResult<T = undefined> {
  ok: boolean;
  message?: string;
  /** Sahə → səhv mesajı (Zod). Formada göstərilir. */
  fieldErrors?: Record<string, string>;
  value?: T;
}

const GENERIC_ERROR = "Əməliyyat tamamlanmadı. Bir azdan yenidən cəhd edin.";

const FAILURE_MESSAGES: Record<PostMutationFailure, string> = {
  NOT_A_MEMBER: "Bu sinifdə paylaşım etmək üçün üzv olmalısınız.",
  NOT_FOUND: "Paylaşım tapılmadı və ya artıq silinib.",
  FORBIDDEN: "Bu əməliyyat üçün icazəniz yoxdur.",
  EVENT_NOT_FOUND: "Seçilmiş tədbir tapılmadı.",
  ACHIEVEMENT_DETAILS_REQUIRED:
    "Nailiyyət üçün kateqoriya, ad və tarix doldurulmalıdır.",
};

/** Zod səhvlərini `{ "achievement.title": "…" }` formasına gətirir. */
function toFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/**
 * Lentin göründüyü bütün səthləri təzələyir.
 * Timeline / Achievements səhifələri hələ qurulmayıb (Blok 6, 8), amma yol
 * mövcud olmasa da `revalidatePath` təhlükəsizdir və blok gələndə işləyəcək.
 */
function revalidateFeedSurfaces(slug: string): void {
  revalidatePath(`/class/${slug}/feed`);
  revalidatePath(`/class/${slug}/timeline`);
  revalidatePath(`/class/${slug}/achievements`);
}

// ---------------------------------------------------------------------------
// createPost
// ---------------------------------------------------------------------------

export async function createPostAction(
  input: unknown,
): Promise<FeedActionResult<{ postId: string }>> {
  try {
    const viewer = await requireUser();

    const parsed = createPostSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: "Formada düzəliş tələb olunur.",
        fieldErrors: toFieldErrors(parsed.error.issues),
      };
    }

    const data = parsed.data;
    const result = await createPost(viewer, toCreatePostData(data, data.cohortId));

    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    return { ok: true, value: result.value };
  } catch (error) {
    // `requireUser()` sessiya yoxdursa NEXT_REDIRECT atır — naviqasiyadır, xəta deyil.
    unstable_rethrow(error);
    console.error("[feed] createPostAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

/**
 * Paylaşım yaradıldıqdan sonra server keşini təzələyir.
 *
 * ⚠️ `revalidatePath` `createPostAction`-ın İÇİNDƏ deyil, ayrı çağırışdadır:
 * lent müştəri tərəfdə TanStack Query ilə idarə olunur və action-ın nəticəsi
 * dərhal keşə yazılır. Səhifə səviyyəli revalidate isə yalnız naviqasiyadan
 * sonra lazımdır.
 */
export async function revalidateFeedAction(cohortSlug: string): Promise<void> {
  await requireUser();
  revalidateFeedSurfaces(cohortSlug);
}

// ---------------------------------------------------------------------------
// updatePostSurfaces (T11)
// ---------------------------------------------------------------------------

export async function updatePostSurfacesAction(
  input: unknown,
): Promise<FeedActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = updatePostSurfacesSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: "Formada düzəliş tələb olunur.",
        fieldErrors: toFieldErrors(parsed.error.issues),
      };
    }

    const data = parsed.data;
    const result = await updatePostSurfaces(viewer, {
      postId: data.postId,
      showOnTimeline: data.showOnTimeline,
      showInAchievements: data.showInAchievements,
      achievement: toAchievementInput(data.achievement, data.showInAchievements),
    });

    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[feed] updatePostSurfacesAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// deletePost (T4)
// ---------------------------------------------------------------------------

export async function deletePostAction(input: unknown): Promise<FeedActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = postIdSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Paylaşım tapılmadı." };

    const result = await deletePost(viewer, parsed.data.postId);
    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[feed] deletePostAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// toggleReaction (T12)
// ---------------------------------------------------------------------------

export async function toggleReactionAction(
  input: unknown,
): Promise<FeedActionResult<{ type: string | null }>> {
  try {
    const viewer = await requireUser();

    const parsed = toggleReactionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Reaksiya tanınmadı." };

    const result = await toggleReaction(viewer, parsed.data.postId, parsed.data.type);

    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    return { ok: true, value: result.value };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[feed] toggleReactionAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Şərhlər
// ---------------------------------------------------------------------------

export async function listCommentsAction(
  postId: string,
): Promise<FeedActionResult<FeedComment[]>> {
  try {
    const viewer = await requireUser();
    return { ok: true, value: await listComments(viewer, postId) };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[feed] listCommentsAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function createCommentAction(
  input: unknown,
): Promise<FeedActionResult<{ commentId: string }>> {
  try {
    const viewer = await requireUser();

    const parsed = createCommentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Şərh göndərilmədi.",
        fieldErrors: toFieldErrors(parsed.error.issues),
      };
    }

    const result = await createComment(viewer, {
      postId: parsed.data.postId,
      body: parsed.data.body,
      parentId: emptyToNull(parsed.data.parentId),
    });

    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    return { ok: true, value: result.value };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[feed] createCommentAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function deleteCommentAction(input: unknown): Promise<FeedActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = deleteCommentSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Şərh tapılmadı." };

    const result = await deleteComment(viewer, parsed.data.commentId);
    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[feed] deleteCommentAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Şikayət
// ---------------------------------------------------------------------------

export async function reportPostAction(input: unknown): Promise<FeedActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = reportPostSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Şikayət göndərilmədi.",
        fieldErrors: toFieldErrors(parsed.error.issues),
      };
    }

    const result = await createReport(viewer, {
      entityType: ReportEntityType.POST,
      entityId: parsed.data.postId,
      reason: parsed.data.reason,
      details: emptyToNull(parsed.data.details),
    });

    if (!result.ok) return { ok: false, message: "Paylaşım tapılmadı." };

    return {
      ok: true,
      message: result.value.duplicate
        ? "Şikayətiniz artıq növbədədir."
        : "Şikayət göndərildi. Moderatorlar baxacaq.",
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[feed] reportPostAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}
