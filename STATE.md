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

**Qoruyucu testlər:** `routes.test.ts` — cədvəl testi (19 yol × 3 viewer),
DÖVRƏ testi (hər hədəfin ÖZÜ yenidən yönləndirilmir — maksimum 1 keçid) və
layout-ların qaçış yolunu işlətdiyini yoxlayan statik yoxlama; `auth.spec.ts` —
5 yeni ssenari (təmiz kontekstdə `/login`/`/register`, giriş etmiş istifadəçi,
köhnəlmiş kuka × 2, cohort-suz istifadəçi). Hər ikisi köhnə kodda QIRILIR
(yoxlanıldı). Vitest **817** (791→+26) · Playwright **89** (84→+5).

**Yan düzəliş:** `/login` və `/register` səhifələrində `<h1>` yox idi (CardTitle
`div` render edir) — semantika düzəldildi, vizual görünüş dəyişmədi.

### Dövrə cədvəli Blok 9S səthini DƏ əhatə edir

Düzəliş 9S-dən sonra gəldiyi üçün cədvəl əvvəlcə yalnız səhifə yollarını
tuturdu. İndi `/api/v1` səthi də oradadır və dövrə testi (hər yol × 3 viewer)
onların üzərindən DƏ keçir:

| Yol | Niyə cədvəldə |
|---|---|
| `/docs` | Swagger UI — sənəd auth arxasında deyil |
| `/api/v1/health` | ictimai REST endpoint-i |
| `/api/v1/auth/login` | ⚠️ `/login` auth prefiksinə OXŞAYIR; prefiks məntiqi səhvən tutsaydı giriş etmiş müştəri üçün `REDIRECT_HOME` çıxar və REST login sınardı |
| `/api/v1/cohorts/<slug>/posts` | kuka MƏCBURİ endpoint — icazə guard-dadır, route-da yox |
| `/api/v1/search` | sərhəd: `/search` QORUNAN prefiksdir, bu ondan asılı deyil |

🔴 **Hamısı üç viewer üçün də `PUBLIC` gözləyir və bu, "qorunmur" demək
DEYİL.** `resolveRouteAccess` yalnız MIDDLEWARE-in qərarıdır; v1-in
autentifikasiyası `lib/api/guard.ts` → `withUser`-dədir və 401 **JSON**
qaytarır. Cədvəl məhz `/api`-nin `APP_ROUTE_PREFIXES`-ə əlavə edilməsini
bloklayır — əlavə edilsəydi cavab 307 + `/login`-in HTML-i olar, Swagger UI
«Try it out» JSON əvəzinə səhifə göstərərdi. Davranışın o biri ucu e2e-də
bərkidilib (`api.spec.ts`: `content-type: application/json` VƏ gövdə
`<!DOCTYPE html>` EHTİVA ETMİR).

Vitest **820** (817→+3).

---

## Blok 10A — bitdi (Share Memories + Digital Yearbook + Dəstək səthi)

⚠️ «Where Are We Now» XƏRİTƏSİ BU BLOKDA DEYİL — o, 10B-dir. `stats.service`-in
mövcud funksiyalarına toxunulmadı; yalnız YENİ `getCohortHeadlineStats` əlavə
olundu.

**Yeni saf modullar (Prisma / React yoxdur, testlə örtülü):**
- `lib/memory-filters.ts` — `MEMORY_PARAMS` (`type` · `place` · `page`),
  parse ↔ serialize ↔ `memoriesHref` dövrəsi, `MEMORY_PAGE_SIZE = 12`.
  `place` BAYRAQDIR (`?place=1`) — konkret məkan seçicisi deyil.
- `lib/yearbook.ts` — `Record<MemoryType, YearbookSection>` xəritəsi,
  `yearbookSectionOf` (TƏK dəyər → bir xatirə iki bölmədə görünə bilmir),
  `groupYearbook`, `groupByPlace`.
- `lib/headline-stats.ts` — `HEADLINE_MIN_MEMBERS` (= `MIN_BUCKET_SIZE`, yeni
  ədəd YARADILMADI) + `isHeadlineStatsVisible`.
- `lib/labels.ts` → **`MEMORY_TYPE_LABELS`** (T13): etiketlər `features/feed/
  catalog.ts`-dən lib-ə köçdü, lent və xatirə kataloqu indi EYNİ mənbədən oxuyur.

**🔴 TRAP A — `showInTimeline` sxem məhdudiyyəti (qərar və SƏBƏBİ):**
`TimelineEntry.sourceType` yalnız POST|ACHIEVEMENT|EVENT|SYSTEM qəbul edir və
Memory-yə FK YOXDUR. `sourceType`-a "MEMORY" **ƏLAVƏ EDİLMƏDİ** — yeni miqrasiya
+ yeni FK + `timelineVisibilityWhere`-in sahib şaxəsinə müdaxilə Blok 3-ün üç qat
qorumasını riskə atardı. Əvəzinə: `showInTimeline` yalnız `showInFeed` ilə birgə
seçilir (UI `disabled` + Zod `superRefine` + servisdə `TIMELINE_REQUIRES_FEED` —
üç qat, çünki UI qoruma sayılmır); `showInFeed` açıqdırsa EYNİ transaksiyada Post
yaranır (kind MEMORY, eyni visibility/occurredAt) və Blok 4-ün `buildTimelineEntry`
köməkçisi ÇAĞIRILIR (kopyalanmır); söndürüləndə Post soft-delete +
`timelineEntry.deleteMany({ postId })` (T4).

**Yeni servis funksiyaları:**
- `memory.service`: `countMemories` · **`listYearbook(viewer, cohortId)
  : Promise<MemoryItem[]>`** · **`listMemoriesForPlace(viewer, guidePlaceId,
  take = 3): Promise<PlaceMemoryItem[]>`** · `countMemoriesForPlace` ·
  `createMemory` · `updateMemory` · `deleteMemory` · `getMemoryDraft`.
- `cohort.service`: `listCohortSupportOffers(viewer, cohortId)` — 7 növ,
  `openToSupport` qapısı, şirkət yalnız `CareerEntry` görünürlükdən keçirsə.
- `stats.service`: `getCohortHeadlineStats(viewer, cohortId)` — dörd qayda
  (yalnız saylar · hər say görünürlük şərtindən keçir · `memberCount <
  MIN_BUCKET_SIZE` → **`null`** · nailiyyət yalnız VERIFIED+FEATURED).

**🔴 Yol boyu tapılan səhv (düzəldildi):** `activeVisibleWhere` status filtrini
SAHİBƏ tətbiq etmir, yəni müəllif öz SOFT-DELETE edilmiş xatirəsini görürdü.
`memory.service` → **`visibleMemoryWhere`** əlavə olundu (`post.service` →
`visiblePostWhere` ilə eyni nümunə). Yeni xatirə sorğusu `activeVisibleWhere`-i
TƏK BAŞINA çağırmamalıdır.

**Yeni komponentlər / səhifələr:** `features/memories/` → `catalog.ts` (8 növ:
etiket lib-dən, ikon ADI, `ku-soft`/`ku-blue`/`ku-cream` FON tonu), `filter-state.ts`,
`schemas.ts`, `actions.ts`, `MemoryComposer`, `MemoryCard`, `MemoryFilters`,
`ClassMemories`, **`PlaceMemories`**, `types.ts`; `features/yearbook/ClassYearbook`;
`features/support/ClassSupport`; `features/class-home/HeadlineStats`;
`components/shared/PrintButton` (Blok 9-dakı `events/manage/PrintButton`-dan
bura köçdü — ikinci istifadəçi yarandı, `features/*` bir-birindən import etmir).
Səhifələr: `/class/[slug]/memories`, `/class/[slug]/yearbook`,
`/class/[slug]/support` (üçü də `force-dynamic`; `/class` prefiksi
`APP_ROUTE_PREFIXES`-də olduğu üçün `routes.ts`-ə toxunulmadı).

**Çap görünüşü:** `DashboardShell` → sidebar/header `print:hidden`, `main`
padding sıfırlanır; `globals.css` → `@media print` (ağ fon, kölgəsiz,
`a[href]::after` boş — link URL-ləri kağıza düşmür); albomda hər bölmə
`print:break-before-page`, hər kart `break-inside-avoid`. Paket ƏLAVƏ EDİLMƏDİ.

**Albom quruluşu:** üç sual bölməsi (MOMENT · LESSON · **PLACE — tipdən asılı
deyil, `guidePlaceId` ilə**) + sitat divarı (CLOSING). ⚠️ Qalan iki növ
(`UNIVERSITY_STORY`, `THANKS_CLASSMATE`) **STORY** bölməsinə düşür: sual bölməsi
deyil, amma `showInYearbook` seçmiş istifadəçinin xatirəsi səssizcə itməməlidir.
`Record<MemoryType, …>` olduğu üçün yeni növ unudulsa `tsc` dayanır.

**PlaceMemories — Blok 11 qeydi:** komponent yazıldı və testlə örtüldü, amma
HEÇ YERƏ QOŞULMADI — Xankəndi bələdçisi səhifəsi (M3) Blok 11-dədir. **Blok 11-də
bələdçi məkan kartına `<PlaceMemories placeId={place.id} />` əlavə etmək
kifayətdir.** Səhifə İCTİMAİ olacağı üçün servis anonim viewer ilə də
çağırılacaq: `activeVisibleWhere` MƏCBURİDİR, məkan filtri onun ƏVƏZİ deyil,
ÜSTƏLİYİDİR (ayrıca inteqrasiya + api testi var).

**Yeni v1 endpoint-ləri (18 → 22):**
`GET /cohorts/{slug}/memories` (tip + məkan filtri, PagerNav metası) ·
`GET /cohorts/{slug}/yearbook` (hər qeyddə `section`) ·
`GET /cohorts/{slug}/support` · `GET /guide-places/{id}/memories`
(**`withViewer`** — bələdçi ictimaidir; naməlum `id` 404 yox, boş siyahı).
Sxemlər `lib/api/schemas.ts`-ə (`Memory`, `PlaceMemory`, `YearbookEntry`,
`SupportOfferEntry`), yollar `openapi.ts`-ə; query parametrləri
`MEMORY_PARAMS`-dan TÖRƏYİR. `openapi.test.ts` və `api-docs.spec.ts`-dəki sabit
say 18 → 22 yeniləndi.

**Testlər:** vitest **951** (əvvəl 820 → +131: `memory-filters` 27, `yearbook` 18,
`memories/schemas` 14, `memories/catalog` 8, `headline-stats` 4,
`memories.db` 25, `api.db` +7, `openapi` +32 avtomatik `it.each`),
playwright **95** (89 → +6). `tsc --noEmit` · `lint` · `build` təmiz;
`grep -rn "prisma\." src/app src/features` → yalnız şərhlər. Test dəstindən
sonra 28 cədvəlin sayları təzə seed ilə **bayt-bayt eynidir** (yoxlanıldı).

**Qalan borc:**
- Xatirə səthində reaksiya/şərh YOXDUR (qəsdən — bu, söhbət deyil). Lazım olsa
  lentdəki bağlı Post üzərindən gedir.
- Albomda üzv kartındaki «ixtisas» cohort-un proqramıdır (bütün üzvlər üçün
  eynidir); fərdi ixtisas sahəsi sxemdə yoxdur.
- Yearbook v1 endpoint-i qruplaşdırılmış struktur qaytarmır — düz siyahı +
  `section` sahəsi (zərf sabit qalsın deyə).
- Dəstək səthində yazma əməliyyatı yoxdur: redaktə `/me/career`-dəki MÖVCUD
  bölməyə yönləndirilir (yeni forma yaradılmadı).

---

## Blok 10B — bitdi (Where Are We Now: karyera nəticələri xəritəsi [M11])

Müəllimin birbaşa tələbi (GW referansı): «tələbələrimizin gələcək karyerasında
hansı yerdə, hansı konumda çalışdığını xəritədə görmək». Route `/class/[slug]/map`
— `nav.ts`-dəki mövcud link MƏHZ ora gedir (`/where-are-we-now` YARADILMADI).

### `aggregateCareerStats` — imza və dörd addım

```ts
// src/lib/career-stats.ts — SAF (prisma / React importu YOXDUR)
aggregateCareerStats(
  rows: CareerStatsRow[],          // { userId, city, country, company, industry, jobFunction, degree }
  options?: {
    memberCount?: number;          // sinif ölçüsü — "N/M razılıq verib"
    totalConsented?: number;       // razılıq verən və GÖRÜNƏN üzv sayı
    viewerId?: string;             // «sənin məlumatın iştirak edir/etmir»
    strictCrossDimension?: boolean; // aşağıdaki «iki rejim» bölməsi
  },
): WhereAreWeNow
```

Dörd addım (sıra pozulmamalıdır):
**a)** sətirlər `userId` üzrə təkləşdirilir (bir nəfər = bir sətir; `isCurrent`
təkliyi Blok 7-dədir, təkrar yoxlanılmır) →
**b)** YER ölçüsü eskalasiya edilir →
**c)** digər ölçülər eyni eşiklə açıqlanan/açıqlanmayan kimi bölünür →
**d)** yalnız BUNDAN SONRA saylar hesablanır.

### ESKALASİYA qaydası (generalizasiya iyerarxiyası)

```
şəhər xanası < 3  →  sətir ÖLKƏ səviyyəsinə yığılır (şəhəri açıqlanmır)
ölkə xanası  < 3  →  sətir tamamilə "Açıqlanmayan" (nə şəhər, nə ölkə)
```
Şəhəri gizlədilən sətir İTMİR: `cities.undisclosedCount`-a düşür və `countries`
xanasında NORMAL sayılır. Dəyər gizlədilmir, KOBUDLAŞDIRILIR.

### 🔴 ÇARPAZ suppress məntiqi (TƏLƏ A) — addım-addım

**Tapılan əsl səhv:** köhnə `getWhereAreWeNowStats` xanaları BEŞ ayrı `groupBy`
sorğusundan yığırdı və sorğuların `where`-i EYNİ DEYİLDİ
(`{ industry: { not: null } }`, `{ country: { not: null } }`, `degrees` isə
`EducationEntry` SƏTİRLƏRİNİ sayırdı). Yəni hər xana FƏRQLİ sətir çoxluğu
üzərində hesablanırdı → cəmlər bir-birinə uyğun gəlmirdi → oxucu iki xananı
çıxıb qalıq alır və onu üçüncü ilə kəsişdirib fərdə çata bilirdi.

**Həll — üç struktur qayda:**
1. TƏK DATASET (bir nəfər = bir sətir),
2. TƏK KEÇİD (bütün ölçülər eyni sətir çoxluğundan),
3. HƏR ÖLÇÜ SƏTİRLƏRİN HAMISINI ÖRTÜR:
   `Σ visible[].count + undisclosedCount + unknownCount = respondentCount`.

Üçüncü qayda TƏLƏ A-nın həndəsi bağlanışıdır: heç bir sətir heç bir xanadan
itmədiyi üçün xanaları çıxmaqla qalıq çıxarmaq mümkün deyil. `undisclosedCount`
= dəyəri VAR, qrupu kiçikdir; `unknownCount` = bu ölçü üzrə məlumat yoxdur.
İkisi UI-da ayrı-ayrı izah olunur.

**İKİ REJİM və niyə `MARGINAL` defaultdur (müdafiə sualı).**
`strictCrossDimension: true` daha sərt qayda tətbiq edir: sətir ƏN AZI BİR
ölçüdə açıqlanmırsa BÜTÜN ölçülərdə "Açıqlanmayan"a düşür (sabit nöqtəyə qədər
dövr edir, çünki sətir çıxarmaq başqa xanaları da eşiyin altına salır). Rejim
yazıldı və TESTLƏ ÖLÇÜLDÜ — real məlumatda HƏR ŞEYİ silir: 20 fərqli şirkət
arasında bölünmüş 19 respondentin hər biri «bir ölçüdə açıqlanmır» şərtinə
düşür və panel TAM BOŞ qalır. Yüksək kardinallıqlı sərbəst mətn sahəsi (şirkət
adı) bütün panelə veto qoyur.

Səhifə `MARGINAL` işlədir. Əsas: biz MİKROMƏLUMAT deyil, MARJİNAL bölgü nəşr
edirik (hər ölçü ayrı qrafik, birgə cədvəl HEÇ VAXT göstərilmir) — marjinal
nəşrdə tələb «hər açıqlanan xana ≥ k»-dır və üç qayda ilə tam ödənilir.
«Açıqlanmayan» atribut DƏYƏRİ deyil, ona görə kəsişdirməyə yarayan məlumat
daşımır. Hər iki rejim `career-stats.test.ts`-də bərkidilib.

**Yeganə birgə cədvəl (cross-tab) — pin tooltip-i** (şəhər × vəzifə) AYRICA
eşikdən keçir: yalnız həmin şəhərdə ≥ 3 nəfər olan istiqamətlər adlandırılır.
«Bakı · 2 müəllim» marjinal xanalar təmiz olsa da konkret iki nəfəri göstərərdi.

### `geo.ts` niyə STATİKDİR (TƏLƏ B)

Heç bir sorğu `latitude` / `longitude` seçmir — sxemdə belə sütun YOXDUR və
əlavə edilməməlidir. `src/lib/geo.ts` ~49 Azərbaycan (Qarabağ və Şərqi Zəngəzur
daxil) + ~50 dünya şəhəri, 63 ölkə mərkəzi saxlayır; `prisma` importu yoxdur.
Pin ŞƏHƏR MƏRKƏZİNƏ qoyulur, yəni eyni şəhərdəki iki nəfər eyni nöqtədə
birləşir — bu, xəritəni «insan izləyicisi» olmaqdan qoruyan struktur qərardır.
Tanınmayan şəhər pin YARATMIR (ölkə səviyyəsində sayılır); tanınmayan ölkə
doldurma yaratmır (siyahıda var, xəritədə yox).

`normalizeCityKey` `az` lokalını `lib/text-search.ts` → **`AZ_LOCALE`**-dan
İMPORT EDİR (Blok 6, T14) — iki modul öz lokalını yazsaydı «İstanbul» bir yerdə
`istanbul`, başqa yerdə `ıstanbul` olardı. Üstəlik diakritik qatlama var
(ə→e, ı→i, ş→s, ğ→g, ö→o, ü→u, ç→c) və ayırıcılar atılır: «Nyu-York» = «Nyu York».

⚠️ `world-atlas` poliqonunun `id`-si ISO NUMERIC-dir («031»), `properties.name`
isə İNGİLİSCƏ. Uyğunlaşdırma `CountryCoord.numeric` ilə gedir, ADLA DEYİL.
Sinqapur 110m topologiyasında YOXDUR (şəhər dövləti) — pin çəkilir, doldurma yox.

### 🔴 MAAŞ İMTİNASI — səbəb (Blok 13-ün README-si buna istinad edəcək)

Heç bir yerdə maaş/bonus sahəsi yaradılmadı, hesablanmadı, göstərilmədi.
Səbəb: 14–28 nəfərlik sinifdə **aqreqasiya olunmuş maaş belə fərdiləşdirilə
bilər** — öz rəqəmini bilən bir nəfər ortadan qalanları çıxarır, iki nəfər
praktiki olaraq üçüncünü tapır. k-anonimlik bunu HƏLL ETMİR, çünki problem
xananın ölçüsündə deyil, göstəricinin arifmetikasındadır (orta / medianın özü
sızdırır). Qərar İKİ yerdə sübut olunur: `WhereAreWeNow` sxemi
`additionalProperties: false`-dur və `openapi.test.ts` sənəddə `salary`/`bonus`
sözünün olmadığını yoxlayır; `career-stats.test.ts` isə çıxış obyektinin
açarlarını rekursiv gəzir. README-nin «üç məxfilik qərarı» bölməsi eyni izahı
daşıyır.

### Yeni fayllar

**Saf modullar (testlə örtülü, Prisma yoxdur):** `lib/geo.ts` ·
`lib/career-stats.ts` · `lib/map-filters.ts` (`MAP_TAB_VALUES` — 8 görünüş,
parse ↔ serialize ↔ `mapHref` dövrəsi).

**Servis:** `stats.service` → `fetchCareerStatsRows` (private) ·
`countConsentedMembers` (private) · **`getCareerOutcomeStats(viewer, filters)`**.
`getWhereAreWeNowStats` və `listCoarseLocations` İMZASINI SAXLADI, amma daxildən
eyni TƏK aqreqasiyaya delegasiya edir — Blok 5 widget-i və mövcud testlər
dəyişmədən işləyir. ⚠️ `degrees` xanası artıq SƏTİR yox, NƏFƏR sayır
(`pickHighestDegree` nəfər başına bir pillə seçir) — köhnə davranış üç diplomlu
adamı üç dəfə sayırdı.

**Feature (`src/features/where-are-we-now/`):** `WhereAreWeNowPanel` (server) ·
`ConsentNotice` · `MapTabs` (client, Radix Tabs + nuqs + `dynamic({ssr:false})`) ·
`WorldMap` · `AzerbaijanMap` · `MapPins` · `MapPanel` · `MapSkeleton` ·
`ChartFrame` · `StatsTable` · `BucketBarChart` · `CitiesChart` ·
`CountriesChart` · `CompaniesChart` · `IndustriesChart` (donut) ·
`JobFunctionsChart` · `EducationLevelsChart` · `catalog.ts` · `palette.ts` ·
`filter-state.ts`.

**Səhifə:** `/class/[slug]/map` (`force-dynamic`). **v1:**
`GET /api/v1/cohorts/{slug}/stats/where-are-we-now` (`withUser`,
`Cache-Control: private, no-store`, 22 → **23** endpoint).

### Qərarlar (müdafiədə soruşula bilər)

- **`shallow: true` — və bu, xronologiya/xatirə filtrlərindən FƏRQLİDİR.** Orada
  süzgəc DB-dədir → server yenidən işləməlidir. Burada aqreqasiya TƏK keçiddə
  bir dəfə hesablanır və səkkiz görünüş EYNİ nəticənin təsviridir; server sorğusu
  yeni məlumat gətirməz. Qeyd hər iki faylın başlığındadır.
- **Donut rəngləri ölçülüb seçilib.** Sıra (ku-green → ku-blue → ku-dark →
  ku-cream → orta yaşıl → ku-soft) OKLab məsafəsi ilə yoxlandı: ən yaxın qonşu
  cüt ΔE 17.8 (protanopiya) / 18.5 (normal görmə). «Gözəl gradient» variantı
  ΔE 9.2 verir — dilimlər ayırd edilmir. KUDS palitrası solğun olduğu üçün
  kontrast yoxlaması KEÇMİR; kompensasiya MƏCBURİDİR və verilib: dilim üzərində
  faiz, ad+say leqendası, `<table>` alternativi. Rəng heç vaxt yeganə kanal deyil.
- **Sütun diaqramları ÜFÜQİDİR** — «Birləşmiş Ərəb Əmirlikləri» kimi etiketlər
  şaquli sütunda 45° əyilib oxunmur. Tək seriya olduğu üçün leqenda YOXDUR.
- **Xəritə TƏK məlumat mənbəyi DEYİL** (KUDS §21 / WCAG 2.2): hər vizualın altında
  «Cədvəl kimi göstər» açılışı var, cədvəldə «Açıqlanmayan» və «Cəmi» sətirləri
  oxucuya invarianti YOXLAMAQ imkanı verir. Pinlər `tabIndex={0}` ilə klaviatura
  fokusuna düşür və `<title>` daşıyır.
- **`world-atlas` OFLAYN gəlir** (paketdən, bundle-a girir) — CDN İŞLƏDİLMİR,
  Swagger UI aktivləri ilə eyni qərar (müdafiə otağında internet olmaya bilər).
- **Dünya xəritəsi `geoNaturalEarth1`, Azərbaycan `geoMercator`.** Mercator
  yüksək enliklərdə sahəni şişirdir və «doldurma = say» oxunuşunu pozar; kiçik
  enlik aralığında (38…42° N) isə təhrif yoxdur və mövqelər tanış görünür.
- **Ölkə doldurması HOVER-də dəyişmir** — rəng SAY deməkdir, interaktiv vəziyyət
  deyil.

### 🔴 Seed dəyişikliyi (prisma) və SƏBƏBİ

Panel əvvəlki seed ilə TAM BOŞ qayıdırdı və bu ölçüldü: 19 respondent 15 ölkəyə
və 20 şirkətə bərabər səpildiyi üçün hər xana 3 nəfərdən kiçik idi. Yəni
məxfilik mühərriki işləyirdi, amma DoD-un «7 vizual real seed məlumatı ilə DOLU
görünür» tələbi ödənilmirdi.

`seed-data/content.ts` → **`CAREER_PLACEMENT_PLANS`** (sinif üzrə 4 / 2 mərkəz)
və **`CAREER_TRACK_PLANS`** (vəzifə + sahə + işəgötürən BİRLİKDƏ seçilir).
Plan uzunluqları QARŞILIQLI SADƏDİR (4 mərkəz × 3 yol), yoxsa şəhər və vəzifə
tam üst-üstə düşərdi («Bakıdaki hər kəs maliyyəçidir»).
⚠️ PLAN ÖLÇÜSÜ QAYDASI: bir sinfin planındaki fərqli mərkəz sayı
`razılıq verən üzv sayı / 3`-dən çox olmamalıdır.

Razılıq və görünürlük DETERMİNİSTİK oldu (`careerIndex % 7`,
`CAREER_VISIBILITY_PLAN`) — təsadüfi süzgəc kümələri gah 3-ə çatdırır, gah
altına salırdı və panel «gah dolu, gah sınmış» görünürdü. PRNG axını
**`keepRandomStep`** ilə qorundu, yəni **28 cədvəlin sayları DƏYİŞMƏDİ**
(yoxlanıldı: 72 CareerEntry · 25 EducationEntry · 40 SupportOffer ·
207 Notification — hamısı eyni).

Nəticə (Maliyyə 2022, məzun viewer): 15 respondent · Bakı 9 / Xankəndi 3 /
İstanbul 3 · Azərbaycan 12, Türkiyə 3 · 3 işəgötürən · 3 sahə · 3 vəzifə
istiqaməti. Bakı pin-i vəzifə bölgüsü göstərir (3 Data · 3 Maliyyə · 3 Məhsul),
Xankəndi və İstanbul pinləri isə «vəzifə bölgüsü açıqlanmır» yazır — hər iki hal
demoda görünür.

### Testlər

vitest **1030** (951 → +79: `career-stats` 28, `geo` 18, `map-filters` 12,
`stats.db` 13, `openapi` +8 avtomatik `it.each` + 2 yeni). playwright **105**
(95 → +10: `map.spec.ts`). `api-docs.spec.ts` və `openapi.test.ts`-dəki sabit
endpoint sayı 22 → 23 yeniləndi.

`tsc --noEmit` · `lint` · `build` təmiz.
`grep -rn "latitude\|longitude" src/features/where-are-we-now` → BOŞ.
`grep -rn "prisma\." src/app src/features` → yalnız şərhlər.
`grep -rn "#[0-9a-f]\{3,6\}" src/features/where-are-we-now` → BOŞ.
Test dəstindən sonra 28 cədvəlin sayları təzə seed ilə **bayt-bayt eynidir**.

### Yol boyu tapılan tələlər

- **T31 — JS `\b` AZƏRBAYCAN HƏRFLƏRİNDƏ SƏHV İŞLƏYİR.** `\w` = `[A-Za-z0-9_]`,
  yəni «ş», «ə», «ı» SÖZ SƏRHƏDİ sayılır. `\bAyan\b` seed adı «yaşayan» sözünə
  uyğun gəlirdi və ad-sızma e2e testi YALANDAN qırılırdı. Düzgün forma:
  `(?<![\p{L}\p{N}])ad(?![\p{L}\p{N}])` + `u` bayrağı.
- **T32 — üst-üstə düşən pinlərdə `hover()` İŞLƏMİR.** Dünya miqyasında Bakı və
  Xankəndi markerləri kəsişir və Playwright «başqa element pointer hadisəsini
  tutur» deyib dayanır. `focus()` işlədilir — həm stabildir, həm də əsl tələbi
  (klaviatura ilə açılma) yoxlayır.
- **`viewerIncluded` `viewerId` OLMADAN həmişə `false`-dur** — aqreqasiya baxanın
  kim olduğunu təxmin etmir. Səhifə və v1 endpoint-i onu açıq ötürür.

### Qalan borc

- Panel YALNIZ cohort miqyasındadır. Universitet miqyaslı görünüş (`cohortId`
  verilmədən) servisdə DƏSTƏKLƏNİR, amma UI-ı yoxdur — admin analitikası
  (`/admin/stats`) üçün təbii yerdir.
- Xəritədə zoom/pan yoxdur (`ZoomableGroup` əlavə edilmədi): klaviatura fokus
  sırası ilə qarşılıqlı təsiri ayrıca əlçatanlıq işi tələb edir.
- `strictCrossDimension` rejimi UI-dan seçilə bilmir — funksiya səviyyəsində
  seçimdir və müdafiə üçün ölçmə alətidir.
- Təhsil pilləsi yalnız CARİ İŞ QEYDİ OLAN üzvlər üçün sayılır (dataset karyera
  qeydinə bağlıdır); yalnız təhsil qeydi olan üzv `totalConsented`-də görünür,
  bölgüdə yox.
