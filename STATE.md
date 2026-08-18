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

---

## Blok 11A — bitdi (Welcome Page [M1] · Fakültələr [M2] · Xankəndi bələdçisi [M3] · Bildiriş mərkəzi [M15])

⚠️ **ADMİN PANELİ BU BLOKDA DEYİL** — o, 11B-dir (dashboard, moderasiya növbəsi,
istifadəçi/rol idarəsi, CMS, CSV import, audit jurnalı). `(admin)` route qrupuna
TOXUNULMADI; yeganə dəyişiklik `DashboardShell`-dəki bildiriş rozetidir və o,
hər iki qrupda işləyir (aşağıda TƏLƏ C).

### Yeni route-lar (17 yol)

**İctimai məzmun (`(public)`):** `/about` · `/history` · `/mission` ·
`/campus-life` · `/clubs` · `/services` · `/newcomers` · `/faq` ·
`/faculties` · `/faculties/[slug]` · `/khankendi` · `/khankendi/[id]` ·
`/events` · `/accessibility` · `/legal/[slug]` (4 sənəd).
**`(app)`:** `/notifications`.

### routes.ts-də NƏ DƏYİŞDİ (TƏLƏ A)

🔴 **İCAZƏ MƏNTİQİ DƏYİŞMƏDİ.** `APP_ROUTE_PREFIXES`, `PUBLIC_EXACT_PATHS`,
`ADMIN_ROUTE_PREFIXES`, `resolveRouteAccess`, `routeRedirectTarget` — HAMISI
olduğu kimi qaldı. Yeni ictimai səhifələr onsuz da açıqdır (qorunan prefikslə
kəsişmirlər), yəni "yeni yol → yeni qayda" ehtiyacı YARANMADI. Bu, qəsdən
seçilmiş yoldur: dövrə məhz icazə qaydasına toxunanda yaranmışdı.

Əlavə olunan İKİ SİYAHI icazə vermir, ƏKSİNİ SÜBUT EDİR:
- `PUBLIC_PAGE_PATHS` — 14 statik ictimai yol (müqavilə siyahısı)
- `PUBLIC_DYNAMIC_PARENTS` — `/faculties` · `/khankendi` · `/legal`
  (⚠️ `/events` BURADA YOXDUR və bu, qərardır: `/events/<id>` detalında RSVP və
  iştirakçı siyahısı var, ona görə auth arxasında qalır)

Hər ikisi İKİ testin girişidir:
- `routes.test.ts` — hər yol × 3 ziyarətçi → `PUBLIC` VƏ yönləndirmə `null`;
  cədvələ 17 yeni sətir düşdü (dövrə testi avtomatik onların üzərindən keçir)
- `tests/e2e/public.spec.ts` — anonim VƏ giriş etmiş brauzerdə 200, URL
  DƏYİŞMİR (ictimai səhifə istifadəçini `/home`-a qovmur)

### PlaceMemories harada quraşdırıldı (Blok 10A-nın qalan işi)

`features/guide/GuidePlaceDetail.tsx` → `/khankendi/[id]` səhifəsinin sol
sütununda, təsvirdən sonra: `<PlaceMemories placeId={place.id} placeTitle={…} />`.
Komponent viewer-i ÖZÜ qurur (`getViewer()`), servis isə `activeVisibleWhere`
şərtini məkan filtrinin ÜSTÜNƏ qoyur — yəni anonim ziyarətçi yalnız `PUBLIC`
xatirələri görür. Üç yerdə ölçülür: `memories.db.test.ts` (10A-dan), yeni
`public-content.db.test.ts` (bütün məkanlar üzrə) və `public.spec.ts` (anonim
brauzerdə CLASS xatirənin BAŞLIĞI tapılmır).

### ACCESSIBILITY enum əlavəsi — kimlərə təsir etdi (TƏLƏ D)

`REPORT_ENTITY_TYPE_VALUES`-ə `"ACCESSIBILITY"` əlavə olundu. Sütun `String`-dir
→ **miqrasiya LAZIM OLMADI**. Təsir etdiyi yerlər:
- `lib/labels.ts` → yeni `REPORT_ENTITY_TYPE_LABELS` (`Record<>` — tsc qapısı)
- `labels.test.ts` → cədvəl əhatə testinə əlavə olundu
- `services/report.service.ts` → `createAccessibilityReport` (ayrı funksiya)

🔴 **`ACCESSIBILITY` DİGƏRLƏRİNDƏN FƏRQLİDİR:** qalan dəyərlərdə `entityId` DB
sətrinin `id`-sidir, burada isə SƏHİFƏ YOLUDUR (`/khankendi/gpl-01`). Moderator
üçün fərq mühümdür — bu qeydi «məzmunu gizlət» ilə həll etmək olmaz, o, texniki
nasazlıq biletidir. 11B-nin moderasiya növbəsi bunu nəzərə almalıdır.

🔴 **SEED QORUNDU:** `prisma/seed.ts` artıq `cycle(REPORT_ENTITY_TYPE_VALUES, i)`
İŞLƏTMİR — yerli sabit `REPORT_SEED_ENTITY_TYPES` (əvvəlki 6 dəyər, eyni sıra)
qurulub. Enum-dan oxusaydı 12 şikayətin növ bölgüsü sürüşər və hər sətrin
`entityId`-si başqa obyektə düşərdi.

### Kuki razılığının saxlanma üsulu (TƏLƏ E)

`document.cookie` → `qu_cookie_consent=all|necessary`, `path=/`,
`max-age=31536000` (1 il), `SameSite=Lax`. `Secure` bayrağı **protokoldan
törəyir** (`window.location.protocol === "https:"`) — `localhost`-da `Secure`
kuka brauzer tərəfindən səssizcə atılır və banner heç vaxt bağlanmazdı (e2e
http üzərindədir).

Qərar SERVERDƏ verilir: `features/consent/ConsentGate.tsx` (server komponenti)
`cookies()` ilə oxuyur və razılıq varsa `CookieBanner` **ÜMUMİYYƏTLƏ render
olunmur** — HTML-də izi qalmır, hidrasiya sıçrayışı yoxdur. Banner həm
`PublicShell`, həm `DashboardShell`-dədir (razılıq sessiyadan asılı deyil,
istifadəçi ikinci dəfə soruşulmur).

- «Rədd et» AYRI dəyər DEYİL → `necessary`. Zəruri (sessiya) kukiləri söndürmək
  mümkün deyil, düymə yalan vəd etməməlidir; banner mətni bunu açıq yazır.
- Kuka istifadəçi identifikatoru DAŞIMIR (`consent.test.ts` yoxlayır) — razılıq
  kukisinin özü izləyici olsaydı ziddiyyət yaranardı.
- `role="region"`, `dialog` DEYİL: banner modal deyil, fokus tələsi qurmur.

🔴 **YOL BOYU TAPILAN NASAZLIQ:** `fixed` banner səhifənin son ~120 pikselini
DAİMİ örtürdü və orada duran düymə (profil formasının «Yadda saxla»-sı) klikə
cavab vermirdi — pointer hadisəsini banner tuturdu. E2E dəstində ÜÇ fayl
qırıldı və bu, istifadəçi üçün də eyni nasazlıqdır. Həll: banner öz hündürlüyünü
ölçüb axına eyni ölçüdə boşluq (`spacer`) əlavə edir.

### Anonim əlçatanlıq forması üçün seçilən yol və SƏBƏBİ

**Seçim: forma GİRİŞ TƏLƏB EDİR; bəyanat isə anonimə TAM açıqdır.**

`Report.reporterId` sxemdə məcburidir (`String`, nullable deyil). İki variant
vardı:
- (a) `reporterId`-ni nullable etmək → miqrasiya + `Report`-un BÜTÜN oxu
  tərəfini (moderasiya növbəsi, audit jurnalı, 11B-nin filtrləri) «müəllif ola
  bilər / olmaya bilər» halına açmaq;
- (b) anonim ziyarətçiyə formanın yerinə giriş çağırışı + alternativ kanal
  göstərmək.

**(b) seçildi.** Səbəblər: maneə bildirişi nadir hadisədir; anonim axın
moderasiya növbəsinə spam qapısı açır; ən əsası — cavab kanalı qalmır (kimə
yazaq?). WCAG-ın «əlaqə yolu olsun» tələbi girişsiz də ödənilir: bəyanat tam
oxunur və `equal-opportunity` sənədindəki e-poçt kanalı göstərilir.
⚠️ 11B-nin moderasiya növbəsi `ACCESSIBILITY` qeydlərini AYRI göstərməlidir.

### Yeni saf modullar (Prisma / React yoxdur, testlə örtülü)

`lib/markdown.ts` (`parseAgenda` Blok 9-dan bura köçdü — ikinci istifadəçi
yarandı) · `lib/consent.ts` · `lib/content-routes.ts` (ünvan ↔ slug xəritəsi) ·
`lib/faq-filters.ts` · `lib/guide-filters.ts` · `lib/notification-filters.ts` ·
`lib/notification-links.ts` · `lib/public-event-filters.ts`.
`lib/text-search.ts` → **`foldDiacritics` / `foldForSearch`**: qatlama cədvəli
`lib/geo.ts`-dən bura köçdü (T13 nümunəsi — iki nüsxə «İstanbul» sözünü iki
fərqli açara salardı).

### `shared/`-ə köçən komponentlər (features → shared, əksi yox)

`PublicEventCards` (welcome → shared, `/events` ikinci istifadəçi) ·
`MapSkeleton` (where-are-we-now → shared, Xankəndi xəritəsi) ·
yeni `components/shared/Markdown.tsx`.
`lib/labels.ts` → **`POST_CATEGORY_LABELS`** (feed kataloqundan lib-ə, T13).

### 🔴 Bildiriş linkləri — 404 verən keçid göstərilmir

Seed-dəki bildiriş `url`-ləri MÖVCUD OLMAYAN route-lara baxırdı:
`/feed/<id>` · `/achievements/<id>` · `/directory/<id>`. Düzəliş İKİ QATDIR:
1. **Məlumat:** seed indi `/class/<slug>/feed`, `/class/<slug>/achievements`,
   `/u/<id>` yazır (`cohortSlugById` xəritəsi əlavə olundu; sətir sayı və PRNG
   axını DƏYİŞMƏDİ — yalnız `url` sütununun dəyəri).
2. **Davranış:** `lib/notification-links.ts` AĞ SİYAHIDIR — tanınmayan forma
   linkə çevrilmir (başlıq mətn kimi qalır). Bu, həm 404-ün, həm də açıq
   yönləndirmənin (`//evil.example.com`) qarşısını alır.
Yalnız birincisi olsaydı istehsalda yaranan köhnə sətir yenə 404 verərdi.

### TƏLƏ C — header rozeti necə həll olundu

`NotificationBadge` **SERVER komponentidir**. TanStack Query İŞLƏDİLMİR:
`DashboardShell` həm `(app)`, həm `(admin)` qrupundadır, `QueryClientProvider`
isə yalnız `(app)`-dədir → `useQuery` admin panelini «No QueryClient set» ilə
500 verərdi (Blok 6, T18). Say `countUnreadNotifications` ilə serverdə oxunur;
təzələnmə server action-larındakı `revalidatePath("/", "layout")` + client
tərəfdəki `router.refresh()` ilə olur.
⚠️ **`revalidatePath` TƏK BAŞINA KİFAYƏT ETMƏDİ** — açıq səhifə yenidən
çəkilmirdi və rozet köhnə rəqəmdə qalırdı (e2e ilə tapıldı, Blok 9-un
`EventComposer` nümunəsi ilə eyni həll).
E2E `admin@` ilə `/admin`-i açıb konsolda `QueryClient` xətası OLMADIĞINI
yoxlayır.

### Seed dəyişikliyi

`CONTENT_PAGES` **8 → 14**: `missiya` + `klublar` (route xəritəsi onları tələb
edir) və dörd hüquqi sənəd (`privacy` · `terms` · `copyright` ·
`equal-opportunity`). Blok PRNG İŞLƏTMİR (seed-in son addımıdır), yəni
determinizmə təsir yoxdur — **qalan 27 cədvəlin sayları və dəyərləri
DƏYİŞMƏDİ** (iki ardıcıl seed icrası bayt-bayt eyni: 28 cədvəlin sətirləri
sıralanıb hash-lənərək müqayisə olundu).

### Testlər

vitest **1275** (1030 → +245: `routes` +26 (cədvəl + ictimai səth müqaviləsi),
`consent` 14, `faq-filters` 20, `guide-filters` 15, `notification-filters` 16,
`notification-links` 24, `markdown` 14, `content-routes` 24, `public-event-filters` 11,
`labels` +6, `notifications.db` 14, `public-content.db` 20, `api.db` +12,
`openapi` +29 avtomatik `it.each`).
playwright **133** (105 → +28: `public.spec.ts` 17, `notifications.spec.ts` 8,
`landing.spec.ts` +1, mövcudlar yeniləndi).

`tsc --noEmit` · `lint` · `build` təmiz.
`grep -rn "prisma\." src/app src/features` → yalnız şərhlər.
`grep -rn "localStorage" src/` → yalnız şərhlər (TƏLƏ E).
`grep -rn "#[0-9a-f]\{3,6\}" src/features/{guide,notifications,consent,content,accessibility,faculties}` → yalnız şərhlər.

⚠️ **E2E-dən sonra `User` cədvəlinin SAYI eynidir, DƏYƏRLƏRİ isə yox** —
giriş axını `lastSeenAt` / `stage` sütunlarını yeniləyir. Bu, Blok 11A-nın
gətirdiyi davranış DEYİL: təkbaşına işlədilən `auth.spec.ts` (Blok 2-dən bəri
var) eyni nəticəni verir (ölçüldü). Qalan 27 cədvəl e2e-dən sonra təzə seed ilə
bayt-bayt eynidir.

### Mövcud testlərdə edilən DÜZƏLİŞLƏR (və səbəbləri)

- `public-nav.spec.ts` / `landing.spec.ts` — naviqasiya anchor-dan REAL route-a
  qayıtdığı üçün gözləmələr yeniləndi (`/#faculties` → `/faculties`).
- 🔴 **CLASS paylaşım sızma testi YALANDAN qırılırdı.** Seed gövdələri sabit
  hovuzdan (`POST_BODIES[category]`) dövrə ilə seçilir, yəni EYNİ mətn həm
  CLASS, həm PUBLIC paylaşımda ola bilər. Açılışa «Son xəbərlər» bloku gələnə
  qədər bu gözə dəymirdi. Needle indi «anonim ziyarətçinin gördüyü HEÇ BİR
  paylaşımda olmayan mətn» kimi seçilir — sızma xassəsi eyni qalır, ölçmə
  düzəlir.
- `notifications.spec.ts` — rozet SIFIRDA render OLUNMUR, ona görə «0» mətnini
  gözləmək olmaz: köməkçi element yoxdursa `0` qaytarır.
- `openapi.test.ts` / `api-docs.spec.ts` — endpoint sayı 23 → **28**; POST
  siyahısı 3 → 5.

### Qalan borc

- ~~«Seçimlər» düyməsi ayrıca kateqoriya ekranı AÇMIR — məxfilik bildirişinə
  aparır.~~ ✅ **BAĞLANDI — bu qeyd YANLIŞ İDİ.** Düymə həqiqi dialoq açır:
  `src/features/consent/CookieBanner.tsx:156-158` → `data-testid="cookie-preferences"`,
  başlıq «Kuki seçimləri». `tests/e2e/public.spec.ts:512` («Seçimlər» kateqoriya
  ekranı açılır və zəruri kuki söndürülə bilmir) məhz həmin ekranı ölçür:
  dialoq görünür, «Zəruri kukilər» açarı AÇIQ + PASSİV, və ekranda **başqa açar
  yoxdur**. Uydurma «Analitika» açarının olmaması qəsdlidir (analitika
  quraşdırılmayıb) — ekranın YOXLUĞU deyil. Borc siyahısı kodun arxasında
  qalmışdı.
- Xankəndi xəritəsində zoom/pan yoxdur (10B-nin eyni borcu).
- `/faculties/[slug]` sinif səhifəsinin ÖZÜNƏ link vermir — `/class/[slug]`
  auth arxasındadır və anonim ziyarətçini `/login`-ə atardı.
- Bildiriş mərkəzində «oxunmuşu geri qaytar» yoxdur (qəsdən) və silmə də yoxdur
  (tarixçə qalır).
- İctimai məzmun səhifələrində axtarış yoxdur — yalnız `/faq`-da var.
- `ContentPage` üçün admin CMS 11B-dədir; hazırda mətn yalnız seed-dən gəlir.

---

## Blok 11B — bitdi (Admin paneli [M17])

`ADMIN_NAV`-dakı **səkkiz link də real səhifədir** — heç biri 404 vermir.
Yeni yol `/admin/import` naviqasiyaya ƏLAVƏ EDİLMƏDİ (aşağıda səbəb).

### Səhifələr

| Yol | Nə edir |
|---|---|
| `/admin` | StatCard zolağı (6 rəqəm) + son 12 həftənin qrafiki + son 10 audit sətri + növbələrə keçidlər |
| `/admin/moderation` | Şikayət növbəsi — 3 filtr + səhifələmə, `ACCESSIBILITY` ayrı tonda |
| `/admin/achievements` | Universitet səviyyəli nailiyyət təsdiqi |
| `/admin/users` | Cədvəl: axtarış · 3 filtr · 4 çeşidləmə · səhifələmə · CSV ixrac · responsive |
| `/admin/cohorts` | Sinif siyahısı + yaratma formu + sətir-daxili redaktə |
| `/admin/import` | SIS CSV importu (önizləmə → təsdiq) |
| `/admin/content` | CMS: `ContentPage` (yan-yana Markdown önizləməsi) + `Faq` + `GuidePlace` |
| `/admin/audit` | Audit jurnalı — YALNIZ OXU, 5 filtr + CSV ixrac |
| `/admin/stats` | Universitet miqyaslı «İndi haradayıq?» (Blok 10B-nin qalan borcu bağlandı) |

⚠️ **`/admin/import` NAVİQASİYADA YOXDUR və bu, qərardır:** `ADMIN_NAV` səkkiz
bölmədən ibarətdir və import cohort idarəsinin bir ADDIMIDIR, ayrı bölmə deyil.
Keçid `/admin/cohorts` və idarə panelindən verilir.

### 🔴 TƏLƏ A — moderasiya axını, ADDIM-ADDIM

CLAUDE.md: «`PRIVATE` → yalnız sahibi. Admin belə oxumur (audit log istisna).»
Yəni admin olmaq məzmunu oxumaq HÜQUQU deyil — oxumaq AYRI, İZLƏNİLƏN hərəkətdir.

1. `listReportQueue(viewer, filters)` şikayət SƏTİRLƏRİNİ qaytarır: səbəb,
   şikayətçinin mətni (`details`), tarix, hədəfin NÖVÜ + `id`-si + GÖRÜNÜRLÜK
   SƏVİYYƏSİ + statusu.
   🔴 Hədəf sorğusu (`GUARD_SELECT`) yalnız `visibility` / `cohortId` / sahib /
   `status` seçir — `title`, `body`, `description` SORĞULANMIR, yəni cavab
   obyektində MÖVCUD DA DEYİL. «Səhvən göstərmək» struktur olaraq mümkün deyil.
2. Moderator «Moderasiya baxışı» düyməsinə basır (`ReportActions`, client).
3. `openModerationReview(viewer, reportId)`:
   a. `assertFreshAdmin` — rol BAZADAN;
   b. hədəfin QORUMA sahələri oxunur (məzmun yox) → `canModerate(viewer, r)`;
   c. **TƏK TRANSAKSİYA: ƏVVƏLCƏ `recordAudit(action: MODERATE)`, SONRA
      `readContent(tx, …)`.** Audit yazıla bilmirsə transaksiya geri qayıdır və
      funksiya məzmunu QAYTARMIR — «izsiz baxış» halı mümkün deyil.
4. Məzmun YALNIZ cavabda qayıdır: səhifə onu SERVERDƏ render ETMİR, yəni
   düyməyə basılmayana qədər HTML-də mətnin izi yoxdur. `state`-də saxlanılır və
   səhifə yenilənəndə itir (baxış bir dəfəlik hərəkətdir).

**AuditLog `metadata`-sına MƏZMUN YAZILMIR.** `lib/admin-rules.ts` →
`AUDIT_METADATA_KEYS` AĞ SİYAHIDIR (16 açar) və `safeAuditMetadata()` ondan
kənar hər şeyi ATIR. Səbəb: jurnal `/admin/audit`-də GÖSTƏRİLİR — oraya düşən
`PRIVATE` mətn qoruma qapısından YAN KEÇƏRDİ.

⚠️ `ACCESSIBILITY` qeydlərində baxış YOXDUR: `entityId` DB sətri deyil, SƏHİFƏ
YOLUDUR (11A qərarı) → `NOT_CONTENT` qayıdır və audit sətri də yazılmır
(baxılacaq şəxsi məlumat olmadığı üçün sətir yalnız səs-küy olardı).

### 🔴 TƏLƏ B — «JWT-də rol saxlamağın riski nədir?» (müdafiə cavabı)

**Risk.** Sessiya JWT-dir (`Session` cədvəli YOXDUR — sxem şərhi). `systemRole`
token-in İÇİNDƏDİR, yəni server sessiyanı LƏĞV EDƏ BİLMİR. Admin birini
`USER`-ə endirsə, həmin adamın brauzerindəki token hələ `UNIVERSITY_ADMIN`
deyir və o, token bitənə qədər `/admin`-ə girməyə davam edərdi. Bu, klassik
SƏLAHİYYƏT QALXMASI PƏNCƏRƏSİDİR.

**Həll — iki qat:**

1. **Rol hər sorğuda BAZADAN oxunur.** `lib/viewer.ts` → yeni
   `readSystemRole(userId)` (React `cache()` — render başına BİR sorğu);
   `getViewer()` `systemRole`-u ondan alır, `requireAdmin()` isə onu AÇIQ
   yenidən çağırır (imza dəyişməyib, içi bərkidilib). Servis qatı üçün ayrıca
   `lib/admin-guard.ts` → `isFreshAdmin` / `assertFreshAdmin` var, çünki
   `requireAdmin()` `forbidden()` çağırır və o, HTTP/səhifə kontekstinə
   bağlıdır (API-də JSON, testdə adi xəta lazımdır). Sətir tapılmasa və ya
   hesab DEAKTİVDİRSƏ ən aşağı səlahiyyət qaytarılır (fail closed).
2. **İstifadəçi xəbərdar edilir.** Rol dəyişəndə hədəfə `Notification` gedir və
   `/admin/users` səhifəsində izah zolağı var: «dəyişiklik növbəti girişdə tam
   qüvvəyə minir».

**Token-dəki rol SİLİNMƏDİ və silinməməlidir:** `middleware.ts` Edge-dədir və
Prisma-ya çıxa bilmir, yəni BİRİNCİ süzgəc hələ də token-dədir. Middleware ucuz
və tezdir; DB yoxlaması isə AVTORİTETDİR — köhnə token yönləndirməni yalnız
GECİKDİRƏ bilər, səhifəni AÇA bilməz. `/api/v1` tərəfində eyni qapı
`lib/api/guard.ts` → **`withAdmin`**-dədir (yeni, `withUser` üzərində).

### 🔴 TƏLƏ C — admin özünü kilidləyə bilmir (üç qoruma)

Qaydalar SAF funksiyalardadır (`lib/admin-rules.ts`), servis yalnız DB
kontekstini yığır:

1. `checkSystemRoleChange` → **`SELF_DEMOTE`** — admin ÖZ sistem rolunu endirə
   bilməz;
2. `checkSystemRoleChange` → **`LAST_ADMIN`** — sonuncu AKTİV admin endirilə
   bilməz;
3. `checkDeactivation` → **`SELF_DEACTIVATE`** — admin öz hesabını deaktiv edə
   bilməz.

**`adminCount` TRANSAKSİYANIN İÇİNDƏN oxunur.** Kənarda oxusaydıq iki eyni anlı
sorğu (son iki admini paralel endirmək) hər ikisi «2 admin var» görüb keçərdi —
klassik TOCTOU.

⚠️ **Dürüst qeyd:** `LAST_ADMIN` ARDICIL icrada YARANMIR — əməliyyatı edən özü
aktiv admindir, yəni hədəfdən başqa ən azı bir admin var (say ≥ 2). Say 1
YALNIZ yarış halında görünür. Yəni qayda məhz TOCTOU qoruyucusudur; bu, saf
funksiya testində hər kombinasiya üçün ölçülüb, inteqrasiya testi isə real
axında sistemin adminsiz qalmadığını yoxlayır.

⚠️ `targetIsActive` bayrağı sonradan əlavə olundu: onsuz qayda YALANDAN işə
düşürdü — DEAKTİV adminin rolunu almaq bloklanırdı, halbuki o, `adminCount`-a
onsuz da daxil deyil və sistemdə işlək admin qalırdı.

**SİLMƏ YOXDUR — DEAKTİVASİYA VAR.** Sxemə `User.deactivatedAt DateTime?`
əlavə olundu (miqrasiya `admin_deactivation`). Səbəb: `User` silinsə
`onDelete: Cascade` onun bütün paylaşımlarını, şərhlərini, xatirələrini və
nailiyyətlərini aparardı — yəni SİNFİN xronologiyasından BAŞQALARININ da
xatirəsi yox olardı. Deaktivasiya İKİ QAT işləyir:
`src/auth.ts` girişi rədd edir (vaxt kanalı da bağlıdır — bcrypt müqayisəsi
yenə işlədilir) və `getSessionUser()` `null` qaytarır → layout
`SESSION_EXPIRED_PATH`-ə yönləndirir, kuka silinir, açıq sessiya bağlanır.

### 🔴 TƏLƏ D — audit jurnalı yalnız əlavə olunur

Qadağa ÜÇ QATDADIR və hər üçü ayrıca testlidir:

- `services/audit.service.ts` silmə/redaktə funksiyası **İXRAC ETMİR**
  (`audit.service.test.ts` modul ixraclarını gəzir + mənbə mətnində
  `auditLog.delete|update|upsert(` çağırışının olmadığını yoxlayır);
- `/admin/audit` səhifəsində düymə yoxdur (e2e: silmə/təmizlə/redaktə düyməsi
  və `form[method=post]` sayı = 0);
- `/api/v1/admin/audit` yalnız `GET` ixrac edir (openapi testi yolda yalnız
  `get` olduğunu, e2e isə POST/PUT/PATCH/DELETE üçün 405 gəldiyini yoxlayır).

Yeganə yazma yolu `recordAudit(tx, …)`-dir və o, HƏMİŞƏ əməliyyatla EYNİ
transaksiyada çağırılır (`tx` arqument kimi ötürülür — ayrı yazılsaydı
«əməliyyat oldu, audit sınıb» halı mümkün olardı).

### 🔴 TƏLƏ E — CSV import müqaviləsi

**Sütunlar:** `email,firstName,lastName,facultyCode,programCode,admissionYear`
(sıra sərbəstdir, adlar məcburidir; `facultyCode`/`programCode` = `slug`).

**Fayl səviyyəsində rədd:** `EMPTY_FILE` · `MISSING_COLUMN` ·
**`FORBIDDEN_COLUMN`** (şifrə sütunu) · `NO_DATA_ROWS`.
**Sətir səviyyəsində rədd:** `COLUMN_COUNT` · `INVALID_EMAIL` ·
`NOT_UNIVERSITY_EMAIL` · `MISSING_NAME` · `MISSING_CODE` · `INVALID_YEAR` ·
`DUPLICATE_IN_FILE`.
**DB kontekstində rədd:** `UNKNOWN_FACULTY` · `UNKNOWN_PROGRAM` · `NO_COHORT`.

**Qaydalar:**
- `previewImport` BAZAYA YAZMIR — funksiyada `create`/`update` çağırışı yoxdur
  (inteqrasiya testi `User` sayını əvvəl/sonra müqayisə edir);
- `commitImport` TƏK `prisma.$transaction` — QİSMƏN YAZI OLMAZ;
- **faylda BİR rədd edilmiş sətir varsa yazı ÜMUMİYYƏTLƏ getmir**
  (`HAS_REJECTED_ROWS`). «Yaxşıları yazaq, pisləri atalım» yolu SEÇİLMƏDİ:
  SIS ixracında bir sətrin pozulması adətən SÜTUN SÜRÜŞMƏSİ deməkdir və
  «yaxşı» sətirlər də səhv məlumat daşıya bilər;
- təkrar e-poçt → mövcud istifadəçi YENİLƏNİR (yeni sətir yaranmır);
- 🔴 **şifrə QƏBUL EDİLMİR** — parse mərhələsində. Yeni hesab
  `UNSET_PASSWORD_HASH` (`"!unset"`, qəsdən etibarsız bcrypt hash) ilə yaradılır
  və `src/auth.ts` onu AÇIQ ŞƏKİLDƏ rədd edir. Seed-in sabit duzu buraya
  KOPYALANMADI — o, yalnız demo üçündür;
- BOM kəsilir (yalnız faylın əvvəlindən), CRLF/LF ikisi də, RFC 4180 dırnaqları,
  2 MB limit, `text/csv`;
- bütün import → **BİR** AuditLog sətri (`entityType: "SisImport"`,
  metadata: `created` / `updated` / `rejected`);
- **`previewToken`** — normallaşdırılmış mətnin FNV-1a hash-ı. `commitImport`
  onu yenidən hesablayıb müqayisə edir: admin önizlədikdən sonra başqa fayl
  seçib «Təsdiqlə»yə basa bilməsin. Serverdə vəziyyət saxlanılmır. Yalnız sətir
  sonu formatı fərqlənən eyni fayl EYNİ jeton verir.

### 🔴 TƏLƏ F — cohort slug-ı

`@@unique([scope, facultyId, programId, admissionYear])` DUBLİKATI HƏMİŞƏ
DAYANDIRMIR: SQL-də iki `NULL` bir-birindən FƏRQLİ sayılır (sxem şərhi bunu
açıq yazır). Əsl qoruyucu `slug @unique`-dir və o, YALNIZ slug DETERMİNİSTİK
olduqda işləyir: `cohortSlugOf(programSlug, graduationYear)` — formul seed ilə
EYNİDİR. Mövcudluq TRANSAKSİYA İÇİNDƏ yoxlanılır, üstəlik `P2002` də tutulur
(DB son sözü deyəndir). Forma slug SAHƏSİ GÖSTƏRMİR — yalnız ÖNİZLƏMƏ.

**SİLMƏ YOXDUR VƏ TƏKLİF EDİLMİR:** `Cohort` silinsə cascade sinfin bütün
məzmununu aparardı; sxemdə «arxivlə» sahəsi də yoxdur, ona görə mövcud olmayan
düymə ekranda göstərilmir. Tarix dəyişəndə `ensureCohortMilestones` (Blok 8)
YENİDƏN çağırılır — idempotentdir, köhnə milestone-lar avtomatik düzəlir.

### 🔴 TƏLƏ G — analitikada niyə ŞƏXSƏ BAĞLI SIRALAMA YOXDUR

**Qərar:** dashboard struktur SAYLAR və AQREQAT zaman seriyası göstərir.
«Ən aktiv istifadəçilər», «kim nə qədər paylaşıb» LİDER CƏDVƏLİ YARADILMADI.

**Səbəb:** platformanın bütün məxfilik modeli istifadəçinin öz məzmununun
ƏHATƏSİNİ seçməsi üzərində qurulub — `CLASS` paylaşım sinifdən kənara çıxmır.
Universitet miqyaslı lider cədvəli həmin seçimi ARXADAN dolanardı: paylaşımın
MƏTNİ görünməsə də, «Filankəs bu ay 42 paylaşım etdi» sətri onun davranışını
ifşa edir və istifadəçi buna razılıq verməyib.

Qərar KODA da yazılıb: `lib/admin-series.ts` → `buildWeeklySeries(postDates,
memberDates, now)` girişi `Date[]`-dir, yəni `userId` ötürmək MÜMKÜN DEYİL;
servis sorğusu `authorId` belə seçmir. Çıxış açarları yalnız
`week` / `label` / `posts` / `members`-dir (test bunu bərkidir).

`/admin/stats` universitet miqyaslı «İndi haradayıq?»-dır və orada k-anonimlik
(≥ 3 nəfər), «Açıqlanmayan» xanası və `includeInStats` razılığı EYNİ qüvvədədir
— admin olmaq bu qapıların heç birini açmır.

### CSV export və `redactProfile`

`/admin/users` ixracı AĞ SİYAHIDIR (10 sütun). `phone` / `personalEmail`
ÜMUMİYYƏTLƏ SORĞULANMIR (`ADMIN_USER_SELECT`-də yoxdur) — sahə yaddaşa belə
gəlmir. «Şəhər» sütunu isə `redactProfile(profile, viewer, fieldVisibility)`-dən
KEÇİR: admin olmaq `CLASS` səviyyəli sahəni görmək demək deyil, admin həmin
sinifdə deyilsə xana BOŞ qalır. Audit ixracı da yalnız OXU səthinin davamıdır.

### Yeni fayllar

**Saf modullar (Prisma / React yoxdur, testlə örtülü):** `lib/sis-import.ts` ·
`lib/admin-rules.ts` · `lib/admin-filters.ts` · `lib/admin-series.ts`.
`lib/labels.ts` → `REPORT_STATUS_LABELS`, `REPORT_REASON_LABELS`,
`AUDIT_ACTION_LABELS`, `SYSTEM_ROLE_LABELS` + `…Label()` (T13 — vahid mənbə).

**Server qapısı:** `lib/admin-guard.ts` (`isFreshAdmin` / `assertFreshAdmin` /
`AdminForbiddenError`) · `lib/viewer.ts` → `readSystemRole` ·
`lib/api/guard.ts` → `withAdmin`.

**Servislər:** `admin.service` (dashboard) · `audit.service` (append-only) ·
`moderation.service` (növbə · baxış · qərar · gizlətmə) · `admin-users.service` ·
`admin-cohorts.service` · `admin-content.service` · `sis-import.service`.
`achievement.service` → **`listUniversityModerationQueue`** +
`countUniversityModerationQueue` (Blok 8-in `listModerationQueue`-sinə BAYRAQ
ƏLAVƏ EDİLMƏDİ — iki icazə modeli bir funksiyada qarışanda sızma bayraq
dəyərindən asılı olur; qərar funksiyaları isə TƏKRAR İŞLƏDİLİR).

**Feature (`src/features/admin/`):** `actions.ts` · `schemas.ts` ·
`AdminPageHeader` · `AdminDashboard` · `ActivityChart` · `ReportQueue` ·
`ReportFilters` · `ReportActions` · `AdminUserTable` · `AdminUserFilters` ·
`UserRowActions` · `UserExportButton` · `CsvDownloadButton` · `AdminCohorts` ·
`CohortCreateForm` · `CohortEditForm` · `SisImportScreen` · `AdminContent` ·
`ContentEditor` · `FaqEditor` · `GuidePlaceEditor` · `AuditTable` ·
`AuditFilters` · `AuditExportButton` · `AdminStatsPanel`.

### Yeni v1 endpoint-ləri (28 → 33)

`GET /api/v1/admin/stats` · `GET /admin/reports` · `POST /admin/reports/{id}/resolve` ·
`GET /admin/audit` · `GET /admin/users`. Hamısı **`withAdmin`** (DB-dən rol),
yazma əməliyyatında `requireJson`, cavab `Cache-Control: private, no-store`.
Yeni `Admin` taqı; sxemlər `lib/api/schemas.ts`-ə (`AdminStats`, `AdminReport`,
`AdminResolveBody`, `AdminResolveResult`, `AdminAuditEntry`, `AdminUser`).

⚠️ **`/admin/users`-də YAZMA əməliyyatı YOXDUR:** rol dəyişikliyi və
deaktivasiya «son admin» / «özünü endirmə» qorumaları ilə birlikdə gəlir və
toplu skript üçün nəzərdə tutulmayıb. Veb interfeysi tək yoldur.
⚠️ **`/admin/reports` MƏZMUN QAYTARMIR** — «moderasiya baxışı» endpoint kimi
AÇILMADI: toplu avtomatlaşdırılmış oxu audit izini praktikada mənasız edərdi.

### Qərarlar (müdafiədə soruşula bilər)

- **`(admin)` qrupunda `Providers` YOXDUR (T18) və qalır.** Admin filtrləri
  nuqs deyil, adi `<form method="get">` + `<Link>` çipləridir — JS olmadan da
  işləyir və vəziyyət paylaşıla bilən URL-dir. Yeganə istisna `/admin/stats`:
  orada Blok 10B-nin `MapTabs`-ı təkrar işlədilir və o, URL vəziyyəti tələb
  edir → **yalnız həmin ağacda** `NuqsAdapter` mount olunur (TanStack Query
  GƏTİRİLMİR).
- **`(admin)/layout.tsx`-ə `<Toaster />` əlavə olundu.** O, müstəqil client
  komponentidir; onsuz server action nəticələri (rol dəyişikliyi, moderasiya
  qərarı, import) səssizcə itərdi.
- **`AuditLog.entityType` ENUM DEYİL** — sətirlər tarixən model adlarını
  (`Post`, `Cohort`, `CohortMembership`, `Report`) və bəzən enum dəyərini
  (`ACHIEVEMENT`) daşıyır. Filtr siyahısı DB-dən FACET kimi gəlir; sabit siyahı
  yazsaydıq mövcud sətirlərin bir hissəsi filtrdə GÖRÜNMƏZ olardı.
- **`metadata` xarab JSON-da səhifəni SINDIRMIR** — `parseAuditMetadata` `null`
  qaytarır və UI xam mətni göstərir.
- **CMS-də slug KİLİDİ:** `lib/content-routes.ts`-dəki `kind: "page"`
  marşrutlarının və hüquqi sənədlərin slug-ları dəyişdirilə bilmir (input
  `disabled` + server rədd edir). Slug dəyişsə ictimai səhifə 404 verər və bu,
  SAKİT sınmadır. Qalan slug-larda xəbərdarlıq göstərilir.
- **CMS gövdəsi `dangerouslySetInnerHTML` İŞLƏTMİR:** `parseMarkdown` HTML
  QURMUR, blok siyahısı qaytarır (11A-nın `markdown.test.ts`-i bunu bərkidir).
  Önizləmə eyni SAF funksiyanı client-də çağırır.
- **`GuidePlace` koordinatları CMS-dən redaktə edilmir** — səhv mövqe
  ziyarətçini mövcud olmayan ünvana aparardı.
- **Dashboard sayları görünürlük süzgəcindən KEÇMİR və bu, qəsdli fərqdir:**
  sinif səhifəsindəki saylar (`getCohortHeadlineStats`) İSTİFADƏÇİYƏ göstərilir,
  buradakılar isə İDARƏETMƏ göstəriciləridir («neçə açıq şikayət var?» sualına
  «sənin görə bildiyin qədər» cavabı mənasızdır). Qiyməti: qapı
  `assertFreshAdmin`-dir və heç bir MƏZMUN qaytarılmır, yalnız SAYLAR.

### Yol boyu tapılan iki səhv (ikisi də düzəldildi)

1. 🔴 **Test təmizliyində «ən yeni N sətri sil» YANLIŞDIR.** Seed audit və
   bildiriş sətirlərinin bir hissəsi GƏLƏCƏK tarixlidir
   (`resolvedAt = createdAt + 1..10 gün` bugünü keçə bilər), yəni `createdAt
   desc` sıralaması ilə silmək SEED sətirlərini aparırdı: say düz qalırdı
   (46), MƏZMUN isə sürüşürdü (`aud-031`, `aud-035` itmişdi). Determinizm
   yoxlaması bunu tutdu. İndi təmizlik `id` ÇOXLUĞU ilə aparılır.
2. 🔴 **`@updatedAt` bərpanı da damğalayır — MÖVCUD TESTLƏRDƏ də.**
   `prisma.*.update()` `@updatedAt` sahəsini AVTOMATİK yeniləyir, yəni sətri
   «geri qaytaran» update onu təzə damğa ilə yazır. Bu, Blok 9S/11A-dan bəri
   `api.db.test.ts` və `public-content.db.test.ts`-də (ContentPage
   `isPublished` toggle-ı) SƏSSİZ determinizm sürüşməsi yaradırdı. Hər üç yerdə
   bərpa XAM SQL-ə (`$executeRaw`) keçirildi — Prisma-nın avtomatik sahə
   məntiqindən yan keçir.

### Testlər

vitest **1442** (1275 → +167: `sis-import` 25, `admin-filters` 26,
`admin-rules` 21, `admin-series` 11, `audit.service` 5, `admin.db` 34,
`openapi` +45 (3 yeni + avtomatik `it.each`)).
playwright **148** (133 → +15: `admin.spec.ts`).
`openapi.test.ts` və `api-docs.spec.ts`-dəki sabit endpoint sayı 28 → **33**,
POST siyahısı 5 → **6**.

`npx tsc --noEmit` · `npm run lint` · `npm run build` təmiz.
`grep -rn "prisma\." src/app src/features` → yalnız şərhlər.
`grep -rn "#[0-9a-f]\{3,6\}" src/features/admin src/lib/admin-*.ts` → BOŞ.

🔴 **Determinizm ölçüldü:**
- iki ardıcıl seed → 28 cədvəl **bayt-bayt eyni**;
- TAM vitest dəstindən sonra → 28 cədvəl **bayt-bayt eyni** (yuxarıdakı iki
  düzəlişdən sonra);
- tam e2e dəstindən sonra → 27 cədvəl bayt-bayt eyni, `User` cədvəlinin SAYI
  eyni (125), DƏYƏRLƏRİ isə yox. Bu, Blok 11A-da sənədləşdirilmiş MÖVCUD
  davranışdır: giriş axını `lastSeenAt` / `stage` / `updatedAt` sütunlarını
  yeniləyir. Yoxlanıldı: import istifadəçisi qalmayıb (0), deaktiv hesab yoxdur
  (0), admin sayı 1-dir.

### Qalan borc

- **Cohort rolu YALNIZ ƏSAS sinifdə dəyişdirilir** (`user.cohorts[0]`). İki
  sinifdə üzv olan istifadəçi üçün ikinci sinfin rolu UI-dan idarə olunmur —
  servis (`changeCohortRole`) `cohortId` alır, yəni ekran işi qalıb.
- **CMS-də YARATMA yoxdur, yalnız redaktə.** Yeni `ContentPage` / `Faq` /
  `GuidePlace` seed-dən gəlir; yaratma formu marşrut xəritəsi ilə
  uzlaşdırılmalıdır (yeni slug hansı ünvanda görünəcək?).
- **Moderasiya növbəsində toplu əməliyyat yoxdur** (bir-bir qərar). Toplu
  «hamısını rədd et» audit izini kütləviləşdirər və hər sətrin öz səbəbi
  itərdi.
- **`/admin/import` yalnız İSTİFADƏÇİ importudur.** Cohort və ixtisas importu
  yoxdur — onlar əl ilə yaradılır (say azdır, səhvin qiyməti yüksəkdir).
- **Şifrə bərpası axını hələ YOXDUR**, yəni SIS ilə yaradılan hesab praktikada
  qeydiyyat formasından (eyni e-poçtla) keçməlidir. `UNSET_PASSWORD_HASH`
  müqaviləsi hazırdır; axının özü Blok 12/13 işidir.
- **`/admin/stats` cohort filtri daşımır** — universitet miqyası sabitdir.

---

## Blok 11C — bitdi (git push açılması + tarixçə sızma auditi)

Yeni məhsul funksiyası YOXDUR — bu blok yalnız repozitoriya və təhlükəsizlik
işidir. Nəticə: 27 commit-lik tarixçə push üçün **sıfır tapıntı** ilə təsdiqləndi
və push aləti hazırdır (push-un ÖZÜ hələ işlədilməyib — token istifadəçidədir).

### Yeni fayllar

| Fayl | Nə edir |
|---|---|
| `scripts/git-config.mjs` | `fs` / `REPO_ROOT` / `DEFAULT_AUTHOR` — hər üç git skriptinin ORTAQ konfiqi |
| `scripts/git-audit.mjs` | şəbəkəsiz, yalnız-oxu sızma auditi (`npm run git:audit`) |
| `scripts/git-push.mjs` | PAT ilə push + uzaqdan təsdiq (`npm run git:push`) |
| `docs/git-audit-report.md` | auditin törəmə hesabatı (maskalanmış) |

`scripts/git.mjs` yalnız konfiqi ORTAQ modula köçürmək üçün toxunuldu — davranışı
dəyişməyib (`node scripts/git.mjs log` → 27 commit).

### Auditin əsas prinsipi

🔴 **İşçi ağaca baxmaq SƏHVDİR.** `.gitignore` yalnız GƏLƏCƏK commit-ləri süzür;
bir dəfə commit olunmuş `.env` tarixçədə ƏBƏDİ qalır. Ona görə audit
`git.log({ depth: Infinity })` → hər commit üçün `git.walk(git.TREE({ ref }))`
ilə **BÜTÜN 27 ağacı** gəzir: 547 unikal yol, 694 unikal blob.

Blob məzmunu **oid-ə görə bir dəfə** oxunur (eyni fayl onlarla commit-də
təkrarlanır) — tam audit 0.5 saniyə çəkir.

Yoxlanan beş şey: qadağan yollar · məzmun (sirr şablonları) · ölçü (50/100 MB) ·
`.gitignore` uyğunluğu (hər iki istiqamətdə) · müəllif kimliyi.

### İlk işlətmədə 7 tapıntı çıxdı — hamısı SKANERİN səhvi idi

Sənəd nümunələri sirr kimi bildirilmişdi. Düzəliş **sənədə deyil, skanerə**
edildi:

1. **Dırnaqlı dəyər bütöv tutulmalıdır.** `[^\s]+` şablonu
   `AUTH_SECRET="<npx auth secret ilə yarat>"` sətrindən yalnız `<npx` qoparırdı;
   ağ siyahıdakı `<...>` placeholder şablonuna uyğun gəlmirdi.
2. **Nümunə bağlantı sətri** (`postgresql://user:pass@host:5432/db`) və
   **shell əvəzləməsi** (`AUTH_SECRET="'$(openssl rand -base64 32)'"`) ağ
   siyahıya alındı — ikincisi sabit dəyər deyil, işlədildikdə generasiya olunur.

### 🔴 «0 tapıntı» iki mənalıdır — ona görə öz-yoxlama var

Sıfır nəticə həm «tarixçə təmizdir», həm də «skaner sınıqdır» deməkdir; ikincisi
daha təhlükəlidir, çünki YAŞIL görünür. `npm run git:audit -- --self-test`
süni fikstürlərlə hər qaydanın işə düşdüyünü və ağ siyahının onları udmadığını
sübut edir: **18 məzmun + 20 yol fikstürü, hamısı keçir.**

### Nəticə

```
commit 27 · unikal yol 547 · unikal blob 694 · izlənən fayl 544
ən böyük blob 421.8 KB (package-lock.json) — 50 MB həddindən çox-çox aşağı
migrations 4 fayl ✓ · .env.example izlənir ✓
müəllif: Elmeddin Heydarov <heydarovelmeddin2@gmail.com> ×27 (VAHİD)
🔴 blok 0 · ⚠️ xəbərdarlıq 0
```

`.env`, `dev.db`, `public/uploads/`, `.next/`, `node_modules/` tarixçənin heç bir
nöqtəsində YOXDUR. Müəllif kimliyi 27 commit-də eynidir və e-poçt real GitHub
hesabına bağlanandır → `git-rewrite-author.mjs` **lazım olmadı və yazılmadı**.

### Yol boyu tapılan tələlər

- **T33 — müəllif e-poçtu töhfə qrafikini müəyyən edir.** GitHub commit-i
  qrafikə yalnız e-poçt hesaba bağlı olduqda yazır, Holberton isə məhz commit
  tarixçəsinə baxır. Placeholder (`user@example.com`, boş, `noreply`) qalarsa
  iş «başqasının» görünür. Düzəliş yalnız push-DAN ƏVVƏL ucuzdur: sonra hər
  commit-in SHA-sı dəyişir. Audit bunu hər işlətmədə yoxlayır.
- **T34 — uzaq repo BOŞ yaradılmalıdır** (README / `.gitignore` / lisenziya
  SEÇİLMƏDƏN). Əks halda uzaqda bizim tarixçədə olmayan commit yaranır, push
  `non-fast-forward` ilə rədd olunur, `--force` isə həmin commit-i silir.
- **T35 — PAT icazələri.** classic → `repo` scope; fine-grained → məhz bu repo
  seçilmiş + `Contents: Read and write`. **401 = icazə/expiry problemi, kod
  problemi deyil.**
- **T36 — 403 `push protection` = tarixçədə REAL sirr var.** Bypass linkinə
  basma; auditə qayıt, sirri çıxar və dəyəri **ROTASİYA ET** — cəhd zamanı o
  dəyər artıq şəbəkəyə çıxıb sayılır.
- **T37 — `git.walk` map-ində `null` QAYTARMA.** `_walk` mənbəyində
  `if (parent !== null) { iterate(...) }` — yəni `null` alt qovluğa enməyi
  DAYANDIRIR. Qovluqlar üçün `undefined` qaytarılmalıdır, əks halda audit
  yalnız kök qovluğu görər və «təmiz» deyər.
- **T38 — `onAuthFailure` həm MƏCBURİDİR, həm də səbəbi GİZLƏDİR.** Onsuz
  isomorphic-git eyni etimadnamə ilə sonsuz təkrar cəhd edir; `{ cancel: true }`
  ilə isə `UserCanceledError("The operation was canceled.")` atılır — 401
  mesajda HEÇ GÖRÜNMÜR. `git-push.mjs` bu xətanı açıq şəkildə tərcümə edir.
- **T39 — skanerin ÖZÜ öz grep-inə düşməməlidir.** DoD `grep -rn "gh"+"p_"`
  axtarır; token prefiksləri qaydalarda parçalanmış (`${GH}p_`) qurulur.
  Eyni səbəbdən `AD = dəyər` şablonları `\s*=\s*` ayırıcısı ilə yazılır — belə
  olanda regexp ÖZ MƏNBƏYİNƏ uyğun gəlmir, əks halda skript commit olunan kimi
  növbəti audit özünü «sızma» sayardı.

### 🔴 Auditdən kənar, amma push-u dəyərsizləşdirən tapıntı

`package-lock.json` **izlənirdi, lakin köhnə idi**: commit olunmuş versiyada
`world-atlas` ümumiyyətlə yox idi, `topojson-client` isə kök asılılıqlar
siyahısında görünmürdü (hər ikisi Blok 10B-nin xəritəsi üçün lazımdır).
Nəticə: təzə klonda `npm ci` **«lock file out of sync»** ilə dayanardı — yəni
repo push olunsa da, açan adam layihəni QURA BİLMƏZDİ.

Səbəb: `git.mjs` yalnız AÇIQ verilən yolları stage edir; əvvəlki bloklarda
`package.json` verilib, `package-lock.json` isə verilməyib. Diskdəki lock artıq
düzgün idi (17:15-də quraşdırma zamanı yenilənmişdi) — sadəcə commit edilməmişdi.
Yoxlanıldı: `package.json`-dakı 51 asılılığın hamısının lock-da girişi var və
heç bir versiya aralığı fərqlənmir.

⚠️ `docs/git-audit-report.md` TÖRƏMƏ fayldır — hər `npm run git:audit`
işlətməsində yenidən yazılır, ona görə auditdən sonra işçi ağacda «dəyişilmiş»
görünməsi normaldır (hesabat özünü ehtiva edən commit-i saya bilmir).

### Dayanma nöqtəsi

Push **qəsdən işlədilməyib**: PAT istifadəçidədir və token bu terminalda
interaktiv oxuna bilməz. `npm run git:push` hazırdır və işə düşməzdən əvvəl
auditi AYRI PROSES kimi çağırır — yəni tapıntı varsa şəbəkəyə çıxmadan dayanır
(sıra: AUDİT → PUSH, tərsinə heç vaxt).

---

## Blok 12C — bitdi (əlçatanlıq · performans · responsive · vəziyyətlər)

Yeni funksiya YOXDUR — bu blok **ölçdü, tapdı, düzəltdi və sübut etdi**.
Tam hesabat: `docs/quality-report-12c.md`.

```
npx tsc --noEmit  ✓    npm run lint  ✓    npm run build  ✓
vitest      1510 passed   (1495 → +15)
playwright   212 passed   (148  → +64)
```

### Nə ölçüldü, nə tapıldı

| Ölçü | Əvvəl | Sonra |
|---|---:|---:|
| axe `serious` (12 səhifə × 2 vəziyyət) | **141 node** | **0** |
| Lighthouse desktop, 5 səhifə (ən aşağı) | 100 | 100 |
| Lighthouse mobil, 5 səhifə (ən aşağı) | 86 | 87 |
| Üfüqi sürüşmə (5 breakpoint × 10 səhifə) | 2 səhifə | **0** |
| Toxunma hədəfi < 24px (WCAG 2.2) | 7 element sinfi | **0** |

Beş axe qaydası düzəldildi: `dlitem` + `definition-list` (72+24 node —
`DirectoryCard`-da `dl > div > div > dt`), `color-contrast` (27 — `bg-muted`
üzərində `text-text-secondary` 3.86:1, `ku-cream/40` üzərində 4.49:1),
`link-in-text-block` (16 — cümlə içindəki link yalnız rənglə seçilirdi),
`nested-interactive` (2 — xəritə `role="img"` idi, fokuslanan markerlərlə).

### Yeni fayllar

| Fayl | Nə edir |
|---|---|
| `tests/e2e/a11y.spec.ts` | axe-core · 12 səhifə × 2 vəziyyət (24 test) |
| `tests/e2e/a11y-keyboard.spec.ts` | klaviatura, fokus tələsi, canlı bölgə, reduced-motion (14 test) |
| `tests/e2e/empty-states.spec.ts` | boş vəziyyət gəzintisi + 404 sərhədləri (12 test) |
| `src/lib/kuds-contrast.test.ts` | KUDS kontrast qaydalarının mənbə skanı + öz-yoxlama |
| `src/features/feed/FeedList.test.tsx` | lentin boş/xəta ayaqları (komponent testi) |
| `scripts/lighthouse-audit.ts` | `npm run audit:lighthouse` — auth kukisi ilə 5 səhifə |
| `scripts/responsive-shots.ts` | `npm run audit:responsive` — 5 bp × 10 səhifə + ölçmə |
| `scripts/query-profile.ts` | `npm run audit:queries` — N+1 profili |
| `src/components/kuds/use-dialog-focus-restore.ts` | **T44** düzəlişi |
| `src/components/shared/{RouteError,RouteNotFound,PageSkeleton,ChartSkeleton,filter-chip}` | ortaq vəziyyət/ton komponentləri |
| `src/app/(public|app|admin)/{error,not-found}.tsx` + `(admin)/loading.tsx` | route qrupu sərhədləri |
| `src/features/**/*.lazy.tsx` (4 ədəd) | Recharts → `next/dynamic(ssr:false)` |

### 🔴 T44 — Radix `Dialog` fokusu yalnız `DialogTrigger` olanda qaytarır

`DialogContent` `onCloseAutoFocus`-da `event.preventDefault()` çağırıb fokusu
`context.triggerRef`-ə verir. Layihədəki 7 modaldan 6-sı idarə olunandır
(`open`/`onOpenChange`), yəni `triggerRef` **null**-dur → brauzerin öz bərpası
ləğv olunur, fokus isə heç kimə getmir və `<body>`-yə düşür. Esc-dən sonra
növbəti Tab səhifənin əvvəlindən başlayırdı (WCAG 2.4.3).
`useDialogFocusRestore()` `focusin` ilə modaldan KƏNARDA fokuslanan son elementi
saxlayır və ona qaytarır. «`open` dəyişəndə `activeElement`-i oxu» yanaşması
İŞLƏMİR: Radix fokusu uşaq effektində köçürür, valideyn effekti isə sonra işləyir.

### 🔴 `loading.tsx` yalnız `(admin)` qrupundadır — ölçülmüş qərar

`loading.tsx` seqmenti AXINLA render edir → HTTP statusu məzmundan ƏVVƏL
göndərilir → sonrakı `notFound()` statusu dəyişə bilmir.

```
(app)/loading.tsx VAR  → GET /class/<yoxdur> = 200  🔴
(app)/loading.tsx YOX  → GET /class/<yoxdur> = 404  ✓
```

`(app)` + `(public)`-də **25 səhifə** `notFound()` çağırır və üç mövcud e2e
testi 404 statusunu ölçür; «yoxdur»/«icazə yoxdur» ayırd edilməməsi də statusa
söykənir. `(admin)`-də heç bir səhifə `notFound()` çağırmır → orada təhlükəsizdir.

### Digər ölçülmüş qərarlar

- **ISR ictimai səhifələrdə TƏTBİQ EDİLMƏDİ**: `ConsentGate` → `cookies()`
  bütün `(public)` route-larını dinamik edir (sübut: `/docs` DB-yə toxunmur,
  yenə `ƒ`). PPR experimental, stack kilidlidir. Ölçü itki göstərmir
  (`server-response-time` 20–40 ms, desktop 100).
- **`/home` mobil 87**: yönləndirmə 600 ms alır; hədəf səhifə birbaşa ölçüləndə
  (`/class/[slug]`) **91**.
- **Bundle**: `/class/[slug]/map` 279 → **159 kB**, `/events/[id]` 275 → **162 kB**.
- **N+1 YOXDUR**: feed/directory/timeline — `take` 6 → 24 dəyişəndə sorğu sayı
  sabit qalır (11/11/4).
- **Törəmə artefaktlar gitignore-dadır**: `docs/lighthouse/**/*.{html,json}`
  (17 MB) və `docs/responsive/*.png` (34 MB). Xülasə markdown-ları qalır.

### Ölçmə tələsi (yol boyu tapıldı)

`next start` REBUILD-DƏN SONRA yenidən qaldırılmalıdır. Köhnə server köhnə
HTML-i verir, brauzer artıq mövcud olmayan chunk hash-lərini istəyir → 400 →
Lighthouse «Best Practices 96» göstərir. Kodun deyil, ölçmənin nasazlığıdır.

---

## Sprint 2 — Blok 14B/14C — bitdi (REST yazma səthi)

`/api/v1` paylaşım/xatirə/tədbir üçün tam CRUD alır. `src/features/feed/post-input.ts`
Server Action və REST route arasında paylaşılan çevirmə köməkçilərini daşıyır —
"use server" faylından saf funksiya ixrac oluna bilmədiyi üçün ayrılıb.

```
npx tsc --noEmit  ✓    npm run lint  ✓    npm run build  ✓
vitest      1759 passed   (65 fayl, əvvəl 1510 / 61)
playwright   212 passed   (20 fayl)
```

### Hazırkı vəziyyət cədvəli

| Ölçü | Rəqəm | Mənbə |
|---|---:|---|
| `/api/v1` route (sənədin özü daxil) | 36 | `find src/app/api/v1 -name route.ts \| wc -l` |
| Sənədləşən əməliyyat (v1) | 44 | `src/lib/api/openapi.test.ts` → "bütün v1 endpoint-ləri sənəddədir" |
| Sənədləşən əməliyyat (v1-dən kənar: upload×2 + ics) | 3 | eyni fayl |
| Sənədləşən əməliyyat — CƏMİ | 47 | `tests/e2e/api-docs.spec.ts` → "operationId var" |
| Vitest | 1759 / 65 fayl | `npm run test` |
| Playwright | 212 / 20 fayl | `npm run test:e2e` |
| `npx tsc --noEmit` | təmiz | |
| `npm run lint` | təmiz | |
| `npm run build` | təmiz | |
| `docs/openapi.json` drift | yoxdur | `npm run docs:openapi` sonra fayl dəyişmir |

### Tapılan və düzəldilən boşluq

`tests/e2e/api-docs.spec.ts`-dəki sabit gözləmə (`expect(count).toBe(33)`)
Blok 14B/14C-dən sonra köhnəlmişdi — sənəd 47 əməliyyat elan edir, test isə 33
gözləyirdi. `npm run build && npm run test:e2e` işlədəndə **qırmızı** çıxdı.
`src/lib/api/openapi.test.ts`-dəki qarşılığı (`v1Operations.length` → 44) artıq
Blok 14B/14C-nin özündə yenilənmişdi; e2e faylı unudulmuşdu. Hər iki fayl indi
eyni riyaziyyata istinad edir.

### Dayanma nöqtəsi

Push **qəsdən işlədilməyib** — PAT istifadəçidədir, token bu terminalda
interaktiv oxuna bilməz (bax `scripts/git.mjs` başlığı). `npm run git:push`
hazırdır: işə düşməzdən əvvəl auditi AYRI PROSES kimi çağırır, tapıntı varsa
şəbəkəyə çıxmadan dayanır.

---

## Sprint 3/4 — Blok 12D — bitdi (yüklənmə vəziyyəti + responsive matrisi)

Blok Sprint 3 F4 (loading state «bütün uyğun səhifələrdə»), Sprint 3 F3 + meyar 6
və Sprint 4 F3 + meyar 7 (responsive «bütün səhifələr») meyarlarını bağlayır.
Deploy artefaktlarına toxunulmayıb.

```
npx tsc --noEmit  ✓    npm run lint  ✓    npm run build  ✓
vitest      1773 passed   (66 fayl)
playwright   216 passed   (22 fayl, əvvəl 212 / 21)  ← +4 test: responsive matrisi
```

### 🔴 Blokun ƏSAS tələsi: axın statusu 200-ə kilidləyir

`loading.tsx` seqmenti `<Suspense>`-ə bükür, yəni cavab AXINLA gedir. Axın
başlayan kimi HTTP başlıqları — **o cümlədən status** — göndərilib: seqment
sonradan `notFound()` çağırsa status **200** olur. Səhifədə «tapılmadı» yazır,
protokol isə «tapıldı» deyir.

Ona görə 51 səhifə **A/B** bölünüb (tam siyahı: `docs/responsive/report.md` §7):

| Qrup | Say | Mexanizm |
|---|---:|---|
| **A** — status qapısı yoxdur | 19 | seqmentin ƏN DAR yerində `loading.tsx` |
| **B** — status qapısı var | 20 | qapı `await` edilir, YALNIZ ondan sonrakı alt-ağac `<Suspense>`-ə bükülür |
| **—** — uyğun deyil | 12 | gözləyəcək sorğu yoxdur (3) · səhifə yönləndirir (2) · yeganə sorğu 404 qərarının ÖZÜDÜR (7) |

### Yol boyu tapılan üç tələ

1. **`loading.tsx` bütün alt ağaca şamil olunur.** `/`, `/faculties`,
   `/khankendi` üçün fayl valideyn seqmentə qoyulsaydı qonşu dinamik
   seqmentlərə (`faculties/[slug]`, `khankendi/[id]`, `legal/[slug]`…) da
   düşərdi. Həll: **route qrupu** — `(public)/(landing)/`,
   `faculties/(index)/`, `khankendi/(index)/`. URL DƏYİŞMİR, seqment ağacında
   isə ayrıca səviyyə yaranır.

2. **`<Suspense>` yalnız İÇİNDƏ `await` edən komponenti bükəndə işləyir.**
   Valideyndə `await` edib nəticəni prop kimi vermək sərhədi boşa çıxarır —
   skeleton HEÇ VAXT görünmür, amma kod «edilmiş» kimi görünür. Ona görə
   sorğular səhifədən komponentlərin İÇİNƏ köçürüldü.

3. **Skeleton öz testini sındıra bilər.** `/` axınla getməyə başlayan kimi
   `landing.spec.ts:106` qırıldı: `evaluateAll` təkrar cəhd etmir və `goto()`
   qayıdanda ekranda karkas (footer `<h2>`-ləri) hazır, `<main>`-in `<h1>`-i
   isə hələ yolda idi. Şərt DEYİL, ölçmə ANI düzəldildi — mövcud
   `tests/e2e/settle.ts` → `settleHeadings()` əlavə olundu.

### Yeni / dəyişən modullar

- `src/components/shared/PageSkeleton.tsx` — **genişləndirildi** (yeni ailə
  YARADILMADI): `variant` (`cards` · `list` · `table` · `rows` · `article` ·
  `form`), `count`, `header`, `announce`. `announce={false}` səhifə daxili
  sərhədlər üçündür — bir səhifədə çoxlu `role="status"` ekran oxuyucuda
  səs-küydür, ona görə orada yalnız `aria-busy` qalır.
- `src/features/feed/ClassFeedSection.tsx` — **yeni**: lentin server qabığı
  (`listFeed` + `listEvents` səhifədən bura köçdü, tələ 2).
- `src/features/profile/ProfileEditSection.tsx` — **yeni**: teq/klub
  kataloqları qapıdan sonra axınla gəlir; `getProfileDraft` (404 qərarı)
  səhifədə, sərhəddən kənarda qaldı.
- `src/features/yearbook/ClassYearbook.tsx` → `YearbookSkeleton` ixrac edir
  (albom başlığı ~220px kartdır, `PageSkeleton`-un 60px başlığı CLS verərdi).
- `ContentRouteView`: `SectionPage` tam `<Suspense>` arxasına keçdi (bölmə
  səhifəsində `notFound()` YOXDUR — boş nəticə «məzmun hazırlanır» deməkdir);
  `SinglePage`-də isə yalnız `listSectionPages` sərhədə düşdü, `getContentPage`
  (404 qərarı) qapıda qaldı.
- `WhereAreWeNowPanel` / `ClassSupport` / `ModerationQueue` — başlıq statik,
  gövdə sərhəd arxasında (mövcud `ClassDirectory` / `ClassAchievements`
  idiomu ilə eyni). Dataya bağlı sayğaclar başlıqdan gövdəyə köçdü.

### Responsive — 51 səhifə × 5 breakpoint

- `tests/e2e/responsive.spec.ts` — **yeni QAPI**. Cədvəl-idarəli: hər cüt üçün
  dörd şərt (üfüqi sürüşmə · header 72px · sidebar 280px/çəkməcə · `#main`
  kəsilmir). Səhifəyə BİR dəfə naviqasiya, `setViewportSize` ilə beş en
  (255 yoxlama, `workers: 1`). Dördüncü test siyahının tamlığını `src/app`
  altındakı `page.tsx` SAYI ilə tutuşdurur — yeni səhifə əlavə olunanda
  matris səssizcə geri qalmır.
- `scripts/responsive-shots.ts` — siyahı 10 → **51** səhifəyə genişləndi
  (255 PNG). Siyahı testin matrisi ilə eynidir; dinamik açarlar SEED-dən
  oxunur. Hesabat `docs/responsive/report.md` — **avtomatik yaradılır**,
  əl ilə redaktə etmə.
- `.gitignore` DƏYİŞMƏYİB — PNG-lər qəsdən xaricdədir.

### Tapılan və düzəldilən qırıqlar

| Səhifə | Qırıq | Düzəliş |
|---|---|---|
| `/admin/cohorts` | 375px-də **157px üfüqi sürüşmə** — native `<select>`-in iç minimum eni 491px, grid xanası `min-width: auto` daşıdığı üçün sıxılmır | `min-w-0` + `w-full` (`CohortCreateForm.tsx`). Eyni düzəliş 12C-də `AdminUserFilters.tsx`-ə verilmişdi, bu forma unudulmuşdu |
| `/events/[id]/manage` | çeşidləmə düyməsi **73×21px** — WCAG 2.2 AA 24px qapısından aşağı | `min-h-6` (`AttendeeTable.tsx`) |

Üfüqi sürüşmə yekun ölçmədə **0/255**.

### 🔴 Köhnə iddianın DÜZƏLİŞİ — 24px qapısı

Blok 12C README №9-da «WCAG 2.2 AA-nın 24px qapısı ödənilib» yazmışdı, amma
həmin ölçmə **10 səhifədə** idi. 51 səhifəyə genişlənəndə iki shadcn primitivi
qapının altında qaldı: `Checkbox` **16×16** (`ui/checkbox.tsx` → `h-4 w-4`) və
`Switch` **36×20** (`ui/switch.tsx` → `h-5 w-9`) — beş səhifədə görünür
(`/me/career`, `/admin/moderation`, `/events/[id]/manage`,
`/class/[slug]/memories`, `/kuds`).

İkisi də `src/components/ui/`-dədir və CLAUDE.md §1-ə görə toxunulmazdır;
çağırış yerində `className` ilə böyütmək bütün sistemdə checkbox/switch ölçüsünü
dəyişən **dizayn qərarıdır**, responsive qırığı deyil. Ona görə DÜZƏLDİLMƏDİ,
amma README №9 artıq doğru rəqəmi yazır. Bu, kod borcu deyil, **açıq qərar
gözləyən dizayn sualıdır**.

### Dayanma nöqtəsi

Deploy hələ də `FLY_API_TOKEN` gözləyir (Blok 12A) — bu blok ona toxunmayıb.

---

## Sprint 3/4 — Blok 12E — bitdi (OpenAPI kor nöqtəsi + keyfiyyət təkrar ölçməsi)

**Hədəf:** Sprint 3/4-ün qalan meyarları — S3-B5 · S3 meyar 4, 5 · S4-B5 ·
S4 meyar 6. Meyar 3, 7 (S3) və 5, 8 (S4) deploy-dan asılıdır və **açıq qalır**.

### Girişdə tapılan vəziyyət — işin yarısı ARTIQ EDİLMİŞDİ

Bloka başlayanda üç bənd əvvəlki bloklarda bağlanmış çıxdı. **Yenidən
yazılmadı — yoxlanıldı və sübutu qeyd edildi:**

| Bənd | Vəziyyət | Sübut |
| --- | --- | --- |
| `coverUrl` idarə olunan sahə | ✅ artıq bağlı (`3b765e3`) | `CONTROLLED_PROFILE_FIELDS` = **22**, default **CLASS**, `buildProfileView` düzləndirir (`user.service.ts:342`), `tests/integration/cover-privacy.db.test.ts` mövcud |
| backfill | ✅ artıq işlədilib | `npm run db:backfill -- --dry` → «istifadəçi: 125 · sahə: 22 · çatışmayan sətir YOXDUR» |
| T22 `CardTitle` başlıq semantikası | ✅ artıq bağlı | `components/kuds/SectionCard.tsx` → `CardHeading` (`role="heading"` + **konfiqurasiya olunan** `aria-level`, default 2). TƏLƏ H riayət olunub: `/login`, `/register` `CardTitle` içində REAL `<h1>` işlədir — `role="heading"` ƏLAVƏ EDİLMƏYİB, ikiqat başlıq yaranmır |
| `@axe-core/playwright` | ✅ artıq lock-da | `package.json` devDependency `^4.12.1` |

⚠️ Testlərdəki «21 sahə» hardcode-u da artıq yox idi — saylar
`CONTROLLED_PROFILE_FIELDS.length`-dən oxunur (yalnız test ADLARINDA «22» sözü
nəsr kimi qalıb). Yəni TƏLƏ G-nin düzgün həlli onsuz da tətbiq olunmuşdu.

### 1. 🔴 OpenAPI drift qoruyucusunun KOR NÖQTƏSİ — bağlandı

Gəzici test `src/app/api`-ni gəzirdi, amma nəticəni `!p.startsWith("/api/v1")`
ilə süzürdü — yəni qoruyucu **məhz ictimai müqavilənin yaşadığı yerə
baxmırdı**. Nəticə: kodda 53 əməliyyat, sənəddə 52, fərq **`GET
/api/v1/openapi.json`** — və heç bir test şikayət etmirdi.

- Filtr **götürüldü**; gəzici indi 42 route faylının hamısını əhatə edir.
- Elan edilməmiş əməliyyat **sənədə əlavə edildi** (ağ siyahıya YOX): `System`
  taqının öz təsviri onsuz da «sağlamlıq yoxlaması **və sənəd**» deyirdi, yəni
  sənəd öz-özü ilə ziddiyyətdə idi. `/docs` Swagger UI və müştəri generatorları
  məhz bu ünvandan oxuyur — ictimai müqavilədir.
- Ağ siyahıda **4 route** qaldı (5 əməliyyat): `/api/auth/[...nextauth]`,
  `/api/feed`, `/api/search`, `/api/session/expired` — hər biri səbəb sətri ilə.
  ⚠️ Tapşırıqdakı siyahı `/api/upload` və `/api/events/[id]/ics`-i də ağ siyahıya
  yazırdı; **KODDAN yoxlanıldı və o, yanlışdır** — ikisi də sənəddədir
  (`Media` / `Events` taqları, 3 əməliyyat). Onlar ağ siyahıya salınsaydı
  «həm sənəddə, həm siyahıda» testi aşardı.
- **48 sənəddə + 5 ağ siyahıda = 53/53.** Elan edilməmiş əməliyyat qalmadı.

**Tələlər:**
- **A** (dinamik seqment) — `toRoutePath` ONSUZ DA var idi, amma **öz testi yox
  idi**. Altı vahid testi əlavə olundu (tək/çox seqment, statik yol, seqmentdəki
  NÖQTƏ — `openapi.json` real qovluq adıdır — catch-all toxunulmur, və
  çevrilmiş yolun sənədin REAL açarı ilə üst-üstə düşməsi).
- **B** (route qrupları) — gəzicinin kökü `src/app/api`-dir;
  `src/app/uploads/[...path]/route.ts` (12A) siyahıya düşmür. Yoxlanıldı.
- **C** (snapshot köhnəlməsi) — `npm run docs:openapi` işlədildi,
  `docs/openapi.json` commit edildi (38 yol / 48 əməliyyat).
- **D** (ikiqat sxem qeydiyyatı) — yeni əməliyyatın cavab sxemi **adlandırılmadı**
  (`.openapi("Ad")` yoxdur), inline `passthrough` obyektdir → registry-yə düşmür.

🔴 **Bir gözləntini «keçsin deyə» dəyişmək istəmədim və düzgün olan tərəf
KODDU.** Yeni əməliyyata əvvəlcə `commonResponses()` VERMƏDİM (məntiq:
`force-static` route 401 qaytara bilməz). Test aşdı: v1-in HƏR əməliyyatı 401-i
**vahid xəta zərfinin forması** kimi elan etməlidir və `PUBLIC_401`-in mətni
onsuz da «praktikada qaytarılmır» deyir — qonşu `/api/v1/health` eynidir.
Qayda düzgün idi, mənim istisnam səhv: `commonResponses({ isPublic: true })`
əlavə edildi. Sabit `44` → `45` yeniləndi (səbəbi şərhdə).

### 2. 🔴 axe + Lighthouse — TƏKRAR ölçmə REQRESSİYA TAPDI

**axe:** 24 skan (12 səhifə × anonim/giriş etmiş) → **dörd təsir səviyyəsinin
hamısında 0 pozuntu**. 12C-də qapı yalnız serious/critical idi; bu ölçmədə
`moderate`/`minor` də boşdur.

**Lighthouse desktop:** açılış səhifəsi **Performance 88 · CLS 0.223** verdi
(12C-də 100 · 0). Tək sıçrayış, node = `<footer>`.

**Səbəb — ölçülüb:** Blok 12D `(landing)/loading.tsx`-ə ümumi
`PageSkeleton variant="cards"` qoymuşdu. JS söndürülmüş brauzerlə (axının
birinci hissəsi) ölçüldü:

| | footer-in yeri | sənəd hündürlüyü |
| --- | ---: | ---: |
| skeleton | **730 px** — 940 px-lik ekranın İÇİNDƏ | 1 280 px |
| məzmun | **5 794 px** | 6 463 px |

`PublicShell`-in footer-i Suspense sərhədindən **kənardadır**, ona görə skeleton
anında görünür, sonra 5 000 px tullanır. Bu, `PageSkeleton`-un ÖZ müqaviləsinin
pozulması idi (fayl başlığı: «skeleton real səhifənin FORMASINI təqlid edir»).

**Düzəliş:** `src/features/welcome/WelcomeSkeleton.tsx` — hero + üç bölmə × üç
kart (12D-dəki `YearbookSkeleton` idiomu ilə eyni).
Nəticə: **Performance 99 · CLS 0**, footer skeleton anında **1 773 px**.
Beş desktop səhifəsinin hamısı bütün hədəfləri keçir.

**Qapı:** `tests/e2e/landing-cls.spec.ts` (**yeni**, 3 test) — desktop 1350×940
və mobil 412×823 ekranda footer-in ekrandan kənarda olmasını tələb edir.
⚠️ **Qapının boş olmadığı sübut edildi:** köhnə `loading.tsx` müvəqqəti geri
qaytarıldı, test məhz gözlənilən mesajla AŞDI («footer 730px-də…»), sonra
düzəliş bərpa olundu. Mobil ölçüdə köhnə skeleton da keçirdi — bağlayıcı
yoxlama **desktop**-dur.

**Qəbul edilmiş tapıntılar** (`docs/quality-report-12c.md` §10): 24–43 px
toxunma hədəfləri (shadcn primitivləri, `ui/` toxunulmaz; WCAG 24 px qapısı
ödənilib — iki primitivdəki istisna 12D-də açıq yazılıb) · `/home` mobil
yönləndirmə xərci · `/` SEO 91 (ölçmə artefaktı — `meta-description` HƏM
HTML-də, HƏM final DOM-da var, yoxlanıldı) · mobil TBT səs-küyü.

⚠️ **Kuki bannerinin CLS 0.035-i bu ölçmədə 0-dır** — desktop və mobil, beş
səhifənin hamısı. README №11 buna görə yeniləndi.

⚠️ **İki dəfə yaşadığım ölçmə tələsi:** `pkill` köhnə `next start`-ı öldürməmişdi,
yeni proses portu tuta bilmədi və səssizcə çıxdı → Lighthouse **KÖHNƏ build-i**
ölçdü və düzəliş «işləmir» kimi göründü. Yoxlama:
`ps -eo pid,lstart,cmd | grep next-server` — başlama vaxtı build-dən SONRA olmalıdır.

### 3. QD-019 — demo admin parolu (variant **b**)

Sənədləşdirilmiş demo parolu (`Test1234!`) canlı saytda `admin@qu.edu.az` üçün
də keçərli olacaqdı. Ölçülmüş fərq: **admin fərqi dərəcə deyil, NÖVDÜR** —
`changeSystemRole` (`admin-users.service.ts`) istənilən hesabı
`UNIVERSITY_ADMIN`-ə yüksəldə bilir, yəni bir dəfəlik giriş **qalıcı** nəzarətə
çevrilir; sonradan parolu dəyişsək belə təcavüzkarın açdığı ikinci admin qalır.

Audit jurnalı bunu bağlamır: `recordAudit` YALNIZ ƏLAVƏ olunur — **izlənəbilirlik
geri qaytarma deyil** və anonim ziyarətçinin `actorId`-si heç nə vermir.
«Sintetik datadır, bərpa edərik» arqumenti də ölçüldü və **yanlış çıxdı**: canlı
baza tək volume-dadır (ehtiyat nüsxə yox), seed canlıda qadağandır (25 cədvəldə
`deleteMany`) — bərpa = volume-u silmək.

**Seçim (b):** canlıda YALNIZ admin parolu rotasiya olunur; `rep` · `moderator` ·
`coordinator` · `alumni` toxunulmur — dörd cohort rolunu göstərən nümayiş
dəyəri onlardadır və zərər radiusları `visibilityWhere` + soft delete ilə
çərçivələnib. Lokalda heç nə dəyişmir (`Test1234!` qalır, 20+ e2e faylı və
`seed.ts` toxunulmadı). İcra anı: **ilk deploy**.

### 4. Canlı e2e — İCRA EDİLMƏDİ (token gözlənilir)

`curl -s -o /dev/null -w "%{http_code}" https://qu-class.fly.dev/api/v1/health`
→ **`000`, çıxış kodu 6 (DNS həll olunmur)**. Yəni app hələ yaradılmayıb —
təxmin edilmədi, YOXLANILDI. Altı canlı yoxlamanın heç biri işlədilmədi.

**Hazırlıq edildi (TƏLƏ K):** `playwright.config.ts`-də `webServer` bloku indi
**şərtlidir** — `E2E_BASE_URL` verilibsə lokal server ÜMUMİYYƏTLƏ qaldırılmır.
Əvvəlki halda `reuseExistingServer` 3100-dəki lokal serveri götürərdi və
«canlı» adlanan dəst səssizcə LOKAL bazanı yoxlayardı: yaşıl nəticə heç nə
sübut etməzdi. Yoxlanıldı: `E2E_BASE_URL=… npx playwright test --list` → 219
test siyahılanır, lokal server qaldırılmır.

Qalan tələlər (L: yazan testləri canlıda işlətmə · M: `FIXED_NOW` uzaqda
tətbiq olunmur · N: kuki adı `SESSION_COOKIE_NAME`-dən · O: rate-limit)
token gələndə tətbiq olunacaq — bu blokda yalnız qeyd edilib.

### Dəyişən fayllar

**Yeni:** `src/features/welcome/WelcomeSkeleton.tsx` ·
`tests/e2e/landing-cls.spec.ts`
**Redaktə:** `src/lib/api/openapi.ts` (+`getOpenApiDocument`) ·
`src/lib/api/openapi.test.ts` (filtr götürüldü, `toRoutePath` testləri, 44→45) ·
`src/app/(public)/(landing)/loading.tsx` · `playwright.config.ts` ·
`docs/openapi.json` (törəmə) · `docs/ARCHITECTURE.md` §8 ·
`docs/DECISIONS.md` (+QD-019) · `docs/SPRINT-3-4-AUDIT.md` (+§16) ·
`docs/quality-report-12c.md` (+§8–11) · `docs/lighthouse/**/README.md` (törəmə) ·
`README.md`

**Toxunulmayanlar:** `src/components/ui/` · `prisma/schema.prisma` ·
`prisma/migrations/` · `src/services/storage.ts` · deploy artefaktları
(`Dockerfile`, `fly.toml`, `docker-entrypoint.sh`, `scripts/deploy.mjs`) ·
`prisma/seed.ts`. Yeni tətbiq asılılığı **əlavə edilmədi**.

### Dayanma nöqtəsi

Kod tərəfində bağlanmamış audit tapıntısı qalmayıb. Açıq qalan altı sprint
meyarının hamısı **tək** girişdən asılıdır: `FLY_API_TOKEN`.

---

## Sprint 3/4 — Blok 12F — bitdi (müdafiə və təhvil: rəqəm drifti · demo GIF · donut kontrastı)

**Yeni funksiya YOXDUR** (bir istisna: donut yığımı — aşağı). Blok sənədlərin
DOĞRULUĞUNU, demo materialını və iki qalıq borcu bağladı.

### 1. Rəqəm drifti — bu blokun ən vacib hissəsi

Bloklar 12A–12E test/route/commit saylarını dəyişmişdi, sənədlər isə köhnə
rəqəmi daşıyırdı. **HƏR rəqəm yenidən ölçüldü** (təxmin yoxdur):

| Ölçü | Sənəddə idi | ÖLÇÜLDÜ |
|---|---:|---:|
| Vitest | 1759 / 65 fayl | **1833 / 67 fayl** |
| Playwright | 212 / 20 (bəzi yerdə 213 / 21) | **220 / 22** |
| Build route | 94 (92 dinamik) | **97** (3 statik + 94 dinamik) |
| Commit | 27 / 41 | **50** |
| `docs/openapi.json` | «53 əməliyyat» | **38 path / 48 əməliyyat** |
| Repo faylı | 704 | **952** |
| `src/` TS faylı / sətir | 512 / 78 363 | **539 / 82 749** |
| Servis faylı | 23 | **24** |
| Sxem sətri | 818 | **832** |
| Seed sətri | 6323 | **6323** ✅ (dəyişməyib — determinizm təsdiqləndi) |

🔴 **TƏLƏ A (eyni rəqəm 6 sənəddə) belə bağlandı:** `docs/METRICS.md` **tək
mənbə** elan olundu; README, `ARCHITECTURE.md`, `DEMO.md`, `DEFENSE-QA.md`,
`SECURITY.md`, `DECISIONS.md` rəqəmi təkrarlamaq əvəzinə ona istinad edir.
README-də yalnız 5 əsas rəqəm qaldı.

🔴 **Tarixli sənədlər YENİDƏN YAZILMADI.** `quality-report-12c.md` və
`SPRINT-3-4-AUDIT.md` ölçmə/audit protokoludur — onların rəqəmlərini sonrakı
işlə «düzəltmək» onları protokol olmaqdan çıxarardı. Əvəzinə hər ikisinə
**köhnəlmə bannerı** + «sonradan nə bağlandı» cədvəli əlavə olundu.

🔴 **Tapılan ƏSL səhv — `53` əməliyyat rəqəmi.** Sadə grep `51` verir, çünki
`src/app/api/auth/[...nextauth]/route.ts` handler-ləri **destrukturlaşdırma**
ilə ixrac edir (`export const { GET, POST } = handlers`). Doğru cəm 51 + 2 = 53
və ağ siyahı ilə 48 + 5 = 53 tam oturur. `METRICS.md` §4-də tələ yazıldı.

### 2. Demo GIF — `docs/media/demo.gif`

`which ffmpeg` → **var**, ona görə Playwright `recordVideo` → ffmpeg yolu
seçildi (sharp ilə kadr-kadr ehtiyat yoluna ehtiyac olmadı).

- **7.15 MB · 31.4 san · 1024px · 7 fps · 80 rəng** (hədəf ≤ 8 MB ✅)
- Determinizm: server saatı `scripts/freeze-clock.cjs` (`npm run shots:serve`),
  brauzer saatı `context.clock.setFixedTime` — **iki qapı birlikdə**.
- `palettegen` / `paletteuse` olmadan eyni video **20.10 MB** çıxırdı.
- Ölçü hədəfi `LADDER` ilə avtomatik tutulur; en 1024-dən aşağı **son çarədir**.
- 🔴 TƏLƏ E yoxlandı: `docs/media/demo.gif` `.gitignore`-a **düşmür**
  (`docs/responsive/*.png` düşür, `docs/screenshots/` və `docs/openapi.json` yox).
- Yeni əmr: `npm run demo:gif`.

### 3. Xəritə zoom/pan — artıq var idi, **sübutu yox idi**

`MapZoom.tsx` (`ZoomableGroup` + `+`/`−`/«Sıfırla» düymələri) 12B/12E-də
yazılıb. Çatışmayan hissə **TƏLƏ F-in ölçüsü** idi:

> `tests/e2e/map.spec.ts` → **«🔴 zoom k-anonimlik supressiyasını AÇMIR (QD-012)»**

Test pinlərin `aria-label`-lərini (şəhər · say · rol bölgüsü) zoom-dan ƏVVƏL
toplayır, 8×-ə qalxır, SONRA yenidən toplayır və **bərabərliyi** tələb edir:
supressiya miqyasdan asılı olsaydı ya yeni pin, ya yeni rol açılardı. Üstəlik
hər etiketdə açıqlanan rol sayının **≥ 3** olduğu və heç bir miqyasda
**koordinat** görünmədiyi yoxlanılır. Sıfırladıqdan sonra da eyni.

### 4. Donut kontrastı — 🔴 ƏSL QÜSUR TAPILDI

Blok 12B qaydanı «qonşu dilimlər arasında ən azı **2 PİLLƏ** fərq» kimi yazmışdı
və test **yaşıl** idi. Amma pillə sayı kontrastın ölçü vahidi deyil — WCAG
düsturu ilə ölçdükdə:

| Dilim | Köhnə ən pis cüt | YENİ |
|---|---:|---:|
| 3 | 2.53:1 | 2.54:1 |
| **4** | **1.73:1** ❌ | **5.05:1** ✅ |
| 5 | 2.53:1 | 2.54:1 |
| **6** | 2.20:1 ❌ | **3.67:1** ✅ |

Pillə sıraları **brute-force** ilə yenidən seçildi (qapalı halqada ən pis qonşu
cütü maksimum edən variant). Test artıq PİLLƏ deyil, **hexləri `globals.css`-dən
oxuyub WCAG kontrastı** ölçür.

🔴 **TƏK saylı dilimdə 3:1 RİYAZİ OLARAQ MÜMKÜN DEYİL** və bu gizlədilmir:
şkalanın diapazonu 11.18/1.31 = **8.53 < 9**, yəni bir-birinə qarşı 3:1 olan ÜÇ
ton yoxdur → qonşuluq qrafi ikihissəlidir → qapalı halqada tək dövr qurulmur.
Ona görə:
- dilim sayı **6** ilə kəsilir (`MAX_DONUT_SLICES`, `donut-slices.ts`) — qalanı
  «Digər»ə yığılır, **cədvəl alternativi YIĞILMIR** (tam bölgü orada qalır);
- 3 və 5 dilim halında sərhədi `paddingAngle` + səth rəngli kontur verir —
  rəng kontrastından ASILI DEYİL.

⚠️ Seed datasında faktiki hal **3 dilimdir** (Maliyyə 5 · Texnologiya 5 ·
Enerji 4), yəni istehsalda görünən məhz tək saylı haldır — README «Bilinən
məhdudiyyətlər» №12-də açıq yazıldı.

### 5. Sıfırdan qurulma sübutu — README-nin «dörd əmr» vədi

HEAD commit-inin **ağacı** (işçi qovluq yox) təmiz qovluğa açıldı → **665 fayl**.
Təsdiqləndi ki, `prisma/dev.db`, `public/swagger/`, `public/uploads/`, `.env`
**yoxdur** (qəsdən), `docs/openapi.json` isə **var** (qəsdən).

`npm ci` → `.env` (`AUTH_SECRET` doldurulub) → `npx prisma migrate deploy` →
`npm run db:seed` → `npm run build` (**97 route**) → `npm start`:

| Yol | Nəticə |
|---|---|
| `/` | **200** |
| `/docs` | **200** |
| `/swagger/swagger-ui.css` | **200** (prebuild yaratdı) |
| `/api/v1/health` | **200** |

**Sınaq KEÇDİ.** README-də iki səhv tapıldı və düzəldildi:
1. başlıq **«Dörd əmr»** deyirdi, blokda **altı** əmr var idi;
2. istehsal ardıcıllığı (`migrate deploy` → `build` → `start`) ümumiyyətlə
   yazılmamışdı — `prebuild`-in niyə buraxıla bilməyəcəyi ilə birlikdə əlavə olundu.

Müvəqqəti qovluq və server sonda **tam təmizləndi**.

### 6. Ölü link yoxlaması — proqramla

Markdown linkləri çıxarılıb fayl + anker mövcudluğu yoxlandı (GitHub slug
alqoritmi ilə): **10 ölü → 0**. Tapılanlar:
- `DECISIONS.md`-də 5 QD ankeri səhv idi (`enumlar` ↔ `enum-lar`, `ayrı` ↔ `ayri`,
  `postgresə` ↔ `postgres-ə`, `tokendə` ↔ `token-də`);
- **QD-019 mündəricatda ÜMUMİYYƏTLƏ yox idi** (cədvəl QD-018-də bitirdi);
- README-də `src/app/(app)/…` linki **mötərizəyə görə sınırdı** → `%28`/`%29`.

⚠️ QD-019 başlığındakı `ADMİN` → `ADMIN` edildi: nöqtəli `İ` hərfinin kiçildilməsi
birləşən diakritik verir və anker alətdən alətə fərqlənə bilər.

### 7. Sənəd uyğunluğu

- `ARCHITECTURE.md` — **§9 «Yerləşdirmə arxitekturası»** əlavə olundu: mermaid
  diaqram (Fly proxy → maşın → volume), `uploads` keçidi, dörd qərarın səbəbi.
- `DEFENSE-QA.md` — **§5b, beş yeni sual** (S22a–S22e), hamısı `fayl:sətir` ilə:
  niyə SQLite/miqyas · tək maşın məhdudiyyəti · demo parolu (QD-019) ·
  Next `public/` keş qüsuru (12A) · `loading.tsx` niyə 404-ü sındırırdı (12B).
- `GW-COMPARISON.md` — yoxlandı, son vəziyyəti əks etdirir (dəyişiklik lazım deyil).

### Toxunulmayanlar

`src/components/ui/` · `prisma/schema.prisma` · `prisma/migrations/` ·
`src/services/storage.ts` · deploy artefaktları (`Dockerfile`, `fly.toml`,
`docker-entrypoint.sh`, `scripts/deploy.mjs`) · `prisma/seed.ts`.
**Yeni asılılıq əlavə edilmədi** (ffmpeg sistem binarıdır, paket deyil).

Qəsdən buraxılmış funksiyalara (parol sıfırlama, maaş sahəsi) **toxunulmadı** —
onlar sənəddə səbəbi ilə qalır.

🔴 **TƏLƏ C — gözlənilməz tapıntı.** Qadağan siyahısındakı DÖRD «borc» əslində
artıq YAZILMIŞDI (12B/12E), sənədlər isə onları hələ də «açıq» kimi göstərirdi:
toplu moderasiya (`moderation.service.ts:698`), CMS-də yaratma
(`admin-content.service.ts:254/398/558`), `/admin/stats` sinif filtri
(`admin/stats/page.tsx:35`), ikinci dərəcəli kohort rolu
(`admin-users.service.ts:410`) — hamısı e2e ilə örtülüdür
(`tests/e2e/admin.spec.ts:314,555,732,902`). Yəni bunlar YAZILMADI, əksinə —
**yanlış məhdudiyyət sətirləri silindi**: README №3 çıxarıldı (cədvəl yenidən
nömrələndi), `SECURITY.md` B8 və `DEFENSE-QA.md` S23 №6 «bağlandı» kimi
işarələndi.

### Dayanma nöqtəsi

Kod və sənəd tərəfində bağlanmamış tapıntı yoxdur. Açıq qalan yeganə şey
əvvəlki kimidir: **`FLY_API_TOKEN`** — canlı URL yalnız ondan asılıdır.
