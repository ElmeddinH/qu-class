# QU CLASS — layihənin real rəqəmləri

> 🔴 **Buradakı hər rəqəm əmrlə ölçülüb və hər sətrin yanında ölçmə əmri var.**
> Təxmin, yuvarlaqlaşdırma və «təxminən» yoxdur — uyğunsuzluq görsən əmri işlət
> və sənədi düzəlt.
>
> **Ölçmə tarixi:** `2026-08-18` · **blok:** 12F (müdafiə və təhvil) ·
> **mühit:** Node `v24.18.0`, Linux.
>
> 🔴 **BU FAYL RƏQƏMLƏRİN MƏRKƏZİDİR.** Digər sənədlər rəqəmi TƏKRARLAMAQ
> əvəzinə buraya istinad edir. Səbəb 12F-də üzə çıxdı: eyni rəqəm altı sənəddə
> yazılmışdı, blok 12A–12C onların bir hissəsini dəyişdi və sənədlər
> bir-birini təkzib etməyə başladı. İndi tək mənbə budur — README-də yalnız
> bir neçə əsas rəqəm qalır, qalanı burada.
>
> Bağlı sənədlər: [`DEMO.md`](DEMO.md) · [`DEFENSE-QA.md`](DEFENSE-QA.md) ·
> [`ARCHITECTURE.md`](ARCHITECTURE.md)

---

## 0. Bir baxışda

| Ölçü | Rəqəm |
|---|---|
| Repo faylı (asılılıqlar və build çıxışı xaric) | **952** |
| TypeScript mənbə faylı (`src/`) | **539** |
| TypeScript sətri (`src/`) | **82 749** |
| — testlərsiz | **72 414** |
| Prisma modeli | **28** |
| Səhifə (`page.tsx`) | **51** |
| REST endpoint (`/api/v1`) | **36** |
| Build çıxışındakı route | **97** (3 statik + 94 dinamik) |
| React komponenti (`src/components/`) | **42** |
| Xüsusiyyət modulu (`src/features/*`) | **24** |
| Servis faylı (`src/services/*`) | **24** |
| Vahid + inteqrasiya testi | **1844** (68 fayl) |
| E2E testi | **220** (22 fayl) |
| Commit | **54** |
| Seed sətri (28 cədvəl) | **6323** |

---

## 1. Fayl sayı

### 1.1 Repo — bütün fayllar

```bash
find . -type f \
  -not -path "./node_modules/*" -not -path "./.git/*" \
  -not -path "./.next/*" -not -path "./test-results/*" | wc -l
```

**Nəticə: 952.**

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
| `.tsx` | 307 | React komponentləri və səhifələr |
| `.ts` | 288 | Servis, lib, tip, konfiq, test, seed |
| `.png` | 272 | Ekran görüntüləri (`docs/screenshots/` 17 · `docs/responsive/` 255) |
| `.md` | 21 | Sənədlər |
| `.json` | 17 | Konfiq + Lighthouse hesabatları + `docs/openapi.json` |
| `.html` | 10 | Lighthouse HTML hesabatları |
| `.mjs` | 8 | Skriptlər (`scripts/`) |
| `.svg` | 5 | İkon və loqo aktivləri |
| `.sql` | 3 | Prisma miqrasiyaları |
| `.js` | 3 | PostCSS konfiqi + Swagger aktivləri |
| `.toml` | 2 | `fly.toml` · Lighthouse konfiqi |
| `.css` | 2 | Qlobal stil + Swagger UI aktivi |
| `.gif` | 1 | **`docs/media/demo.gif`** — README demosu (Blok 12F) |
| `.sh` `.yml` `.tsbuildinfo` `.prisma` `.ico` `.cjs` | 1 hər biri | `docker-entrypoint.sh` · `docker-compose.yml` · TS build keşi · **sxem** · favicon · saat dondurucusu |
| `.gitignore` `.example` `.env` `.local` `.db` | 1 hər biri | ⚠️ `.env`, `.env.local` və `dev.db` commit **olunmur** — repo qovluğunda var, tarixçədə yox |

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
| `src/` — hamısı | **539** | **82 749** |
| `src/` — testlərsiz | **488** | **72 414** |
| `src/` — yalnız testlər | **51** | **10 335** |

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
| `.tsx` (UI) | 305 | 35 445 |
| `.ts` (servis, lib, tip) | 183 | 36 969 |

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
| TypeScript — `src/` (testlərsiz) | 488 | **72 414** |
| TypeScript — testlər (`src/` + `tests/`) | 90 | **28 015** |
| TypeScript — `tests/` qovluğu | 41 | 17 810 |
| TypeScript — `prisma/` (seed + seed datası) | 2 | **2 980** |
| Node skriptləri (`scripts/`) | 15 | **4 328** |
| Prisma sxemi | 1 | **832** |
| CSS (`src/`) | 1 | **270** |
| Markdown (sənədlər) | 21 | **10 713** |

⚠️ Markdown rəqəmi **bu faylı da sayır** — sənəd yazıldıqca dəyişir. Yuxarıdakı
əmr həmişə cari dəyəri verir.

---

## 3. Data modeli

```bash
grep -c '^model ' prisma/schema.prisma        # → 28
wc -l prisma/schema.prisma                    # → 832
ls prisma/migrations | grep -v migration_lock | wc -l   # → 3
grep -c '^export const [A-Z_]*_VALUES' src/lib/enums.ts # → 37
```

| Ölçü | Rəqəm |
|---|---|
| Prisma modeli | **28** |
| Sxem sətri | **832** |
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
find src/app -name 'route.ts' | wc -l                    # → 43
find src/app/api/v1 -name 'route.ts' | wc -l             # → 36
grep -rhoE "export (async )?(function|const) (GET|POST|PATCH|PUT|DELETE)" \
  src/app/api/v1 --include=route.ts | awk '{print $NF}' | sort | uniq -c
grep -c 'method:' src/lib/api/openapi.ts                 # → 48
npm run docs:openapi                                     # → 38 path / 48 operation
find src/components -name '*.tsx' ! -name '*.test.tsx' | wc -l   # → 42
ls -d src/features/*/ | wc -l                            # → 24
ls src/services/*.ts | grep -v '\.test\.' | wc -l        # → 24
grep -rl '"use server"' src/features | wc -l             # → 14
```

| Ölçü | Rəqəm | Qeyd |
|---|---|---|
| Səhifə (`page.tsx`) | **51** | `(public)` + `(app)` + `(admin)` |
| Route handler — hamısı | **43** | `/api/v1` (36) + `/api/*` və auth (7) |
| REST endpoint — `/api/v1` | **36** | route.ts fayl sayı (sənədin özü daxil) |
| REST əməliyyat (metod) — `/api/v1` | **45** | 30 `GET` + 9 `POST` + 3 `PATCH` + 3 `DELETE` |
| Kod səviyyəsində HTTP əməliyyat — `src/app/api` | **53** | 51 birbaşa ixrac + **2 destrukturlaşdırılmış** (aşağı) |
| `docs/openapi.json` — path / əməliyyat | **38 / 48** | `npm run docs:openapi` çıxışı |
| Build çıxışındakı route | **97** | 3 statik (○) + 94 dinamik (ƒ) |
| Server Action faylı | **14** | `"use server"` daşıyan modul |
| Komponent (`src/components/`) | **42** | bölgü aşağıda |
| Xüsusiyyət modulu (`src/features/*`) | **24** | KUDS §20-nin `pages/` qatı |
| Servis faylı (`src/services/*`) | **24** | **yeganə** Prisma girişi |

⚠️ **Üç fərqli «endpoint sayı» var və qarışdırılmamalıdır** — 12F-də sənədlərdə
məhz bu üçü bir-birinə qarışmışdı:
> · **53** = `src/app/api` altında kodda mövcud HTTP əməliyyat
> · **48** = `docs/openapi.json`-da sənədləşən əməliyyat (+ 5 ağ siyahıda = 53)
> · **97** = Next build çıxışındakı route sətri (səhifələr də daxil)

🔴 **GREP TƏLƏSİ — bu rəqəmi əl ilə saymağa çalışan hər kəs 51 alır.**
`src/app/api/auth/[...nextauth]/route.ts` handler-ləri **destrukturlaşdırma** ilə
ixrac edir:

```ts
export const { GET, POST } = handlers;   // ← `export const GET` DEYİL
```

Yəni `grep -E 'export (async function|function|const) (GET|POST|…)'` bu iki
əməliyyatı **görmür**. Doğru cəm **51 + 2 = 53**-dür və `src/lib/api/openapi.test.ts`
ağ siyahısı da məhz 5 əməliyyat sayır (`/api/feed`, `/api/search`,
`/api/session/expired`, `/api/auth/[...nextauth]` × GET + POST).

⚠️ `src/app/uploads/[...path]/route.ts` bu saya **daxil deyil** — `src/app/api`
ağacından kənardadır və API müqaviləsi deyil (volume-dakı şəkilləri verən
statik fayl xidməti, QD-018).

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
npm run test                       # Vitest — 1844 test / 68 fayl (≈48 san)
npx playwright test --list | tail -1                                   # → 220 / 22
npx playwright test --config playwright.dev.config.ts --list | tail -1 # → 1 / 1
find src tests \( -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.spec.ts' \) | wc -l
ls tests/integration/*.ts | wc -l  # → 16
```

| Dəst | Test | Fayl | Əmr |
|---|---|---|---|
| Vahid + inteqrasiya (Vitest) | **1844** | **68** | `npm run test` |
| E2E — istehsal build-i (Playwright) | **220** | **22** | `npm run build && npm run test:e2e` |
| E2E — dev smoke («F5 işləyirmi?») | **1** | **1** | `npm run test:e2e:dev` |
| Test faylı — hamısı | | **90** | |
| Real bazaya qarşı işləyən inteqrasiya faylı | | **16** | `tests/integration/` |

⚠️ **«E2E cəmi» sətri SİLİNDİ.** Əvvəl orada 213 / 21 yazılırdı, halbuki
yuxarıdakı iki sətrin cəmi 217 / 23 edirdi — sətir nə cəm, nə də ayrıca ölçmə
idi. Dev smoke AYRI konfiqdədir (`playwright.dev.config.ts`) və əsas dəstlə
birlikdə işlədilmir; ona görə iki rəqəm ayrı saxlanılır.

**Ölçülmüş icra müddəti:** `npm run test` → **48.4 saniyə** (68 fayl, 1844 test,
hamısı keçir) · `npm run test:e2e` → **8.2 dəqiqə** (220 test, `workers: 1`).

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
| `src/lib/api/openapi.test.ts` | 55 |
| `tests/integration/visibility.db.test.ts` | 25 |
| `tests/integration/profile.db.test.ts` | 20 |

---

## 6. Commit tarixçəsi

```bash
npm run git:log            # son sətir: "N commit."
npm run git:log | tail -1
```

**Nəticə: 54 commit.**

⚠️ Layihə mühitində **`git` binarı yoxdur** — commit-lər `isomorphic-git` ilə
yazılır (`scripts/git.mjs`), amma nəticə standart `.git` qovluğudur və
`git log` / `git clone` ilə tam uyğundur (`DECISIONS.md` → QD-017). `git`
quraşdırılmış maşında eyni rəqəm belə alınır:

```bash
git rev-list --count HEAD
```

**Sızma auditi** (`npm run git:audit`, son icra `2026-08-18`):

| Ölçü | Rəqəm |
|---|---|
| Gəzilən commit | 51 |
| Unikal yol | 675 |
| Unikal blob | 1057 |
| İndeksdə izlənən fayl | 669 |
| Ən böyük blob | 7.15 MB (`docs/media/demo.gif`) |
| Bloklayan tapıntı | **0** |
| Xəbərdarlıq | **0** |

⚠️ **Bu cədvəl auditin İŞLƏDİLDİYİ ANI göstərir** — yəni Blok 12F-in öz
commit-lərindən ƏVVƏLKİ vəziyyəti. Audit hər dəfə `docs/git-audit-report.md`-i
yenidən yazır, ona görə **canlı rəqəm həmişə həmin hesabatdadır**; buradakı
sətir onun surətidir və hər commit-dən sonra bir addım geridə qalır. Cari dəyər
üçün `npm run git:audit` işlət — sənədi «düzəltmək» üçün sonsuz təqib lazım
deyil, mənbə hesabatdır.

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
| Donut — bitişik dilim kontrastı (2·4·6 dilim) | **≥ 3:1** | `docs/quality-report-12c.md` §6 |
| Lighthouse **mobil** (yavaş 4G + 4× CPU) | **85–91** Performance (ən aşağı: `/admin`) | `docs/lighthouse/mobile/README.md` |
| WCAG 2.2 AA — axe, 12 səhifə × 2 vəziyyət | pozuntu yoxdur | `tests/e2e/a11y.spec.ts` |
| Toxunma hədəfi — 24px qapısı (SC 2.5.8) | sıfır tapıntı | §3.2 |
| Üfüqi sürüşmə — **51 səhifə × 5 breakpoint = 255 yoxlama** | sıfır | `tests/e2e/responsive.spec.ts` |
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
echo "route.ts:        $(find src/app -name 'route.ts' | wc -l)"
# ⚠️ bu grep 51 verir — `[...nextauth]` destrukturlaşdırmasını GÖRMÜR (+2 = 53)
echo "kod HTTP op:     $(grep -rhoE 'export (async function|function|const) (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b' src/app/api --include=route.ts | wc -l)"
npm run docs:openapi | tail -1          # → "38 path / 48 operation"
npm run git:log | tail -1
npm run test 2>&1 | grep -E 'Test Files|Tests'
npx playwright test --list 2>&1 | tail -1
npm run build 2>&1 | grep -cE '^[├└│]?[[:space:]]*[○ƒ●][[:space:]]'   # → build route sayı
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
