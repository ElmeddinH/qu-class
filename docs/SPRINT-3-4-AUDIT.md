# Sprint 3 & Sprint 4 — uyğunluq auditi

> **Ölçmə tarixi:** 18.08.2026 · **Ölçülən commit:** `d132a3e` (42 commit, `origin/main` ilə sinxron)
> **Metod:** hər iddia ya (a) `fayl:sətir`, ya (b) işlədilmiş əmr + xam çıxışla təsdiqlənir.
> Sübutu olmayan sətir bu sənəddə **yoxdur** — təsdiqlənməyən hər şey `❌` və ya `➖`-dir.
>
> ⚠️ **Sənədin məqsədi layihəni yaxşı göstərmək DEYİL.** Rəqəmlərin bir hissəsi
> yüksəkdir, bir hissəsi aşağı — ikisi də olduğu kimi verilib.

---

## 1. Yekun xülasə

**Sprint 3 — QƏBUL OLUNMUR.** Funksional əhatə PLAN.md-nin öz miqyasında tamdır (43/43 route, 17/17 modul), lakin sprintin mərkəzi tələbi — **deploy — ümumiyyətlə başlanmayıb** (nə `Dockerfile`, nə `vercel.json`, nə CI, nə link), və deploy tək bir meyar deyil, üç meyarın (2, 3, 7) qapısıdır.

**Sprint 4 — QƏBUL OLUNMUR.** Sprint 4 Sprint 3-ün üstündə qurulur: «deploy edilmiş versiya son vəziyyətə uyğun yenilənməlidir» maddəsi deploy olmadığı üçün icra edilə bilməz; əlavə olaraq «əvvəlki Sprint Review problemləri» siyahısı repoda yoxdur, yəni o meyar ölçülə bilmir.

**Bir cümləlik fərq:** layihə *bitib*, amma *çatdırılmayıb* — kod keyfiyyəti sprint meyarlarını ödəyir, çatdırılma kanalı isə mövcud deyil.

---

## 2. Sprint 3 — deliverable və qəbul meyarları

**Deadline: 13.08.2026 (5 gün keçib).**

### 2.1 Backend Deliverables

| Tələb | Vəziyyət | Sübut | Çatışmayan | Vaxt |
|---|---|---|---|---|
| B1. Qalan əsas biznes funksionallıqları hazırlanmalıdır | ✅ tam | PLAN.md §6-dakı 17 modulun hamısının route qarşılığı var — bax §4.2 cədvəli. `src/services/` altında 22 servis (`ls src/services/ \| grep -v test`) | — | — |
| B2. Mövcud API-lər optimallaşdırılmalı və refaktor edilməlidir | ✅ tam | N+1 profili: `docs/quality-report-12c.md` + `npm run audit:queries`; STATE.md:1666 «`take` 6→24 dəyişəndə sorğu sayı sabit (11/11/4)». Vahid guard qatı: `src/lib/api/guard.ts:92,108,138` | — | — |
| B3. İcazələr (Authorization/Roles) tam tətbiq edilməlidir | ✅ tam | 42 route-un hamısında qapı var — bax §6 cədvəli. Servis qatında `assertFreshAdmin` **37 çağırış** (`grep -rn "await assertFreshAdmin(viewer)" src \| wc -l`), 8 servisə yayılıb | — | — |
| B4. API performansı və əsas təhlükəsizlik tədbirləri | ✅ tam | Lighthouse desktop 5 səhifə × 100/100/100/100 (`docs/lighthouse/README.md:8-13`); `docs/SECURITY.md`; timing-attack bağlanması `src/auth.ts:27-44` | — | — |
| B5. **Swagger/OpenAPI bütün endpoint-ləri tam əhatə etməlidir** | ⚠️ qismən | 53 kod operation-dan **52-si** ya sənəddə (47), ya səbəbli ağ siyahıda (5). Bax §5 | `GET /api/v1/openapi.json` nə sənəddə, nə ağ siyahıdadır; drift testi `/api/v1`-i ümumiyyətlə skan etmir (`src/lib/api/openapi.test.ts:811`) | 1 saat |

### 2.2 Frontend Deliverables

| Tələb | Vəziyyət | Sübut | Çatışmayan | Vaxt |
|---|---|---|---|---|
| F1. Əsas səhifə və axınların **min. 75%-i** | ✅ tam | PLAN.md §4.2-dəki **43 route-un 43-ü** var (42 birbaşa + 1 inline). Üstəlik planda olmayan 9 səhifə. Bax §4.1 | — | — |
| F2. UI/UX təkmilləşdirilməli | ✅ tam | Blok 12C: axe `serious` 141 node → **0** (STATE.md:1600); `tests/e2e/a11y.spec.ts` 12 səhifə × 2 vəziyyət | — | — |
| F3. Responsive dizayn bütün tamamlanmış səhifələr üçün | ⚠️ qismən | REAL ölçmə var: `docs/responsive/` — **11 səhifə × 5 breakpoint = 51 PNG** + `docs/responsive/report.md` (üfüqi sürüşmə 0, toxunma hədəfi <24px 0). Playwright: `tests/e2e/landing.spec.ts:331-334` (6 viewport), `tests/e2e/public.spec.ts:581-589` (360px × 6 route) | **51 səhifədən 11-i** ölçülüb. 40 səhifə heç bir breakpoint-də yoxlanmayıb. Bax §7 | 4 saat |
| F4. **Loading / Empty / Error state-lər bütün uyğun səhifələrdə** | ⚠️ qismən | `error.tsx` **51/51** ✅ · `not-found.tsx` **51/51** ✅ · `global-error.tsx` ✅ · EmptyState 48 komponentdə. **`loading.tsx` isə yalnız 9/51** | **31 səhifə** server komponentdir, `await` edir, nə `loading.tsx`, nə `<Suspense>` var → istifadəçi boş ekran görür. Bax §8 | 6 saat |
| F5. Performans optimizasiyaları (lazy loading, image opt.) | ✅ tam | `next/image` 19 faylda, xam `<img>` **1 ədəd** və səbəbi yazılıb (`src/features/profile/StoryHeader.tsx:61,77` — xarici host). Recharts 4/4 lazy, xəritələr 2/2 lazy. Bax §9 | — | — |

### 2.3 Deployment Deliverables

| Tələb | Vəziyyət | Sübut | Çatışmayan | Vaxt |
|---|---|---|---|---|
| D1. Layihə uğurla deploy edilməlidir | ❌ yox | `ls Dockerfile*` → yox · `ls vercel.json` → yox · `ls -a .github` → yox. Repoda heç bir deploy artefaktı tapılmadı | Hər şey. Bax §10 | 6–10 saat |
| D2. Frontend və Backend canlı mühitdə işlək | ❌ yox | Yuxarıdakı ilə eyni | — | (D1-ə daxil) |
| D3. DB bağlantıları və env dəyişənləri düzgün konfiqurasiya | ❌ yox | `prisma/schema.prisma:26` → `provider = "sqlite"`, `.env.example:22` → `DATABASE_URL="file:./dev.db"` — lokal fayl yolu, bulud DB deyil | Bax §10.1 | (D1-ə daxil) |
| D4. Deploy edilmiş linkin təqdim olunması | ❌ yox | Link mövcud deyil | — | (D1-ə daxil) |

### 2.4 Sprint 3 — Acceptance Criteria

| Meyar | Vəziyyət | Sübut |
|---|---|---|
| 1. Layihənin minimum 75%-i tamamlanmışdır | ✅ tam | PLAN.md miqyasında **100%**: 43/43 route, 17/17 modul. Bax §4 |
| 2. Layihə uğurla deploy edilmişdir | ❌ yox | Deploy artefaktı yoxdur (D1) |
| 3. Frontend və Backend canlı mühitdə işləyir | ❌ yox | 2-nin nəticəsi |
| 4. Əsas istifadəçi axınları problemsiz icra olunur | ⚠️ qismən | **Lokalda** sübut var: `vitest` 1759/1759, Playwright 212 test / 20 fayl. **Canlı mühitdə ölçülməyib** — mühit yoxdur |
| 5. Swagger sənədləşməsi tam yenilənmişdir | ⚠️ qismən | 52/53 operation. 1 elan edilməmiş (B5) |
| 6. Responsive dizayn bütün tamamlanmış səhifələrdə işləyir | ⚠️ qismən | 11/51 səhifə ölçülüb (F3) |
| 7. Layihə həm lokal, həm deploy olunmuş mühitdə problemsiz işləyir | ⚠️ qismən | Lokal: `tsc ✓ lint ✓ build ✓ vitest ✓`. Deploy tərəfi mövcud deyil |

**Nəticə: 1 tam · 4 qismən · 2 yox.** Meyar 2 və 3 bloklayıcıdır — onlarsız sprint qəbul olunmur.

---

## 3. Sprint 4 — deliverable və qəbul meyarları

**Deadline: 18.08.2026 (bugün).**

> 🔴 **Ölçülə bilməyən meyarlar barədə xəbərdarlıq.** Sprint 4-ün bir neçə maddəsi
> «əvvəlki Sprint Review zamanı müəyyən edilmiş problemlər»ə istinad edir. Həmin
> review qeydləri **repoda yoxdur** (`grep -rn -i "sprint" --include="*.md"` →
> yalnız Sprint 2 tapılır). O maddələr `➖` işarələnib — «yerinə yetirilməyib»
> deyil, «giriş məlumatı olmadan ölçülə bilməz» deməkdir.

### 3.1 Backend Deliverables

| Tələb | Vəziyyət | Sübut | Çatışmayan | Vaxt |
|---|---|---|---|---|
| B1. Qalan bütün funksionallıqlar tamamlanmalıdır | ⚠️ qismən | 17/17 modul var (§4.2), lakin STATE.md-də **açıq borc siyahısı** qalır | Şifrə bərpası axını yoxdur (STATE.md:1455) · CMS-də yaratma yoxdur, yalnız redaktə (STATE.md:1448) · cohort rolu yalnız əsas sinifdə dəyişir (STATE.md:1445) · moderasiyada toplu əməliyyat yoxdur · xəritədə zoom/pan yoxdur. Bax §11 | 12 saat |
| B2. Sprint Review backend problemləri aradan qaldırılmalı | ➖ aid deyil | Review qeydləri repoda yoxdur — ölçmə mümkün deyil | Qeydlərin özü | — |
| B3. Kod refaktorinqi və optimizasiyası | ✅ tam | `npx tsc --noEmit` → 0 xəta · `npm run lint` → 0 xəbərdarlıq · qat qaydası pozulmayıb (`src/app`-də birbaşa `prisma.*` yoxdur — `src/lib/db.ts:11` qaydası) | — | — |
| B4. Error handling və validasiya yekunlaşdırılmalı | ✅ tam | Vahid zərf: `src/lib/api/respond.ts` + `src/lib/api/errors.ts`; Zod validasiyası `parseJsonBody`/`parseQuery` (`src/lib/api/guard.ts:251,288`); `tests/integration/api.db.test.ts` xəta xəritələməsini yoxlayır | — | — |
| B5. Swagger/OpenAPI son vəziyyətə uyğun yenilənməli | ⚠️ qismən | Drift qoruyucusu işləyir: `npm run build` sonrası `docs/openapi.json` **dəyişmədi** (`diff -q` → identik), yəni snapshot koda uyğundur | Sprint 3 B5-dəki eyni boşluq | 1 saat |

### 3.2 Frontend Deliverables

| Tələb | Vəziyyət | Sübut | Çatışmayan | Vaxt |
|---|---|---|---|---|
| F1. Bütün səhifələr və istifadəçi axınları tamamlanmalı | ✅ tam | 51 `page.tsx`; PLAN.md §4.2-nin 43/43-ü örtülüb (§4.1) | — | — |
| F2. Sprint Review UI/UX problemləri aradan qaldırılmalı | ➖ aid deyil | Review qeydləri yoxdur | Qeydlərin özü | — |
| F3. Responsive dizayn bütün səhifələrdə yoxlanılmalı və yekunlaşdırılmalı | ⚠️ qismən | 11/51 səhifə ölçülüb (§7) | 40 səhifə | 4 saat |
| F4. Dizayn ardıcıllığı (Design System consistency) tam təmin edilməli | ✅ tam | KUDS kontrast qaydalarının mənbə skanı: `src/lib/kuds-contrast.test.ts` · canlı bələdçi `/kuds` (`src/app/(app)/kuds/page.tsx`) · `src/components/ui/` toxunulmazdır | — | — |
| F5. İstifadəçi təcrübəsi son dəfə optimallaşdırılmalı | ⚠️ qismən | axe 0 `serious`; Lighthouse mobil ən aşağı 87 (`docs/lighthouse/mobile/home.report.json`) | Loading state boşluğu (§8) birbaşa UX borcudur | (F4/Sprint3 ilə eyni) |

### 3.3 Finalization Deliverables

| Tələb | Vəziyyət | Sübut | Çatışmayan | Vaxt |
|---|---|---|---|---|
| Z1. Əvvəlki Project Review rəyləri tətbiq edilməli | ➖ aid deyil | Rəy siyahısı repoda yoxdur | Siyahının özü | — |
| Z2. Tam End-to-End funksionallıq yoxlanılmalı | ⚠️ qismən | `npx playwright test --list` → **212 test / 20 fayl**. Bu auditdə siyahılandı, **işlədilmədi** (vaxt) | Canlı mühitdə E2E keçidi | 2 saat |
| Z3. **Deploy edilmiş versiya son vəziyyətə uyğun yenilənməli** | ❌ yox | Deploy yoxdur | Hər şey — Sprint 3 D1-in eynisi | (§10) |
| Z4. README və layihə sənədləşməsi tamamlanmalı | ⚠️ qismən | README 719 sətir, 24 bölmə; `docs/` altında 8 sənəd (ARCHITECTURE, DECISIONS, SECURITY, DEMO, METRICS, DEFENSE-QA, GW-COMPARISON, quality-report-12c) | README-də **deploy bölməsi yoxdur** (`grep -n -i "deploy" README.md` → yalnız Vercel-in `AUTH_TRUST_HOST` qeydi, sətir 367). Canlı link bölməsi yoxdur | 2 saat |
| Z5. Yekun təqdimat üçün hazır vəziyyət | ⚠️ qismən | `docs/DEMO.md` (8 dəqiqəlik ssenari), `docs/DEFENSE-QA.md`, 18 ekran görüntüsü | Demo **lokal maşından** göstərilməlidir — canlı link yoxdur | (Z3-ə bağlı) |

### 3.4 Sprint 4 — Acceptance Criteria

| Meyar | Vəziyyət | Sübut |
|---|---|---|
| 1. Layihə 100% tamamlanmışdır | ⚠️ qismən | PLAN.md miqyasında 100%, lakin STATE.md-də açıq borclar var (§11) |
| 2. Əvvəlki Sprint Review problemləri aradan qaldırılmışdır | ➖ aid deyil | Problem siyahısı repoda yoxdur |
| 3. Bütün funksionallıqlar tam işlək vəziyyətdədir | ⚠️ qismən | Lokalda 1759 vitest + 212 e2e; şifrə bərpası kimi axınlar yoxdur |
| 4. Frontend və Backend tam inteqrasiya olunmuşdur | ✅ tam | Vahid Next.js App Router monolit (`docs/DECISIONS.md` QD-004, sətir 148-161); CORS/ayrı deploy problemi yoxdur |
| 5. Deploy edilmiş layihə problemsiz işləyir | ❌ yox | Deploy yoxdur |
| 6. Swagger və layihə sənədləşməsi tam yenilənmişdir | ⚠️ qismən | Swagger 52/53; README-də deploy bölməsi yoxdur |
| 7. Responsive dizayn bütün səhifələrdə düzgün işləyir | ⚠️ qismən | 11/51 səhifə ölçülüb |
| 8. Layihə lokal və deploy olunmuş mühitdə problemsiz build olunur | ⚠️ qismən | Lokal build ✅ (94 route). Deploy mühiti yoxdur — bax §12 (build-in keçməsi deploy hazırlığı demək deyil) |

**Nəticə: 1 tam · 5 qismən · 1 yox · 1 ölçülə bilməz.**

---

## 4. Tamamlanma faizi — məxrəclər açıq

> «75%» rəqəminin məxrəci **PLAN.md**-dir (§4.2 route xəritəsi + §6 modul cədvəli),
> uydurulmuş məxrəc deyil.

### 4.1 Səhifələr — PLAN.md §4.2 (sətir 176-214) ilə tutuşdurma

| Ölçü | Rəqəm |
|---|---:|
| PLAN.md §4.2-də planlaşdırılmış route | **43** |
| Birbaşa mövcud | 42 |
| Ayrıca route əvəzinə mövcud səhifəyə inline edilib | 1 |
| Yox | **0** |
| Real `page.tsx` sayı | 51 |
| Planda OLMAYAN, əlavə edilmiş | 9 |

**Səhifə əhatəsi: 43/43 = 100%.**

İki route adı dəyişib (funksiya var):

| PLAN.md | Real | Qeyd |
|---|---|---|
| `/khankendi/[category]` | `/khankendi/[id]` | Bələdçi məkanı id ilə açılır |
| `/admin/cohorts/import` | `/admin/import` | SIS CSV importu |

Bir route inline edilib:

| PLAN.md | Real | Sübut |
|---|---|---|
| `/class/[slug]/incoming` | `/class/[slug]` (mərhələyə görə dəyişən vidjetlər) | `src/features/class-home/registry.ts:61-64` → `intro-wizard`, `similar-members`, `campus-prep`, `khankendi-guide`; `src/features/class-home/ClassHome.tsx:5` «TƏK KOMPONENT, üç mərhələ» |

Planda olmayan 9 əlavə səhifə: `/accessibility`, `/admin/stats`, `/class/[slug]/achievements/moderation`, `/class/[slug]/support`, `/class/[slug]/yearbook`, `/docs`, `/events/[id]/report`, `/kuds`, `/legal/[slug]`.

**Səhifələrin kateqoriyası:**

| Kateqoriya | Say | Hansılar |
|---|---:|---|
| (a) Son istifadəçi axını | **40** | `(public)/*` 19 + `(app)/*` 21 (`/kuds` xaric) |
| (b) Admin | **9** | `(admin)/admin/{,achievements,audit,cohorts,content,import,moderation,stats,users}` |
| (c) Daxili / dev | **2** | `/kuds` (KUDS dizayn bələdçisi), `/docs` (Swagger UI) |

### 4.2 Modullar — PLAN.md §6 (17 modul)

| # | Modul | Route sübutu |
|---|---|---|
| M1 | Public Welcome Page | `src/app/(public)/page.tsx` + `src/features/welcome/WelcomePage.tsx` |
| M2 | University & Campus Information | `/faculties`, `/faculties/[slug]`, `/clubs`, `/campus-life`, `/services`, `/newcomers`, `/about`, `/history`, `/mission` |
| M3 | Khankendi Student Guide | `/khankendi`, `/khankendi/[id]` |
| M4 | Incoming Class | `src/features/class-home/incoming/` (4 vidjet) → `registry.ts:61-64` |
| M5 | Class Feed | `/class/[slug]/feed` |
| M6 | Class Directory | `/class/[slug]/directory` |
| M7 | My Class Story | `/u/[userId]` |
| M8 | Class Timeline | `/class/[slug]/timeline` |
| M9 | Share Memories | `/class/[slug]/memories` + `/class/[slug]/yearbook` |
| M10 | Class Achievements | `/class/[slug]/achievements` (+ `/moderation`) |
| M11 | Where Are We Now | `/class/[slug]/map` + `/admin/stats` |
| M12 | Upcoming Events | `/events`, `/class/[slug]/events` |
| M13 | Events & Reunion Coordinator | `/events/[id]`, `/events/[id]/manage`, `/events/[id]/report` |
| M14 | Privacy & Visibility Management | `/me/privacy` + `src/lib/visibility*` |
| M15 | Notifications | `/notifications` |
| M16 | Search & Filters | `/search` + `/api/search` + `/api/v1/search` |
| M17 | Moderation & Administration | `(admin)/*` 9 səhifə |

**Modul əhatəsi: 17/17 = 100%.**

### 4.3 API endpoint-ləri

PLAN.md §4.2 yalnız **6** API route sadalayır. Hamısı var (biri daha dəqiq adla):

| PLAN.md | Real | ✓ |
|---|---|---|
| `/api/auth/[...nextauth]` | eyni | ✅ |
| `/api/upload` | eyni | ✅ |
| `/api/feed` | eyni | ✅ |
| `/api/search` | eyni | ✅ |
| `/api/events/[id]/ics` | eyni | ✅ |
| `/api/stats/where-are-we-now` | `/api/v1/cohorts/{slug}/stats/where-are-we-now` | ✅ |

**Plan əhatəsi: 6/6 = 100%.** Faktiki səth planı **çox aşır**: 42 `route.ts` faylı, **53 HTTP operation**.

Metod bölgüsü (`GET`/`POST`/`PATCH`/`DELETE`): **35 / 10 / 3 / 3** = 51, üstəgəl `/api/auth/[...nextauth]`-un destrukturlaşdırılmış `GET`+`POST`-u = **53**.

### 4.4 Sənədləşmə

| Ölçü | Rəqəm |
|---|---:|
| Kod operation-ları | 53 |
| `docs/openapi.json`-da sənədləşmiş | 47 |
| Səbəbli ağ siyahıda (sənədə salınmaması QƏRARdır) | 5 |
| **Nə sənəddə, nə ağ siyahıda** | **1** |

**Sənədləşmə əhatəsi: 52/53 = 98.1%.**

### 4.5 Çəkili orta

| Ölçü | Nəticə | Çəki | Səbəb |
|---|---:|---:|---|
| Modullar (17/17) | 100% | **40%** | Sprintin əsas subyekti «funksionallıq»dır; modul spesifikasiyanın (§20) öz vahididir |
| Səhifələr (43/43) | 100% | **25%** | Frontend deliverable-ların birbaşa ölçüsü |
| API endpoint-ləri (6/6 plan) | 100% | **20%** | Backend deliverable-ların ölçüsü; plan məxrəci kiçikdir, ona görə çəkisi modullardan aşağıdır |
| Sənədləşmə (52/53) | 98.1% | **15%** | Ayrıca acceptance meyarı, amma miqyası kiçikdir |

**Çəkili orta = 0.40·100 + 0.25·100 + 0.20·100 + 0.15·98.1 = 99.7%**

> 🔴 **BU RƏQƏMİ TƏK BAŞINA TƏQDİM ETMƏ.** O, yalnız «PLAN.md-də yazılanın nə
> qədəri kodlaşdı» sualına cavab verir. Sprint 3/4 qəbul meyarları **konyunksiyadır**:
> deploy meyarı 0%-dirsə, funksional 99.7% sprinti keçirmir. Komanda qarşısında
> düzgün formulə budur:
>
> **«Funksional əhatə: PLAN.md miqyasında 99.7%. Sprint 3 qəbul meyarları: 7-dən
> 1-i tam. Sprint 4 qəbul meyarları: 8-dən 1-i tam.»**

---

## 5. API sənədləşməsi — proqram tutuşdurması (fərq sıfır olmalıydı)

**Metod:** müvəqqəti script (`/tmp`-də, repoda yox) `src/app/api` altındakı hər
`route.ts`-in export etdiyi HTTP metodlarını çıxarıb `docs/openapi.json`-dakı
`path`+`method` cütləri ilə tutuşdurdu.

```
route.ts fayl sayı            : 42
kodda export olunan operation : 51  (+2 → /api/auth/[...nextauth] destrukturlaşdırma)
openapi.json path sayı        : 37
openapi.json operation sayı   : 47
kod metod bölgüsü             : {"GET":35,"POST":10,"PATCH":3,"DELETE":3}
```

### 5.1 «Sənəddə var, kodda yox» (fantom)

**0.** Fərq yoxdur — `docs/openapi.json` sənədləşdirdiyi hər əməliyyat kodda mövcuddur.

### 5.2 «Kodda var, sənəddə yox»

| Operation | Növ | Səbəb sənədləşibmi? |
|---|---|---|
| `GET /api/auth/[...nextauth]` | **framework** (Auth.js v5 `handlers`) | ✅ `src/lib/api/openapi.test.ts:80-82` ağ siyahısında |
| `POST /api/auth/[...nextauth]` | **framework** | ✅ eyni yerdə |
| `GET /api/feed` | daxili UI müqaviləsi | ✅ `openapi.test.ts:77` + `docs/ARCHITECTURE.md:499` |
| `GET /api/search` | daxili UI müqaviləsi | ✅ `openapi.test.ts:78` + `docs/ARCHITECTURE.md` §8 |
| `GET /api/session/expired` | Auth.js yönləndirmə qaçışı | ✅ `openapi.test.ts:79` |
| **`GET /api/v1/openapi.json`** | sənədin özünü verən route | ❌ **heç yerdə elan edilməyib** |

### 5.3 🔴 Tapıntı — drift qoruyucusunda kor nöqtə

`src/lib/api/openapi.test.ts:811`:

```ts
const discovered = discoverApiRoutes().filter((p) => !p.startsWith("/api/v1"));
```

Ağ siyahı testi **`/api/v1`-i tamamilə kənarlaşdırır**, və ayrıca «bütün v1 route-ları
sənəddədir» testi **yoxdur** (`grep -n "api/v1" openapi.test.ts` — yalnız sabit
gözləmə siyahıları var, tam skan yoxdur).

**Nəticəsi:** bu gün `/api/v1/openapi.json` sənəddən kənarda qalıb və heç bir test
qırmızıya düşmür. Sabah kimsə `/api/v1/yeni-endpoint` əlavə etsə və sənədə salmasa —
**yenə heç bir test qırmızıya düşməyəcək**. Sprint 3 B5 və Sprint 4 B5 məhz bu
qarantiyanı tələb edir.

**Düzəliş (≈1 saat):** `discoverApiRoutes()` filtrini götür, `/api/v1/openapi.json`-u
ağ siyahıya səbəblə əlavə et («sənədin özünü verən meta-route — sənədin içində
görünməsi rekursiv olardı»).

### 5.4 Müsbət tərəf

Snapshot drift-i **qorunur**: `npm run build` (→ `prebuild` → `docs:openapi`)
işlədikdən sonra `docs/openapi.json` **baytbabayt dəyişmədi** (`diff -q` → identik).
Yəni repodakı statik sənəd kodla sinxrondur — `openapi.test.ts:887-894` bunu testlə
də qoruyur.

---

## 6. İcazələr (Authorization)

### 6.1 Route → guard cədvəli

| Guard | Route sayı | Qeyd |
|---|---:|---|
| `withAdmin` | 5 | `/api/v1/admin/{audit,reports,reports/[id]/resolve,stats,users}` |
| `withUser` | 20 | cohort-a bağlı bütün `/api/v1` route-ları |
| `withViewer` | 10 | anonim də oxuya bilər, məxfilik servisdədir |
| `requireUser()` birbaşa | 2 | `/api/upload` (`route.ts:39,50`), `/api/events/[id]/ics` (`route.ts:31`) |
| **Qapısız — QƏSDƏN** | 5 | `/api/auth/[...nextauth]` (framework) · `/api/v1/auth/{login,logout,register}` (qapı olsa giriş mümkün olmazdı) · `/api/session/expired` (kuka silir, məlumat vermir) |
| **Qapısız — ictimai məzmun** | 5 | `/api/v1/{content/pages,faculties,faq,guide-places,health}`, `/api/v1/openapi.json` |
| `getViewer()` + servis filtri | 2 | `/api/feed:27`, `/api/search` — anonim `PUBLIC` görür, qərar `visibilityWhere`-dədir |

**Qapısız qalmış, qapı LAZIM olan route: 0.**

### 6.2 Servis qatı

`assertFreshAdmin` — **37 çağırış**, 8 servisə yayılıb:

| Servis | Çağırış |
|---|---:|
| `admin-content.service.ts` | 10 |
| `moderation.service.ts` | 8 |
| `admin-users.service.ts` | 5 |
| `audit.service.ts` | 4 |
| `admin-cohorts.service.ts` | 4 |
| `admin.service.ts` | 2 |
| `achievement.service.ts` | 2 |
| `sis-import.service.ts` | 2 |

Tərif: `src/lib/admin-guard.ts:62`.

### 6.3 🔴 Guard var ≠ icazə doğrudur — test sübutu

Üç həssas endpoint üçün **403 real olaraq ölçülür**:

`tests/e2e/admin.spec.ts:119-138`:

```ts
test("🔴 adi üzv admin API endpoint-lərindən 403 alır", async ({ browser }) => {
  await login(page, MEMBER_EMAIL);
  for (const path of [
    "/api/v1/admin/stats",
    "/api/v1/admin/reports",   // ← moderasiya
    "/api/v1/admin/audit",     // ← audit
    "/api/v1/admin/users",     // ← istifadəçi idarəetməsi
  ]) {
    const response = await page.request.get(path);
    expect(response.status(), `${path} statusu`).toBe(403);
    expect(body.error?.code).toBe("FORBIDDEN");
    expect(response.headers()["content-type"]).toContain("application/json");
  }
});
```

Üçü də (users, audit, moderation/reports) əhatə olunub. ✅

401 tərəfi də ölçülür — `tests/e2e/api.spec.ts:182-184,238-241` və
`tests/integration/api.db.test.ts:183-195, 791-797, 874-883, 1002-1011, 1117-1127`.

Əlavə keyfiyyət: `tests/integration/api.db.test.ts:290-328` üzv olmayan sinif üçün
**403 DEYİL, 404** tələb edir (`expect(response.status()).not.toBe(403)`) — sinfin
mövcudluğu da məlumatdır və sızmamalıdır.

---

## 7. Responsive — realda nə ölçülüb

> 🔴 `sm:` / `md:` class-larının qrep sayı bu sənəddə **istifadə edilməyib** — o, sübut deyil.

### 7.1 Playwright-da REAL viewport

| Fayl:sətir | Viewport-lar | Nəyi ölçür | Hansı route |
|---|---|---|---|
| `tests/e2e/landing.spec.ts:329-355` | 360 · 767 · 768 · 1024 · 1280 · 1536 | üfüqi sürüşmə = 0 | `/` |
| `tests/e2e/landing.spec.ts:309-325` | 360×720 | mobil menyu açılır, naviqasiya işləyir | `/` |
| `tests/e2e/landing.spec.ts:358-362` | 360×740 | kart qridi viewport-dan geniş deyil | `/` |
| `tests/e2e/public.spec.ts:581-597` | 360×720 | üfüqi sürüşmə ≤ 1px | `/`, `/khankendi`, `/khankendi/[id]`, `/faculties`, `/faq`, `/events` |
| `tests/e2e/a11y-keyboard.spec.ts:241` | 375×812 | mobil Sheet fokus tələsi, Esc | `/` |

`playwright.config.ts:34` — yeganə layihə `chromium` / `Desktop Chrome`.
**Ayrıca mobil layihə (`devices["iPhone 13"]` və s.) YOXDUR.**

### 7.2 Script ilə ölçmə (`npm run audit:responsive`)

`docs/responsive/report.md` (Blok 12C) — **11 səhifə × 5 breakpoint (375/768/1024/1280/1536) = 51 PNG**:

`admin-users`, `class`, `directory`, `feed`, `khankendi`, `landing`, `login`, `map`, `privacy`, `timeline` (+ `report.md`).

Nəticələr:
- Üfüqi sürüşmə: **tapıntı yoxdur** ✅
- Toxunma hədəfi WCAG 2.2 AA (24px): **tapıntı yoxdur** ✅
- KUDS tövsiyəsi (44px): 351 element altındadır — əksəriyyəti `src/components/ui/`-dəki shadcn primitivləridir (`h-9` = 36px), o qovluq CLAUDE.md §1-ə görə toxunulmazdır

### 7.3 Hökm

**Ölçülmüş: 11/51 səhifə (21.6%).** Qalan **40 səhifə responsive baxımından ÖLÇÜLMƏYİB.**
Kod səviyyəsində ehtimal ki, işləyir (eyni layout qabıqları, eyni KUDS grid), amma
bu, sübut deyil və Sprint 3 F3 / Sprint 4 F3 «bütün səhifələr» deyir.

**Ən ucuz bağlanma:** `scripts/responsive-shots.ts`-dəki səhifə siyahısını genişləndir
(script hazırdır, ölçmə məntiqi işləyir) — ~4 saat.

---

## 8. 🔴 Loading state — ən böyük frontend borcu

### 8.1 Rəqəmlər

| Ölçü | Nəticə |
|---|---:|
| Cəmi `page.tsx` | 51 |
| Server komponent + `await` | **37** |
| `loading.tsx` ilə əhatə olunan | **9** (yalnız `(admin)`) |
| `loading.tsx` OLMAYAN | **42** |
| `error.tsx` ilə əhatə olunan | **51** ✅ |
| `not-found.tsx` ilə əhatə olunan | **51** ✅ |
| `global-error.tsx` | var ✅ |
| **RİSKLİ: server + `await`, nə `loading.tsx`, nə `<Suspense>`** | **31** |

Mövcud fayllar:
```
loading.tsx     : src/app/(admin)/loading.tsx                        ← YEGANƏ
error.tsx       : src/app/error.tsx, (admin)/, (app)/, (public)/     ← 4
not-found.tsx   : src/app/not-found.tsx, (admin)/, (app)/, (public)/ ← 4
global-error.tsx: src/app/global-error.tsx                           ← 1
```

### 8.2 Skeleton var ≠ loading state var

`<Skeleton>` komponenti **24 faylda** işlənir (`src/components/ui/skeleton.tsx`,
`PageSkeleton`, `ChartSkeleton`, `MapSkeleton`). **Lakin bunlar client komponentlərin
içindədir** — TanStack Query `isLoading` və `next/dynamic(..., { loading })` üçün.
Route seqmenti səviyyəsində Suspense sərhədi yaratmırlar.

`src/app` altında `<Suspense>` cəmi **2 yerdə**: `(admin)/loading.tsx` və
`(app)/class/[slug]/page.tsx`.

**Nəticə:** aşağıdakı 31 route-da server `await` bitənə qədər istifadəçiyə heç nə
göstərilmir (soyuq naviqasiyada boş ekran, client naviqasiyada donmuş köhnə səhifə):

```
/class/[slug]/{achievements,achievements/moderation,directory,events,feed,
               map,memories,support,timeline,yearbook}
/events/[id], /events/[id]/manage, /events/[id]/report
/home, /me, /me/career, /me/edit, /me/privacy
/notifications, /search, /u/[userId]
/accessibility, /events, /faculties, /faculties/[slug], /faq,
/khankendi, /khankendi/[id], /legal/[slug], /login, /register
```

### 8.3 ⚠️ Bu, səhv deyil — SƏNƏDLƏŞMİŞ QƏRARdır (amma yenə də borcdur)

`STATE.md:1652-1663` (Blok 12C) məsələni açıq yazır:

> `loading.tsx` seqmenti AXINLA render edir → HTTP statusu məzmundan ƏVVƏL
> göndərilir → sonrakı `notFound()` statusu dəyişə bilmir.
>
> ```
> (app)/loading.tsx VAR  → GET /class/<yoxdur> = 200  🔴
> (app)/loading.tsx YOX  → GET /class/<yoxdur> = 404  ✓
> ```
>
> `(app)` + `(public)`-də **25 səhifə** `notFound()` çağırır və üç mövcud e2e testi
> 404 statusunu ölçür.

Yəni qrup səviyyəsində `loading.tsx` əlavə etmək **404 semantikasını sındırardı** —
qərar əsaslıdır.

**Amma sprint meyarı «loading state bütün uyğun səhifələrdə» deyir, «route qrupunda
`loading.tsx` olsun» demir.** Doğru həll qrup səviyyəsi deyil, **səhifə daxilində
`<Suspense>`**: `notFound()` çağırışından SONRA, məzmun hissəsinin ətrafında.
Status artıq qərarlaşıb, axın isə skeleton göstərə bilir. `PageSkeleton` komponenti
onsuz da hazırdır (`src/components/shared/PageSkeleton.tsx`).

**Təxmini iş:** 31 səhifə × ~10 dəq = **≈6 saat** (ən ağır 10 səhifə üçün 2 saat).

### 8.4 Empty state — bu tərəf yaxşıdır

| Ölçü | Nəticə |
|---|---:|
| `EmptyState` idxal edən komponent | **48** |
| `.map((` işlədən komponent (ümumi) | 123 |
| — `EmptyState` ilə | **44** |
| — `.length` şərti ilə | 30 |
| — heç biri | 49 |

«Heç biri» qrupunun böyük hissəsi **məlumat siyahısı deyil**: filtr/form komponentləri
(`AchievementFilters`, `AdminUserFilters`, `AuditFilters`, `ReportFilters`,
`TimelineFilters`, `MemoryFilters`, `NotificationFilters`, `VisibilitySelector`),
diaqramlar (`ActivityChart`, `AttendanceChart`) və dizayn bələdçisi
(`kuds/*` 3 fayl) — hamısı statik seçim massivləri üzərində `.map()` edir.

Yoxlanmış həqiqi məlumat siyahıları:
- `CareerTimeline.tsx` — valideyn `ProfileStory.tsx:215` `EmptyState` göstərir ✅
- `AdminContent.tsx:54,73,92` — üç CMS siyahısı yalnız `(${x.length})` sayı yazır, boş halda izahlı mətn yoxdur ⚠️ (kiçik borc, ~30 dəq)

`tests/e2e/empty-states.spec.ts` — 12 test, boş vəziyyət gəzintisi + 404 sərhədləri.

---

## 9. Performans işarələri

### 9.1 Şəkil optimizasiyası

| Ölçü | Nəticə |
|---|---:|
| `next/image` idxal edən fayl | **19** |
| Xam `<img>` | **1** |

Yeganə xam `<img>`: `src/features/profile/StoryHeader.tsx:77` — səbəb `:61`-də
yazılıb: xarici host ünvanı, `next/image` `remotePatterns`-ə əlavə tələb edərdi.

### 9.2 Lazy loading

| Ağır kitabxana | Vəziyyət | Sübut |
|---|---|---|
| **Recharts** | ✅ 4/4 lazy | `ActivityChart.lazy.tsx:25`, `AttendanceChart.lazy.tsx:14`, `BucketBarChart.lazy.tsx:17`, `IndustriesChart.lazy.tsx:16` |
| **react-simple-maps** | ✅ 2/2 qabıq lazy | `MapTabs.tsx:24` (`WorldMap`, `AzerbaijanMap`), `GuideMapPanel.tsx:16` (`KhankendiMap`) — hamısı `ssr: false` + `MapSkeleton` |
| **swagger-ui-dist** | ✅ bundle-a düşmür | `src/features/docs/ApiDocs.tsx:40-43` — runtime-da `<script>` inyeksiyası, `public/swagger/`-dən |
| **Tiptap** | ➖ aid deyil | Layihədə yoxdur (`package.json`-da mövcud deyil) |
| framer-motion | ⚠️ birbaşa | Ölçüsü kiçikdir, ayrıca lazy edilməyib |

### 9.3 First Load JS — build çıxışından

Paylaşılan baza: **102 kB**. **250 kB-ı keçən yeganə route: 1.**

| Route | First Load JS |
|---|---:|
| `/class/[slug]/feed` | **253 kB** 🔴 |
| `/class/[slug]/memories` | 232 kB |
| `/class/[slug]/events` | 226 kB |
| `/me/career` | 216 kB |
| `/events/[id]/manage` | 202 kB |
| `/me/edit` | 201 kB |
| `/kuds` | 183 kB *(daxili səhifə)* |
| `/class/[slug]/directory` | 182 kB |
| `/class/[slug]/timeline` | 181 kB |
| `/register` | 178 kB |
| `/me/privacy` | 164 kB |
| qalan 83 route | ≤ 162 kB |

Blok 12C-də azalma ölçülüb (`STATE.md:1670`): `/class/[slug]/map` 279 → **159 kB**,
`/events/[id]` 275 → **162 kB**.

### 9.4 Lighthouse

| Profil | Səhifə | Perf | A11y | BP | SEO |
|---|---|---:|---:|---:|---:|
| desktop | `/`, `/home`, `/class/[slug]/directory`, `/class/[slug]/map`, `/admin` | **100** | 100 | 100 | 100 |
| mobil | `/admin` | 90 | 100 | — | — |
| mobil | `/class/[slug]/directory` | 94 | 100 | — | — |
| mobil | `/home` | **87** | 100 | — | — |
| mobil | `/` | 92 | 100 | — | — |
| mobil | `/class/[slug]/map` | 92 | 100 | — | — |

Mobil `/home` = 87-nin səbəbi sənədləşib (`STATE.md:1668`): `/home` yönləndirmədir,
600 ms alır; hədəf səhifə birbaşa ölçüləndə **91**.

### 9.5 `force-dynamic` — 80 route

`export const dynamic = "force-dynamic"` **80 yerdə** (+ 1 `force-static`:
`/api/v1/openapi.json`). Build çıxışı: **94 route-dan 92-si dinamik (ƒ), 2-si statik (○)**.

**Bu lüzumsuz statikləşdirmə itkisidirmi? — Xeyr, və bu ölçülüb.**

- `(public)` route-larının hamısı onsuz da dinamikdir, çünki `PublicShell.tsx:119` →
  `ConsentGate.tsx:26` → `await cookies()`. Sübut `STATE.md:1664-1667`: «`/docs`
  DB-yə toxunmur, yenə `ƒ`» — və doğrudan da `src/app/(public)/docs/page.tsx:15`-də
  `force-dynamic` **yoxdur**, buna baxmayaraq build onu `ƒ` göstərir.
- Məzmun səhifələri (`/about` və s.) admin CMS-dən oxuyur — statik render redaktədən
  sonra köhnə mətni əbədi göstərərdi (`src/app/(public)/about/page.tsx:8-10`).
- `/legal/[slug]`-da `generateStaticParams` qəsdən yoxdur, səbəbi `page.tsx:31-34`-də.

Ölçülmüş itki yoxdur: `server-response-time` 20–40 ms, desktop Lighthouse 100.

**Deploy baxımından isə bu vacib müsbətdir:** heç bir səhifə build zamanı prerender
olunmur → build DB tələb etmir (bax §12).

---

## 10. Deployment fizibiliti

### 10.1 Deploy maneləri — koddan tapılmış

| # | Manе | Fayl:sətir | Nə üçün mane |
|---|---|---|---|
| **1** | **SQLite provider** | `prisma/schema.prisma:26` → `provider = "sqlite"` | Serverless fayl sistemi efemerdir; hər soyuq başlanğıcda baza itər |
| **2** | **Lokal DB yolu** | `.env.example:22` → `DATABASE_URL="file:./dev.db"` (yol `prisma/`-a nisbətdir) · fayl: `prisma/dev.db` (1.8 MB, `.gitignore:46`-dadır) | Bulud mühitində belə fayl yoxdur |
| **3** | **Miqrasiya kilidi** | `prisma/migrations/migration_lock.toml` → `provider = "sqlite"` · 3 miqrasiya qovluğu | Provider dəyişəndə Prisma **P3019** ilə dayanır. Bax §10.3 |
| **4** | **Yerli diskə yazma** | `src/services/storage.ts:16` (`mkdir`, `writeFile`), `:199-202` → `public/uploads/YYYY/MM/*.webp` | Serverless-də FS **read-only**-dir (yalnız `/tmp` yazıla bilər və o da efemerdir) |
| **5** | **Yükləmə route-u** | `src/app/api/upload/route.ts:25` → `export const runtime = "nodejs"` | Edge deyil — düzgündür, amma FS yazısı hələ də manedir (4 ilə eyni kök) |
| **6** | `sharp` | `src/services/storage.ts:18`, `package.json` dependency `^0.35.3` | ⚠️ **Mane DEYİL.** Vercel/Node runtime `sharp`-ı dəstəkləyir (prebuilt linux-x64 binar). Docker-də `node:20-slim` kifayətdir |
| **7** | Native binding-lər | `better-sqlite3` / `libsql` **YOXDUR** (`grep` → 0 nəticə). Yalnız Prisma engine: `node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node` | ⚠️ **Mane DEYİL**, amma platformaya bağlıdır — bax §10.2 |
| **8** | `public/swagger/` | `.gitignore:33` → repoda yoxdur. `package.json` → `prebuild: npm run docs:assets && npm run docs:openapi` → `scripts/copy-swagger.mjs` | ⚠️ **Mane DEYİL.** `prebuild` `next build`-dən əvvəl avtomatik işləyir və `public/`-i doldurur; Next `public/`-i deploy çıxışına daxil edir. Deploy-da təkrarlanacaq ✅ |
| **9** | **Seed** | `prisma/seed.ts` (1868 sətir) · `package.json` → `prisma.seed: tsx prisma/seed.ts` | Seed **destruktivdir** (`seed.ts:306-310` → `deleteMany()` zənciri). Deploy-dan sonra **BİR DƏFƏ** işlədilməlidir; təkrar işləməsi bütün istifadəçi datasını silər |
| **10** | **`postinstall` yoxdur** | `package.json` → `postinstall: YOXDUR` | `@prisma/client`-in öz `postinstall`-u (`node scripts/postinstall.js`) `prisma generate` işlədir, **amma yalnız paket həqiqətən quraşdırılanda**. Vercel `node_modules`-u keşləyəndə hook işləmir → köhnə klient riski. Prisma sənədi `build`-ə `prisma generate` əlavə etməyi tövsiyə edir |
| **11** | **Deploy artefaktı yoxdur** | `ls Dockerfile*` → yox · `ls vercel.json` → yox · `ls -a .github` → yox · `next.config.ts`-də `output` **təyin edilməyib** | Docker yolunu seçsək `output: "standalone"` lazımdır |

**Müsbət başlanğıc nöqtəsi:** kod artıq GitHub-dadır — `origin` =
`https://github.com/ElmeddinH/qu-class.git`, `git rev-list --left-right --count
origin/main...HEAD` → `0  0` (tam sinxron, 42 commit). Vercel/Railway birbaşa repodan
qoşula bilər.

### 10.2 Mühit dəyişənləri — `.env.example` ↔ kod tutuşdurması

**Metod:** `grep -rhno "process\.env\.[A-Z_][A-Z0-9_]*" src scripts prisma next.config.ts playwright.config.ts vitest.config.ts | sort -u`

| Dəyişən | `.env.example` | Kodda `process.env` | Qeyd |
|---|---|---|---|
| `DATABASE_URL` | ✅ `:22` | — | Prisma özü oxuyur (`schema.prisma:27`) |
| `AUTH_SECRET` | ✅ `:26` | — | Auth.js özü oxuyur |
| `AUTH_TRUST_HOST` | ✅ `:32` | — | Auth.js özü oxuyur. **İstehsalda MƏCBURİ** (Vercel avtomatik qoyur) |
| `AUTH_URL` | ✅ `:42` (şərhli) | ✅ `src/auth.config.ts:27` | `https://` prefiksi kuka `__Secure-` bayrağını açır — **deploy-da mütləq qoyulmalıdır** |
| `NEXTAUTH_URL` | ❌ **YOX** | ✅ `src/auth.config.ts:27` | Auth.js v4 uyğunluq fallback-i; `.env.example`-da izah edilməyib |
| `NODE_ENV` | ➖ | ✅ `src/lib/db.ts:24,30` | Platforma özü qoyur |
| `CI` | ➖ | ✅ | Platforma özü qoyur |
| `LH_*` (6 ədəd) | ✅ `:54-59` | ✅ `scripts/lighthouse-audit.ts` | Audit aləti, deploy üçün lazım deyil |
| `SHOTS_BASE_URL / OUT_DIR / ONLY / EMAIL / PASSWORD` | ✅ `:61-65` | ✅ | Audit aləti |
| `SHOTS_FULL_PAGE` | ❌ **YOX** | ✅ `scripts/screenshots.ts:70` | Audit aləti |
| `SHOTS_CONSENT` | ❌ **YOX** | ✅ `scripts/screenshots.ts:71` | Audit aləti |
| `FIXED_NOW` | ❌ **YOX** | ✅ `scripts/freeze-clock.cjs:32` | Ekran görüntüsü saatı |
| `FIXED_NOW_QUIET` | ❌ **YOX** | ✅ `scripts/freeze-clock.cjs:76` | Eyni |
| `E2E_PORT` | ✅ `:67` | ✅ | Test |
| `GITHUB_TOKEN` / `GITHUB_REPO` | ⚠️ qəsdən YOX | ✅ `scripts/git-push.mjs` | `.env.example:70-88`-də səbəb yazılıb (təhlükəsizlik) |

**Tapıntı:** `.env.example`-da olmayan 5 dəyişən var (`NEXTAUTH_URL`, `SHOTS_FULL_PAGE`,
`SHOTS_CONSENT`, `FIXED_NOW`, `FIXED_NOW_QUIET`). **Heç biri deploy üçün kritik deyil** —
biri auth fallback-i, dördü lokal audit alətidir. Yenə də `.env.example` «tam siyahı»
iddiası daşıyırsa, əlavə edilməlidir (~15 dəq).

**ICS HMAC yoxdur.** `src/app/api/events/[id]/ics/route.ts`-də HMAC/token/secret
mövcud deyil (`grep -n "hmac\|createHmac\|secret\|token"` → 0 nəticə). Təhlükəsizlik
`requireUser()` + `getEventForCalendar()`-un görünürlük filtri ilə təmin edilir
(`route.ts:31-36`, izah `:9-13`). Yəni bu env dəyişəni ümumiyyətlə lazım deyil.

**İstehsal üçün minimal env dəsti:**
```
DATABASE_URL="<bulud DB bağlantısı>"
AUTH_SECRET="<npx auth secret ilə yarat>"
AUTH_TRUST_HOST=true
AUTH_URL=https://<domen>          # ← kuka __Secure- prefiksi üçün
# + Variant A seçilsə: BLOB_READ_WRITE_TOKEN
```

### 10.3 🔴 «Prisma provider dəyişəndə `migrations` qovluğu nə olur?»

**Cavab: qovluq işləmir və silinməlidir.**

`prisma/migrations/migration_lock.toml` içində `provider = "sqlite"` yazılıb.
Sxemdəki `datasource.provider` dəyişəndə Prisma **P3019** xətası verir
(«The datasource provider specified in your schema does not match the one specified
in the migration_lock.toml»). Mövcud SQLite DDL-i (3 miqrasiya) Postgres sintaksisinə
uyğun deyil.

Yeganə yol:
```bash
rm -rf prisma/migrations
npx prisma migrate dev --name init      # Postgres-ə qarşı sıfırdan
npm run db:seed
```

**Bu addım layihədə artıq sənədləşib** — `docker-compose.yml:26-31` məhz bu dörd
addımı yazır və `README.md:647-656` + `docs/DECISIONS.md` QD-002 ona istinad edir.

**Nəticəsi:** miqrasiya tarixçəsi sıfırlanır. **İndi bunun qiyməti sıfırdır** (istehsal
datası yoxdur). Deploy-dan sonra isə bu keçid mümkün olmayacaq — yəni provider qərarı
**deploy-dan ƏVVƏL** verilməlidir.

**Yaxşı xəbər:** tətbiq kodunda dəyişiklik lazım deyil. Bütün enum-lar onsuz da
`String` sütundur və Zod ilə qorunur (`src/lib/enums.ts`) — bu, `docs/DECISIONS.md`
QD-005-də qəsdən verilmiş miqrasiya üstünlüyüdür.

### 10.4 İki variantın müqayisəsi

> Qərar VERİLMİR — seçim istifadəçinindir. Aşağıda hər ikisinin dəqiq qiyməti var.

#### Variant A — Vercel + Postgres (Neon/Supabase) + Blob storage

| Dəyişməli fayl | Nə dəyişir |
|---|---|
| `prisma/schema.prisma:26` | `provider = "sqlite"` → `"postgresql"` (TƏK sətir) |
| `prisma/migrations/` | **Tamamilə silinir**, yenidən yaradılır (§10.3) |
| `src/services/storage.ts:16,199-202` | `mkdir`/`writeFile` → `@vercel/blob` `put()`. ⚠️ Fayl özünü «TƏK fayl sistemi girişi olan modul» elan edir (`:5-9`) — dəyişiklik məhz bir faylla məhdudlaşır, bu iddia realdır |
| `package.json` | `+@vercel/blob` dependency · `+"postinstall": "prisma generate"` |
| `next.config.ts:9-21` | `images.remotePatterns`-ə blob hostu (`*.public.blob.vercel-storage.com`) |
| `.env.example` | `DATABASE_URL` Postgres formatı · `+BLOB_READ_WRITE_TOKEN` · `+AUTH_URL` |
| `README.md` | Deploy bölməsi |

| Ölçü | Qiymət |
|---|---|
| **Miqrasiya riski** | ⚠️ **Orta-yüksək.** İki müstəqil miqrasiya (DB + storage) eyni anda. `storage.ts` dəyişikliyi `MediaAsset` url-lərinin formatını dəyişir → mövcud seed məzmunu ilə uyğunluq yoxlanmalıdır |
| **Miqrasiya qovluğu** | Silinir, sıfırdan yaradılır (§10.3) |
| **Təxmini vaxt** | **6–10 saat** (DB 2s + storage 3s + deploy/env/debug 3s + seed və yoxlama 2s) |
| **Pulsuz plan** | ✅ Vercel Hobby + Neon free (0.5 GB) + Vercel Blob free (1 GB) — demo üçün kifayətdir |
| **Üstünlük** | Sənaye standartı; komanda üçün tanış link; avtomatik HTTPS; git push → deploy; `AUTH_TRUST_HOST` avtomatik |
| **Çatışmazlıq** | Ən çox kod dəyişikliyi; SQLite qərarı (QD-002) müdafiə mətnindən çıxarılmalıdır; oflayn demo (müdafiə otağında internet olmaya bilər) mümkün olmur |

#### Variant B — SQLite qalmaqla

**B1 — Turso / libSQL**

| Dəyişməli fayl | Nə dəyişir |
|---|---|
| `prisma/schema.prisma:21-23` | `generator client` → `previewFeatures = ["driverAdapters"]` |
| `src/lib/db.ts:15-27` | `new PrismaClient()` → `PrismaLibSQL` adapteri ilə |
| `package.json` | `+@prisma/adapter-libsql`, `+@libsql/client` |
| `src/services/storage.ts` | ⚠️ **Yenə dəyişməlidir** — Turso yalnız DB-dir, fayl saxlamır |

Risk: **Yüksək.** `driverAdapters` preview-dur; `prisma migrate` Turso-ya qarşı ayrı
CLI axını tələb edir; storage problemi həll olunmur. **Tövsiyə edilmir.**
Vaxt: 5–8 saat.

**B2 — Docker + persistent volume (Railway / Render / Fly.io)**

| Dəyişməli fayl | Nə dəyişir |
|---|---|
| `next.config.ts` | `+output: "standalone"` (TƏK sətir) |
| **`Dockerfile`** (YENİ) | multi-stage: `node:20-slim` → `npm ci` → `prisma generate` → `npm run build` → runtime image |
| `.env` (platformada) | `DATABASE_URL="file:/data/prod.db"` · `AUTH_SECRET` · `AUTH_TRUST_HOST=true` · `AUTH_URL=https://...` |
| Platforma konfiqi | Volume mount: `/data` (DB) + `/app/public/uploads` (şəkillər) |
| Release əmri | `npx prisma migrate deploy && npm run db:seed` (seed **bir dəfə**) |
| **`prisma/schema.prisma`** | ✅ **DƏYİŞMİR** |
| **`prisma/migrations/`** | ✅ **DƏYİŞMİR** — SQLite qalır, P3019 problemi yoxdur |
| **`src/services/storage.ts`** | ✅ **DƏYİŞMİR** — volume üzərində `writeFile` işləyir |

| Ölçü | Qiymət |
|---|---|
| **Miqrasiya riski** | ✅ **Aşağı.** Sxem, miqrasiyalar və storage toxunulmur. Yeganə yeni artefakt `Dockerfile`-dır |
| **Miqrasiya qovluğu** | Toxunulmur — mövcud 3 miqrasiya olduğu kimi işləyir |
| **Təxmini vaxt** | **3–5 saat** (Dockerfile 1.5s + volume/env konfiqi 1s + deploy/debug 1.5s + seed 0.5s) |
| **Pulsuz plan** | ⚠️ **Şərtli.** Fly.io: 1–3 GB volume pulsuz (kredit kartı tələb olunur). Railway: pulsuz plan məhdudlaşdırılıb ($5 kredit). Render: pulsuz web service **15 dəq passivlikdən sonra yatır** + pulsuz planda **disk YOXDUR** → Render bu variant üçün uyğun deyil |
| **Üstünlük** | Ən az kod dəyişikliyi; SQLite qərarı (QD-002) müdafiədə olduğu kimi qalır; `public/uploads` işləməyə davam edir; oflayn demo arqumenti korlanmır |
| **Çatışmazlıq** | **TƏK instansiya məhdudiyyəti** — SQLite çoxlu yazıcı dəstəkləmir, horizontal scale mümkün deyil (demo üçün problem deyil, amma müdafiədə sual gələ bilər); Dockerfile yazılmalıdır; pulsuz plan seçimi daralır |

#### Yan-yana

| | Variant A (Vercel+PG+Blob) | Variant B2 (Docker+volume) |
|---|---|---|
| Dəyişən mənbə faylı | **6** | **2** (`next.config.ts` + yeni `Dockerfile`) |
| Sxem dəyişikliyi | ✅ var | ❌ yox |
| Miqrasiya sıfırlanması | ✅ var | ❌ yox |
| `storage.ts` yenidən yazılması | ✅ var | ❌ yox |
| Vaxt | 6–10 saat | **3–5 saat** |
| Risk | orta-yüksək | **aşağı** |
| Pulsuz plan | ✅ rahat | ⚠️ platformadan asılı |
| Scale | ✅ | ❌ tək instansiya |

---

## 11. Bloklayıcılar — prioritetlə

> «Bu bitməsə sprint qəbul olunmur» olanlar əvvəldədir.

| # | Bloklayıcı | Niyə bloklayıcı | Saat |
|---|---|---|---|
| **1** | **Deploy edilmiş işlək versiya + link** | Sprint 3 meyar 2, 3, 7 və Sprint 4 meyar 5, 8 — beş meyarın qapısı. Variant seçilməli, sonra icra | **3–10** (variantdan asılı) |
| **2** | **Deploy-a qədər DB provider qərarı** | §10.3 — deploy-dan sonra provider dəyişikliyi mümkün olmayacaq. Qərar 1-ci addımdan ƏVVƏL verilməlidir | 0.5 (qərar) |
| **3** | **Loading state — 31 səhifə** | Sprint 3 F4 açıq şəkildə «bütün uyğun səhifələrdə» deyir. Səhifə daxili `<Suspense>` + mövcud `PageSkeleton` | **6** (ən ağır 10 səhifə üçün 2) |
| **4** | **Responsive — 40 ölçülməmiş səhifə** | Sprint 3 F3 + Sprint 4 F3/meyar 7 «bütün səhifələr». `scripts/responsive-shots.ts` hazırdır, siyahı genişləndirilməlidir | **4** |
| **5** | **OpenAPI kor nöqtəsi** (§5.3) | Sprint 3 B5 + Sprint 4 B5 «tam əhatə». Filtri götür + 1 ağ siyahı sətri | **1** |
| **6** | **README deploy bölməsi + canlı link** | Sprint 4 Z4 | **2** |
| **7** | **Canlı mühitdə E2E keçidi** | Sprint 4 Z2 «tam End-to-End yoxlanılmalı» — 212 test canlı URL-ə qarşı | **2** |
| **8** | **Sprint Review qeydlərinin əldə edilməsi** | Sprint 4 B2/F2/Z1 və meyar 2 — bu qeydlər olmadan üç deliverable ölçülə bilməz. **Kod işi deyil, komanda ilə əlaqə işidir** | 0.5 |
| 9 | Şifrə bərpası axını (STATE.md:1455) | Sprint 4 meyar 1/3 («100% / tam işlək») üçün ən görünən boşluq | 4 |
| 10 | `.env.example`-a 5 dəyişən + `postinstall: prisma generate` | Deploy sağlamlığı (§10.1 #10, §10.2) | 0.5 |

**Cəmi kritik yol (1–8): ≈ 19–26 saat.**

---

## 12. 🔴 `npm run build`-in keçməsi deploy hazırlığı DEMƏK DEYİL

Build lokal fayl sistemi və dolu `.env` ilə keçdi. Ayrıca yoxlanmalı üç sual —
**mühitə toxunmadan, yalnız koddan analiz**:

### 12.1 `next.config` içində `output` nədir?

**Təyin edilməyib** (`grep -n "output" next.config.ts` → 0 nəticə). Yəni default rejim:
`.next/` + tam `node_modules` tələb olunur.

- **Vercel üçün:** problem yoxdur, platforma özü paketləyir.
- **Docker üçün:** `output: "standalone"` **əlavə edilməlidir**, əks halda image-ə
  bütün `node_modules` (~500 qovluq) düşəcək.

### 12.2 Hər hansı route build zamanı DB-yə müraciət edirmi?

**Xeyr — və bu, təsadüf deyil.**

- Build çıxışı: **94 route-dan 92-si `ƒ` (dinamik)**. Statik yalnız 2:
  `/_not-found` və `/api/v1/openapi.json`.
- `/api/v1/openapi.json` `force-static`-dir, amma DB-yə toxunmur — sənəd tamamilə Zod
  sxemlərindən qurulur (`src/app/api/v1/openapi.json/route.ts:9-12`;
  `src/lib/api/openapi.ts` idxallarında `@/lib/db` yoxdur).
- `generateStaticParams` heç bir səhifədə **yoxdur** — `/legal/[slug]`-da qəsdən
  çıxarılıb (`page.tsx:31-34`), `academic.service.ts:226`-dakı funksiya yalnız e2e
  testi üçündür.
- `prebuild` addımı (`docs:assets` + `docs:openapi`) da DB-yə toxunmur —
  `scripts/export-openapi.ts` yalnız `buildOpenApiDocument()` çağırır.

**Nəticə:** SSG zamanı DB olmadığı üçün build sınmayacaq. ✅ Bu, deploy üçün ciddi
üstünlükdür (bir çox Next.js layihəsi məhz bu addımda sınır).

### 12.3 `.env` olmadan build keçirmi?

**Koddan analiz (mühitə toxunulmadı):**

- `src/lib/db.ts:22` — modul yüklənəndə `new PrismaClient()` çağırılır. Prisma 6-da
  konstruktor bağlantı **açmır**; `DATABASE_URL` yalnız ilk sorğuda tələb olunur.
  Heç bir route build zamanı sorğu etmədiyi üçün (12.2) bu nöqtə keçməlidir.
- `src/auth.ts` — `NextAuth(...)` modul səviyyəsində çağırılır, lakin `AUTH_SECRET`
  Auth.js tərəfindən **istək anında** tələb olunur, import anında yox.
- `src/auth.config.ts:27` — `process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? ""`
  — `??` zənciri `undefined`-ə dözür, boş sətir qaytarır. Sınmır.

**Ehtimal olunan nəticə: build `.env` olmadan da keçir.** ⚠️ Bu **analizdir, ölçmə
deyil** — tapşırıq mühitə toxunmağı qadağan etdiyi üçün sınaq aparılmadı.

**Amma `next start` `.env` olmadan İŞLƏMİR:**
- İlk DB sorğusu `PrismaClientInitializationError` verər (`DATABASE_URL` yoxdur).
- Auth.js `AUTH_SECRET` olmadan sessiya imzalaya bilməz.
- `AUTH_TRUST_HOST` qoyulmasa `next start` (production) rejimində giriş
  `UntrustedHost` ilə dayanar — bu, `.env.example:29-32`-də açıq yazılıb.

**Deploy dərsi:** platformada env dəyişənləri **build-dən əvvəl** qoyulmalıdır,
çünki build keçsə də runtime dərhal sınacaq və səbəb build loglarında görünməyəcək.

---

## 13. Bilinən borclar — 11A/11B-dən qalan və hələ bağlanmamış

### 13.1 Blok 11B-dən (STATE.md:1443-1461)

| Borc | Təsir |
|---|---|
| Cohort rolu **YALNIZ əsas sinifdə** dəyişdirilir (`user.cohorts[0]`) — servis `cohortId` alır, ekran işi qalıb | İki sinifdə üzv olan istifadəçi üçün ikinci sinfin rolu UI-dan idarə olunmur |
| **CMS-də YARATMA yoxdur**, yalnız redaktə — yeni `ContentPage`/`Faq`/`GuidePlace` seed-dən gəlir | Sprint 4 «bütün funksionallıqlar tam işlək» meyarına toxunur |
| Moderasiya növbəsində **toplu əməliyyat yoxdur** | Qəsdən (audit izi hər sətir üçün ayrıdır) |
| `/admin/import` **yalnız istifadəçi importudur** — cohort/ixtisas importu yoxdur | Qəsdən (say azdır, səhvin qiyməti yüksəkdir) |
| **Şifrə bərpası axını YOXDUR** — SIS ilə yaradılan hesab qeydiyyat formasından keçməlidir | 🔴 **Ən görünən boşluq.** `UNSET_PASSWORD_HASH` müqaviləsi hazırdır, axın yoxdur |
| `/admin/stats` cohort filtri daşımır | Kiçik |

### 13.2 Blok 11A-dan (STATE.md:1105-1120)

| Borc | Təsir |
|---|---|
| «Seçimlər» kuki düyməsi kateqoriya ekranı açmır → məxfilik bildirişinə aparır | ⚠️ **Qismən bağlanıb**: `tests/e2e/public.spec.ts:512` artıq «Seçimlər kateqoriya ekranı açılır» testini daşıyır — STATE.md bu nöqtədə köhnəlmişdir |
| Xankəndi xəritəsində **zoom/pan yoxdur** (10B-nin eyni borcu) | Kiçik |
| `/faculties/[slug]` sinif səhifəsinə link vermir | Qəsdən (auth arxasındadır) |
| Bildiriş mərkəzində «oxunmuşu geri qaytar» və silmə yoxdur | Qəsdən |
| İctimai məzmun səhifələrində axtarış yoxdur (yalnız `/faq`-da) | Kiçik |
| `ContentPage` üçün admin CMS 11B-dədir | ✅ **Bağlanıb** (`/admin/content` mövcuddur) |

### 13.3 Blok 10B-dən (STATE.md:895-907)

| Borc | Vəziyyət |
|---|---|
| Universitet miqyaslı analitika UI-ı yoxdur | ✅ **Bağlanıb** — `/admin/stats` (STATE.md:1139) |
| Xəritədə zoom/pan (`ZoomableGroup`) | ❌ Hələ açıq |
| `strictCrossDimension` UI-dan seçilə bilmir | Qəsdən (ölçmə aləti) |
| Təhsil pilləsi yalnız cari iş qeydi olan üzvlər üçün sayılır | Dataset məhdudiyyəti |

### 13.4 Bu auditdə tapılan YENİ borclar

| Borc | Yer | Saat |
|---|---|---|
| `loading.tsx` / `<Suspense>` 31 səhifədə yoxdur | §8 | 6 |
| Responsive 40 səhifədə ölçülməyib | §7 | 4 |
| OpenAPI drift qoruyucusu `/api/v1`-i skan etmir | §5.3 | 1 |
| `.env.example`-da 5 dəyişən yoxdur | §10.2 | 0.25 |
| `package.json`-da `postinstall: prisma generate` yoxdur | §10.1 #10 | 0.1 |
| `AdminContent.tsx:54,73,92` üç CMS siyahısında boş vəziyyət mətni yoxdur | §8.4 | 0.5 |
| README-də deploy bölməsi yoxdur | §3.3 Z4 | 2 |

---

## 14. Ölçmə jurnalı — əmrlər və xam çıxışlar

### 14.1 Qurulum sağlamlığı

```
$ npx tsc --noEmit
EXIT=0
(çıxış: 0 sətir — heç bir xəta)
```

```
$ npm run lint
> qu-class@0.1.0 lint
> eslint
EXIT=0
(çıxış: heç bir xəbərdarlıq/xəta)
```

```
$ npm run build
BUILD_EXIT=0
(prebuild → docs:assets + docs:openapi da daxil)

$ diff -q <build-dən əvvəlki docs/openapi.json> docs/openapi.json
OPENAPI_UNCHANGED          ← snapshot kodla sinxrondur, drift yoxdur
```

```
$ npx vitest run
 RUN  v4.1.10 /home/elmeddin/Documents/holberton/qu-class
 Test Files  65 passed (65)
      Tests  1759 passed (1759)
   Duration  59.11s
VITEST_EXIT=0
```

```
$ npx playwright test --list
Total: 212 tests in 20 files
(uzun çəkdiyi üçün YALNIZ siyahılandı, İŞLƏDİLMƏDİ)
```

### 14.2 Route sayı və statik/dinamik bölgü

```
$ grep -cE "^[├└┌] [○ƒ]" build.log
94                          ← cəmi route

$ grep -cE "^[├└┌].*○ " build.log
2                           ← STATİK (○)
$ grep -E "^[├└┌].*○ " build.log
├ ○ /_not-found                                      213 B         102 kB
├ ○ /api/v1/openapi.json                             213 B         102 kB

$ grep -cE "^[├└┌].*ƒ /" build.log
92                          ← DİNAMİK (ƒ)
```

Paylaşılan baza: `+ First Load JS shared by all  102 kB` · `ƒ Middleware  102 kB`

### 14.3 Səhifə inventarı

```
$ find src/app -name "page.tsx" | wc -l
51
$ find src/app -name "page.tsx" | grep -c "(admin)"
9
$ find src/app -name "page.tsx" | grep -c "(app)"
23
$ find src/app -name "page.tsx" | grep -c "(public)"
19
```

### 14.4 API inventarı və OpenAPI tutuşdurması

Müvəqqəti script: `/tmp/.../api-diff.mjs` (repoya qoyulmadı).

```
route.ts fayl sayı            : 42
kodda export olunan operation : 51
openapi.json path sayı        : 37
openapi.json operation sayı   : 47
kod metod bölgüsü             : {"GET":35,"POST":10,"PATCH":3,"DELETE":3}

--- SƏNƏDLƏŞMƏMİŞ (kodda var, openapi.json-da yox): 4 ---
GET /api/feed              <- src/app/api/feed/route.ts
GET /api/search            <- src/app/api/search/route.ts
GET /api/session/expired   <- src/app/api/session/expired/route.ts
GET /api/v1/openapi.json   <- src/app/api/v1/openapi.json/route.ts

--- FANTOM (openapi.json-da var, kodda yox): 0 ---
```

⚠️ Script `/api/auth/[...nextauth]`-u tutmadı, çünki route `export const { GET, POST } = handlers;`
formasındadır (destrukturlaşdırma). Əl ilə yoxlandı — `route.ts:6`. Düzəldilmiş cəm: **53 operation**.

### 14.5 Vəziyyət (state) əhatəsi

Müvəqqəti script: `/tmp/.../state-audit.mjs`.

```
CƏMİ page.tsx                      : 51
server komponent + await           : 37
loading.tsx ilə əhatə olunan       : 9
loading.tsx OLMAYAN                : 42
error.tsx ilə əhatə olunan         : 51
not-found.tsx ilə əhatə olunan     : 51

🔴 RİSKLİ (server + await, nə loading.tsx, nə Suspense): 31
```

```
$ find src/app -name "loading.tsx"
src/app/(admin)/loading.tsx

$ find src/app -name "error.tsx"
src/app/error.tsx · (admin)/ · (app)/ · (public)/

$ find src/app -name "not-found.tsx"
src/app/not-found.tsx · (admin)/ · (app)/ · (public)/

$ find src/app -name "global-error.tsx"
src/app/global-error.tsx

$ grep -rln "Suspense" src/app
src/app/(admin)/loading.tsx
src/app/(app)/class/[slug]/page.tsx
```

Empty state:
```
$ grep -rl "EmptyState" src --include=*.tsx | wc -l
49                         ← EmptyState.tsx-in özü daxil → 48 istehlakçı

.map(( işlədən komponentlərin bölgüsü:
44 EMPTY-OK  ·  30 LEN-GUARD  ·  49 NO-EMPTY   (cəmi 123)
```

### 14.6 Performans

```
$ grep -rln 'from "next/image"' src | wc -l
19
$ grep -rn "<img[ >]" src --include=*.tsx
src/features/profile/StoryHeader.tsx:61   (şərh)
src/features/profile/StoryHeader.tsx:77   (yeganə real <img>)

$ grep -rn "next/dynamic" src --include=*.tsx
src/features/admin/ActivityChart.lazy.tsx:25
src/features/events/AttendanceChart.lazy.tsx:14
src/features/guide/GuideMapPanel.tsx:16
src/features/where-are-we-now/BucketBarChart.lazy.tsx:17
src/features/where-are-we-now/IndustriesChart.lazy.tsx:16
src/features/where-are-we-now/MapTabs.tsx:24

$ grep -rn 'export const dynamic' src | wc -l
81                        ← 80 force-dynamic + 1 force-static
```

### 14.7 İcazələr

```
$ grep -rn "await assertFreshAdmin(viewer)" src --include=*.ts | wc -l
37

$ grep -rc "await assertFreshAdmin(viewer)" src/services/*.ts | grep -v ":0"
admin-content.service.ts:10 · moderation.service.ts:8 · admin-users.service.ts:5
audit.service.ts:4 · admin-cohorts.service.ts:4 · admin.service.ts:2
achievement.service.ts:2 · sis-import.service.ts:2
```

### 14.8 Deployment

```
$ ls Dockerfile*      → NO Dockerfile
$ ls vercel.json      → NO vercel.json
$ ls -a .github       → NO .github
$ grep -n "output" next.config.ts   → (nəticə yoxdur)

$ cat prisma/migrations/migration_lock.toml
provider = "sqlite"

$ ls prisma/migrations/
20260729144758_init · 20260729234920_gw_inspired_additions
20260730164941_admin_deactivation · migration_lock.toml

$ ls -la prisma/dev.db
-rw-r--r-- 1 elmeddin elmeddin 1794048 Aug 18 10:33 prisma/dev.db

$ grep -rn "generateStaticParams" src
src/app/(public)/legal/[slug]/page.tsx:31   (şərh — QƏSDƏN yoxdur)
src/services/academic.service.ts:226        (yalnız e2e üçün)

$ grep -n "better-sqlite3\|libsql" package.json   → (nəticə yoxdur)

$ node -e "require('./package.json').scripts.postinstall"
YOXDUR

$ git remote -v
origin  https://github.com/ElmeddinH/qu-class.git (fetch/push)
$ git rev-list --left-right --count origin/main...HEAD
0       0                  ← origin/main ilə tam sinxron
$ git rev-list --count HEAD
42
```

### 14.9 Lighthouse (mövcud artefaktlar, `docs/lighthouse/`)

```
desktop:  admin 100 | directory 100 | home 100 | landing 100 | map 100   (perf/a11y/bp/seo hamısı 100)
mobil:    admin  perf 90 · LCP 3.3s · TBT 190ms · CLS 0
          directory perf 94 · LCP 3.1s · TBT 60ms · CLS 0.035
          home   perf 87 · LCP 3.9s · TBT 110ms · CLS 0
          landing perf 92 · LCP 3.2s · TBT 80ms · CLS 0
          map    perf 92 · LCP 3.4s · TBT 60ms · CLS 0
```

### 14.10 Sprint şərtlərinin mənbəyi

```
$ grep -rn -i "sprint 3\|sprint 4\|13.08\|18.08" --include="*.md" .
(nəticə yoxdur)
```

⚠️ Sprint 3 və Sprint 4 şərtlərinin mətni **repoda yoxdur** — bu auditdə istifadə
olunan deliverable/acceptance siyahıları istifadəçi tərəfindən 18.08.2026-da təqdim
edilib. Sənədləşmə üçün onların `docs/` altına salınması tövsiyə olunur.

---

## 15. Nə DƏYİŞDİRİLDİ

**Yalnız bu fayl yaradıldı:** `docs/SPRINT-3-4-AUDIT.md`.

`npm run build` işlədildiyi üçün iki törəmə artefakt yeniləndi:
- `public/swagger/` — `.gitignore:33`-dədir, repoya girmir
- `docs/openapi.json` — **məzmunu dəyişmədi** (`diff -q` → identik)
- `.next/` — build çıxışı, `.gitignore`-dadır

Heç bir mənbə faylı redaktə/silinmədi. `npm install`, miqrasiya, seed **işlədilmədi**.
Müvəqqəti scriptlər yalnız `/tmp` altında saxlanıldı.
