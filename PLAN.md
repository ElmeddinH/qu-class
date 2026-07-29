# QU CLASS — İcra Planı

> **Layihə:** Qarabağ Universiteti tələbə və məzun sinif platforması
> **Kontekst:** Holberton School final (portfolio) layihəsi
> **Şüar:** Bir sinif. Bir hekayə. Ömürlük əlaqə.
> **Hədəf:** 17 modulun hamısı, lokal işləyən tam funksional sistem
> **Standart:** KUDS v1.0 (Karabakh University Digital Design System) — məcburi

**Nömrələmə konvensiyası:** `[M1]…[M17]` = spesifikasiyanın §20-dəki **yekun modul siyahısı**.
`spec §N` = spesifikasiya sənədinin **bölmə** nömrəsi. İkisi fərqlidir, qarışdırma.

---

## 0. TL;DR — 60 saniyəlik xülasə

| Sual | Cavab |
|---|---|
| Stack | Next.js 15 (App Router) + TypeScript + **Tailwind v3.4** + shadcn/ui + **Prisma 6** + SQLite |
| Backend | Next.js-in öz backend-i (Route Handlers + Server Actions) — ayrı server yoxdur |
| DB | SQLite lokal (`file:./dev.db`) → sonradan bir sətir dəyişməklə PostgreSQL |
| Auth | Auth.js v5 (NextAuth), Credentials provider + bcrypt, **JWT** sessiya |
| Fayllar | Lokal `public/uploads/` → sonradan S3/UploadThing |
| Necə qururuq | **Claude Code (VS Code terminalında)** — 14 blok (0-13) |
| Real vaxt | ~19 saat effektiv iş. Gün 1: Blok 0-10 (≈14s45d) · Gün 2: Blok 11-13 (≈4s30d) |
| Ən kritik hissə | Məxfilik/görünürlük mühərriki (`src/lib/visibility.ts`) — hər sorğudan keçir |
| Ən böyük risk | Scope. Blok sırasına *hərfi* riayət et |

⚠️ **Versiya pinləri danışılmazdır:** `tailwindcss@^3.4` (v4-də `tailwind.config.ts` yoxdur, bu paketdəki snippet işləməz) və `prisma@^6` (v7 sxem faylında `datasource.url`-i qəbul etmir).

---

## 1. Necə quraq? — Yolların müqayisəsi

Sən soruşdun: VS Code-dakı Claude Code, yoxsa birbaşa buradan (Cowork)? Hər yolu real olaraq müqayisə edirəm.

### Yol A — Claude Code (VS Code terminalında) ✅ **TÖVSİYƏ**

- `npm run dev` işləyir, hot reload var — dəyişikliyi dərhal brauzerdə görürsən
- Claude Code `npx prisma migrate`, `npm run build`, `tsc --noEmit` işlədib **öz səhvini özü düzəldir** — ən böyük sürət qazancı budur
- Git commit-lər lokal; Holberton commit tarixçəsinə baxır
- Şəkil yükləmə, brauzerdə klikləmə, DevTools — hamısı əlində
- Max paketdə uzun sessiyalar problem deyil

**Zəif tərəf:** Sən klaviaturanın arxasında olmalısan.

### Yol B — Bu Cowork sessiyası (bulud)

**Nə üçün bu layihə üçün olmaz:** Bulud konteynerində Next.js dev serveri qaldırsam belə, **sən brauzerdə aça bilmirsən** — `localhost` sənin maşınında deyil. UI-ı gözlə yoxlamadan 17 modulluq sosial platforma qurmaq kor-koranə kod yazmaqdır.

**Nə üçün yaxşıdır:** Planlaşdırma, sxem dizaynı, seed data məzmunu, sənədləşdirmə, README, təqdimat, kod review. Yəni **indiki bu iş**.

### Yol C — Hibrid ✅ **ƏSL TÖVSİYƏ**

| Harada | Nə |
|---|---|
| **Claude Code (VS Code)** | Bütün kod, migrasiya, UI, test, git |
| **Cowork (bura)** | Plan, sxem, seed məzmunu, README, blog post, təqdimat, Xankəndi mətnləri, kod review |

Bu paket (PLAN.md + CLAUDE.md + schema.prisma + KUDS tokenlər + visibility.ts + PROMPTS.md) məhz bunun üçündür: layihə qovluğuna atırsan, Claude Code kontekstlə *dolu* başlayır.

### Yol D — Sıfırdan əl ilə / hazır template

Öyrənmək üçün yaxşıdır, 17 modul üçün real deyil. **Seçmə.**

---

## 2. Reallıq yoxlaması

Səmimi olum: blok müddətlərinin cəmi **19 saat 15 dəqiqədir**. "1 gün" o deməkdir ki, ya çox uzun bir gün, ya da iki normal gün.

| | Bloklar | Müddət | Nəticə |
|---|---|---|---|
| **Gün 1** | 0-10 | ≈14s 45d | **12 modul** işlək (M4-M14, M16): təməl, məxfilik, feed, class page, directory, class story, timeline, achievements, events, memories, WAWN |
| **Gün 2** | 11-13 | ≈4s 30d | **Qalan 5 modul** (M1, M2, M3, M15, M17) + keyfiyyət keçidi + Holberton paketi |

Hər blokun sonunda **işlək vəziyyət** var — vaxt bitsə yarımçıq deyil, sadəcə daha az modulla tam işləyən məhsulun olacaq.

**Qızıl qayda:** Blok 0-4 (təməl + data + auth + məxfilik + feed) *heç bir halda* atlanmır. Sıxılma lazım olsa Blok 12-nin (keyfiyyət) dərinliyini azalt, modul kəsmə.

---

## 3. Texnoloji stack — və hər seçimin səbəbi

### 3.1 KUDS-un tələb etdiyi (dəyişdirilə bilməz)

React + **Next.js** · **TypeScript** · **Tailwind CSS** · **shadcn/ui** · **Lucide** ikonlar · **React Hook Form** · **Zod** · **React Query** · **Recharts** · **Framer Motion**

### 3.2 KUDS-un demədiyi — bizim qərarlarımız

| Sahə | Seçim | Səbəb |
|---|---|---|
| Backend | Next.js Route Handlers + Server Actions | Ayrı server = ayrı deploy, ayrı auth, ayrı CORS. Tək repo, tək process |
| ORM | **Prisma 6** | Sxemdən tipli client → uçdan-uca TypeScript |
| DB | **SQLite** (lokal) | Sıfır quraşdırma, Docker lazım deyil. Postgres-ə keçid 1 sətir |
| Auth | **Auth.js v5** Credentials + bcrypt, **JWT** strategiya | Xarici xidmət yoxdur, DB sessiya cədvəli lazım deyil |
| Fayl yükləmə | Route handler → `public/uploads/` | Lokal, pulsuz. `services/storage.ts` arxasında gizlədilib |
| Xəritə | **react-simple-maps** (TopoJSON) | Where Are We Now üçün. Recharts xəritə vermir; KUDS-un "yalnız Recharts" qaydası *chart*-a aiddir |
| Tarix | **date-fns** + `az` locale | Azərbaycan dilində formatlar |
| Zəngin mətn | **Tiptap** — yalnız Memories/Achievements | Feed-də sadə textarea kifayətdir |
| Test | **Vitest** + **Playwright** (smoke) | 3-5 kritik E2E ssenari bəsdir |

### 3.3 SQLite-ın bir tələsi (vacib)

SQLite Prisma-da **`enum` və `String[]` dəstəkləmir.** Buna görə sxemdə bütün enum-lar `String`-dir və dəyərlər `src/lib/enums.ts`-də Zod ilə qorunur:

```ts
export const Visibility = z.enum(["PUBLIC", "UNIVERSITY", "CLASS", "PRIVATE"]);
export type Visibility = z.infer<typeof Visibility>;
```

Bu, zəiflik deyil — **üstünlükdür**: Postgres-ə keçəndə migrasiya ağrısı olmur.

---

## 4. Arxitektura

### 4.1 Qovluq strukturu — və KUDS ilə bir konflikt

KUDS §20: `src/ app/ components/ layouts/ pages/ hooks/ services/ types/ utils/ styles/ assets/`

⚠️ **Problem:** Next.js App Router-də `src/pages/` qovluğu **köhnə Pages Router-i aktivləşdirir** və routing konflikti yaradır. KUDS sənədi App Router-dən əvvəlki adətlə yazılıb.

✅ **Həll (sənədləşdir və müdafiədə izah et):** `pages/` → `src/features/`. Qalan hər şey KUDS-a hərfi riayət edir.

```
qu-class/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   ├── seed-data/          # JSON məzmun faylları
│   └── dev.db
├── public/
│   ├── uploads/
│   └── assets/
├── src/
│   ├── app/
│   │   ├── (public)/       # Giriş etməmiş istifadəçilər
│   │   ├── (app)/          # Auth tələb olunan
│   │   ├── (admin)/        # UNIVERSITY_ADMIN
│   │   └── api/            # Route Handlers
│   ├── components/
│   │   ├── ui/             # shadcn/ui — TOXUNULMAZ (KUDS §18, §23)
│   │   ├── kuds/           # KUDS-a xas wrapper-lər
│   │   └── shared/         # StatCard, EmptyState, VisibilityBadge...
│   ├── layouts/            # PublicShell, AppShell, AdminShell
│   ├── features/           # ⬅ KUDS-dakı "pages/" bunun əvəzidir
│   │   ├── feed/
│   │   ├── class-home/
│   │   ├── directory/
│   │   ├── class-story/
│   │   ├── timeline/
│   │   ├── achievements/
│   │   ├── memories/
│   │   ├── events/
│   │   ├── where-are-we-now/
│   │   ├── privacy/
│   │   ├── guide/          # Xankəndi
│   │   ├── notifications/
│   │   └── admin/
│   ├── hooks/
│   ├── services/           # Data qatı — bütün Prisma sorğuları burada
│   ├── lib/                # db.ts auth.ts visibility.ts enums.ts stage.ts
│   ├── types/
│   ├── utils/
│   ├── styles/
│   └── assets/
├── CLAUDE.md
├── PLAN.md
└── README.md
```

**Qayda:** `src/app/**/page.tsx` faylları **nazikdir** — yalnız `src/features/*`-dan komponent import edib render edirlər.

### 4.2 Route xəritəsi

```
(public)/
  /                             Public Welcome Page                  [M1]
  /about  /history  /mission
  /faculties  /faculties/[slug]                                      [M2]
  /clubs  /campus-life  /services  /newcomers                        [M2]
  /faq
  /khankendi                    Xankəndi bələdçisi                   [M3]
  /khankendi/[category]
  /events                       Açıq tədbirlər (visibility=PUBLIC)
  /login  /register

(app)/
  /home                         → istifadəçinin əsas cohort-una yönləndirir
  /class/[slug]                 Class Page ana səhifə    (spec §16)
  /class/[slug]/feed            Class Feed                           [M5]
  /class/[slug]/directory       Class Directory                      [M6]
  /class/[slug]/timeline        Class Timeline                       [M8]
  /class/[slug]/achievements    Class Achievements                   [M10]
  /class/[slug]/memories        Share Memories                       [M9]
  /class/[slug]/events          Sinif tədbirləri              [M12, M13]
  /class/[slug]/map             Where Are We Now                     [M11]
  /class/[slug]/incoming        Incoming Class paneli                [M4]
  /u/[userId]                   My Class Story (public profil)       [M7]
  /me  /me/edit
  /me/privacy                   Görünürlük idarəetməsi               [M14]
  /me/career                    Alumni karyera məlumatları
  /events/[id]                  Tədbir detalı + RSVP                 [M13]
  /events/[id]/manage           Event Coordinator paneli             [M13]
  /notifications                                                     [M15]
  /search                       Qlobal axtarış                       [M16]

(admin)/                                                             [M17]
  /admin                        Dashboard + analitika
  /admin/cohorts                Cohort yaratma/idarəetmə  (spec §18)
  /admin/cohorts/import         CSV SIS import
  /admin/users                  İstifadəçi & rol idarəetməsi
  /admin/moderation             Şikayət növbəsi
  /admin/achievements           Nailiyyət təsdiq növbəsi
  /admin/content                ContentPage / FAQ / GuidePlace CMS
  /admin/audit                  AuditLog

api/
  /api/auth/[...nextauth]
  /api/upload
  /api/feed                     cursor pagination
  /api/search
  /api/events/[id]/ics
  /api/stats/where-are-we-now
```

### 4.3 Məxfilik mühərriki — sistemin ürəyi 🔒 [M14]

Bu, layihənin **texniki cəhətdən ən maraqlı hissəsidir** və Holberton müdafiəsində məhz bunu danışmalısan.

**Dörd səviyyə (spec §5):**

| Səviyyə | Kim görür |
|---|---|
| `PUBLIC` | Hər kəs, sistemə girməyənlər də daxil |
| `UNIVERSITY` | Yalnız təsdiqlənmiş QU istifadəçiləri |
| `CLASS` | Yalnız həmin cohort üzvləri |
| `PRIVATE` | Yalnız sahibi |

**Vahid həqiqət mənbəyi — `src/lib/visibility.ts`** (hazır fayl: `snippets/visibility.ts`):

```ts
export type SystemRole = "USER" | "UNIVERSITY_ADMIN";

export type Viewer =
  | { kind: "ANONYMOUS" }
  | {
      kind: "USER";
      userId: string;
      cohortIds: string[];
      systemRole: SystemRole;
      moderatedCohortIds: string[];   // ⚠ məcburi sahə
    };

canView(viewer, { ownerId, cohortId, visibility }): boolean
canModerate(viewer, resource): boolean

visibilityWhere<W>(viewer, ownerField?): W
visibleWithStatus<W>(viewer, statuses: string[], ownerField?): W
activeVisibleWhere<W>(viewer, ownerField?): W        // Post/Memory üçün qısayol

redactProfile(user: ProfileView, viewer, fieldVisibility): Partial<ProfileView>
```

`ownerField` modelə görə dəyişir: `Post/Memory → "authorId"`, `Achievement → "ownerId"`, `Event → "createdById"`.

⚠️ `visibleWithStatus` statusları arqument alır, çünki status dəyərləri modeldən modelə fərqlidir: `Post/Memory → ACTIVE`, `Achievement → VERIFIED|FEATURED`, `Event → PUBLISHED|COMPLETED`. `activeVisibleWhere`-i Achievement/Event üçün İŞLƏTMƏ — sıfır nəticə qaytarar.

⚠️ `visibleWithStatus` status filtrini **sahibə tətbiq etmir** — istifadəçi öz `SUBMITTED` nailiyyətini və `DRAFT` tədbirini öz profilində görməlidir.

**Dəmir qaydalar:**

1. **Heç bir səhifə/API `prisma.*`-ı birbaşa çağırmır.** Hamısı `services/` qatından keçir, o qat isə `Viewer`-i birinci arqument kimi qəbul edir.
2. **Filtrləmə DB səviyyəsindədir**, JS-də deyil. Əks halda pagination sınır və məlumat sızır.
3. **Default-lar məhdudlaşdırıcıdır.** `phone` və `personalEmail` **həmişə** `PRIVATE` başlayır (spec §5). Yeni sahə → default `CLASS`.
4. **Aqreqasiyalar ayrı razılıq istəyir.** Where Are We Now yalnız `includeInStats = true` qeydləri sayır; 3 nəfərdən kiçik xanalar `suppressSmallBuckets()` ilə "Digər"ə yığılır; dəqiq ünvan **heç vaxt** göstərilmir.
5. **Timeline mənbənin məxfiliyini götürür** və ondan daha açıq ola bilməz.
6. **Əlaqə sahələri əvvəlcə düzləndirilir.** `interests`, `hobbies`, `skills`, `languages`, `clubs`, `careerHistory`, `education` — bunlar `User` sütunu deyil. `services/user.service.ts` → `buildProfileView()` onları `ProfileView` obyektinə düzləndirir, yoxsa `redactProfile` onları sadəcə atlayır və həmin məxfilik açarları işləməz.

**Test məcburidir:** `visibility.test.ts` — 4 səviyyə × 4 viewer tipi = 16 halın matris testi.

### 4.4 Feed → Timeline / Achievements axını (spec §7)

```
İstifadəçi Feed-də paylaşım yaradır
      │
      ├── kateqoriya seçir (12-dən biri, MƏCBURİ)
      ├── növ seçir (8-dən biri)
      ├── görünürlük seçir
      ├── ☑ "Class Timeline-a əlavə et"      → showOnTimeline = true
      └── ☑ "Class Achievements-ə əlavə et"  → showInAchievements = true
      │
      ▼
  Server Action: createPost()   ← TƏK TRANSAKSİYA
      │
      ├── Post yaradılır
      ├── showOnTimeline → TimelineEntry
      │     • occurredAt post-dan götürülür
      │     • academicYear hesablanır ("2026-2027")
      │     • visibility post-dan KOPYALANIR
      │     • category post-dan götürülür
      ├── showInAchievements → Achievement (status: SUBMITTED)
      └── Notification-lar
```

**Silinmə — diqqət:** Sxemdə `TimelineEntry.postId` üzərində `onDelete: Cascade` var, amma `deletePost` **soft delete** edir (`status = DELETED`), yəni sətir silinmir və cascade **işə düşmür**. Buna görə `deletePost` Server Action-ı TimelineEntry-ni **açıq şəkildə** silməlidir:

```ts
await prisma.$transaction([
  prisma.post.update({ where: { id }, data: { status: "DELETED" } }),
  prisma.timelineEntry.deleteMany({ where: { postId: id } }),
  prisma.achievement.updateMany({ where: { postId: id }, data: { status: "ARCHIVED" } }),
]);
```

Cascade yalnız həqiqi hard delete (admin təmizləmə) üçün ehtiyat qoruyucudur. Spec §7 tələbi bu transaksiya ilə ödənilir — təkcə sxemlə yox.

**Niyə TimelineEntry ayrı cədvəldir?** Timeline üç mənbədən qidalanır — Post, Achievement, Event — üstəlik sistem milestone-ları. Tək denormalizə edilmiş cədvəl = tək sıralanmış sorğu, `UNION` yoxdur, pagination işləyir.

### 4.5 Cohort formalaşması (spec §18)

```
Cohort açarı = scope + faculty + program + admissionYear
Nümunə: PROGRAM | Pedaqoji | İngilis dili müəllimliyi | 2026 → "İngilis dili müəllimliyi — Class of 2030"
slug: "ingilis-dili-muellimliyi-2030"   ← əsl unikallıq qoruyucusu
```

Qeydiyyatda istifadəçi fakültə + ixtisas + qəbul ili seçir → uyğun cohort tapılır → `CohortMembership` qurulur. Real SIS inteqrasiyası yoxdur, amma **`services/sis-import.ts` CSV import** yaz — spec-də "SIS məlumatları əsasında avtomatik" deyilir, CSV import bunun realist simulyasiyasıdır və müdafiədə yaxşı arqumentdir.

### 4.6 Mərhələ keçidi (Incoming → Student → Alumni)

Eyni Class Page bağlanmır, məzmun dəyişir (spec §1).

```ts
// src/lib/stage.ts
export function resolveStage(
  cohort: { academicStartsAt: Date; graduatesAt: Date },
  now: Date
): "INCOMING" | "STUDENT" | "ALUMNI" {
  if (now < cohort.academicStartsAt) return "INCOMING";
  if (now < cohort.graduatesAt)      return "STUDENT";
  return "ALUMNI";
}
```

⚠️ **Vahid həqiqət mənbəyi cohort-dur, `User.stage` deyil.** `User.stage` yalnız keşdir; `resolveStage` fərqli nəticə verirsə giriş zamanı (və gecə cron ilə) yenilənir. UI-da həmişə `resolveStage`-in nəticəsini işlət.

Class Page ana səhifəsi mərhələyə görə **widget sırasını dəyişir**:

| Mərhələ | Yuxarıdakı widget-lər |
|---|---|
| INCOMING | Tanışlıq kartları · Kampusa hazırlıq · Xankəndi bələdçisi · Yeni üzvlər |
| STUDENT | Feed · Qarşıdan gələn tədbirlər · Son nailiyyətlər · Timeline |
| ALUMNI | Where Are We Now · Reunion-lar · Directory · Dəstək təklifləri |

Tək `<ClassHome stage={stage} />` komponenti — üç ayrı səhifə **yazma**.

---

## 5. İcra blokları

Hər blok: **məqsəd → nə qurulur → bitmə şərti (DoD)**. Blok bitəndə `git commit`.

### 🟢 FAZA 1 — TƏMƏL (blok 0-3) · atlanılmaz

#### Blok 0 — Skeleton & KUDS (60 dəq)

- `create-next-app` (TS, Tailwind, App Router, `src/`, ESLint) — **sonra `tailwindcss@^3.4` pinlə**
- shadcn/ui init + bütün məcburi komponentlər (KUDS §18)
- KUDS tokenləri: `tailwind.config.ts` + `globals.css` (hazır fayllar bu paketdə)
- Poppins (`next/font/google`), fallback Tahoma
- Layoutlar: `PublicShell`, `AppShell` (280px sidebar + 72px header — KUDS §8), `AdminShell`
- `src/lib/enums.ts` — bütün enum-lar Zod ilə
- `/kuds` — **daxili stil bələdçisi səhifəsi**

**DoD:** `npm run dev` işləyir, `/kuds` bütün komponentləri KUDS-a uyğun göstərir, `tsc --noEmit` və `npm run build` təmizdir.

> 💡 `/kuds` səhifəsi qızıl dəyərindədir: sonrakı 13 blok ərzində Claude Code oradan komponent kopyalayır və dizayn dağılmır. Müdafiədə göstərmək üçün də əla ekrandır.

---

#### Blok 1 — Data qatı & seed (90 dəq)

- Prisma 6 quraşdırılması, `schema.prisma` (bu paketdə hazırdır), `migrate dev --name init`
- `src/lib/db.ts` (PrismaClient singleton), `src/lib/stage.ts`
- **`prisma/seed.ts` — ən vacib addım:**
  - 4 fakültə, 10 ixtisas, 6 cohort (2 INCOMING / 2 STUDENT / 2 ALUMNI)
  - **120+ istifadəçi**, real azərbaycanca adlar, avatarlar, `FieldVisibility` sətirləri
  - 300+ post, 150+ şərh, 400+ reaksiya
  - 80 nailiyyət (4 statusda), 60 xatirə (8 növdə)
  - 25 tədbir (keçmiş + gələcək), RSVP-lər
  - Alumni-lər üçün 15 ölkə / 40 şirkət / 8 sənaye üzrə karyera qeydləri
  - 30 Xankəndi bələdçi yazısı, 20 FAQ, 8 ContentPage
  - **5 test hesabı** — hər rol üçün bir dənə (aşağıda)

**DoD:** `npx prisma studio`-da bütün cədvəllər doludur.

> ⚠️ **Bu bloku kəsmə.** Zəngin seed data 17 modulu "işləyir" göstərməyin yeganə yoludur.
> 💡 Seed məzmununu (bio-lar, xatirələr, Xankəndi mətnləri) **Cowork-də hazırlatdır**, JSON kimi `prisma/seed-data/`-ya qoy — bu blok 2 dəfə sürətli bitir.

---

#### Blok 2 — Auth & rollar (60 dəq)

- Auth.js v5, Credentials provider, bcrypt, **JWT** strategiya
- Qeydiyyat: e-poçt (`@qu.edu.az`) + fakültə/ixtisas/qəbul ili → cohort-a avtomatik bağlanma + default `FieldVisibility` sətirləri
- `src/lib/auth.ts` → `getViewer()` (userId + cohortIds + systemRole + moderatedCohortIds)
- Middleware: `(app)` → giriş, `(admin)` → `UNIVERSITY_ADMIN`
- `requireCohortRole(cohortId, roles[])` guard-ı

**DoD:** 5 seed hesabının hər biri ilə giriş edib düzgün səhifələri görürsən; icazəsiz route 403 verir.

---

#### Blok 3 — 🔒 Məxfilik mühərriki (90 dəq) · **ƏN VACİB BLOK** [M14]

- `snippets/visibility.ts` → `src/lib/visibility.ts`
- `src/services/` qatı — hamısı `Viewer` qəbul edir, hamısı `visibilityWhere` işlədir
- `services/user.service.ts` → `buildProfileView()` (əlaqə sahələrini düzləndirir)
- `/me/privacy` — hər sahə üçün 4 səviyyəli seçici [M14]
- `<VisibilitySelector />`, `<VisibilityBadge />`
- **"Preview as"** — öz profilinə anonim / universitet / sinif gözü ilə bax
- **`visibility.test.ts`** — 16 hallıq matris testi

**DoD:** Test yaşıldır. Incognito-da `CLASS` səviyyəli post görünmür. Başqa cohort üzvü `UNIVERSITY` postu görür, `CLASS` postu görmür.

---

### 🟡 FAZA 2 — ƏSAS MƏHSUL (blok 4-7)

#### Blok 4 — Class Feed (90 dəq) [M5]

- `<PostComposer />` — kateqoriya (**12 seçim, məcburi** — spec §6), növ (**8 növ**: mətn, foto, foto albom, video, keçid, tədbir məlumatı, nailiyyət, xatirə), görünürlük, Timeline/Achievements checkbox-ları, `occurredAt` seçici
- Fayl yükləmə: `/api/upload` → `public/uploads/`, `sharp` optimizasiyası, `services/storage.ts` arxasında
- `<PostCard />` — media qalereyası, reaksiyalar, şərhlər, kateqoriya + görünürlük nişanları
- İnfinite scroll (`useInfiniteQuery` + cursor pagination)
- `createPost` / `deletePost` Server Action-ları — §4.4-dəki transaksiyalar

**DoD:** Paylaşım → Timeline-da görünür. Postu silirsən → Timeline-dan yox olur.

---

#### Blok 5 — Class Page ana səhifəsi + Incoming Class (75 dəq) [M4]

- **14 bloklu ana səhifə** (spec §16 sırası ilə)
- `stage`-ə görə widget sırası (§4.6)
- Incoming rejimi: "özünü təqdim et" onboarding, tanışlıq kartları, kampusa hazırlıq materialları

**DoD:** Üç fərqli cohort-a girib fərqli düzülüş görürsən.

---

#### Blok 6 — Class Directory + Axtarış (75 dəq) [M6, M16]

- Profil kartı grid-i (KUDS: radius 12, shadow SM, padding 24, gap 24)
- **13 filtr** (spec §8): ad, fakültə, ixtisas, qəbul ili, məzuniyyət ili, şəhər, ölkə, fəaliyyət sahəsi, şirkət, maraqlar, dil, klub, tələbə/məzun statusu
- URL-də saxlanılan filtr vəziyyəti — paylaşıla bilən link
- Qlobal axtarış: istifadəçi + post + tədbir + nailiyyət, ⌘K palette
- **Hər nəticə `redactProfile`-dan keçir**

**DoD:** Filtr kombinasiyaları işləyir, URL paylaşıla bilir, gizli sahələr kartda görünmür.

---

#### Blok 7 — My Class Story (75 dəq) [M7]

- `/u/[userId]` — CV deyil, **hekayə** formatında (spec §9 xüsusi vurğulayır)
- Alumni rejimi: karyera timeline-ı, təhsil, layihələr, **7 dəstək təklifi** rozet kimi
- `/me/edit` — RHF + Zod, hər sahənin yanında inline görünürlük seçicisi
- `/me/career` — karyera/təhsil CRUD + `includeInStats` açarı

**DoD:** Tələbə və məzun profillərinin ikisi də dolu görünür; "Preview as" işləyir.

> 💡 "Preview as" müdafiədə çox güclü göstəricidir — məxfilik sisteminin işlədiyini bir kliklə sübut edirsən.

---

### 🟠 FAZA 3 — DƏRİNLİK (blok 8-11)

#### Blok 8 — Timeline + Achievements (90 dəq) [M8, M10]

- Şaquli xronoloji timeline, tədris ili ilə qruplaşdırılmış, **6 filtr** (spec §10)
- Sistem milestone-ları seed-dən
- Achievements: **12 kateqoriya**, **4 status** (SUBMITTED/VERIFIED/FEATURED/ARCHIVED), moderator təsdiq axını, `/admin/achievements` növbəsi
- Featured vitrini

**DoD:** Timeline filtrləri işləyir; moderator VERIFIED edir → istifadəçiyə bildiriş gedir.

---

#### Blok 9 — Events & Reunion (90 dəq) [M12, M13]

- Tədbir yaratma formu — spec §14-dəki **10 sahə** (ad, təsvir, tarix-saat, məkan, onlayn keçid, iştirakçı limiti, qeydiyyat tarixi, proqram, əlaqələndirici, görünürlük) + bizim əlavələrimiz: `scope`, `category`, `facultyId`
- RSVP axını: dəvət → qəbul/rədd → qeydiyyat → iştirak təsdiqi, tutum + gözləmə siyahısı
- `.ics` faylı
- Tədbirdən sonra: foto albom, rəy sorğusu, iştirak statistikası, Timeline-a əlavə
- Coordinator paneli: iştirakçı cədvəli (KUDS §14 tələbləri), toplu bildiriş, CSV export, hesabat
- Qarşıdan gələn tədbirlər bloku, **6 filtr** (spec §15): tarix, kateqoriya, təşkilatçı, fakültə, klub, onlayn/üzbəüz

**DoD:** Tədbir yaradıb qeydiyyatdan keçirsən, `.ics` yüklənir, coordinator hesabat görür.

---

#### Blok 10 — Share Memories + Where Are We Now (90 dəq) [M9, M11]

- Memories: **8 növ**, hekayəvi kart dizaynı (Feed-dən vizual olaraq fərqli — spec tələbi), **4 ayrıca göstərilmə seçimi** (profil / feed / timeline / yearbook)
- Where Are We Now — **7 vizual** (spec §13): dünya xəritəsi, Azərbaycan xəritəsi, **şəhərlər üzrə paylanma**, ölkələr üzrə paylanma, şirkətlər üzrə statistika, sənaye sahələri üzrə diaqram, təhsil pillələri üzrə göstəricilər
- `/api/stats/where-are-we-now` — yalnız `includeInStats = true`, `suppressSmallBuckets()`, `coarsenLocation()`

**DoD:** Statistikalar real rəqəmlər göstərir; bir istifadəçinin razılığını söndürüb rəqəmlərin dəyişdiyini yoxlayırsan.

---

#### Blok 11 — Welcome Page + Xankəndi + Bildirişlər + Admin (90 dəq) [M1, M2, M3, M15, M17]

- **Welcome Page** (spec §2, 10 bölmə): universitet haqqında, tarix və missiya, fakültələr və ixtisaslar, tələbə klubları, kampus həyatı, tələbə xidmətləri, yeni tələbələr üçün vacib məlumatlar, qarşıdan gələn açıq tədbirlər, FAQ, giriş düyməsi
- **Xankəndi bələdçisi** (spec §3): tarix, əsas məkanlar, ictimai nəqliyyat, universitetə gediş yolları, marketlər, gündəlik xidmətlər, sağlamlıq, mədəniyyət, istirahət, təhlükəsizlik/təcili əlaqə, məsləhətlər + xəritə görünüşü
  *(Sxemdə 11 kateqoriya var — spec-in 10 bəndindən "marketlər və gündəlik xidmətlər" ilə "mədəniyyət və istirahət" ayrılıb, "xəritə" isə kateqoriya yox, görünüş kimi həll olunub.)*
- **Bildiriş mərkəzi**: siyahı, oxunmuş/oxunmamış, növ filtri, header badge
- **Admin**: dashboard analitikası, moderasiya növbəsi, istifadəçi/rol idarəetməsi, cohort yaratma, CSV SIS import, CMS, audit log

**DoD:** Anonim brauzerdə welcome page tam yüklənir; şikayət göndərib admin panelində həll edirsən, AuditLog sətri yaranır.

---

### 🔵 FAZA 4 — CİLA & TƏHVİL (blok 12-13)

#### Blok 12 — Keyfiyyət keçidi (90 dəq)

| Sahə | Nə edilir |
|---|---|
| **KUDS auditi** | `grep` ilə hardcode rəng; KUDS spacing şkalasından kənar dəyərlər (öz kodumuzda — `ui/` istisna); `ui/` fayllarında dəyişiklik olub-olmadığı; yalnız Lucide ikonlar |
| **Accessibility** (KUDS §21) | `axe-core`, klaviatura naviqasiyası, focus state-lər, ARIA, semantik HTML, kontrast 4.5:1 |
| **Performance** (KUDS §22) | `next/image`, lazy loading, kod bölgüsü, `dynamic()`, ISR, Lighthouse ≥ 90 |
| **Responsive** (KUDS §9) | 375 / 768 / 1024 / 1280 / 1536 |
| **Vəziyyətlər** | Skeleton, empty state, error boundary — hər siyahı üçün |
| **Testlər** | Vitest (visibility matrisi, timeline axını, stage, academicYear) + Playwright (5 smoke) |

**DoD:** `tsc --noEmit`, `lint`, `build`, `test` — dördü də təmiz. Lighthouse ≥ 90.

---

#### Blok 13 — Holberton təhvil paketi (90 dəq)

> ⚠️ Öz kohortunun rəsmi tələb siyahısını yoxla — aşağıdakılar tipik portfolio layihəsi tələbləridir.

| Deliverable | Məzmun |
|---|---|
| **README.md** | Problem · Həll · Demo GIF · Xüsusiyyətlər · Stack · Arxitektura · Quraşdırma · Test hesabları · Ekran görüntüləri · Komanda |
| **docs/ARCHITECTURE.md** | Mermaid: sistem konteksti, ER diaqramı, məxfilik qərar axını, Feed→Timeline sequence |
| **docs/DECISIONS.md** | Niyə SQLite, niyə tək repo, niyə TimelineEntry denormalizə, niyə `pages/`→`features/`, niyə String enum |
| **Demo video** (2-3 dəq) | anonim welcome → giriş → feed-də paylaşım → Timeline-da görünmə → məxfiliyi dəyiş → başqa gözlə bax → alumni xəritəsi |
| **Slaydlar** | Problem · İstifadəçi · Həll · Demo · Arxitektura · Ən çətin texniki problem · Öyrəndiklərim · Gələcək iş |
| **Blog post** | "Building a 4-level privacy engine for a university social platform" |
| **Git tarixçəsi** | Mənalı commit-lər, feature branch-lər, PR-lar |

**Müdafiədə vurğulanacaq 3 texniki nöqtə:**
1. **Məxfilik mühərriki** — DB səviyyəsində filtrləmə, 16 hallıq test matrisi, "preview as" sübutu
2. **Feed → Timeline derived data axını** — denormalizasiya qərarının səbəbi və soft-delete ilə bütövlüyün qorunması
3. **KUDS uyğunluğu** — rəsmi dizayn standartına riayət + `/kuds` stil bələdçisi + aşkarladığımız iki boşluq (`pages/` konflikti, gold rəngin olmaması)

---

## 6. Modul → blok xəritəsi (izləmə cədvəli)

Spesifikasiya §20-dəki yekun siyahı üzrə:

| # | Modul | Blok | Status |
|---|---|---|---|
| M1 | Public Welcome Page | 11 | ☐ |
| M2 | University & Campus Information | 11 | ☐ |
| M3 | Khankendi Student Guide | 11 | ☐ |
| M4 | Incoming Class | 5 | ☐ |
| M5 | Class Feed | 4 | ☐ |
| M6 | Class Directory | 6 | ☐ |
| M7 | My Class Story | 7 | ☐ |
| M8 | Class Timeline | 8 | ☐ |
| M9 | Share Memories | 10 | ☐ |
| M10 | Class Achievements | 8 | ☐ |
| M11 | Where Are We Now | 10 | ☐ |
| M12 | Upcoming Events | 9 | ☐ |
| M13 | Events & Reunion Coordinator | 9 | ☐ |
| M14 | Privacy & Visibility Management | **3** | ☐ |
| M15 | Notifications | 11 | ☐ |
| M16 | Search & Filters | 6 | ☐ |
| M17 | Moderation & Administration | 11 | ☐ |

---

## 7. Test hesabları (seed-də yaradılır)

Hamısının şifrəsi: `Test1234!`

| E-poçt | Sistem rolu | Cohort rolu | Mərhələ |
|---|---|---|---|
| `admin@qu.edu.az` | UNIVERSITY_ADMIN | MEMBER (bir STUDENT cohort-da) | STUDENT |
| `moderator@qu.edu.az` | USER | CLASS_MODERATOR | STUDENT |
| `rep@qu.edu.az` | USER | CLASS_REPRESENTATIVE | STUDENT |
| `coordinator@qu.edu.az` | USER | EVENT_COORDINATOR | STUDENT |
| `alumni@qu.edu.az` | USER | MEMBER | ALUMNI |

⚠️ Admin hesabına da mütləq bir `CohortMembership` ver — yoxsa `cohortIds` boş olur və `/home` yönləndirməsinin hədəfi olmur. Ümumiyyətlə: cohort-suz istifadəçi halını `/home`-da idarə et (cohort seçmə ekranı göstər), çünki bu, real sistemdə də baş verə bilər.

---

## 8. İlk 15 dəqiqə — dəqiq addımlar

```bash
# 1. Layihəni yarat
#    ⚠️ `@latest` YOX, `@15` — create-next-app@latest artıq Next 16 quraşdırır,
#    bu paketdəki konfiqlər və PLAN Next 15 (App Router) üçün yazılıb.
npx create-next-app@15 qu-class \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-npm
cd qu-class

# 2. ⚠️ TAILWIND v3-Ə ENDİR (create-next-app v4 quraşdırır, snippetlərimiz v3-dür)
npm uninstall tailwindcss @tailwindcss/postcss
npm i -D tailwindcss@^3.4 postcss autoprefixer tailwindcss-animate

#    v4-ün postcss konfiqini SİL, v3-ünkünü yaz
rm -f postcss.config.mjs
cat > postcss.config.js <<'EOF'
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
EOF

#    ⚠️ `npx tailwindcss init` İŞLƏTMƏ — o, tailwind.config.js yaradır və
#    Tailwind .js-i .ts-dən ƏVVƏL oxuyur, yəni KUDS konfiqi səssizcə
#    nəzərə alınmaz. Konfiqi 4-cü addımda birbaşa .ts kimi yazacağıq.
rm -f tailwind.config.js

# 3. shadcn/ui — SNIPPETLƏRDƏN ƏVVƏL, çünki `init` globals.css və
#    tailwind konfiqini öz şablonu ilə üzərinə yazır
#
#    🔴 VERSİYA PİNİ MƏCBURİDİR: `shadcn@2.10.0`, `@latest` DEYİL.
#    `shadcn@latest` (v3) default olaraq "base-nova" stilini işlədir —
#    Radix əvəzinə Base UI, v3 sinifləri Tailwind v4 üçün yazılıb. Nəticədə
#    komponentlər səssizcə KUDS-dan kənara düşür: `rounded-card` əvəzinə
#    v4 token-ləri, `variant="outline"` başqa cür render olunur, build isə
#    ilk baxışda keçir. Səhvi yalnız /kuds səhifəsində görürsən — gec olur.
npx shadcn@2.10.0 init
rm -f tailwind.config.js   # init də .js yarada bilər

#    Komponentləri BİRLİKDƏ yox, siyahı ilə əlavə et; `-y` sual vermir,
#    `-o` mövcud faylı üzərinə yazır (təkrar işlətdikdə fərq qalmasın).
npx shadcn@2.10.0 add button input textarea select card dialog \
  dropdown-menu avatar badge tabs table calendar popover \
  checkbox switch radio-group form label separator sheet \
  skeleton sonner tooltip accordion pagination breadcrumb command -y -o

#    ⚠️ HƏR `add`-dan SONRA: shadcn tailwind konfiqini "düzəltmək" üçün
#    tailwind.config.js yarada bilər. Tailwind .js-i .ts-dən ƏVVƏL oxuyur —
#    yəni KUDS konfiqi səssizcə nəzərə alınmaz.
rm -f tailwind.config.js

# 4. İNDİ bu paketdəki faylları kopyala (shadcn-in yazdıqlarını əvəz edir)
#    CLAUDE.md, PLAN.md, PROMPTS.md   → layihə kökünə
#    prisma/schema.prisma
#    snippets/tailwind.config.ts      → tailwind.config.ts
#    snippets/globals.css             → src/app/globals.css
#    snippets/visibility.ts           → src/lib/visibility.ts

# 5. Asılılıqlar  (prisma@^6 — v7 sxemdəki datasource.url-i qəbul etmir)
#
#    ⚠️ react-simple-maps: stabil buraxılış React 19 ilə uyğun deyil.
#    `4.0.0-beta.6` işlət və package.json-a peer-lərini yönləndir:
#      "overrides": {
#        "react-simple-maps": { "react": "$react", "react-dom": "$react-dom" }
#      }
#    Overrides olmasa `npm i` ERESOLVE ilə dayanır.
#
#    ⚠️ @types/bcryptjs SİYAHIDA YOXDUR — bcryptjs 3 öz tiplərini gətirir.
#    Köhnə @types paketini quraşdırsan tip münaqişəsi yaranır.
npm i "prisma@^6" "@prisma/client@^6" next-auth@beta bcryptjs zod \
  react-hook-form @hookform/resolvers @tanstack/react-query \
  recharts framer-motion lucide-react date-fns \
  react-simple-maps@4.0.0-beta.6 sharp nuqs
npm i -D @types/react-simple-maps tsx vitest jsdom \
  @vitejs/plugin-react @testing-library/react @playwright/test

#    tailwindcss-animate: KUDS konfiqi onu ESM import ilə işlədir
#    (`import tailwindcssAnimate from "tailwindcss-animate"`), `require()` ilə
#    yox — tailwind.config.ts TypeScript modulu kimi yüklənir.

# 6. Prisma
echo 'DATABASE_URL="file:./dev.db"' >> .env
echo 'AUTH_SECRET="'$(openssl rand -base64 32)'"' >> .env
npx prisma validate          # ⬅ ƏVVƏLCƏ BUNU İŞLƏT
npx prisma migrate dev --name init

# 7. Yoxla: yalnız BİR tailwind konfiqi və BİR postcss konfiqi olmalıdır
ls tailwind.config.* postcss.config.*

# 8. Claude Code-u başlat
claude
```

Sonra Claude Code-a **`PROMPTS.md`-dəki Blok 0 promptunu** ver.

---

## 9. Risklər və nə etməli

| Risk | Ehtimal | Qarşısını alma |
|---|---|---|
| **Scope partlayışı** | Yüksək | Blok sırasına hərfi riayət; sıxılma olsa Blok 12-nin dərinliyini azalt |
| **Boş demo** | Yüksək | Blok 1-də zəngin seed. **Heç vaxt** sonraya saxlama |
| **Məxfilik sızması** | Orta | Bütün sorğular `services/` qatından; `visibility.test.ts` yaşıl olmalıdır |
| **Tailwind v3/v4 qarışıqlığı** | **Yüksək** | §8 addım 2-ni atlama. `package-lock.json` commit et |
| **shadcn v2/v3 qarışıqlığı** | **Yüksək** | `npx shadcn@2.10.0 add <ad> -y -o` — `@latest` (v3) Base UI + Tailwind v4 komponentləri yazır və KUDS-u səssizcə sındırır. Hər `add`-dan sonra `rm -f tailwind.config.js` |
| **Next.js 15/16 qarışıqlığı** | Orta | `create-next-app@15` — `@latest` artıq Next 16 gətirir |
| **Prisma 6/7 qarışıqlığı** | **Yüksək** | `prisma@^6` pinlə; v7 `datasource.url`-i rədd edir (P1012) |
| **shadcn spacing pozulması** | Orta | Tailwind spacing şkalasını **əvəz etmə**, `extend` ilə əlavə et (config-də belədir) |
| **Dizayn dağılması** | Orta | `/kuds` səhifəsi + `ui/` toxunulmaz + Blok 12 grep auditi |
| **Fayl yükləmə prod-da sınır** | Aşağı | `services/storage.ts` arxasında gizlədilib |
| **Claude Code kontekst itkisi** | Orta | `CLAUDE.md` kökdə + hər blokda `/clear` |

---

## 10. Nəyi mənə (Cowork-ə) tapşır

Claude Code-un vaxtını mətn yazmağa sərf etmə:

- [ ] **Seed data JSON-ları** — 120 istifadəçi profili, 300 post mətni, 60 xatirə, real azərbaycanca məzmun
- [ ] **Xankəndi bələdçisi məzmunu** — 30 yer, təsvirlər, kateqoriyalar
- [ ] **Universitet məzmunu** — Welcome Page mətnləri, FAQ-lar, fakültə təsvirləri
- [ ] **README.md** — tam, ekran görüntüsü yerləri ilə
- [ ] **Mermaid diaqramları** — ER, sistem konteksti, məxfilik axını
- [ ] **Slayd təqdimatı** (.pptx) — Holberton müdafiəsi üçün
- [ ] **Blog post** — məxfilik mühərriki haqqında
- [ ] **Kod review** — Claude Code-un yazdığını bura yapışdır, məxfilik sızması axtarım

Sadəcə de, hansını istəyirsən.
