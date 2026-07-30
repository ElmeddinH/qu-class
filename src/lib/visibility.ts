// ============================================================================
// src/lib/visibility.ts
// QU CLASS — Məxfilik mühərriki. Sistemin ən vacib faylı.
//
// BÜTÜN görünürlük qərarları buradan keçir. Başqa yerdə `visibility === "..."`
// müqayisəsi yazma. Yeni servis funksiyası yazırsansa `visibilityWhere()`
// istifadə etməlisən — istisna yoxdur.
//
// ----------------------------------------------------------------------------
// MODEL → KÖMƏKÇİ → SAHİB SÜTUNU  (bunu oxumadan servis yazma)
// ----------------------------------------------------------------------------
// Qorunan modellər İKİ AİLƏYƏ bölünür və hər ailənin ÖZ köməkçisi var.
//
// A) `cohortId` sütunu OLAN modellər — CLASS = "resurs viewer-in cohort-undadır"
//
//   Model          Köməkçi                              ownerField
//   ─────────────  ───────────────────────────────────  ─────────────
//   Post           activeVisibleWhere(v, …)             "authorId"
//   Memory         activeVisibleWhere(v, …)             "authorId"
//   TimelineEntry  visibilityWhere(v, …) ⚠ sahib yox    — (aşağıya bax)
//   Achievement    visibleWithStatus(v,[VERIFIED,FEATURED],…)  "ownerId"
//   Event          visibleWithStatus(v,[PUBLISHED,COMPLETED],…) "createdById"
//
//   ⚠️ `TimelineEntry`-də sahib sütunu YOXDUR — qeyd törəmədir. Servis
//      `timelineVisibilityWhere()` işlədir (aşağıda), o da sahib şaxəsini
//      buraxıb yalnız səviyyə şaxələrini qurur.
//
//   ⚠️ `Event.cohortId` NULL ola bilər (UNIVERSITY / FACULTY tədbirləri).
//      `visibility = CLASS` + `cohortId = NULL` tədbir HEÇ KİMƏ görünmür:
//      SQL-də `NULL IN (...)` heç vaxt TRUE olmur, `canView` isə açıq şəkildə
//      `r.cohortId !== null` tələb edir. İkisi razılaşır — bu, təsadüf deyil,
//      testlə (visibility.test.ts) bərkidilib. "Optimallaşdırıb" dəyişmə.
//
// B) `cohortId` sütunu OLMAYAN, `userId`-yə bağlı modellər —
//    CLASS = "viewer SAHİBLƏ eyni cohort-u paylaşır"
//
//   Model            Köməkçi                        ownerField
//   ───────────────  ─────────────────────────────  ──────────
//   CareerEntry      visibilityWhereForUserOwned(v) "userId"
//   EducationEntry   visibilityWhereForUserOwned(v) "userId"
//
//   ⚠️ Bu modellərdə `visibilityWhere()` ÇAĞIRMA — o, mövcud olmayan
//      `cohortId` sütununa şərt qurur. Tip sistemi bunu bloklayır:
//      `visibilityWhere` yalnız `CohortOwnerField` qəbul edir, `"userId"` yox.
// ============================================================================

// ---------------------------------------------------------------------------
// Səviyyələr
// ---------------------------------------------------------------------------

export const VISIBILITY_LEVELS = ["PUBLIC", "UNIVERSITY", "CLASS", "PRIVATE"] as const;
export type Visibility = (typeof VISIBILITY_LEVELS)[number];

/** Azalan açıqlıq sırası — müqayisə üçün */
const RANK: Record<Visibility, number> = {
  PUBLIC: 0,
  UNIVERSITY: 1,
  CLASS: 2,
  PRIVATE: 3,
};

export function isVisibility(v: string): v is Visibility {
  return (VISIBILITY_LEVELS as readonly string[]).includes(v);
}

// ---------------------------------------------------------------------------
// Viewer
// ---------------------------------------------------------------------------

export type SystemRole = "USER" | "UNIVERSITY_ADMIN";

export type Viewer =
  | { kind: "ANONYMOUS" }
  | {
      kind: "USER";
      userId: string;
      /** İstifadəçinin üzv olduğu bütün cohort id-ləri */
      cohortIds: string[];
      systemRole: SystemRole;
      /** CLASS_MODERATOR olduğu cohort-lar — yalnız moderasiya axınında */
      moderatedCohortIds: string[];
    };

export const ANONYMOUS: Viewer = { kind: "ANONYMOUS" };

// ---------------------------------------------------------------------------
// Resurs forması
// ---------------------------------------------------------------------------

export interface Guarded {
  ownerId: string;
  cohortId: string | null;
  visibility: string; // DB-də String (SQLite enum dəstəkləmir)
}

// ---------------------------------------------------------------------------
// 1. Nöqtəvi qərar — tək obyekt üçün
// ---------------------------------------------------------------------------

export function canView(viewer: Viewer, r: Guarded): boolean {
  // Sahibi həmişə görür
  if (viewer.kind === "USER" && viewer.userId === r.ownerId) return true;

  // Naməlum səviyyə = ən məhdudlaşdırıcı davranış (fail closed)
  if (!isVisibility(r.visibility)) {
    console.error(`[visibility] naməlum səviyyə: "${r.visibility}" (owner ${r.ownerId})`);
    return false;
  }

  switch (r.visibility) {
    case "PUBLIC":
      return true;

    case "UNIVERSITY":
      return viewer.kind === "USER";

    case "CLASS":
      return (
        viewer.kind === "USER" &&
        r.cohortId !== null &&
        viewer.cohortIds.includes(r.cohortId)
      );

    case "PRIVATE":
      // Yalnız sahibi. Admin belə oxumur — moderasiya ayrı axından gedir.
      return false;
  }
}

/**
 * Viewer bu SİNFİN moderatorudurmu? (resurs deyil, cohort səviyyəsi)
 *
 * Moderasiya NÖVBƏSİ üçün lazımdır: növbə açılanda hələ heç bir konkret resurs
 * yoxdur, sual "bu adam bu sinifdə moderasiya edə bilirmi?" formasındadır.
 * `UNIVERSITY_ADMIN` bütün siniflərdə keçir (universitet miqyaslı rol).
 *
 * ⚠️ `moderatedCohortIds` JWT-dən DEYİL, hər sorğuda `getViewer()` ilə
 * `CohortMembership`-dən oxunur — rol dəyişikliyi dərhal təsir edir.
 */
export function canModerateCohort(viewer: Viewer, cohortId: string | null): boolean {
  if (viewer.kind !== "USER") return false;
  if (viewer.systemRole === "UNIVERSITY_ADMIN") return true;
  return cohortId !== null && viewer.moderatedCohortIds.includes(cohortId);
}

/** Moderasiya konteksti — YALNIZ şikayət edilmiş məzmunu açmaq üçün.
 *  Hər çağırışda AuditLog yaz. Adi oxu axınında İSTİFADƏ ETMƏ. */
export function canModerate(viewer: Viewer, r: Guarded): boolean {
  return canModerateCohort(viewer, r.cohortId);
}

// ---------------------------------------------------------------------------
// 2. Sorğu səviyyəsində filtr — ƏSAS İSTİFADƏ FORMASI
//    JS-də filtrləmə pagination-ı sındırır və sızma yaradır. Həmişə bunu işlət.
// ---------------------------------------------------------------------------

/**
 * Sahibin sütun adı — modeldən modelə dəyişir.
 *
 * ⚠️ `"userId"` (CareerEntry / EducationEntry) burada var, amma
 * `visibilityWhere` onu QƏBUL ETMİR — həmin modellərdə `cohortId` sütunu
 * yoxdur. Bax `CohortOwnerField` və `visibilityWhereForUserOwned`.
 */
export type OwnerField = "authorId" | "ownerId" | "createdById" | "userId";

/**
 * `cohortId` sütunu OLAN modellərin sahib sütunları.
 *
 * `visibilityWhere` / `visibleWithStatus` yalnız bunları qəbul edir: onların
 * CLASS şaxəsi `{ cohortId: { in: … } }` qurur və `"userId"` ilə çağırılsa
 * (CareerEntry, EducationEntry) mövcud olmayan sütuna şərt yazılardı.
 * Səhv fayl başındakı cədvəldə deyil, KOMPİLYASİYADA tutulsun deyə ayrı tipdir.
 */
export type CohortOwnerField = Exclude<OwnerField, "userId">;

/**
 * Görünürlük şərtini qaytarır. Generic-dir, çünki `Post`, `Memory`,
 * `Achievement` və `Event` fərqli WhereInput tiplərinə malikdir, amma eyni
 * sahə adlarını (`visibility`, `cohortId`, sahib sütunu) daşıyır.
 *
 * İstifadə:
 *   prisma.post.findMany({
 *     where: { AND: [{ status: "ACTIVE" }, visibilityWhere<Prisma.PostWhereInput>(viewer, "authorId")] }
 *   })
 */
export function visibilityWhere<W extends object>(
  viewer: Viewer,
  ownerField: CohortOwnerField = "authorId"
): W {
  if (viewer.kind === "ANONYMOUS") {
    return { visibility: "PUBLIC" } as W;
  }

  return {
    OR: [
      // 1) Öz məzmunu — səviyyədən asılı olmayaraq
      { [ownerField]: viewer.userId },
      // 2) Açıq
      { visibility: "PUBLIC" },
      // 3) Universitet daxili
      { visibility: "UNIVERSITY" },
      // 4) Öz sinifləri
      { visibility: "CLASS", cohortId: { in: viewer.cohortIds } },
      // PRIVATE qəsdən yoxdur — yalnız (1) vasitəsilə görünür
    ],
  } as W;
}

/**
 * Görünürlük + status filtri birlikdə.
 *
 * ⚠️ `status` dəyərləri modeldən modelə FƏRQLİDİR — bunu sabit kodlaşdırma:
 *   Post / Memory / Comment → "ACTIVE"
 *   Achievement            → "VERIFIED" | "FEATURED" (ictimai görünüş üçün)
 *   Event                  → "PUBLISHED" | "COMPLETED"
 * Buna görə statuslar arqument kimi ötürülür.
 */
export function visibleWithStatus<W extends object>(
  viewer: Viewer,
  statuses: string[],
  ownerField: CohortOwnerField = "authorId"
): W {
  // ⚠️ Status filtri sahibin öz məzmununa TƏTBİQ EDİLMİR. Əks halda istifadəçi
  // öz SUBMITTED / ARCHIVED nailiyyətini və ya DRAFT tədbirini öz profilində
  // görə bilməzdi. Buna görə sahib şaxəsi AND-dan KƏNARDA saxlanılır.
  if (viewer.kind === "ANONYMOUS") {
    return {
      AND: [{ status: { in: statuses } }, { visibility: "PUBLIC" }],
    } as W;
  }

  return {
    OR: [
      { [ownerField]: viewer.userId },
      {
        AND: [
          { status: { in: statuses } },
          {
            OR: [
              { visibility: "PUBLIC" },
              { visibility: "UNIVERSITY" },
              { visibility: "CLASS", cohortId: { in: viewer.cohortIds } },
            ],
          },
        ],
      },
    ],
  } as W;
}

/** Post və Memory üçün qısayol (ən çox istifadə olunan hal) */
export function activeVisibleWhere<W extends object>(
  viewer: Viewer,
  ownerField: CohortOwnerField = "authorId"
): W {
  return visibleWithStatus<W>(viewer, ["ACTIVE"], ownerField);
}

// ---------------------------------------------------------------------------
// 2b. `cohortId` sütunu OLMAYAN, istifadəçiyə bağlı modellər
//     (CareerEntry, EducationEntry) — fayl başındakı cədvəl, B ailəsi
// ---------------------------------------------------------------------------

/**
 * `visibilityWhere`-in `userId`-yə bağlı modellər üçün variantı.
 *
 * Fərq YALNIZ `CLASS` şaxəsindədir. Bu modellərdə `cohortId` sütunu yoxdur,
 * ona görə "sinif" resursun deyil, SAHİBİN üzvlüyü ilə müəyyən olunur:
 *
 *   cohortId-li model:  resurs viewer-in cohort-larından birindədirmi?
 *   userId-li model:    SAHİB viewer ilə hər hansı cohort-u paylaşırmı?
 *
 * SQL-ə `EXISTS (SELECT 1 FROM CohortMembership …)` kimi düşür — filtr yenə
 * DB səviyyəsindədir, JS-də deyil (CLAUDE.md §5).
 *
 * İstifadə:
 *   prisma.careerEntry.findMany({
 *     where: visibilityWhereForUserOwned<Prisma.CareerEntryWhereInput>(viewer),
 *   })
 */
export function visibilityWhereForUserOwned<W extends object>(viewer: Viewer): W {
  if (viewer.kind === "ANONYMOUS") {
    return { visibility: "PUBLIC" } as W;
  }

  return {
    OR: [
      // 1) Öz qeydi — səviyyədən asılı olmayaraq
      { userId: viewer.userId },
      // 2) Açıq
      { visibility: "PUBLIC" },
      // 3) Universitet daxili
      { visibility: "UNIVERSITY" },
      // 4) Sahib viewer ilə ən azı bir cohort paylaşır
      {
        visibility: "CLASS",
        user: { memberships: { some: { cohortId: { in: viewer.cohortIds } } } },
      },
      // PRIVATE qəsdən yoxdur — yalnız (1) vasitəsilə görünür
    ],
  } as W;
}

// ---------------------------------------------------------------------------
// 2c. Sahib sütunu OLMAYAN model — TimelineEntry
// ---------------------------------------------------------------------------

/**
 * `TimelineEntry` üçün görünürlük şərti.
 *
 * Timeline qeydi TÖRƏMƏDİR: öz sahib sütunu yoxdur, `visibility` mənbədən
 * kopyalanır. "Sahibi həmişə öz məzmununu görür" qaydasını qorumaq üçün sahib
 * şaxəsi mənbə əlaqələri üzərindən qurulur (post / achievement / event) —
 * əks halda istifadəçi `PRIVATE` səviyyəli öz qeydini öz xronologiyasında
 * görməzdi.
 *
 * `sourceType = SYSTEM` qeydlərinin mənbəyi yoxdur; onlar yalnız səviyyə
 * şaxələri ilə görünür (adətən `PUBLIC` / `CLASS` olurlar).
 */
export function timelineVisibilityWhere<W extends object>(viewer: Viewer): W {
  if (viewer.kind === "ANONYMOUS") {
    return { visibility: "PUBLIC" } as W;
  }

  return {
    OR: [
      { post: { authorId: viewer.userId } },
      { achievement: { ownerId: viewer.userId } },
      { event: { createdById: viewer.userId } },
      { visibility: "PUBLIC" },
      { visibility: "UNIVERSITY" },
      { visibility: "CLASS", cohortId: { in: viewer.cohortIds } },
    ],
  } as W;
}

// ---------------------------------------------------------------------------
// 3. Profil redaksiyası — sahə-səviyyə məxfilik
// ---------------------------------------------------------------------------

/** Bu sahələr default olaraq PRIVATE yaradılır (spesifikasiya §5) */
export const DEFAULT_PRIVATE_FIELDS = ["phone", "personalEmail"] as const;

/** `User` cədvəlində birbaşa sütun kimi mövcud olan idarə olunan sahələr */
export const SCALAR_PROFILE_FIELDS = [
  "avatarUrl",
  // ⚠️ Blok 12B — `coverUrl` ARTIQ idarə olunan sahədir (22-ci).
  // Əvvəl `avatarUrl`-in görünürlüyünə "yamaqla" bağlanmışdı
  // (`user.service.ts` → `getProfile`), yəni banneri ayrıca gizlətmək mümkün
  // deyildi. İndi öz sətri var; DB sətri olmayan KÖHNƏ istifadəçilər üçün
  // `defaultLevelFor()` CLASS qaytarır — yeni sahə heç vaxt PUBLIC olmur
  // (CLAUDE.md §"Məxfilik": "Yeni sahə əlavə edirsənsə default CLASS").
  "coverUrl",
  "hometown",
  "currentCity",
  "currentCountry",
  "phone",
  "personalEmail",
  "bio",
  "learningGoals",
  "askMeAbout",
  "expectations",
  "currentCompany",
  "currentPosition",
  "industry",
  "futurePlans",
] as const;

/**
 * Əlaqə cədvəllərindən gələn idarə olunan sahələr.
 * ⚠️ Bunlar `User` sütunu DEYİL — `UserTag`, `ClubMembership`, `CareerEntry`,
 * `EducationEntry`-dən gəlir. `redactProfile`-a ötürülən obyekt bu adlarla
 * ÖNCƏDƏN DÜZLƏNDİRİLMİŞ olmalıdır (bax `services/user.service.ts` →
 * `buildProfileView()`), əks halda sahə sadəcə atlanır.
 */
export const RELATIONAL_PROFILE_FIELDS = [
  "interests",
  "hobbies",
  "skills",
  "languages",
  "clubs",
  "careerHistory",
  "education",
] as const;

export const CONTROLLED_PROFILE_FIELDS = [
  ...SCALAR_PROFILE_FIELDS,
  ...RELATIONAL_PROFILE_FIELDS,
] as const;

export type ControlledField = (typeof CONTROLLED_PROFILE_FIELDS)[number];

/** Yeni sahə üçün default səviyyə */
export function defaultLevelFor(field: string): Visibility {
  return (DEFAULT_PRIVATE_FIELDS as readonly string[]).includes(field)
    ? "PRIVATE"
    : "CLASS";
}

/**
 * `redactProfile`-ın gözlədiyi giriş forması: `User` sütunları + düzləndirilmiş
 * əlaqələr. `services/user.service.ts` bunu qurur.
 */
export interface ProfileView {
  id: string;
  firstName: string;
  lastName: string;
  /** Bu istifadəçinin üzv olduğu cohort-lar */
  cohortIds: string[];
  [key: string]: unknown;
}

/**
 * İstifadəçi profilini viewer-in görməli olduğu sahələrə qədər kəsir.
 * Görünməməli sahələr obyektdən TAMAMİLƏ SİLİNİR (null qoyulmur) — belə ki,
 * JSON cavabında sahənin mövcudluğu belə sızmasın.
 */
export function redactProfile(
  user: ProfileView,
  viewer: Viewer,
  fieldVisibility: Array<{ field: string; level: string }>
): Partial<ProfileView> {
  const isOwner = viewer.kind === "USER" && viewer.userId === user.id;
  if (isOwner) return user;

  const levelMap = new Map<string, string>(
    fieldVisibility.map((f) => [f.field, f.level])
  );

  // Ad-soyad həmişə görünür — platformanın işləməsi üçün minimum
  const out: Partial<ProfileView> = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
  };

  // Bu istifadəçinin cohort-larından hər hansı birində viewer də üzvdürmü?
  const sharesClass =
    viewer.kind === "USER" &&
    user.cohortIds.some((c) => viewer.cohortIds.includes(c));

  for (const field of CONTROLLED_PROFILE_FIELDS) {
    if (!(field in user)) continue;

    const raw = levelMap.get(field) ?? defaultLevelFor(field);
    if (!isVisibility(raw)) {
      console.error(`[visibility] "${field}" üçün naməlum səviyyə: "${raw}" — sahə gizlədildi`);
      continue; // fail closed
    }

    const allowed =
      raw === "PUBLIC" ||
      (raw === "UNIVERSITY" && viewer.kind === "USER") ||
      (raw === "CLASS" && sharesClass);

    if (allowed) out[field] = user[field];
  }

  return out;
}

// ---------------------------------------------------------------------------
// 3b. Sahə-səviyyə məxfilik SORĞU şərti kimi — kataloq filtrləri (Modul 6)
// ---------------------------------------------------------------------------

/**
 * `redactProfile`-ın DB QARŞILIĞI: "viewer bu istifadəçinin `field` sahəsini
 * görə bilirmi?" sualını `User` üzərində `where` şərtinə çevirir.
 *
 * 🔴 NİYƏ LAZIMDIR: `redactProfile` sahəni ÇIXIŞDAN silir, amma sətri
 * SÜZMÜR. Gizlədilmiş sahəyə görə FİLTRLƏMƏ isə həmin sahəni sızdırır:
 * `?city=Bakı` filtri `currentCity`-ni PRIVATE edən adamı nəticədə göstərsə,
 * dəyər kartda görünməsə də istifadəçi onu ÖYRƏNDİ. Buna görə hər filtr İKİ
 * şərt qurur — dəyər uyğunluğu VƏ bu funksiya (bax
 * `src/lib/directory-filters.ts` başındakı xəritə).
 *
 * Şaxələr `redactProfile`-dakı `allowed` hesablaması ilə BİR-BİR üst-üstə
 * düşür — ikisi ayrılsa filtr redaksiyadan daha açıq olar:
 *
 *   1. sahibi                                  → həmişə
 *   2. səviyyə PUBLIC                          → hər kəs
 *   3. səviyyə UNIVERSITY                      → autentifikasiya olunmuş
 *   4. səviyyə CLASS + ORTAQ SİNİF             → yalnız sinif yoldaşı
 *   5. DB-də sətir YOXDUR → `defaultLevelFor(field)` eyni qaydalarla
 *
 * ⚠️ (4) qəsdən var: viewer ilə sinif paylaşmayan istifadəçinin `CLASS`
 * sahəsinə görə filtr etmək də sızmadır. Kataloq onsuz da yalnız viewer-in öz
 * siniflərini göstərir (yəni praktikada ortaq sinif var), amma qoruma
 * mühərrikdə saxlanılır — çağıran tərəfin süzgəcinə güvənilmir.
 *
 * ⚠️ (5) `phone` / `personalEmail` üçün heç bir şaxə açmır: onların defaultu
 * `PRIVATE`-dir, yəni sətri olmayan istifadəçi yalnız (1) ilə keçir.
 *
 * İstifadə:
 *   prisma.user.findMany({
 *     where: { AND: [
 *       { currentCity: city },
 *       fieldVisibleWhere<Prisma.UserWhereInput>(viewer, "currentCity"),
 *     ]},
 *   })
 */
export function fieldVisibleWhere<W extends object>(
  viewer: Viewer,
  field: ControlledField
): W {
  const branches: object[] = [];

  // (1) Sahibi — səviyyədən asılı olmayaraq
  if (viewer.kind === "USER") branches.push({ id: viewer.userId });

  // (2)+(3) Səviyyə şaxələri: sətir mövcuddur və viewer üçün açıqdır
  const openLevels: Visibility[] = ["PUBLIC"];
  if (viewer.kind === "USER") openLevels.push("UNIVERSITY");
  branches.push({ fieldVisibility: { some: { field, level: { in: openLevels } } } });

  // (4) CLASS — yalnız sahiblə ORTAQ SİNİF varsa
  const sharesClassWhere = {
    memberships: { some: { cohortId: { in: viewer.kind === "USER" ? viewer.cohortIds : [] } } },
  };
  if (viewer.kind === "USER") {
    branches.push({
      fieldVisibility: { some: { field, level: "CLASS" } },
      ...sharesClassWhere,
    });
  }

  // (5) Sətir yoxdur → default səviyyə eyni qaydalardan keçir (fail closed)
  const fallback = defaultLevelFor(field);
  const missingRow = { fieldVisibility: { none: { field } } };

  if (fallback === "PUBLIC" || (fallback === "UNIVERSITY" && viewer.kind === "USER")) {
    branches.push(missingRow);
  } else if (fallback === "CLASS" && viewer.kind === "USER") {
    branches.push({ ...missingRow, ...sharesClassWhere });
  }

  return { OR: branches } as W;
}

// ---------------------------------------------------------------------------
// 4. Aqreqasiya razılığı (Where Are We Now — Modul 11)
//    Görünürlük səviyyəsi KİFAYƏT DEYİL. Ayrıca `includeInStats` tələb olunur.
// ---------------------------------------------------------------------------

export const statsConsentWhere = {
  includeInStats: true,
} as const;

/** İctimai statistikada dəqiq məkan göstərilməməlidir (spesifikasiya §13). */
export function coarsenLocation(entry: {
  city?: string | null;
  country?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  return { city: entry.city ?? null, country: entry.country ?? null };
}

/** Kiçik qrupları gizlət — 1-2 nəfərlik xanalar fərdi məlumatı ifşa edə bilər */
export const MIN_BUCKET_SIZE = 3;

export function suppressSmallBuckets<T extends { count: number }>(
  buckets: T[]
): { visible: T[]; otherCount: number } {
  const visible = buckets.filter((b) => b.count >= MIN_BUCKET_SIZE);
  const otherCount = buckets
    .filter((b) => b.count < MIN_BUCKET_SIZE)
    .reduce((s, b) => s + b.count, 0);
  return { visible, otherCount };
}

// ---------------------------------------------------------------------------
// 5. Köməkçi — səviyyə müqayisəsi
// ---------------------------------------------------------------------------

/** `a` `b`-dən daha məhdudlaşdırıcıdırmı? */
export function isStricter(a: Visibility, b: Visibility): boolean {
  return RANK[a] > RANK[b];
}

/**
 * İki səviyyədən daha məhdudlaşdırıcı olanı qaytarır.
 *
 * İstifadə halı: törəmə qeyd (TimelineEntry) heç vaxt mənbədən daha AÇIQ
 * ola bilməz. Adətən `narrowest(post.visibility, cohortFloor)` kimi çağırılır,
 * burada `cohortFloor` cohort-un ümumi görünürlük tavanıdır (default "PUBLIC",
 * yəni məhdudiyyət qoymur). Yalnız post-un səviyyəsi varsa sadəcə onu kopyala.
 */
export function narrowest(a: Visibility, b: Visibility): Visibility {
  return RANK[a] >= RANK[b] ? a : b;
}
