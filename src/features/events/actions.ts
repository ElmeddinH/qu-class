"use server";

// ============================================================================
// src/features/events/actions.ts
// Events & Reunion Server Action-ları (spec §14, §15).
//
// ⚠️ Bu fayl `prisma`-nı BİRBAŞA çağırmır — bütün DB girişi
// `services/event.service.ts`-dədir (CLAUDE.md §4). Buradakı iş dörd addımdır:
//   1. `requireUser()` — sessiyanı `Viewer`-ə çevir
//   2. Zod ilə girişi doğrula (`features/events/schemas.ts`)
//   3. Sətirləri `Date` / `number` / `null`-a çevir (TƏLƏ T3)
//   4. Servisi çağır, keşi təzələ, azərbaycanca nəticə qaytar
//
// 🔴 İCAZƏ İKİ QATDIR: səhifə `requireCohortRole(...)` / `canManageEvent(...)`
// ilə açılır, servis isə HƏR əməliyyatda qapını yenidən yoxlayır. Server action
// birbaşa çağırıla bilər (səhifədən keçmədən), ona görə səhifə qapısı TƏK
// qoruma sayılmır.
// ============================================================================

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { buildCsv, csvFileName } from "@/lib/csv";
import { EventScope, type RsvpStatus as RsvpStatusType } from "@/lib/enums";
import { eventScopeLabel, rsvpStatusLabel } from "@/lib/labels";
import {
  addEventPhotos,
  addEventToTimeline,
  checkInAttendee,
  completeEvent,
  confirmRegistration,
  createEvent,
  exportEventAttendees,
  notifyAttendees,
  removeEventFromTimeline,
  removeEventPhoto,
  rsvpToEvent,
  submitEventFeedback,
  type EventMutationFailure,
} from "@/services/event.service";

import {
  addEventPhotosSchema,
  attendeeActionSchema,
  bulkNotifySchema,
  checkInSchema,
  completeEventSchema,
  createEventSchema,
  emptyToNull,
  eventFeedbackSchema,
  eventIdSchema,
  removeEventPhotoSchema,
  rsvpSchema,
} from "./schemas";

// ---------------------------------------------------------------------------
// Nəticə forması
// ---------------------------------------------------------------------------

export interface EventActionResult<T = undefined> {
  ok: boolean;
  message?: string;
  /** Sahə → səhv mesajı (Zod). Formada göstərilir. */
  fieldErrors?: Record<string, string>;
  value?: T;
}

const GENERIC_ERROR = "Əməliyyat tamamlanmadı. Bir azdan yenidən cəhd edin.";

const FAILURE_MESSAGES: Record<EventMutationFailure, string> = {
  NOT_FOUND: "Tədbir tapılmadı.",
  FORBIDDEN: "Bu əməliyyat üçün icazəniz yoxdur.",
  NOT_A_MEMBER: "Bu sinifdə tədbir yaratmaq üçün üzv olmalısınız.",
  COHORT_REQUIRED: "Bu tədbir heç bir sinfə bağlı deyil — xronologiyaya əlavə edilə bilməz.",
  FACULTY_REQUIRED: "Fakültə səviyyəli tədbir üçün fakültə seçilməlidir.",
  INVALID_DATES: "Bitmə vaxtı başlama vaxtından sonra olmalıdır.",
  EVENT_CLOSED: "Tədbir qeydiyyata bağlıdır.",
  EVENT_FINISHED: "Tədbir artıq başlayıb.",
  REGISTRATION_CLOSED: "Qeydiyyat son tarixi keçib.",
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
 * Tədbirin göründüyü bütün səthləri təzələyir.
 *
 * `cohortSlug` yoxdursa (universitet səviyyəli tədbir) yalnız tədbir
 * səhifələri təzələnir — `revalidatePath("/class/null/...")` mənasızdır.
 */
function revalidateEventSurfaces(eventId: string, cohortSlug: string | null): void {
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/manage`);
  revalidatePath(`/events/${eventId}/report`);

  if (cohortSlug) {
    revalidatePath(`/class/${cohortSlug}/events`);
    revalidatePath(`/class/${cohortSlug}/timeline`);
    revalidatePath(`/class/${cohortSlug}`);
  }
}

// ---------------------------------------------------------------------------
// createEvent
// ---------------------------------------------------------------------------

/**
 * Tədbir yaradır.
 *
 * ⚠️ TƏLƏ T3-ün ödənişi MƏHZ BURADADIR: forma sətirləri (`datetime-local`,
 * tutum) `Date` / `number`-ə burada çevrilir. Sxemdə `z.coerce` işlədilsəydi
 * RHF sahə tipləri dağılardı.
 *
 * ⚠️ `facultyId` / `clubId` `scope`-a görə TƏMİZLƏNİR: istifadəçi əvvəlcə
 * `FACULTY` seçib fakültə göstərsə, sonra `CLASS`-a keçsə, gizli sahədəki
 * köhnə dəyər DB-yə düşməməlidir (filtr paneli onu yanlış qrupda göstərərdi).
 */
export async function createEventAction(
  input: unknown,
): Promise<EventActionResult<{ eventId: string }>> {
  try {
    const viewer = await requireUser();

    const parsed = createEventSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: "Formada düzəliş tələb olunur.",
        fieldErrors: toFieldErrors(parsed.error.issues),
      };
    }

    const data = parsed.data;

    const result = await createEvent(viewer, {
      cohortId: data.cohortId,
      scope: data.scope,
      category: data.category,
      facultyId: data.scope === EventScope.FACULTY ? emptyToNull(data.facultyId) : null,
      clubId: data.scope === EventScope.CLUB ? emptyToNull(data.clubId) : null,
      title: data.title,
      description: emptyToNull(data.description),
      startsAt: new Date(data.startsAt),
      endsAt: data.endsAt === "" ? null : new Date(data.endsAt),
      location: emptyToNull(data.location),
      onlineUrl: emptyToNull(data.onlineUrl),
      isOnline: data.isOnline,
      capacity: data.capacity === "" ? null : Number.parseInt(data.capacity, 10),
      registrationDeadline:
        data.registrationDeadline === "" ? null : new Date(data.registrationDeadline),
      agenda: emptyToNull(data.agenda),
      contactId: emptyToNull(data.contactId),
      visibility: data.visibility,
      coverUrl: emptyToNull(data.coverUrl),
    });

    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    return {
      ok: true,
      message: `«${data.title}» elan olundu (${eventScopeLabel(data.scope)}).`,
      value: result.value,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[events] createEventAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

/**
 * Tədbir yaradıldıqdan sonra server keşini təzələyir.
 *
 * ⚠️ `createEventAction`-ın İÇİNDƏ deyil (lentdəki `revalidateFeedAction` ilə
 * eyni səbəb): kompozitor dialoqu bağlanandan sonra `router.refresh()` ilə
 * birlikdə çağırılır.
 */
export async function revalidateEventsAction(cohortSlug: string): Promise<void> {
  await requireUser();
  revalidatePath(`/class/${cohortSlug}/events`);
  revalidatePath(`/class/${cohortSlug}`);
}

// ---------------------------------------------------------------------------
// RSVP — Qəbul et / Rədd et / Qeydiyyatdan keç
// ---------------------------------------------------------------------------

const RSVP_SUCCESS: Record<string, string> = {
  ACCEPTED: "Dəvəti qəbul etdiniz.",
  DECLINED: "Dəvəti rədd etdiniz.",
  REGISTERED: "Qeydiyyatdan keçdiniz.",
  WAITLISTED: "Tutum doludur — gözləmə siyahısına əlavə olundunuz.",
};

export async function rsvpAction(
  input: unknown,
): Promise<EventActionResult<{ status: string; waitlisted: boolean }>> {
  try {
    const viewer = await requireUser();

    const parsed = rsvpSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Tədbir tapılmadı." };

    const result = await rsvpToEvent(viewer, parsed.data.eventId, parsed.data.intent);
    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidatePath(`/events/${parsed.data.eventId}`);

    return {
      ok: true,
      message: RSVP_SUCCESS[result.value.status] ?? rsvpStatusLabel(result.value.status),
      value: result.value,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[events] rsvpAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Rəy sorğusu
// ---------------------------------------------------------------------------

export async function submitFeedbackAction(input: unknown): Promise<EventActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = eventFeedbackSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Rəy göndərilmədi.",
        fieldErrors: toFieldErrors(parsed.error.issues),
      };
    }

    const result = await submitEventFeedback(
      viewer,
      parsed.data.eventId,
      parsed.data.rating,
      emptyToNull(parsed.data.feedback),
    );

    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidatePath(`/events/${parsed.data.eventId}`);
    return { ok: true, message: "Rəyiniz üçün təşəkkür edirik." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[events] submitFeedbackAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Foto albom
// ---------------------------------------------------------------------------

/**
 * Yüklənmiş şəklin ünvanı həqiqətən bizim yükləmə qovluğundandırmı?
 *
 * Media obyektləri müştəridən gəlir (`/api/upload` cavabı formada saxlanılır),
 * yəni ixtiyari `url` göndərilə bilər — xarici ünvan qəbul etsək albom başqa
 * saytdan şəkil çəkərdi (izləmə pikseli, qarışıq məzmun). Eyni qayda
 * `features/feed/actions.ts` → `isUploadPath`-dədir.
 */
function isUploadPath(url: string): boolean {
  return url.startsWith("/uploads/") && !url.includes("..");
}

export async function addEventPhotosAction(
  input: unknown,
): Promise<EventActionResult<{ added: number }>> {
  try {
    const viewer = await requireUser();

    const parsed = addEventPhotosSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Şəkillər əlavə edilmədi.",
      };
    }

    const photos = parsed.data.photos
      .filter((photo) => isUploadPath(photo.url))
      .map((photo) => ({
        url: photo.url,
        thumbUrl: emptyToNull(photo.thumbUrl),
        mimeType: emptyToNull(photo.mimeType),
        sizeBytes: photo.sizeBytes,
        width: photo.width,
        height: photo.height,
        caption: emptyToNull(photo.caption),
      }));

    const result = await addEventPhotos(viewer, parsed.data.eventId, photos);
    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidatePath(`/events/${parsed.data.eventId}`);
    return {
      ok: true,
      message: `${result.value.added} şəkil alboma əlavə olundu.`,
      value: result.value,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[events] addEventPhotosAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function removeEventPhotoAction(input: unknown): Promise<EventActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = removeEventPhotoSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Şəkil tapılmadı." };

    const result = await removeEventPhoto(
      viewer,
      parsed.data.eventId,
      parsed.data.mediaId,
    );
    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidatePath(`/events/${parsed.data.eventId}`);
    return { ok: true, message: "Şəkil silindi." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[events] removeEventPhotoAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// «Class Timeline-a əlavə et»
// ---------------------------------------------------------------------------

export async function addEventToTimelineAction(
  input: unknown,
): Promise<EventActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = eventIdSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Tədbir tapılmadı." };

    const result = await addEventToTimeline(viewer, parsed.data.eventId);
    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidateEventSurfaces(parsed.data.eventId, result.value.cohortSlug);
    return { ok: true, message: "Tədbir sinif xronologiyasına əlavə olundu." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[events] addEventToTimelineAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function removeEventFromTimelineAction(
  input: unknown,
): Promise<EventActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = eventIdSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Tədbir tapılmadı." };

    const result = await removeEventFromTimeline(viewer, parsed.data.eventId);
    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidateEventSurfaces(parsed.data.eventId, null);
    return { ok: true, message: "Tədbir xronologiyadan çıxarıldı." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[events] removeEventFromTimelineAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Koordinator paneli
// ---------------------------------------------------------------------------

export async function confirmRegistrationAction(
  input: unknown,
): Promise<EventActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = attendeeActionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "İştirakçı tapılmadı." };

    const result = await confirmRegistration(
      viewer,
      parsed.data.eventId,
      parsed.data.userId,
    );

    if (!result.ok) {
      // `confirmRegistration` tutum dolu olduqda da `FORBIDDEN` qaytarır —
      // ümumi mesaj çaşdırıcı olardı, ona görə burada dəqiqləşdirilir.
      return {
        ok: false,
        message:
          result.reason === "FORBIDDEN"
            ? "Tutum doludur və ya icazəniz yoxdur."
            : FAILURE_MESSAGES[result.reason],
      };
    }

    revalidatePath(`/events/${parsed.data.eventId}/manage`);
    revalidatePath(`/events/${parsed.data.eventId}`);
    return { ok: true, message: "Qeydiyyat təsdiqləndi." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[events] confirmRegistrationAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function checkInAction(input: unknown): Promise<EventActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = checkInSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "İştirakçı tapılmadı." };

    const result = await checkInAttendee(
      viewer,
      parsed.data.eventId,
      parsed.data.userId,
      parsed.data.attended,
    );
    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidatePath(`/events/${parsed.data.eventId}/manage`);
    revalidatePath(`/events/${parsed.data.eventId}/report`);
    return {
      ok: true,
      message: parsed.data.attended ? "İştirak qeyd olundu." : "«Gəlmədi» işarələndi.",
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[events] checkInAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function notifyAttendeesAction(
  input: unknown,
): Promise<EventActionResult<{ sent: number }>> {
  try {
    const viewer = await requireUser();

    const parsed = bulkNotifySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Bildiriş göndərilmədi.",
        fieldErrors: toFieldErrors(parsed.error.issues),
      };
    }

    const result = await notifyAttendees(
      viewer,
      parsed.data.eventId,
      parsed.data.statuses as RsvpStatusType[],
      parsed.data.title,
      parsed.data.body,
    );
    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    return {
      ok: true,
      message:
        result.value.sent === 0
          ? "Seçilmiş qrupda alıcı yoxdur."
          : `${result.value.sent} nəfərə bildiriş göndərildi.`,
      value: result.value,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[events] notifyAttendeesAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function completeEventAction(input: unknown): Promise<EventActionResult> {
  try {
    const viewer = await requireUser();

    const parsed = completeEventSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Tədbir tapılmadı." };

    const result = await completeEvent(
      viewer,
      parsed.data.eventId,
      emptyToNull(parsed.data.summary),
    );
    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    revalidateEventSurfaces(parsed.data.eventId, null);
    return { ok: true, message: "Tədbir tamamlanmış kimi işarələndi." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[events] completeEventAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// CSV ixracı (KUDS §14)
// ---------------------------------------------------------------------------

/** İxrac faylının sütunları — azərbaycanca, fayl istifadəçi üçündür. */
const CSV_HEADERS = [
  "Ad",
  "Soyad",
  "E-poçt",
  "Sinifdəki rol",
  "Status",
  "Qeydiyyat tarixi",
  "Check-in",
  "Qiymət",
  "Rəy",
] as const;

function isoOrEmpty(value: Date | null): string {
  return value === null ? "" : value.toISOString();
}

/**
 * İştirakçı cədvəlinin CSV mətni.
 *
 * ⚠️ Fayl BRAUZERDƏ yaradılır (`Blob` + `URL.createObjectURL`), server yalnız
 * MƏTNİ qaytarır. Səbəb: `Content-Disposition` ilə endirmək üçün ayrıca route
 * handler lazım olardı və orada icazə yoxlaması İKİNCİ dəfə yazılmalı idi.
 * Server action mövcud `canManageEvent` qapısını yenidən işlədir.
 *
 * ⚠️ Tarixlər ISO formatındadır, azərbaycanca deyil: CSV maşın üçün
 * oxunandır və Excel ISO-nu tarix kimi tanıyır.
 */
export async function exportAttendeesCsvAction(
  input: unknown,
): Promise<EventActionResult<{ fileName: string; content: string }>> {
  try {
    const viewer = await requireUser();

    const parsed = eventIdSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Tədbir tapılmadı." };

    const result = await exportEventAttendees(viewer, parsed.data.eventId);
    if (!result.ok) return { ok: false, message: FAILURE_MESSAGES[result.reason] };

    const content = buildCsv(
      CSV_HEADERS,
      result.value.rows.map((row) => [
        row.firstName,
        row.lastName,
        row.email,
        row.cohortRole ?? "",
        rsvpStatusLabel(row.status),
        isoOrEmpty(row.registeredAt),
        isoOrEmpty(row.checkedInAt),
        row.rating ?? "",
        row.feedback ?? "",
      ]),
    );

    return {
      ok: true,
      value: {
        fileName: csvFileName(`istirakcilar-${result.value.title}`, new Date()),
        content,
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[events] exportAttendeesCsvAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }
}
