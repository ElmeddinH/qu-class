# STATE.md — bloklar arası kontekst

Hər blokun sonunda qısa, faktiki bölmə əlavə olunur: yeni servis funksiyaları,
yeni komponentlər, yeni sabitlər/tələlər, test sayları. Növbəti blok bunu oxuyur.

---

## Blok 6 — bitdi

**Yeni saf modullar (Prisma YOX, testlə örtülü):**
- `src/lib/directory-filters.ts` — 13 filtrin tərif cədvəli (`DIRECTORY_FILTERS`:
  açar · tip · URL parametri · **`profileField`**), `parseDirectoryParams`,
  `serializeDirectoryParams`, `directoryHref`, `DIRECTORY_PAGE_SIZE = 24`, `skipOf`.
- `src/lib/text-search.ts` — `textVariants` / `tokenizedContains` (T14 həlli).
- `src/lib/search.ts` — axtarışın MÜQAVİLƏSİ: `SearchResults`, `PALETTE_LIMIT = 5`,
  `SEARCH_PAGE_LIMIT = 20`, `MIN_SEARCH_LENGTH = 2`. Client bunu import edir,
  servisi YOX (əks halda Prisma client paketinə düşür).

**Yeni servis funksiyaları:**
- `user.service`: `listDirectory(viewer, {cohortId, filters, take, skip})` — 13 filtr,
  `listDirectoryFacets(viewer, {...})` — 12 facet qrupu (say + etiket), `searchUsers`.
- `post/event/achievement.service`: `searchPosts` · `searchEvents` · `searchAchievements`
  (hər biri öz mövcud görünürlük köməkçisindən keçir).
- `search.service`: `searchEverything` — YALNIZ kompozisiya, `prisma` importu yoxdur.
- `visibility.ts`: **`fieldVisibleWhere(viewer, field)`** — `redactProfile`-ın DB
  qarşılığı. Hər filtr cütlük qurur: dəyər + bu şərt (`filterClauses`-də bir yerdə).

**Yeni komponentlər:**
- `components/shared/MemberIdentity.tsx` — avatar+ad+rol bloku; `MemberCard` və
  `DirectoryCard` ORTAQ işlədir (dublikat yoxdur).
- `features/directory/`: `ClassDirectory` (server, facet+nəticə paralel),
  `DirectoryFilters` + `DirectoryActiveFilters` (client, nuqs), `filter-state.ts`,
  `DirectoryCard`, `DirectoryGrid` (+skeleton), `DirectoryPagination`, `labels.ts`.
- `features/search/`: `CommandPalette` (⌘K), `SearchScreen`, `useSearchQuery`, `catalog.ts`.
- Yeni səhifələr: `/class/[slug]/directory`, `/search`, `/api/search`.

**Yeni tələlər (növbəti bloklar üçün):**
- **T17 — filtr sızması:** gizlədilmiş sahəyə görə filtr/facet həmin sahəni açır.
  Yeni filtr → `profileField` yaz, şərt avtomatik gəlir.
- **T18 — `DashboardShell` provider tələb etməməli:** header `(app)` və `(admin)`
  qruplarında render olunur, `QueryClientProvider` isə yalnız `(app)`-dədir →
  palitrada TanStack Query 500 verirdi; adi `fetch` + `AbortController` işlədilir.
- **T19 — nuqs `shallow: false` + e2e:** URL dərhal dəyişir, nəticə serverdən sonra
  gəlir; `waitForURL`-dən dərhal sonra oxumaq KÖHNƏ dəyəri verir → `expect.poll`.
- `status` filtri `User.stage` keşinə GÖRƏ getmir — cohort tarixlərinə görə
  (`stageCohortWhere`, `resolveStage`-in DB qarşılığı).

**Testlər:** vitest **210** (əvvəl 150 → +60: `directory-filters` 28,
`text-search` 11, `directory.db` 21), playwright **28** (əvvəl 22 → +6).
`tsc --noEmit` · `lint` · `build` təmiz. `grep -rn "prisma\." src/app src/features`
→ yalnız şərhlər.

---

## Blok 7 — bitdi

**Yeni saf modullar (Prisma YOX, testlə örtülü):**
- `src/lib/labels.ts` — **T13 həlli**: bütün enum etiketlərinin VAHİD mənbəyi
  (`INDUSTRY_LABELS`, `DEGREE_LABELS`, `LANGUAGE_LEVEL_LABELS`+`_HINTS`,
  `COHORT_ROLE_LABELS`, `CLUB_ROLE_LABELS`, `STAGE_LABELS`, `SUPPORT_OFFER_LABELS`
  + `…Label()` köməkçiləri). `features/profile/labels.ts` SİLİNDİ; `class-home/catalog.ts`
  yalnız mərhələ İZAHI və rol QAYDALARINI saxlayır.
- `src/lib/relation-diff.ts` — əlaqə sahələrinin yazılma məntiqi:
  `diffUserTags` (create/update/remove, `level` itmir), `diffIdSet` (+`keep`
  mühafizə siyahısı), `changedVisibility` (yalnız DƏYİŞƏN səviyyələr yazılır).
- `src/lib/form-fields.ts` — ortaq Zod primitivləri (`isParsableDate`,
  `emptyToNull`, `optionalText/Url`, `yearField`); `features/feed/schemas.ts`
  onları yenidən ixrac edir.
- `lib/onboarding.ts` → `ONBOARDING_STEP_FIELDS`, `profileFieldAnchor`,
  `onboardingStepHref`.

**Yeni servis funksiyaları:**
- `user.service`: `getProfileDraft` · **`updateProfile`** (skalyar + taq + klub +
  görünürlük, TƏK transaksiya) · `listTagCatalog` · `listClubCatalog`.
  `buildProfileView`/`getProfile` indi `coverUrl` və `support` da qaytarır.
- `career.service` (YENİ): `getCareerWorkspace` · `create/update/delete
  CareerEntry` · eyni üçlük `EducationEntry` üçün · `updateSupportSettings`.

**Yeni komponentlər / səhifələr:** `features/profile/` → `ProfileStory`
(`ProfileDetail` əvəzinə), `StoryHeader`, `CareerTimeline`, `ProfileEditForm`,
`TagPicker`, `sections.ts`, `schemas.ts`, `actions.ts`; `profile/career/` →
`CareerManager`, `CareerEntryDialog`, `EducationEntryDialog`, `SupportOfferForm`,
`EntryConsentFields`. Səhifələr: `/me/edit`, `/me/career`.

**Qərarlar / tələlər:**
- **Taq YARADILMIR, seçilir.** `Tag.slug` `@@unique([type, slug])`-dur; sərbəst
  mətn kataloqu dublikatla doldurar və kataloq filtrini + facet saylarını +
  tanışlıq kartlarını eyni anda sındırardı. Naməlum taq → `UNKNOWN_TAG`.
- **T20 — `isCurrent` təkdir:** yeni cari karyera qeydi digərlərini keçmişə
  keçirir (`stats.service` cari SƏTİRLƏRİ sayır → iki cari iş bir nəfəri iki
  ölkədə göstərərdi). Təhsildə belə məhdudiyyət YOXDUR (səbəb servisdə).
- **T21 — səssiz açılma:** `/me/edit` 21 sahənin səviyyəsini birlikdə göndərir;
  `changedVisibility` dəyişməyənləri süzür, yoxsa toxunulmamış `phone` üçün də
  sətir yazılardı.
- **T22 — `CardTitle` `<div>`-dir**, heading DEYİL (shadcn primitivi, toxunulmaz)
  → e2e-də `getByRole("heading")` işləmir, mətnlə axtar.
- **T23 — `sr-only` radio kliklənmir:** `VisibilitySelector`-un input-u 1×1 px-dir
  və yapışqan header pointer hadisələrini tutur → testdə `<label>` kliklənir.
- Klub rəhbərliyi (BOARD/PRESIDENT) profil formasından atıla bilmir (iki qat:
  `keep` siyahısı + `role: MEMBER` şərti).
- `coverUrl` idarə olunan 21 sahəyə DAXİL DEYİL, amma `avatarUrl`-in
  görünürlüyünə bağlanıb; bu blokda redaktə olunmur (Blok 11 media işi).
- `vitest.config.ts` → **`fileParallelism: false`**: `profile.db.test.ts` YAZIR
  və `visibility.db.test.ts`-in qlobal aqreqasiya ölçmələrini yarıda dəyişirdi.

**Testlər:** vitest **300** (əvvəl 210 → +90: `relation-diff` 15, `labels` 22,
`profile/schemas` 28, `onboarding` +5, `profile.db` 20), playwright **32**
(əvvəl 28 → +4). İnteqrasiya testi seed-i snapshot/restore ilə BAYT-BAYT geri
qaytarır. `tsc --noEmit` · `lint` · `build` təmiz.

---

## Blok 7B — bitdi

**Git:** sistemdə `git` binarı yoxdur, parolsuz `sudo` da yoxdur → `isomorphic-git`
+ `scripts/git.mjs` (init/commit/log) ilə HƏQİQİ `.git` qovluğu yaradıldı. 7
bloklıq iş 10 mənalı commit-ə bölündü (scaffold → db → auth → privacy → feed →
class-page → directory → profile → test → docs), tarixlər ardıcıl artırılıb.

**Sxem (TƏK miqrasiya, `gw-inspired-additions`):**
- `CareerEntry.jobFunction` — `position`-un sərbəst mətnindən FƏRQLİ,
  aqreqasiya üçün normallaşdırılmış rol (14 dəyər, `lib/enums.ts` →
  `JOB_FUNCTION_VALUES`, etiketlər `lib/labels.ts` → `JOB_FUNCTION_LABELS`).
- `Memory.guidePlaceId` → `GuidePlace` (SetNull) — "sevimli yer" xatirəsi,
  M9↔M3 körpüsü. `MemoryType`-a TOXUNULMADI (spec §11, 8 növ sabit qalır).
- Seed: `POSITION_JOB_FUNCTIONS` sabit xəritə (T6 — pick/cycle yox, artıq
  seçilmiş `position`-un funksiyası); `GuidePlace` yaradılması Memory-dən
  ƏVVƏLƏ köçürüldü (FK). ~40% Memory `i % 5 < 2` ilə deterministik bağlanır.
  İki ardıcıl seed = eyni nəticə (yoxlanıldı).

**Servis hazırlığı (UI YOX):**
- `stats.service.getWhereAreWeNowStats` → `jobFunctions` xanası, `industries`
  ilə EYNİ üç qat (görünürlük + `includeInStats` + k-anonimlik).
- `memory.service.listMemories` → `guidePlaceId?` filtri, mövcud
  `activeVisibleWhere`-in YANINDA (arxa qapı yoxdur).

**Testlər:** vitest **307** (+7: `labels` jobFunction əhatəsi,
`visibility.db` +7 — jobFunctions k-anonimlik/razılıq, guidePlaceId sızma
yoxlaması). `tsc --noEmit` · `lint` · `build` təmiz, mövcud 300+28 test yaşıl.

---

## Blok 8 — bitdi

**Yeni saf modullar (Prisma YOX, testlə örtülü):** `lib/milestones.ts`
(`buildCohortMilestones` — cohort tarixlərindən 4 növ milestone, deterministik
`mil-<cohortId>-<açar>` id, gələcək tarixli qeyd YARADILMIR, görünürlük
`UNIVERSITY`), `lib/timeline-filters.ts` və `lib/achievement-filters.ts`
(parse ↔ serialize ↔ href dövrəsi), `fanout.ts` →
**`buildAchievementTimelineEntry`** (+ `ACHIEVEMENT_TIMELINE_CATEGORY`).

**Yeni servis funksiyaları:** `timeline.service` → `ensureCohortMilestones`
(upsert + siyahıda olmayan milestone-ları silir; səhifənin server
komponentindən çağırılır), `listTimeline` indi `sourceType` filtri və `total`
qaytarır. `achievement.service` → `listFeaturedAchievements` ·
`getAchievementStats` · `countAchievements` · **`listModerationQueue`** ·
`verify/feature/rejectAchievement` (tək transaksiya: status + AuditLog +
Notification + TimelineEntry upsert/delete). `visibility.ts` →
`canModerateCohort` (resurs deyil, sinif səviyyəsi; `canModerate` ona delegat).

**Üç tələnin həlli:**
- **A** — moderasiya növbəsi AYRI funksiyadır. `listAchievements` status filtrini
  yalnız sahibə tətbiq etmir, yəni moderator başqasının `SUBMITTED` qeydini
  orada görmür; `listModerationQueue` rol qapısı (`canModerateCohort`) + status
  şərti ilə işləyir, görünürlük filtri yoxdur. Bayraq kimi birləşdirilməyib.
- **B** — milestone-un `postId`/`achievementId`/`eventId` üçü də `null` olduğu
  üçün `timelineVisibilityWhere` sahib şaxəsinə düşmür → görünürlük
  `UNIVERSITY`, `PRIVATE` ola bilməz (unit + inteqrasiya testi).
- **C** — `ARCHIVED` sətri saxlayır (cascade yoxdur) → eyni transaksiyada
  `timelineEntry.deleteMany({ achievementId })`. Təsdiqdə isə `create` deyil,
  **`upsert`** (T11: `achievementId` @unique).

**Yeni komponentlər / səhifələr:** `components/shared/PagerNav` (Blok 6-nın
səhifələmə məntiqi ora çıxarıldı, `DirectoryPagination` nazik təbəqəyə çevrildi);
`features/timeline/` → `ClassTimeline`, `TimelineFilters`(+`filter-state`),
`TimelineEntryItem`; `features/achievements/` → `ClassAchievements`,
`AchievementCard`, `AchievementFilters`, `ModerationQueue`, `ModerationActions`,
`actions.ts`. Səhifələr: `/class/[slug]/timeline`, `/class/[slug]/achievements`,
`/class/[slug]/achievements/moderation` (üçü də `force-dynamic`).
`lib/labels.ts` → `ACHIEVEMENT_STATUS_LABELS`, `TIMELINE_SOURCE_LABELS`.
Blok 5 widget-ləri milestone / FEATURED üçün vizual fərqləndirmə aldı.

**Qərar:** SEED artıq milestone-ları ƏL İLƏ qurmur — `buildCohortMilestones`
seed-in də mənbəyidir. Əks halda servisin ilk çağırışı öz sətirlərini yazar,
seed-inkilər isə fərqli id ilə DUBLİKAT kimi qalardı. Baza yenidən seed
edildi (21 milestone, hamısı `UNIVERSITY`, gələcək tarixli yoxdur).

**Testlər:** vitest **373** (əvvəl 307 → +66: `milestones` 18,
`timeline-filters` 14, `fanout` +11, `timeline.db` 23), playwright **38**
(əvvəl 32 → +6). İnteqrasiya və e2e testlərinin yazdığı hər sətir `finally`-də
geri qaytarılır — baza sayları seed-lə bayt-bayt eynidir.
`tsc --noEmit` · `lint` · `build` təmiz; `grep -rn "prisma\." src/app src/features`
→ yalnız şərhlər.

---

## Blok 9 — bitdi

**Yeni saf modullar (Prisma YOX, testlə örtülü):**
- `src/lib/event-filters.ts` — spec §15-in **6 filtri** (`when` · `category` ·
  `scope` · `faculty` · `club` · `format`) + səhifə; `parseEventParams` ↔
  `serializeEventParams` dövrəsi, `classEventsHref`, `upcomingFlagOf`,
  `isOnlineFlagOf`. Üstəlik koordinator cədvəlinin AYRI URL vəziyyəti
  (`ATTENDEE_PARAMS` = `q` / `st` / `ap` — tədbir siyahısının `page`-i ilə
  toqquşmasın).
- `src/lib/rsvp.ts` — RSVP qaydaları: `SEAT_HOLDING_RSVP_STATUSES`,
  `resolveRsvpDecision` (niyyət → status), `isFull` / `seatsLeft`,
  `summarizeRsvps`, `attendanceRate`, `averageRating`, `canLeaveFeedback`.
- `src/lib/ics.ts` — RFC 5545: `buildIcsCalendar`, `escapeIcsText`,
  `foldIcsLine` (75 OKTET, simvol yox), `toIcsDateTime`, `icsFileName`.
- `src/lib/csv.ts` — `buildCsv` / `escapeCsvCell` / `csvFileName` +
  **`CSV_BOM_BYTES`**.
- `src/utils/slug.ts` — `asciiSlug`: azərbaycan hərflərini transliterasiya edir
  ("Görüş" → "gorus"); sadəcə atsaydıq fayl adı "g-r" olardı.
- `features/feed/fanout.ts` → **`buildEventTimelineEntry`** +
  `EVENT_TIMELINE_CATEGORY` (`Record<EventCategory, PostCategory>`).

**Yeni servis funksiyaları (`event.service.ts`):** `countEvents` ·
`listEventFacets` · `getEventDetail` · `canManageEvent` · `createEvent` ·
`rsvpToEvent` · `submitEventFeedback` · `addEventPhotos` / `removeEventPhoto` ·
`addEventToTimeline` / `removeEventFromTimeline` · `listEventAttendees` ·
`exportEventAttendees` · `confirmRegistration` · `checkInAttendee` ·
`notifyAttendees` · `completeEvent` · `getEventReport` · `getEventForCalendar` ·
`listContactOptions`. `academic.service` → `listFacultyOptions`.
`utils/date.ts` → `toLocalDateTimeValue` / `toLocalDateValue` (feed/format-dan
köçdü — `features/*` bir-birindən import etməməlidir).

**Yeni komponentlər / səhifələr:** `features/events/` → `ClassEvents`,
`EventCard`, `EventComposer` (13 sahə), `EventFilters` + `EventActiveFilters`,
`filter-state.ts`, `EventDetail`, `RsvpPanel`, `EventAlbum`, `FeedbackForm`,
`AttendanceChart` (Recharts), `MarkdownAgenda`, `TimelinePublishCard`,
`catalog.ts`, `schemas.ts`, `actions.ts`, `types.ts`;
`features/events/manage/` → `EventManager`, `AttendeeTable`, `BulkNotify`,
`CompleteEventForm`, `EventReport`, `PrintButton`.
Səhifələr: `/class/[slug]/events`, `/events/[id]`, `/events/[id]/manage`,
`/events/[id]/report`, `/api/events/[id]/ics` (hamısı `force-dynamic`).
`lib/labels.ts` → `EVENT_SCOPE_LABELS`, `EVENT_CATEGORY_LABELS`,
`EVENT_STATUS_LABELS`, `RSVP_STATUS_LABELS` + `…Label()`.
`globals.css` → `--chart-*` dəyişənləri (Recharts `fill` propuna Tailwind sinfi
qəbul etmir; `#` yenə komponentə düşmür).

**Düzəldilən üç səhv:**
- **`EVENT_MANAGER_ROLES` (`lib/enums.ts`) — VAHİD MƏNBƏ.** Əvvəl
  `class-home/catalog.ts` siyahıya `CLASS_MODERATOR`-u da salırdı, server
  qapısı isə salmırdı: moderator "Yeni tədbir" düyməsini GÖRÜRDÜ, kliklədikdə
  403 alırdı. İndi UI, səhifə qapısı və servis eyni sabitdən oxuyur.
- **`attendingCount` ≠ xam RSVP sayı.** `createEvent` sinfin hər üzvünə
  `INVITED` sətri yaradır; xam `_count.rsvps` işlədilsəydi 20 nəfərlik sinifdə
  15 yerlik tədbir DƏRHAL "tutum dolub" görünərdi. `_count` indi
  `SEAT_HOLDING_RSVP_STATUSES` ilə süzülür.
- **CSV BOM MƏTNDƏ DEYİL, BAYTDA.** `buildCsv` çıxışına `"﻿"` simvolu
  əlavə olunurdu və endirilən faylda İTİRDİ (unit test `startsWith(UTF8_BOM)`
  ilə yazıldığı üçün səhvi tutmurdu). İndi `CSV_BOM_BYTES` `Blob`-a bayt kimi
  verilir, test isə kod nöqtəsini yoxlayır.

**Yeni tələlər (növbəti bloklar üçün):**
- **T24 — `/events` İKİ route qrupundadır.** `(public)/events` (Blok 11,
  ictimai siyahı) və `(app)/events/[id]`. Route qrupu URL-də görünmür, prefiks
  uyğunluğu ikisini də tutardı → `routes.ts`-də **`PUBLIC_EXACT_PATHS`**
  istisnası (yalnız DƏQİQ bərabərlik). Blok 11-də `(public)/events/page.tsx`
  yaradılanda əlavə iş LAZIM DEYİL.
- **T25 — eyni səhifədə iki «Kateqoriya» etiketi.** Kompozitorda və filtr
  panelində. `EventComposer`-in `<form>`-una `aria-label="Yeni tədbir formu"`
  verilib; e2e seçicisi ora daraldılır (strict mode pozuntusu idi).
- **İştirakçı cədvəlində `redactProfile` YOXDUR — QƏSDƏN.** Bu, idarəetmə
  axınıdır (Blok 8-dəki moderasiya növbəsi ilə eyni məntiq): koordinator
  qeydiyyatı təsdiqləmək üçün e-poçtu görməlidir. Çıxış YALNIZ rol qapısından
  keçən iki səhifədə işlədilir. Detal səhifəsindəki avatar zolağı isə tam
  `redactProfile`-dan keçir.
- **Cədvəldə çeşidləmə/səhifələmə client-dədir, süzgəc serverdə.** Bir tədbirin
  iştirakçıları onlarladır və hamısı onsuz da koordinatora açıqdır — CLAUDE.md
  §5-in qadağası (JS-də FİLTRLƏMƏ) pozulmur, axtarış və status filtri DB-dədir.
- **Hesabatdakı rəylər ANONİMDİR** — `getEventReport` müəllif adını
  ÜMUMİYYƏTLƏ qaytarmır.
- **Reunion YALNIZ `scope = REUNION`.** `EventCategory`-də belə dəyər yoxdur və
  `labels.test.ts` iki siyahının KƏSİŞMƏDİYİNİ bərkidir. Vizual fərq
  (`ku-cream` accent) `EventCard`, `EventDetail`, `UpcomingEvents` və
  `Reunions` widget-lərindədir.

**Testlər:** vitest **540** (əvvəl 373 → +167: `event-filters` 30, `rsvp` 31,
`ics` 26, `csv` 19, `routes` 13, `labels` +3, `fanout` +12, `events.db` 33),
playwright **44** (əvvəl 38 → +6). İnteqrasiya və e2e testlərinin yazdığı hər
sətir təmizlənir — baza sayları seed-lə bayt-bayt eynidir (event 25, RSVP 459).
`tsc --noEmit` · `lint` · `build` təmiz.

---

## Blok 9 — əlavə (B2 bəndi + ağ ekran hesabatı)

**1. İctimai naviqasiya artıq 404 vermir.** `PUBLIC_NAV` və `FOOTER_NAV`-dakı
bütün linklər (`/about`, `/faculties`, `/campus-life`, `/khankendi`, `/faq`,
`/events`, `/history`, `/mission`, `/newcomers`, `/clubs`, `/services`,
`/khankendi/*`) açılış səhifəsinin anchor-larına yönəldilib.
- Vahid mənbə: `layouts/nav.ts` → **`LANDING_SECTIONS`** + `landingAnchor(id)`.
  `(public)/page.tsx` bölmələri MƏHZ bu massivdən render edir, yəni `id` ilə
  `href` heç vaxt ayrıla bilməz.
- **`/events` → `/#events`** (5-ci bölmə «Qarşıdan gələn tədbirlər»).
  ⚠️ `routes.ts` → `PUBLIC_EXACT_PATHS`-dəki `/events` istisnası SAXLANILIB.
  **Blok 11-də real `(public)/events/page.tsx` gələndə yalnız `nav.ts`-dəki
  `href` geri qaytarılacaq** — istisnaya toxunmaq lazım deyil.
- `PublicShell` footer açarı `href` → `label` oldu: bir neçə link eyni bölməyə
  baxır və `href` dublikat açar verirdi.
- `PublicNav` → anchor linki heç vaxt "aktiv" işarələnmir (altı linkin hamısı
  `/`-a baxır; biri seçilsəydi qalanı da eyni haqqa malik olardı).

**2. Ağ ekran / «səhifə açılmır» — səbəb və həll.**
**Səbəb tapıldı və TƏKRARLANDI: köhnəlmiş dev server (HMR) vəziyyəti.**
Blok 9-da ~30 yeni fayl, o cümlədən yeni marşrutlar (`/events/[id]`,
`/events/[id]/manage`) və kök səviyyəli XÜSUSİ fayllar (`error.tsx`,
`not-found.tsx`) əlavə olundu. Uzun müddət işləyən `next dev` bunları HMR ilə
təmiz götürmür: `dev-smoke.spec.ts` həmin serverdə **«Daxil ol»-dan sonra
`waitForURL` ilə TAXILDI** (istifadəçinin şikayəti ilə eyni simptom), server
yenidən başladıldıqdan sonra isə ARDICIL ÜÇ dəfə yaşıl keçdi.

**Həll: `npm run dev`-i yenidən başlat** (`predev` 3000 portunu özü boşaldır).
Şübhə qalarsa `.next/` qovluğunu sil. Bloklar arasında dev serveri yenidən
başlatmaq qaydaya çevrilməlidir — yeni route qovluğu və kök `error.tsx` /
`not-found.tsx` faylları isti yenilənmə ilə etibarlı qoşulmur.

Kod tərəfində səhv tapılmadı: 5 seed hesabının hamısı təmiz brauzer
kontekstində giriş edir, `/home` düzgün yönləndirir, dev logunda xəta yoxdur.

Bununla belə **əsl boşluq tapıldı: layihədə heç bir xəta sərhədi yox idi.**
Əlavə olundu:
- `src/app/error.tsx` — seqment sərhədi, `reset()` düyməsi + `digest` kodu.
- `src/app/global-error.tsx` — ROOT LAYOUT xətası (`error.tsx` onu tuta bilmir).
  ⚠️ `<html>`/`<body>`-ni özü yazır və stil `style` atributundadır: layout
  render olunmadığı üçün Tailwind sinifləri etibarlı deyil. CLAUDE.md §2-nin
  (hardcode rəng yoxdur) YEGANƏ və sənədləşdirilmiş istisnası.
- `src/app/not-found.tsx` — azərbaycanca 404. Blok 9 `notFound()`-u geniş
  işlədir (tədbir detalı, koordinator paneli, hesabat), əvvəl Next-in
  ingiliscə defolt ekranı çıxırdı.

**T26 — `(app)/loading.tsx` ƏLAVƏ ETMƏ.** Qrup səviyyəsində `loading.tsx`
sınandı və GERİ ÇIXARILDI: o, seqmenti Suspense-ə bükür, cavab başlıqları
(HTTP 200) səhifə komponentindən ƏVVƏL flush olunur və `notFound()` artıq
statusu 404-ə dəyişə bilmir. `events.spec.ts` → «adi üzv koordinator panelinə
DÜŞMÜR» testi məhz bunu tutdu (200 gəldi, 404 gözlənilirdi). Skelet ehtiyacı
onsuz da ödənilib — `ClassEvents`, `ClassAchievements`, `ClassTimeline` və
`ClassDirectory` öz `Suspense` sərhədlərini daşıyır.

**Testlər:** playwright **48** (44 → +4: `public-nav.spec.ts` — hər naviqasiya
linki ya 200 səhifədir, ya da açılışda MÖVCUD anchor; «Tədbirlər» linki ayrıca;
hər bölmə başlıqla render olunur; naməlum ünvan azərbaycanca 404 verir).
vitest **540** dəyişməyib. `tsc` · `lint` · `build` təmiz.

---

## Blok 9S — bitdi (sprint gate: REST API + OpenAPI/Swagger + Landing)

⚠️ Bu blok PLAN.md-də YOXDUR — sprint deadline-ı üçün əlavə olunub. Blok 10A/10B
və 11 bundan SONRA gəlir. Plan sırası qəsdən dəyişdirilib.

### `/api/v1` — 18 endpoint

**Auth:** `POST /auth/register` (201) · `POST /auth/login` (200 + kuka) ·
`POST /auth/logout` (204) · `GET /auth/session` (anonimdə **200 + `data: null`**).
**İctimai** (viewer ALMIR): `GET /health` · `/faculties` · `/content/pages?section=` ·
`/faq` · `/guide-places?category=`.
**Sinif** (kuka MƏCBURİ): `GET /cohorts` · `/cohorts/{slug}` ·
`/cohorts/{slug}/members` (13 filtr) · `/posts` (kursor) · `/timeline` (3 filtr) ·
`/achievements` · `/cohorts/{slug}/events` (6 filtr).
**Qalan:** `GET /events/{id}` · `GET /search?q=` · `GET /openapi.json`.

### `src/lib/api/` quruluşu (beş fayl)

- `errors.ts` — 7 xəta kodu + `Record<ApiErrorCode, number>` status və mesaj
  cədvəlləri (yeni kod əlavə edən adam cədvəli doldurmağı unutsa `tsc` dayanır).
- `respond.ts` — `ok` / `created` / `noContent` / `fail` + `unauthenticated` /
  `notFound` / `forbidden`. **v1 altında `NextResponse.json` BİRBAŞA çağırılmır** —
  yoxsa OpenAPI-dəki zərf yalan olur.
- `guard.ts` — `withViewer` / `withUser` / `requireJson` / `parseJsonBody` /
  `parseQuery` + `azErrorMap` (Zod-un ingiliscə mesajlarını əvəz edir).
- `rate-limit.ts` — login cəhd sayğacı (e-poçt+IP, 10 dəq / 5 cəhd).
- `cohort-scope.ts` — `resolveCohortScope`: icazəsiz VƏ mövcud olmayan sinif üçün
  EYNİ 404.
- `schemas.ts` + `openapi.ts` — sənədin mənbəyi (aşağıda).

### OpenAPI Zod-dan TÖRƏYİR — mexanizm

`schemas.ts` `extendZodWithOpenApi(z)` çağırır və MÖVCUD sxemləri işlədir:
`features/auth/schemas.ts` (`universityEmailSchema`, `passwordSchema`,
`loginSchema`), `lib/enums.ts` (bütün enum siyahıları), `lib/search.ts`
(limitlər), `lib/constants.ts` (domen). `openapi.ts` `OpenAPIRegistry`-ə yolları
yazır, `OpenApiGeneratorV3` sənədi qurur, `/api/v1/openapi.json` (`force-static`)
onu verir.

**Query parametrləri DƏ törəmədir:** `DIRECTORY_FILTERS` (13 filtr),
`TIMELINE_PARAMS`, `ACHIEVEMENT_PARAMS`, `EVENT_PARAMS` — adlar sənədə həmin
modullardan gəlir. UI-a yeni filtr əlavə edilsə sənəd özü yenilənir.

### Yeni tələlər (növbəti bloklar üçün)

- **T27 — `RouteConfig.parameters` massivinə ZOD QOYMA.** O sahə xam OpenAPI
  `ParameterObject` gözləyir; Zod sxemi ÇEVRİLMİR və sənədə `{"_def": …}` daxili
  Zod strukturu düşür. Generasiya SINMIR, Swagger UI parametri "boş" göstərir.
  Düzgün yol: `request: { params, query }` Zod obyektləri + `.openapi({ param:
  { description } })`. `openapi.test.ts` → «sənəddə XAM ZOD obyekti YOXDUR».
  ⚠️ Yol parametrini `request.params` VƏ `parameters`-də İKİ DƏFƏ elan etmə —
  OpenAPI-də dublikat parametr etibarsızdır (bu da testlə bərkidilib).
- **T28 — `signIn`-dən SONRA `getViewer()` İŞLƏMİR.** Auth.js kukini CAVAB
  başlıqlarına yazır, `auth()` isə SORĞU kukilərini oxuyur → eyni sorğuda viewer
  hələ anonimdir və login 500 verirdi. Həll: `services/auth.service.ts` →
  **`getAuthenticatedSummary(email)`** (yalnız uğurlu `signIn`-dən sonra
  çağırılmalıdır).
- **T29 — vitest `next-auth`-u INLINE etməlidir.** `vitest.config.ts` →
  `server.deps.inline: ["next-auth", "@auth/core"]`. Bunsuz
  `next-auth/lib/env.js` → `import "next/server"` Node resolver-ində sınır
  (*Did you mean "next/server.js"?*) və route handler-ləri import edən HEÇ BİR
  test işləmir.
- **T30 — ESLint `public/` qovluğunu ÖZÜ görür.** `.gitignore` ESLint-ə təsir
  ETMİR: `public/swagger/` (1.5 MB minifikasiya olunmuş bundle) `npm run lint`-ə
  165 xəta + 3280 xəbərdarlıq gətirirdi. `eslint.config.mjs` → `ignores`-a
  `public/swagger/**` əlavə olundu.
- **Vaxt kanalı bağlandı.** `src/auth.ts` → `equalizeFailureTiming()`: istifadəçi
  tapılmasa da bcrypt müqayisəsi işlədilir (əvvəl mövcud olmayan e-poçt ~1 ms,
  mövcud olan ~80 ms cavab verirdi — mətn eyni olsa da MÜDDƏT sızdırırdı).
  Hash tənbəl qurulur və keşlənir.
- **`SESSION_COOKIE_NAME` `auth.config.ts`-dədir və AUTHORITATIVDİR.** Sabit
  yalnız ixrac edilmir — `authConfig.cookies.sessionToken.name` MƏHZ onu
  işlədir, yəni sənəddəki `cookieAuth` adı təxmin deyil. HTTPS-də `__Secure-`
  prefiksi `AUTH_URL` sxeminə görə əlavə olunur.

### Qərarlar (müdafiədə soruşula bilər)

- **v1 qatı UI-dan DAHA MƏHDUDDUR.** `(app)/class/[slug]/*` səhifələri yalnız
  cohort-un MÖVCUDLUĞUNU yoxlayır və üzv olmayana boş siyahı göstərir; v1 isə
  404 qaytarır (`cohort-scope.ts`). Səbəb: API xarici inteqrasiya səthidir və ən
  az səlahiyyət prinsipi ilə işləyir. Fərq README-də və sənəddə yazılıb.
- **Qeydiyyat REST-də AVTOMATİK GİRİŞ ETMİR.** Server Action variantı edir (forma
  istifadəçini `/home`-a aparmalıdır), REST müştərisi isə açıq `POST /auth/login`
  addımı gözləyir.
- **`/search` qısa sorğuda 422 verir**, köhnə `/api/search` isə BOŞ NƏTİCƏ
  (palitra hər hərfdə çağırır, orada xəta göstərmək olmaz).
- **401 HƏR əməliyyatda sənədləşdirilib** — v1-in xəta zərfi vahiddir və müştəri
  tək error handler yazır. İctimai endpoint-lərdə cavabın TƏSVİRİ "praktikada
  qaytarılmır" deyir; forma sənədləşdirilir, davranış zəmanəti verilmir.
- **Rate limit TƏK PROSES üçündür** (modul səviyyəsində `Map`). Horizontal
  scale-də Redis lazımdır — şərhdə açıq yazılıb. Alternativ (cəhdləri DB-yə
  yazmaq) brute-force-u DB-yə yönləndirərdi.

### Landing / Home səhifəsi

`(public)/page.tsx` NAZİKDİR → `features/welcome/WelcomePage.tsx`.
**Doqquz bölmə:** Hero (`<h1>`, ku-dark→ku-green gradient, «Daxil ol» primary +
«Qeydiyyat» outline) · `about` (`listContentPages(UNIVERSITY)`) · `faculties`
(akkordeon, `listRegistrationCatalog`) · `numbers` (StatCard zolağı) ·
`campus-life` (`listContentPages(CAMPUS)`) · `events` (`listEvents(ANONYMOUS)`) ·
`khankendi` (3 GuidePlace) · `faq` (akkordeon, 6 sual) · bağlanış CTA.

- 🔴 **Səhifə ANONİM viewer ilə oxuyur** — hətta giriş etmiş istifadəçi üçün də.
  `getViewer()` ÇAĞIRILMIR, `ANONYMOUS` sabiti ötürülür. Bu, "girişdən sonra
  açılışda sinif postu göründü" sızmasını STRUKTUR olaraq bağlayır.
- ⚠️ **«Qarşıdan gələn tədbirlər» bölməsi BOŞ HALDA DA render olunur** (EmptyState
  ilə). Sprint tapşırığı "boşdursa gizlət" deyirdi, amma bölmə həm də `/#events`
  naviqasiya linkinin HƏDƏFİDİR: gizlətsək link mövcud olmayan anchor-a apararlı
  (404-dən pisdir, çünki səssizdir) və `public-nav.spec.ts` qırılardı. Qərar
  komponentin şərhində yazılıb.
- ⚠️ **`campus-life` bölməsi tapşırıqdaki 8 bölmə siyahısında YOX İDİ**, amma
  `LANDING_SECTIONS`-də var və `PUBLIC_NAV`/`FOOTER_NAV`-dan ona link gedir →
  buraxılsaydı naviqasiya sınardı. Əlavə olundu (`ContentPage` CAMPUS bölməsi).
- ⚠️ **«Rəqəmlərlə» ilə akkordeon fərqli sayır və bu, QƏSDƏNDİR:**
  `getStructureCounts()` BÜTÜN fakültələri sayır (4), `listRegistrationCatalog()`
  isə yalnız cohort-u OLANLARI göstərir (3). Akkordeonun üstündə izah sətri var
  — iki sorğunu "uyğunlaşdırmaq" yanlış olardı, çünki qeydiyyat forması eyni
  kataloqu işlədir.
- **Yeni servis funksiyaları:** `content.service` → `listFaqs` · `listGuidePlaces`;
  `academic.service` → `getStructureCounts`; `cohort.service` →
  `listViewerCohorts`; `auth.service` → `getAuthenticatedSummary`.
  `lib/labels.ts` → `FAQ_CATEGORY_LABELS`, `GUIDE_CATEGORY_LABELS` + `…Label()`.

### nav.ts — anchor vəziyyəti DƏYİŞMƏYİB

`PUBLIC_NAV` və `FOOTER_NAV` linkləri hələ də `LANDING_SECTIONS` anchor-larıdır
(Blok 9 əlavəsində belə qurulub). **Blok 11-də real səhifələr (`/about`,
`/faculties`, `/campus-life`, `/khankendi`, `/faq`, `/events`) gələndə yalnız
`nav.ts`-dəki `href`-lər geri qaytarılacaq** — bölmələr və `id`-lər qalır,
`routes.ts` → `PUBLIC_EXACT_PATHS`-dəki `/events` istisnasına toxunmaq lazım
deyil. `/docs` linki `FOOTER_NAV`-a YAZILMADI (auditoriyası fərqlidir) —
`PublicShell` alt zolağındadır.

### Swagger UI

`scripts/copy-swagger.mjs` üç aktivi (`swagger-ui.css`,
`swagger-ui-bundle.js`, `swagger-ui-standalone-preset.js`) `public/swagger/`-ə
köçürür; `predev` / `prebuild` hook-ları onu özü işlədir, `.gitignore` isə
qovluğu repodan kənarda saxlayır (törəmədir). **CDN İŞLƏDİLMİR** — müdafiə
otağında internet olmaya bilər (e2e testi xarici sorğu olmadığını yoxlayır).
`features/docs/ApiDocs.tsx` → `withCredentials: true` (bunsuz «Try it out»
sessiya kukisini GÖNDƏRMİR və hər qorunan endpoint 401 verər),
`persistAuthorization: true`, standalone preset-in üst paneli `.slice(1)` ilə
atılır (URL sahəsi demoda footgun-dur).

**Brauzerdə yoxlanıldı:** `/docs` → «Try it out» ilə `POST /auth/login` real
cavab verir, ardından `GET /cohorts` **200** qaytarır (kuka işləyir), brauzer
konsolunda xəta yoxdur.

### Testlər

vitest **791** (əvvəl 540 → +251: `api/respond` 22, `api/rate-limit` 15,
`api/openapi` 167, `api.db` 47). playwright **84** (əvvəl 48 → +36:
`landing.spec` 20, `api.spec` 10, `api-docs.spec` 6).
`auth.spec.ts`-dəki bir gözləmə yeniləndi (açılış `<h1>`-i placeholder-dən əsl
dəyər təklifinə keçdi).
`tsc --noEmit` · `lint` · `build` (prebuild hook ilə) təmiz.
`grep -rn "prisma\." src/app src/features` → yalnız şərhlər.
İnteqrasiya və e2e testlərinin yazdığı hər sətir geri qaytarılır — **28 cədvəlin
sayları seed-lə bayt-bayt eynidir** (yoxlanıldı: test dəstindən sonraki sayğaclar
təzə seed ilə identikdir).

### Qalan borc

- Moderasiya növbəsi, RSVP, paylaşım yaratmaq və digər YAZMA əməliyyatları v1-də
  YOXDUR — bu blok OXU səthini və auth-u verdi.
- `/docs` səhifəsi auth arxasında deyil; istehsalda sənədi bağlamaq lazım olsa
  `routes.ts` → `APP_ROUTE_PREFIXES`-ə `/docs` əlavə etmək kifayətdir.
- Rate limit yalnız login-dədir (qeydiyyat və axtarış açıqdır).
- `ApiMeta` sabit sxemdir: xronologiyanın `academicYears` siyahısı v1-də
  qaytarılmır (UI-da filtr paneli üçün lazımdır, API-də deyil).

---

## Düzəliş — auth yönləndirmə dövrəsi (2026-07-30)

**Səbəb:** sessiya kukisi KEÇƏRLİ idi, içindəki `userId` isə bazada YOX (baza
yenidən seed edildi, brauzerdəki kuka qaldı). Dövrənin iki ucu:
`/login` --(middleware: kuka var → giriş edib)--> `/home`
--(`(app)/layout.tsx`: `getSessionUser()` `null` → `redirect(LOGIN_PATH)`)-->
`/login`. Kuka yerində qaldığı üçün zəncir heç vaxt bitmirdi → `ERR_TOO_MANY_
REDIRECTS` = ağ ekran. **Blok 9-un regressiyası DEYİL** — hər iki sətir Blok 2-dən
(`32f3203`) bəri belədir, sadəcə "hesabı silinmiş istifadəçi" halı ilk dəfə indi
yarandı.

**Düzəliş:** `src/app/api/session/expired/route.ts` — sessiya kukisini SİLİB
`/login?expired=1`-ə göndərən route handler (kukanı yalnız route handler dəyişə
bilir; nisbi `Location` — mütləq URL hostu dəyişir və kuka başqa anbarda qalır).
Layout-lar (`(app)`, `(admin)`) artıq `LOGIN_PATH`-ə yox, ona yönləndirir.
Route icazə məntiqi TƏK yerə yığıldı: `routes.ts` → `resolveRouteAccess()` +
`routeRedirectTarget()`; `auth.config.ts` yalnız tərcüməçidir.

**Qoruyucu testlər:** `routes.test.ts` — cədvəl testi (14 yol × 3 viewer),
DÖVRƏ testi (hər hədəfin ÖZÜ yenidən yönləndirilmir — maksimum 1 keçid) və
layout-ların qaçış yolunu işlətdiyini yoxlayan statik yoxlama; `auth.spec.ts` —
5 yeni ssenari (təmiz kontekstdə `/login`/`/register`, giriş etmiş istifadəçi,
köhnəlmiş kuka × 2, cohort-suz istifadəçi). Hər ikisi köhnə kodda QIRILIR
(yoxlanıldı). Vitest **817** (791→+26) · Playwright **89** (84→+5).

**Yan düzəliş:** `/login` və `/register` səhifələrində `<h1>` yox idi (CardTitle
`div` render edir) — semantika düzəldildi, vizual görünüş dəyişmədi.
