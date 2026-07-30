// ============================================================================
// src/lib/api/openapi.ts
// OpenAPI 3.0 sənədi — ZOD SXEMLƏRİNDƏN TÖRƏYİR, əl ilə yazılmır.
//
// 🔴 MEXANİZM:
//   1. `src/lib/api/schemas.ts` `extendZodWithOpenApi(z)` çağırır və mövcud
//      sxemləri (`features/auth/schemas.ts`, `lib/enums.ts`, `lib/search.ts`)
//      işlədərək cavab/sorğu sxemlərini qurur.
//   2. Bu fayl `OpenAPIRegistry`-ə yolları yazır və `OpenApiGeneratorV3` sənədi
//      generasiya edir.
//   3. `GET /api/v1/openapi.json` nəticəni qaytarır, `/docs` isə Swagger UI-a
//      verir.
//
// Nəticə: Zod sxemi dəyişəndə (yeni enum dəyəri, yeni sahə, dəyişən limit)
// sənəd DƏRHAL dəyişir. Əl ilə yazılmış sənəd bir həftədə koddan ayrılır.
//
// 🔴 QUERY PARAMETRLƏRİ DƏ TÖRƏMƏDİR: kataloq, xronologiya, nailiyyət və
// tədbir filtrlərinin ADLARI mövcud SAF modullardan (`DIRECTORY_FILTERS`,
// `TIMELINE_PARAMS`, `ACHIEVEMENT_PARAMS`, `EVENT_PARAMS`) oxunur. Əl ilə
// yazılsaydı UI-a yeni filtr əlavə edildikdə sənəd səssizcə köhnələrdi.
//
// ⚠️ 401 HƏR ƏMƏLİYYATDA sənədləşdirilir, çünki v1-in xəta ZƏRFİ vahiddir və
// müştəri TƏK error handler yazır. İctimai endpoint-lər praktikada 401
// QAYTARMIR — onlarda 401 müqavilənin FORMASI kimi göstərilir, davranış
// zəmanəti kimi deyil (hər belə cavabın təsvirində bu açıq yazılıb).
// ============================================================================

import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  type RouteConfig,
} from "@asteasolutions/zod-to-openapi";

import pkg from "../../../package.json";
import { SESSION_COOKIE_NAME } from "@/auth.config";
import {
  DIRECTORY_FILTERS,
  DIRECTORY_FILTER_KEYS,
  MULTI_SEPARATOR,
  PAGE_PARAM,
} from "@/lib/directory-filters";
import { ACHIEVEMENT_PARAMS } from "@/lib/achievement-filters";
import { MEMORY_PARAMS, MEMORY_PLACE_FLAG } from "@/lib/memory-filters";
import {
  NOTIFICATION_PARAMS,
  NOTIFICATION_STATUS_VALUES,
} from "@/lib/notification-filters";
import { TIMELINE_PARAMS } from "@/lib/timeline-filters";
import {
  EVENT_FORMAT_VALUES,
  EVENT_PARAMS,
  EVENT_WHEN_VALUES,
} from "@/lib/event-filters";
import {
  ACHIEVEMENT_CATEGORY_VALUES,
  AUDIT_ACTION_VALUES,
  CONTENT_SECTION_VALUES,
  EVENT_CATEGORY_VALUES,
  EVENT_SCOPE_VALUES,
  FAQ_CATEGORY_VALUES,
  GUIDE_CATEGORY_VALUES,
  MEMORY_TYPE_VALUES,
  NOTIFICATION_TYPE_VALUES,
  POST_CATEGORY_VALUES,
  REPORT_ENTITY_TYPE_VALUES,
  REPORT_REASON_VALUES,
  REPORT_STATUS_VALUES,
  SYSTEM_ROLE_VALUES,
  TIMELINE_SOURCE_TYPE_VALUES,
  USER_STAGE_VALUES,
} from "@/lib/enums";
import { MIN_SEARCH_LENGTH } from "@/lib/search";
import { ADMIN_USER_SORTS } from "@/lib/admin-filters";
import {
  AchievementSchema,
  AdminAuditSchema,
  AdminReportSchema,
  AdminResolveBodySchema,
  AdminResolveResultSchema,
  AdminStatsSchema,
  AdminUserSchema,
  ApiErrorSchema,
  CohortHeaderSchema,
  ContentPageDetailSchema,
  ContentPageSchema,
  DirectoryEntrySchema,
  EventSchema,
  FacultyCatalogSchema,
  FaqSchema,
  FeedPostSchema,
  GuidePlaceSchema,
  HealthSchema,
  LoginBodySchema,
  LogoutBodySchema,
  MemorySchema,
  NotificationReadResultSchema,
  NotificationSchema,
  NullableSessionSchema,
  PlaceMemorySchema,
  RegisterBodySchema,
  RegisteredUserSchema,
  SearchResultsSchema,
  SessionSchema,
  SupportOfferEntrySchema,
  TimelineItemSchema,
  ViewerCohortSchema,
  WhereAreWeNowSchema,
  YearbookEntrySchema,
  envelope,
  listEnvelope,
  z,
} from "./schemas";

// ---------------------------------------------------------------------------
// Taqlar — Swagger UI-da bölmə başlıqları
// ---------------------------------------------------------------------------

export const API_TAGS = [
  { name: "Auth", description: "Qeydiyyat, giriş, çıxış və cari sessiya." },
  {
    name: "Public",
    description:
      "Autentifikasiya TƏLƏB ETMƏYƏN redaksiya məzmunu: kataloq, səhifələr, FAQ, " +
      "Xankəndi bələdçisi.",
  },
  {
    name: "Cohorts",
    description:
      "Sinif (class page) məzmunu. Hər cavab `visibilityWhere(viewer)` " +
      "süzgəcindən keçir — icazəsiz sinif üçün 404 qaytarılır, 403 YOX.",
  },
  { name: "Events", description: "Tədbirlər və Reunion." },
  {
    name: "Notifications",
    description:
      "Bildiriş mərkəzi [M15]. 🔴 Cavab HƏMİŞƏ yalnız sorğunu edənin " +
      "bildirişləridir — bu qapı `visibilityWhere` DEYİL, SAHİBLİK şərtidir " +
      "(`recipientId = viewer.userId`).",
  },
  { name: "Search", description: "Qlobal axtarış (istifadəçi, paylaşım, tədbir, nailiyyət)." },
  {
    name: "Admin",
    description:
      "Moderasiya və administrasiya [M17]. 🔴 Qapı `withAdmin`-dir və rol " +
      "TOKEN-dən deyil, hər sorğuda BAZADAN oxunur — rolu endirilmiş " +
      "istifadəçinin köhnə JWT-si bu endpoint-ləri AÇA BİLMİR. " +
      "🔴 Şikayət növbəsi məzmun QAYTARMIR; audit jurnalı YALNIZ ƏLAVƏ olunur.",
  },
  { name: "System", description: "Sağlamlıq yoxlaması və sənəd." },
] as const;

export type ApiTag = (typeof API_TAGS)[number]["name"];

// ---------------------------------------------------------------------------
// Cavab köməkçiləri
// ---------------------------------------------------------------------------

const JSON_MEDIA = "application/json";

function jsonResponse(description: string, schema: z.ZodTypeAny) {
  return { description, content: { [JSON_MEDIA]: { schema } } };
}

function errorResponse(description: string) {
  return jsonResponse(description, ApiErrorSchema);
}

/** İctimai endpoint-lərdə 401-in mənası (bax fayl başlığındakı qeyd). */
const PUBLIC_401 = errorResponse(
  "Bu endpoint autentifikasiya TƏLƏB ETMİR — 401 yalnız vahid xəta zərfinin " +
    "forması kimi sənədləşdirilib, praktikada qaytarılmır.",
);

const PROTECTED_401 = errorResponse(
  "Sessiya kukisi yoxdur və ya etibarsızdır. Cavab JSON-dur — HTML " +
    "yönləndirmə (`/login`) BAŞ VERMİR.",
);

const NOT_FOUND_404 = errorResponse(
  "Resurs mövcud deyil VƏ YA viewer-in ona icazəsi yoxdur. İki hal QƏSDƏN " +
    "ayırd edilmir: 403 cavabı resursun mövcudluğunu sızdırardı.",
);

const VALIDATION_422 = errorResponse(
  "Doğrulama uğursuz oldu. `error.details` massivi sahə → mesaj cütlərini daşıyır.",
);

const FORBIDDEN_403 = errorResponse(
  "Rol tələb edən əməliyyat (koordinator / moderator / admin) üçün səlahiyyət " +
    "yoxdur. ⚠️ Yalnız ROL qapılarında işlədilir — görünürlük qapısı 404 verir.",
);

const RATE_LIMIT_429 = errorResponse(
  "Çox sayda uğursuz cəhd. `Retry-After` başlığı gözləmə müddətini (saniyə) " +
    "bildirir.",
);

const UNSUPPORTED_415 = errorResponse(
  "`Content-Type` `application/json` deyil. Bu, REST login üçün CSRF " +
    "müdafiəsidir: brauzerin `<form>` elementi JSON göndərə bilmir.",
);

/**
 * Hər əməliyyatın standart xəta dəsti.
 * `isPublic` — 401-in izahı dəyişir (yuxarıya bax).
 */
function commonResponses(options: { isPublic?: boolean } = {}) {
  return {
    401: options.isPublic ? PUBLIC_401 : PROTECTED_401,
    403: FORBIDDEN_403,
    404: NOT_FOUND_404,
    422: VALIDATION_422,
    429: RATE_LIMIT_429,
    500: errorResponse("Serverdə gözlənilməz xəta. Detal yalnız server logundadır."),
  };
}

// ---------------------------------------------------------------------------
// Parametr köməkçiləri — MÖVCUD filtr modullarından törəyir
// ---------------------------------------------------------------------------
//
// ⚠️ Parametrlər `RouteConfig.parameters` massivi ilə YAZILMIR, `request.query`
// / `request.params` Zod obyektləri ilə verilir. Səbəb: `parameters` xam OpenAPI
// `ParameterObject` gözləyir və oraya qoyulan Zod sxemi ÇEVRİLMİR — sənədə
// `{"_def": {...}}` kimi daxili Zod strukturu düşür. Səhv `tsc`-də görünür,
// amma generasiya sınmadığı üçün asanlıqla gözdən qaça bilər.
//
// `request.query` obyektinin AÇARI parametrin adı olur, `.optional()` isə
// `required: false` verir. Təsvir `.openapi({ param: { description } })`-dəndir.

/** Query parametri: adı açardan, məcburiyyəti `.optional()`-dan gəlir. */
function queryField(schema: z.ZodTypeAny, description: string) {
  return schema.optional().openapi({ param: { description } });
}

/** Yol parametri (`{slug}` / `{id}`) — həmişə məcburidir. */
function pathField(schema: z.ZodTypeAny, description: string) {
  return schema.openapi({ param: { description } });
}

const SlugParams = z.object({
  slug: pathField(
    z.string().openapi({ example: "informasiya-tehlukesizliyi-2027" }),
    "Sinfin `slug`-ı — `GET /api/v1/cohorts` cavabından götürülür.",
  ),
});

const EventIdParams = z.object({
  id: pathField(z.string(), "Tədbirin `id`-si."),
});

/** Səhifə nömrəsi — dörd siyahı endpoint-inin hamısında eyni. */
const pageQueryShape = {
  [PAGE_PARAM]: queryField(
    z.string().openapi({ example: "1" }),
    "Səhifə nömrəsi (1-dən). Etibarsız dəyər SƏSSİZCƏ 1-ə düşür — 422 vermir.",
  ),
};

/**
 * Kataloqun 13 filtri — `DIRECTORY_FILTERS` tərif cədvəlindən generasiya olunur.
 *
 * 🔴 Filtr siyahısı burada TƏKRAR YAZILMIR. UI-a yeni filtr əlavə edildikdə
 * (`DIRECTORY_FILTERS`-ə açar) sənəd özü yenilənir; siyahılar ayrılsa API
 * sənədi "13 filtr" deyib 12-sini göstərərdi.
 *
 * ⚠️ `profileField` olan filtrlərin təsvirinə XƏBƏRDARLIQ əlavə olunur:
 * gizlədilmiş sahəyə görə filtr həmin sahəni sızdıra bilər, ona görə servis
 * hər filtri `fieldVisibleWhere` ilə cütləyir (Blok 6, T17). Qayda API-də DƏ
 * keçərlidir — endpoint əlavə şərt yazmır, servisi çağırır.
 */
const directoryFilterShape: z.ZodRawShape = Object.fromEntries(
  DIRECTORY_FILTER_KEYS.map((key) => {
    const def = DIRECTORY_FILTERS[key];

    const typeHint =
      def.type === "multi"
        ? ` Bir neçə dəyər «${MULTI_SEPARATOR}» ilə ayrılır («hər hansı biri» semantikası).`
        : "";

    const privacyHint = def.profileField
      ? ` ⚠️ «${def.profileField}» sahəsi gizlədilmiş istifadəçilər bu filtrdən KEÇMİR ` +
        "(sahə-səviyyə məxfilik filtrə də tətbiq olunur)."
      : "";

    const schema =
      key === "status"
        ? z.enum(USER_STAGE_VALUES)
        : z.string().openapi(def.type === "multi" ? { example: "futbol,kitab" } : {});

    return [def.param, queryField(schema, `${def.label}.${typeHint}${privacyHint}`)];
  }),
);

const DirectoryQuery = z.object({ ...directoryFilterShape, ...pageQueryShape });

const TimelineQuery = z.object({
  [TIMELINE_PARAMS.year]: queryField(
    z.string().openapi({ example: "2026-2027" }),
    "Tədris ili (sentyabr 1 – avqust 31). Format pozulsa filtr nəzərə alınmır.",
  ),
  [TIMELINE_PARAMS.category]: queryField(
    z.enum(POST_CATEGORY_VALUES),
    "Kateqoriya filtri — paylaşım kateqoriyaları ilə eyni dəst.",
  ),
  [TIMELINE_PARAMS.source]: queryField(
    z.enum(TIMELINE_SOURCE_TYPE_VALUES),
    "Mənbə növü. `SYSTEM` — cohort tarixlərindən törəyən milestone-lar.",
  ),
  ...pageQueryShape,
});

/**
 * Xatirə filtrləri — `lib/memory-filters.ts` → `MEMORY_PARAMS`-dən TÖRƏYİR.
 * UI-a yeni filtr əlavə edilsə sənəd özü yenilənir (adlar təkrar yazılmır).
 */
const MemoryQuery = z.object({
  [MEMORY_PARAMS.type]: queryField(
    z.enum(MEMORY_TYPE_VALUES),
    "Xatirə növü (spec §11 — 8 dəyər).",
  ),
  [MEMORY_PARAMS.place]: queryField(
    z.literal(MEMORY_PLACE_FLAG),
    `Yalnız məkana bağlı xatirələr. Yeganə qəbul edilən dəyər «${MEMORY_PLACE_FLAG}»; ` +
      "başqa dəyər filtri SƏSSİZCƏ ləğv edir.",
  ),
  ...pageQueryShape,
});

const AchievementQuery = z.object({
  [ACHIEVEMENT_PARAMS.category]: queryField(
    z.enum(ACHIEVEMENT_CATEGORY_VALUES),
    "Nailiyyət kateqoriyası (12 dəyər).",
  ),
  ...pageQueryShape,
});

const EventQuery = z.object({
  [EVENT_PARAMS.when]: queryField(
    z.enum(EVENT_WHEN_VALUES),
    "Vaxt pəncərəsi. Default `UPCOMING`; `ALL` arxiv baxışıdır.",
  ),
  [EVENT_PARAMS.category]: queryField(
    z.enum(EVENT_CATEGORY_VALUES),
    "Tədbirin NÖVÜ (`scope` ilə ortoqonal).",
  ),
  [EVENT_PARAMS.scope]: queryField(
    z.enum(EVENT_SCOPE_VALUES),
    "TƏŞKİLATÇI səviyyəsi. Reunion MƏHZ burada seçilir (`REUNION`).",
  ),
  [EVENT_PARAMS.faculty]: queryField(
    z.string(),
    "Fakültə `id`-si. Naməlum id 404 VERMİR — sadəcə boş nəticə (sızma yoxdur).",
  ),
  [EVENT_PARAMS.club]: queryField(z.string(), "Klub `id`-si."),
  [EVENT_PARAMS.format]: queryField(
    z.enum(EVENT_FORMAT_VALUES),
    "İştirak forması: onlayn / əyani.",
  ),
  ...pageQueryShape,
});

const PostsQuery = z.object({
  cursor: queryField(
    z.string(),
    "Əvvəlki səhifənin son paylaşım `id`-si (`meta.nextCursor`).",
  ),
  take: queryField(z.string().openapi({ example: "20" }), "Səhifə ölçüsü (1–50)."),
});

/**
 * Bildiriş filtrləri — adlar `lib/notification-filters.ts`-dən TÖRƏYİR
 * (`NOTIFICATION_PARAMS`), sənədə əl ilə yazılmır.
 */
const NotificationQuery = z.object({
  [NOTIFICATION_PARAMS.status]: queryField(
    z.enum(NOTIFICATION_STATUS_VALUES),
    "Oxunma vəziyyəti. Verilməzsə hamısı qaytarılır.",
  ),
  [NOTIFICATION_PARAMS.type]: queryField(
    z.enum(NOTIFICATION_TYPE_VALUES),
    "Bildiriş növü (9 dəyər).",
  ),
  [NOTIFICATION_PARAMS.page]: queryField(
    z.string().openapi({ example: "2" }),
    "Səhifə nömrəsi (1-dən).",
  ),
});

const SearchQuery = z.object({
  q: z
    .string()
    .openapi({
      param: { description: `Axtarış sorğusu (ən azı ${MIN_SEARCH_LENGTH} simvol).` },
      example: "hakaton",
    }),
  take: queryField(z.string().openapi({ example: "5" }), "Növ başına limit (1–20)."),
});

// ---------------------------------------------------------------------------
// Reyestr
// ---------------------------------------------------------------------------

export const registry = new OpenAPIRegistry();

/**
 * Sessiya kukisi ilə autentifikasiya.
 *
 * ⚠️ Kukinin ADI `auth.config.ts` → `SESSION_COOKIE_NAME`-dandır, hardcode
 * DEYİL. Auth.js HTTPS-də `__Secure-` prefiksi əlavə edir; sabit hardcode
 * edilsəydi istehsalda Swagger UI mövcud olmayan kuka adını göstərərdi.
 */
const cookieAuth = registry.registerComponent("securitySchemes", "cookieAuth", {
  type: "apiKey",
  in: "cookie",
  name: SESSION_COOKIE_NAME,
  description:
    `Auth.js JWT sessiya kukisi (\`${SESSION_COOKIE_NAME}\`). ` +
    "`POST /api/v1/auth/login` onu brauzerə özü qoyur — Swagger UI-da " +
    "«Authorize» pəncərəsini əl ilə doldurmaq LAZIM DEYİL, çünki səhifə " +
    "`withCredentials: true` ilə işləyir.",
});

const SECURED = [{ [cookieAuth.name]: [] }];

/** `registry.registerPath` üçün nazik təbəqə — taq və operationId məcburi olur. */
function path(config: RouteConfig): void {
  registry.registerPath(config);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

path({
  method: "post",
  path: "/api/v1/auth/register",
  operationId: "registerUser",
  tags: ["Auth"],
  summary: "Yeni hesab yaradır",
  description:
    "Mövcud qeydiyyat servisini (`services/auth.service.ts` → `registerUser`) " +
    "çağırır: istifadəçi, sinif üzvlüyü və default məxfilik sətirləri TƏK " +
    "transaksiyada yaranır.\n\n" +
    "⚠️ `phone` və `personalEmail` sahələri `PRIVATE` olaraq yaradılır, " +
    "qalan idarə olunan sahələr `CLASS`.",
  request: {
    body: {
      required: true,
      content: { [JSON_MEDIA]: { schema: RegisterBodySchema } },
    },
  },
  responses: {
    201: jsonResponse(
      "Hesab yaradıldı. Cavabda sinfin `slug`-ı da var — müştəri dərhal sinif " +
        "səhifəsinə keçə bilir.",
      envelope(RegisteredUserSchema, "RegisteredUserResponse"),
    ),
    409: errorResponse("Bu e-poçt artıq qeydiyyatdadır."),
    415: UNSUPPORTED_415,
    ...commonResponses({ isPublic: true }),
  },
});

path({
  method: "post",
  path: "/api/v1/auth/login",
  operationId: "login",
  tags: ["Auth"],
  summary: "Giriş edir və sessiya kukisi qoyur",
  description:
    "Uğurlu cavabda `Set-Cookie` başlığı ilə Auth.js sessiya kukisi qoyulur; " +
    "sonrakı qorunan endpoint-lər həmin kuka ilə işləyir.\n\n" +
    "🔴 Yanlış şifrə və MÖVCUD OLMAYAN e-poçt EYNİ 401 mətnini qaytarır — " +
    "fərqli mesaj hansı e-poçtun sistemdə olduğunu ifşa edərdi (user " +
    "enumeration).\n\n" +
    "🔴 `Content-Type: application/json` MƏCBURİDİR (415). Bu, CSRF " +
    "müdafiəsidir: brauzer `<form>`-u JSON göndərə bilmir, `fetch` isə CORS " +
    "preflight tələb edir və CORS açıq deyil.\n\n" +
    "⚠️ 10 dəqiqədə 5 uğursuz cəhddən sonra 429.",
  request: {
    body: { required: true, content: { [JSON_MEDIA]: { schema: LoginBodySchema } } },
  },
  responses: {
    200: jsonResponse(
      "Giriş uğurlu — sessiya kukisi qoyuldu.",
      envelope(SessionSchema, "LoginResponse"),
    ),
    415: UNSUPPORTED_415,
    ...commonResponses({ isPublic: true }),
    401: errorResponse(
      "E-poçt və ya şifrə yanlışdır. ⚠️ İki səbəb (hesab yoxdur / şifrə " +
        "səhvdir) QƏSDƏN ayırd edilmir.",
    ),
  },
});

path({
  method: "post",
  path: "/api/v1/auth/logout",
  operationId: "logout",
  tags: ["Auth"],
  summary: "Sessiyanı bağlayır",
  description:
    "Sessiya kukisini silir. Cavab gövdəsi yoxdur (204).\n\n" +
    "⚠️ Boş JSON gövdəsi (`{}`) göndərilir: `Content-Type: application/json` " +
    "tələbi login ilə eynidir (CSRF müdafiəsi).",
  security: SECURED,
  request: {
    body: { required: false, content: { [JSON_MEDIA]: { schema: LogoutBodySchema } } },
  },
  responses: {
    204: { description: "Sessiya bağlandı — gövdə yoxdur." },
    415: UNSUPPORTED_415,
    ...commonResponses(),
  },
});

path({
  method: "get",
  path: "/api/v1/auth/session",
  operationId: "getSession",
  tags: ["Auth"],
  summary: "Cari sessiyanı qaytarır",
  description:
    "Anonim sorğuda **200 + `data: null`** qaytarılır, 401 YOX: «kim mənəm?» " +
    "sualının cavabı «heç kim»dir və bu, xəta deyil. 401 qaytarsaydıq " +
    "müştəri anonim vəziyyəti xətadan ayırd edə bilməzdi.\n\n" +
    "⚠️ Cavabda `passwordHash` və digər həssas sahə YOXDUR.",
  security: SECURED,
  responses: {
    200: jsonResponse(
      "Sessiya məlumatı və ya `null`.",
      envelope(NullableSessionSchema, "SessionResponse"),
    ),
    ...commonResponses({ isPublic: true }),
  },
});

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

path({
  method: "get",
  path: "/api/v1/health",
  operationId: "getHealth",
  tags: ["System"],
  summary: "Sağlamlıq yoxlaması",
  description: "DB-yə TOXUNMUR — yalnız prosesin cavab verdiyini bildirir.",
  responses: {
    200: jsonResponse("Xidmət işləyir.", envelope(HealthSchema, "HealthResponse")),
    ...commonResponses({ isPublic: true }),
  },
});

// ---------------------------------------------------------------------------
// Public — redaksiya məzmunu
// ---------------------------------------------------------------------------

path({
  method: "get",
  path: "/api/v1/faculties",
  operationId: "listFaculties",
  tags: ["Public"],
  summary: "Fakültə və ixtisas kataloqu",
  description:
    "Qeydiyyat formasının işlətdiyi EYNİ kataloq " +
    "(`academic.service.ts` → `listRegistrationCatalog`).\n\n" +
    "⚠️ Yalnız sinif səhifəsi AÇILMIŞ ixtisas/il cütləri gəlir — seçilə bilən, " +
    "amma sinfi olmayan variant qeydiyyatı çıxılmaz vəziyyətə salardı.",
  responses: {
    200: jsonResponse(
      "Fakültə → ixtisas → qəbul ili kataloqu.",
      listEnvelope(FacultyCatalogSchema, "FacultyListResponse"),
    ),
    ...commonResponses({ isPublic: true }),
  },
});

path({
  method: "get",
  path: "/api/v1/content/pages",
  operationId: "listContentPages",
  tags: ["Public"],
  summary: "Dərc olunmuş redaksiya səhifələri",
  description:
    "Yalnız `isPublished = true` səhifələr. Qaralama heç kimə göstərilmir.\n\n" +
    "⚠️ Markdown gövdəsi (`body`) QƏSDƏN qaytarılmır — kart siyahısı üçün " +
    "lazım deyil və səhifə başına bir neçə KB deməkdir.",
  request: {
    query: z.object({
      section: z.enum(CONTENT_SECTION_VALUES).openapi({
        param: {
          name: "section",
          in: "query",
          required: true,
          description: "Bölmə. MƏCBURİDİR — bütün səhifələri birdən qaytarmırıq.",
        },
        example: "UNIVERSITY",
      }),
    }),
  },
  responses: {
    200: jsonResponse(
      "Bölmənin səhifələri (redaksiya sırası ilə).",
      listEnvelope(ContentPageSchema, "ContentPageListResponse"),
    ),
    ...commonResponses({ isPublic: true }),
  },
});

path({
  method: "get",
  path: "/api/v1/faq",
  operationId: "listFaq",
  tags: ["Public"],
  summary: "Tez-tez verilən suallar",
  description: "Dərc olunmuş suallar; kateqoriya ilə süzülə bilər.",
  request: {
    query: z.object({
      category: z
        .enum(FAQ_CATEGORY_VALUES)
        .optional()
        .openapi({
          param: {
            name: "category",
            in: "query",
            required: false,
            description: "Sual kateqoriyası. Verilməzsə hamısı qaytarılır.",
          },
        }),
    }),
  },
  responses: {
    200: jsonResponse("Suallar.", listEnvelope(FaqSchema, "FaqListResponse")),
    ...commonResponses({ isPublic: true }),
  },
});

path({
  method: "get",
  path: "/api/v1/guide-places",
  operationId: "listGuidePlaces",
  tags: ["Public"],
  summary: "Xankəndi bələdçisi yazıları",
  description:
    "Şəhər bələdçisi (spec §3), 11 kateqoriya. Təcili əlaqələr (`isEmergency`) " +
    "siyahının başındadır.\n\n" +
    "⚠️ `address` / `latitude` / `longitude` BURADA var və bu, məxfilik " +
    "pozuntusu deyil: söhbət şəhərin İCTİMAİ obyektlərindən gedir " +
    "(aptek, market, dayanacaq), istifadəçi məkanından yox.",
  request: {
    query: z.object({
      category: z
        .enum(GUIDE_CATEGORY_VALUES)
        .optional()
        .openapi({
          param: {
            name: "category",
            in: "query",
            required: false,
            description: "Bələdçi kateqoriyası (11 dəyər).",
          },
          example: "TRANSPORT",
        }),
    }),
  },
  responses: {
    200: jsonResponse(
      "Bələdçi yazıları.",
      listEnvelope(GuidePlaceSchema, "GuidePlaceListResponse"),
    ),
    ...commonResponses({ isPublic: true }),
  },
});

path({
  method: "get",
  path: "/api/v1/guide-places/{id}/memories",
  operationId: "listGuidePlaceMemories",
  tags: ["Public"],
  summary: "Məkanla bağlı xatirələr",
  description:
    "«Sevimli yer» xatirələri — Share Memories [M9] ilə Xankəndi bələdçisi [M3] " +
    "arasındaki körpü.\n\n" +
    "🔴 Endpoint anonim sorğuya AÇIQDIR (bələdçi ictimaidir), amma cavab " +
    "`activeVisibleWhere` süzgəcindən keçir: anonim ziyarətçi YALNIZ `PUBLIC` " +
    "xatirələri görür. Məkan filtri məxfilik filtrinin ƏVƏZİ deyil, ÜSTƏLİYİDİR " +
    "— əks halda `CLASS` xatirə ictimai səhifə üzərindən sızardı.\n\n" +
    "⚠️ Naməlum `id` 404 VERMİR — boş siyahı qaytarır.",
  request: {
    params: z.object({
      id: pathField(z.string(), "Bələdçi məkanının `id`-si (`GET /guide-places`)."),
    }),
  },
  responses: {
    200: jsonResponse(
      "Məkana bağlı, viewer-ə görünən xatirələr.",
      listEnvelope(PlaceMemorySchema, "PlaceMemoryListResponse"),
    ),
    ...commonResponses({ isPublic: true }),
  },
});

// ---------------------------------------------------------------------------
// Cohorts
// ---------------------------------------------------------------------------

path({
  method: "get",
  path: "/api/v1/cohorts",
  operationId: "listMyCohorts",
  tags: ["Cohorts"],
  summary: "Viewer-in sinifləri",
  description:
    "Giriş etmiş istifadəçinin ÜZV OLDUĞU siniflər — əsas sinif (`isPrimary`) " +
    "birincidir. Digər siniflərin siyahısı BURADAN alınmır.",
  security: SECURED,
  responses: {
    200: jsonResponse(
      "Üzv olunan siniflər.",
      listEnvelope(ViewerCohortSchema, "ViewerCohortListResponse"),
    ),
    ...commonResponses(),
  },
});

path({
  method: "get",
  path: "/api/v1/cohorts/{slug}",
  operationId: "getCohort",
  tags: ["Cohorts"],
  summary: "Sinif başlığı",
  description:
    "Sinfin kataloq məlumatı: ad, illər, fakültə/ixtisas, mərhələ və üzv SAYI.\n\n" +
    "⚠️ `stage` `User.stage` keşindən DEYİL, cohort tarixlərindən hesablanır.",
  security: SECURED,
  request: { params: SlugParams },
  responses: {
    200: jsonResponse(
      "Sinif başlığı.",
      envelope(CohortHeaderSchema, "CohortHeaderResponse"),
    ),
    ...commonResponses(),
  },
});

path({
  method: "get",
  path: "/api/v1/cohorts/{slug}/members",
  operationId: "listCohortMembers",
  tags: ["Cohorts"],
  summary: "Sinif kataloqu (13 filtr)",
  description:
    "Spec §8-in 13 filtri query parametri kimi. Filtrlərin adları UI ilə " +
    "EYNİ mənbədən (`lib/directory-filters.ts`) gəlir, yəni paylaşılan URL " +
    "hər iki səthdə eyni nəticə verir.\n\n" +
    "🔴 Hər sətir `redactProfile`-dan keçir: görünməyən sahə obyektdə " +
    "ÜMUMİYYƏTLƏ olmur (null da yox).\n\n" +
    "🔴 Gizlədilmiş sahəyə görə FİLTRLƏMƏ də bloklanır — `?city=Bakı` filtri " +
    "`currentCity`-ni gizlədən istifadəçini nəticəyə salmır, əks halda dəyər " +
    "kartda görünməsə də ÖYRƏNİLƏRDİ (T17).",
  security: SECURED,
  request: { params: SlugParams, query: DirectoryQuery },
  responses: {
    200: jsonResponse(
      "Kataloq səhifəsi. `meta.total` filtrdən keçmiş ümumi sayı bildirir.",
      listEnvelope(DirectoryEntrySchema, "DirectoryListResponse"),
    ),
    ...commonResponses(),
  },
});

path({
  method: "get",
  path: "/api/v1/cohorts/{slug}/posts",
  operationId: "listCohortPosts",
  tags: ["Cohorts"],
  summary: "Sinif lenti (kursor səhifələməsi)",
  description:
    "Lentin kursor əsaslı səhifələməsi — `meta.nextCursor` növbəti səhifə " +
    "üçün `?cursor=` dəyəridir, `null` olarsa məlumat bitib.\n\n" +
    "🔴 `CLASS` paylaşımlar YALNIZ həmin sinfin üzvünə görünür; anonim və " +
    "başqa sinif üzvü onları GÖRMÜR (`activeVisibleWhere`).",
  security: SECURED,
  request: { params: SlugParams, query: PostsQuery },
  responses: {
    200: jsonResponse(
      "Lent səhifəsi.",
      listEnvelope(FeedPostSchema, "FeedPostListResponse"),
    ),
    ...commonResponses(),
  },
});

path({
  method: "get",
  path: "/api/v1/cohorts/{slug}/timeline",
  operationId: "listCohortTimeline",
  tags: ["Cohorts"],
  summary: "Sinif xronologiyası (3 filtr)",
  description:
    "Xronologiya TÖRƏMƏDİR — paylaşım, nailiyyət, tədbir və sistem " +
    "milestone-larından yaranır. Görünürlük MƏNBƏDƏN kopyalanır və ondan daha " +
    "açıq ola bilməz.",
  security: SECURED,
  request: { params: SlugParams, query: TimelineQuery },
  responses: {
    200: jsonResponse(
      "Xronologiya səhifəsi.",
      listEnvelope(TimelineItemSchema, "TimelineListResponse"),
    ),
    ...commonResponses(),
  },
});

path({
  method: "get",
  path: "/api/v1/cohorts/{slug}/achievements",
  operationId: "listCohortAchievements",
  tags: ["Cohorts"],
  summary: "Sinif nailiyyətləri",
  description:
    "Başqalarının nailiyyətlərindən yalnız `VERIFIED` / `FEATURED` görünür; " +
    "sahib özü `SUBMITTED` qeydini də görür.\n\n" +
    "⚠️ Bu, MODERASİYA NÖVBƏSİ DEYİL — moderator başqasının `SUBMITTED` " +
    "qeydini burada görmür (ayrı axın, `listModerationQueue`).",
  security: SECURED,
  request: { params: SlugParams, query: AchievementQuery },
  responses: {
    200: jsonResponse(
      "Nailiyyət səhifəsi.",
      listEnvelope(AchievementSchema, "AchievementListResponse"),
    ),
    ...commonResponses(),
  },
});

path({
  method: "get",
  path: "/api/v1/cohorts/{slug}/memories",
  operationId: "listCohortMemories",
  tags: ["Cohorts"],
  summary: "Sinif xatirələri (növ + məkan filtri)",
  description:
    "Share Memories [M9] — spec §11-in 8 növü.\n\n" +
    "🔴 Xatirənin DÖRD göstərilmə seçimi (`showInProfile` / `showInFeed` / " +
    "`showInTimeline` / `showInYearbook`) görünürlük SƏVİYYƏSİNDƏN fərqlidir: " +
    "səviyyə «kim görə bilər», bayraqlar «harada göstərilir» sualına cavab " +
    "verir. Bu endpoint bayraqlardan ASILI DEYİL — sinfin bütün görünən " +
    "xatirələrini qaytarır.\n\n" +
    "⚠️ `showInTimeline` yalnız `showInFeed` açıq olduqda `true` ola bilər: " +
    "`TimelineEntry`-də Memory-yə FK yoxdur, xatirə xronologiyaya ANCAQ bağlı " +
    "Post vasitəsilə düşür.",
  security: SECURED,
  request: { params: SlugParams, query: MemoryQuery },
  responses: {
    200: jsonResponse(
      "Xatirə səhifəsi. `meta.total` filtrdən keçmiş ümumi sayı bildirir.",
      listEnvelope(MemorySchema, "MemoryListResponse"),
    ),
    ...commonResponses(),
  },
});

path({
  method: "get",
  path: "/api/v1/cohorts/{slug}/yearbook",
  operationId: "listCohortYearbook",
  tags: ["Cohorts"],
  summary: "Digital Yearbook",
  description:
    "Albom üçün seçilmiş xatirələr — İKİ şərt birlikdə: görünürlük " +
    "(`activeVisibleWhere`) VƏ müəllifin `showInYearbook` seçimi. Biri digərini " +
    "əvəz etmir: `PRIVATE` xatirə albom üçün işarələnsə də yalnız sahibinə " +
    "görünür.\n\n" +
    "Hər qeydin `section` sahəsi var: `MOMENT` (yaddaqalan an) · `LESSON` " +
    "(unudulmaz dərs) · `PLACE` (sevimli yer) · `STORY` · `CLOSING` (sitat " +
    "divarı). 🔴 `PLACE` NÖVDƏN ASILI DEYİL — `guidePlaceId` doludursa qeyd " +
    "həmişə oraya düşür və BİR qeyd yalnız BİR bölmədə olur.",
  security: SECURED,
  request: { params: SlugParams },
  responses: {
    200: jsonResponse(
      "Albom qeydləri (xronoloji: köhnədən yeniyə).",
      listEnvelope(YearbookEntrySchema, "YearbookListResponse"),
    ),
    ...commonResponses(),
  },
});

path({
  method: "get",
  path: "/api/v1/cohorts/{slug}/support",
  operationId: "listCohortSupportOffers",
  tags: ["Cohorts"],
  summary: "Dəstək təklifləri (7 növ)",
  description:
    "Spec §9 — məzunların təklif etdiyi dəstək: qonaq mühazirəsi, karyera " +
    "söhbəti, təcrübə, iş elanı paylaşımı, mentorluq, startap əməkdaşlığı, " +
    "tədbirdə iştirak.\n\n" +
    "🔴 QAPI `User.openToSupport`-dur — ÜÇÜNCÜ və MÜSTƏQİL razılıq. " +
    "`visibility` (kim görə bilər) və `includeInStats` (aqreqasiya razılığı) " +
    "ilə qarışdırılmamalıdır; `SupportOffer` sətrində `visibility` sütunu " +
    "YOXDUR.\n\n" +
    "🔴 Cavabda `phone` / `personalEmail` YOXDUR — onlar default `PRIVATE`-dır. " +
    "Əlaqə üçün istifadəçi profilinə keçid nəzərdə tutulub.",
  security: SECURED,
  request: { params: SlugParams },
  responses: {
    200: jsonResponse(
      "Təkliflər — hər sətir bir istifadəçi + bir növ.",
      listEnvelope(SupportOfferEntrySchema, "SupportOfferListResponse"),
    ),
    ...commonResponses(),
  },
});

path({
  method: "get",
  path: "/api/v1/cohorts/{slug}/stats/where-are-we-now",
  operationId: "getCohortWhereAreWeNow",
  tags: ["Cohorts"],
  summary: "«İndi haradayıq?» aqreqasiyası",
  description:
    "Spec §13 [M11] — məzunların yer, işəgötürən, sektor, vəzifə istiqaməti və " +
    "təhsil pilləsi üzrə bölgüsü.\n\n" +
    "🔴 ÜÇ MÜSTƏQİL SÜZGƏC: (1) görünürlük — `visibilityWhereForUserOwned`; " +
    "(2) AYRICA aqreqasiya razılığı — `includeInStats` (görünürlük səviyyəsi " +
    "KİFAYƏT DEYİL); (3) k-anonimlik — 3 nəfərdən kiçik xana açıqlanmır.\n\n" +
    "🔴 BÜTÜN ÖLÇÜLƏR TƏK DATASET ÜZƏRİNDƏ, TƏK KEÇİDDƏ hesablanır və hər ölçü " +
    "sətirlərin HAMISINI örtür: `Σ visible[].count + undisclosedCount + " +
    "unknownCount = respondentCount`. Yəni iki xananı çıxıb qalıq (deməli fərd) " +
    "almaq mümkün deyil — ölçülər arası kəsişmə qapalıdır.\n\n" +
    "🔴 YER ESKALASİYASI: şəhər xanası 3-dən kiçikdirsə sətir ÖLKƏ səviyyəsinə " +
    "yığılır; ölkə də kiçikdirsə tamamilə açıqlanmır. Sətir heç bir halda İTMİR.\n\n" +
    "⚠️ CAVABDA ƏMƏK HAQQI SAHƏSİ YOXDUR və bu, QƏSDƏN qərardır: 14-28 nəfərlik " +
    "sinifdə aqreqasiya olunmuş maaş belə fərdiləşdirilə bilər. Sxem " +
    "`additionalProperties: false`-dur, yəni sənəd bunu SÜBUT edir.\n\n" +
    "⚠️ `mapPins[].lat` / `lon` ŞƏHƏR MƏRKƏZLƏRİDİR (`lib/geo.ts` statik " +
    "cədvəli). `CareerEntry`-də koordinat sütunu YOXDUR — istifadəçinin dəqiq " +
    "yeri nə saxlanılır, nə qaytarılır.\n\n" +
    "⚠️ Anonim sorğu üçün MÖVCUD DEYİL (401): bu, sinif daxili analitikadır. " +
    "Cavab `Cache-Control: private, no-store` ilə gəlir — viewer-dən asılı " +
    "nəticə ortaq keşdə saxlanıla bilməz.",
  security: SECURED,
  request: { params: SlugParams },
  responses: {
    200: jsonResponse(
      "Aqreqasiya nəticəsi — səkkiz xana + razılıq şəffaflığı sayğacları.",
      envelope(WhereAreWeNowSchema, "WhereAreWeNowResponse"),
    ),
    ...commonResponses(),
  },
});

path({
  method: "get",
  path: "/api/v1/cohorts/{slug}/events",
  operationId: "listCohortEvents",
  tags: ["Events"],
  summary: "Sinif tədbirləri (6 filtr)",
  description:
    "Spec §15-in altı filtri. Sinfin GÖRDÜYÜ tədbirlər qaytarılır: həmin " +
    "sinfin öz tədbirləri VƏ universitet / fakültə / klub səviyyəli tədbirlər " +
    "(`cohortId = null`).\n\n" +
    "⚠️ Auditoriya süzgəci məxfilik süzgəci DEYİL — görünürlük yenə " +
    "`visibleWithStatus` ilə ayrıca tətbiq olunur.",
  security: SECURED,
  request: { params: SlugParams, query: EventQuery },
  responses: {
    200: jsonResponse(
      "Tədbir səhifəsi.",
      listEnvelope(EventSchema, "EventListResponse"),
    ),
    ...commonResponses(),
  },
});

path({
  method: "get",
  path: "/api/v1/events/{id}",
  operationId: "getEvent",
  tags: ["Events"],
  summary: "Tədbir detalı",
  description:
    "Tək tədbir. Görünmürsə 404 — «var, amma sənə yox» cavabı verilmir.\n\n" +
    "⚠️ İctimai (`PUBLIC`) tədbir anonim sorğuya da qaytarılır.",
  request: { params: EventIdParams },
  responses: {
    200: jsonResponse("Tədbir.", envelope(EventSchema, "EventResponse")),
    ...commonResponses({ isPublic: true }),
  },
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

path({
  method: "get",
  path: "/api/v1/search",
  operationId: "search",
  tags: ["Search"],
  summary: "Qlobal axtarış",
  description:
    "Dörd növ üzrə paralel axtarış: istifadəçi, paylaşım, tədbir, nailiyyət. " +
    "Hər növ ÖZ görünürlük köməkçisindən keçir — axtarış yalnız ƏLAVƏ mətn " +
    "şərtidir, məxfilik təkrar qurulmur.\n\n" +
    `⚠️ Sorğu ən azı ${MIN_SEARCH_LENGTH} simvol olmalıdır (bir hərf bütün ` +
    "bazanı gətirər).\n\n" +
    "⚠️ Anonim sorğuda istifadəçi bölməsi HƏMİŞƏ boşdur — üzv siyahısı sinif " +
    "daxili məlumatdır.",
  security: SECURED,
  request: { query: SearchQuery },
  responses: {
    200: jsonResponse(
      "Növ üzrə qruplaşdırılmış nəticələr.",
      envelope(SearchResultsSchema, "SearchResponse"),
    ),
    ...commonResponses({ isPublic: true }),
  },
});

// ---------------------------------------------------------------------------
// Notifications (Blok 11A, spec §15)
// ---------------------------------------------------------------------------

path({
  method: "get",
  path: "/api/v1/notifications",
  operationId: "listNotifications",
  tags: ["Notifications"],
  summary: "Öz bildirişlərim",
  description:
    "🔴 CAVAB HƏMİŞƏ YALNIZ SORĞUNU EDƏNİN bildirişləridir. Şərt " +
    "(`recipientId = viewer.userId`) servis qatındadır və `recipientId` " +
    "parametri QƏBUL EDİLMİR — «başqasının bildirişlərini gör» sorğusu ifadə " +
    "edilə bilmir.\n\n" +
    "⚠️ Bu qapı `visibilityWhere` DEYİL: bildirişin görünürlük səviyyəsi yoxdur, " +
    "o, bir nəfərə ünvanlanmış mesajdır. Ona görə anonim sorğu boş siyahı deyil, " +
    "**401** alır.\n\n" +
    "⚠️ Filtr adları veb interfeysi ilə eynidir (`status` · `type` · `page`), " +
    "yəni eyni URL hər iki səthdə eyni nəticəni verir.",
  security: SECURED,
  request: { query: NotificationQuery },
  responses: {
    200: jsonResponse(
      "Bildirişlər (yenidən köhnəyə) + `meta.total`.",
      listEnvelope(NotificationSchema, "NotificationListResponse"),
    ),
    ...commonResponses(),
  },
});

path({
  method: "post",
  path: "/api/v1/notifications/{id}/read",
  operationId: "markNotificationRead",
  tags: ["Notifications"],
  summary: "Bildirişi oxunmuş işarələ",
  description:
    "🔴 Başqasının bildirişi ilə **404** qaytarılır — «yoxdur» və «sənin deyil» " +
    "QƏSDƏN ayırd edilmir (mövcudluq faktı da məlumatdır). Əməliyyat " +
    "`updateMany` ilə icra olunur, yəni sahiblik şərti `where`-dədir.\n\n" +
    "⚠️ Artıq oxunmuş bildirişdə `readAt` DƏYİŞMİR (cavab yenə 404-dür): " +
    "siyahını iki dəfə açmaq vaxt möhürünü sürüşdürməməlidir.\n\n" +
    "⚠️ Gövdə oxunmur, amma `Content-Type: application/json` MƏCBURİDİR — " +
    "brauzer `<form>`-u JSON göndərə bilmir, yəni cross-site POST kəsilir.",
  security: SECURED,
  request: {
    params: z.object({
      id: pathField(z.string(), "Bildirişin `id`-si (`GET /notifications`)."),
    }),
    body: {
      required: false,
      content: { [JSON_MEDIA]: { schema: LogoutBodySchema } },
    },
  },
  responses: {
    200: jsonResponse(
      "İşarələndi.",
      envelope(NotificationReadResultSchema, "NotificationReadResponse"),
    ),
    ...commonResponses(),
    415: UNSUPPORTED_415,
  },
});

path({
  method: "post",
  path: "/api/v1/notifications/read-all",
  operationId: "markAllNotificationsRead",
  tags: ["Notifications"],
  summary: "Hamısını oxunmuş işarələ",
  description:
    "Yalnız SORĞUNU EDƏNİN oxunmamış bildirişləri işarələnir.\n\n" +
    "⚠️ `changed: 0` XƏTA DEYİL — oxunmamış bildiriş yox idi.\n\n" +
    "⚠️ Yol `/{id}/read` ilə TOQQUŞMUR: Next.js statik seqmenti dinamikdən " +
    "üstün tutur, yəni `read-all` heç vaxt `id` kimi oxunmur.",
  security: SECURED,
  request: {
    body: {
      required: false,
      content: { [JSON_MEDIA]: { schema: LogoutBodySchema } },
    },
  },
  responses: {
    200: jsonResponse(
      "İşarələnmiş sətir sayı.",
      envelope(NotificationReadResultSchema, "NotificationReadAllResponse"),
    ),
    ...commonResponses(),
    415: UNSUPPORTED_415,
  },
});

// ---------------------------------------------------------------------------
// Public — tək resurs endpoint-ləri (Blok 11A)
// ---------------------------------------------------------------------------

path({
  method: "get",
  path: "/api/v1/content/pages/{slug}",
  operationId: "getContentPage",
  tags: ["Public"],
  summary: "Tam redaksiya səhifəsi",
  description:
    "Siyahı endpoint-indən FƏRQİ: cavabda Markdown `body` VAR.\n\n" +
    "🔴 Yalnız `isPublished = true` səhifə qaytarılır — qaralama HEÇ KİMƏ " +
    "göstərilmir və bunu dəyişən parametr YOXDUR.\n\n" +
    "⚠️ `body` Markdown-dur; müştəri onu HTML kimi YERİTMƏMƏLİDİR.",
  request: {
    params: z.object({
      slug: pathField(
        z.string().openapi({ example: "haqqimizda" }),
        "Səhifənin `slug`-ı (`GET /content/pages?section=…` cavabından).",
      ),
    }),
  },
  responses: {
    200: jsonResponse(
      "Səhifə (Markdown gövdə ilə).",
      envelope(ContentPageDetailSchema, "ContentPageDetailResponse"),
    ),
    ...commonResponses({ isPublic: true }),
  },
});

path({
  method: "get",
  path: "/api/v1/guide-places/{id}",
  operationId: "getGuidePlace",
  tags: ["Public"],
  summary: "Tək bələdçi məkanı",
  description:
    "⚠️ Naməlum `id` BURADA 404 verir, `…/memories` isə boş siyahı qaytarır — " +
    "uyğunsuzluq deyil: burada resursun ÖZÜ istənilir, orada həmin məkana bağlı " +
    "SİYAHI.\n\n" +
    "⚠️ `address` / `latitude` / `longitude` cavabdadır və bu, məxfilik " +
    "pozuntusu deyil: söhbət şəhərin İCTİMAİ obyektindən gedir (aptek, " +
    "dayanacaq), istifadəçi məkanından yox.",
  request: {
    params: z.object({
      id: pathField(z.string(), "Məkanın `id`-si (`GET /guide-places`)."),
    }),
  },
  responses: {
    200: jsonResponse(
      "Bələdçi məkanı.",
      envelope(GuidePlaceSchema, "GuidePlaceResponse"),
    ),
    ...commonResponses({ isPublic: true }),
  },
});

// ---------------------------------------------------------------------------
// Admin (Blok 11B, spec §17)
//
// 🔴 Hamısı `withAdmin` qapısındadır və qapı rolu TOKEN-dən deyil, BAZADAN
// oxuyur (TƏLƏ B). Cavab 403-dür, 404 deyil: admin səthində resursun
// mövcudluğu sirr deyil (404 qaydası GÖRÜNÜRLÜK qapısına aiddir).
// ---------------------------------------------------------------------------

/** Admin siyahılarının ortaq səhifə parametri. */
const adminPageQuery = {
  page: queryField(
    z.string().openapi({ example: "1" }),
    "Səhifə nömrəsi (1-dən). Etibarsız dəyər SƏSSİZCƏ 1-ə düşür.",
  ),
};

path({
  method: "get",
  path: "/api/v1/admin/stats",
  operationId: "getAdminStats",
  tags: ["Admin"],
  summary: "İdarə panelinin rəqəmləri",
  description:
    "Universitet miqyaslı struktur saylar + son 12 həftənin AQREQAT seriyası.\n\n" +
    "🔴 **Şəxsə bağlı sıralama YOXDUR.** «Ən aktiv istifadəçilər» kimi lider " +
    "cədvəli qəsdən yaradılmayıb: istifadəçi `CLASS` səviyyəli paylaşım edərkən " +
    "adının universitet miqyaslı bir cədvəldə görünməsinə razılıq verməyib. " +
    "Seriya sorğusu `authorId` belə seçmir.",
  security: SECURED,
  responses: {
    200: jsonResponse(
      "Panel rəqəmləri.",
      envelope(AdminStatsSchema, "AdminStatsResponse"),
    ),
    ...commonResponses(),
  },
});

path({
  method: "get",
  path: "/api/v1/admin/reports",
  operationId: "listAdminReports",
  tags: ["Admin"],
  summary: "Şikayət növbəsi",
  description:
    "🔴 **CAVABDA ŞİKAYƏT OLUNAN MƏZMUN YOXDUR.** Sətir yalnız şikayətin " +
    "özünü (səbəb, şikayətçinin mətni, tarix) və hədəfin MODERASİYA " +
    "KONTEKSTİNİ (növ, `id`, görünürlük səviyyəsi, status) daşıyır. Servis " +
    "hədəfin `title` / `body` sahələrini SORĞULAMIR.\n\n" +
    "Məzmuna çıxış yalnız veb interfeysindəki «moderasiya baxışı» " +
    "axınındadır və o, AuditLog sətrini eyni transaksiyada ƏVVƏLCƏ yazır. " +
    "Endpoint kimi açılmayıb — toplu avtomatlaşdırılmış oxu audit izini " +
    "praktikada mənasız edərdi.\n\n" +
    "⚠️ `ACCESSIBILITY` növündə `entityId` sətir ID-si DEYİL, SƏHİFƏ YOLUDUR.",
  security: SECURED,
  request: {
    query: z.object({
      st: queryField(
        z.enum(REPORT_STATUS_VALUES),
        "Status filtri (`OPEN` · `IN_REVIEW` · `RESOLVED` · `REJECTED`).",
      ),
      et: queryField(
        z.enum(REPORT_ENTITY_TYPE_VALUES),
        "Şikayət olunan obyektin növü.",
      ),
      rs: queryField(z.enum(REPORT_REASON_VALUES), "Şikayət səbəbi."),
      ...adminPageQuery,
    }),
  },
  responses: {
    200: jsonResponse(
      "Şikayət sətirləri (məzmunsuz).",
      listEnvelope(AdminReportSchema, "AdminReportListResponse"),
    ),
    ...commonResponses(),
  },
});

path({
  method: "post",
  path: "/api/v1/admin/reports/{id}/resolve",
  operationId: "resolveAdminReport",
  tags: ["Admin"],
  summary: "Şikayət üzrə qərar",
  description:
    "TƏK TRANSAKSİYA: `Report.status` + AuditLog + şikayətçiyə Notification.\n\n" +
    "⚠️ `RESOLVED` və `REJECTED` üçün `resolution` MƏCBURİDİR — şikayətçiyə " +
    "səbəbsiz cavab getməməlidir və jurnalı sonradan oxuyan adam qərarın " +
    "niyəsini görməlidir.\n\n" +
    "⚠️ Bağlanmış şikayət yenidən açılmır (422): status tarixçəsi yalnız bir " +
    "istiqamətdə gedir.\n\n" +
    "⚠️ `Content-Type: application/json` MƏCBURİDİR — brauzer `<form>`-u JSON " +
    "göndərə bilmir, yəni cross-site POST kəsilir.",
  security: SECURED,
  request: {
    params: z.object({
      id: pathField(z.string(), "Şikayətin `id`-si (`GET /admin/reports`)."),
    }),
    body: {
      required: true,
      content: { [JSON_MEDIA]: { schema: AdminResolveBodySchema } },
    },
  },
  responses: {
    200: jsonResponse(
      "Qərar yazıldı.",
      envelope(AdminResolveResultSchema, "AdminResolveResponse"),
    ),
    ...commonResponses(),
    415: UNSUPPORTED_415,
  },
});

path({
  method: "get",
  path: "/api/v1/admin/audit",
  operationId: "listAdminAudit",
  tags: ["Admin"],
  summary: "Audit jurnalı",
  description:
    "🔴 **JURNAL YALNIZ ƏLAVƏ OLUNUR.** Bu yol üçün `POST` / `PATCH` / " +
    "`DELETE` əməliyyatı YOXDUR və olmayacaq: silinə bilən audit auditin " +
    "özünü mənasız edərdi. Qadağa üç qatdadır — servis silmə/redaktə funksiyası " +
    "ixrac etmir, `/admin/audit` səhifəsində düymə yoxdur, route handler-də " +
    "yalnız `GET` var.\n\n" +
    "⚠️ `metadata` XAM JSON sətridir və AĞ SİYAHIDAN keçir: şikayət olunan " +
    "MƏZMUN oraya yazılmır (`PRIVATE` mətn jurnalda peyda olmamalıdır).",
  security: SECURED,
  request: {
    query: z.object({
      actor: queryField(z.string(), "Aktyorun `id`-si."),
      et: queryField(
        z.string(),
        "Obyekt növü. ⚠️ ENUM DEYİL — sətirlər model adlarını da daşıyır.",
      ),
      ac: queryField(z.enum(AUDIT_ACTION_VALUES), "Əməliyyat növü."),
      from: queryField(z.string().openapi({ example: "2026-01-01" }), "Tarixdən (daxil)."),
      to: queryField(
        z.string().openapi({ example: "2026-12-31" }),
        "Tarixə qədər (GÜNÜN SONU daxil).",
      ),
      ...adminPageQuery,
    }),
  },
  responses: {
    200: jsonResponse(
      "Audit sətirləri.",
      listEnvelope(AdminAuditSchema, "AdminAuditListResponse"),
    ),
    ...commonResponses(),
  },
});

path({
  method: "get",
  path: "/api/v1/admin/users",
  operationId: "listAdminUsers",
  tags: ["Admin"],
  summary: "İstifadəçi cədvəli",
  description:
    "🔴 **CAVAB `redactProfile`-DAN KEÇİR.** Admin olmaq `PRIVATE` sahəni " +
    "görmək demək deyil: `currentCity` istifadəçinin görünürlük seçimindən " +
    "asılıdır və gizlidirsə `null` gəlir. `phone` / `personalEmail` " +
    "ÜMUMİYYƏTLƏ sorğulanmır.\n\n" +
    "⚠️ YAZMA ƏMƏLİYYATI YOXDUR: rol dəyişikliyi və deaktivasiya «son admin» / " +
    "«özünü endirmə» qorumaları ilə birlikdə gəlir və toplu skript üçün " +
    "nəzərdə tutulmayıb.\n\n" +
    "⚠️ `cohorts[].stage` cohort TARİXLƏRİNDƏN hesablanır, `User.stage` " +
    "keşindən yox.",
  security: SECURED,
  request: {
    query: z.object({
      q: queryField(z.string(), "Ad və ya e-poçt üzrə axtarış."),
      role: queryField(z.enum(SYSTEM_ROLE_VALUES), "Sistem rolu filtri."),
      stage: queryField(z.enum(USER_STAGE_VALUES), "Mərhələ filtri."),
      cohort: queryField(z.string(), "Sinfin `slug`-ı."),
      sort: queryField(
        z.enum(ADMIN_USER_SORTS),
        "Çeşidləmə: `name` · `email` · `recent` · `stage`.",
      ),
      ...adminPageQuery,
    }),
  },
  responses: {
    200: jsonResponse(
      "İstifadəçi sətirləri.",
      listEnvelope(AdminUserSchema, "AdminUserListResponse"),
    ),
    ...commonResponses(),
  },
});

// ---------------------------------------------------------------------------
// Sənədin generasiyası
// ---------------------------------------------------------------------------

/** `package.json` → `version`. Sənəddəki versiya əl ilə saxlanılmır. */
export const API_VERSION = pkg.version;

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "QU CLASS API",
      version: API_VERSION,
      description:
        "Qarabağ Universiteti sinif platformasının versiyalanmış REST səthi.\n\n" +
        "**Memarlıq qeydi.** UI Server Action-lar və Server Component-lər " +
        "işlədir; `/api/v1` isə XARİCİ inteqrasiya və sənədləşdirmə üçündür. " +
        "Məntiq DUBLİKAT DEYİL — hər ikisi EYNİ servis qatını (`src/services/*`) " +
        "çağırır və məxfilik mühərriki (`src/lib/visibility.ts`) tək yerdədir.\n\n" +
        "**Məxfilik.** Dörd səviyyə: `PUBLIC` › `UNIVERSITY` › `CLASS` › " +
        "`PRIVATE`. Süzgəc DB sorğusundadır (`visibilityWhere`), JS-də " +
        "filtrləmə qadağandır. İcazəsiz resurs üçün **404** qaytarılır, 403 " +
        "yox — mövcudluq faktı da məlumatdır.\n\n" +
        "**«Try it out» necə işləyir.** `POST /api/v1/auth/login` cavabında " +
        "sessiya kukisi qoyulur; səhifə `withCredentials: true` ilə işlədiyi " +
        "üçün sonrakı sorğular onu avtomatik göndərir.",
      contact: { name: "QU CLASS", url: "https://qu.edu.az" },
    },
    servers: [{ url: "/", description: "Cari host" }],
    tags: API_TAGS.map((tag) => ({ ...tag })),
  });
}
