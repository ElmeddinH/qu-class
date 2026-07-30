// ============================================================================
// src/lib/api/schemas.ts
// `/api/v1` müqaviləsi — SORĞU və CAVAB sxemləri.
//
// 🔴 SƏNƏD ƏL İLƏ YAZILMIR. `src/lib/api/openapi.ts` bu faylı oxuyur və OpenAPI
// komponentlərini Zod-dan TÖRƏDİR. Yəni sxem dəyişəndə (yeni enum dəyəri, yeni
// sahə, dəyişən mesaj) sənəd avtomatik dəyişir. Əl ilə yazılmış YAML bir həftədə
// koddan ayrılır və müdafiədə "sənəd köhnədir" cavabı verilməli olur.
//
// 🔴 ENUM-LAR TƏKRAR YAZILMIR: hər enum `src/lib/enums.ts`-dən import olunur
// (CLAUDE.md §6). Sənəddəki `enum:` siyahısı bu səbəbdən həmişə kodla eynidir.
//
// ⚠️ `extendZodWithOpenApi(z)` MƏHZ BURADA, sxem tərifindən ƏVVƏL çağırılır.
// Sonra çağırılsa `.openapi()` metodu mövcud olmaz (`zod-to-openapi` prototipi
// çalışma anında genişləndirir).
//
// ⚠️ Cavab obyektləri `.passthrough()`-dur (`additionalProperties: true`).
// Səbəb: `redactProfile` sahələri ÇIXIŞDAN SİLİR, yəni profil obyektinin
// forması viewer-dən viewer-ə dəyişir. Sxem "bu sahələr OLA BİLƏR" deyir,
// "yalnız bunlar var" DEMİR — əks halda sənəd yalan olardı.
// ============================================================================

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

import { MIN_ADMISSION_YEAR, UNIVERSITY_EMAIL_EXAMPLE } from "@/lib/constants";
import {
  ACHIEVEMENT_CATEGORY_VALUES,
  ACHIEVEMENT_STATUS_VALUES,
  CONTENT_SECTION_VALUES,
  COHORT_ROLE_VALUES,
  ContentSectionSchema,
  EVENT_CATEGORY_VALUES,
  EVENT_SCOPE_VALUES,
  EVENT_STATUS_VALUES,
  FAQ_CATEGORY_VALUES,
  FaqCategorySchema,
  GUIDE_CATEGORY_VALUES,
  GuideCategorySchema,
  MEMORY_TYPE_VALUES,
  POST_CATEGORY_VALUES,
  POST_KIND_VALUES,
  SUPPORT_OFFER_TYPE_VALUES,
  SYSTEM_ROLE_VALUES,
  TIMELINE_SOURCE_TYPE_VALUES,
  USER_STAGE_VALUES,
  VISIBILITY_VALUES,
} from "@/lib/enums";
import { MIN_SEARCH_LENGTH, PALETTE_LIMIT, SEARCH_PAGE_LIMIT } from "@/lib/search";
import { YEARBOOK_SECTIONS } from "@/lib/yearbook";
import {
  isValidAdmissionYear,
  loginSchema,
  maxAdmissionYear,
  passwordSchema,
  universityEmailSchema,
} from "@/features/auth/schemas";
import { API_ERROR_CODES } from "./errors";

export { z };

// ---------------------------------------------------------------------------
// Zərf və xəta
// ---------------------------------------------------------------------------

export const ApiMetaSchema = z
  .object({
    total: z.number().int().nonnegative().optional().openapi({
      description: "Filtrdən keçmiş ümumi say (səhifələmədən asılı deyil).",
      example: 24,
    }),
    nextCursor: z.string().nullable().optional().openapi({
      description: "Növbəti səhifənin kursoru; `null` olarsa daha məlumat yoxdur.",
    }),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().optional(),
  })
  .openapi("ApiMeta");

export const ApiErrorSchema = z
  .object({
    error: z.object({
      code: z.enum(API_ERROR_CODES).openapi({
        description: "Maşın oxuyan xəta kodu — mətnə görə qərar verməyin.",
        example: "UNAUTHENTICATED",
      }),
      message: z.string().openapi({
        description: "İstifadəçiyə göstərilə bilən azərbaycanca mesaj.",
        example: "Bu əməliyyat üçün daxil olmalısınız.",
      }),
      details: z
        .array(z.object({ path: z.string(), message: z.string() }))
        .optional()
        .openapi({ description: "Doğrulama xətaları (yalnız 422 cavabında)." }),
    }),
  })
  .openapi("ApiError");

/** `{ data: … }` zərfini qurur — hər cavab sxemi bundan keçir. */
export function envelope<S extends z.ZodTypeAny>(data: S, name?: string) {
  const schema = z.object({ data });
  return name ? schema.openapi(name) : schema;
}

/** `{ data: […], meta: { … } }` — siyahı cavabları. */
export function listEnvelope<S extends z.ZodTypeAny>(item: S, name?: string) {
  const schema = z.object({ data: z.array(item), meta: ApiMetaSchema });
  return name ? schema.openapi(name) : schema;
}

// ---------------------------------------------------------------------------
// Ortaq primitivlər
// ---------------------------------------------------------------------------

const idSchema = z.string().openapi({ description: "cuid", example: "clx1a2b3c4d5" });

const dateTimeSchema = z.string().openapi({
  format: "date-time",
  description: "ISO 8601 (JSON seriallaşdırması `Date` → sətir).",
  example: "2026-09-02T09:00:00.000Z",
});

const visibilitySchema = z.enum(VISIBILITY_VALUES).openapi({
  description:
    "Məxfilik səviyyəsi. Cavabda yalnız viewer-in GÖRDÜYÜ qeydlər olur — filtr " +
    "DB səviyyəsindədir (`visibilityWhere`), JS-də süzülmür.",
});

/**
 * `?take=` — bütün siyahı endpoint-lərində eyni məna.
 * Sətirdən ədədə çevirmə burada olur: query parametrləri həmişə sətirdir.
 */
function takeSchema(max: number, fallback: number) {
  return z
    .string()
    .optional()
    .transform((value) => (value === undefined || value === "" ? fallback : Number(value)))
    .refine((value) => Number.isInteger(value) && value >= 1 && value <= max, {
      message: `«take» 1 ilə ${max} arasında tam ədəd olmalıdır`,
    });
}

// ---------------------------------------------------------------------------
// Auth — sorğu gövdələri
// ---------------------------------------------------------------------------

/**
 * REST qeydiyyat gövdəsi.
 *
 * ⚠️ Doğrulama QAYDALARI təkrar yazılmır — `universityEmailSchema`,
 * `passwordSchema` və `isValidAdmissionYear` formanın işlətdiyi EYNİ
 * primitivlərdir (`src/features/auth/schemas.ts`). Yalnız FORMA fərqlidir:
 *   · `confirmPassword` yoxdur — o, İSTİFADƏÇİ SƏHVİNƏ qarşı UI tədbiridir,
 *     API müqaviləsi deyil (skript şifrəni iki dəfə yazmır).
 *   · `admissionYear` ƏDƏDDİR — `<Select>` sətir qaytardığı üçün formada sətir
 *     saxlanılır (bax həmin faylın şərhi), JSON-da isə ədəd təbiidir.
 */
export const RegisterBodySchema = z
  .object({
    firstName: z.string().trim().min(2).max(60).openapi({ example: "Aysel" }),
    lastName: z.string().trim().min(2).max(60).openapi({ example: "Məmmədova" }),
    email: universityEmailSchema.openapi({
      description: `Yalnız universitet domeni qəbul olunur.`,
      example: UNIVERSITY_EMAIL_EXAMPLE,
    }),
    password: passwordSchema.openapi({
      description: "Ən azı 8 simvol, bir hərf və bir rəqəm.",
      example: "Test1234!",
    }),
    programId: idSchema.openapi({
      description: "`GET /api/v1/faculties` cavabındaki ixtisas `id`-si.",
    }),
    admissionYear: z
      .number()
      .int()
      .refine((year) => isValidAdmissionYear(String(year)), {
        message: `Qəbul ili ${MIN_ADMISSION_YEAR} ilə ${maxAdmissionYear()} arasında olmalıdır`,
      })
      // ⚠️ Nümunə seed-dəki REAL qəbul ilidir. `maxAdmissionYear()` cari il + 1
      // olduğuna görə uydurma gələcək il (məs. 2030) sənəddəki nümunəni
      // «Try it out»-da dərhal 422-yə salardı.
      .openapi({ example: 2026 }),
  })
  .openapi("RegisterBody");

/** Giriş gövdəsi — formanın `loginSchema`-sı ilə EYNİ obyekt. */
export const LoginBodySchema = loginSchema
  .extend({
    email: loginSchema.shape.email.openapi({ example: "rep@qu.edu.az" }),
    password: loginSchema.shape.password.openapi({ example: "Test1234!" }),
  })
  .openapi("LoginBody");

/**
 * Çıxış gövdəsi — BOŞ obyekt, amma sxem QƏSDƏN elan olunur.
 *
 * Səbəb: `requireJson` bütün POST endpoint-lərində `Content-Type:
 * application/json` tələb edir (TƏLƏ B). Swagger UI həmin başlığı YALNIZ
 * `requestBody` elan olunanda göndərir — sxem olmasa "Try it out" 415 alardı.
 */
export const LogoutBodySchema = z.object({}).openapi("LogoutBody");

// ---------------------------------------------------------------------------
// Auth — cavablar
// ---------------------------------------------------------------------------

export const RegisteredUserSchema = z
  .object({
    userId: idSchema,
    email: z.string().openapi({ example: UNIVERSITY_EMAIL_EXAMPLE }),
    firstName: z.string(),
    lastName: z.string(),
    /** Qeydiyyatın bağlandığı sinif — istifadəçi dərhal `/class/{slug}`-a keçə bilir. */
    cohortSlug: z.string().openapi({ example: "komputer-muhendisliyi-2030" }),
  })
  .openapi("RegisteredUser");

/**
 * Sessiya cavabı.
 *
 * ⚠️ `passwordHash`, doğrulama detalı və digər həssas sahə BURADA YOXDUR
 * (TƏLƏ D). Cavab yalnız kimliyi və icazə səviyyəsini bildirir.
 */
export const SessionSchema = z
  .object({
    userId: idSchema,
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    systemRole: z.enum(SYSTEM_ROLE_VALUES),
    stage: z.enum(USER_STAGE_VALUES).openapi({
      description: "`User.stage` keşi — həqiqət mənbəyi cohort tarixləridir.",
    }),
    cohortIds: z.array(z.string()),
    /** `CLASS_MODERATOR` olduğu siniflər — moderasiya axını üçün. */
    moderatedCohortIds: z.array(z.string()),
  })
  .openapi("Session");

/** Anonim sorğuda `data: null` qaytarılır — 401 YOX (bax route şərhi). */
export const NullableSessionSchema = SessionSchema.nullable();

export const HealthSchema = z
  .object({
    status: z.literal("ok"),
    version: z.string().openapi({ example: "0.1.0" }),
    time: dateTimeSchema,
  })
  .openapi("Health");

// ---------------------------------------------------------------------------
// İctimai kataloq
// ---------------------------------------------------------------------------

export const FacultyCatalogSchema = z
  .object({
    id: idSchema,
    name: z.string().openapi({ example: "Mühəndislik fakültəsi" }),
    programs: z.array(
      z.object({
        id: idSchema,
        name: z.string().openapi({ example: "Kompüter mühəndisliyi" }),
        admissionYears: z.array(z.number().int()).openapi({
          description: "Sinif səhifəsi AÇILMIŞ qəbul illəri (azalan sırada).",
          example: [2030, 2027],
        }),
      }),
    ),
  })
  .openapi("Faculty");

export const StructureCountsSchema = z
  .object({
    faculties: z.number().int().nonnegative(),
    programs: z.number().int().nonnegative(),
    cohorts: z.number().int().nonnegative(),
  })
  .openapi("StructureCounts");

export const ContentPageSchema = z
  .object({
    id: idSchema,
    slug: z.string(),
    title: z.string(),
    excerpt: z.string().nullable(),
    coverUrl: z.string().nullable(),
    section: z.enum(CONTENT_SECTION_VALUES),
    updatedAt: dateTimeSchema,
  })
  .openapi("ContentPage");

export const FaqSchema = z
  .object({
    id: idSchema,
    question: z.string(),
    answer: z.string(),
    category: z.enum(FAQ_CATEGORY_VALUES),
    order: z.number().int(),
  })
  .openapi("Faq");

export const GuidePlaceSchema = z
  .object({
    id: idSchema,
    category: z.enum(GUIDE_CATEGORY_VALUES),
    title: z.string(),
    description: z.string(),
    address: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    imageUrl: z.string().nullable(),
    phone: z.string().nullable(),
    openingHours: z.string().nullable(),
    websiteUrl: z.string().nullable(),
    isEmergency: z.boolean(),
    order: z.number().int(),
  })
  .openapi("GuidePlace");

// ---------------------------------------------------------------------------
// Sinif
// ---------------------------------------------------------------------------

export const ViewerCohortSchema = z
  .object({
    id: idSchema,
    slug: z.string().openapi({ example: "informasiya-tehlukesizliyi-2027" }),
    displayName: z.string(),
    admissionYear: z.number().int(),
    graduationYear: z.number().int(),
    facultyName: z.string().nullable(),
    programName: z.string().nullable(),
    stage: z.enum(USER_STAGE_VALUES),
    role: z.enum(COHORT_ROLE_VALUES),
    isPrimary: z.boolean(),
  })
  .openapi("ViewerCohort");

export const CohortHeaderSchema = z
  .object({
    id: idSchema,
    slug: z.string(),
    displayName: z.string(),
    admissionYear: z.number().int(),
    graduationYear: z.number().int(),
    welcomeMessage: z.string().nullable(),
    coverUrl: z.string().nullable(),
    facultyName: z.string().nullable(),
    programName: z.string().nullable(),
    stage: z.enum(USER_STAGE_VALUES),
    memberCount: z.number().int().nonnegative(),
    isMember: z.boolean(),
    viewerRole: z.string().nullable(),
  })
  .openapi("CohortHeader");

/**
 * Kataloq sətri.
 *
 * ⚠️ `id`, `firstName`, `lastName`-dən BAŞQA hər sahə ŞƏRTİDİR: `redactProfile`
 * viewer-in görmədiyi sahəni obyektdən TAMAMİLƏ SİLİR (null qoymur), yəni
 * sahənin MÖVCUDLUĞU da məlumatdır. Sxem bunu `optional` + `passthrough` ilə
 * ifadə edir.
 */
export const DirectoryEntrySchema = z
  .object({
    id: idSchema,
    firstName: z.string(),
    lastName: z.string(),
    avatarUrl: z.string().nullable().optional(),
    currentCity: z.string().nullable().optional(),
    currentCountry: z.string().nullable().optional(),
    currentCompany: z.string().nullable().optional(),
    currentPosition: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
    cohorts: z.array(
      z.object({
        id: idSchema,
        slug: z.string(),
        displayName: z.string(),
        role: z.string().optional(),
      }).passthrough(),
    ),
  })
  .passthrough()
  .openapi("DirectoryEntry");

export const FeedPostSchema = z
  .object({
    id: idSchema,
    kind: z.enum(POST_KIND_VALUES),
    category: z.enum(POST_CATEGORY_VALUES),
    body: z.string(),
    visibility: visibilitySchema,
    createdAt: dateTimeSchema,
    author: z
      .object({
        id: idSchema,
        firstName: z.string(),
        lastName: z.string(),
        avatarUrl: z.string().nullable(),
      })
      .passthrough(),
    cohort: z
      .object({ id: idSchema, slug: z.string(), displayName: z.string() })
      .passthrough(),
  })
  .passthrough()
  .openapi("FeedPost");

export const TimelineItemSchema = z
  .object({
    id: idSchema,
    sourceType: z.enum(TIMELINE_SOURCE_TYPE_VALUES),
    title: z.string(),
    summary: z.string().nullable(),
    category: z.string(),
    occurredAt: dateTimeSchema,
    academicYear: z.string().openapi({
      description: "Sentyabr 1 – avqust 31 pəncərəsi.",
      example: "2026-2027",
    }),
    visibility: visibilitySchema,
    isSystemMilestone: z.boolean().openapi({
      description: "Cohort tarixlərindən törəyən sistem qeydi (əl ilə yaradılmır).",
    }),
    cohort: z
      .object({ id: idSchema, slug: z.string(), displayName: z.string() })
      .passthrough(),
    postId: z.string().nullable(),
    achievementId: z.string().nullable(),
    eventId: z.string().nullable(),
  })
  .passthrough()
  .openapi("TimelineItem");

export const AchievementSchema = z
  .object({
    id: idSchema,
    category: z.enum(ACHIEVEMENT_CATEGORY_VALUES),
    title: z.string(),
    description: z.string().nullable(),
    organization: z.string().nullable(),
    proofUrl: z.string().nullable(),
    imageUrl: z.string().nullable(),
    awardedAt: dateTimeSchema,
    status: z.enum(ACHIEVEMENT_STATUS_VALUES).openapi({
      description:
        "Başqasının qeydində yalnız `VERIFIED` / `FEATURED` görünür; sahib özü " +
        "`SUBMITTED` və `ARCHIVED` qeydini də görür.",
    }),
    visibility: visibilitySchema,
    owner: z
      .object({
        id: idSchema,
        firstName: z.string(),
        lastName: z.string(),
        avatarUrl: z.string().nullable(),
      })
      .passthrough(),
    cohort: z
      .object({ id: idSchema, slug: z.string(), displayName: z.string() })
      .passthrough(),
  })
  .passthrough()
  .openapi("Achievement");

export const EventSchema = z
  .object({
    id: idSchema,
    scope: z.enum(EVENT_SCOPE_VALUES).openapi({
      description: "TƏŞKİLATÇI səviyyəsi. Reunion MƏHZ burada işarələnir.",
    }),
    category: z.enum(EVENT_CATEGORY_VALUES).openapi({
      description: "Tədbirin NÖVÜ — `scope` ilə ortoqonaldır, dəyərləri kəsişmir.",
    }),
    title: z.string(),
    description: z.string().nullable(),
    startsAt: dateTimeSchema,
    endsAt: dateTimeSchema.nullable(),
    location: z.string().nullable(),
    onlineUrl: z.string().nullable(),
    isOnline: z.boolean(),
    capacity: z.number().int().nullable(),
    registrationDeadline: dateTimeSchema.nullable(),
    coverUrl: z.string().nullable(),
    visibility: visibilitySchema,
    status: z.enum(EVENT_STATUS_VALUES),
    attendingCount: z.number().int().nonnegative().openapi({
      description:
        "YER TUTAN RSVP-lərin sayı — `INVITED` dəvətlər daxil DEYİL (tutum " +
        "hesablaması buna görə düzgün qalır).",
    }),
    createdBy: z
      .object({
        id: idSchema,
        firstName: z.string(),
        lastName: z.string(),
        avatarUrl: z.string().nullable(),
      })
      .passthrough(),
    cohort: z
      .object({ id: idSchema, slug: z.string(), displayName: z.string() })
      .passthrough()
      .nullable(),
    faculty: z.object({ id: idSchema, name: z.string() }).passthrough().nullable(),
    club: z
      .object({ id: idSchema, name: z.string(), slug: z.string() })
      .passthrough()
      .nullable(),
  })
  .passthrough()
  .openapi("Event");

// ---------------------------------------------------------------------------
// Share Memories · Digital Yearbook · Dəstək təklifləri (Blok 10A)
// ---------------------------------------------------------------------------

const memoryAuthorSchema = z
  .object({
    id: idSchema,
    firstName: z.string(),
    lastName: z.string(),
    avatarUrl: z.string().nullable(),
  })
  .passthrough();

export const MemorySchema = z
  .object({
    id: idSchema,
    type: z.enum(MEMORY_TYPE_VALUES),
    title: z.string(),
    body: z.string(),
    dedicatedTo: z.string().nullable(),
    imageUrl: z.string().nullable(),
    visibility: visibilitySchema,
    occurredAt: dateTimeSchema,
    createdAt: dateTimeSchema,
    guidePlaceId: z.string().nullable().openapi({
      description:
        "«Sevimli yer» körpüsü — `GuidePlace.id`. Xatirə NÖVÜNDƏN ASILI DEYİL: " +
        "8 növün hər hansı biri məkana bağlana bilər.",
    }),
    postId: z.string().nullable().openapi({
      description:
        "Lentdə də paylaşılıbsa bağlı `Post.id`. ⚠️ Xronologiyaya düşmə YALNIZ " +
        "bu post vasitəsilə mümkündür — `TimelineEntry`-də Memory-yə FK yoxdur.",
    }),
    showInProfile: z.boolean(),
    showInFeed: z.boolean(),
    showInTimeline: z.boolean().openapi({
      description: "`showInFeed` bağlı olarsa bu bayraq `true` OLA BİLMƏZ.",
    }),
    showInYearbook: z.boolean(),
    author: memoryAuthorSchema,
    cohort: z
      .object({ id: idSchema, slug: z.string(), displayName: z.string() })
      .passthrough(),
    guidePlace: z
      .object({ id: idSchema, title: z.string(), category: z.enum(GUIDE_CATEGORY_VALUES) })
      .passthrough()
      .nullable(),
  })
  .passthrough()
  .openapi("Memory");

/** Bələdçi səhifəsindəki dar forma (`/guide-places/{id}/memories`). */
export const PlaceMemorySchema = z
  .object({
    id: idSchema,
    type: z.enum(MEMORY_TYPE_VALUES),
    title: z.string(),
    body: z.string(),
    imageUrl: z.string().nullable(),
    occurredAt: dateTimeSchema,
    visibility: visibilitySchema,
    author: memoryAuthorSchema,
    cohort: z
      .object({ id: idSchema, slug: z.string(), displayName: z.string() })
      .passthrough(),
  })
  .passthrough()
  .openapi("PlaceMemory");

export const YearbookEntrySchema = MemorySchema.extend({
  section: z.enum(YEARBOOK_SECTIONS).openapi({
    description:
      "Albomdaki bölmə. `PLACE` NÖVDƏN ASILI DEYİL — `guidePlaceId` doludursa " +
      "qeyd həmişə oraya düşür. Bir qeyd YALNIZ BİR bölmədə olur.",
  }),
}).openapi("YearbookEntry");

export const SupportOfferEntrySchema = z
  .object({
    user: memoryAuthorSchema,
    type: z.enum(SUPPORT_OFFER_TYPE_VALUES),
    note: z.string().nullable().openapi({
      description: "`JOB_SHARING` növündə iş elanı mətnidir.",
    }),
    company: z.string().nullable().openapi({
      description:
        "Cari iş yeri — YALNIZ `CareerEntry` görünürlükdən keçdikdə. Keçmirsə `null`.",
    }),
    position: z.string().nullable(),
  })
  .passthrough()
  .openapi("SupportOfferEntry");

// ---------------------------------------------------------------------------
// "İndi haradayıq?" aqreqasiyası (Blok 10B, spec §13)
// ---------------------------------------------------------------------------
//
// 🔴 SXEM ÖZÜ MƏXFİLİK SƏNƏDİDİR — üç şeyi SÜBUT EDİR:
//
//   1. MAAŞ SAHƏSİ YOXDUR (TƏLƏ D). Cavabda `salary`, `bonus`, `income` adlı
//      sahə nə var, nə də ola bilər — sxem `.strict()`-dir (aşağıya bax) və
//      `career-stats.test.ts` çıxış obyektində belə açar OLMADIĞINI yoxlayır.
//   2. AD / PROFİL LİNKİ YOXDUR. Cavab tamamilə aqreqatdır: heç bir sahə
//      istifadəçi kimliyinə aparmır.
//   3. KOORDİNAT SƏTİRDƏN GƏLMİR. `lat` / `lon` YALNIZ şəhər mərkəzləridir
//      (`lib/geo.ts` statik cədvəli) — `CareerEntry`-də belə sütun yoxdur.
//
// ⚠️ Bu sxemlər `.strict()`-dir, digər cavab sxemləri kimi `.passthrough()`
// DEYİL. Səbəb: `passthrough` "əlavə sahələr ola bilər" deyir və maaş sahəsinin
// OLMADIĞINI sənədləşdirməyi mənasız edərdi. Profil sxemlərində `passthrough`
// lazımdır (`redactProfile` sahələri silir), aqreqatda isə forma SABİTDİR.

const StatsBucketSchema = z
  .object({
    key: z.string().openapi({
      description:
        "Xam dəyər: enum açarı (`TECHNOLOGY`, `ENGINEERING`, `MASTER`) və ya " +
        "sərbəst mətn (ölkə, şirkət adı). Azərbaycanca etiket UI-dadır — API " +
        "dəyəri qaytarır ki, müştəri öz dilində göstərə bilsin.",
    }),
    count: z.number().int().min(3).openapi({
      description:
        "Nəfər sayı. HƏMİŞƏ ≥ 3-dür: kiçik qruplar k-anonimliklə " +
        "`undisclosedCount`-a yığılır (spec §13).",
    }),
  })
  .strict()
  .openapi("StatsBucket");

const CityBucketSchema = z
  .object({
    city: z.string(),
    country: z.string().openapi({
      description: "Xana açarı şəhər + ölkə cütüdür — eyni adlı şəhərlər qarışmasın.",
    }),
    count: z.number().int().min(3),
  })
  .strict()
  .openapi("CityBucket");

function statsCellSchema<S extends z.ZodTypeAny>(item: S, name: string) {
  return z
    .object({
      visible: z.array(item).openapi({
        description: "Açıqlanan xanalar — say azalan sıra ilə, hər biri ≥ 3 nəfər.",
      }),
      undisclosedCount: z.number().int().nonnegative().openapi({
        description:
          "Dəyəri OLAN, amma qrupu 3 nəfərdən kiçik olduğu üçün açıqlanmayan sətirlər.",
      }),
      unknownCount: z.number().int().nonnegative().openapi({
        description: "Bu ölçü üzrə məlumat bildirməyən sətirlər.",
      }),
    })
    .strict()
    .openapi(name, {
      description:
        "🔴 İNVARİANT: `Σ visible[].count + undisclosedCount + unknownCount` " +
        "HƏMİŞƏ `respondentCount`-a bərabərdir. Xanalar bir-birindən çıxılıb " +
        "qalıq (deməli fərd) alına bilməz — bütün ölçülər TƏK dataset üzərində, " +
        "TƏK keçiddə hesablanır.",
    });
}

const MapPinSchema = z
  .object({
    id: z.string().openapi({ description: "Stabil açar: normallaşdırılmış `ölkə|şəhər`." }),
    city: z.string(),
    country: z.string(),
    lat: z.number().openapi({
      description:
        "ŞƏHƏR MƏRKƏZİNİN enliyi — `lib/geo.ts` statik cədvəlindən. " +
        "İstifadəçinin yeri DEYİL və `CareerEntry`-də koordinat sütunu YOXDUR.",
    }),
    lon: z.number(),
    count: z.number().int().min(3),
    roles: z
      .array(StatsBucketSchema)
      .openapi({
        description:
          "Şəhər × vəzifə bölgüsü. 🔴 Bu BİRGƏ CƏDVƏLDİR və AYRICA k-anonimlikdən " +
          "keçir: yalnız həmin şəhərdə ≥ 3 nəfər olan istiqamətlər var. Boş massiv " +
          "«bölgü açıqlanmır» deməkdir, «vəzifə yoxdur» demək DEYİL.",
      }),
    undisclosedRoles: z.number().int().nonnegative(),
  })
  .strict()
  .openapi("MapPin");

const CountryFillSchema = z
  .object({
    numeric: z.string().openapi({
      description:
        "ISO 3166-1 numeric — `world-atlas` (countries-110m) topologiyasındaki " +
        "poliqonun `id`-si. Xəritə doldurması bununla bağlanır.",
      example: "031",
    }),
    iso2: z.string().length(2).openapi({ example: "AZ" }),
    country: z.string(),
    count: z.number().int().min(3),
  })
  .strict()
  .openapi("CountryFill");

export const WhereAreWeNowSchema = z
  .object({
    respondentCount: z.number().int().nonnegative().openapi({
      description:
        "Bölgüdə sayılan NƏFƏR sayı (sətir yox). Üç süzgəcdən keçir: görünürlük, " +
        "`includeInStats` razılığı, `isCurrent`.",
    }),
    totalConsented: z.number().int().nonnegative().openapi({
      description:
        "Aqreqasiyaya razılıq vermiş və viewer-ə görünən üzv sayı. " +
        "`respondentCount`-dan böyük ola bilər: yalnız təhsil qeydinə razılıq " +
        "verən, cari iş qeydi olmayan üzv bölgüyə düşmür.",
    }),
    memberCount: z.number().int().nonnegative().nullable().openapi({
      description: "Sinif ölçüsü — razılıq nisbətini («N/M») göstərmək üçün.",
    }),
    suppressedCount: z.number().int().nonnegative().openapi({
      description: "Ən azı bir ölçüdə bölgüsü tam açıqlanmayan nəfər sayı (şəffaflıq).",
    }),
    viewerIncluded: z.boolean().openapi({
      description: "Sorğu edən istifadəçinin öz məlumatı bu bölgüdə iştirak edirmi?",
    }),

    countries: statsCellSchema(StatsBucketSchema, "CountryStatsCell"),
    cities: statsCellSchema(CityBucketSchema, "CityStatsCell"),
    companies: statsCellSchema(StatsBucketSchema, "CompanyStatsCell"),
    industries: statsCellSchema(StatsBucketSchema, "IndustryStatsCell"),
    jobFunctions: statsCellSchema(StatsBucketSchema, "JobFunctionStatsCell"),
    educationLevels: statsCellSchema(StatsBucketSchema, "EducationStatsCell"),

    mapPins: z.array(MapPinSchema).openapi({
      description: "Dünya xəritəsinin şəhər markerləri — tanınmayan şəhər pin YARATMIR.",
    }),
    azPins: z.array(MapPinSchema).openapi({
      description: "Azərbaycan görünüşünün markerləri — `mapPins`-in alt çoxluğu.",
    }),
    countryFills: z.array(CountryFillSchema).openapi({
      description: "Ölkə doldurması. Tanınmayan ölkə burada YOXDUR (siyahıda var, xəritədə yox).",
    }),
  })
  .strict()
  .openapi("WhereAreWeNow");

const SearchHitSchema = z
  .object({
    id: idSchema,
    title: z.string(),
    subtitle: z.string().nullable(),
    href: z.string().openapi({ description: "Nəticəyə aparan daxili ünvan." }),
  })
  .openapi("SearchHit");

export const SearchResultsSchema = z
  .object({
    users: z.array(SearchHitSchema),
    posts: z.array(SearchHitSchema),
    events: z.array(SearchHitSchema),
    achievements: z.array(SearchHitSchema),
  })
  .openapi("SearchResults");

// ---------------------------------------------------------------------------
// Query sxemləri (sadə hallar — mürəkkəb filtrlər saf modullardan gəlir)
// ---------------------------------------------------------------------------

export const ContentPagesQuerySchema = z.object({
  section: ContentSectionSchema,
});

export const FaqQuerySchema = z.object({
  category: FaqCategorySchema.optional(),
});

export const GuidePlacesQuerySchema = z.object({
  category: GuideCategorySchema.optional(),
});

export const SearchQuerySchema = z.object({
  q: z.string().min(MIN_SEARCH_LENGTH, `Sorğu ən azı ${MIN_SEARCH_LENGTH} simvol olmalıdır`),
  take: takeSchema(SEARCH_PAGE_LIMIT, PALETTE_LIMIT),
});

/** Kursor əsaslı siyahılar (`/cohorts/{slug}/posts`). */
export const CURSOR_MAX_TAKE = 50;
export const CURSOR_DEFAULT_TAKE = 20;

export const PostsQuerySchema = z.object({
  cursor: z.string().optional(),
  take: takeSchema(CURSOR_MAX_TAKE, CURSOR_DEFAULT_TAKE),
});
