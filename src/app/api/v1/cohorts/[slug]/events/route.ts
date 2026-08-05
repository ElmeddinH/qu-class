// ============================================================================
// src/app/api/v1/cohorts/[slug]/events/route.ts
// GET  /api/v1/cohorts/{slug}/events — spec §15-in 6 filtri (Blok 9).
// POST /api/v1/cohorts/{slug}/events — yeni tədbir (Blok 14C).
//
// ⚠️ Filtr parse-ı UI ilə EYNİ funksiyadandır (`parseEventParams`), `when` →
// `upcoming` və `format` → `isOnline` çevirmələri də EYNİ köməkçilərdən
// (`upcomingFlagOf`, `isOnlineFlagOf`).
//
// ⚠️ `cohortId` DEYİL, `audienceCohortId`: sinif səviyyəli tədbir azdır, tələbə
// isə universitet / fakültə / klub tədbirlərini də görür (`ClassEvents` ilə
// eyni qərar). Bu, AUDİTORİYA süzgəcidir — görünürlük yenə `visibleWithStatus`
// ilə ayrıca tətbiq olunur.
//
// ⚠️ "İndi" BİR DƏFƏ hesablanır və hər iki sorğuya ötürülür: siyahı ilə say
// eyni ana baxmalıdır, yoxsa sərhəddəki tədbir sayda var, siyahıda yox olur.
//
// 🔴 POST — SİNİF YOLDAN GƏLİR, GÖVDƏDƏN YOX (paylaşım və xatirə POST-u ilə
// eyni qərar). `resolveCohortScope` üzv olmayana 404 verir; ÜZVLÜK isə
// KİFAYƏT DEYİL — `createEvent` əlavə olaraq `EVENT_MANAGER_ROLES` rolunu
// DB-dən yoxlayır və rolsuz üzvə `FORBIDDEN` → **403** qaytarır. Fərq
// qəsdəndir: sinfin mövcudluğu bu nöqtədə viewer-ə ONSUZ DA məlumdur (üzvdür),
// ona görə 403 sızma deyil (bax `lib/api/errors.ts` qaydası).
// ============================================================================

import { resolveCohortScope } from "@/lib/api/cohort-scope";
import { parseJsonBody, requireJson, withUser } from "@/lib/api/guard";
import { failMutation } from "@/lib/api/mutation-result";
import { enforceWriteRate } from "@/lib/api/rate-limit";
import { created, ok } from "@/lib/api/respond";
import { CreateEventBodySchema } from "@/lib/api/schemas";
import {
  EVENT_PAGE_SIZE,
  eventSkipOf,
  isOnlineFlagOf,
  parseEventParams,
  upcomingFlagOf,
} from "@/lib/event-filters";
import { toCreateEventData } from "@/features/events/event-input";
import { countEvents, createEvent, listEvents } from "@/services/event.service";

export const dynamic = "force-dynamic";

/** Yazma sayğacının əhatəsi — paylaşım və xatirə büdcəsindən AYRIDIR. */
const WRITE_SCOPE = "events";

export const GET = withUser<{ slug: string }>(
  async ({ viewer, params, searchParams }) => {
    const scope = await resolveCohortScope(viewer, params.slug);
    if (!scope.ok) return scope.response;

    const filters = parseEventParams(searchParams);
    const now = new Date();

    const serviceFilters = {
      audienceCohortId: scope.cohort.id,
      category: filters.category ?? undefined,
      scope: filters.scope ?? undefined,
      facultyId: filters.facultyId ?? undefined,
      clubId: filters.clubId ?? undefined,
      isOnline: isOnlineFlagOf(filters.format),
      upcoming: upcomingFlagOf(filters.when),
    };

    const [items, total] = await Promise.all([
      listEvents(
        viewer,
        {
          ...serviceFilters,
          take: EVENT_PAGE_SIZE,
          skip: eventSkipOf(filters, EVENT_PAGE_SIZE),
        },
        now,
      ),
      countEvents(viewer, serviceFilters, now),
    ]);

    return ok(items, {
      meta: { total, page: filters.page, pageSize: EVENT_PAGE_SIZE },
    });
  },
);

/**
 * Yeni tədbir.
 *
 * Sıra paylaşım POST-u ilə EYNİDİR: `requireJson` → sayğac → sinif qapısı →
 * gövdə. Səbəblər `cohorts/{slug}/posts/route.ts`-də sadalanıb.
 *
 * ⚠️ `scope = FACULTY` olduqda `facultyId` MƏCBURİDİR. Qayda İKİ YERDƏDİR və
 * heç biri route DEYİL: sxem (`eventContentRules` — formanın işlətdiyi EYNİ
 * funksiya) və servis (`createEvent` → `FACULTY_REQUIRED`). Route yalnız
 * `reason`-u 422-yə çevirir.
 *
 * ⚠️ 201 cavabında `Location` başlığı var (RFC 9110 §10.2.2) — müştəri
 * yaradılan tədbiri dərhal `GET /api/v1/events/{id}` ilə oxuya bilir.
 */
export const POST = withUser<{ slug: string }>(async ({ request, viewer, params }) => {
  const contentTypeError = requireJson(request);
  if (contentTypeError) return contentTypeError;

  const limited = enforceWriteRate(viewer.userId, WRITE_SCOPE);
  if (limited) return limited;

  const scope = await resolveCohortScope(viewer, params.slug);
  if (!scope.ok) return scope.response;

  const body = await parseJsonBody(CreateEventBodySchema, request);
  if (!body.ok) return body.response;

  // ⚠️ Çevirmə (sətir → `Date` / `number`, `scope`-a görə təmizləmə)
  // `features/events/event-input.ts`-dədir — Server Action ilə EYNİ funksiya.
  const result = await createEvent(viewer, toCreateEventData(body.data, scope.cohort.id));

  if (!result.ok) return failMutation(result.reason);

  return created(result.value, {
    headers: { location: `/api/v1/events/${result.value.eventId}` },
  });
});
