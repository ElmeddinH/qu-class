// ============================================================================
// src/features/events/event-input.ts
// Doğrulanmış tədbir GİRİŞİ → servis GİRİŞİ. Saf çevirmə, sıfır DB, sıfır I/O.
//
// 🔴 NİYƏ AYRICA FAYL (Blok 14C, `features/feed/post-input.ts` ilə EYNİ
// SƏBƏB): çevirmə əvvəl `features/events/actions.ts`-in içində, `"use server"`
// faylında idi və oradan yalnız `async` funksiya ixrac oluna bilir. `/api/v1`
// route handler-i eyni çevirməyə möhtacdır — iki nüsxə yazsaydıq `scope`-a
// görə təmizləmə (aşağı) yalnız birində düzələrdi.
//
// ⚠️ TƏLƏ T3 — sətir → `Date` / `number` çevirməsi MƏHZ BURADA olur; sxemdə
// `z.coerce` işlədilmir (RHF sahə tipləri dağılardı).
// ============================================================================

import {
  EventCategorySchema,
  EventScope,
  EventScopeSchema,
  VisibilitySchema,
} from "@/lib/enums";
import type {
  CreateEventData,
  EventDetail,
  UpdateEventData,
} from "@/services/event.service";

import { emptyToNull, type EventFieldsInput } from "./schemas";

/** Boş sətir = «limit yoxdur»; sxem onsuz da yalnız rəqəm buraxır. */
function toCapacity(value: string): number | null {
  return value.trim() === "" ? null : Number.parseInt(value, 10);
}

/** Boş sətir = tarix seçilməyib. */
function toOptionalDate(value: string): Date | null {
  return value.trim() === "" ? null : new Date(value);
}

/**
 * `facultyId` / `clubId` `scope`-a görə TƏMİZLƏNİR.
 *
 * ⚠️ İstifadəçi əvvəlcə `FACULTY` seçib fakültə göstərsə, sonra `CLASS`-a
 * keçsə, gizli sahədəki köhnə dəyər DB-yə DÜŞMƏMƏLİDİR — filtr paneli tədbiri
 * yanlış qrupda göstərərdi.
 */
function scopedIds(input: EventFieldsInput): {
  facultyId: string | null;
  clubId: string | null;
} {
  return {
    facultyId: input.scope === EventScope.FACULTY ? emptyToNull(input.facultyId) : null,
    clubId: input.scope === EventScope.CLUB ? emptyToNull(input.clubId) : null,
  };
}

/** Sahələrin ORTAQ çevirməsi — yaratma və yeniləmə eyni funksiyadan keçir. */
function toEventFields(input: EventFieldsInput): Omit<CreateEventData, "cohortId"> {
  return {
    ...scopedIds(input),
    scope: input.scope,
    category: input.category,
    title: input.title,
    description: emptyToNull(input.description),
    startsAt: new Date(input.startsAt),
    endsAt: toOptionalDate(input.endsAt),
    location: emptyToNull(input.location),
    onlineUrl: emptyToNull(input.onlineUrl),
    isOnline: input.isOnline,
    capacity: toCapacity(input.capacity),
    registrationDeadline: toOptionalDate(input.registrationDeadline),
    agenda: emptyToNull(input.agenda),
    contactId: emptyToNull(input.contactId),
    visibility: input.visibility,
    coverUrl: emptyToNull(input.coverUrl),
  };
}

/**
 * `createEvent()` arqumenti.
 *
 * ⚠️ `cohortId` PARAMETRDİR, girişdən oxunmur: Server Action onu formadan,
 * REST route isə YOLDAN (`/cohorts/{slug}/events`) verir. Hər iki halda servis
 * `EVENT_MANAGER_ROLES` rolunu DB-dən yenidən yoxlayır.
 */
export function toCreateEventData(
  input: EventFieldsInput,
  cohortId: string,
): CreateEventData {
  return { cohortId, ...toEventFields(input) };
}

/**
 * `PATCH /api/v1/events/{id}` — QİSMƏN yeniləmə üçün birləşdirmə.
 *
 * 🔴 `updateEvent` sahələri MƏCBURİ alır (yaratma ilə EYNİ forma), ona görə
 * göndərilməyən sahə CARİ dəyərdən doldurulur. Default qoysaydıq, yalnız
 * başlığı dəyişən müştəri tədbirin proqramını və tutumunu SƏSSİZCƏ silərdi
 * (paylaşım `PATCH`-i ilə eyni qərar).
 *
 * ⚠️ `EventDetail`-də `scope` / `category` / `visibility` XAM SƏTİRDİR (Prisma
 * sütunu `String` — SQLite-da enum yoxdur). `*Schema.parse` onları yenidən
 * daraldır; `as` çevirməsi bazadakı naməlum dəyəri səssizcə buraxardı.
 *
 * ⚠️ `cohortId` BURADA YOXDUR: tədbirin sinfi yeniləmə ilə DƏYİŞMİR — dəyişsə,
 * dəvətlər və RSVP sətirləri başqa sinfə "köçərdi".
 */
export function mergeEventUpdateData(
  current: EventDetail,
  patch: Partial<EventFieldsInput>,
): Omit<UpdateEventData, "eventId"> {
  const scope = patch.scope ?? EventScopeSchema.parse(current.scope);

  return {
    scope,
    category: patch.category ?? EventCategorySchema.parse(current.category),
    facultyId:
      scope === EventScope.FACULTY
        ? patch.facultyId === undefined
          ? current.faculty?.id ?? null
          : emptyToNull(patch.facultyId)
        : null,
    clubId:
      scope === EventScope.CLUB
        ? patch.clubId === undefined
          ? current.club?.id ?? null
          : emptyToNull(patch.clubId)
        : null,
    title: patch.title ?? current.title,
    description:
      patch.description === undefined
        ? current.description
        : emptyToNull(patch.description),
    startsAt: patch.startsAt === undefined ? current.startsAt : new Date(patch.startsAt),
    endsAt: patch.endsAt === undefined ? current.endsAt : toOptionalDate(patch.endsAt),
    location:
      patch.location === undefined ? current.location : emptyToNull(patch.location),
    onlineUrl:
      patch.onlineUrl === undefined ? current.onlineUrl : emptyToNull(patch.onlineUrl),
    isOnline: patch.isOnline ?? current.isOnline,
    capacity: patch.capacity === undefined ? current.capacity : toCapacity(patch.capacity),
    registrationDeadline:
      patch.registrationDeadline === undefined
        ? current.registrationDeadline
        : toOptionalDate(patch.registrationDeadline),
    agenda: patch.agenda === undefined ? current.agenda : emptyToNull(patch.agenda),
    contactId:
      patch.contactId === undefined
        ? current.contact?.id ?? null
        : emptyToNull(patch.contactId),
    visibility: patch.visibility ?? VisibilitySchema.parse(current.visibility),
    coverUrl: patch.coverUrl === undefined ? current.coverUrl : emptyToNull(patch.coverUrl),
  };
}
