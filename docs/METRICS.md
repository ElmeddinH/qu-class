# QU CLASS — layihənin real rəqəmləri

> 🔴 **Buradakı hər rəqəm əmrlə ölçülüb və hər sətrin yanında ölçmə əmri var.**
> Təxmin, yuvarlaqlaşdırma və «təxminən» yoxdur — uyğunsuzluq görsən əmri işlət
> və sənədi düzəlt.
>
> **Ölçmə tarixi:** `2026-08-05` · **commit:** `test(api): cover mutation error
> mapping and privacy regressions` (Sprint 2, Blok 14B/14C) · **mühit:** Node
> `v24.18.0`, Linux.
>
> Bağlı sənədlər: [`DEMO.md`](DEMO.md) · [`DEFENSE-QA.md`](DEFENSE-QA.md) ·
> [`ARCHITECTURE.md`](ARCHITECTURE.md)

---

## 0. Bir baxışda

| Ölçü | Rəqəm |
|---|---|
| Repo faylı (asılılıqlar və build çıxışı xaric) | **704** |
| TypeScript mənbə faylı (`src/`) | **512** |
| TypeScript sətri (`src/`) | **78 363** |
| — testlərsiz | **69 086** |
| Prisma modeli | **28** |
| Səhifə (`page.tsx`) | **51** |
| REST endpoint (`/api/v1`) | **36** |
| React komponenti (`src/components/`) | **42** |
| Xüsusiyyət modulu (`src/features/*`) | **24** |
| Servis faylı (`src/services/*`) | **23** |
| Vahid + inteqrasiya testi | **1759** (65 fayl) |
| E2E testi | **213** (21 fayl) |
| Commit | **41** |
| Seed sətri (28 cədvəl) | **6323** |

---

## 1. Fayl sayı

### 1.1 Repo — bütün fayllar

```bash
find . -type f \
  -not -path "./node_modules/*" -not -path "./.git/*" \
  -not -path "./.next/*" -not -path "./test-results/*" | wc -l
```

**Nəticə: 704.**

⚠️ `node_modules`, `.git`, `.next` və `test-results` **qəsdən çıxarılıb** —
onlar yazılmış kod deyil (asılılıqlar, tarixçə obyektləri, build çıxışı, test
artefaktları). `prisma/dev.db` sayılır, çünki repo qovluğundadır, amma
`.gitignore`-dadır və commit olunmur.

### 1.2 Uzantı üzrə bölgü

```bash
find . -type f \
  -not -path "./node_modules/*" -not -path "./.git/*" \
  -not -path "./.next/*" -not -path "./test-results/*" \
  | sed -n 's/.*\.\([a-zA-Z0-9]*\)$/\1/p' | sort | uniq -c | sort -rn
```

| Uzantı | Fayl | Nədir |
|---|---|---|
| `.tsx` | 292 | React komponentləri və səhifələr |
| `.ts` | 269 | Servis, lib, tip, konfiq, test, seed |
| `.png` | 272 | Ekran görüntüləri (`docs/screenshots/` 17 · `docs/responsive/` 255) |
| `.md` | 20 | Sənədlər |
| `.json` | 16 | Konfiq + Lighthouse hesabatları |
| `.html` | 10 | Lighthouse HTML hesabatları |
| `.mjs` | 7 | Skriptlər (`scripts/`) |
| `.svg` | 5 | İkon və loqo aktivləri |
| `.sql` | 3 | Prisma miqrasiyaları |
| `.js` | 3 | PostCSS konfiqi + Swagger aktivləri |
| `.css` | 2 | Qlobal stil |
| `.yml` `.tsbuildinfo` `.toml` `.prisma` `.ico` `.cjs` | 1 + 1 + 1 + 1 + 1 + 1 | `docker-compose.yml` · TS build keşi · Lighthouse konfiqi · **sxem** · favicon · saat dondurucusu |
| `.gitignore` `.example` `.env` `.db` | 1 + 1 + 1 + 1 | ⚠️ `.env` və `dev.db` commit **olunmur** — repo qovluğunda var, tarixçədə yox |

---

## 2. Sətir sayı — dil üzrə

### 2.1 TypeScript (`src/`) — əsas ölçü

```bash
# bütün mənbə (testlər daxil)
find src \( -name '*.ts' -o -name '*.tsx' \) | wc -l
find src \( -name '*.ts' -o -name '*.tsx' \) -exec cat {} + | wc -l

# testlərsiz
find src \( -name '*.ts' -o -name '*.tsx' \) ! -name '*.test.ts' ! -name '*.test.tsx' | wc -l
find src \( -name '*.ts' -o -name '*.tsx' \) ! -name '*.test.ts' ! -name '*.test.tsx' -exec cat {} + | wc -l
```

| | Fayl | Sətir |
|---|---|---|
| `src/` — hamısı | **512** | **78 363** |
| `src/` — testlərsiz | **464** | **69 086** |
| `src/` — yalnız testlər | **48** | **9 277** |

🔴 **Mötərizə MƏCBURİDİR.** `find src -name '*.ts' -o -name '*.tsx' -exec cat {} +`
yazsan `-exec` yalnız **ikinci** şərtə bağlanır və nəticə səhv çıxır
(34 851 — yalnız `.tsx`). Bu tələyə düşməmək üçün əmr yuxarıdakı formada
yazılıb.

### 2.2 `src/` daxilində `.ts` və `.tsx` bölgüsü (testlərsiz)

```bash
for x in tsx ts; do
  echo -n "$x: "; find src -name "*.$x" ! -name '*.test.*' | wc -l | tr -d '\n'
  echo -n " fayl / "; find src -name "*.$x" ! -name '*.test.*' -exec cat {} + | wc -l
done
```

| | Fayl | Sətir |
|---|---|---|
| `.tsx` (UI) | 290 | 34 647 |
| `.ts` (servis, lib, tip) | 174 | 34 439 |

**Oxunuş:** UI və məntiq qatı sətir baxımından demək olar bərabərdir — bu,
məxfilik mühərrikinin, servis qatının və enum sisteminin nə qədər yer tutduğunu
göstərir.

### 2.3 Bütün dillər — yekun cədvəl

```bash
# TypeScript (src + tests + prisma + skriptlər)
find src tests prisma scripts \( -name '*.ts' -o -name '*.tsx' \) -exec cat {} + | wc -l
# Test kodu (src + tests)
find src tests \( -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.spec.ts' \) -exec cat {} + | wc -l
# tests/ qovluğu
find tests -name '*.ts' -exec cat {} + | wc -l
# Prisma sxemi
wc -l prisma/schema.prisma
# Seed + skript (prisma/*.ts)
find prisma -name '*.ts' -exec cat {} + | wc -l
# CSS
find src -name '*.css' -exec cat {} + | wc -l
# Markdown sənədləri
find . -name '*.md' -not -path './node_modules/*' -not -path './.next/*' -exec cat {} + | wc -l
# Node skriptləri
find scripts -type f -exec cat {} + | wc -l
```

| Dil / sahə | Fayl | Sətir |
|---|---|---|
| TypeScript — `src/` (testlərsiz) | 464 | **69 086** |
| TypeScript — testlər (`src/` + `tests/`) | 82 | **24 478** |
| TypeScript — `tests/` qovluğu | 36 | 15 331 |
| TypeScript — `prisma/` (seed + seed datası) | 2 | **2 980** |
| Node skriptləri (`scripts/`) | 12 | **3 373** |
| Prisma sxemi | 1 | **818** |
| CSS | 2 | **270** |
| Markdown (sənədlər) | 20 | **8 299** |

⚠️ Markdown rəqəmi **bu faylı da sayır** — sənəd yazıldıqca dəyişir. Yuxarıdakı
əmr həmişə cari dəyəri verir.

---

## 3. Data modeli

```bash
grep -c '^model ' prisma/schema.prisma        # → 28
wc -l prisma/schema.prisma                    # → 818
ls prisma/migrations | grep -v migration_lock | wc -l   # → 3
grep -c '^export const [A-Z_]*_VALUES' src/lib/enums.ts # → 37
```

| Ölçü | Rəqəm |
|---|---|
| Prisma modeli | **28** |
| Sxem sətri | **818** |
| Miqrasiya | **3** |
| Enum ailəsi (`*_VALUES`) | **37** |

⚠️ Sxemdə `enum` açar sözü **yoxdur** — SQLite native enum dəstəkləmir, ona görə
hər enum `String` sütun + Zod validatorudur (`DECISIONS.md` → QD-005).

### 3.1 Seed həcmi — 28 cədvəlin hamısı dolu

```bash
node -e "
const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();
const models=['faculty','program','cohort','cohortMembership','user','fieldVisibility',
'tag','userTag','post','mediaAsset','comment','reaction','timelineEntry','memory',
'achievement','careerEntry','educationEntry','supportOffer','club','clubMembership',
'event','eventRSVP','notification','report','auditLog','contentPage','faq','guidePlace'];
(async()=>{let t=0;for(const m of models){const n=await p[m].count();t+=n;
console.log(String(n).padStart(6)+'  '+m);}console.log(String(t).padStart(6)+'  CƏMİ');
await p.\$disconnect();})();
"
```

| Model | Sətir | Model | Sətir |
|---|---|---|---|
| `Faculty` | 4 | `Achievement` | 80 |
| `Program` | 10 | `CareerEntry` | 68 |
| `Cohort` | 6 | `EducationEntry` | 25 |
| `CohortMembership` | 125 | `SupportOffer` | 40 |
| `User` | **125** | `Club` | 6 |
| `FieldVisibility` | **2750** | `ClubMembership` | 103 |
| `Tag` | 40 | `Event` | 25 |
| `UserTag` | 765 | `EventRSVP` | 487 |
| `Post` | 300 | `Notification` | 208 |
| `MediaAsset` | 246 | `Report` | 12 |
| `Comment` | 150 | `AuditLog` | 46 |
| `Reaction` | 400 | `ContentPage` | 14 |
| `TimelineEntry` | 178 | `Faq` | 20 |
| `Memory` | 60 | `GuidePlace` | 30 |
| | | **CƏMİ** | **6323** |

🔴 Seed **deterministikdir** (sabit PRNG + sabit `NOW` + sabit ID-lər) — təkrar
işlədəndə eyni rəqəmlər alınır. Rəqəm uyğun gəlmirsə `npx prisma db seed` işlət.

⚠️ `FieldVisibility` = 2750 sətir, yəni **125 istifadəçi × 22 sahə**. Məxfilik
mühərrikinin data ayağı budur.

---

## 4. Səhifə, endpoint, komponent

```bash
find src/app -name 'page.tsx' | wc -l                    # → 51
find src/app -name 'route.ts' | wc -l                    # → 42
find src/app/api/v1 -name 'route.ts' | wc -l             # → 36
grep -rhoE "export (async )?(function|const) (GET|POST|PATCH|PUT|DELETE)" \
  src/app/api/v1 --include=route.ts | awk '{print $NF}' | sort | uniq -c
grep -c 'method:' src/lib/api/openapi.ts                 # → 47
find src/components -name '*.tsx' ! -name '*.test.tsx' | wc -l   # → 42
ls -d src/features/*/ | wc -l                            # → 24
ls src/services/*.ts | grep -v '\.test\.' | wc -l        # → 23
grep -rl '"use server"' src/features | wc -l             # → 14
```

| Ölçü | Rəqəm | Qeyd |
|---|---|---|
| Səhifə (`page.tsx`) | **51** | `(public)` + `(app)` + `(admin)` |
| Route handler — hamısı | **42** | `/api/v1` (36) + köhnə `/api/*` (6) |
| REST endpoint — `/api/v1` | **36** | route.ts fayl sayı (sənədin özü daxil) |
| REST əməliyyat (metod) — `/api/v1` | **44** | 30 `GET` + 9 `POST` + 3 `PATCH` + 3 `DELETE` — bax method bölgüsü yuxarıda |
| OpenAPI-də sənədləşən əməliyyat — CƏMİ | **47** | 44 (v1) + 3 (v1-dən kənar: `uploadMedia` × GET/POST + `downloadEventIcs`); `openapi.json`-un özü sxemdə sadalanmır |
| Server Action faylı | **14** | `"use server"` daşıyan modul |
| Komponent (`src/components/`) | **42** | bölgü aşağıda |
| Xüsusiyyət modulu (`src/features/*`) | **24** | KUDS §20-nin `pages/` qatı |
| Servis faylı (`src/services/*`) | **23** | **yeganə** Prisma girişi |

⚠️ **Sprint 2 (Blok 14B/14C)** paylaşım/xatirə/tədbirə yazma səthi əlavə etdi:
`POST /cohorts/{slug}/{posts,memories,events}` + `GET/PATCH/DELETE
/{posts,memories,events}/{id}`. Əvvəl 34 route / 33 əməliyyat idi — route sayı
+2 (`/posts/{id}`, `/memories/{id}` yeni yollar; `/events/{id}` artıq var idi,
metod əlavə olundu), əməliyyat sayı isə çoxmetodlu yolların hesabına +11 (v1) artdı.

### 4.1 Komponent bölgüsü

```bash
for d in ui kuds shared; do
  echo -n "$d: "; find src/components/$d -name '*.tsx' ! -name '*.test.tsx' | wc -l
done
```

| Qovluq | Fayl | Nədir |
|---|---|---|
| `components/ui/` | **27** | shadcn/ui primitivləri — 🔴 **toxunulmaz** |
| `components/shared/` | **14** | `StatCard`, `EmptyState`, `VisibilityBadge`, `PagerNav`… |
| `components/kuds/` | **1** | KUDS wrapper-i (`SectionCard`) |
| **Cəmi** | **42** | |

⚠️ Səhifə komponentləri bu saya **daxil deyil** — onlar `src/features/*`
altındadır (290 `.tsx` faylının böyük hissəsi).

---

## 5. Testlər

```bash
npm run test                       # Vitest — 1773 test / 66 fayl (≈47 san)
npx playwright test --list | tail -1                                   # → 216 / 22
npx playwright test --config playwright.dev.config.ts --list | tail -1 # → 1 / 1
find src tests \( -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.spec.ts' \) | wc -l
ls tests/integration/*.ts | wc -l  # → 16
```

| Dəst | Test | Fayl | Əmr |
|---|---|---|---|
| Vahid + inteqrasiya (Vitest) | **1773** | **66** | `npm run test` |
| E2E — istehsal build-i (Playwright) | **216** | **22** | `npm run build && npm run test:e2e` |
| E2E — dev smoke («F5 işləyirmi?») | **1** | **1** | `npm run test:e2e:dev` |
| **E2E cəmi** | **213** | **21** | |
| Test faylı — hamısı | | **86** | |
| Real bazaya qarşı işləyən inteqrasiya faylı | | **16** | `tests/integration/` |

**Ölçülmüş icra müddəti:** `npm run test` → **46.1 saniyə** (65 fayl, 1759 test,
hamısı keçir).

⚠️ **Sprint 2:** `tests/integration/posts-crud.db.test.ts` (Blok 14B — paylaşım
mutasiya xəta xəritələməsi və məxfilik reqressiyaları) yeni əlavə olundu.
`tests/e2e/api-docs.spec.ts`-dəki sabit əməliyyat sayı gözləməsi (33) bu
Sprint-ə qədər yenilənməmişdi — indi 47-yə düzəldildi (bax `STATE.md` →
"Sprint 2 — Blok 14B/14C").

### 5.1 Kritik testlərdə test sayı

```bash
for f in tests/integration/visibility.db.test.ts src/lib/career-stats.test.ts \
         tests/integration/profile.db.test.ts src/features/feed/fanout.test.ts \
         src/lib/api/openapi.test.ts src/lib/visibility.test.ts; do
  echo "$(grep -cE '\bit\(|\btest\(' $f) $f"
done
```

| Fayl | Test |
|---|---|
| `src/lib/visibility.test.ts` | 50 |
| `src/features/feed/fanout.test.ts` | 40 |
| `src/lib/career-stats.test.ts` | 30 |
| `src/lib/api/openapi.test.ts` | 25 |
| `tests/integration/visibility.db.test.ts` | 25 |
| `tests/integration/profile.db.test.ts` | 20 |

---

## 6. Commit tarixçəsi

```bash
npm run git:log            # son sətir: "N commit."
npm run git:log | tail -1
```

**Nəticə: 41 commit.**

⚠️ Layihə mühitində **`git` binarı yoxdur** — commit-lər `isomorphic-git` ilə
yazılır (`scripts/git.mjs`), amma nəticə standart `.git` qovluğudur və
`git log` / `git clone` ilə tam uyğundur (`DECISIONS.md` → QD-017). `git`
quraşdırılmış maşında eyni rəqəm belə alınır:

```bash
git rev-list --count HEAD
```

**Sızma auditi** (`npm run git:audit`, son icra `2026-07-31`):

| Ölçü | Rəqəm |
|---|---|
| Gəzilən commit | 33 |
| Unikal blob | 871 |
| Bloklayan tapıntı | **0** |
| Xəbərdarlıq | **0** |

Hesabat: [`git-audit-report.md`](git-audit-report.md).

---

## 7. Keyfiyyət ölçmələri

```bash
npm run audit:lighthouse   # → docs/lighthouse/
npm run audit:responsive   # → docs/responsive/report.md
npm run test:e2e -- a11y   # axe — 12 səhifə × 2 vəziyyət
npx tsc --noEmit && npm run lint && npm run build
```

| Ölçü | Nəticə | Mənbə |
|---|---|---|
| Lighthouse **desktop** — 5 səhifə | **100 / 100 / 100 / 100** | `docs/quality-report-12c.md` §2.1 |
| Lighthouse **mobil** (yavaş 4G + 4× CPU) | 87–94 Performance | §2.2 |
| WCAG 2.2 AA — axe, 12 səhifə × 2 vəziyyət | pozuntu yoxdur | `tests/e2e/a11y.spec.ts` |
| Toxunma hədəfi — 24px qapısı (SC 2.5.8) | sıfır tapıntı | §3.2 |
| Üfüqi sürüşmə — 5 breakpoint × 10 səhifə | sıfır | §3.1 |
| Tip yoxlaması · lint · build | üçü də təmiz | `npx tsc --noEmit && npm run lint && npm run build` |

---

## 8. Rəqəmləri bir əmrlə təkrar ölçmək

Aşağıdakı blok bütün əsas rəqəmləri ardıcıl yazır — sənədi yeniləməzdən əvvəl
bunu işlət:

```bash
cd qu-class
echo "repo faylı:      $(find . -type f -not -path './node_modules/*' -not -path './.git/*' -not -path './.next/*' -not -path './test-results/*' | wc -l)"
echo "src faylı:       $(find src \( -name '*.ts' -o -name '*.tsx' \) | wc -l)"
echo "src sətri:       $(find src \( -name '*.ts' -o -name '*.tsx' \) -exec cat {} + | wc -l)"
echo "src (testsiz):   $(find src \( -name '*.ts' -o -name '*.tsx' \) ! -name '*.test.ts' ! -name '*.test.tsx' -exec cat {} + | wc -l)"
echo "model:           $(grep -c '^model ' prisma/schema.prisma)"
echo "səhifə:          $(find src/app -name 'page.tsx' | wc -l)"
echo "v1 endpoint:     $(find src/app/api/v1 -name 'route.ts' | wc -l)"
echo "komponent:       $(find src/components -name '*.tsx' ! -name '*.test.tsx' | wc -l)"
echo "feature modulu:  $(ls -d src/features/*/ | wc -l)"
echo "servis:          $(ls src/services/*.ts | grep -v '\.test\.' | wc -l)"
echo "test faylı:      $(find src tests \( -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.spec.ts' \) | wc -l)"
npm run git:log | tail -1
npm run test 2>&1 | grep -E 'Test Files|Tests'
npx playwright test --list 2>&1 | tail -1
```

---

## 9. Nəyi ÖLÇMÜRÜK — və niyə

Bunlar qəsdən yazılmayıb, çünki ya yanıldıcıdır, ya da təkrar ölçülə bilmir.

| Ölçü | Niyə yoxdur |
|---|---|
| **Test örtüyü faizi (coverage %)** | Ölçülməyib. Uydurulmuş faiz yazmaqdansa **hansı yolun testlə örtüldüyünü** göstərmək dürüstdür — `DEFENSE-QA.md` S21 |
| **«İş saatı» / effort** | `PLAN.md` §2-də **planlanmış** büdcə var, faktiki sərf ölçülməyib |
| **`node_modules` sətirləri** | Yazılmış kod deyil |
| **Build çıxışı (`.next/`) ölçüsü** | Next.js versiyasından və mühitdən asılıdır; təkrar ölçüldükdə fərqlənir |
| **Kod keyfiyyəti balı** (SonarQube və s.) | Alət qurulmayıb. Əvəzinə: `npx tsc --noEmit` + `npm run lint` **sıfır xəta** ilə keçir |
