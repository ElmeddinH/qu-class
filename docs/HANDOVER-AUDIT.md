# Təhvil auditi — Sprint 3 / Sprint 4 müstəqil yoxlaması

> **Metod.** Bu sənəd əvvəlki heç bir hesabata istinad etmir. Hər hökm ya
> `fayl:sətir`, ya da bu audit zamanı **işlədilmiş əmrin çıxışıdır**. Kritik
> qoruyucular **qəsdən sındırılıb** (mutasiya sınağı, §3) — testin yaşıl olması
> deyil, **qırıla bilməsi** sübut sayılıb.
>
> **Auditin anı:** HEAD = `e9f9796` · 52 commit · işlək ağac təmiz ·
> `origin/main` HEAD ilə eynidir.

---

## 1. Yekun hökm

| Sprint | Hökm |
|---|---|
| **Sprint 3** | 🔴 **QƏBUL OLUNMUR** |
| **Sprint 4** | 🔴 **QƏBUL OLUNMUR** |

**Səbəb — hər ikisi üçün eynidir və texniki keyfiyyətlə bağlı DEYİL.** Kod
tərəfi güclüdür: 1833 vahid testi, istehsal build-inə qarşı işləyən 220 e2e
testi, sıfır tip/lint xətası, təmiz tarixçə və — bu auditin əsas tapıntısı —
altı kritik qoruyucunun **altısı da** qəsdən sındırılanda qırıldı, yəni testlər
yalançı yaşıl deyil. Lakin hər iki sprintin mərkəzi meyarı **«deploy
edilmişdir»** deyir və `qu-class.fly.dev` üçün **DNS qeydi ümumiyyətlə yoxdur**
(§5). Deploy Sprint 3-də 3 meyarın (2, 3, 7), Sprint 4-də 2 meyarın (5, 8)
qapısıdır. Artefaktlar hazırdır (`Dockerfile`, `fly.toml`, `scripts/deploy.mjs`
— quru icra keçir), amma meyar «hazırdır» yox, «edilmişdir» deyir. Bundan başqa
Sprint 4 üçün bir funksional boşluq qalır: **şifrə bərpası axını yoxdur** (§6).

**Bloklayıcının həcmi kiçikdir:** `FLY_API_TOKEN` verilsə deploy + canlı
yoxlama ~1.5 saatdır (§7). Yəni hökm «layihə zəifdir» demək deyil — «meyarın
tələb etdiyi son addım atılmayıb» deməkdir.

---

## 2. Baza vəziyyəti — ölçülmüş rəqəmlər

Hamısı bu audit zamanı işlədilib:

| Əmr | Nəticə |
|---|---|
| `npx tsc --noEmit` | **0 xəta** (exit 0) |
| `npm run lint` | **0 xəbərdarlıq** (exit 0) |
| `npm run build` | **uğurlu** (exit 0) |
| `npx vitest run` | **1833 test / 67 fayl — hamısı keçdi** (62.21 s) |
| `npm run test:e2e` | **220 test / 22 fayl — hamısı keçdi** (6.4 dəq) |
| `npm run git:audit` | **52 commit · 675 yol · 1060 blob · 669 izlənən fayl · 🔴 0 · ⚠️ 0** |

**Git vəziyyəti:** `git status --porcelain` → boş (təmiz) ·
`git rev-list --count HEAD` → **52** ·
`refs/heads/main` = `refs/remotes/origin/main` = `e9f9796` (uzaq ref HEAD ilə
eynidir) · `refs/tags/v1.0.0` = `fcd3efd`.

**Ölçü nöqtələri:** `find src/app -name page.tsx | wc -l` → **51** ·
`find src/app/api -name route.ts | wc -l` → **42** · `docs/openapi.json`-da
**48 əməliyyat, onlardan 45-i `/api/v1`**.

---

## 3. 🔴 MUTASİYA SINAĞI — bu auditin əsl dəyəri

Hər qoruyucu qəsdən sındırıldı, testin **qırmızıya düşdüyü** görüldü, sonra
geri qaytarıldı. **Nəticə: 6 qoruyucudan 6-sı HƏQİQƏTƏN işləyir. Yalançı yaşıl
TAPILMADI.**

| # | Qoruyucu | Mutasiya | Test qırıldı? | Qıran test |
|---|---|---|---|---|
| **a** | OpenAPI gəzicisi | `src/app/api/v1/__mutation__/route.ts` yaradıldı (sadə GET) | ✅ **BƏLİ** | `BÜTÜN api route-larının AĞ SİYAHISI > /api/v1/__mutation__ — sənəddədir YA DA ağ siyahıda səbəblə yazılıb` (`src/lib/api/openapi.test.ts:909`) |
| **b** | OpenAPI drift snapshot-u | `docs/openapi.json` → `info.title` = `"QU CLASS API MUTATED"` | ✅ **BƏLİ** | `docs/openapi.json drift qoruyucusu` (`src/lib/api/openapi.test.ts:964`) |
| **c** | Məxfilik mühərriki | `activeVisibleWhere(viewer, "authorId")` `visiblePostWhere`-dən silindi (`src/services/post.service.ts:275`) | ✅ **BƏLİ** | **12 test / 4 fayl** — aşağıda |
| **d** | `coverUrl` idarə olunan sahədir | `"coverUrl"` `SCALAR_PROFILE_FIELDS`-dən silindi (`src/lib/visibility.ts:353`) | ✅ **BƏLİ** | **7 test / 3 fayl** — aşağıda |
| **e** | Responsive qoruyucusu | `/mission`-a `w-[2000px]` element əlavə olundu | ✅ **BƏLİ** | `ictimai səhifələr beş breakpoint-də sürüşmür` — **yatay sürüşmə 1641 px** (`tests/e2e/responsive.spec.ts:253`) |
| **f** | Status kodu qoruyucusu (TƏLƏ A) | `src/app/(public)/legal/[slug]/loading.tsx` əlavə olundu | ✅ **BƏLİ** | `naməlum hüquqi slug 404 verir` — **200 alındı, 404 gözlənilirdi** (`tests/e2e/public.spec.ts:443`) |

### 3.a — Gəzicinin kor nöqtəsi HƏQİQƏTƏN bağlıdır

12C-nin iddiası doğrudur. Sənədə salınmamış yeni `/api/v1` route dərhal tutulur
və xəta mesajı müəllifə iki düzgün yolu göstərir (sənədə sal · səbəblə ağ
siyahıya yaz). Əlavə olaraq `openapi.test.ts:871` **filtrin geri qayıtmasını**
ayrıca tutur (`v1Discovered.length > 30` şərti) — yəni kimsə `/api/v1`-i yenidən
istisna etsə, ağ siyahı testi səssizcə boşalmır, ayrı bir test dayanır. Bu,
qoruyucunun özünü qoruyan nadir nümunəsidir.

### 3.c — Məxfilik: sındırılanda qırılan 12 test

```
tests/integration/visibility.db.test.ts   5 fail
  · listFeed(ANONYMOUS) > PUBLIC olmayan HEÇ BİR post qaytarmır
  · listFeed(ANONYMOUS) > dəqiq olaraq ACTIVE + PUBLIC postların hamısını qaytarır
  · listFeed(fərqli cohort üzvü) > başqa sinfin CLASS postlarını QAYTARMIR
  · listFeed(fərqli cohort üzvü) > başqasının PRIVATE postunu HEÇ VAXT qaytarmır
  · listFeed(fərqli cohort üzvü) > UNIVERSITY_ADMIN də başqa sinfin CLASS postunu GÖRMÜR
tests/integration/posts-crud.db.test.ts   5 fail  (404-ün 403-ə çevrilməməsi daxil)
tests/integration/admin.db.test.ts        1 fail  (TƏLƏ A — admin PRIVATE paylaşımı listFeed-də görmür)
tests/integration/directory.db.test.ts    1 fail  (anonim axtarışda yalnız PUBLIC)
```

Bu, məxfiliyin **DB sorğusunda** ölçüldüyünü sübut edir — JS-də filtrləmə
olsaydı bu testlərin çoxu yaşıl qalardı.

### 3.d — `coverUrl` həqiqətən idarə olunan sahədir

Sındırılanda qırılanlar: `tests/integration/cover-privacy.db.test.ts` (4 test —
`CONTROLLED_PROFILE_FIELDS` üzvlüyü, CLASS defolt, PUBLIC/CLASS redaksiyası,
**`avatarUrl`-dən asılı olmama**), `src/lib/visibility.test.ts` (bölmə əhatəsi),
`src/features/profile/schemas.test.ts` (22 sahə sayı). Yəni 12B-nin «banner
artıq ayrıca idarə olunur» iddiası **testlə bağlanıb**, yalnız sənəddə deyil.

### 3.f — 12B-nin A/B bölgüsü sənəddə DEYİL, TESTDƏ var

Bu ən şübhə doğuran iddia idi və **təsdiqləndi**. `notFound()` çağıran seqmentə
`loading.tsx` qoyulanda cavab 404-dən **200-ə** düşdü və e2e testi dərhal
qırıldı. Bölgü kodda da görünür: mövcud 13 `loading.tsx`-dən ikisi qəsdən
`(index)` route qrupundadır — `khankendi/(index)/loading.tsx` və
`faculties/(index)/loading.tsx` — məhz ona görə ki, qonşu `[id]`/`[slug]`
seqmentləri `notFound()` çağıra bilir.

### 🔴 Geri qaytarma təsdiqi

```
git status --porcelain   → boş
git diff --stat          → boş
git rev-parse HEAD       → e9f9796c64d238414ad71e26e206553320eeb1ac  (dəyişməyib)
npx vitest run           → 1833 passed (67 fayl)   ← mutasiyalardan SONRA
```

Heç bir mutasiya commit edilməyib.

---

## 4. Sprint 3 — meyar-meyar hökm

| # | Meyar | Hökm | Sübut |
|---|---|---|---|
| 1 | Minimum 75% tamamlanmışdır | ✅ **tam** | 51 `page.tsx`, 42 route faylı, 17/17 modul. Ölçmə: `find src/app -name page.tsx \| wc -l` → 51 |
| 2 | Uğurla deploy edilmişdir | ❌ **yox** | `getent hosts qu-class.fly.dev` → **DNS qeydi yoxdur**; `curl` → `(6) Could not resolve host`. Şəbəkə işləkdir (nəzarət: `fly.io` → 200, `github.com` → 200) |
| 3 | Frontend və Backend canlı mühitdə işləyir | ❌ **yox** | 2-nin nəticəsi. `flyctl auth whoami` → `no access token available` — tətbiq heç yaradılmayıb |
| 4 | Əsas axınlar problemsiz icra olunur | ⚠️ **qismən** | **Lokalda tam sübut var:** 220 e2e testi `next start` (istehsal build-i) üzərində keçir. **Canlı mühitdə ölçülməyib** — mühit yoxdur |
| 5 | Swagger sənədləşməsi tam yenilənmişdir | ✅ **tam** *(əvvəl ⚠️)* | **Fərq artefaktı:** `4e693de` gəzicidəki `/api/v1` istisnasını sildi. Mutasiya (a) ilə **sübut edildi**: sənədə salınmamış v1 route indi testi qırır. 42 route faylının hamısı ya sənəddə, ya səbəbli ağ siyahıdadır |
| 6 | Responsive dizayn işləyir | ✅ **tam** | Mutasiya (e) ilə **sübut edildi**. Matris 51 səhifə × 5 breakpoint; `responsive.spec.ts:393` matrisin sayını `src/app`-dakı `page.tsx` sayı ilə tutuşdurur — siyahı geri qalanda test qırılır |
| 7 | Həm lokal, həm deploy olunmuş mühitdə problemsiz işləyir | ❌ **yox** | Meyar **konyunksiyadır**. Lokal tərəf tam ✅ (tsc/lint/build/1833/220). Deploy tərəfi mövcud deyil → şərt pozulur |

**Nəticə: 3 tam · 1 qismən · 3 yox.** Meyar 2 və 3 bloklayıcıdır.

**Əvvəlki auditlə fərq:** meyar 5 və 6 «qismən»dən «tam»a keçdi. Fərqi yaradan
artefaktlar sənəd deyil, **kod və testdir**: meyar 5 üçün `4e693de`-dəki gəzici
düzəlişi (mutasiya a ilə yoxlandı), meyar 6 üçün `tests/e2e/responsive.spec.ts`
matrisi (mutasiya e ilə yoxlandı).

---

## 5. Sprint 4 — meyar-meyar hökm

| # | Meyar | Hökm | Sübut |
|---|---|---|---|
| 1 | Layihə 100% tamamlanmışdır | ⚠️ **qismən** | 5 açıq borcdan **4-ü bağlanıb**: toplu moderasiya (`moderation.service.ts:742` `bulkDecideReports`), CMS-də yaratma (`admin-content.service.ts:254` `createContentPage`), kohort rolu (`admin-users.service.ts:410` `changeCohortRole`), xəritə zoom/pan (`WorldMap.tsx:111` `ZoomableGroup`). **Şifrə bərpası HƏLƏ YOXDUR** — §6 |
| 2 | Sprint Review problemləri həll edilib | ➖ **ölçülə bilmədi** | Review qeydləri repoda yoxdur. Giriş məlumatı olmadan hökm vermək mümkün deyil |
| 3 | Bütün funksionallıqlar tam işlək | ⚠️ **qismən** | 1833 + 220 test lokalda yaşıl; şifrə bərpası axını mövcud deyil (`auth.service.ts` yalnız `registerUser` və `getAuthenticatedSummary` ixrac edir) |
| 4 | Frontend və Backend tam inteqrasiya olunub | ✅ **tam** | Vahid Next.js App Router monolit; ayrı proses/CORS yoxdur. Qərar: `docs/DECISIONS.md:144` **QD-003** ⚠️ (əvvəlki audit səhvən QD-004 yazıb — §8) |
| 5 | Deploy edilmiş layihə problemsiz işləyir | ❌ **yox** | Deploy yoxdur (§4 meyar 2) |
| 6 | Swagger və sənədləşmə tam yenilənib | ⚠️ **qismən** | Swagger tərəfi **tam** (mutasiya a + b). README-də deploy bölməsi **artıq var** (`README.md:466-474`, 25 «deploy» istinadı — əvvəl 1 idi). Lakin sənədlərdə **3 yanlış iddia** qaldı — §8 |
| 7 | Responsive dizayn düzgün işləyir | ✅ **tam** | Mutasiya (e) ilə sübut edildi |
| 8 | Lokal və deploy olunmuş mühitdə problemsiz build olunur | ❌ **yox** | Lokal build ✅ (exit 0). Deploy mühiti yoxdur → konyunksiya pozulur |

**Nəticə: 2 tam · 3 qismən · 2 yox · 1 ölçülə bilməz.**

---

## 6. Canlı mühit — BLOKLAYICI

Ölçmələr:

```
getent hosts qu-class.fly.dev        → qeyd YOXDUR
curl https://qu-class.fly.dev        → curl: (6) Could not resolve host
curl https://fly.io                  → 200        ← nəzarət: şəbəkə işləkdir
curl https://github.com              → 200        ← nəzarət
flyctl auth whoami                   → Error: no access token available
flyctl apps list                     → Error: no access token available
npm run deploy:plan  (--dry-run)     → exit 0, «app=qu-class region=fra volume=qu_data»
```

**Diaqnoz.** Tətbiq Fly.io-da **heç vaxt yaradılmayıb**. Yeganə çatışmayan şey
`FLY_API_TOKEN`-dır (`scripts/deploy.mjs:257`); `flyctl` onsuz da quraşdırılıb
(`~/.fly/bin/flyctl`) və quru icra plan çıxarır.

**Eyni artefaktlar lokalda tam işləyir** (`next start` ilə ölçüldü):

| Yol | Nəticə |
|---|---|
| `/` | **200**, CSS qoşulub (`/_next/static/css/4029e3f8aeef8a92.css`) |
| `/api/v1/health` | **200** → `{"data":{"status":"ok","version":"0.1.0","time":"…"}}` |
| `/docs` | **200** |
| `/api/v1/openapi.json` | **200** |

Yəni bu ❌-lər **kod qüsuru deyil** — icra edilməmiş bir addımdır. Canlı bazaya
heç nə yazılmayıb, seed işlədilməyib.

---

## 7. Toxunulmaz qaydaların vəziyyəti

| Qayda | Vəziyyət | Sübut |
|---|---|---|
| `src/app` / `src/features`-də birbaşa `prisma.*` | ✅ **təmiz** | Şərh sətirləri çıxılandan sonra **0 çağırış**. `@/lib/db` yalnız `src/services` (21), `src/lib` (3: `stage`/`admin-guard`/`viewer`) və `src/auth.ts`-dən import olunur. ⚠️ Qeyd: qayda **avtomatik qorunmur** (nə eslint qaydası, nə test) — §9 |
| `src/components/ui/` toxunulmazlığı | ✅ **toxunulmayıb** | `git log --stat -- src/components/ui/` → **cəmi 1 commit**: `df5633e` (Blok 0 scaffold), 27 fayl, yalnız əlavə. O gündən dəyişilməyib |
| Hardcode hex rəng | ✅ **pozuntu yoxdur** | Şərhlər və `src/features/kuds/tokens.ts` (token reyestrinin ÖZÜ) çıxılanda yeganə yer `src/app/global-error.tsx` (6 inline stil). Bu **düzgün istisnadır**: `global-error` bütün `<html>`-i əvəz edir və Tailwind yüklənməyə bilər; dəyərlər KUDS token-ləri ilə **eynidir** (`#44766C`, `#F8FAFC`, `#1E293B`, `#64748B`) |
| `src/pages/` qovluğu | ✅ **yoxdur** | `ls -d src/pages` → mövcud deyil |
| Seed-in sabit bcrypt duzu | ✅ **TƏHLÜKƏSİZ** | `$2a$10$QUCLASSseedSalt…` **yalnız** `prisma/seed.ts:470`-də var. Qeydiyyat yolu `hashSync(input.password, BCRYPT_ROUNDS)` işlədir (`src/services/auth.service.ts:53`) — kost faktoru, yəni **təsadüfi duz**. Bloklayıcı qüsur **yoxdur** |
| Audit log append-only | ✅ **təmiz** | Servis qatında `auditLog.create` ×6, `delete`/`update`/`upsert` **0**. `deleteMany` yalnız testlərdə (təmizlik) və seed-dədir. Qoruyucu **mənbə mətnini oxuyur** və şərhləri ataraq yoxlayır (`src/services/audit.service.test.ts:60`); ayrıca T42 testi `auditLog.create`-in yalnız `audit.service.ts`-də olmasını təmin edir |
| `phone` / `personalEmail` defolt `PRIVATE` | ✅ **doğru** | `DEFAULT_PRIVATE_FIELDS = ["phone","personalEmail"]` (`src/lib/visibility.ts:342`); `defaultLevelFor` → `PRIVATE` (`src/lib/visibility.test.ts:563-565`) |
| `/me/edit` onları səssizcə açırmı | ✅ **AÇMIR** | Görünürlük yazıları yalnız `updateFieldVisibility*` ilə olur, onu da yalnız `src/features/privacy/actions.ts` çağırır. `src/features/profile/actions.ts` (yəni `/me/edit`) həmin funksiyaları **ümumiyyətlə import etmir** |
| Admin CSV eksportu `redactProfile`-dan keçir | ✅ **keçir** | `src/services/admin-users.service.ts:182` → `redactProfile(profile, viewer, row.fieldVisibility)`. Qoruyucu: `tests/integration/admin.db.test.ts:700` `describe("CSV export")` |
| `.env` · `prisma/dev.db` · `public/uploads/*` · `public/swagger/*` tarixçədə | ✅ **heç vaxt düşməyib** | `git log --all --diff-filter=A` üzrə hər dördü → **0 yol**. HEAD ağacında yalnız `.env.example` izlənir. `npm run git:audit` → 🔴 0 · ⚠️ 0 |
| `prisma/migrations/` toxunulmazlığı | ✅ **toxunulmayıb** | 3 miqrasiya qovluğu + `migration_lock.toml` (`provider = "sqlite"`). `git log --diff-filter=M -- prisma/migrations/` → **boş** (heç biri yaradıldıqdan sonra dəyişdirilməyib) |

**Bir qayda da pozulmayıb.**

---

## 8. Sənəd doğruluğu — 12 iddiadan 9-u doğru

Təsadüfi seçilmiş iddialar koddan yoxlandı.

**✅ Doğru çıxanlar (9):** 51 `page.tsx` · responsive matrisi = `src/app`-dakı
səhifə sayı (test özü tutuşdurur, keçir) · `docs/openapi.json`-da 45 v1
əməliyyatı · `src/lib/db.ts:11` qat qaydası · `moderation.service.ts:698` (TOPLU
QƏRAR) · `admin-content.service.ts:254` (`createContentPage`) ·
`admin-users.service.ts:410` (`changeCohortRole`) · `README.md:472` canlı ünvan
haqqında **dürüst** ifadə («deploy əmri işlədildikdən sonra aktivləşir» — yalan
iddia yoxdur) · `docs/DEFENSE-QA.md`-dəki 1833 test / 220 e2e / 22 fayl
rəqəmləri mənim ölçmələrimlə **hərfən** üst-üstə düşür.

**❌ Yanlış çıxanlar (3):**

1. **`docs/SPRINT-3-4-AUDIT.md` §3.4 meyar 4 — səhv qərar nömrəsi.**
   «`docs/DECISIONS.md` QD-004, sətir 148-161» yazılıb. Həmin sətirlər
   **QD-003 «Tək repo, tək proses — ayrı backend YOXDUR»**-un gövdəsinə düşür
   (başlıq 144-cü sətirdə) — yəni məzmun düzgündür, **etiket səhvdir**. QD-004 (`pages/` → `features/`) hazırda
   **178-ci sətirdədir** və audit yazılan an (`277e389`) 176-cı sətirdə idi,
   yəni istinad **heç vaxt doğru olmayıb**.

2. **`docs/SPRINT-3-4-AUDIT.md:116` — ölçülməmiş Lighthouse rəqəmi.**
   «Lighthouse mobil ən aşağı **87** (`docs/lighthouse/mobile/home.report.json`)»
   yazılıb. Faktiki dəyərlər: `/` 91 · `/home` **86** · `/directory` 88 ·
   `/map` 91 · `/admin` **85**. Yəni nə `home` 87-dir, nə də minimum 87-dir —
   **minimum 85-dir**. Üstəlik istinad edilən fayl **git-də izlənmir**
   (`.gitignore:67-68` bütün `docs/lighthouse/**/*.json`-u istisna edir), yəni
   repo-nu klonlayan imtahançı onu **aça bilməz**.

3. **`docs/quality-report-12c.md:24` — daxili ziddiyyət.**
   «Lighthouse — mobil, 5 səhifə (ən aşağı bal) | 86 | **87**» yazılıb, halbuki
   **eyni blokun izlənən sənədi** `docs/lighthouse/mobile/README.md` düzgün
   cədvəli verir və minimumu **85** (`/admin`) göstərir.

> **Ədalət naminə:** `docs/lighthouse/mobile/README.md` (izlənən xülasə)
> **tamamilə dəqiqdir** — 91/86/88/91/85 dəyərləri JSON-larla üst-üstə düşür və
> üç səhifəni dürüstcə ❌ işarələyir. Problem yalnız iki yerdə həmin rəqəmin
> **yuxarı yuvarlaqlaşdırılmış** təkrarındadır. Blok 13 «hər ölçülmüş rəqəmi
> uzlaşdırdım» dedi — bu üç nöqtə həmin işin **qaçırdığı** yerdir.

---

## 9. Qalan işlər — prioritetlə

| # | İş | Prioritet | Qiymət | Nəyi açır |
|---|---|---|---|---|
| 1 | **Deploy et** — `FLY_API_TOKEN=<token> npm run deploy` | 🔴 **BLOKLAYICI** | **0.5–1 s** | Sprint 3 meyar 2, 3, 7 · Sprint 4 meyar 5, 8 |
| 2 | **Canlı e2e** — `E2E_BASE_URL=https://qu-class.fly.dev npx playwright test` | 🔴 **BLOKLAYICI** | **1 s** | Sprint 3 meyar 4-ü «tam»a çevirir. Konfiq buna hazırdır: uzaq ünvan veriləndə lokal server **qaldırılmır** (`playwright.config.ts:48-51`) |
| 3 | **Şifrə bərpası axını** | 🟠 yüksək | **4–6 s** | Sprint 4 meyar 1 və 3-ü «tam»a çevirir. Yeganə qalan funksional boşluq |
| 4 | **3 yanlış sənəd iddiasını düzəlt** (§8) | 🟡 orta | **0.5 s** | Sprint 4 meyar 6. Müdafiədə «rəqəminiz səhvdir» sualının qarşısını alır |
| 5 | Qat qaydası üçün avtomatik qoruyucu (eslint `no-restricted-imports` və ya `src/app`-i skan edən test) | 🟢 aşağı | **1 s** | Qayda **indi pozulmayıb**, amma qorunmur — gələcək redaktə onu səssizcə sındıra bilər |

**Bloklayıcı yol cəmi: ~1.5–2 saat.** Tam təhvil (şifrə bərpası + sənəd
düzəlişləri daxil): **~7–9 saat**.

---

## 10. Müdafiədə ən çox sual doğuracaq 5 nöqtə

| # | Sual | Hazır cavab harada |
|---|---|---|
| 1 | **«Layihə deploy edilməyibsə niyə tamamlanmış sayılır?»** | Dürüst cavab: **sayılmır** — bu auditin hökmü budur (§1). Cavabın gücü ondadır ki, çatışmayan şey kod deyil, bir token: `docs/HANDOVER-AUDIT.md` §6 (quru icra keçir, lokal `/api/v1/health` 200 verir) və `README.md:466-474`. Ekranda `npm run deploy:plan` çıxışını göstər |
| 2 | **«1833 test yazmısan — onlar həqiqətən nəyisə yoxlayır, yoxsa sadəcə yaşıldır?»** | **Bu auditin §3-ü məhz bunun üçündür.** 6 qoruyucu qəsdən sındırıldı, 6-sı da qırıldı — konkret test adları və `fayl:sətir` ilə. Bu, adi «test sayı» cavabından qat-qat güclüdür. Əlavə: `docs/DEFENSE-QA.md` S20 |
| 3 | **«Məxfilik həqiqətən DB-dədir, yoxsa ekranda gizlədirsən?»** | §3.c — `activeVisibleWhere` silinəndə **12 test / 4 fayl** qırıldı, o cümlədən «UNIVERSITY_ADMIN də başqa sinfin CLASS postunu GÖRMÜR». Kod: `src/lib/visibility.ts:186`, `src/services/post.service.ts:271` |
| 4 | **«Swagger sənədi kodla sinxrondurmu, yoxsa əl ilə yazılıb?»** | İki qoruyucu: gəzici (mutasiya a — yeni v1 route dərhal tutulur) və drift snapshot-u (mutasiya b). Üstəlik `openapi.test.ts:871` **filtrin geri qayıtmasını** tutur. `docs/openapi.json` `npm run build`-in `prebuild` addımında yenidən yaradılır |
| 5 | **«Lighthouse mobil balınız neçədir?»** | ⚠️ **Ehtiyatlı ol** — burada sənəddə səhv var (§8, tapıntı 2 və 3). **Doğru cavab: mobil minimum 85 (`/admin`), `/home` 86.** Mənbə: `docs/lighthouse/mobile/README.md` (izlənən və dəqiq cədvəl). Müdafiədən əvvəl §9-un 4-cü maddəsini icra et |

---

## 11. Auditin öz sərhədləri

Dürüstlük naminə, **ölçə bilmədiklərim**:

- **Canlı mühitin heç bir aspekti** — mühit mövcud olmadığı üçün (§6). Sprint 3
  meyar 4 və Sprint 4 meyar 5 canlı sübut olmadan «tam» ola bilməz.
- **Sprint Review qeydləri** — repoda yoxdur, ona görə Sprint 4 meyar 2 üçün
  hökm verilmir (`➖`), «yerinə yetirilməyib» **deyil**.
- **Lighthouse-un yenidən ölçülməsi** — mövcud JSON artefaktları oxundu
  (lokal, izlənməyən), audit çərçivəsində yenidən işlədilmədi.
- **Mutasiya sınağı 6 qoruyucu ilə məhdudlaşdı** — tapşırıqda göstərilənlərlə.
  Qalan testlərin doğruluğu bu üsulla yoxlanmayıb; «6/6 işlədi» nəticəsi
  bütün 1833 test üçün ekstrapolyasiya **deyil**.

---

**Auditin dəyişdirdiyi yeganə fayl:** `docs/HANDOVER-AUDIT.md` (bu sənəd).
Bütün mutasiyalar geri qaytarılıb; `git diff` boşdur, HEAD `e9f9796`-da qalır.

---

## 12. Blok 14-dən sonra — əlavə

Bu bölmə Blok 14-ün icrasından SONRA yazıldı. Auditin əsas gövdəsi (§1–§11)
olduğu kimi saxlanılır; burada yalnız **nəyin dəyişdiyi** və **nəyin
dəyişmədiyi** qeyd olunur.

### 12.1 Deploy — İCRA EDİLMƏDİ, səbəb dəyişməyib

Blokun ADDIM 1-i `FLY_API_TOKEN`-ın mühitdə olmasını şərt qoyurdu. **Token
verilmədi.** Ölçmə (Blok 14-də TƏKRAR alındı, §6-dakı rəqəmlərin təsdiqidir):

```
getent hosts qu-class.fly.dev   → qeyd YOXDUR
curl https://qu-class.fly.dev   → 000 (host həll olunmur)
curl https://fly.io             → 200        ← nəzarət: şəbəkə işləkdir
flyctl auth whoami              → Error: no access token available
~/.fly/config.yml               → yalnız `auto_update:` (saxlanmış token yoxdur)
.env / .env.local               → FLY_API_TOKEN açarı YOXDUR
npm run deploy:plan             → exit 0, «app=qu-class region=fra volume=qu_data»
```

Token qapısı: `scripts/deploy.mjs:257`. `flyctl` quraşdırılıb
(`~/.fly/bin/flyctl`, v0.4.84) və quru icra planı çıxarır — yəni çatışmayan
şey **yalnız kimlik vəsiqəsidir**.

**Nəticə:** ADDIM 2 (konteynerin içindən doğrulama), ADDIM 3 (6 canlı yoxlama)
və ADDIM 4 (canlı e2e) **icra edilə bilmədi**. Bu addımların heç bir nəticəsi
uydurulmadı — canlı mühit haqqında bu sənəddə **bir dənə də ölçülməmiş iddia
yoxdur**.

### 12.2 Beş bloklanmış meyarın vəziyyəti — DƏYİŞMƏDİ

| Meyar | Əvvəl | İndi | Səbəb |
|---|---|---|---|
| Sprint 3 — 2 (deploy edilmişdir) | ❌ | ❌ | Deploy icra edilmədi |
| Sprint 3 — 3 (canlı mühitdə işləyir) | ❌ | ❌ | 2-nin nəticəsi |
| Sprint 3 — 7 (lokal **və** deploy) | ❌ | ❌ | Konyunksiyanın deploy tərəfi yoxdur |
| Sprint 4 — 5 (deploy olunmuş layihə işləyir) | ❌ | ❌ | Deploy yoxdur |
| Sprint 4 — 8 (lokal **və** deploy build) | ❌ | ❌ | Konyunksiyanın deploy tərəfi yoxdur |

### 12.3 DƏYİŞƏN meyar — Sprint 4, meyar 6

**⚠️ qismən → ✅ tam.** §8-dəki üç yanlış iddianın hamısı düzəldildi:

| # | Yer | Əvvəl | İndi |
|---|---|---|---|
| 1 | `SPRINT-3-4-AUDIT.md` §3.4 meyar 4 | «QD-004, sətir 148-161» | «QD-003 «Tək repo, tək proses — ayrı backend YOXDUR»» — kövrək sətir aralığı **silindi** (drift mənbəyi idi) |
| 2 | `SPRINT-3-4-AUDIT.md` F5 | «mobil ən aşağı 87 (`…/home.report.json`)» | «mobil ən aşağı **85** (`/admin`)», mənbə **izlənən** `docs/lighthouse/mobile/README.md` |
| 3 | `quality-report-12c.md` §0 | «mobil ən aşağı bal … **87**» | «**85** (`/admin`) ¹» + ¹ qeydi §2.2-nin tarixi qaçış olduğunu izah edir |

**+ auditdə sadalanmayan 4-cü nüsxə** (Blok 14-də ölçmə ilə tapıldı):
`docs/METRICS.md` §7 «mobil 87–94 Performance» yazırdı — commit olunan
artefaktların faktiki diapazonu **85–91**-dir. Düzəldildi və mənbə `§2.2`-dən
izlənən xülasəyə keçirildi.

🔴 **Rəqəmin mənbəyi.** 85 dəyəri sənəddən köçürülmədi, **artefaktdan
hesablandı**: `docs/lighthouse/mobile/*.report.json` →
`categories.performance.score × 100` → `/admin` 85 · `/home` 86 ·
`/directory` 88 · `/` 91 · `/map` 91. İzlənən xülasə
(`docs/lighthouse/mobile/README.md`) bu beş rəqəmlə **hərfən** üst-üstə düşür.

⚠️ **Dürüstlük qeydi.** §8 tapıntı 3-ü «daxili ziddiyyət» adlandırmışdı. Daha
dəqiq diaqnoz: `quality-report-12c.md` §2.2 **12C dövrünün ölçmə qaçışıdır**
(o qaçış üçün minimum həqiqətən 87 idi), mobil profil isə müdafiə blokunda
YENİDƏN ölçülüb və commit olunan artefaktlar dəyişib. Ona görə §2.2-nin cədvəli
geriyə dönük **yazılmadı** — tarixi qeyd kimi saxlanıldı və üzərinə göstərici
qoyuldu. Sitat gətirilməli olan yer izlənən xülasədir.

### 12.4 TƏLƏ G — səhv sinfi qapıya bağlandı

Bu səhv (sənəddəki rəqəm koddan ayrılır, heç nə qırılmır) **dörd dəfə** təkrar
olunmuşdu. Yeni qoruyucu: `src/lib/docs-metrics.test.ts` — **11 test**.
Rəqəmlər sənəddən **oxunur**, koddan **hesablanır**, tutuşdurulur:

| Yoxlanan | Mənbə |
|---|---|
| Prisma modeli · miqrasiya sayı | `schema.prisma` · `prisma/migrations/` |
| Səhifə · `/api/v1` endpoint · komponent · feature · servis sayı | fayl sistemi |
| İdarə olunan profil sahəsi (**22**) | `CONTROLLED_PROFILE_FIELDS.length` |
| `FieldVisibility` = 125 × 22 = 2750 | sənəddaxili hesab + kod |
| Lighthouse mobil diapazonu | izlənən `docs/lighthouse/mobile/README.md` |

🔴 **Qoruyucu mutasiya ilə YOXLANDI** (bu auditin §3 üsulu ilə). Sənəddə üç
rəqəm qəsdən pozuldu (miqrasiya 3→4, sahə 22→23, diapazon 85–91→87–94) və
**11 testdən 4-ü qırıldı**, o cümlədən:

```
AssertionError: xülasədəki ən aşağı Performance: expected 85 to be 87
AssertionError: src/lib/visibility.ts: expected 22 to be 23
AssertionError: prisma/migrations/ altındakı qovluqlar: expected 3 to be 4
AssertionError: 125 × 22 hesabı: expected 2875 to be 2750
```

Birinci sətir **məhz bu auditin tapdığı səhvdir** — yəni qoruyucu real qüsuru
təkrar tutur, nəzəri deyil. Mutasiyalar geri qaytarıldı, dəst yaşıldır.

⚠️ **Qəsdən yoxlanmayanlar:** test sayı (dairəvidir — test onu dəyişir), commit
sayı, sətir sayları. Yalnız diskret struktur ölçüləri bağlandı.

📌 **Test sayı dəyişdi — sənədlər uzlaşdırıldı.** Yeni fayl dəstə **11 test**
əlavə etdi: `1833 / 67 fayl` → **`1844 / 68 fayl`** (`npm run test` → 48.4 s).
Bu rəqəm `README.md`, `docs/METRICS.md`, `docs/DEFENSE-QA.md`, `docs/DEMO.md`,
`docs/SECURITY.md`, `docs/DECISIONS.md`-də yeniləndi. **Tarixi qeydlərə
toxunulmadı** — `CHANGELOG.md`, `STATE.md`-in köhnə blokları və bu sənədin
§1–§11 gövdəsi `e9f9796` anının snapshot-ıdır və geriyə dönük yazılmır.
Yəni §8-dəki «`DEFENSE-QA.md` rəqəmləri ölçmələrimlə üst-üstə düşür» ifadəsi
audit anı üçün doğru idi; indiki doğru rəqəm **1844**-dür.

### 12.5 YENİDƏN verilən yekun hökm

| Sprint | Hökm | Dəyişiklik |
|---|---|---|
| **Sprint 3** | 🔴 **QƏBUL OLUNMUR** | dəyişmədi |
| **Sprint 4** | 🔴 **QƏBUL OLUNMUR** | dəyişmədi |

**Səbəb §1-dəkinin eynidir və yenə texniki keyfiyyətlə bağlı DEYİL.** Blok 14
sənəd doğruluğunu artırdı (Sprint 4 meyar 6 → ✅) və drift sinfini avtomatik
qoruyucuya bağladı, lakin **hər iki sprintin mərkəzi meyarı deploy tələb edir**
və deploy icra edilmədi. Bloklayıcı **bir token**-dır; onun verilməsi ilə
Sprint 3 meyar 2, 3, 7 və Sprint 4 meyar 5, 8 eyni gün bağlana bilər.

**Sprint 4 üçün deploy-dan asılı olmayan yeganə qalan boşluq** dəyişməyib:
şifrə bərpası axını yoxdur (QD-001 — qəsdən, amma meyar onu tələb edir).
