# GW müqayisəsi — referans analizindən yekun nəticəyə

> Müəllimin referans göstərdiyi **gwu.edu** (George Washington University —
> ana sayt, məzun portalı, tələbə portalı, tədbir təqvimi) layihənin əvvəlində
> analiz edildi və Qarabağ Universitetinin spesifikasiyası (20 bölmə, 17 modul)
> + KUDS v1.0 ilə tutuşduruldu. Analiz sənədi: `qu-class-plan/GW-ANALIZ.md`.
>
> **Bu fayl həmin analizin YEKUNUDUR** — plan deyil, nəticə. Aşağıdakı hər
> «✅» iddiası koda baxılaraq təsdiqlənib və fayl:sətir istinadı ilə verilib.
> Təsdiqlənməyənlər «❌ planlanıb, icra olunmayıb» kimi yazılıb.

**Metod:** spesifikasiya **tələbdir**, GW isə **nümunədir**. Spec bir çox şeyi
«olmalıdır» deyir, GW isə onu **necə göstərmək lazım olduğunu** göstərir.

---

## 0. Bir baxışda

| | Say |
|---|---|
| Spec modulu | **17 / 17** icra olunub |
| GW-dən ilhamlanan əlavə | **14** planlanıb → **11 tam · 1 qismən · 2 icra olunmayıb** |
| Qəsdli imtina | **6** — hamısı koda baxılaraq **yoxluğu təsdiqlənib** |
| Sxem dəyişikliyi | **2** — `CareerEntry.jobFunction`, `Memory.guidePlaceId` |

---

## 1. 17 modul × 4 ölçü

Sütunlar: **spec tələbi** · **GW-də qarşılığı** · **bizdə vəziyyət** · **fərq**.

| Modul | Spec tələbi | GW-də qarşılığı | Bizdə vəziyyət | Fərq |
|---|---|---|---|---|
| **M1** Public Welcome Page | §2 — 11 bəndlik ictimai açılış | Ana səhifə (17 səth) | ✅ `/` — `src/features/welcome/` 12 komponent, o cümlədən **canlı** `CommunityStories`, `LatestNews`, `AlumniQuote` | GW-də bloklar redaksiya işidir; bizdə **DB-dən, `visibilityWhere(ANONYMOUS)` süzgəcindən** gəlir — yəni yalnız `PUBLIC` məzmun |
| **M2** Universitet & kampus | §3 — universitet məlumat səhifələri | Haqqımızda · Akademiklər · Tələbə təcrübəsi | ✅ 8 səhifə + fakültə kataloqu; məzmun `ContentPage` CMS-dən | GW statik CMS; bizdə admin panelindən redaktə olunan **eyni model** |
| **M3** Xankəndi bələdçisi | §4 — şəhər bələdçisi | «Bizim yerimiz» + DC kəşfləri | ✅ `/khankendi` — `GuidePlace`, 11 kateqoriya, 30 seed sətri | 🏆 GW-də bələdçi **statikdir**; bizdə hər məkanın altında **sinif xatirələri** var (bax əlavə #10) |
| **M4** Incoming Class | §5 — qəbul olunanlar üçün tanışlıq | Oriyentasiya, körpü proqramları | ✅ `/class/[slug]` `INCOMING` mərhələsində — onboarding addımları, tanışlıq kartları | GW-də ayrı proqram səhifəsi; bizdə **eyni Class Page-in mərhələsi** — səhifə heç vaxt dəyişmir |
| **M5** Class Feed | §6 — sinif lenti | GW Today xəbər axını | ✅ `/class/[slug]/feed` — 12 kateqoriya, reaksiya, şərh, kursor səhifələmə | GW tək istiqamətli xəbərdir; bizdə **iki istiqamətli**, hər paylaşımın öz görünürlüyü var |
| **M6** Class Directory | §8 — sinif kataloqu | Alumni Directory + Kataloq | ✅ `/class/[slug]/directory` — **13 filtr** (`src/lib/directory-filters.ts:83`) | GW-də ad + məktəb; bizdə 13 filtr, hər biri həm dəyər şərtini, həm `fieldVisibleWhere`-i daşıyır (gizli sahə üzrə filtr onu **sızdırmır**) |
| **M7** My Class Story | §7 — profil və hekayə | Məzun profili + «Alumni in Focus» | ✅ `/me` · `/u/[userId]` · `/me/edit` · `/me/career` | GW profili redaksiya müsahibəsidir; bizdə **22 sahənin hər biri ayrıca 4 səviyyəli** |
| **M8** Class Timeline | §10 — sinif xronologiyası | — (GW-də yoxdur) | ✅ `/class/[slug]/timeline` — paylaşım/nailiyyət/tədbir/sistem mərhələləri tək cədvəldə | **GW-də qarşılığı yoxdur.** Törəmə model: görünürlük mənbədən kopyalanır, ondan açıq ola bilməz |
| **M9** Share Memories | §11 — xatirələr | **Class of 2026** hekayəsi | ✅ `/class/[slug]/memories` + 🏆 `/class/[slug]/yearbook` | GW illik redaksiya məqaləsidir; bizdə **avtomatik Digital Yearbook** — üzv özü seçir (bax #8) |
| **M10** Class Achievements | §12 — nailiyyətlər | Alumni Awards · Monumental Alumni | ✅ `/class/[slug]/achievements` — 12 kateqoriya, 4 status, `FEATURED` spotlight, moderasiya növbəsi | GW-də mükafat redaksiya seçimidir; bizdə **sinif moderatorunun auditli qərarı** |
| **M11** Where Are We Now | §13 — karyera nəticələri | Career Outcomes Dashboard (Tableau) | ✅ `/class/[slug]/map` (**8 ölçü**, `src/lib/map-filters.ts:33`) + `/class/[slug]/support` | 🏆 **Xəritə GW-də YOXDUR.** Üstəlik `MIN_BUCKET_SIZE = 3` k-anonimliyi və çarpaz-ölçü supressiyası |
| **M12** Upcoming Events | §14 — tədbirlər | calendar.gwu.edu (18+ kateqoriya) | ✅ `/class/[slug]/events` · `/events` — 6 filtr, 9 kateqoriya, 5 təşkilat səviyyəsi | ⚠️ GW-də olan **populyarlıq sıralaması, paylaşma və abunə lenti bizdə yoxdur** (bax §2 → #4, #5, #7) |
| **M13** Events & Reunion | §15 — koordinator | Alumni & Families Weekend | ✅ `/events/[id]` · `/manage` · `/report` — 7 RSVP statusu, `.ics` ixracı, iştirakçı cədvəli | Tədbir başına `.ics` var; **cohort abunə lenti yoxdur** (#4) |
| **M14** Privacy & Visibility | §17 — məxfilik | (GW-də yalnız kuki banneri) | ✅ `/me/privacy` — **22 sahə × 4 səviyyə** (`src/lib/visibility.ts:386`) + aqreqasiya razılığı | 🏆 **Layihənin ən böyük fərqi.** GW-də ekvivalenti YOXDUR |
| **M15** Notifications | §18 — bildirişlər | — (GW-də yoxdur) | ✅ `/notifications` — 9 növ, filtr, səhifələmə, header rozeti | Bildiriş **yalnız məzmunu görə bilənə** gedir — yəni bildiriş özü sızma kanalı deyil |
| **M16** Search & Filters | §16 — axtarış | Kataloq axtarışı | ✅ `/search` + ⌘K palitrası — istifadəçi/paylaşım/xatirə/nailiyyət/tədbir | Nəticələr `visibilityWhere`-dən keçir; axtarış **DB səviyyəsində** filtrlənir |
| **M17** Moderation & Admin | §19 — idarəetmə | — (GW-də ictimai səthdə yoxdur) | ✅ `/admin` + 8 alt səhifə — şikayət növbəsi, rol idarəsi, SIS idxalı, CMS, **append-only audit jurnalı** | `PRIVATE` məzmun **admin üçün də oxunmur**; moderasiya baxışı ayrı, auditli yoldur |

**Nəticə:** 17 modulun heç biri əskik deyil. Boşluq modullarda deyil, **səthdə**
idi — və o boşluğun 11-i bağlandı, 3-ü açıq qaldı (§2).

---

## 2. 14 əlavə funksiya — nə İCRA OLUNDU, nə YOX

🔴 Bu bölmə **plandan köçürülməyib**. Hər sətir kodda axtarılıb; sütunlarda
təsdiq üçün fayl:sətir istinadı var.

### ✅ İcra olunanlar (11)

| # | Funksiya | GW mənbəyi | Kodda təsdiq |
|---|---|---|---|
| 1 | **`CareerEntry.jobFunction`** — aqreqasiya üçün normallaşdırılmış rol | Job Functions ölçüsü | `prisma/schema.prisma:510` (+ `@@index` :526); `JOB_FUNCTION_VALUES` = **14** dəyər. Bunsuz k-anonimlik sərbəst `position` mətnində hər xananı gizlədərdi |
| 2 | **`Memory.guidePlaceId`** — xatirə ↔ məkan körpüsü | «ən sevdiyin yer» sualı | `prisma/schema.prisma:427` + `:443` (`onDelete: SetNull`), əks əlaqə `GuidePlace.memories` :814 |
| 3 | **Nailiyyət spotlight-ı** | Monumental Alumni · Alumni Awards | `src/services/achievement.service.ts:216` `FEATURED_ACHIEVEMENT_LIMIT = 3`, `:229` `listFeaturedAchievements`; səth `src/features/achievements/ClassAchievements.tsx` |
| 6 | **«Maraqlanıram» ≠ «Qeydiyyat»** | *I'm Interested* | `src/lib/rsvp.ts:59` `RSVP_INTENT_VALUES = ["ACCEPT","DECLINE","REGISTER"]`; `:115` ACCEPT → `ACCEPTED`, `:127` REGISTER → `REGISTERED`/`WAITLISTED`. Düymələr: `src/features/events/RsvpPanel.tsx` |
| 8 | 🏆 **Digital Yearbook** | *Class of 2026* hekayəsi | Route `/class/[slug]/yearbook`; `src/features/yearbook/ClassYearbook.tsx`; çap düzülüşü — `print:break-before-page` (:174, :302), `print:hidden` (:109), `@media print` `src/app/globals.css:179`. API: `/api/v1/cohorts/[slug]/yearbook` |
| 9 | **Sinif statistika zolağı** | *3 276 bakalavr · 131 ölkə* | `src/lib/headline-stats.ts`; səth `src/features/class-home/HeadlineStats.tsx:40-44` — «N üzv · X şəhərdən · Y ölkədən · Z klubda · W nailiyyət». Hədd `MIN_BUCKET_SIZE`-dan **yenidən ixrac olunur**, yeni ədəd yazılmır |
| 10 | **Sevimli məkanlar** — bələdçidə sinif xatirələri | DC kəşfləri | `src/services/memory.service.ts:274` `guidePlaceId` üzrə sorğu (görünürlük şərti ilə birlikdə, :279); səth `src/features/memories/PlaceMemories.tsx`; API `/api/v1/guide-places/[id]/memories` |
| 11 | **Dəstək təklifləri səthi** | Jobs Board · Engage with Students | Route `/class/[slug]/support`; `src/features/support/ClassSupport.tsx` — 7 növ (`SUPPORT_OFFER_TYPE_VALUES`), `JOB_SHARING` ayrıca göstərilir (:99) |
| 12 | 🏆 **Canlı Welcome Page** | səth 5, 7, 9 | `src/features/welcome/CommunityStories.tsx` · `LatestNews.tsx` · `AlumniQuote.tsx`. Üçü də anonim viewer üçün `visibilityWhere` süzgəcindən keçir — mühərrik təkrar yazılmayıb |
| 13 | **Hüquqi footer sütunu + kuki razılığı** | səth 15, 17 | `src/layouts/nav.ts:246` — dördüncü sütun (`LEGAL_PAGES`: privacy · terms · copyright · equal-opportunity) + `/accessibility` :291. Banner: `src/features/consent/ConsentGate.tsx` — qərar **serverdə** verilir, yəni banner sıçramır |
| 14 | **Əlçatanlıq bəyanatı + maneə forması** | səth 12 | `/accessibility` səhifəsi; `src/lib/enums.ts:548` `ReportEntityType.ACCESSIBILITY`; admin növbəsində ayrı vizual ton — `src/features/admin/ReportQueue.tsx:16`, ayrı həll seçimləri `ReportActions.tsx:59` |

### ⚠️ Qismən icra olunan (1)

| # | Funksiya | İcra olunan hissə | İcra OLUNMAYAN hissə |
|---|---|---|---|
| 7 | **Trend və seçilmiş tədbirlər** | Tutum göstəricisi ✅ — `src/features/events/EventCard.tsx:157` «N yer qalıb», `src/lib/rsvp.ts` `seatsLeft` / `isFull` | **Populyarlığa görə sıralama YOXDUR.** `src/services/event.service.ts:263` yeganə `orderBy` `startsAt`-dır; `rsvpCount` üzrə sıralama və «seçilmiş tədbirlər karuseli» yazılmayıb |

### ❌ Planlanıb, icra olunmayıb (2)

| # | Funksiya | Vəziyyət | Nə var əvəzinə |
|---|---|---|---|
| 4 | **Cohort səviyyəsində `.ics` abunə lenti** (`/api/class/[slug]/events.ics`) | ❌ **Yoxdur.** `src/app/api` altında yeganə təqvim marşrutu `events/[id]/ics`-dir | Tədbir başına ixrac var (`src/lib/ics.ts`, `src/features/events/EventDetail.tsx:168`) — amma o, PLAN.md-də **GW analizindən əvvəl də** var idi. GW-nin əlavəsi məhz **abunə lenti** idi və o yazılmadı |
| 5 | **Tədbir paylaşma düymələri** (FB / X / LinkedIn) | ❌ **Yoxdur.** Repoda `navigator.share`, `sharer`, `intent/tweet`, `linkedin` — heç biri yoxdur | Tədbir URL-i onsuz da paylaşıla biləndir (server-render, GET); sosial şəbəkə düymələri əlavə edilmədi |

⚠️ **Bu iki bənd üçün dürüst qiymətləndirmə:** hər ikisi Blok 9-a (Events &
Reunion) planlanmışdı və həmin blok bitəndə yazılmadı. Sonrakı bloklarda geri
qayıdılmadı. Yəni səbəb texniki maneə deyil, **əhatənin daralmasıdır** —
müdafiədə «vaxt çatmadı» yox, «Blok 9-un DoD-una salınmamışdı» demək düzgündür.

---

## 3. İki sxem dəyişikliyi — hər ikisi icra olundu

```prisma
model CareerEntry {
  /// Aqreqasiya üçün normallaşdırılmış rol (sərbəst `position`-dan FƏRQLİ).
  jobFunction String?      // 14 dəyər — src/lib/enums.ts
  @@index([jobFunction])
}

model Memory {
  /// "Sevimli yer" xatirəsi — Xankəndi bələdçisindəki məkana bağlayır (M9 ↔ M3).
  guidePlaceId String?
  guidePlace   GuidePlace? @relation(fields: [guidePlaceId], references: [id], onDelete: SetNull)
}
```

Hər ikisi `prisma/schema.prisma`-dadır və miqrasiya `prisma/migrations/`-də
commit olunub (commit `9479a17` — *feat(schema): add job function taxonomy and
memory-place link*).

---

## 4. 6 qəsdli imtina — səbəbi və kodda təsdiqi

Bunlar «çatdırmadıq» deyil, «**etməmək qərarı verdik**» siyahısıdır. Hər sətrin
son sütunu kodda həqiqətən olmadığını göstərir.

| # | GW-də var | Niyə etmirik | Kodda təsdiq (yoxluq) |
|---|---|---|---|
| 1 | **Təkrarlanan tədbirlər** (recurring + «gizlət» açarı) | Sxem xərci böyükdür — təkrar qaydası, istisnalar, ayrı-ayrı nüsxələrin redaktəsi. Demo dəyəri azdır, spec §14-15 tələb etmir | `schema.prisma`-da `recurring` / `rrule` sahəsi yoxdur; `Event` tək başlanğıc tarixi daşıyır |
| 2 | **Instagram / sosial divar** (Flockler embed) | Xarici API açarı və şəbəkə asılılığı tələb edir; layihə **lokal işləməlidir** (PLAN.md §3). Spec-də yoxdur | `grep -ri "instagram\|flockler" src/` → **0 nəticə** |
| 3 | **Auditoriya hədəfləmə** (Prospective / Faculty / Staff…) | `Event.visibility` (4 səviyyə) × `scope` (5 səviyyə) onsuz da 20 kombinasiya verir. Üçüncü ölçü filtr panelini şişirdərdi; spec §15 altı filtr sadalayır, auditoriya onların arasında yoxdur | `Event`-də `audience` sahəsi yoxdur (`audience` sözü yalnız `VISIBILITY_META`-nın izah mətnindədir) |
| 4 | **Əmək haqqı məlumatı** (orta maaş, bonus) | Məxfilik baxımından ən həssas sahə. 14-28 nəfərlik sinifdə aqreqasiya olunmuş maaş belə **fərdiləşdirilə bilər**. Spec §13 onu sadalamır | 🔴 **Ən güclü təsdiq:** `src/lib/career-stats.ts:90` açıq şərh + `src/lib/career-stats.test.ts:421` — *«çıxışda maaş/salary/bonus adlı sahə YOXDUR»* — regresiya testi `/salary\|maaş\|bonus\|wage\|income\|compensation/i` şablonunu axtarır və tapsa **testi sındırır** |
| 5 | **Bağış · imtiyazlar · atletika · qəbul funeli** | Universitetin institusional funksiyalarıdır, **sinif platformasının əhatəsində deyil** (spec §1) | `grep -ri "donat\|bağış" src/ schema.prisma` → **0 nəticə** |
| 6 | **Tam iş elanları lövhəsi** (ayrı modul kimi) | `SupportOffer.JOB_SHARING` + `note` spec §9-un tələbini ödəyir. Müraciət izləmə, CV yükləmə, işəgötürən hesabı 17 modula daxil deyil | `JobPosting` modeli yoxdur; `JOB_SHARING` `SUPPORT_OFFER_TYPE_VALUES`-un 7 dəyərindən biridir (`src/lib/enums.ts:342`) |

---

## 5. Müdafiə cədvəli — «niyə belə etdiniz?»

Komissiya sualı gələndə hazır cavab:

| Ölçü | GW (referans) | QU CLASS |
|---|---|---|
| Karyera nəticələri | Tableau siyahıları | **İnteraktiv dünya xəritəsi** + **8 ölçü** — dünya · Azərbaycan · şəhər · ölkə · şirkət · sənaye · vəzifə · təhsil (`src/lib/map-filters.ts:33`) |
| Vəzifə aqreqasiyası | Job Functions (14 kateqoriya) | Eyni 14 kateqoriya + **k-anonimlik** (`MIN_BUCKET_SIZE = 3`) və **çarpaz-ölçü supressiyası** |
| Məxfilik idarəetməsi | Yalnız kuki banneri | **22 sahə × 4 səviyyə**, «Preview as», append-only audit jurnalı |
| Kataloq filtrləri | Ad + məktəb | **13 filtr**, paylaşıla bilən URL, gizli sahə üzrə filtrdə sızmaya qarşı qorunmuş |
| Sinif albomu | İllik redaksiya məqaləsi | **Avtomatik Digital Yearbook** — üzvün özü seçir (`Memory.showInYearbook`), çap düzülüşü ilə |
| Xatirə ↔ məkan əlaqəsi | Yoxdur | **`Memory → GuidePlace`** körpüsü — M9 ↔ M3 |
| Xronologiya | Yoxdur | **Class Timeline** — dörd mənbədən törəyən vahid cədvəl |
| Əmək haqqı | Göstərilir | **Qəsdən göstərilmir** — və bu qərar **testlə qorunur** |
| Tədbir paylaşımı | FB / X / LinkedIn düymələri | ❌ **Yoxdur** — dürüst boşluq (§2) |
| Təqvim abunəsi | Google / iCal / Outlook / RSS | ⚠️ Tədbir başına `.ics` var, **cohort lenti yoxdur** (§2) |

---

## 6. Bu sənədin necə yoxlandığı

Cədvəllərdəki hər «✅» aşağıdakı üsulla təsdiqlənib:

1. **Sxem iddiaları** — `prisma/schema.prisma` sətir-sətir oxunub.
2. **Servis iddiaları** — `src/services/` və `src/lib/`-də funksiya adı və
   `where` şərti tapılıb (görünürlük şərtinin **birləşdirildiyi** yer daxil).
3. **Səth iddiaları** — `src/features/` altındakı komponent faylı və route
   `src/app/**/page.tsx` ilə uyğunlaşdırılıb.
4. **Yoxluq iddiaları** (§4) — `grep -ri` ilə axtarılıb; nəticə sıfır olmalı idi.

Tapılmayan üç bənd (#4, #5 və #7-nin sıralama hissəsi) **silinmədi, işarələndi**
— sənəd planı təkrarlamır, vəziyyəti göstərir.
