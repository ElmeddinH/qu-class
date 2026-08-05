# Dəyişikliklər tarixçəsi

QU CLASS blok-blok qurulub: hər blok bir və ya bir neçə commit-lə bağlanır və
blokun sonunda `npx tsc --noEmit && npm run lint && npm run build` üçü də təmiz
olmalıdır (CLAUDE.md §10). Bu fayl **git tarixçəsindən çıxarılıb** — commit
siyahısını `npm run git:log` ilə görmək olar.

Format [Keep a Changelog](https://keepachangelog.com/) prinsipinə yaxındır,
versiyalama [SemVer](https://semver.org/)-dir.

⚠️ Layihə mühitində `git` binarı yoxdur — commit-lər `isomorphic-git`
(`scripts/git.mjs`) ilə yazılır. Nəticə standart `.git` qovluğudur.

---

## Sprint 2 — 2026-08-05

`/api/v1` OXUYAN bir səth olmaqdan çıxıb — paylaşım, xatirə və tədbir üçün
tam CRUD təmin edir. Server Action və REST route eyni çevirmə köməkçilərini
paylaşır, məntiq dublikat olmur.

| Ölçü | Dəyər |
|---|---|
| `/api/v1` route | 36 (əvvəl 34) |
| `/api/v1` sənədləşən əməliyyat | 44 + 3 v1-dən kənar = 47 (əvvəl 33) |
| Vitest | **1759 keçdi** (65 fayl, əvvəl 1510 / 61) |
| Playwright | **212 keçdi** (20 fayl) |

### Blok 14A — statik OpenAPI export

`98a3f66`

**Əlavə olundu**

- `npm run docs:openapi` → `docs/openapi.json` statik snapshot, drift
  qoruyucu testlə (`src/lib/api/openapi.test.ts` → "docs/openapi.json drift
  qoruyucusu").

### Blok 14B — paylaşım (post) yazma səthi

`867c81b` `a817b8f` `e6fd5e3`

**Əlavə olundu**

- `POST /api/v1/cohorts/{slug}/posts` — paylaşım yaradılması (media,
  nailiyyət və xatirə fan-out-u ilə birlikdə, `createPost` servisi üzərindən).
- `GET/PATCH/DELETE /api/v1/posts/{id}` — CRUD-un qalan üç hərfi
  (`getPost`, `updatePostSurfaces`, `deletePost`).
- `src/features/feed/post-input.ts` — Server Action (`createPost` action) VƏ
  REST route-un **paylaşdığı** çevirmə köməkçiləri (`toCreatePostData`,
  `toAchievementInput`, `toMediaData`). Əvvəllər yalnız `actions.ts`-də idi;
  "use server" faylından saf funksiya ixrac oluna bilmədiyi üçün ayrı modula
  çıxarıldı — iki səth eyni məntiqi çağırır, dublikat yazılmayıb.

**Test**

- `tests/integration/posts-crud.db.test.ts` — mutasiya xəta xəritələməsi
  (404/403/422) və məxfilik reqressiyaları (`PRIVATE`/`CLASS` sızmır).
- `tests/e2e/api-docs.spec.ts` — sənəddəki əməliyyat sayı 33 → 47 düzəldildi
  (Sprint 2-dən əvvəlki sabit gözləmə köhnəlmişdi, test QIRMIZI idi).

### Blok 14C — xatirə və tədbir yazma səthi

`867c81b`

**Əlavə olundu**

- `POST /api/v1/cohorts/{slug}/memories` + `GET/PATCH/DELETE
  /api/v1/memories/{id}`.
- `POST /api/v1/cohorts/{slug}/events` + `PATCH/DELETE /api/v1/events/{id}`
  (`GET` Blok 9S-dən onsuz da var idi).
- Hər iki modulda: yazma `429` (spam qapısı) və `security` (kuka) sənədləşib,
  `DELETE` `204` qaytarır və `415` elan etmir (brauzer `<form>`-u `DELETE`
  göndərə bilmir).

---

## [1.0.0] — 2026-07-31

Holberton School final təhvil paketi. **17 modulun hamısı icra olunub**,
tam test dəsti yaşıldır.

| Ölçü | Dəyər |
|---|---|
| Commit | 35 |
| Blok | 0 → 13B |
| `/api/v1` endpoint | 33 |
| Vitest | **1510 keçdi** (61 fayl) |
| Playwright | **212 keçdi** |
| Ekran görüntüsü | 17 (1440×900, determinist) |

---

### Blok 13B — təhvil paketi *(bu buraxılış)*

**Əlavə olundu**

- `scripts/screenshots.ts` — 17 səthin **determinist** ekran görüntüsü
  (1440×900, KUDS §9 «Desktop»). Determinizm dörd qapı ilə: seed bazası,
  sabit an, animasiya söndürülməsi, kuki razılığı.
- `scripts/freeze-clock.cjs` — server saatını sabit ana bağlayan preload.
  Saat **dondurulmur, sürüşdürülür**: nisbi tarixlər sabit qalır, amma zamanın
  axmasına güvənən kod (timeout, rate limiter) pozulmur.
- 🔒 Ekran görüntüsü skriptinə **şəxsi məlumat qapısı**: hər icrada həm baza,
  həm 17 ekranın görünən mətni yoxlanır; tapıntı varsa skript sıfırdan fərqli
  kodla çıxır.
- `docs/GW-COMPARISON.md` — GW referans analizinin yekunu: 17 modul × 4 ölçü,
  14 əlavənin **kodda təsdiqlənmiş** vəziyyəti, 6 qəsdli imtinanın səbəbi.
- `CHANGELOG.md` (bu fayl).
- `npm run shots` / `npm run shots:serve` əmrləri.

**Dəyişdi**

- README — «Ekran görüntüləri» bölməsi 17 real şəkillə əvəzləndi
  (əvvəl 13B yer tutucuları idi).

**Düzəldildi — test dəstində beş qüsur**

Təzə seed üzərində tam dəst sürüləndə üzə çıxdı. Beşi də **testin özündə** idi;
məhsul kodunda dəyişiklik olmayıb.

- `avatar-privacy.db.test.ts` — şərh `take: 1` ilə seçilirdi və determinist
  seed HƏMİŞƏ **başqasının `PRIVATE` paylaşımındakı** şərhi qaytarırdı. Sıfır
  nəticə məxfilik mühərrikinin DÜZGÜN işləməsi idi; indi şərh yalnız baxan
  tərəfin gördüyü paylaşımlardan seçilir.
- `landing.spec.ts` + `public.spec.ts` — «CLASS mətni sızmır» testləri needle-ı
  gövdənin BAŞINDAN götürürdü. Seed gövdələri ortaq hovuzdan gəldiyi üçün belə
  fraqment təzə bazada **heç vaxt** CLASS-a məxsus olmur. Seçim ortaq modula
  (`tests/e2e/class-only-text.ts`) köçürüldü və tam gövdə üzərindən aparılır.
- `class-home.spec.ts` + `headings.spec.ts` — başlıqlar **Suspense axını
  bitməmiş** oxunurdu (`tests/e2e/settle.ts` ilə həll edildi).
- `map.spec.ts` — şablon iki elementə düşüb strict mode pozuntusu verirdi.
- `headings.spec.ts` → `/docs` istisna edildi: Swagger UI hidrasiya zamanı öz
  `<h1>`-ini əlavə edir. Bu, `public.spec.ts`-dəki mövcud istisna ilə
  eyniləşdirmədir — əvvəl test sadəcə Swagger-dən ERKƏN oxuyurdu.

⚠️ Ortaq dərs: bu testlərin bir hissəsi **sürüşmüş baza** üzərində yaşıl
görünürdü. `npm run shots` indi hər icrada seed bazasını yoxlayır.

**Bilinən boşluq (dürüst qeyd)**

- GW analizindəki **#4 cohort `.ics` abunə lenti** və **#5 tədbir paylaşma
  düymələri** planlanıb, **icra olunmayıb**; **#7 trend sıralaması** yalnız
  qismən (tutum göstəricisi var, populyarlıq sıralaması yox). Ətraflı:
  [`docs/GW-COMPARISON.md`](docs/GW-COMPARISON.md) §2.

---

### Blok 13A — sənədləşmə

`646ce3e`

**Əlavə olundu**

- `docs/ARCHITECTURE.md` — sistem konteksti, ER diaqramı, məxfilik qərar axını,
  fan-out sequence, auth Edge/Node bölgüsü (**7 Mermaid diaqramı**).
- `docs/DECISIONS.md` — 17 qərar: Kontekst · Qərar · Alternativlər · Nəticə.
- `docs/SECURITY.md` — təhdid modeli: nəyi qoruyuruq və **nəyi yox**.

---

### Blok 12 — keyfiyyət keçidi

`a7b6c79` `c587b6c` `3b765e3` `4e30973`

**Düzəldildi**

- 12A statik auditinin məxfilik və KUDS tapıntıları bağlandı
  (`docs/audit-12a.md`).
- T40–T43 üçün məxfilik reqressiya testləri.
- 4–11-ci bloklardan qalan funksional borclar: `coverUrl` idarə olunan sahələr
  siyahısına salındı (**22-ci sahə**), xəritəyə zoom/pan, donut kontrastı,
  kuki «Seçimlər» ekranı, CMS-də «yarat», toplu moderasiya.

**Əlavə olundu**

- Əlçatanlıq (axe-core), performans (Lighthouse — desktop + mobil) və
  responsive (5 breakpoint × 10 səhifə) ölçmələri:
  `scripts/lighthouse-audit.ts`, `scripts/responsive-shots.ts`,
  `docs/quality-report-12c.md`.
- `CardTitle` üçün başlıq semantikası (`role="heading"` + `aria-level`) —
  `src/components/ui/` toxunulmadan.

---

### Blok 11C — git alətləri və sızma auditi

`e77a7fa` `0a7ba5e`

**Əlavə olundu**

- `scripts/git-audit.mjs` — tarixçədə sirr sızması auditi.
- `scripts/git-push.mjs` — **audit qapısı push-dan ƏVVƏL**; token yalnız
  `GITHUB_TOKEN` mühit dəyişənindən oxunur və **remote URL-inə yazılmır**.
- Push-dan sonra `listServerRefs` ilə **uzaqdan təsdiq**.
- `package-lock.json` sinxron commit olundu — təzə klon quraşdıra bilsin.

---

### Blok 11A/11B — ictimai səth, bildirişlər və admin paneli

`407db29` `9637aca` `ab7f946` `a38975e` `2bfadc2`

**Əlavə olundu**

- **Welcome Page** [M1] — 11 bölmə; GW-dən ilhamlanan **canlı** bloklar:
  icma hekayələri, son xəbərlər, məzun sitatı (hamısı `PUBLIC` süzgəcindən).
- Fakültə səhifələri, Xankəndi bələdçisi + **məkana bağlı sinif xatirələri**,
  hüquqi səthlər (məxfilik · şərtlər · müəllif hüququ · bərabər imkanlar),
  `/accessibility` + **maneə bildirmə forması**, kuki razılığı banneri.
- **Bildiriş mərkəzi** [M15] — 9 növ, filtr, səhifələmə, header rozeti.
- **İdarə paneli** [M17] — analitika, cohort idarəsi, CSV SIS idxalı, rol
  idarəsi, şikayət və nailiyyət növbələri, CMS, **append-only audit jurnalı**.
- Şikayət moderasiyası: məzmuna baxış **hər açılışda audit jurnalına yazılır**.

**Düzəldildi**

- Auth yönləndirmə döngəsi; route giriş qaydaları `src/lib/routes.ts`-də
  mərkəzləşdirildi.
- Seed-dən profil şəkilləri çıxarıldı (ölü `dicebear` konfiqi silindi).

---

### Blok 10 — xatirələr, illik album və «İndi haradayıq?»

`8159538` `1c807af` `c217359`

**Əlavə olundu**

- **Share Memories** [M9] — 8 növ xatirə, 4 ayrıca göstərilmə seçimi.
- 🏆 **Digital Yearbook** — `/class/[slug]/yearbook`, **çap düzülüşü ilə**
  (`print:break-before-page`, `@media print`).
- **Dəstək təklifləri səthi** — `/class/[slug]/support`, 7 növ.
- **Sinif statistika zolağı** — «N üzv · X şəhərdən · Y ölkədən · Z klubda ·
  W nailiyyət»; sinif `MIN_BUCKET_SIZE`-dan kiçikdirsə zolaq **tam gizlənir**.
- 🔒 **Where Are We Now** [M11] — `/class/[slug]/map`, **8 ölçü**
  (dünya · Azərbaycan · şəhər · ölkə · şirkət · sənaye · vəzifə · təhsil).
  **Çarpaz-ölçü k-anonimliyi**: kiçik xana gizlədilmir, **kobudlaşdırılır**
  (şəhər → ölkə → «Açıqlanmayan»); dəqiq ünvan/koordinat **heç vaxt** verilmir.
  Aqreqasiya ayrıca `includeInStats` razılığı tələb edir.
- 🔴 Əmək haqqı sahəsi **qəsdən yoxdur** — və bu qərar
  `src/lib/career-stats.test.ts` ilə **testlə qorunur**.

---

### Blok 9 — tədbirlər və reunion koordinatoru

`cbe7dc7` `ebd6818` `cd37c8d`

**Əlavə olundu**

- **Upcoming Events** [M12] — 6 filtr, 9 kateqoriya, 5 təşkilat səviyyəsi.
- **Tədbir detalı və koordinator paneli** [M13] — 7 RSVP statusu, iştirakçı
  cədvəli, `.ics` ixracı, tədbir hesabatı və albomu.
- **«Maraqlanıram» ≠ «Qeydiyyat»** ayrımı (GW: *I'm Interested*) — düymələr
  **niyyətdir, status deyil**: tutum doludursa server `WAITLISTED` qaytarır.
- 6 e2e DoD ssenarisi.

**Düzəldildi**

- Açılış anchor-ları və xəta sərhədləri.

---

### Blok 8 — xronologiya və nailiyyətlər

`3288658` `9479a17`

**Əlavə olundu**

- **Class Timeline** [M8] — paylaşım, nailiyyət, tədbir və **sistem
  mərhələləri** tək cədvəldə; akademik ilə görə filtr.
- **Class Achievements** [M10] — 12 kateqoriya, 4 status, moderasiya növbəsi.
- **Nailiyyət spotlight-ı** (GW: *Monumental Alumni*) — `status = FEATURED`,
  səhifənin başında 3 seçilmiş nailiyyət.
- Sxem: `CareerEntry.jobFunction` (14 dəyər, aqreqasiya üçün normallaşdırılmış
  rol) və `Memory.guidePlaceId` (**M9 ↔ M3 körpüsü**).

---

### Blok 10A — versiyalı REST qatı

`b6bf842` `e6251de` `63095b3` `15f08d7`

**Əlavə olundu**

- `/api/v1` — **33 endpoint**, OpenAPI sənədi
  (`@asteasolutions/zod-to-openapi`) və `/docs`-da **Swagger UI**.
- `scripts/copy-swagger.mjs` — Swagger aktivləri `prebuild`-də kopyalanır.

---

### Bloklar 4–7 — sinif səthləri

`db7d9d1` `e51a29b` `1f3618f` `137f91e` `d8d1d1e` `581fe94`

**Əlavə olundu**

- **Class Feed** [M5] — 12 kateqoriya, 8 paylaşım növü, reaksiya, şərh,
  kursor səhifələmə. `createPost` **tək transaksiyada** Timeline və Achievement
  fan-out edir; `deletePost` soft-delete olduğu üçün TimelineEntry **açıq
  şəkildə** silinir (kaskad işə düşmür).
- **Class Page** [M4] — mərhələyə görə dəyişən widget sırası
  (`INCOMING` → `STUDENT` → `ALUMNI`, **eyni səhifə**).
- **Class Directory** [M6] — **13 filtr**, paylaşıla bilən URL; gizli sahə
  üzrə filtr onu sızdırmır.
- **Qlobal axtarış** [M16] — `/search` + ⌘K palitrası.
- **My Class Story** [M7] — profil, redaktor, karyera və təhsil qeydləri.
- İlk vahid, inteqrasiya və e2e test dəstləri; `PLAN.md`, `PROMPTS.md`,
  `STATE.md`.

---

### Bloklar 0–3 — təməl

`df5633e` `d1e970e` `32f3203` `e5904b1`

**Əlavə olundu**

- Next.js 15 App Router + Tailwind 3.4 + shadcn/ui v2 karkası, **KUDS v1.0
  tokenləri** (rəng, tipoqrafiya, radius, kölgə, spacing).
- 17 modulu əhatə edən Prisma sxemi və **determinist seed**
  (`mulberry32` PRNG + sabit `NOW` → iki icra = eyni baza).
- Auth.js v5 — **iki yerə bölünmüş konfiq**: `auth.config.ts` Edge-təhlükəsiz,
  `auth.ts` Node (Prisma + bcrypt). JWT **minimaldır**: `userId` + `systemRole`.
- 🔒 **Məxfilik mühərriki** — 4 səviyyə (`PUBLIC` › `UNIVERSITY` › `CLASS` ›
  `PRIVATE`), **yalnız DB səviyyəsində filtrləmə**. JS-də filtrləmə qadağandır:
  pagination-ı sındırır və sızma yaradır.

---

[1.0.0]: https://github.com/
