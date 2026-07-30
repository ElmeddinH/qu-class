# Blok 12A — STATİK AUDİT (məxfilik + KUDS)

> Yalnız tapıntı və düzəliş. Yeni funksiya YOXDUR. Funksional borclar (T22,
> `coverUrl`, xəritə zoom/pan, kuki «Seçimlər» ekranı, donut kontrastı, toplu
> moderasiya, parol sıfırlama, `/admin/stats` kohort filtri) **12B-dədir** —
> bu blokda onlara toxunulmayıb, aşağıda §6-da siyahılanıb.

Audit tarixi: 2026-07-30 · Baza: 29 commit, HEAD `0a7ba5e` · vitest 1442 ✓ (audit öncəsi)

---

## 0. Xülasə

| | Say |
| --- | --- |
| Ümumi tapıntı | **10** |
| 🔴 KRİTİK | 1 |
| 🟠 ORTA | 3 |
| 🟡 AŞAĞI | 3 |
| ⚪️ Sənədləşdirilmiş istisna (düzəliş tələb etmir) | 3 |
| **Düzəldilib** | **7 / 7** (istisnalar xaric) |
| Yeni tələ | 4 (**T40–T43**) |
| Yeni vitest testi | 17 (12-si düzəlişdən ƏVVƏL qırmızı idi) |

### Düzəlişdən sonrakı vəziyyət

```
npx tsc --noEmit   ✓ təmiz
npm run lint       ✓ təmiz (0 error, 0 warning)
npm run build      ✓ təmiz
vitest             1459 passed  (1442 → +17)
playwright          148 passed  (dəyişməyib)
ui/ tarixçəsi      27 fayl · 1 versiya · df5633e — DƏYİŞMƏYİB
```

⚠️ **Nömrələmə düzəlişi.** Tapşırıqda «T36-dan başla» yazılıb, amma **T36–T39
Blok 11C-də (git push) artıq işlədilib** (STATE.md 1540–1551). Yeni tələlər ona
görə **T40**-dan nömrələnib.

---

## 1. A bəndi — MƏXFİLİK

### 1.1 A1 — birbaşa DB girişi (grep)

| Yoxlama | Nəticə |
| --- | --- |
| `grep -rn "prisma\." src/app src/features` | **BOŞ ✓** — 27 uyğunluğun hamısı ŞƏRH sətridir («burada `prisma.*` YOXDUR» qeydləri), icra olunan kod yoxdur |
| `grep -rn "from \"@/lib/db\"" src/app src/features` | **BOŞ ✓** |
| `@/lib/db` import edən bütün fayllar | 24 fayl: `src/auth.ts`, `lib/{admin-guard,stage,viewer}.ts` və `services/*` — hamısı arxitektura üzrə icazəlidir |

### 1.2 Servis sorğu cədvəli

Sütunlar: **fayl · funksiya · model · köməkçi · ownerField · statuslar · verdikt**

#### A ailəsi — `cohortId` sütunu OLAN modellər

| Fayl | Funksiya | Model | Köməkçi | ownerField | Statuslar | Verdikt |
| --- | --- | --- | --- | --- | --- | --- |
| post | `listFeed` | Post | `visiblePostWhere` → `activeVisibleWhere` | authorId | ACTIVE + `NOT DELETED` | ✓ |
| post | `searchPosts` | Post | `visiblePostWhere` | authorId | eyni | ✓ |
| post | `getPost` | Post | `visiblePostWhere` | authorId | eyni | ✓ |
| post | `listComments` | Comment | `post: visiblePostWhere` + `status NOT DELETED` | authorId (post) | eyni | ✓ |
| post | `toggleReaction` | Post | `visiblePostWhere` | authorId | eyni | ✓ |
| post | `createComment` | Post | `visiblePostWhere` | authorId | eyni | ✓ |
| post | `deletePost` | Post | sahib \|\| `canModerate` + AuditLog | authorId | — | ✓ |
| post | `deleteComment` | Comment | sahib \|\| `canModerate` + AuditLog | authorId | — | ✓ |
| post | `reactionBreakdown` | Reaction | (süzülmüş `postIds`-dən törəyir) | — | — | ✓ |
| memory | `listMemories` / `countMemories` | Memory | `visibleMemoryWhere` (ORTAQ `where`) | authorId | ACTIVE + `NOT DELETED` | ✓ |
| memory | `getMemory` | Memory | `visibleMemoryWhere` | authorId | eyni | ✓ |
| memory | `listYearbook` | Memory | `visibleMemoryWhere` + `showInYearbook` | authorId | eyni | ✓ |
| memory | `listMemoriesForPlace` / `countMemoriesForPlace` | Memory | `visibleMemoryWhere` + `guidePlaceId` | authorId | eyni | ✓ |
| memory | `getMemoryDraft` | Memory | `authorId = viewer` | authorId | ACTIVE | ✓ |
| memory | `updateMemory` | Memory | yalnız müəllif | authorId | ACTIVE | ✓ |
| memory | `deleteMemory` | Memory | sahib \|\| `canModerate` | authorId | ACTIVE | 🔴 **P1 — AuditLog YOX** |
| achievement | `listAchievements` / `countAchievements` | Achievement | `visibleWithStatus` (ORTAQ `achievementWhere`) | **ownerId** | VERIFIED, FEATURED | ✓ |
| achievement | `searchAchievements` | Achievement | `visibleWithStatus` | ownerId | eyni | ✓ |
| achievement | `getAchievement` | Achievement | `visibleWithStatus` | ownerId | eyni | ✓ |
| achievement | `listFeaturedAchievements` | Achievement | `visibleWithStatus` + `status=FEATURED` | ownerId | eyni | ✓ |
| achievement | `getAchievementStats` (`groupBy`) | Achievement | `visibleWithStatus` | ownerId | eyni | ✓ say da süzülür |
| achievement | `listModerationQueue` / `countModerationQueue` | Achievement | `canModerateCohort` (ROL qapısı) | — | SUBMITTED | ✓ sənədli istisna |
| achievement | `listUniversityModerationQueue` | Achievement | `assertFreshAdmin` | — | SUBMITTED | ✓ |
| achievement | `applyModeration` | Achievement | `canModerateCohort` + AuditLog | — | — | ✓ |
| event | `listEvents` / `countEvents` | Event | `visibleWithStatus` (ORTAQ `eventWhere`) | **createdById** | PUBLISHED, COMPLETED | ✓ |
| event | `searchEvents` | Event | `visibleWithStatus` | createdById | eyni | ✓ |
| event | `getEvent` / `getEventDetail` / `getEventForCalendar` | Event | `visibleWithStatus` | createdById | eyni | ✓ |
| event | `listEventFacets` (`groupBy` ×2) | Event | `eventWhere` (görünürlük daxil) | createdById | eyni | ✓ facet sızmır |
| event | `rsvpToEvent` | Event | `visibleWithStatus` | createdById | eyni | ✓ |
| event | `listEventAttendees` / `exportEventAttendees` | EventRSVP | `loadManageableEvent` (rol qapısı) | — | — | ⚪️ sənədli istisna (idarəetmə) |
| event | `getEventReport` / `completeEvent` / `notifyAttendees` | Event | rol qapısı + AuditLog | — | — | ✓ |
| timeline | `listTimeline` (siyahı + illər + `count`) | TimelineEntry | **`timelineVisibilityWhere`** (sahib şaxəsi mənbədən) | — (sahib sütunu yox) | — | ✓ üç sorğu da eyni `where` |
| timeline | `ensureCohortMilestones` | TimelineEntry | (yazma, cohort tarixlərindən) | — | — | ✓ |

#### B ailəsi — `cohortId` sütunu OLMAYAN, `userId`-yə bağlı modellər

| Fayl | Funksiya | Model | Köməkçi | Verdikt |
| --- | --- | --- | --- | --- |
| user | `buildProfileView` → `careerEntries` | CareerEntry | `visibilityWhereForUserOwned` (iç-içə `where`) | ✓ |
| user | `buildProfileView` → `educationEntries` | EducationEntry | `visibilityWhereForUserOwned` | ✓ |
| cohort | `listCohortSupportOffers` → `careerEntries` | CareerEntry | `visibilityWhereForUserOwned` | ✓ |
| stats | `fetchCareerStatsRows` | CareerEntry + EducationEntry | `visibilityWhereForUserOwned` + `statsConsentWhere` | ✓ |
| stats | `countConsentedMembers` (`groupBy` ×2) | CareerEntry + EducationEntry | eyni | ✓ (amma → 🟡 **P3** TOCTOU) |
| career | `getCareerWorkspace` | CareerEntry, EducationEntry, SupportOffer | `userId = viewer.userId` (yalnız sahib) | ✓ sənədli |

#### Profil / kataloq — sahə səviyyəsi

| Fayl | Funksiya | Model | Redaksiya | Verdikt |
| --- | --- | --- | --- | --- |
| user | `getProfile` | User | `redactProfile(buildProfileView(...))` | ✓ 21 sahənin hamısı düzləndirilib |
| user | `listDirectory` (+ `count`) | User | `directoryWhere` (13 filtr × `fieldVisibleWhere`) + `redactProfile` | ✓ |
| user | `listDirectoryFacets` (`groupBy`, `tagFacet`, `clubFacet`, `cohortFacets`) | User/Tag/Club/Cohort | `facetUserWhere` = `directoryWhere(except)` + `fieldVisibleWhere` | ✓ faset sızmır |
| user | `searchUsers` | User | yalnız ad-soyad (redaksiyaya tabe deyil) | ✓ sənədli |
| user | `getOnboardingProgress` / `getProfileDraft` | User | sahib-yalnız | ✓ sənədli |
| user | `getFieldVisibility` / `updateFieldVisibility*` | FieldVisibility | sahib-yalnız | ✓ |
| cohort | `listNewMembers` / `listSimilarMembers` | CohortMembership | `canSeeRoster` + `redactProfile` | ✓ |
| cohort | `listSupportOffers` / `listCohortSupportOffers` | User | `canSeeRoster` + `openToSupport` + `redactProfile(avatarUrl)` | ✓ |
| cohort | `getCohortHeader` / `listViewerCohorts` | Cohort | üzvlük qapısı | ✓ |
| stats | `getCohortHeadlineStats` | User/ClubMembership/Achievement | `fieldVisibleWhere` ×3 + `visibleWithStatus` + `HEADLINE_MIN_MEMBERS` | ✓ |
| admin-users | `listAdminUsers` / `exportAdminUsers` | User | `assertFreshAdmin` + `redactProfile(currentCity)` | 🟠 **P2** — `avatarUrl` redaksiyadan keçmir |

#### Sahibliklə qorunanlar (görünürlük mühərriki tətbiq olunmur — qəsdən)

| Fayl | Funksiya | Şərt | Verdikt |
| --- | --- | --- | --- |
| notification | `listNotifications` / `countNotifications` / `countUnread` | `recipientId = viewer.userId` (ORTAQ `where`) | ✓ |
| notification | `markNotificationRead` / `markAll` | `updateMany` + `recipientId` (IDOR bağlanışı) | ✓ |
| report | `createReport` / `createAccessibilityReport` | `reporterId = viewer.userId` | ✓ |
| audit | `listAuditLog` / `countAuditLog` / `listAuditFacets` / `listRecentAudit` | `assertFreshAdmin` | ✓ append-only |
| admin | `getAdminDashboardStats` / `getAdminActivitySeries` | `assertFreshAdmin`, yalnız SAY | ✓ sənədli (TƏLƏ G) |
| academic, content | kataloq / redaksiya məzmunu | `isPublished` | ✓ `Viewer` almır — şəxsi məlumat yoxdur |
| moderation | bütün axın | `canModerate` + `recordAudit` (iz ƏVVƏL) | ✓ |
| sis-import | `previewImport` / `commitImport` | `assertFreshAdmin` + AuditLog | ✓ |

**JS-də filtrləmə:** `grep` 45 uyğunluq verdi; hamısı yoxlandı — heç biri
GÖRÜNÜRLÜK filtri deyil (taq növünə görə qruplaşdırma, `null` təmizləmə, xana
aqreqasiyası, enum sıralaması). `listSimilarMembers`-dəki `.filter()/.slice()`
səhifələnməyən widget-də ÇEŞİDLƏMƏDİR və süzgəcin hamısı DB-də qalır
(fayl 362–366-cı sətirlərdə əsaslandırılıb). ✓

### 1.3 A3 — Filtr / faset sızması

**Directory 13 filtri** (`src/lib/directory-filters.ts` xəritəsi ↔
`user.service.ts` → `filterClauses`):

| # | Filtr | `profileField` | Dəyər şərti | `fieldVisibleWhere` | Verdikt |
| --- | --- | --- | --- | --- | --- |
| 1 | name | `null` (ad həmişə görünür) | `tokenizedContains` | tələb olunmur | ✓ |
| 2–5 | faculty, program, admissionYear, graduationYear | `null` (struktur: cohort) | tək `memberships.some` | tələb olunmur | ✓ |
| 6 | city | `currentCity` | ✓ | ✓ | ✓ |
| 7 | country | `currentCountry` | ✓ | ✓ | ✓ |
| 8 | industry | `industry` | ✓ | ✓ | ✓ |
| 9 | company | `currentCompany` | ✓ | ✓ | ✓ |
| 10 | interest | `interests` | ✓ | ✓ | ✓ |
| 11 | language | `languages` | ✓ | ✓ | ✓ |
| 12 | club | `clubs` | ✓ | ✓ | ✓ |
| 13 | status | `null` (cohort tarixləri) | `stageCohortWhere` | tələb olunmur | ✓ |

Cütlük ƏL İLƏ yazılmır: `filterClauses()` görünürlük şərtini
`directoryFilterDef(key).profileField`-dən AVTOMATİK əlavə edir, yəni xəritədə
sahə göstərilib şərtin unudulması struktur olaraq mümkün deyil. ✓

**Fasetlər:** `facetUserWhere()` `directoryWhere(… except: key)` üzərinə həmin
sahənin `fieldVisibleWhere`-ini AYRICA qoyur → `?city=Bakı` filtrinin `total`-ı
ilə «Bakı» faset sayı üst-üstə düşür. ✓
**Tədbir fasetləri** (`listEventFacets`) `eventWhere`-dən keçir. ✓
**`/admin/stats`** → `AdminStatsPanel` → `getCareerOutcomeStats` (razılıq +
görünürlük + k-anonimlik). ✓

### 1.4 A4 — Aqreqasiya

| Tələb | Vəziyyət |
| --- | --- |
| `includeInStats` razılığı | ✓ `statsConsentWhere` hər dörd sorğuda |
| `suppressSmallBuckets` / `MIN_BUCKET_SIZE = 3` | ✓ `lib/career-stats.ts` — TƏK dataset, TƏK keçid; `Σ visible + undisclosed + unknown = respondentCount` invariantı |
| `coarsenLocation` | ✓ proyeksiya qapısı (`toLocationBuckets`) |
| Çarpaz-ölçü supressiyası | ✓ `MARGINAL` default + `strictCrossDimension` rejimi, ikisi də testli; şəhər→ölkə→«Açıqlanmayan» eskalasiyası |
| Pin tooltip cross-tab | ✓ şəhər×vəzifə AYRICA eşikdən keçir |
| Maaş sahəsi | ✓ sxemdə də, sorğuda da YOXDUR |
| **Sayım tranzaksiya içində (TOCTOU)** | 🟡 **P3 — YOX**, üç sorğu `Promise.all` ilə ayrı-ayrı |

### 1.5 A5 — `redactProfile` / `buildProfileView` tamlığı

`FullProfileView` (`user.service.ts:140–170`) ↔ `CONTROLLED_PROFILE_FIELDS`
(`visibility.ts:379`) — **21/21 sahə mövcuddur:**

- 14 skalyar: `avatarUrl, hometown, currentCity, currentCountry, phone,
  personalEmail, bio, learningGoals, askMeAbout, expectations, currentCompany,
  currentPosition, industry, futurePlans` ✓
- 7 düzləndirilmiş əlaqə: `interests, hobbies, skills, languages, clubs,
  careerHistory, education` ✓ (`tagsOfType`, `clubMemberships`,
  `careerEntries`, `educationEntries` — hamısı `view` obyektinə yazılır)

Səssiz işləməyən məxfilik açarı **yoxdur**. ✓

⚠️ **Amma:** `redactProfile` yalnız ÇAĞIRILDIĞI yerdə işləyir. `avatarUrl`
«müəllif kartı» formasında 9 ayrı sorğuda təkrarlanır və onların 8-i redaksiyadan
KEÇMİRDİ → 🟠 **P2** (bax aşağı). Bu, «`buildProfileView` natamamdır» səhvi
deyil, **«redaksiya çağırılmayıb»** səhvidir — nəticəsi eynidir.

### 1.6 A6 — Admin yolları

| Yoxlama | Nəticə |
| --- | --- |
| CSV eksportu `redactProfile`-dan keçir | ✓ `exportAdminUsers` → `listAdminUsers` → `toAdminUserRow` → `redactProfile(currentCity)` |
| `phone` / `personalEmail` select olunur? | ✓ **XEYR** — nə `ADMIN_USER_SELECT`-də, nə `ADMIN_USER_EXPORT_COLUMNS`-da; yaddaşa belə gəlmir |
| `exportEventAttendees` | ⚪️ `email` var — universitet e-poçtu hesab açarıdır, idarəetmə axını (sənədli, `event.service.ts:1240`) |
| `canModerate()` yalnız moderasiya yolunda | ✓ 6 istifadə: `deletePost`, `deleteComment`, `deleteMemory` (yazma) + `toFeedPost`, `listComments`, `openModerationReview` (UI bayrağı / qapı) |
| Hər `canModerate` yazma yolu AuditLog yazır | 🔴 **P1 — `deleteMemory` yazmır** |
| AuditLog-da delete/update varmı | ✓ **YOX** — `audit.service.ts` yalnız `create` + oxu ixrac edir, `audit.service.test.ts` modul ixraclarını gəzib bunu bərkidir; `/admin/audit` yalnız oxu; `/api/v1/admin/audit` yalnız `GET` |
| `recordAudit` yeganə yazma yolu | 🟡 **P4 — XEYR**, 6 yerdə birbaşa `prisma.auditLog.create` (ağ siyahı tətbiq olunmur) |

### 1.7 A7 — API v1

34 route faylı (33 endpoint + `openapi.json`). **Hamısı** servis qatından keçir —
`grep -c "prisma\."` hamısında **0**.

| Qoruma | Route sayı |
| --- | --- |
| `withAdmin` | 5 |
| `withUser` | 14 |
| `withViewer` (anonim + istifadəçi, viewer servisə ötürülür) | 3 |
| Qorunmayan, İCTİMAİ məzmun (`isPublished` süzgəci ilə) | 7 — `content/pages` ×2, `faculties`, `faq`, `guide-places` ×2, `health` |
| Auth endpoint-ləri (öz qorumaları ilə) | 4 — `login` (rate-limit + `requireJson` CSRF), `register`, `logout`, `session` (`withUser`) |
| Sənəd | 1 — `openapi.json` |

Swagger sənədi Zod sxemlərindən TÖRƏYİR (`lib/api/openapi.ts`), yəni davranışdan
ayrılması mümkün deyil; `openapi.test.ts` route ↔ sənəd uyğunluğunu yoxlayır. ✓

---

## 2. Məxfilik tapıntıları

### 🔴 P1 — KRİTİK · `deleteMemory` moderasiya yolu AuditLog YAZMIR

**Yer:** `src/services/memory.service.ts:591` (`deleteMemory`)

**Problem.** Funksiya `canModerate(viewer, …)` ilə sinif moderatoruna
BAŞQASININ xatirəsini silmək icazəsi verir, amma tranzaksiyada AuditLog sətri
yaratmır. Qardaş funksiyalar — `deletePost` (`post.service.ts:869`) və
`deleteComment` (`post.service.ts:1074`) — yazır.

**Risk.** Moderator izsiz məzmun silir. Üstəlik funksiya bağlı `Post`-u da
soft-delete edir və `TimelineEntry`-ni silir (`memory.service.ts:626–632`), yəni
**postu `deleteMemory` üzərindən silmək `deletePost`-un auditini tamamilə yan
keçir.** Bu, layihənin öz yazılı qaydasının pozulmasıdır:

- `lib/visibility.ts:147` — «Hər çağırışda AuditLog yaz.»
- `services/report.service.ts:9` — «Moderator məzmuna `canModerate` yolu ilə
  çıxır və o yol AuditLog yazır.»
- DEVIR §6 — «moderasiya ayrı, auditli yoldur (`canModerate()` + məcburi
  `AuditLog`)».

**Düzəliş.** Moderasiya halında (`!isOwner && moderates`) tranzaksiyanın İÇİNDƏ,
məzmuna toxunmadan ƏVVƏL `recordAudit(tx, { action: MODERATE, entityType:
"MEMORY", … })` — `openModerationReview` ilə eyni sıra («iz əvvəl, məzmun
sonra»). Post da silinirsə `postId` metadata-ya yazılır ki, iki səth arasındakı
əlaqə jurnaldan görünsün. Sahibin öz silməsi moderasiya DEYİL — sətir yazılmır.
→ **T41**

**Test:** `tests/integration/memories.db.test.ts` → iki test: moderator silsə
sətir YARANIR (actor, entityType, metadata + «mətn daşımır» yoxlaması), sahib
silsə YARANMIR. Birincisi düzəlişdən əvvəl QIRMIZI idi.

---

### 🟠 P2 — ORTA · `avatarUrl` məxfilik açarı 8 səthdə SƏSSİZCƏ işləmir

**Yerlər:**

| # | Fayl:sətir | Səth |
| --- | --- | --- |
| 1 | `src/services/post.service.ts:144` | Lent — paylaşım müəllifi |
| 2 | `src/services/post.service.ts:389` | Şərh müəllifi |
| 3 | `src/services/memory.service.ts:116` | Xatirə müəllifi (siyahı, albom, detal) |
| 4 | `src/services/memory.service.ts:267` | Bələdçi məkanının xatirələri (**anonim ziyarətçiyə açıqdır**) |
| 5 | `src/services/achievement.service.ts:73` | Nailiyyət sahibi |
| 6 | `src/services/event.service.ts:164` | Tədbiri yaradan |
| 7 | `src/services/event.service.ts:513` | Tədbirin əlaqələndirici şəxsi |
| 8 | `src/services/notification.service.ts:66` | Bildiriş aktoru |
| 9 | `src/services/admin-users.service.ts:173` | Admin istifadəçi cədvəli |

**Problem.** `avatarUrl` `CONTROLLED_PROFILE_FIELDS`-in üzvüdür
(`visibility.ts:346`), `/me/privacy` panelində «Profil şəkli» kimi 4 səviyyəli
seçici ilə idarə olunur (`features/privacy/fields.ts:17`). Yuxarıdakı sorğular
onu XAM seçir və `redactProfile`-dan keçirmir.

**Risk.** `avatarUrl`-i `PRIVATE` edən istifadəçinin şəkli hər paylaşımında, hər
şərhində, hər xatirəsində, hər nailiyyətində və hər bildirişdə göstərilir —
yəni ayar praktikada heç bir yerdə işləmir. Bu, CLAUDE.md-nin «həmin məxfilik
açarı **SƏSSİZCƏ işləmir** — bu, ən təhlükəli səhv növüdür» xəbərdarlığının
məhz özüdür. №4 xüsusilə ağırdır: Xankəndi bələdçisi səhifəsi İCTİMAİDİR, yəni
şəkil autentifikasiyasız internetə çıxır.

**Niyə səhvdir, «qərar» deyil.** Layihənin öz müqaviləsi əksini deyir və üç
yerdə TƏTBİQ OLUNUB:
- `event.service.ts:599` — «`avatarUrl` İDARƏ OLUNAN sahədir
  (`CONTROLLED_PROFILE_FIELDS`), ona görə `redactProfile`-dan keçir»
- `cohort.service.ts:486` / `:583` — «Avatar da idarə olunan sahədir»
- `tests/integration/events.db.test.ts:568` — «🔒 avatarı gizlədilmiş
  iştirakçının şəkli qaytarılmır» testi ARTIQ mövcuddur

Yəni doğru davranış bilinir, sadəcə 8 səthdə tətbiq edilməyib.

**Düzəliş.** Yeni SAF modul `src/lib/author-card.ts`:
`AUTHOR_SELECT` (id, ad, soyad, avatarUrl, `memberships.cohortId`,
`fieldVisibility`) + `toAuthorCard(row, viewer)` → `redactProfile`. Doqquz
sorğunun `select`-i bu sabitlə əvəzləndi və nəticələr `toAuthorCard`-dan keçirildi.
Ad-soyad dəyişmir (mühərrik onu heç vaxt gizlətmir), yalnız `avatarUrl` `null`
ola bilir — UI onsuz da baş hərflərə düşür (`AvatarFallback`). → **T40**

⚪️ **İstisna saxlanıldı:** `listEventAttendees` / `exportEventAttendees`
(`event.service.ts:1303`) və `moderation.service.ts:105` (şikayətçi) — sənədli
İDARƏETMƏ / MODERASİYA axınlarıdır, `event.service.ts:1240`-da əsaslandırılıb.

Qalan `avatarUrl: true` seçimləri (`cohort.service` ×3, `user.service` ×4,
`event.service` → `ATTENDEE_USER_SELECT`, `admin-users.service`) YERİNDƏ
QALDI — onların hamısı elə həmin funksiyada `redactProfile`-dan keçir və ya
yalnız SAHİBƏ qaytarılır (`getProfileDraft`, `getOnboardingProgress`).

**Test:** `tests/integration/avatar-privacy.db.test.ts` (yeni, 10 test) — hər
səth üçün ayrı blok, üstəlik iki əks-yoxlama: **sahib** öz şəklini görür və
`UNIVERSITY` səviyyəsi autentifikasiya olunmuşa açıq, anonimə bağlı qalır
(redaksiya «hər şeyi gizlət» demək deyil).

---

### 🟠 P3 — ORTA · Aqreqasiya sayğacları tranzaksiyadan KƏNARDA (TOCTOU)

**Yer:** `src/services/stats.service.ts:251` (`getCareerOutcomeStats`),
`:215` (`countConsentedMembers`)

**Problem.** `fetchCareerStatsRows` (xanaların mənbəyi), `countConsentedMembers`
(`totalConsented`) və `cohortMembership.count` (`memberCount`) `Promise.all` ilə
**üç müstəqil snapshot** kimi oxunur. `countConsentedMembers`-in özü də iki ayrı
`groupBy`-dır.

**Risk.** Sorğular arasında bir istifadəçi `includeInStats`-ı söndürsə,
`respondentCount` ilə `totalConsented` UYĞUNSUZ cütlük verir («6 nəfərdən 7-si
razılıq verib»). Fərq ölçülə bilən siqnaldır: iki ardıcıl yükləmə arasında
razılığını geri götürən konkret şəxsin mövcudluğu şəffaflıq zolağından oxunur.
Layihənin öz qaydası bunu qadağan edir (DEVIR §5 — «TOCTOU müdafiəsi: sayım
tranzaksiya İÇİNDƏ»); `admin-users.service.ts:329` həmin qaydanı tətbiq edir,
`stats.service.ts` isə yox.

**Düzəliş.** Hər üç oxunuş `prisma.$transaction(async (tx) => …)` içinə alındı;
köməkçilər klienti birinci arqument kimi qəbul edir (`StatsClient =
Prisma.TransactionClient | PrismaClient`). Daxildəki `Promise.all`-lar da
ARDICIL `await`-lərə çevrildi: interaktiv transaksiyada paralel sorğular eyni
bağlantını paylaşmır və snapshot zəmanəti itərdi. → **T43**

**Test:** `src/services/stats.service.test.ts` (yeni) → üç struktur yoxlaması.
Yarış halını vaxta görə sınamaq qeyri-deterministikdir, ona görə qayda
`audit.service.test.ts`-in mənbə skanı üslubunda ölçülür: `$transaction`
mövcuddur, `getCareerOutcomeStats` gövdəsində `Promise.all` YOXDUR, köməkçilər
klienti arqument kimi alır. Mövcud `stats.db.test.ts` (cəm invariantı,
razılıq süzgəci) dəyişmədən yaşıl qalır.

---

### 🟡 P4 — AŞAĞI · `prisma.auditLog.create` birbaşa çağırılır (ağ siyahı atlanır)

**Yerlər:** `post.service.ts:871`, `post.service.ts:1076`,
`event.service.ts:784`, `event.service.ts:1139`, `event.service.ts:1483`,
`achievement.service.ts:476`

**Problem.** `audit.service.ts:58` `recordAudit`-i «TƏK YAZMA YOLU» elan edir və
yalnız o, `safeAuditMetadata()` AĞ SİYAHISINI tətbiq edir
(`admin-rules.ts:239`). Altı yer isə birbaşa `prisma.auditLog.create` çağırıb
`JSON.stringify(...)`-i əl ilə qurur — yəni ağ siyahı həmin sətirlərdə YOXDUR.

**Risk.** Hazırda yazılan dəyərlər təhlükəsizdir (id-lər və enum-lar), yəni AKTİV
sızma yoxdur. Amma qoruma mexanizmi sıradan çıxıb: bu sətirlərdən birinə
`body: post.body` əlavə edən növbəti dəyişiklik şikayət edilmiş `PRIVATE`
paylaşımın MƏTNİNİ `/admin/audit` səhifəsinə çıxarardı — `audit.service.ts:24–29`
məhz bunun qarşısını almaq üçün yazılıb.

**Düzəliş.** Altı çağırışın hamısı `recordAudit(tx, …)`-a keçirildi. Ağ siyahı
(`AUDIT_METADATA_KEYS`) real istifadə olunan açarlarla genişləndirildi:
`authorId`, `postId`, `memoryId`, `category`, `scope`, `statuses`, `recipients`
— hamısı id / enum / SAY, sərbəst mətn deyil.

⚠️ İki çağırış (`deletePost`, `deleteComment`, `notifyAttendees`) MASSİV
formalı `$transaction([...])` içindəydi; `recordAudit` `async` olduğu üçün onlar
İNTERAKTİV `$transaction(async (tx) => …)` formasına keçirildi. Atomiklik eynidir.

⚠️ **Bir açar adı dəyişdi:** `applyModeration` moderatorun qeydini `note`
açarı ilə yazırdı — ağ siyahıda belə açar yoxdur, yəni `recordAudit`-ə keçəndə
SƏSSİZCƏ atılardı. Qeyd `reason` açarına köçürüldü: ağ siyahıda sərbəst mətn
üçün nəzərdə tutulmuş MƏHZ o slotdur. Məlumat itmir (üstəlik qeyd sahibə
onsuz da Notification ilə çatdırılır), `/admin/audit` isə metadata-nı ümumi
şəkildə render edir. → **T42**

**Test:** `src/services/audit.service.test.ts` → «🔴 T42 — servis qatında
BİRBAŞA `auditLog.create` yoxdur» (bütün `*.service.ts` fayllarının mənbə skanı,
mövcud modul-ixrac testlərinin yanında).

---

### 🟡 P5 — AŞAĞI · `moderation.service.ts:381` — enum literalı

`visibility: target.visibility ?? "PRIVATE"` — `@/lib/enums`-dan gələn
`Visibility.PRIVATE` işlədilməli idi (CLAUDE.md §6). Davranış düzgündür
(fail-closed default), yalnız sabitin mənbəyi yanlışdır. **Düzəldilib.**

---

## 3. B bəndi — KUDS

| Grep | Nəticə |
| --- | --- |
| `#[0-9a-fA-F]{3,6}` (ui/ xaric) | ⚪️ 3 sənədləşdirilmiş istisna — aşağı |
| Şkaladan kənar spacing (`5,7,9,10,11,13,…`) | 🟡 **K1 — 3 pozuntu**, düzəldilib |
| `variant="secondary"` | **TƏMİZ ✓** (5 uyğunluğun hamısı «İŞLƏTMƏ» xəbərdarlıq şərhidir) |
| `text-secondary` (`text-text-secondary` deyil) | **TƏMİZ ✓** (3 uyğunluq — stil bələdçisinin qaydanı İZAH edən mətni) |
| `bg-success` / `bg-danger` / `bg-warning` | **TƏMİZ ✓** — 33 istifadənin hamısı yoxlandı: ağ mətn yalnız `-strong` fonunda (`danger-strong` 6.47:1), `warning` fonunda həmişə `text-text-primary` (6.78:1) |
| `rounded-(sm\|md\|lg\|xl)` | **TƏMİZ ✓** — tək uyğunluq şərhdir; ciddi regex (`rounded-(sm\|md\|lg\|xl)(["' ]\|$)`) sıfır nəticə |
| `shadow-(sm\|md\|lg\|xl)` | **TƏMİZ ✓** — 58 uyğunluğun hamısı `-kuds` sonluqludur (`\b` `shadow-sm-kuds`-a da düşür); ciddi regex sıfır nəticə |
| `react-icons` / `@heroicons` / `@radix-ui/react-icons` | **TƏMİZ ✓** — yalnız `lucide-react` |
| Enum literalları (`"PUBLIC"`, `"CLASS"`…) | 🟡 **K2 — 6 pozuntu**, düzəldilib |
| Arbitrary dəyərlər (`rounded-[`, `bg-[#`, `text-[`, `p-[`) | **TƏMİZ ✓** |
| `src/pages/` | **YOXDUR ✓** |
| `tailwind.config.js` | **YOXDUR ✓** (yalnız `.ts`) |

### 🟡 K1 — Şkaladan kənar spacing (3 yer) — düzəldilib

| Fayl:sətir | Əvvəl | Sonra | Səbəb |
| --- | --- | --- | --- |
| `src/features/timeline/TimelineEntryItem.tsx:49` | `pl-10` (40px) | `pl-12` (48px) | `h-8` nöqtədən sonra 16px boşluq — şkalada |
| `src/features/guide/GuideDirectory.tsx:145` | `gap-10` (40px) | `gap-12` (48px) | bölmələr arası — KUDS bölmə addımı |
| `src/features/profile/StoryHeader.tsx:53` | `-mt-10` (−40px) | `-mt-8` (−32px) | `sm:-mt-12` onsuz da şkaladadır; mobil avatar `h-20` üçün 32px örtüşmə |

### 🟡 K2 — Enum literalları (6 yer) — düzəldilib

| Fayl:sətir | Əvvəl | Sonra |
| --- | --- | --- |
| `src/services/moderation.service.ts:381` | `?? "PRIVATE"` | `?? Visibility.PRIVATE` |
| `src/features/kuds/ComponentSections.tsx:274,320,322,328,334,340` | `"CLASS"`, `"PUBLIC"`, `"UNIVERSITY"`, `"PRIVATE"` | `Visibility.*` |

`src/lib/routes.ts`-dəki `"PUBLIC"` **istisna deyil, başqa enum-dur**:
`RouteAccess = "PUBLIC" | "REQUIRE_AUTH" | "REQUIRE_ADMIN" | "REDIRECT_HOME"` —
görünürlük səviyyəsi ilə əlaqəsi yoxdur. ✓

### ⚪️ Sənədləşdirilmiş istisnalar (düzəliş TƏLƏB ETMİR)

1. **`src/app/global-error.tsx:37–71`** — inline `style` ilə 5 hex.
   Next.js `global-error.tsx` KÖK layout-u əvəz edir (öz `<html>`/`<body>`-sini
   render edir), yəni `globals.css` və Tailwind sinifləri YÜKLƏNMİR. Rənglər
   KUDS tokenlərinin eyni dəyərləridir və hər sətirdə şərhlə işarələnib.
2. **`src/features/kuds/tokens.ts`** — 18 hex. Bu, `/kuds` stil bələdçisinin
   TOKEN CƏDVƏLİDİR: səhifənin bütün mənası hex dəyərini kontrast nisbəti ilə
   birlikdə GÖSTƏRMƏKDİR. Rəng kimi işlədilmir, mətn kimi çap olunur.
3. **`#badges` / `/#faculties`** (`StyleGuide.tsx:30`, `WelcomeSection.tsx:13`)
   — anchor `href`-ləri, rəng deyil (grep-in yalançı müsbətləri).

---

## 4. C bəndi — `src/components/ui/` toxunulmazlığı (tarixçə ilə SÜBUT)

`scripts/git-audit.mjs`-dəki gəzmə məntiqi (`git.log({depth: Infinity})` →
`git.walk({trees:[git.TREE({ref})]})`, T37 qaydası ilə) yenidən işlədildi:
hər commit-də `src/components/ui/` altındakı hər faylın blob `oid`-i toplandı.

```
Tarixçə: 29 commit
Kök:  df5633e  chore: scaffold Next.js 15, Tailwind 3.4 and shadcn v2 with KUDS tokens
HEAD: 0a7ba5e  chore(repo): commit in-sync package-lock so a fresh clone can install

ui/ altında tarixçədə görünən fayl: 27
Scaffold-dan SONRA dəyişən fayl:    0
```

**27 faylın hamısı** (`accordion, avatar, badge, breadcrumb, button, calendar,
card, checkbox, command, dialog, dropdown-menu, form, input, label, pagination,
popover, radio-group, select, separator, sheet, skeleton, sonner, switch, table,
tabs, textarea, tooltip`) **scaffold commit-i `df5633e`-də yaranıb və 1 (bir)
blob versiyasına malikdir** — yəni heç biri sonradan redaktə edilməyib.

`git.statusMatrix` ilə işçi ağac da yoxlanıldı: **27 fayl, hamısı HEAD ilə
eynidir** — commit olunmamış dəyişiklik də yoxdur.

**Verdikt: ui/ TOXUNULMAZDIR ✓** — diff göstərməyə bir şey yoxdur, wrapper-ə
köçürüləcək dəyişiklik yoxdur.

---

## 5. Yeni tələ reyestri (T40–T43)

> T36–T39 Blok 11C-də (git push) işlədilib — nömrələmə oradan davam edir.

**T40 — `redactProfile` yalnız ÇAĞIRILDIĞI yerdə işləyir.**
`buildProfileView()` tam olsa da, idarə olunan sahə (`avatarUrl`) «müəllif
kartı» formasında onlarla ayrı `select`-də təkrarlanır və hər biri ÖZ redaksiyasını
tələb edir. Bir yerdə unudulsa məxfilik ayarı həmin səthdə səssizcə işləmir.
**Qayda:** istifadəçi sahəsi qaytaran hər yeni `select` `AUTHOR_SELECT` +
`toAuthorCard()`-dan keçməlidir; xam `avatarUrl: true` yazma.

**T41 — `canModerate()` qapısı ilə `AuditLog` izi EYNİ funksiyada olmalıdır.**
Qapı yazma əməliyyatı açırsa (silmə, gizlətmə, status dəyişməsi), audit sətri
həmin tranzaksiyada MƏCBURİDİR. `deleteMemory` qapını qoyub izi unutmuşdu.
UI bayrağı hesablayan `canModerate` çağırışları (oxu) istisnadır.

**T42 — `prisma.auditLog.create()` BİRBAŞA çağırılmamalıdır.**
`recordAudit()` yeganə yazma yoludur, çünki `safeAuditMetadata()` ağ siyahısı
YALNIZ orada tətbiq olunur. Birbaşa çağırış həmin qorumanı susduraraq gələcəkdə
məzmun sızmasına yol açır (jurnal `/admin/audit`-də göstərilir).

**T43 — Aqreqasiya şəffaflıq sayğacları eyni snapshot-dan gəlməlidir.**
`respondentCount` və `totalConsented` ayrı sorğulardan oxunursa razılığın
sorğular ARASINDA dəyişməsi uyğunsuz cütlük yaradır və fərdin varlığını
sızdırır. Sayım və məlumat oxunuşu `$transaction` içindədir.

---

## 6. 12B-yə qalan funksional borclar (BU BLOKDA TOXUNULMAYIB)

Audit gedişində yerləri təsdiqlənib, dəyişiklik edilməyib:

| Borc | Yer |
| --- | --- |
| T22 — `CardTitle` `<div>`-dir, heading semantikası yoxdur | `src/components/ui/card.tsx` (toxunulmaz) → wrapper `features/class-home/WidgetCard.tsx`, `components/shared/*` |
| `coverUrl` 21 idarə olunan sahə arasında deyil | `user.service.ts:191–196`, `getProfile:431` (hazırda `avatarUrl`-in görünürlüyünə bağlıdır) |
| Xəritədə zoom / pan yoxdur | `features/where-are-we-now/` |
| Donut chart kontrastı | `features/where-are-we-now/ChartFrame.tsx` və qrafiklər |
| Kuki banneri «Seçimlər» ekranı | `features/consent/CookieBanner.tsx` |
| İkinci dərəcəli kohortlar üçün rol redaktəsi | `admin-users.service.ts:393` (`changeCohortRole`) |
| CMS-də «yarat» (hazırda yalnız redaktə) | `admin-content.service.ts` |
| Toplu moderasiya · parol sıfırlama · `/admin/stats` kohort filtri | müvafiq admin səthləri |
| axe-core + Lighthouse auditləri | — |
