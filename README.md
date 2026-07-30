# QU CLASS

Qarabağ Universitetinin tələbə və məzun sinif platforması (Holberton School final layihəsi).

Üç mərhələ, eyni səhifə: `INCOMING` → `STUDENT` → `ALUMNI`.
Tam spesifikasiya: [PLAN.md](PLAN.md) · İş qaydaları: [CLAUDE.md](CLAUDE.md) · Dizayn: `/kuds`

---

## Sprint 1 — MVP Foundation

```bash
npm i && npx prisma migrate dev && npm run db:seed && npm run dev
```

**Swagger UI:** http://localhost:3000/docs · **xam sənəd:** `/api/v1/openapi.json`
(aktivlər `predev`/`prebuild` hook-ları ilə `public/swagger/`-ə köçürülür — CDN yoxdur, oflayn işləyir).

**Test hesabları** — hamısının şifrəsi `Test1234!`:
`admin@qu.edu.az` (UNIVERSITY_ADMIN) · `moderator@qu.edu.az` (CLASS_MODERATOR) ·
`rep@qu.edu.az` (CLASS_REPRESENTATIVE) · `coordinator@qu.edu.az` (EVENT_COORDINATOR) ·
`alumni@qu.edu.az` (məzun).

| Sprint kriteriyası | Nə ilə ödənilir |
|---|---|
| Endpoint-lər Swagger-dən test edilə bilir | [src/app/(public)/docs/page.tsx](src/app/(public)/docs/page.tsx) + [ApiDocs.tsx](src/features/docs/ApiDocs.tsx) → `withCredentials: true` |
| OpenAPI sənədi | [src/lib/api/openapi.ts](src/lib/api/openapi.ts) → `/api/v1/openapi.json` (Zod sxemlərindən **törəyir**) |
| Qeydiyyat → giriş → sessiya | `POST /api/v1/auth/register` · `POST /api/v1/auth/login` · `GET /api/v1/auth/session` |
| Qorunan endpoint 401 **JSON** verir | [src/lib/api/guard.ts](src/lib/api/guard.ts) → `withUser` (redirect YOX) |
| İcazəsiz resurs 404 verir, 403 yox | [src/lib/api/cohort-scope.ts](src/lib/api/cohort-scope.ts) |
| Landing / Home səhifəsi | [src/features/welcome/](src/features/welcome/) → [(public)/page.tsx](src/app/(public)/page.tsx) |
| Naviqasiya 404 vermir | [src/layouts/nav.ts](src/layouts/nav.ts) → `LANDING_SECTIONS` anchor-ları |
| Anonim səhifədə sinif məzmunu yoxdur | `WelcomePage` `ANONYMOUS` viewer işlədir → [tests/e2e/landing.spec.ts](tests/e2e/landing.spec.ts) |

**Memarlıq qeydi.** UI **Server Actions** və Server Component-lər işlədir; `/api/v1` isə
xarici inteqrasiya və sənədləşdirmə üçün REST səthidir. Məntiq **dublikat deyil** — hər
iki səth eyni servis qatını (`src/services/*`) çağırır və məxfilik mühərriki
(`src/lib/visibility.ts`) tək yerdədir. Endpoint-lər sıfır yeni DB sorğusu yazır.

⚠️ v1 qatı UI-dan bir yerdə **daha məhduddur**: üzv olmadığın sinif üçün endpoint 404
qaytarır, səhifə isə boş siyahı göstərir (səbəb `cohort-scope.ts`-dədir).

---

## İşə salma

### 1. Ön şərtlər

- Node.js 20+
- Layihə qovluğu: `qu-class` — **VS Code-da məhz bu qovluğu aç**, `holberton`-u yox.
  `.vscode/` konfiqləri layihə kökündədir; bir səviyyə yuxarıdan açsan F5 işləmir.

### 2. Quraşdırma

```bash
npm install
npx prisma migrate dev        # dev.db yaradır / miqrasiyaları tətbiq edir
npm run db:seed               # demo datası (deterministik — hər dəfə eyni nəticə)
```

`.env` faylı üç dəyər gözləyir:

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<npx auth secret ilə yarat>"
AUTH_TRUST_HOST=true          # `next start` (production) rejimində məcburidir
```

⚠️ `AUTH_TRUST_HOST` olmasa `npm run build && npm start` rejimində giriş
`UntrustedHost` xətası verir (Vercel-də bu bayraq avtomatik qoyulur).

### 3. Terminaldan işə salma

```bash
npm run dev          # http://localhost:3000 (port sabitdir)
npm run db:studio    # Prisma Studio — bazaya baxış
```

`npm run dev` porti 3000-ə **sabitləyir** (`-p 3000`), yəni port məşğuldursa Next
başqa porta keçmir — `EADDRINUSE` ilə sınır. Buna görə `predev` addımı
`scripts/free-port.mjs` işlədir: 3000-i tutan **köhnə dev serveri** avtomatik
dayandırır. Portu başqa proqram tutubsa toxunmur, xəbərdarlıq yazır.

Əl ilə: `npm run free-port`.

### 4. VS Code-da F5

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

### 5. Test hesabları

Hamısının şifrəsi: **`Test1234!`**

| E-poçt | Sistem rolu | Cohort rolu | Mərhələ |
|---|---|---|---|
| `admin@qu.edu.az` | `UNIVERSITY_ADMIN` | `MEMBER` | STUDENT |
| `moderator@qu.edu.az` | `USER` | `CLASS_MODERATOR` | STUDENT |
| `rep@qu.edu.az` | `USER` | `CLASS_REPRESENTATIVE` | STUDENT |
| `coordinator@qu.edu.az` | `USER` | `EVENT_COORDINATOR` | STUDENT |
| `alumni@qu.edu.az` | `USER` | `MEMBER` | ALUMNI |

### 6. Mövcud URL-lər

| URL | Qrup | Nədir |
|---|---|---|
| `/` | `(public)` | **Welcome Page** — 8 bölmə, anonim açılır |
| `/docs` | `(public)` | **Swagger UI** — `/api/v1` sənədi, «Try it out» ilə |
| `/login` · `/register` | `(public)` | Giriş və qeydiyyat |
| `/home` | `(app)` | Əsas sinif səhifəsinə yönləndirir |
| `/class/[slug]` | `(app)` | Class Page (Blok 5-ə qədər placeholder) |
| `/kuds` | `(app)` | **KUDS stil bələdçisi** — daxili sənəd, auth arxasındadır |
| `/admin` | `(admin)` | İdarə paneli — `UNIVERSITY_ADMIN` |

Route qrupları URL-ə təsir etmir: `(app)/kuds/page.tsx` → `/kuds`.
Qalan route-lar blok-blok əlavə olunur (bax [PLAN.md](PLAN.md) §4.2).

**`/api/v1` — 23 endpoint** (tam sənəd: `/docs`):

| Metod | Yol | Auth |
|---|---|---|
| POST | `/api/v1/auth/register` · `/auth/login` · `/auth/logout` | — · — · kuka |
| GET | `/api/v1/auth/session` | anonimdə `data: null` |
| GET | `/api/v1/health` · `/faculties` · `/content/pages` · `/faq` · `/guide-places` | ictimai |
| GET | `/api/v1/cohorts` · `/cohorts/{slug}` | kuka |
| GET | `/cohorts/{slug}/members` (13 filtr) · `/posts` (kursor) · `/timeline` (3 filtr) · `/achievements` · `/events` (6 filtr) | kuka |
| GET | `/cohorts/{slug}/memories` · `/yearbook` · `/support` | kuka |
| GET | `/cohorts/{slug}/stats/where-are-we-now` | kuka (`private, no-store`) |
| GET | `/api/v1/events/{id}` · `/api/v1/search` · `/guide-places/{id}/memories` | ictimai (görünürlüyə görə) |
| GET | `/api/v1/openapi.json` | ictimai |

⚠️ Mövcud `/api/feed`, `/api/search`, `/api/upload`, `/api/events/[id]/ics` **dəyişməyib** —
onları client komponentləri işlədir (`FeedList`, ⌘K palitrası). v1 qatı onların yanındadır.

---

### 🔒 «İndi haradayıq?» — üç məxfilik qərarı

Karyera xəritəsi ([`/class/[slug]/map`](src/app/(app)/class/%5Bslug%5D/map/page.tsx))
sinfin ən həssas səthidir. Üç qərar sənədləşdirilir, çünki müdafiədə soruşulur:

**1. ƏMƏK HAQQI QƏSDƏN YOXDUR.** Nə sxemdə sütun, nə servisdə hesablama, nə
API cavabında sahə var. Səbəb: 14–28 nəfərlik sinifdə **aqreqasiya olunmuş maaş
belə fərdiləşdirilə bilər** — öz rəqəmini bilən bir nəfər ortadan qalanları
çıxarır, iki nəfər isə praktiki olaraq üçüncünü tapır. k-anonimlik bunu HƏLL
ETMİR, çünki problem xananın ölçüsündə deyil, göstəricinin arifmetikasındadır.
Sənəd bunu SÜBUT edir: `WhereAreWeNow` sxemi `additionalProperties: false`-dur
və `openapi.test.ts` sənəddə `salary` / `bonus` sözünün olmadığını yoxlayır.

**2. XƏRİTƏ KOORDİNATI BAZADAN GƏLMİR.** `CareerEntry`-də `latitude` /
`longitude` sütunu yoxdur. Pin **şəhər mərkəzinə** qoyulur
([`src/lib/geo.ts`](src/lib/geo.ts) — statik cədvəl, `prisma` importu yoxdur),
yəni eyni şəhərdəki iki nəfər eyni nöqtədə birləşir. Tanınmayan şəhər pin
YARATMIR — sətir ölkə səviyyəsində sayılır.

**3. GİZLƏTMƏ ÖLÇÜLƏR ARASINDA UZLAŞIR.** Bütün bölgülər TƏK sətir çoxluğu
üzərində, TƏK keçiddə hesablanır və hər ölçü sətirlərin hamısını örtür:
`Σ açıqlanan + açıqlanmayan + bildirilməyən = respondentCount`. Buna görə iki
qrafiki bir-birindən çıxıb qalıq (deməli fərd) almaq mümkün deyil. Şəhər xanası
3 nəfərdən kiçikdirsə sətir ölkə səviyyəsinə yığılır; ölkə də kiçikdirsə
tamamilə «Açıqlanmayan» olur. Alqoritm və ölçülmüş alternativlər
[`src/lib/career-stats.ts`](src/lib/career-stats.ts) başlığındadır.

### 7. E2E testlər

İki ayrı dəst var, çünki biri **istehsal** serverinə, digəri **dev** serverinə
baxır — eyni konfiqdə birləşdirilə bilməzlər.

```bash
# 1) Auth axını — istehsal build-inə qarşı (`next start`, port 3100)
npm run build            # MƏCBURİDİR, `next start` build tələb edir
npm run test:e2e         # tests/e2e/auth.spec.ts — 12 test

# 2) "F5 işləyirmi?" smoke — dev serverə qarşı (`next dev`, port 3000)
npm run test:e2e:dev     # tests/e2e/dev-smoke.spec.ts
```

`test:e2e:dev` F5-in nəticəsini simulyasiya edir: `/` açılır, giriş forması
render olunur, seed hesabı ilə giriş sinif səhifəsinə aparır, `/kuds` açılır və
**brauzer konsolunda xəta olmur**. Dev server artıq işləyirsə ona qoşulur.

İlk dəfə brauzer lazımdır: `npx playwright install chromium`.
Testlər seed edilmiş `prisma/dev.db`-ni oxuyur.

---

## Əmrlər

```bash
npm run dev           # dev server (port 3000) — predev portu azad edir
npm run dev:debug     # dev server + Node inspector (9229)
npm run free-port     # 3000-i tutan köhnə dev serveri dayandır
npm run build         # istehsal build-i
npm run lint          # ESLint
npm run test          # Vitest
npm run test:e2e      # Playwright — auth axını (build tələb edir)
npm run test:e2e:dev  # Playwright — dev smoke ("F5 işləyirmi?")
npm run db:seed       # prisma db seed
npm run db:studio     # Prisma Studio
npm run docs:assets   # Swagger UI aktivlərini public/swagger/-ə köçürür
npx tsc --noEmit      # tip yoxlaması
```

Hər blokun sonunda üçü də təmiz olmalıdır:
`npx tsc --noEmit && npm run lint && npm run build`

---

## Seed datası

`prisma/seed.ts` deterministikdir (seeded PRNG + sabit `NOW` + sabit ID-lər):
təkrar işlədəndə eyni baza alınır. Mətnlər `prisma/seed-data/content.ts`-dədir.

Həcm: 4 fakültə · 10 ixtisas · 6 cohort · 125 istifadəçi · 300 paylaşım ·
80 nailiyyət · 60 xatirə · 25 tədbir · 30 Xankəndi bələdçi yazısı — 28 cədvəlin
hamısı doludur.

⚠️ **Karyera qeydləri QƏSDƏN KÜMƏLƏNİB** (`CAREER_PLACEMENT_PLANS` /
`CAREER_TRACK_PLANS`). Əvvəlki bölgü 15 ölkəyə və 40 şirkətə bərabər səpilirdi;
k-anonimlik eşiyi (3 nəfər) ilə birləşəndə «İndi haradayıq?» panelinin HƏR
xanası gizlənirdi — yəni məxfilik mühərriki işləyirdi, amma nümayiş ediləcək bir
şey qalmırdı. Real məzun axını onsuz da bir-iki mərkəzdə toplaşır. Sətir sayları
DƏYİŞMƏYİB və PRNG axını qorunub (`keepRandomStep`), yəni qalan 27 cədvəl eyni
qalır.

---

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v3.4 · shadcn/ui v2 · Prisma 6 +
SQLite · Auth.js v5 (JWT) · TanStack Query · Recharts · Vitest + Playwright.

Versiyalar kilidlidir — səbəblər [CLAUDE.md](CLAUDE.md)-dədir.
