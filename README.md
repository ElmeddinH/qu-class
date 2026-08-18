# QU CLASS

### Bir sinif. Bir hekayə. Ömürlük əlaqə.

Qarabağ Universitetinin tələbə və məzun **sinif platforması** — Holberton School final layihəsi.

---

## Problem → Həll → Nəticə

**PROBLEM.** Universitetə yeni qəbul olunan tələbə sinif yoldaşlarını tanımır və
ilk aylar təsadüfi tanışlıqla keçir. Dörd il sonra isə əksi baş verir: məzuniyyət
günü qrup çatı sönür, ortaq xatirələr paylaşılmamış qalır, sinif bir-birini
itirir. Universitet portalları bu boşluğu bağlamır — onlar **prosesi** idarə edir
(qeydiyyat, qiymət, cədvəl), **münasibəti** yox.

**HƏLL.** Üç mərhələ, **eyni səhifə**: `INCOMING` → `STUDENT` → `ALUMNI`.
Class Page heç vaxt bağlanmır; qəbul günündən məzuniyyətdən sonrakı illərə qədər
açıq qalır, yalnız məzmun və widget sırası mərhələyə görə dəyişir. Sinif lenti
xronologiyaya, xronologiya isə rəqəmsal illiyə (yearbook) çevrilir. Məzun olandan
sonra «indi haradayıq?» xəritəsi sinfi bir yerdə saxlayır.

**Bunu mümkün edən texniki nüvə — məxfilik mühərrikidir.** İnsanlar öz həyatlarını
yalnız kimin görəcəyini **dəqiq bildikdə** paylaşırlar. Ona görə görünürlük bu
layihədə sonradan əlavə olunan filtr deyil, **hər sorğunun keçdiyi qapıdır**:
4 səviyyə, sahə-səviyyə nəzarət, aqreqasiya üçün ayrıca razılıq.

**NƏTİCƏ.** 17 modulun hamısı işlək · 51 səhifə · 28 data modeli ·
36 REST endpoint · **1844 vahid/inteqrasiya + 220 E2E testi keçir** ·
Lighthouse desktop **100/100/100/100** (5 səhifə) · WCAG 2.2 AA qapısı bağlıdır.

> 📊 Bütün rəqəmlərin ölçmə əmri ilə birlikdə tam siyahısı:
> [`docs/METRICS.md`](docs/METRICS.md). Bu README-də yalnız yuxarıdakı bir neçə
> rəqəm təkrarlanır — qalanı orada tək mənbədən saxlanılır.

---

## Demo

![QU CLASS demosu — açılış, giriş, sinif lenti, məxfilik seçicisi və «İndi haradayıq?» xəritəsi](docs/media/demo.gif)

*Açılış → giriş → sinif lenti → məxfilik seçicisi → «İndi haradayıq?» (31 san).*
Determinist çəkilib: server saatı `scripts/freeze-clock.cjs` ilə donmuş,
brauzer saatı `context.clock` ilə bağlı — `npm run demo:gif` hər dəfə eyni
kadrları verir.

🎬 **Canlı demo ssenarisi** (8 dəqiqə, dəqiqə-dəqiqə): [`docs/DEMO.md`](docs/DEMO.md)

**Sənədlər:** [Arxitektura](docs/ARCHITECTURE.md) · [Qərarlar jurnalı](docs/DECISIONS.md) ·
[Təhlükəsizlik](docs/SECURITY.md) · [Müdafiə S&C](docs/DEFENSE-QA.md) ·
[Rəqəmlər](docs/METRICS.md) · [İcra planı](PLAN.md) · [İş qaydaları](CLAUDE.md)

---

## Ekran görüntüləri

17 səth, KUDS §9 «Desktop» referansında (**1440×900**). Hamısı
[`scripts/screenshots.ts`](scripts/screenshots.ts) ilə **avtomatik** çəkilir —
əl ilə redaktə olunmur:

```bash
npx prisma db seed        # bazanı sıfırla
npm run build
npm run shots:serve       # ayrı terminalda — saatı sabitlənmiş server
npm run shots
```

Skript determinizmi dörd qapı ilə təmin edir: **seed bazası** (sabit PRNG +
sabit `NOW`), **sabit an** (server `scripts/freeze-clock.cjs`, brauzer
`clock.setFixedTime` — nisbi tarixlər sürüşmür), **animasiya söndürülməsi**
(`prefers-reduced-motion: reduce` + `animations: "disabled"`) və **kuki
razılığının əvvəlcədən verilməsi** (banner məzmunu örtməsin).

🔒 Skript həm də **şəxsi məlumat qapısıdır**: hər icrada bazanı və 17 ekranın
görünən mətnini yoxlayır — istehlakçı poçt domeni, seedə aid olmayan e-poçt
domeni, şablona uymayan telefon və ya repo sahibinin öz kimliyi tapılsa
sıfırdan fərqli kodla çıxır. Cari nəticə: **tapıntı yoxdur** ✅. Seed adları
uydurma ad hovuzlarından qurulur, e-poçtlar `@qu.edu.az` / `@mail.az`,
telefonlar `+994 5x xxx xx xx` şablonundadır.

### Açıq səth

| Açılış səhifəsi [M1] | Xankəndi bələdçisi [M3] |
|---|---|
| [![Açılış](docs/screenshots/01-welcome.png)](docs/screenshots/01-welcome.png) | [![Xankəndi](docs/screenshots/03-khankendi.png)](docs/screenshots/03-khankendi.png) |
| **FAQ [M2]** | **Giriş** |
| [![FAQ](docs/screenshots/02-faq.png)](docs/screenshots/02-faq.png) | [![Giriş](docs/screenshots/04-login.png)](docs/screenshots/04-login.png) |

### Sinif səthi

| Sinif lenti [M5] | Sinif kataloqu [M6] |
|---|---|
| [![Lent](docs/screenshots/05-feed.png)](docs/screenshots/05-feed.png) | [![Kataloq](docs/screenshots/06-directory.png)](docs/screenshots/06-directory.png) |
| **Mənim sinif hekayəm [M7]** | **Xronologiya [M8]** |
| [![Hekayə](docs/screenshots/07-class-story.png)](docs/screenshots/07-class-story.png) | [![Xronologiya](docs/screenshots/08-timeline.png)](docs/screenshots/08-timeline.png) |
| **Nailiyyətlər [M10]** | **Xatirələr [M9]** |
| [![Nailiyyətlər](docs/screenshots/09-achievements.png)](docs/screenshots/09-achievements.png) | [![Xatirələr](docs/screenshots/10-memories.png)](docs/screenshots/10-memories.png) |
| **Tədbirlər [M12]** | **🔒 İndi haradayıq? [M11]** |
| [![Tədbirlər](docs/screenshots/11-events.png)](docs/screenshots/11-events.png) | [![Xəritə](docs/screenshots/12-map.png)](docs/screenshots/12-map.png) |

### Şəxsi, idarə və dizayn səthi

| Bildiriş mərkəzi [M15] | 🔒 Məxfilik idarəetməsi [M14] |
|---|---|
| [![Bildirişlər](docs/screenshots/13-notifications.png)](docs/screenshots/13-notifications.png) | [![Məxfilik](docs/screenshots/14-privacy.png)](docs/screenshots/14-privacy.png) |
| **İdarə paneli [M17]** | **Şikayət moderasiyası [M17]** |
| [![Admin](docs/screenshots/15-admin-dashboard.png)](docs/screenshots/15-admin-dashboard.png) | [![Moderasiya](docs/screenshots/16-admin-moderation.png)](docs/screenshots/16-admin-moderation.png) |
| **KUDS stil bələdçisi** | |
| [![KUDS](docs/screenshots/17-kuds.png)](docs/screenshots/17-kuds.png) | |

Tam siyahı və çəkiliş parametrləri: [`docs/screenshots/README.md`](docs/screenshots/README.md).

⚠️ **Xəritə və xatirələr ayrı hesabla çəkilib** və bu, məxfilik modelinin
nəticəsidir: `UNIVERSITY_ADMIN` başqa sinfin `CLASS` məzmununu **oxumur**,
aqreqasiya isə ayrıca `includeInStats` razılığı tələb edir. Ona görə bu iki
ekran `alumni@qu.edu.az` (sinfi `maliyye-2022`) hesabı ilə — yəni **həmin
sinfin üzvü kimi** — çəkilib.

Beş breakpoint üzrə **ölçülmüş** responsive görüntülər ayrıdır:
`npm run audit:responsive` → [`docs/responsive/`](docs/responsive/report.md)
(**51 səhifə × 5 breakpoint = 255 ölçmə**). Görüntülər SƏNƏDDİR; reqressiya
QAPISI [`tests/e2e/responsive.spec.ts`](tests/e2e/responsive.spec.ts)-dir —
eyni matrisi maşınla yoxlayır (üfüqi sürüşmə · header 72px · sidebar
280px/çəkməcə · məzmun kəsilmir).

---

## 17 modul

| # | Modul | Route | Nə edir |
|---|---|---|---|
| **M1** | Public Welcome Page | `/` | Anonim ziyarətçi üçün 11 bölməli açılış — sinif məzmunu **görünmür**, yalnız ictimai səth. |
| **M2** | Universitet & fakültələr | `/about` `/history` `/mission` `/faculties` `/campus-life` `/clubs` `/services` `/newcomers` | Universitet məlumat səhifələri və fakültə kataloqu; məzmun CMS-dən (`ContentPage`) gəlir. |
| **M3** | Xankəndi bələdçisi | `/khankendi` · `/khankendi/[id]` | Şəhər bələdçisi — 11 kateqoriya, xəritə, hər məkana bağlanmış **sinif xatirələri**. |
| **M4** | Incoming Class | `/class/[slug]` (`INCOMING` mərhələsi) | Dərslər başlamamış qəbul olunanlar üçün tanışlıq paneli və onboarding addımları. |
| **M5** | Class Feed | `/class/[slug]/feed` | Sinif lenti — 12 kateqoriya, 8 paylaşım növü, reaksiya, şərh; **kursor səhifələmə**. |
| **M6** | Class Directory | `/class/[slug]/directory` | Sinif kataloqu — **13 filtr**, axtarış, ixrac; hər sahə məxfilik səviyyəsinə görə redaktə olunur. |
| **M7** | My Class Story | `/u/[userId]` · `/me` · `/me/edit` · `/me/career` | İctimai profil və profil redaktoru — maraq, bacarıq, dil, klub, karyera və təhsil qeydləri. |
| **M8** | Class Timeline | `/class/[slug]/timeline` | Sinfin xronologiyası — paylaşım, nailiyyət, tədbir və sistem mərhələləri **tək cədvəldə**, akademik ilə görə filtr. |
| **M9** | Share Memories | `/class/[slug]/memories` · `/class/[slug]/yearbook` | 8 növ xatirə, 4 ayrıca göstərilmə seçimi; çap üçün hazırlanmış **rəqəmsal illik**. |
| **M10** | Class Achievements | `/class/[slug]/achievements` · `.../moderation` | 12 kateqoriya, 4 status; nailiyyət təsdiq növbəsi sinif moderatoru üçün. |
| **M11** | Where Are We Now | `/class/[slug]/map` · `/class/[slug]/support` | Məzunların karyera nəticələri — **k-anonim** xəritə və qrafiklər + dəstək təklifləri. 🔒 bax aşağı |
| **M12** | Sinif tədbirləri | `/class/[slug]/events` · `/events` | Tədbir siyahısı — 6 filtr, 9 kateqoriya, 5 təşkilat səviyyəsi; `/events` ictimaidir. |
| **M13** | Tədbir detalı & koordinator | `/events/[id]` · `.../manage` · `.../report` | RSVP (7 status), iştirakçı siyahısı, `.ics` ixracı və koordinator paneli. |
| **M14** | 🔒 Məxfilik idarəetməsi | `/me/privacy` | Hər sahə üçün 4 səviyyəli seçici + aqreqasiya razılığı. **Sistemin ürəyi.** |
| **M15** | Bildiriş mərkəzi | `/notifications` | 9 bildiriş növü, filtr, səhifələmə, header rozeti; bildiriş **yalnız məzmunu görə bilənə** gedir. |
| **M16** | Qlobal axtarış | `/search` (⌘K) | İstifadəçi, paylaşım, xatirə, nailiyyət və tədbir üzrə axtarış — nəticələr görünürlükdən keçir. |
| **M17** | İdarə paneli | `/admin` + 8 alt səhifə | Analitika, cohort idarəetməsi, CSV SIS idxalı, rol idarəsi, şikayət və nailiyyət növbələri, CMS, **append-only audit jurnalı**. |

---

## Stack

Versiyalar `package.json`-dan oxunub və **kilidlidir** — səbəblər
[`docs/DECISIONS.md`](docs/DECISIONS.md)-dədir.

| Qat | Texnologiya | Versiya | Qeyd |
|---|---|---|---|
| Framework | **Next.js** (App Router) | `15.5.22` | v16 DEYİL |
| Dil | TypeScript | `5.9.3` | `strict: true` |
| Runtime | Node.js | `20+` | ölçmə mühiti: `v24.18.0` |
| UI kitabxanası | React | `19.1.0` | Server Components |
| Stil | **Tailwind CSS** | `3.4.19` | v4 DEYİL — [QD-016](docs/DECISIONS.md#qd-016--shadcnui-v2-pinlənib-latest-qadağandır) |
| Komponentlər | **shadcn/ui** (CLI `2.10.0`) | `new-york`, Radix əsaslı | `src/components/ui/` toxunulmazdır |
| İkonlar | lucide-react | `1.27.0` | yalnız Lucide |
| Formalar | React Hook Form + Zod | `7.83.0` / `3.25.76` | Zod OpenAPI sənədini də **törədir** |
| Data fetching | TanStack Query | `5.101.4` | client; server tərəfdə RSC |
| Qrafiklər | Recharts | `3.10.1` | + `react-simple-maps` (xəritə) |
| Animasiya | Framer Motion | `12.43.0` | |
| ORM | **Prisma** | `6.19.3` | v7 sxemdəki `datasource.url`-i rədd edir |
| Baza | SQLite | `file:./dev.db` | [QD-002](docs/DECISIONS.md#qd-002--baza-sqlite-postgresql-deyil) · Postgres keçidi: [`docker-compose.yml`](docker-compose.yml) |
| Auth | Auth.js (NextAuth) | `5.0.0-beta.32` | Credentials + `bcryptjs`, **JWT** sessiya |
| Şəkil emalı | sharp | `0.35.3` | yüklənən fayl WebP-yə çevrilir |
| Test | Vitest / Playwright | `4.1.10` / `1.62.0` | + `@axe-core/playwright` |
| API sənədi | `@asteasolutions/zod-to-openapi` + `swagger-ui-dist` | `7.3.4` / `5.32.11` | oflayn, CDN yoxdur |

**Dizayn standartı:** KUDS v1.0 (Karabakh University Digital Design System) —
tokenlər `tailwind.config.ts`-dədir, canlı bələdçi `/kuds` səhifəsindədir.

---

## Arxitektura

Ayrı backend serveri **yoxdur**. Next.js həm render, həm API qatıdır; hər ikisi
eyni servis qatını çağırır və eyni məxfilik mühərrikindən keçir.

```mermaid
flowchart TB
    subgraph Cl["İstifadəçi"]
        A["Anonim"]
        U["Tələbə / Məzun"]
        AD["Universitet admini"]
        EX["Xarici inteqrasiya<br/>Swagger UI"]
    end

    subgraph N["Next.js 15 — tək proses"]
        MW["middleware.ts · EDGE<br/>route qorunması"]
        RSC["Server Components<br/>(public) · (app) · (admin)"]
        SA["Server Actions<br/>mutasiyalar"]
        API["/api/v1 — 36 route<br/>44 əməliyyat OpenAPI-də"]
    end

    subgraph C["Məxfilik + servis qatı"]
        VW["getViewer()<br/>render başına 1 sorğu"]
        VIS["lib/visibility.ts<br/>🔒 TƏK həqiqət mənbəyi"]
        SVC["services/* — 23 fayl<br/>YEGANƏ Prisma girişi"]
    end

    DB[("SQLite · 28 model")]
    FS[("public/uploads/")]

    A --> MW
    U --> MW
    AD --> MW
    EX --> API

    MW --> RSC
    RSC --> SA
    RSC --> VW
    SA --> VW
    API --> VW

    VW --> VIS
    VIS --> SVC
    RSC --> SVC
    SA --> SVC
    API --> SVC

    SVC --> DB
    SVC --> FS

    style VIS fill:#dcfce7,stroke:#15803d,color:#14532d
```

🔴 **Danışılmaz qayda:** heç bir `page.tsx` və ya route handler birbaşa
`prisma.*` çağırmır. Hər servis funksiyası ilk arqument kimi `Viewer` alır.

Ətraflı (ER diaqramı, məxfilik qərar axını, fan-out sequence, auth Edge/Node
bölgüsü, qat qaydaları): **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)**.

---

## 🔒 Məxfilik modeli

### Dörd səviyyə

Hər məzmun sətrində bir `visibility` sütunu var. Səviyyələr **daralan** sıradadır:

| Səviyyə | Kim görür | Nümunə |
|---|---|---|
| `PUBLIC` | hər kəs — giriş etməmişlər də | açıq tədbir, universitet səhifəsi |
| `UNIVERSITY` | istənilən autentifikasiya olunmuş istifadəçi | başqa sinfə də göstərilə bilən nailiyyət |
| `CLASS` | **yalnız həmin sinfin üzvləri** — default | sinif lenti, sinif xatirəsi |
| `PRIVATE` | **yalnız sahibi** — admin də oxumur | telefon, şəxsi e-poçt, qaralama |

Üç sabit qayda:

1. **Sahibi həmişə öz məzmununu görür** — səviyyədən asılı olmayaraq.
2. **Yeni sahə əlavə edilirsə default `CLASS`-dır**, `PUBLIC` deyil.
3. **`phone` və `personalEmail` qeydiyyatda `PRIVATE` yaradılır** — istifadəçi
   heç nə etməsə də qorunur.

### Üç köməkçi ailəsi

Bütün məntiq [`src/lib/visibility.ts`](src/lib/visibility.ts)-dədir — **tək
həqiqət mənbəyi**. Üç ailə üç fərqli suala cavab verir:

| Ailə | Sual | Funksiyalar | Harada |
|---|---|---|---|
| **1 · Obyekt qapısı** | «Bu ziyarətçi **bu sətri** görə bilərmi?» → `boolean` | `canView` · `canModerate` · `canModerateCohort` | səhifə sərhədi, detal görünüşü |
| **2 · Sorğu süzgəci** | «**Siyahıda** nə göstərilməlidir?» → Prisma `where` fraqmenti | `visibilityWhere` · `activeVisibleWhere` · `visibleWithStatus` · `timelineVisibilityWhere` | hər servis sorğusu |
| **3 · Sahə redaktəsi** | «Bu profilin **hansı sahələri** göstərilir?» → azaldılmış obyekt | `redactProfile` · `fieldVisibleWhere` | profil, kataloq, axtarış |

🔴 **2-ci ailə DB-də işləyir, JS-də deyil.** JS-də `.filter()` iki şeyi sındırır:
səhifələməni (istifadəçi yarımçıq səhifə görür) və `count()`-u (görünməyən
məzmunun **sayı sızır**). Səbəb: [QD-006](docs/DECISIONS.md#qd-006--məxfilik-filtri-db-də-tətbiq-olunur-js-də-deyil).

⚠️ **Status ölçüsü ayrıdır.** `activeVisibleWhere` `"ACTIVE"` sabitini işlədir —
yalnız `Post` və `Memory` üçün. `Achievement` (`VERIFIED|FEATURED`) və `Event`
(`PUBLISHED|COMPLETED`) üçün `visibleWithStatus` çağırılmalıdır, yoxsa nəticə
**sıfır** olur.

### Dördüncü qapı — aqreqasiya AYRI razılıq tələb edir

Görünürlük səviyyəsi statistikaya girmək üçün **kifayət deyil**. «İndi
haradayıq?» paneli yalnız `includeInStats = true` olan istifadəçiləri sayır.
Səbəb: «sinif yoldaşım görsün» ilə «rəqəm kimi sayılım» fərqli məqsədlərdir —
[QD-014](docs/DECISIONS.md#qd-014--aqreqasiya-üçün-ayri-razılıq-includeinstats).

---

### 🔒 «İndi haradayıq?» — üç məxfilik qərarı

Karyera xəritəsi ([`/class/[slug]/map`](src/app/%28app%29/class/%5Bslug%5D/map/page.tsx))
sinfin ən həssas səthidir. Üç qərar sənədləşdirilir, çünki müdafiədə soruşulur:

**1. ƏMƏK HAQQI QƏSDƏN YOXDUR.** Nə sxemdə sütun, nə servisdə hesablama, nə
API cavabında sahə var. Səbəb: 14–28 nəfərlik sinifdə **aqreqasiya olunmuş maaş
belə fərdiləşdirilə bilər** — öz rəqəmini bilən bir nəfər ortadan qalanları
çıxarır, iki nəfər isə praktiki olaraq üçüncünü tapır. k-anonimlik bunu HƏLL
ETMİR, çünki problem xananın ölçüsündə deyil, göstəricinin arifmetikasındadır.
Sənəd bunu SÜBUT edir: `WhereAreWeNow` sxemi `additionalProperties: false`-dur
və `openapi.test.ts` sənəddə `salary` / `bonus` sözünün olmadığını yoxlayır.
→ [QD-011](docs/DECISIONS.md#qd-011--maaş--bonus-sahəsi-yoxdur)

**2. XƏRİTƏ KOORDİNATI BAZADAN GƏLMİR.** `CareerEntry`-də `latitude` /
`longitude` sütunu yoxdur. Pin **şəhər mərkəzinə** qoyulur
([`src/lib/geo.ts`](src/lib/geo.ts) — statik cədvəl, `prisma` importu yoxdur),
yəni eyni şəhərdəki iki nəfər eyni nöqtədə birləşir. Tanınmayan şəhər pin
YARATMIR — sətir ölkə səviyyəsində sayılır.
→ [QD-012](docs/DECISIONS.md#qd-012--xəritə-koordinatı-bazadan-gəlmir)

**3. GİZLƏTMƏ ÖLÇÜLƏR ARASINDA UZLAŞIR.** Bütün bölgülər TƏK sətir çoxluğu
üzərində, TƏK keçiddə hesablanır və hər ölçü sətirlərin hamısını örtür:
`Σ açıqlanan + açıqlanmayan + bildirilməyən = respondentCount`. Buna görə iki
qrafiki bir-birindən çıxıb qalıq (deməli fərd) almaq mümkün deyil. Şəhər xanası
3 nəfərdən kiçikdirsə sətir ölkə səviyyəsinə yığılır; ölkə də kiçikdirsə
tamamilə «Açıqlanmayan» olur. Alqoritm və ölçülmüş alternativlər
[`src/lib/career-stats.ts`](src/lib/career-stats.ts) başlığındadır.
→ [QD-013](docs/DECISIONS.md#qd-013--k-anonimlik-həddi--3)

### 🔒 Məxfilik siyasəti — niyə koddan sonra SƏNƏD də var

QU CLASS-ın texniki nüvəsi məxfilik mühərrikidir: dörd səviyyə, sahə-səviyyə
görünürlük, aqreqasiya üçün AYRICA razılıq. **Öz məxfilik bildirişi olmayan
məxfilik platforması ziddiyyətdir** — ona görə Blok 11A dörd hüquqi sənəd
(`/legal/privacy` · `/terms` · `/copyright` · `/equal-opportunity`) və
əlçatanlıq bəyanatı (`/accessibility`) gətirdi. Mətnlər demo səviyyəsindədir,
amma məhsulun ƏSL davranışını təsvir edir: sənədlə kod arasında uyğunsuzluq
qalmamalıdır.

**Kuki razılığı `localStorage`-da SAXLANMIR.** Dəyər `document.cookie`-yə
yazılır (`SameSite=Lax`, 1 il, identifikator DAŞIMIR) və serverdə `cookies()`
ilə oxunur — razılıq verilmişsə banner HTML-ə ÜMUMİYYƏTLƏ düşmür.
`localStorage` ilə server komponenti onu oxuya bilməzdi və banner hər yükləmədə
bir anlıq görünərdi. Qayda [`src/lib/consent.ts`](src/lib/consent.ts)-dədir və
[`consent.test.ts`](src/lib/consent.test.ts) + `public.spec.ts` ilə bərkidilib.

Təhdid modeli, nəyi qorumadığımız və istehsal öncəsi siyahı:
**[`docs/SECURITY.md`](docs/SECURITY.md)**.

---

## Quraşdırma

### 1. Ön şərtlər

- **Node.js 20+** (ölçmə mühiti: `v24.18.0`)
- Docker **lazım deyil** — baza SQLite-dır.
- Layihə qovluğu: `qu-class` — **VS Code-da məhz bu qovluğu aç**, `holberton`-u yox.
  `.vscode/` konfiqləri layihə kökündədir; bir səviyyə yuxarıdan açsan F5 işləmir.

### 2. Sıfırdan işə salma — altı əmr

```bash
git clone <repo-url> && cd qu-class
cp .env.example .env          # sonra AUTH_SECRET-i doldur (aşağı)
npm install
npx prisma migrate dev        # dev.db yaradır / miqrasiyaları tətbiq edir
npm run db:seed               # demo datası (deterministik — hər dəfə eyni nəticə)
npm run dev                   # http://localhost:3000
```

İstehsal rejimini yoxlamaq üçün son əmr əvəzinə:

```bash
npx prisma migrate deploy     # mövcud bazaya yalnız miqrasiyaları tətbiq edir
npm run build                 # `prebuild` Swagger aktivlərini + openapi.json yaradır
npm start                     # http://localhost:3000
```

✅ **Bu ardıcıllıq ölçülüb, təxmin deyil.** Blok 12F-də HEAD commit-inin ağacı
təmiz qovluğa açıldı (**665 fayl**) və yuxarıdakı addımlar sıfırdan işlədildi:
`npm ci` → `.env` → `migrate deploy` → `db:seed` → `build` (**97 route**) →
`npm start` → `/` **200**, `/docs` **200**, `/api/v1/health` **200**.

🔴 **`prebuild` addımı buraxıla bilməz.** `public/swagger/` **qəsdən**
izlənmir (Swagger UI paketindən köçürülən törəmə fayldır) — təmiz nüsxədə
YOXDUR və `/docs` stil-siz açılardı. `npm run build` (və `npm run dev` →
`predev`) `npm run docs:assets` ilə onu avtomatik yaradır.

⚠️ `docs/openapi.json` isə **əksinə, commit olunur** — bütün məqsədi layihəni
qaldırmadan oxuna bilməkdir (`editor.swagger.io`-da açılır). `prebuild` onu
yenidən generasiya edir və `src/lib/api/openapi.test.ts`-dəki drift testi
sənəd köhnələndə qırmızıya düşür.

🔴 `prisma/dev.db` də izlənmir: **seed işlədilməsə baza boşdur.**

### 3. `.env`

`cp .env.example .env` edib **`AUTH_SECRET`-i doldur** — qalan iki dəyər
nümunə faylında hazır gəlir:

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<npx auth secret ilə yarat>"
AUTH_TRUST_HOST=true          # `next start` (production) rejimində məcburidir
```

⚠️ `AUTH_TRUST_HOST` olmasa `npm run build && npm start` rejimində giriş
`UntrustedHost` xətası verir (Vercel-də bu bayraq avtomatik qoyulur).

🔴 `.env.example`-də **real sirr yoxdur** və `GITHUB_TOKEN` ora **yazılmır** —
səbəb [`docs/SECURITY.md`](docs/SECURITY.md) §5-dədir.

### 4. Terminaldan işə salma

```bash
npm run dev          # http://localhost:3000 (port sabitdir)
npm run db:studio    # Prisma Studio — bazaya baxış
```

`npm run dev` porti 3000-ə **sabitləyir** (`-p 3000`), yəni port məşğuldursa Next
başqa porta keçmir — `EADDRINUSE` ilə sınır. Buna görə `predev` addımı
`scripts/free-port.mjs` işlədir: 3000-i tutan **köhnə dev serveri** avtomatik
dayandırır. Portu başqa proqram tutubsa toxunmur, xəbərdarlıq yazır.

Əl ilə: `npm run free-port`.

### 5. Docker ilə (deploy ilə EYNİ image)

Lokal `docker` quraşdırılıbsa canlı mühitin dəqiq kopyasını qaldırmaq olar —
`npm install` da, Node versiyası da lazım deyil:

```bash
docker build -t qu-class .
docker volume create qu-data
docker run --rm -p 3000:3000 \
  -v qu-data:/data \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e AUTH_TRUST_HOST=true \
  qu-class
```

Baza (`/data/qu.db`), demo datası və `uploads/` qovluğu `qu-data` volume-unda
qalır — konteyneri silsən də itmir. Ətraflı: [Deploy](#deploy--canlı-versiya).

### 6. VS Code-da F5

**F5 → dev server qalxır → brauzer avtomatik açılır.** Başqa heç nə lazım deyil.

| Konfiqurasiya | Nə edir |
|---|---|
| **QU CLASS: işə sal (F5)** ⭐ | `npm run dev` işə salır, "Ready in …" sətrini gözləyir, brauzerdə `http://localhost:3000/` açır. Default seçim. |
| **QU CLASS: işə sal → /kuds** | Eyni, amma `/kuds` açır. ⚠️ `/kuds` auth tələb edir — giriş etməmisənsə `/login`-ə düşəcəksən. |
| **QU CLASS: dev + Chrome debug** | Eyni, amma Chrome debug sessiyası ilə — client kodunda breakpoint qoymaq üçün. |
| **Next.js: server-side debug (attach 9229)** | Əvvəlcə `npm run dev:debug`, sonra bunu qoş (Server Component / Server Action / route handler debug-ı). |

Səhv gedərsə bilməli olduğun iki şey:

> **Qovluq.** `qu-class` qovluğunu aç. Valideyn `holberton` qovluğunu açsan VS
> Code onun `.vscode/launch.json`-ını oxuyur — orada da eyni konfiqlər var
> (`cwd` `qu-class`-a baxır), amma `qu-class`-dakı dəst daha tamdır.
>
> **Niyə `preLaunchTask` yoxdur.** Konfiqlər `serverReadyAction` işlədir,
> `preLaunchTask` + background `problemMatcher` yox. `next dev` TTY-də ANSI rəng
> kodları yazır (`\e[32m\e[1m✓\e[22m\e[39m Ready in 1497ms`); `endsPattern`
> `^\s*✓` kimi ankerlə yazılsa heç vaxt tutmur və VS Code task-ı **sonsuz
> gözləyir** — F5 basılır, heç nə olmur, xəta da görünmür. `serverReadyAction`
> bu asılılığı tamamilə aradan qaldırır və Shift+F5 serveri də öldürür
> (portda "zombi" `next-server` qalmır).

---

## Deploy — canlı versiya

**Platforma:** Fly.io · **Baza:** SQLite, davamlı volume-da · **Image:** Docker (multi-stage)
**Qərar sənədi:** [QD-018](docs/DECISIONS.md#qd-018--deploy-flyio--volume-postgres-ə-keçid-yox)

| | |
|---|---|
| **Canlı ünvan** | `https://qu-class.fly.dev` — deploy əmri işlədildikdən sonra aktivləşir (aşağı) |
| **Sağlamlıq** | `GET /api/v1/health` → `{"status":"ok"}` |
| **API sənədi** | `/docs` (Swagger UI, oflayn aktivlərlə) · `/api/v1/openapi.json` |

### Arxitektura

```
                    ┌──────────────────────────────────────┐
   HTTPS (Fly edge) │  qu-class maşını · fra · TƏK instans  │
   force_https ─────▶                                      │
                    │  node server.js  (Next standalone)   │
                    │        │                             │
                    │        ├── SQLite  ──▶ /data/qu.db   │
                    │        └── uploads ──▶ /data/uploads │◀── simvolik keçid
                    └──────────────────┬───────────────────┘    public/uploads-dan
                                       │
                                 Fly volume «qu_data» (1 GB)
                                 deploy-lar arasında YAŞAYIR
```

**Üç fayl bu quruluşu daşıyır:**

| Fayl | Rolu |
|---|---|
| [`Dockerfile`](Dockerfile) | `deps → builder → migrator → runner`. Builder-də `prisma generate`, `npm run build` (→ `prebuild` Swagger aktivlərini yığır) və **demo bazasının şablonu** hazırlanır |
| [`docker-entrypoint.sh`](docker-entrypoint.sh) | Start ardıcıllığı: uploads keçidi → `prisma migrate deploy` → **şərti** seed → `node server.js` |
| [`fly.toml`](fly.toml) | `internal_port 3000`, `force_https`, `/data` mount, **`min_machines_running = 1`** |

### 🔴 Tək maşın — dəyişdirilməməli

Fly volume-u **tək maşına** bağlıdır, paylaşılan disk deyil. İkinci maşın açılsa
öz ayrıca volume-unu (öz **boş** bazasını) görər — iki istifadəçi eyni saytda iki
fərqli baza ilə işləyər və heç bir xəta çıxmaz. Buna görə `fly.toml`-da:

```toml
auto_stop_machines   = "off"
min_machines_running = 1
primary_region       = "fra"   # TƏK region
```

`fly scale count 2` və ya ikinci region **əlavə etmə**.

### Deploy əmri

```bash
# 1) Token: https://fly.io/user/personal_access_tokens
# 2) Tokeni ƏMR SƏTRİNƏ argument kimi vermə — mühit dəyişəni kimi ver
#    (`ps` çıxışı maşındakı hər prosesə görünür — bax docs/SECURITY.md §5)
read -rsp "FLY_API_TOKEN: " FLY_API_TOKEN && export FLY_API_TOKEN \
  && node scripts/deploy.mjs; unset FLY_API_TOKEN
```

`scripts/deploy.mjs` **idempotentdir** — hər addım əvvəlcə mövcudluğu yoxlayır:

1. `flyctl` yoxdursa `~/.fly`-a quraşdırır (**`sudo` lazım deyil**)
2. app yaradır (varsa keçir)
3. `qu_data` volume yaradır, 1 GB (varsa keçir)
4. sirrləri **stdin üzərindən** qoyur (`fly secrets import`, argv-dən yox)
5. `fly deploy --remote-only` — image Fly-ın builder-ində qurulur, **lokal Docker tələb olunmur**

Plan görmək (heç nə dəyişdirmir): `node scripts/deploy.mjs --dry-run`

**Yenidən deploy** — eyni əmr. `AUTH_SECRET` bir dəfə qoyulur və sonra
**toxunulmur** (dəyişsə bütün mövcud sessiyalar düşər).

🔴 **İLK deploy-dan sonrakı MƏCBURİ addım — admin parolunun rotasiyası.**
Seed `admin@qu.edu.az` hesabını sənədləşdirilmiş demo parolu ilə yaradır və o
parol bu README-dədir. `UNIVERSITY_ADMIN` istənilən hesabı admin-ə yüksəldə
bilir (`changeSystemRole`), yəni canlı saytda paylaşılmış admin parolu bir
dəfəlik girişi **qalıcı** nəzarətə çevirər. İlk ictimai link paylaşılmadan
əvvəl **yalnız admin** parolu dəyişdirilir; dörd üzv hesabı toxunulmur —
nümayişin dəyəri onlardadır. Ölçülmüş arqument, rədd edilmiş alternativlər və
mexanizm: [QD-019](docs/DECISIONS.md#qd-019--canlı-instansiyada-demo-admin-parolu-dəyişdirilir-üzv-hesabları-qalır).

### Mühit dəyişənləri — tam siyahı

| Dəyişən | Haradan gəlir | Məcburi | Nə edir |
|---|---|---|---|
| `DATABASE_URL` | `fly secrets` (skript qoyur) | ✅ | `file:/data/qu.db` — **volume-un içində**. Image-dəki yol olsaydı hər deploy-da sıfırlanardı |
| `AUTH_SECRET` | `fly secrets` (skript **yaradır**) | ✅ | JWT imzası. 32 bayt təsadüfi |
| `AUTH_URL` | `fly secrets` (skript qoyur) | ✅ | `https://<app>.fly.dev`. `https://` prefiksi kukini `__Secure-` + `secure` edir (`src/auth.config.ts:27`) |
| `AUTH_TRUST_HOST` | `fly.toml` → `[env]` | ✅ | Auth.js v5-in proxy arxasındaki host yoxlaması. **`NEXTAUTH_URL` v5-də İŞLƏMİR** — o, v4 adıdır |
| `PORT` · `DATA_DIR` | `fly.toml` → `[env]` | ✅ | `3000` · `/data` |
| `LH_*` · `SHOTS_*` · `E2E_PORT` | — | ❌ | Yalnız audit alətləri (`npm run audit:*`), deploy-da işlədilmir |
| `GITHUB_TOKEN` · `GIT_REMOTE_URL` | yalnız lokal mühit | ❌ | `node scripts/git.mjs push`. Serverdə **yeri yoxdur** |
| `FLY_API_TOKEN` | yalnız lokal mühit | ❌ | `scripts/deploy.mjs`. Serverə **göndərilmir** |

🔴 `fly.toml` repoya girir — ora **sirr yazılmır**. Sirrlər yalnız
`fly secrets`-dədir və `fly secrets list` dəyəri yox, adı göstərir.

### Demo datası nə vaxt yüklənir

`docker-entrypoint.sh` `User` cədvəlini **sayır**:

- **0 sətir** → build anında hazırlanmış demo şablonu yerinə qoyulur
- **0-dan çox** → seed **atlanır**, istifadəçi datası toxunulmur

Yoxlama fayl mövcudluğu ilə **deyil**: `/data/qu.db` `migrate deploy`-dan sonra
həmişə mövcuddur, yəni fayl testi ilk deploy-dan sonra heç vaxt işləməzdi.
Şablon `prisma/seed.ts`-in özündən doğur və seed deterministikdir (sabit `NOW`,
sabit bcrypt duzu), yəni nəticə runtime-da seed etməklə eynidir.

Bazanı **qəsdən** sıfırlamaq üçün:

```bash
flyctl ssh console --app qu-class -C "rm -f /data/qu.db"
flyctl apps restart qu-class
```

### Yüklənmiş şəkillər deploy-dan sağ çıxır

`public/uploads` **image-in içindədir** və hər deploy-da yeni image ilə
sıfırlanır. Entrypoint onu silib `/data/uploads`-a **simvolik keçid** qoyur —
`src/services/storage.ts` **dəyişmir**, kod yenə `public/uploads`-a yazır,
sadəcə yolun arxasındakı disk volume-dur.

⚠️ Buna əlavə olaraq [`src/app/uploads/[...path]/route.ts`](src/app/uploads/%5B...path%5D/route.ts)
lazım oldu: Next.js istehsalda `public/` siyahısını **server başlayanda bir dəfə**
oxuyur, yəni start-dan sonra yüklənən fayl serveri yenidən başlatmayana qədər
404 verir. Səbəb və ölçmə: [`src/services/uploads-serve.ts`](src/services/uploads-serve.ts) başlığı.

### Diaqnostika

```bash
flyctl logs --app qu-class                    # entrypoint addımları burada görünür
flyctl status --app qu-class
flyctl ssh console --app qu-class -C "ls -la /data /data/uploads"
flyctl ssh console --app qu-class -C "ls -la /app/public/uploads"   # → simvolik keçid
```

| Simptom | Səbəb |
|---|---|
| Səhifə açılır, **CSS yoxdur** | `Dockerfile`-da `.next/static` və/və ya `public` kopyalanmayıb — standalone onları avtomatik gətirmir |
| `Query engine ... not found` | `schema.prisma` → `binaryTargets` base image ilə uyğun deyil (`node:22-slim` → `debian-openssl-3.0.x`) |
| Girişdən sonra **döngə** | `AUTH_URL` `https://` ilə başlamır, ya da `AUTH_TRUST_HOST` yoxdur |
| `/docs` **ağ** açılır | Swagger aktivləri yığılmayıb — `prebuild` hook-u (`npm run docs:assets`) işləməyib |
| Deploy-dan sonra **data itir** | Volume mount olunmayıb, ya `DATABASE_URL` `/data`-dan kənardır |

---

## Test hesabları

Hamısının şifrəsi: **`Test1234!`**

| E-poçt | Sistem rolu | Cohort rolu | Mərhələ |
|---|---|---|---|
| `admin@qu.edu.az` ⚠️ | `UNIVERSITY_ADMIN` | `MEMBER` | STUDENT |
| `moderator@qu.edu.az` | `USER` | `CLASS_MODERATOR` | STUDENT |
| `rep@qu.edu.az` | `USER` | `CLASS_REPRESENTATIVE` | STUDENT |
| `coordinator@qu.edu.az` | `USER` | `EVENT_COORDINATOR` | STUDENT |
| `alumni@qu.edu.az` | `USER` | `MEMBER` | ALUMNI |

🔴 **Bu hesablar YALNIZ demo üçündür.** Seed sabit bcrypt duzu işlədir (seed
deterministik olmalıdır), yəni 125 hesabın hash-i eynidir. Qeydiyyat yolu isə
tamamilə başqa koddur və hər istifadəçi üçün **təsadüfi duz** yaradır
(`hashSync(password, 10)`). Ətraflı: [`docs/SECURITY.md`](docs/SECURITY.md) §3.

⚠️ **`admin@qu.edu.az` — canlı instansiyada parol FƏRQLİDİR.** Yuxarıdaki cədvəl
**lokal** seed üçündür. Canlı saytda administrator parolu ilk deploy-dan sonra
dəyişdirilir; dörd üzv hesabı (`rep` · `moderator` · `coordinator` · `alumni`)
isə canlıda da eyni parolla işləyir — dörd cohort rolunu görmək üçün onlar
kifayətdir. Səbəb: `UNIVERSITY_ADMIN` istənilən hesabı admin-ə **yüksəldə
bilir** (`changeSystemRole`), yəni paylaşılmış admin parolu bir dəfəlik girişi
qalıcı nəzarətə çevirərdi. Ölçülmüş arqument və rədd edilmiş alternativlər:
[`docs/DECISIONS.md`](docs/DECISIONS.md) → **QD-019**.

---

## URL xəritəsi

| URL | Qrup | Nədir |
|---|---|---|
| `/` | `(public)` | **Welcome Page** [M1] — 11 bölmə, anonim açılır |
| `/about` · `/history` · `/mission` | `(public)` | Universitet məlumat səhifələri [M2] |
| `/faculties` · `/faculties/[slug]` | `(public)` | Fakültə kataloqu və detalı [M2] |
| `/campus-life` · `/clubs` · `/services` · `/newcomers` | `(public)` | Kampus, klublar, xidmətlər, yeni gələnlər [M2] |
| `/khankendi` · `/khankendi/[id]` | `(public)` | **Xankəndi bələdçisi** [M3] — 11 kateqoriya + xəritə |
| `/events` | `(public)` | Açıq tədbirlər (yalnız `visibility = PUBLIC`) |
| `/faq` | `(public)` | 4 kateqoriya, akkordeon, axtarış |
| `/accessibility` | `(public)` | KUDS §21 / WCAG 2.2 bəyanatı + maneə forması |
| `/legal/[slug]` | `(public)` | Məxfilik · Şərtlər · Müəllif hüququ · Bərabər imkanlar |
| `/docs` | `(public)` | **Swagger UI** — `/api/v1` sənədi, «Try it out» ilə |
| `/login` · `/register` | `(public)` | Giriş və qeydiyyat |
| `/home` | `(app)` | Əsas sinif səhifəsinə yönləndirir |
| `/class/[slug]/…` | `(app)` | Class Page və 10 alt səhifəsi |
| `/me` · `/me/edit` · `/me/privacy` · `/me/career` | `(app)` | Profil və məxfilik idarəetməsi [M7, M14] |
| `/u/[userId]` | `(app)` | İctimai profil — My Class Story [M7] |
| `/events/[id]` · `/manage` · `/report` | `(app)` | Tədbir detalı, koordinator paneli [M13] |
| `/notifications` | `(app)` | **Bildiriş mərkəzi** [M15] — filtr, səhifələmə, header rozeti |
| `/search` | `(app)` | Qlobal axtarış [M16] |
| `/kuds` | `(app)` | **KUDS stil bələdçisi** — daxili sənəd, auth arxasındadır |
| `/admin` + 8 alt səhifə | `(admin)` | İdarə paneli — `UNIVERSITY_ADMIN` [M17] |

Route qrupları URL-ə təsir etmir: `(app)/kuds/page.tsx` → `/kuds`.
İctimai səthin müqaviləsi `src/lib/routes.ts` → `PUBLIC_PAGE_PATHS`-dədir və hər
yol üç ziyarətçi növü üçün testlə yoxlanılır (`routes.test.ts` + `public.spec.ts`).

⚠️ `/events` AÇIQDIR, `/events/[id]` isə AUTH ARXASINDADIR — detalda RSVP və
iştirakçı siyahısı var. İstisna DƏQİQ yol üçündür (`PUBLIC_EXACT_PATHS`).

---

## API sənədi

**Swagger UI:** http://localhost:3000/docs · **xam sənəd:** `/api/v1/openapi.json`

Aktivlər `predev` / `prebuild` hook-ları ilə `public/swagger/`-ə köçürülür —
**CDN yoxdur, oflayn işləyir**. Sənəd Zod sxemlərindən **törəyir**
([`src/lib/api/openapi.ts`](src/lib/api/openapi.ts)), yəni əl ilə yazılmış YAML
köhnələ bilmir.

**Sənədi görməyin üç yolu:**

| Nə lazımdır | Hansı yol | Nə tələb edir |
|---|---|---|
| Layihəni qaldırmadan, təkcə repo | [`docs/openapi.json`](docs/openapi.json) | Heç nə — fayl repoda hazır, mətn redaktoru kifayətdir |
| Vizual, validasiya edilmiş baxış | [editor.swagger.io](https://editor.swagger.io) → File ▸ Import file → `docs/openapi.json` | Brauzer, internet (editor.swagger.io özü) |
| İnteraktiv, «Try it out» ilə canlı sorğu | `/docs` | Layihə işləməlidir (`npm run dev`) |

⚠️ `docs/openapi.json` **statik snapshot-dır**, mənbə deyil — `npm run docs:openapi`
ilə `buildOpenApiDocument()`-dan yenidən generasiya olunur. Kod dəyişib fayl
yenilənməzsə `src/lib/api/openapi.test.ts`-dəki drift testi qırmızıya düşür.

**36 route · 44 sənədləşmiş əməliyyat:**

| Sahə | Say | Nümunə |
|---|---|---|
| Auth | 4 | `POST /auth/register` · `/auth/login` · `/auth/logout` · `GET /auth/session` |
| İctimai məzmun | 8 | `/health` · `/faculties` · `/content/pages{,/{slug}}` · `/faq` · `/guide-places{,/{id},/{id}/memories}` |
| Sinif | 11 | `/cohorts{,/{slug}}` + `/members` `POST /posts` `/timeline` `/achievements` `POST /memories` `/yearbook` `/support` `POST /events` `/stats/where-are-we-now` |
| Paylaşım/xatirə/tədbir (id ilə) & axtarış | 4 | `GET/PATCH/DELETE /posts/{id}` · `GET/PATCH/DELETE /memories/{id}` · `GET/PATCH/DELETE /events/{id}` · `GET /search` |
| Bildiriş | 3 | `GET /notifications` · `POST /notifications/{id}/read` · `/read-all` |
| Admin | 5 | `/admin/stats` · `/admin/reports{,/{id}/resolve}` · `/admin/audit` · `/admin/users` |
| Sənəd | 1 | `GET /openapi.json` (sənədin özü — sxemdə sadalanmır) |

**Memarlıq qeydi.** UI **Server Actions** və Server Component-lər işlədir; `/api/v1`
isə xarici inteqrasiya və sənədləşdirmə üçün REST səthidir. Məntiq **dublikat
deyil** — hər iki səth eyni servis qatını (`src/services/*`) çağırır və məxfilik
mühərriki (`src/lib/visibility.ts`) tək yerdədir. Endpoint-lər **sıfır yeni DB
sorğusu** yazır.

⚠️ v1 qatı UI-dan bir yerdə **daha məhduddur**: üzv olmadığın sinif üçün endpoint
`404` qaytarır (`403` yox — resursun mövcudluğu da məlumatdır), səhifə isə boş
siyahı göstərir. Səbəb `src/lib/api/cohort-scope.ts`-dədir.

⚠️ Mövcud `/api/feed`, `/api/search`, `/api/upload`, `/api/events/[id]/ics`
**dəyişməyib** — onları client komponentləri işlədir (`FeedList`, ⌘K palitrası).
v1 qatı onların yanındadır.

---

## Əmrlər

```bash
npm run dev           # dev server (port 3000) — predev portu azad edir
npm run dev:debug     # dev server + Node inspector (9229)
npm run free-port     # 3000-i tutan köhnə dev serveri dayandır
npm run build         # istehsal build-i
npm start             # istehsal serveri (build tələb edir)
npm run lint          # ESLint
npm run test          # Vitest — 1844 test / 68 fayl
npm run test:e2e      # Playwright — 220 test / 22 fayl (build tələb edir)
npm run test:e2e:dev  # Playwright — dev smoke ("F5 işləyirmi?")
npm run db:seed       # prisma db seed
npm run db:studio     # Prisma Studio
npm run db:backfill   # FieldVisibility sətirlərini doldurur
npm run docs:assets   # Swagger UI aktivlərini public/swagger/-ə köçürür
npx tsc --noEmit      # tip yoxlaması
```

**Audit alətləri** (hamısı təkrar işlədilə bilir):

```bash
npm run audit:lighthouse   # Lighthouse · 5 səhifə (auth kukisi ilə) → docs/lighthouse/
npm run audit:responsive   # 5 breakpoint × 51 səhifə → docs/responsive/
npm run audit:queries      # N+1 sorğu profili
npm run git:audit          # push öncəsi sızma auditi → docs/git-audit-report.md
npm run shots              # README qalereyası → docs/screenshots/ (donmuş saat)
npm run demo:gif           # README demo GIF-i → docs/media/demo.gif (ffmpeg tələb edir)
```

⚠️ `npm run shots` və `npm run demo:gif` **ayrı terminalda** `npm run shots:serve`
tələb edir — saatı donduran istehsal serveri (`scripts/freeze-clock.cjs`).
Bunsuz nisbi tarixlər («2 gün əvvəl») hər çəkilişdə dəyişir və çıxış determinist
olmur.

Hər blokun sonunda üçü də təmiz olmalıdır:
`npx tsc --noEmit && npm run lint && npm run build`

---

## Testlər

| Dəst | Say | Əmr |
|---|---|---|
| Vahid + inteqrasiya (Vitest) | **1844 test / 68 fayl** | `npm run test` |
| E2E (Playwright, istehsal build-i) | **220 test / 22 fayl** | `npm run build && npm run test:e2e` |
| E2E dev smoke («F5 işləyirmi?») | **1 test** | `npm run test:e2e:dev` |

İki E2E dəsti ayrıdır, çünki biri **istehsal** serverinə (`next start`, port 3100),
digəri **dev** serverinə (`next dev`, port 3000) baxır — eyni konfiqdə
birləşdirilə bilməzlər.

```bash
# 1) Tam E2E dəsti — istehsal build-inə qarşı
npm run build            # MƏCBURİDİR, `next start` build tələb edir
npm run test:e2e

# 2) "F5 işləyirmi?" smoke — dev serverə qarşı
npm run test:e2e:dev
```

`test:e2e:dev` F5-in nəticəsini simulyasiya edir: `/` açılır, giriş forması
render olunur, seed hesabı ilə giriş sinif səhifəsinə aparır, `/kuds` açılır və
**brauzer konsolunda xəta olmur**. Dev server artıq işləyirsə ona qoşulur.

İlk dəfə brauzer lazımdır: `npx playwright install chromium`.
Testlər seed edilmiş `prisma/dev.db`-ni oxuyur.

---

## Seed datası

`prisma/seed.ts` deterministikdir (seeded PRNG + sabit `NOW` + sabit ID-lər):
təkrar işlədəndə eyni baza alınır. Mətnlər `prisma/seed-data/content.ts`-dədir.

**Həcm — 28 cədvəlin hamısı doludur:**

| | | | |
|---|---|---|---|
| 4 fakültə | 10 ixtisas | 6 cohort | **125 istifadəçi** |
| 300 paylaşım | 267 media | 150 şərh | 400 reaksiya |
| 174 xronologiya qeydi | 80 nailiyyət | 60 xatirə | 40 teq · 764 istifadəçi teqi |
| 72 karyera qeydi | 25 təhsil qeydi | 40 dəstək təklifi | 2772 sahə-məxfilik sətri |
| 25 tədbir | 459 RSVP | 6 klub · 105 üzvlük | 207 bildiriş |
| 12 şikayət | 46 audit sətri | 14 məzmun səhifəsi · 20 FAQ | 30 Xankəndi bələdçi yazısı |

⚠️ **Karyera qeydləri QƏSDƏN KÜMƏLƏNİB** (`CAREER_PLACEMENT_PLANS` /
`CAREER_TRACK_PLANS`). Əvvəlki bölgü 15 ölkəyə və 40 şirkətə bərabər səpilirdi;
k-anonimlik eşiyi (3 nəfər) ilə birləşəndə «İndi haradayıq?» panelinin HƏR
xanası gizlənirdi — yəni məxfilik mühərriki işləyirdi, amma nümayiş ediləcək bir
şey qalmırdı. Real məzun axını onsuz da bir-iki mərkəzdə toplaşır. Sətir sayları
DƏYİŞMƏYİB və PRNG axını qorunub (`keepRandomStep`), yəni qalan 27 cədvəl eyni
qalır.

---

## Keyfiyyət ölçmələri

| Ölçü | Nəticə | Mənbə |
|---|---|---|
| Lighthouse **desktop** — `/` `/home` `/directory` `/map` `/admin` | **100 / 100 / 100 / 100** (Perf · A11y · BP · SEO) | `docs/quality-report-12c.md` §2.1 |
| Lighthouse **mobil** (yavaş 4G + 4× CPU) | 87–94 Performance | §2.2 |
| WCAG 2.2 AA — axe, 12 səhifə × 2 vəziyyət | pozuntu yoxdur | `tests/e2e/a11y.spec.ts` |
| Toxunma hədəfi — 24px qapısı (SC 2.5.8) | iki shadcn primitivi istisna — bax №9 | §3.2 |
| Üfüqi sürüşmə — **51 səhifə × 5 breakpoint = 255 yoxlama** | sıfır | `tests/e2e/responsive.spec.ts` |
| Donut — bitişik dilim kontrastı | 2·4·6 dilimdə **≥ 3:1**; tək sayda riyazi hədd | `docs/quality-report-12c.md` §6 |
| Git tarixçəsi — sızma auditi (51 commit, 1057 blob) | 0 bloklayan, 0 xəbərdarlıq | `docs/git-audit-report.md` |

---

## Bilinən məhdudiyyətlər

**Funksional:**

| # | Məhdudiyyət | Səbəb |
|---|---|---|
| 1 | **Parol sıfırlama axını yoxdur** | E-poçt xidməti yoxdur — [QD-001](docs/DECISIONS.md#qd-001--parol-sıfırlama-axını-qəsdən-yazılmayıb). SIS ilə idxal edilmiş hesab administrasiyadan asılıdır |
| 2 | **Əmək haqqı göstəricisi yoxdur** | Qəsdən — [QD-011](docs/DECISIONS.md#qd-011--maaş--bonus-sahəsi-yoxdur). Məhsul qərarıdır, texniki boşluq deyil |
| 3 | Sessiya serverdən dərhal ləğv edilə bilmir | JWT strategiyası — [QD-009](docs/DECISIONS.md#qd-009--jwt-sessiya--session-cədvəli-yoxdur) |
| 4 | Rate-limit prosesdaxili yaddaşdadır | Redis yoxdur; çox instansiyalı yerləşdirmədə instansiya başına işləyir |

**Keyfiyyət** (`docs/quality-report-12c.md` §5-dən):

| # | Məhdudiyyət | Səbəb |
|---|---|---|
| 5 | **ISR ictimai səhifələrdə yoxdur** | `ConsentGate` → `cookies()` bütün `(public)` route-larını dinamik edir; PPR experimental, stack kilidlidir. Ölçü itki göstərmir |
| 6 | **`/home` mobil Performance 90-dan aşağı** (12C: 87 · 12E: 78 və 86 — iki işlətmə) | Yönləndirmə 600 ms alır; hədəf səhifə birbaşa ölçüləndə **91**. ⚠️ Mobil profil ölçən maşının yükünə həssasdır: eyni build-də TBT 2–3 dəfə tərpənir, FCP/LCP isə demək olar sabit qalır. Desktop profilində eyni səhifə **99** verir — bax `docs/quality-report-12c.md` §9 |
| 7 | **Yüklənmə vəziyyəti iki mexanizmlə verilir** — 19 səhifədə `loading.tsx`, 20 səhifədə səhifə daxili `<Suspense>`, 12 səhifədə heç biri | Axınla render cavab başlığını — yəni **statusu** — məzmundan əvvəl göndərir, ona görə `notFound()` / `forbidden()` çağıran seqmentə `loading.tsx` qoyula bilmir (404 səssizcə 200 olur). Səhifələr **A/B** bölünüb: **A** = status qapısı yoxdur → seqmentin ƏN DAR yerində `loading.tsx` (üç yerdə route qrupu ilə daraldılıb ki, qonşu dinamik seqmentə düşməsin); **B** = status qapısı var → qapı `await` edilir, YALNIZ ondan sonrakı alt-ağac `<Suspense>`-ə bükülür. Qalan 12 səhifədə ya gözləyəcək sorğu yoxdur (`/kuds`, `/docs`, `/login`), ya səhifə yönləndirir (`/home`, `/me`), ya da yeganə sorğu 404 qərarının ÖZÜDÜR — onu sərhədin arxasına salmaq statusu sındırardı. Bölgü və hər səhifənin səbəbi: [`docs/responsive/report.md`](docs/responsive/report.md) |
| 8 | **Toxunma hədəfi: WCAG 2.2 AA-nın 24px qapısı iki primitivdə ödənmir**, KUDS-un 44px tövsiyəsi isə 1674 elementdə | ⚠️ Blok 12C bu qapını «ödənilib» kimi yazmışdı, amma ölçmə **10 səhifədə** idi. Blok 12D-də 51 səhifəyə genişlənəndə `Checkbox` (**16×16**, `ui/checkbox.tsx` → `h-4 w-4`) və `Switch` (**36×20**, `ui/switch.tsx` → `h-5 w-9`) qapının altında qaldı — beş səhifədə görünür (`/me/career`, `/admin/moderation`, `/events/[id]/manage`, `/class/[slug]/memories`, `/kuds`). İkisi də shadcn primitividir və `src/components/ui/` CLAUDE.md §1-ə görə toxunulmazdır; çağırış yerində `className` ilə böyütmək bütün sistemdə checkbox/switch ölçüsünü dəyişən **dizayn qərarıdır**, responsive qırığı deyil. Blok 12D-də tapılan ÜÇÜNCÜ pozuntu (`AttendeeTable` çeşidləmə düyməsi 73×21) düzəldildi — o, bizim kodumuzda idi. 44px isə qapı deyil, tövsiyədir |
| 9 | Profil banneri xarici ünvanda `<img>` qalır | `next/image` hər hostu `remotePatterns`-də tələb edir; hamısını açmaq optimizatoru açıq proksiyə çevirər |
| 10 | ~~Kuki banneri mobil `/directory`-də CLS 0.035~~ — **12E ölçməsində 0** | Banner `fixed`-dir və axından kənardadır. Blok 12E-nin təkrar ölçməsində desktop və mobil profillərin **hər ikisində, beş səhifənin hamısında CLS = 0**. Sətir tarixi qeyd kimi saxlanılır |
| 11 | **Donut: TƏK saylı dilimdə bitişik kontrast 3:1-ə çatmır** (2.54:1) | Riyazi hədd, palitra qüsuru deyil: `--slice-*` şkalasının diapazonu **8.53** < 9, ona görə «bir-birinə qarşı 3:1» olan üç ton yoxdur → qonşuluq qrafi ikihissəlidir → qapalı halqada tək sayda dövr qurulmur. Sübut və bütün ölçülər: [`quality-report-12c.md` §6.4](docs/quality-report-12c.md). Yeni rəng uydurmaq CLAUDE.md §2-ni pozardı; əvəzinə dilim sayı **6** ilə kəsilir və sərhəd rəngdən asılı olmayan konturla verilir. Rəng heç vaxt tək kanal deyil (faiz etiketi + leqenda + cədvəl) |

**Miqyas:** SQLite tək yazıcı kilidi ilə işləyir — bu miqyasda (sinif = 14–28
nəfər) hiss olunmur, amma çox istifadəçili istehsalda birinci məhdudiyyət budur.
Keçid yolu ölçülüb: [`docker-compose.yml`](docker-compose.yml) — dörd addım,
**tətbiq kodunda sıfır dəyişiklik**.

---

## Gələcək — PostgreSQL-ə keçid

Repoda **opsional** [`docker-compose.yml`](docker-compose.yml) var. Layihənin
işləməsi üçün lazım deyil; SQLite seçiminin ([QD-002](docs/DECISIONS.md#qd-002--baza-sqlite-postgresql-deyil))
«keçid ucuzdur» iddiasının yoxlanan formasıdır:

```bash
docker compose up -d
# .env → DATABASE_URL="postgresql://qu:change-me@localhost:5432/qu_class?schema=public"
# prisma/schema.prisma → provider = "postgresql"
rm -rf prisma/migrations && npx prisma migrate dev --name init && npm run db:seed
```

Tətbiq kodunda dəyişiklik **yoxdur** — bütün enum-lar onsuz da `String` sütun +
Zod-dur ([QD-005](docs/DECISIONS.md#qd-005--bütün-enum-lar-string-sütun--zod)),
yəni Postgres native enum-una köçürmə tələb olunmur.

Digər gələcək addımlar `docs/SECURITY.md` §7-dədir (istehsala çıxmadan əvvəl
bağlanmalı siyahı).

---

## Sənədlər

| Fayl | Nə var |
|---|---|
| [`docs/DEMO.md`](docs/DEMO.md) | **8 dəqiqəlik canlı demo ssenarisi** — dəqiqə-dəqiqə addımlar, danışıq mətni, «əvvəlcədən hazırla» siyahısı və «nəyi göstərmə» qadağan siyahısı |
| [`docs/DEFENSE-QA.md`](docs/DEFENSE-QA.md) | **Müdafiə sual-cavabı** — 25 ehtimal olunan sual, kod istinadı ilə qısa cavablar; zəif nöqtələr dürüst yazılıb |
| [`docs/METRICS.md`](docs/METRICS.md) | **Layihənin real rəqəmləri** — fayl, sətir, model, endpoint, test, commit; hər rəqəmin yanında ölçmə əmri |
| [`docs/GW-COMPARISON.md`](docs/GW-COMPARISON.md) | **GW müqayisəsi** — 17 modul × 4 ölçü, 14 əlavənin kodda təsdiqlənmiş vəziyyəti, 6 qəsdli imtinanın səbəbi. Müdafiə materialı |
| [`CHANGELOG.md`](CHANGELOG.md) | Blok-blok tarixçə — 35 commit mənalı qruplarda |
| [`docs/screenshots/`](docs/screenshots/README.md) | 17 ekran görüntüsü + çəkiliş parametrləri və şəxsi məlumat yoxlamasının nəticəsi |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Sistem konteksti, ER diaqramı, məxfilik qərar axını, fan-out sequence, auth Edge/Node bölgüsü, qat qaydaları — **7 Mermaid diaqramı** |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | 17 qərar: Kontekst · Qərar · Alternativlər · Nəticə |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Təhdid modeli — nəyi qoruyuruq, **nəyi yox**; seed duzu, audit jurnalı, `.env` qaydaları |
| [`docs/audit-12a.md`](docs/audit-12a.md) | Statik audit — məxfilik + KUDS uyğunluğu, tapıntılar və düzəlişlər |
| [`docs/quality-report-12c.md`](docs/quality-report-12c.md) | Əlçatanlıq · performans · responsive · vəziyyətlər |
| [`docs/git-audit-report.md`](docs/git-audit-report.md) | Tarixçədə sızma auditi (avtomatik yaradılır) |
| [`PLAN.md`](PLAN.md) | Tam spesifikasiya və 14 blokluq icra planı |
| [`CLAUDE.md`](CLAUDE.md) | İş qaydaları, KUDS tokenləri, tələ reyestri |
| `/kuds` (səhifə) | Canlı dizayn bələdçisi — auth arxasındadır |

---

## Komanda

| | |
|---|---|
| **Müəllif** | Elmeddin Heydarov — Holberton School final layihəsi |
| **Dizayn standartı** | KUDS v1.0 — Qarabağ Universiteti |
| **Commit tarixçəsi** | 35 commit, blok-blok iş axını (`npm run git:log`) — [`CHANGELOG.md`](CHANGELOG.md) |
| **Buraxılış** | `v1.0.0` (annotasiyalı teq) |

⚠️ Layihə mühitində **`git` binarı yoxdur** — commit-lər `isomorphic-git` ilə
yazılır (`scripts/git.mjs`). Nəticə standart `.git` qovluğudur, `git log` /
`git clone` ilə tam uyğundur. Səbəb: [QD-017](docs/DECISIONS.md#qd-017--git-əməliyyatları-isomorphic-git-ilə).

---

## Lisenziya

**Hazırda `LICENSE` faylı yoxdur** — yəni default olaraq bütün hüquqlar
müəllifdə qalır. Bu, akademik portfolio layihəsidir; kod nümayiş və
qiymətləndirmə üçün açıqdır.

Repo ictimai olaraq paylaşılacaqsa lisenziya **push-dan əvvəl** seçilməlidir
(MIT — ən icazəli · Apache-2.0 — patent bəndi ilə · CC-BY-NC — kommersiya
istifadəsini bağlayır). Seçim müəllifindir; fayl əlavə olunanda bu bölmə də
yenilənməlidir.

**Üçüncü tərəf:** `package.json`-dakı asılılıqlar öz lisenziyaları altındadır
(əsasən MIT). KUDS dizayn sistemi və Qarabağ Universiteti brend elementləri
universitetə məxsusdur və bu lisenziyaya daxil deyil.
