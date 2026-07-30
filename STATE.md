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
