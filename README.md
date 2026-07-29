# QU CLASS

Qarabağ Universitetinin tələbə və məzun sinif platforması (Holberton School final layihəsi).

Üç mərhələ, eyni səhifə: `INCOMING` → `STUDENT` → `ALUMNI`.
Tam spesifikasiya: [PLAN.md](PLAN.md) · İş qaydaları: [CLAUDE.md](CLAUDE.md) · Dizayn: `/kuds`

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
| `/` | `(public)` | Başlanğıc səhifə |
| `/login` · `/register` | `(public)` | Giriş və qeydiyyat |
| `/home` | `(app)` | Əsas sinif səhifəsinə yönləndirir |
| `/class/[slug]` | `(app)` | Class Page (Blok 5-ə qədər placeholder) |
| `/kuds` | `(app)` | **KUDS stil bələdçisi** — daxili sənəd, auth arxasındadır |
| `/admin` | `(admin)` | İdarə paneli — `UNIVERSITY_ADMIN` |

Route qrupları URL-ə təsir etmir: `(app)/kuds/page.tsx` → `/kuds`.
Qalan route-lar blok-blok əlavə olunur (bax [PLAN.md](PLAN.md) §4.2).

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

---

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v3.4 · shadcn/ui v2 · Prisma 6 +
SQLite · Auth.js v5 (JWT) · TanStack Query · Recharts · Vitest + Playwright.

Versiyalar kilidlidir — səbəblər [CLAUDE.md](CLAUDE.md)-dədir.
