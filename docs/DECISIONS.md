# QU CLASS — Qərarlar jurnalı (ADR)

> Layihənin **niyə belədir** sənədi. Quruluş — [`ARCHITECTURE.md`](ARCHITECTURE.md).
> Təhdid modeli — [`SECURITY.md`](SECURITY.md).
>
> Hər maddə eyni formatdadır: **Kontekst · Qərar · Alternativlər · Nəticə**.
> «Alternativlər» bölməsi qəsdən doldurulub: seçilməyən yol yazılmasa qərar
> qərar kimi yox, təsadüf kimi oxunur.
>
> ⚠️ Buradakı hər texniki iddia koddan gəlir və fayl/sətir göstərilir.
> Ölçülməmiş rəqəm yazılmır.

| # | Qərar | Sahə |
|---|---|---|
| [QD-001](#qd-001--parol-sıfırlama-axını-qəsdən-yazılmayıb) | Parol sıfırlama axını yoxdur | təhlükəsizlik |
| [QD-002](#qd-002--baza-sqlite-postgresql-deyil) | Baza: SQLite | data |
| [QD-003](#qd-003--tək-repo-tək-proses--ayrı-backend-yoxdur) | Tək repo, tək proses | arxitektura |
| [QD-004](#qd-004--kuds-20-nin-pages-qovluğu-features-dir) | `pages/` → `features/` | struktur |
| [QD-005](#qd-005--bütün-enum-lar-string-sütun--zod) | `String` enum + Zod | data |
| [QD-006](#qd-006--məxfilik-filtri-db-də-tətbiq-olunur-js-də-deyil) | Filtr DB-də | məxfilik |
| [QD-007](#qd-007--timelineentry-denormalizə-edilib) | `TimelineEntry` denormalizə | data |
| [QD-008](#qd-008--authjs-konfiqi-ikiyə-bölünüb-edge--node) | Auth split config | auth |
| [QD-009](#qd-009--jwt-sessiya--session-cədvəli-yoxdur) | JWT sessiya | auth |
| [QD-010](#qd-010--jwt-minimaldır--cohortids-token-də-saxlanmır) | Minimal token | auth |
| [QD-011](#qd-011--maaş--bonus-sahəsi-yoxdur) | Maaş sahəsi yoxdur | məxfilik |
| [QD-012](#qd-012--xəritə-koordinatı-bazadan-gəlmir) | Koordinat yoxdur | məxfilik |
| [QD-013](#qd-013--k-anonimlik-həddi--3) | k = 3 | məxfilik |
| [QD-014](#qd-014--aqreqasiya-üçün-ayri-razılıq-includeinstats) | `includeInStats` | məxfilik |
| [QD-015](#qd-015--giriş-xətası-hesab-enumerasiyasını-fərqləndirmir) | Enumerasiya bağlıdır | təhlükəsizlik |
| [QD-016](#qd-016--shadcnui-v2-pinlənib-latest-qadağandır) | shadcn v2 pin | UI |
| [QD-017](#qd-017--git-əməliyyatları-isomorphic-git-ilə) | `isomorphic-git` | alət |
| [QD-018](#qd-018--deploy-flyio--volume-postgres-ə-keçid-yox) | Fly.io + volume, Postgres yox | deploy |
| [QD-019](#qd-019--canlı-instansiyada-demo-admin-parolu-dəyişdirilir-üzv-hesabları-qalır) | Canlı demo parolları | təhlükəsizlik |

---

## QD-001 — Parol sıfırlama axını QƏSDƏN yazılmayıb

**Status:** qəbul edilib (Blok 12B, 2026-07-31) · yenidən baxılacaq: e-poçt
xidməti qurulanda.

### Kontekst

Standart parol sıfırlama üç hissədən ibarətdir: (1) birdəfəlik token saxlayan
yeni cədvəl, (2) həmin tokeni istifadəçiyə çatdıran e-poçt kanalı, (3) tokeni
qəbul edən ictimai səhifə. Layihədə **heç bir SMTP / e-poçt provayderi
quraşdırılmayıb** və stack kilidlidir.

### Qərar

**Bu mərhələdə kod yazılmayıb.** Nə yeni cədvəl, nə endpoint, nə səhifə.

Səbəblər:

1. **Çatdırılma kanalı yoxdur.** Tokeni çatdıra bilməyən sıfırlama axını
   işləməyən düymədir — mövcud olmayan funksiyadan da pisdir, çünki gözlənti
   yaradır.
2. **Sxem dəyişikliyi bu mərhələdə risklidir.** Token cədvəli yeni miqrasiya
   deməkdir; miqrasiya isə seed determinizminə və **1844 testin** oxuduğu
   bazaya toxunur. Fayda sıfırdır (bax 1), risk realdır.
3. **Yarımçıq təhlükəsizlik axını təhlükəlidir.** «Müvəqqəti şifrəni ekranda
   göstər» kimi həllər hesab ələ keçirmə vektorudur. Zəif axın YOXLUQDAN pisdir.

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| Tokeni ekranda göstər (kanal olmadan) | Hesab ələ keçirmə vektoru — istənilən şəxs e-poçt yazıb tokeni alır |
| «Təhlükəsizlik sualı» ilə sıfırlama | Cavablar sosial şəbəkədən tapılır; NIST 800-63B bunu açıq şəkildə tövsiyə etmir |
| Admin əl ilə sıfırlasın + UI | Hazırda **mövcuddur** (`/admin/users`), amma self-service deyil — bu, seçilən yolun məhdudiyyətidir, ayrı həll deyil |
| Konsola `console.log(token)` yazan «dev mode» axını | İstehsalda təsadüfən açıq qalma riski; demo dəyəri sıfır |

### Hazırkı iş axını (ölçülmüş)

- **Özü qeydiyyatdan keçən istifadəçi** şifrəsini `/register`-də təyin edir
  (`registerUser` → `hashSync(password, 10)`).
- **SIS ilə idxal edilən hesab** `UNSET_PASSWORD_HASH` (`"!unset"`) ilə yaranır
  (`services/sis-import.service.ts`) və `isPasswordUnset()` sayəsində girişə
  buraxılmır.
- ⚠️ **Bu hesab özü də qeydiyyatdan KEÇƏ BİLMİR:** `/register` e-poçt artıq
  bazada olduğuna görə `EMAIL_TAKEN` qaytarır. Yəni SIS ilə idxal edilmiş
  istifadəçinin **texniki self-service yolu yoxdur** — hesabın
  aktivləşdirilməsi üçün universitet administrasiyası ilə əlaqə saxlanılır.
  Bu məhdudiyyət `/accessibility` səhifəsindəki «bilinən məhdudiyyətlər»
  siyahısında da açıq yazılıb — sənəd və davranış ayrılmır.

### Gələcək həll (e-poçt xidməti qurulandan sonra)

1. `PasswordResetToken` modeli: `tokenHash` (xam token SAXLANMIR), `userId`,
   `expiresAt` (≈ 30 dəqiqə), `usedAt`. Tək istifadəlik.
2. `POST /api/v1/auth/forgot-password` — **enumerasiyaya bağlı** (bax QD-015).
3. Rate-limit — `POST /api/v1/auth/login`-dəki mövcud mexanizm təkrar işlədilir.
4. `/reset-password?token=…` səhifəsi; uğurdan sonra token `usedAt` ilə bağlanır
   və `AuditLog` sətri yazılır.
5. **SIS boşluğunun bağlanması:** eyni mexanizm «hesabı aktivləşdir» dəvəti kimi
   işlədilir.

### Nəticə

- ➕ Yalan vəd verən düymə yoxdur; sxem və test bazası sabit qalır.
- ➖ SIS ilə idxal edilmiş istifadəçi administrasiyadan asılıdır. Kiçik
  universitet miqyasında (14–28 nəfərlik siniflər) idarə oluna biləndir, amma
  miqyas artanda **ilk bağlanmalı boşluqdur**.

---

## QD-002 — Baza: SQLite (PostgreSQL deyil)

**Status:** qəbul edilib (Blok 0).

### Kontekst

Layihə lokal işləməli, qiymətləndirici `git clone` edib **bir əmrlə** qaldıra
bilməlidir. Miqyas ölçülüb: universitet sinfi 14–28 nəfərdir, seed 6 sinif və
125 istifadəçi yaradır. Yazma yükü demək olar ki, yoxdur.

### Qərar

**SQLite** (`file:./dev.db`), Prisma 6 ilə.

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| **PostgreSQL + Docker** | Qiymətləndirici üçün əlavə şərt: Docker quraşdırılmalı, konteyner qalxmalı, port boş olmalı. «Bir əmrlə işə düşür» iddiasını sındırır |
| Buludda hosted Postgres (Neon/Supabase) | Şəbəkədən və pulsuz kvotadan asılılıq. Oflayn demo (müdafiə otağı) mümkün olmur |
| MongoDB | Data relyasiyalıdır (sinif ↔ üzv ↔ paylaşım ↔ nailiyyət). Sənədli baza burada süni çətinlikdir |
| MySQL | Postgres-ə nisbətən üstünlük yoxdur, eyni Docker şərti qalır |

### Nəticə

- ➕ `npm install && npx prisma migrate dev && npm run db:seed && npm run dev` —
  Docker, xarici xidmət, şəbəkə lazım deyil.
- ➕ Testlər real bazaya qarşı işləyir (13 inteqrasiya faylı `tests/integration/`).
- ➖ **Paralel yazma yoxdur** (tək yazıcı kilidi). Bu miqyasda hiss olunmur,
  amma çox istifadəçili istehsalda birinci məhdudiyyət budur.
- ➖ SQLite native `enum` və `String[]` dəstəkləmir → QD-005.
- **Keçid ölçülüb və sənədləşib:** [`docker-compose.yml`](../docker-compose.yml)
  — dörd addım, **tətbiq kodunda sıfır dəyişiklik**. Miqrasiya qovluğu yenidən
  yaradılır, çünki SQLite DDL-i Postgres-ə uyğun deyil.

---

## QD-003 — Tək repo, tək proses — ayrı backend YOXDUR

**Status:** qəbul edilib (Blok 0).

### Kontekst

Klassik bölgü: `frontend/` (React) + `backend/` (Express/Nest) + ayrı deploy.
Layihə 17 moduldur və vaxt büdcəsi ölçülüb (~19 saat, `PLAN.md` §2).

### Qərar

Next.js 15 App Router **həm render, həm API** qatıdır. Mutasiyalar Server
Action-larla, oxu Server Component-lərlə. `/api/v1` isə xarici inteqrasiya üçün
**əlavə** REST səthidir, dublikat deyil (bax [`ARCHITECTURE.md`](ARCHITECTURE.md) §7).

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| Ayrı Express/Nest backend | Ayrı deploy + ayrı auth + CORS + tip dublikatı. Üç problem, sıfır fayda — istifadəçi tək mənbədən gəlir |
| tRPC | Tip təhlükəsizliyi Server Action-larla onsuz da var; əlavə asılılıq stack kilidinə ziddir |
| GraphQL | Məxfilik mühərriki üçün ƏLEYHİNƏ işləyir: sərbəst seçilən sahə qrafı hər sahə üçün ayrıca icazə yoxlaması tələb edir. REST + servis qatında qapı TƏKDİR |
| Yalnız `/api/*`, Server Action yox | Hər mutasiya üçün əl ilə fetch + validasiya + xəta idarəsi — kod həcmi ~2× |

### Nəticə

- ➕ Məxfilik məntiqi **tək yerdə** (`lib/visibility.ts`) və hər iki səth onu
  keçir. İki backend olsaydı qayda iki yerdə köhnələ bilərdi.
- ➕ Tip zənciri uçdan-uca: Prisma → servis → komponent.
- ➖ Next.js-ə güclü bağlılıq. Backend-i ayırmaq lazım olsa `services/` qatı
  köçürülə bilər (Prisma girişi orada təcrid olunub), amma `app/` yenidən yazılır.

---

## QD-004 — KUDS §20-nin `pages/` qovluğu `features/`-dir

**Status:** qəbul edilib (Blok 0) · **konflikt sənədləşdirilib**.

### Kontekst

KUDS v1.0 §20 qovluq strukturunu məcburi edir və orada `src/pages/` var. Next.js
App Router-də isə `src/pages/` **köhnə Pages Router-i aktivləşdirir** — iki router
eyni anda işləyir, route-lar toqquşur, build gözlənilməz davranır.

### Qərar

`src/pages/` **yaradılmır**. KUDS-un nəzərdə tutduğu «səhifə səviyyəli modul»
qatı `src/features/`-dir (hazırda **24 modul**). `src/app/**/page.tsx` faylları
nazikdir — yalnız `features/`-dan import edib render edirlər.

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| KUDS-a hərfi riayət (`src/pages/`) | Next.js-i sındırır — texniki cəhətdən mümkün deyil |
| `src/app/` daxilində modul saxlamaq | `app/` qovluğundakı hər fayl route ehtimalıdır; şəxsi komponentlər route ağacını çirkləndirir |
| KUDS-u dəyişmək təklifi | Bizim səlahiyyətimizdə deyil — standart universitetindir |

### Nəticə

- ➕ KUDS-un **məqsədi** (modul-yönümlü qat) qorunur, adı dəyişir.
- ➖ Standartla hərfi uyğunsuzluq. Buna görə `CLAUDE.md` §7-də və burada AÇIQ
  yazılıb — «unudulub» ilə «qərardır» ayrılsın.

---

## QD-005 — Bütün enum-lar `String` sütun + Zod

**Status:** qəbul edilib (Blok 1).

### Kontekst

SQLite Prisma-da native `enum` və `String[]` dəstəkləmir (QD-002-nin nəticəsi).
Layihədə **37 enum ailəsi** var (`src/lib/enums.ts`) — 4 görünürlük səviyyəsi,
12 nailiyyət kateqoriyası, 12 paylaşım kateqoriyası, 8 xatirə növü, 11 bələdçi
kateqoriyası və s.

### Qərar

Sxemdə sütun `String`-dir. Həqiqət mənbəyi `src/lib/enums.ts`-dir və hər enum
üç şey ixrac edir:

```ts
X_VALUES   // const massiv — sıra sabitdir
XSchema    // z.enum(...) — sərhəddə validasiya
X          // tip + sabit obyekt — kodda X.AWARD kimi işlənir
```

Sətir literalı yazılmır, enum import edilir (Blok 12A-da grep ilə yoxlanılıb).

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| Postgres native enum | QD-002-yə zidd |
| Lookup cədvəli (`Category` modeli) | 37 ailə → 37 cədvəl + 37 join. Dəyərlər dəyişmir — bu, data deyil, koddur |
| Sadəcə `String`, validasiya yox | DB-yə səhv dəyər düşür və səssizcə boş nəticə verir. Blok 12A-da tapılan **6 enum literalı** məhz bu riskin sübutudur |
| TypeScript `enum` açar sözü | Runtime-da qorumur; Zod sərhəddə (`req.json()`, `searchParams`) yoxlaya bilmir |

### Nəticə

- ➕ **Miqrasiya üstünlüyü:** Postgres-ə keçəndə enum köçürməsi TƏLƏB OLUNMUR
  (bax [`docker-compose.yml`](../docker-compose.yml)). Məhdudiyyət üstünlüyə çevrilib.
- ➕ Validasiya sərhəddə, tip kompilyasiyada — ikisi eyni mənbədən.
- ➖ DB özü dəyərləri qorumur. Buna görə `SystemRoleSchema.catch("USER")` kimi
  **fail-closed** oxumalar işlədilir: naməlum dəyər → ən aşağı səlahiyyət.

---

## QD-006 — Məxfilik filtri **DB-də** tətbiq olunur, JS-də deyil

**Status:** qəbul edilib (Blok 3) · **danışılmaz**.

### Kontekst

«Görünməyəni gizlət» iki cür yazıla bilər: bütün sətirləri gətirib JS-də
süzmək, ya da şərti Prisma `where`-inə birləşdirmək.

### Qərar

`visibilityWhere(viewer)` Prisma `where` fraqmenti qaytarır və hər servis
sorğusuna birləşdirilir. **JS-də filtrləmə qadağandır.**

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| JS-də `.filter()` | 🔴 **İki şeyi sındırır:** (1) `take`/`skip` səhifələmə — 20 sətir gətirilir, 12-si atılır, istifadəçi «yarımçıq səhifə» görür; (2) `count()` — say filtrsiz hesablanır və **görünməyən məzmunun mövcudluğu sızır** |
| Prisma middleware / `$extends` | Qayda görünməz olur; yeni servis funksiyası yazanın onu «unutması» mümkün deyil, amma **oxuyanın da görməsi** mümkün deyil. Açıq `where` review-da yoxlanıla bilir |
| DB view / RLS | SQLite RLS dəstəkləmir (QD-002) |

### Nəticə

- ➕ Səhifələmə və `count()` dürüstdür.
- ➕ Blok 12A auditi `grep` ilə hər servis sorğusunu cədvəlləşdirib yoxlaya
  bilir — qayda **oxuna bilən** yerdədir.
- ➖ İntizam tələb edir: hər yeni servis funksiyası `visibilityWhere` çağırmalıdır.
  Buna görə `CLAUDE.md` §5 və `tests/integration/visibility.db.test.ts` var.
- ⚠️ **Status ölçüsü ayrıdır** — `Achievement`/`Event` üçün `activeVisibleWhere`
  çağırsan sıfır nəticə alırsan (bax [`ARCHITECTURE.md`](ARCHITECTURE.md) §4).

---

## QD-007 — `TimelineEntry` denormalizə edilib

**Status:** qəbul edilib (Blok 8).

### Kontekst

Sinif xronologiyası üç mənbədən qidalanır: `Post`, `Achievement`, `Event`, üstəgəl
sistem mərhələləri (`isSystemMilestone`). Səhifə üç filtr təklif edir (il,
kateqoriya, mənbə növü) və səhifələnir.

### Qərar

Ayrıca `TimelineEntry` cədvəli. `title`, `summary`, `category`, `occurredAt`,
**`visibility`** və hesablanmış `academicYear` mənbədən **kopyalanır**.
`postId` / `achievementId` / `eventId` `@unique` və nullable-dır.

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| Sorğu zamanı üç cədvəli `UNION` etmək | SQLite-da Prisma `UNION` vermir → üç ayrı sorğu + JS-də birləşdirmə + JS-də sıralama. Bu, QD-006-nı pozur: səhifələmə düzgün işləməz |
| `Post`-a `isTimeline` bayrağı | `Achievement` və `Event` xronologiyaya girə bilməz; sistem mərhələsinin (məzuniyyət, qəbul) sahibi yoxdur |
| Materialized view | SQLite-da yoxdur |

### Nəticə

- ➕ Xronologiya **tək cədvəldən, tək sorğu ilə** oxunur — filtr, sıralama,
  səhifələmə DB-dədir. `@@index([cohortId, occurredAt])` və
  `@@index([cohortId, academicYear])` bunu bərkidir.
- ➕ `visibility` sətirdə olduğu üçün `visibilityWhere` join olmadan tətbiq olunur.
- ➖ **Kopyalanmış data köhnələ bilər.** Buna görə iki qayda:
  1. `TimelineEntry.visibility` mənbədən **daha açıq ola bilməz**
     (`narrowest(postVisibility, ceiling)`).
  2. 🔴 Silmə **soft delete**-dir (`status = DELETED`), yəni `onDelete: Cascade`
     İŞƏ DÜŞMÜR — `deletePost` eyni transaksiyada `timelineEntry.deleteMany`
     çağırır. Bu, `post.service.ts`-də TƏLƏ T4 kimi qeyd olunub və
     `features/feed/fanout.test.ts` ilə qorunur.

---

## QD-008 — Auth.js konfiqi ikiyə bölünüb (Edge / Node)

**Status:** qəbul edilib (Blok 2) · **məcburi, seçim deyil**.

### Kontekst

`src/middleware.ts` default olaraq **Edge runtime**-da işləyir və onun import
qrafındakı **hər modul** Edge üçün bundle olunur. Prisma engine və `bcryptjs`
Edge-də işləmir.

### Qərar

Auth.js «split config» nümunəsi:

| Fayl | Runtime | Məzmun |
|---|---|---|
| `src/auth.config.ts` | Edge-təhlükəsiz | yalnız `callbacks` + kuka adı + `providers: []` |
| `src/auth.ts` | Node | `auth.config`-i spread edir, `Credentials` (Prisma + bcrypt) əlavə edir |
| `src/middleware.ts` | Edge | **yalnız** `NextAuth(authConfig)` |
| `src/lib/auth.ts` | Node | barrel — server kodu buradan import edir |

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| Tək konfiq faylı | `npm run build` sınır — Prisma engine Edge bundle-a düşür. Texniki cəhətdən mümkün deyil |
| `export const runtime = "nodejs"` middleware-də | Next.js 15-də middleware üçün Node runtime stabil deyil; Edge davranışı və soyuq start üstünlükləri itir |
| Middleware-i tamamilə silmək | Qorunma yalnız səhifədə qalır; qorunan URL-ə anonim sorğu əvvəlcə render başlayır — 302 daha erkən və ucuzdur |

### Nəticə

- ➕ Build keçir, qorunma iki qatdadır (middleware + `requireUser()`/`requireAdmin()`).
- ➖ Konfiq iki fayldadır — birləşdirmək cazibədardır və **səssizcə sınmır,
  build-də sınır**. Hər iki fayl başında bu, böyük hərflərlə yazılıb.
- ⚠️ JWT tip genişlənməsi `@auth/core/jwt`-yə yazılır, `next-auth/jwt`-yə YOX
  (sonuncu yalnız `export *` edir → `token.userId` `unknown` qalır).

---

## QD-009 — JWT sessiya — `Session` cədvəli YOXDUR

**Status:** qəbul edilib (Blok 2).

### Kontekst

Auth.js iki strategiya təklif edir: `database` (sessiya cədvəli + hər sorğuda DB
oxuması) və `jwt` (imzalanmış kuka).

### Qərar

`session: { strategy: "jwt" }`. Sxemdə `Session` / `Account` / `VerificationToken`
cədvəli **yoxdur** — 28 modelin heç biri sessiya saxlamır.

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| `database` strategiyası | Middleware **Edge-dədir** (QD-008) və orada Prisma işləmir → sessiyanı oxumaq üçün DB sorğusu mümkün deyil. Yəni bu seçim middleware qorumasını tamamilə ləğv edərdi |
| Öz sessiya cədvəli + əl ilə kuka | Auth.js-in imza/rotasiya/CSRF məntiqini yenidən yazmaq — təhlükəsizlik kritik kodun dublikatı |

### Nəticə

- ➕ Edge-də sessiya DB-siz oxunur; middleware işləyir.
- ➕ Üç cədvəl az — sxem sadədir.
- ➖ **Sessiya serverdən dərhal ləğv edilə bilmir.** Token öz müddətinə qədər
  keçərlidir. Deaktiv edilmiş hesab üçün bu boşluq `authorize()`-da
  `deactivatedAt` yoxlaması ilə **girişdə** bağlanır, amma artıq açıq olan
  sessiya üçün tam həll `AUTH_SECRET` rotasiyasıdır (hamını çıxarır).
- ➖ Token daxilindəki data köhnələ bilər → **buna görə QD-010**.

---

## QD-010 — JWT **minimaldır** — `cohortIds` token-də saxlanmır

**Status:** qəbul edilib (Blok 2) · QD-009-un birbaşa nəticəsi.

### Kontekst

`Viewer` obyekti dörd şey tələb edir: `userId`, `systemRole`, `cohortIds`,
`moderatedCohortIds`. Sonuncu ikisi **dəyişkəndir** — istifadəçi yeni sinfə əlavə
oluna, moderator təyin edilə və ya çıxarıla bilər.

### Qərar

Token-də **yalnız** `userId` + `systemRole`. `cohortIds`, `stage`,
`moderatedCohortIds` hər sorğuda `getViewer()` ilə DB-dən oxunur. Funksiya React
`cache()` ilə örtülüb → **render başına bir sorğu**.

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| Hamısını token-ə yazmaq | 🔴 **Məxfilik xətası.** Sinifdən çıxarılmış istifadəçi token bitənə qədər sinif məzmununu görməkdə davam edər. Moderatorluqdan çıxarılan şəxs isə **PRIVATE olmayan hər şeyi** moderasiya edə bilər |
| Qısa ömürlü token + refresh | Auth.js v5 Credentials axınında refresh rotasiyası hazır deyil; əl ilə yazmaq QD-009-dakı dublikat riskini gətirir |
| Token-ə yaz + hər dəyişiklikdə invalidasiya et | İnvalidasiya siyahısı = server tərəfli vəziyyət = əslində `Session` cədvəli (QD-009-a zidd) |

### Nəticə

- ➕ **İcazə həmişə cari.** Sinif üzvlüyü dəyişəndə növbəti sorğuda tətbiq olunur.
- ➕ Token kiçikdir → hər sorğuda daşınan kuka kiçikdir.
- ➖ Render başına bir əlavə DB sorğusu. `cache()` sayəsində eyni render
  ağacında təkrarlanmır; SQLite-da bu sorğu indeksli və ucuzdur.
- ⚠️ **`User.stage` yalnız keşdir.** Vahid həqiqət mənbəyi
  `resolveStage(cohort, now)`-dur. Keş girişdə yenilənir (`signIn` callback);
  sinxronlaşma sınsa **giriş dayanmır**, çünki UI onsuz da `resolveStage()`
  nəticəsini göstərir.

---

## QD-011 — Maaş / bonus sahəsi YOXDUR

**Status:** qəbul edilib (Blok 10B) · **məhsul qərarı, texniki məhdudiyyət deyil.**

### Kontekst

«İndi haradayıq?» paneli məzunların karyera nəticələrini göstərir. Belə
platformalarda maaş bölgüsü gözlənilən funksiyadır və istifadəçi üçün dəyərlidir.
Sinif ölçüsü isə **14–28 nəfərdir** (`prisma/seed-data/content.ts`).

### Qərar

**Nə sxemdə sütun, nə servisdə hesablama, nə API cavabında sahə var.**

Səbəb — arifmetika, xana ölçüsü deyil: aqreqasiya olunmuş maaş kiçik sinifdə
fərdiləşdirilə bilər. Öz rəqəmini bilən bir nəfər ortadan qalanları çıxarır; iki
nəfər praktiki olaraq üçüncünü tapır. **k-anonimlik bunu HƏLL ETMİR**, çünki
problem xananın ölçüsündə deyil, göstəricinin özündədir.

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| Maaş + k-anonimlik (k=3) | Yuxarıdakı çıxma hücumuna qarşı işləmir — orta göstərici həmişə tərs çevrilə bilir |
| Yalnız diapazon («1000–2000 AZN») | 22 nəfərlik sinifdə diapazon bölgüsü də şəxsə qədər daralır; üstəlik başqa ölçü (şirkət, vəzifə) ilə kəsişdirilir |
| Yalnız universitet səviyyəsində cəm | Bu sinif səhifəsidir — universitet miqyaslı göstərici modulun məqsədinə xidmət etmir |
| Ayrıca opt-in ilə maaş | Razılıq verənlərin sayı azdır → xana daha da kiçilir → risk **artır**, azalmır |

### Nəticə

- ➕ Sənəd bunu **sübut edir**: `WhereAreWeNow` OpenAPI sxemi
  `additionalProperties: false`-dur və `src/lib/api/openapi.test.ts` sənəddə
  `salary` / `bonus` sözünün **olmadığını** yoxlayır. Yəni qərar testlə qorunur,
  şərhlə deyil.
- ➖ Məhsul funksiyası itir. Şüurlu güzəştdir: platformanın vədi «əlaqə»dir,
  «müqayisə» deyil.

---

## QD-012 — Xəritə koordinatı bazadan gəlmir

**Status:** qəbul edilib (Blok 10B).

### Kontekst

Karyera xəritəsi (`/class/[slug]/map`) məzunların harada olduğunu göstərir.
Dəqiq koordinat = iş yerinin (bəzən ev ünvanının) dəqiq mövqeyi.

### Qərar

`CareerEntry`-də `latitude` / `longitude` sütunu **yoxdur**. Pin **şəhər
mərkəzinə** qoyulur — `src/lib/geo.ts` statik cədvəldir və `prisma` importu
yoxdur. Tanınmayan şəhər pin **YARATMIR**; sətir ölkə səviyyəsində sayılır.

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| Dəqiq koordinat saxla, UI-da kobudlaşdır | Data bazada qalır → API sızması, backup sızması, admin girişi. Kobudlaşdırma **saxlama** anında olmalıdır, göstərmə anında yox |
| Geocoding API ilə runtime hesablama | Xarici xidmətə hər ünvanı göndərmək = məlumatı üçüncü tərəfə vermək |
| Koordinatı saxla + `PRIVATE` et | Bir kod səhvi ilə açılır. Olmayan sütun sıza bilmir |

### Nəticə

- ➕ Eyni şəhərdəki iki nəfər **eyni nöqtədə birləşir** — xəritədən fərd
  ayırd edilə bilmir.
- ➕ `geo.ts` saf modul olduğuna görə bazasız test edilir (`geo.test.ts`).
- ➖ Xəritə dəqiqliyi şəhər səviyyəsindədir. Modulun məqsədi «kim haradadır»
  deyil, «sinif harada toplanıb» olduğu üçün bu, itki deyil.

---

## QD-013 — k-anonimlik həddi = 3

**Status:** qəbul edilib (Blok 10B) · `MIN_BUCKET_SIZE = 3` (`src/lib/visibility.ts`).

### Kontekst

Aqreqasiya xanası nə qədər kiçik olmalıdır ki, fərd ifşa olmasın? Sinif 14–28
nəfərdir — hədd nə qədər böyükdürsə, o qədər çox xana gizlənir.

### Qərar

**k = 3.** 3 nəfərdən kiçik xana göstərilmir.

Yer ölçüsündə **generalizasiya iyerarxiyası** var:

```
şəhər xanası < 3  →  sətir ÖLKƏ səviyyəsinə yığılır
ölkə xanası  < 3  →  sətir "Açıqlanmayan" olur
```

Sətir **itmir** — kobudlaşdırılır.

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| **k = 2** | 2 nəfərlik xanada hər biri o birini birbaşa tanıyır («mən və bir nəfər daha») — qoruma yoxdur |
| **k = 5** (bir çox rəsmi statistikanın həddi) | 14–28 nəfərlik sinifdə demək olar ki, **hər xana gizlənir**. Ölçülüb: seed-də karyera bölgüsü 15 ölkəyə səpiləndə panelin hər xanası boş qalırdı — məxfilik işləyirdi, məhsul yox idi |
| Differensial məxfilik (səs əlavə etmək) | Bu miqyasda səs faydalı siqnaldan böyük olur; üstəlik «17 nəfər» yazıb 14 nəfər olması istifadəçi üçün yanlış məlumatdır |

### Nəticə

- ➕ Minimum praktik qoruma + göstəriləcək məzmun qalır.
- ➕ Qayda saf funksiyadadır (`suppressSmallBuckets`) və bazasız test olunur.
- ➖ k=3 mütləq qoruma deyil — buna görə **çarpaz ölçü qaydası** (QD-014-ün
  altındakı qeyd) və QD-011 birlikdə işləyir.
- ⚠️ Seed datası bu həddi nəzərə alaraq **qəsdən kümələnib**
  (`CAREER_PLACEMENT_PLANS`); sətir sayları dəyişməyib, PRNG axını qorunub.

---

## QD-014 — Aqreqasiya üçün **AYRI** razılıq (`includeInStats`)

**Status:** qəbul edilib (Blok 3, Blok 10B-də tətbiq).

### Kontekst

İstifadəçi karyera qeydini `CLASS` səviyyəsində paylaşır. Bu, «sinif yoldaşlarım
görsün» deməkdir. Panel isə həmin sətri **statistikaya** qatır — fərqli məqsəd.

### Qərar

`User.includeInStats` ayrıca boolean razılıqdır. Aqreqasiya sorğusu
`statsConsentWhere` (`{ includeInStats: true }`) tələb edir.
**Görünürlük səviyyəsi KİFAYƏT DEYİL.**

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| Görünürlük səviyyəsini razılıq kimi qəbul et | Məqsəd fərqlidir. «Sinif yoldaşım görsün» ≠ «rəqəm kimi sayılım». Razılıq **məqsədə** verilir, sahəyə yox |
| Default `true` + opt-out | Razılıq default aktivdirsə razılıq deyil. `PUBLIC` deyil, `CLASS` default qaydası (CLAUDE.md) ilə də ziddiyyət |
| Ayrı-ayrı ölçülər üçün ayrı razılıq | 5 ölçü × 5 açar = istifadəçinin başa düşmədiyi panel. Bir aydın sual daha yaxşıdır |

### Nəticə

- ➕ Razılıq **məqsəd əsaslıdır** — GDPR-in razılıq anlayışına uyğun oxunur.
- ➕ İstifadəçi profilini açıq saxlayıb statistikadan çıxa bilir.
- ➖ Panelin `respondentCount`-u sinif ölçüsündən kiçik olur. Bu, UI-da açıq
  göstərilir — «neçə nəfərdən» rəqəmi gizlədilmir.
- ⚠️ **Çarpaz ölçü qaydası birlikdə işləyir:** bütün bölgülər TƏK sətir çoxluğu
  üzərində, TƏK keçiddə hesablanır və hər ölçüdə
  `Σ açıqlanan + açıqlanmayan + bildirilməyən = respondentCount`.
  Buna görə iki qrafiki bir-birindən çıxıb qalıq (deməli fərd) almaq mümkün
  deyil. Alqoritm və ölçülmüş alternativlər `src/lib/career-stats.ts`
  başlığındadır.

---

## QD-015 — Giriş xətası hesab enumerasiyasını fərqləndirmir

**Status:** qəbul edilib (Blok 2, Blok 11B-də genişləndirilib).

### Kontekst

«İstifadəçi tapılmadı» ilə «şifrə səhvdir» arasındakı fərq istifadəçi üçün
faydalıdır, amma **hansı e-poçtun sistemdə qeydiyyatlı olduğunu** açır. Universitet
e-poçtları formuludur (`s347793@qu.edu.az`) — yəni siyahı sadəcə sadalana bilər.

### Qərar

Bütün uğursuz giriş yolları **eyni mesajı** və **eyni müddəti** qaytarır:

```
"E-poçt və ya şifrə yanlışdır."
```

Dörd yol da bərabərləşdirilib (`src/auth.ts` → `authorize`):

| Hal | Davranış |
|---|---|
| İstifadəçi yoxdur | `equalizeFailureTiming(password)` → `null` |
| Hesab deaktivdir | `equalizeFailureTiming(password)` → `null` |
| Şifrə təyin olunmayıb (SIS idxalı) | `equalizeFailureTiming(password)` → `null` |
| Şifrə səhvdir | `compareSync` → `null` |

`equalizeFailureTiming` **əsl bcrypt müqayisəsi** işlədir, yəni cavab müddəti də
siqnal daşımır. Mətn UI (`features/auth/actions.ts`) və API
(`/api/v1/auth/login`) arasında eynidir — səth fərqi də məlumat verməməlidir.

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| Dəqiq mesajlar | Hesab siyahısı sızır. Kiçik universitetdə bu, «kim burada oxuyub» sualına cavabdır — özü də şəxsi məlumatdır |
| Fərqli mesaj, amma rate-limit | Rate-limit sürəti azaldır, sızmanı dayandırmır |
| `sleep(random)` ilə vaxt maskalamaq | Təsadüfi gecikmə statistik olaraq təmizlənə bilir; sabit iş (real bcrypt) daha etibarlıdır |

### Nəticə

- ➕ Enumerasiya həm **məzmun**, həm **vaxt** kanalında bağlıdır.
- ➕ Rate-limit əlavə qatdır: `LOGIN_MAX_ATTEMPTS = 5` / `LOGIN_WINDOW_MS = 10 dəq`,
  sayğac **yalnız uğursuz** cəhddə artır (`src/lib/api/rate-limit.ts`).
- ➖ İstifadəçi «e-poçtu səhv yazdım» ilə «şifrəni unutdum» arasında fərq görmür.
  Parol sıfırlama axını olsaydı bu, ağrılı olardı — hazırda yoxdur (QD-001).
- ⚠️ **`/register` bu qaydadan istisnadır:** e-poçt məşğuldursa `EMAIL_TAKEN`
  qaytarır. Bu bilinən güzəştdir — qeydiyyat formasında istifadəçiyə səbəb
  deməmək axını tamamilə dayandırır.

---

## QD-016 — shadcn/ui **v2** pinlənib, `@latest` qadağandır

**Status:** qəbul edilib (Blok 0) · **danışılmaz**.

### Kontekst

KUDS v1.0 dizayn tokenləri Tailwind **v3.4** konfiq faylı (`tailwind.config.ts`)
üzərində qurulub: `ku-green`, `rounded-card`, `shadow-sm-kuds`, tipoqrafiya
şkalası. shadcn CLI v3 isə **Base UI + Tailwind v4** komponentləri yazır —
Tailwind v4-də `tailwind.config.ts` ümumiyyətlə oxunmur.

### Qərar

Komponent yalnız belə əlavə olunur:

```bash
npx shadcn@2.10.0 add <ad> -y -o && rm -f tailwind.config.js
```

`rm -f tailwind.config.js` **məcburidir**: CLI `.js` konfiq yarada bilər, Tailwind
isə `.js`-i `.ts`-dən əvvəl oxuyur → KUDS konfiqi **səssizcə** nəzərə alınmaz.

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| `shadcn@latest` (v3) + Tailwind v4-ə keçid | Bütün KUDS token cədvəli yenidən yazılmalıdır; 51 səhifə və 539 fayl bu tokenlərdən asılıdır. Dizayn standartı universitetindir, «yeniləyək» qərarı bizim deyil |
| Komponentləri əl ilə yazmaq | shadcn Radix əlçatanlıq davranışını (fokus tələsi, ARIA, klaviatura) gətirir — onu yenidən yazmaq a11y regressiyası deməkdir |
| v3 komponentlərini v2-yə əl ilə uyğunlaşdırmaq | Hər `add` əmrindən sonra əl işi = qaçılmaz sürüşmə |

### Nəticə

- ➕ KUDS tokenləri sabit qalır; kontrast dəyərləri hesablanıb testlə bərkidilib
  (`src/lib/kuds-contrast.test.ts`).
- ➖ **`src/components/ui/` toxunulmazdır** — orada ingiliscə hardcode mətnlər
  var (məs. `PaginationPrevious` → "Previous"). Həll: aşağı səviyyəli primitivi
  (`PaginationLink`) azərbaycanca `children` ilə işlətmək. Nümunə: `/kuds` səhifəsi.
- ➖ **44px toxunma hədəfi tam ödənmir** (351 element 24–43px arası) — shadcn-in
  öz ölçüsüdür (`h-9` = 36px). WCAG 2.2 AA-nın 24px qapısı **ödənilib**
  (`docs/quality-report-12c.md` §3.2).

---

## QD-017 — Git əməliyyatları `isomorphic-git` ilə

**Status:** qəbul edilib (Blok 7B) · **mühit məhdudiyyəti, üslub seçimi deyil.**

### Kontekst

Layihənin qurulduğu mühitdə **`git` binarı yoxdur**. Holberton isə commit
tarixçəsinə baxır — tarixçə iş axınını əks etdirməlidir.

### Qərar

`isomorphic-git` (devDependency) + `scripts/git.mjs`:

```bash
npm run git:commit -- -m "mesaj" -d "2026-07-30T13:20:00"
npm run git:log
npm run git:audit     # tarixçədə sirr axtarır
npm run git:push
```

Nəticə **standart `.git` qovluğudur** — `git log` / `git clone` ilə tam uyğundur,
yalnız yaratma vasitəsi fərqlidir.

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| `git` quraşdırmaq | Mühitə paket quraşdırma imkanı yoxdur |
| Commit-siz təhvil (zip) | Holberton tarixçəyə baxır; tək commit iş axınını göstərmir |
| Bütün commit-ləri «indi» damğası ilə yazmaq | Tarixçə «bir dəqiqədə 33 commit» kimi görünür — yanıltıcıdır. Buna görə `-d` bayrağı **məcburi işlədilir** və `author.timestamp` saniyə ilə verilir |

### Nəticə

- ➕ **33 commit**, real tarix damğaları ilə, blok-blok iş axınını əks etdirir.
- ➕ **Token təhlükəsizliyi qazanıldı:** `GITHUB_TOKEN` yalnız mühit
  dəyişənindən oxunur, əmr sətrindən **YOX** — `ps` çıxışı və bash tarixçəsi
  maşındakı hər prosesə görünür (bax [`SECURITY.md`](SECURITY.md) §5).
- ➕ `isomorphic-git/http/node` **yalnız `push`-da, tənbəl** yüklənir —
  `init`/`commit`/`log` şəbəkəyə çıxmır.
- ➖ Rebase, cherry-pick, interaktiv əməliyyatlar yoxdur. Bu iş axını üçün
  lazım olmadı.

---

## QD-018 — Deploy: Fly.io + volume, Postgres-ə keçid YOX

**Status:** qəbul edilib (Sprint 3/4 auditindən sonra, 2026-08-18) ·
Audit variantı: **B2** (`docs/SPRINT-3-4-AUDIT.md` §10.4).

### Kontekst

Sprint 3 və Sprint 4 auditi (`docs/SPRINT-3-4-AUDIT.md`) hər iki sprinti
**QƏBUL OLUNMUR** qiymətləndirdi və səbəb tək idi: **deploy yoxdur**.
`ls Dockerfile*` → yox · `ls vercel.json` → yox · `ls -a .github` → yox.
Bu, beş qəbul meyarının qapısıdır (Sprint 3 → 2, 3, 7 · Sprint 4 → 5, 8).

Funksional əhatə isə tam idi: 43/43 route, 17/17 modul, 1759 test (o anın ölçüsü — cari rəqəmlər `METRICS.md`-də).
Yəni bağlanmalı olan boşluq **kod deyil, infrastruktur** idi.

Audit iki yol ölçdü: **A** (Vercel + Postgres + Blob) və **B2** (Docker +
persistent volume). Qərar deployden ƏVVƏL verilməli idi — §10.3-də göstərildiyi
kimi, provider dəyişikliyi `prisma/migrations/` qovluğunun **silinməsini** tələb
edir (`migration_lock.toml` → `provider = "sqlite"`, uyğunsuzluq P3019 verir) və
istehsal datası yarandıqdan sonra bu keçid mümkün olmur.

### Qərar

**Fly.io · Docker image · `/data` volume · SQLite qalır.**

| Artefakt | Rolu |
|---|---|
| [`Dockerfile`](../Dockerfile) | `deps → builder → migrator → runner`, `node:22-slim` |
| [`docker-entrypoint.sh`](../docker-entrypoint.sh) | uploads keçidi → `migrate deploy` → şərti seed → `node server.js` |
| [`fly.toml`](../fly.toml) | `internal_port 3000`, `force_https`, `/data` mount, `min_machines_running = 1` |
| [`scripts/deploy.mjs`](../scripts/deploy.mjs) | idempotent: flyctl → app → volume → secrets → `fly deploy` |
| `next.config.ts` | `+output: "standalone"` — **tək sətir** |
| `prisma/schema.prisma` | `+binaryTargets` — `generator` blokunda, `datasource`-a toxunmadan |

**Toxunulmayanlar:** `prisma/migrations/` (3 miqrasiya olduğu kimi qalır) ·
`datasource.provider` · `src/services/storage.ts` · `src/components/ui/`.

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| **A — Vercel + Postgres + Blob** | Üç müstəqil risk eyni anda: (1) `prisma/migrations/` silinir və sıfırdan yaradılır (§10.3); (2) `storage.ts` `@vercel/blob`-a keçir və `MediaAsset.url` formatı dəyişir — mövcud seed məzmunu ilə uyğunluq ayrıca yoxlanmalıdır; (3) SQLite qərarı ([QD-002](#qd-002--baza-sqlite-postgresql-deyil)) və onun «oflayn demo» arqumenti müdafiə mətnindən çıxarılmalı olur. Audit qiyməti: 6–10 saat, risk **orta-yüksək** |
| **B1 — Turso / libSQL** | `driverAdapters` **preview** rejimindədir; `prisma migrate` Turso üçün ayrı CLI axını tələb edir; üstəlik Turso yalnız bazadır — `storage.ts` problemi **yenə həll olunmur**. Audit: risk **yüksək**, tövsiyə edilmir |
| **Render** | Pulsuz planda **disk YOXDUR** (volume-suz bu variantın mənası qalmır) və xidmət **15 dəqiqə passivlikdən sonra yatır** — müdafiə otağında ilk sorğu soyuq start deməkdir |
| **Railway** | Pulsuz plan $5 kreditlə məhdudlaşdırılıb — demo müddəti proqnozlaşdırıla bilmir |
| **`next start` + `pm2`, öz VPS-də** | HTTPS, sertifikat yeniləmə və reverse proxy əl ilə qurulmalıdır; Fly bunları `force_https` ilə verir |

### Nəticə

- ➕ **İki mənbə faylı dəyişdi** (`next.config.ts` + `schema.prisma`-nın
  `generator` bloku), qalanı yeni infrastruktur artefaktıdır.
- ➕ Miqrasiya tarixçəsi **sıfırlanmadı** — P3019 problemi yaranmadı.
- ➕ SQLite qərarı ([QD-002](#qd-002--baza-sqlite-postgresql-deyil)) müdafiədə
  **olduğu kimi qalır**; oflayn demo arqumenti (`scripts/copy-swagger.mjs`
  başlığı) korlanmadı.
- ➖ **TƏK İNSTANSİYA.** Fly volume-u tək maşına bağlıdır və SQLite çoxlu
  yazıcı dəstəkləmir. İkinci maşın açılsa **öz ayrıca boş bazasını** görər və
  bu, xəta vermədən baş verər. `fly.toml`-da `auto_stop_machines = "off"` +
  `min_machines_running = 1` + tək region bunu qıfıllayır.
- ➖ Fly.io pulsuz volume üçün **kredit kartı** tələb edir.

### Deploy zamanı çıxan dörd tələ — və həlləri

Bunlar qərarın bir hissəsidir, çünki hər biri **build təmiz keçdiyi halda
yalnız canlıda** görünürdü.

**1. `output: "standalone"` `public/` və `.next/static`-i kopyalamır.**
Səhifə 200 qaytarır, bütün CSS/JS 404 verir. `Dockerfile` runner mərhələsində
üç `COPY` sətri bunu bağlayır — sıra vacibdir, `standalone` özü ilə
`node_modules` gətirir, ona görə `.prisma` **ondan sonra** yazılır.

**2. Prisma engine host OS-ə bağlıdır.**
`binaryTargets = ["native", "debian-openssl-3.0.x"]`. Dəyər base image-dən
asılıdır: `node:22-alpine` seçilsəydi `linux-musl-openssl-3.0.x` olardı.
`node:22-slim` seçildi, çünki `sharp` Alpine-də `libvips`-i musl üçün yenidən
qurmalı olur — 40 MB qazanc üçün iki əlavə uğursuzluq nöqtəsi.

**3. `public/uploads` image-in içindədir → hər deploy-da silinir.**
Entrypoint qovluğu silib `/data/uploads`-a simvolik keçid qoyur.
`storage.ts` **dəyişmir**: kod yenə `process.cwd()/public/uploads`-a yazır,
yalnız yolun arxasındakı disk volume-dur.

**4. 🔴 Next.js `public/` siyahısını yalnız SERVER BAŞLAYANDA oxuyur.**
Bu, tələ siyahısında **yox idi** — deploy hazırlığı zamanı ölçmə ilə tapıldı.
`next/dist/server/lib/router-utils/filesystem.js` → `publicFolderItems`
dəsti `recursiveReadDir` ilə **bir dəfə** doldurulur (`!opts.dev` bloku), sonrakı
sorğularda diskə baxılmır. `next start` altında ölçülmüş nəticə:

| Fayl | Nəticə |
|---|---|
| serverdən ƏVVƏL mövcud | `GET /uploads/…` → **200** |
| serverdən SONRA yaradılmış | `GET /uploads/…` → **404** |
| eyni fayl `next/image` ilə | `GET /_next/image?url=…` → **400** |

Yəni volume və simvolik keçid düzgün qurulsa belə, **istifadəçinin indicə
yüklədiyi şəkil server yenidən başlayana qədər açılmırdı**. `dev` rejimində
görünmür: orada hər sorğuda diskə baxılır (`if (!matchedItem && opts.dev)`).

Həll: [`src/app/uploads/[...path]/route.ts`](../src/app/uploads/%5B...path%5D/route.ts)
+ [`src/services/uploads-serve.ts`](../src/services/uploads-serve.ts).
Statik sürətli yol İTMİR — Next-in `getItem()` sıralaması `publicFolder`-i
`appFile`-dan əvvəl yoxlayır, yəni route yalnız start-dan sonra yaranmış
fayllara düşür. `storage.ts` yenə toxunulmadı: oxuma tərəfi eyni
`src/services/` qatında **ayrı** modula yazıldı.

### Demo datası — niyə şərti və niyə şablonla

Seed **destruktivdir** (`prisma/seed.ts:306-333` → 25 cədvəldə `deleteMany()`).
Hər restartda işləsəydi istifadəçi datası məhv olardı; heç işləməsəydi demo boş
qalardı. Entrypoint `User` cədvəlini **sayır** — fayl mövcudluğuna baxmır,
çünki `/data/qu.db` `migrate deploy`-dan sonra həmişə mövcuddur və fayl testi
ilk deploy-dan sonra heç vaxt işləməzdi.

Seed-in ÖZÜ runtime-da işlədilmir: `tsx` (dev-asılılıq), bütün `src/lib` qrafı
və `tsconfig` alias-ları tələb olunardı — bu, `standalone`-un bütün mənasını
itirərdi. Əvəzinə `Dockerfile` builder mərhələsində seed **bir dəfə** işlədilir
və nəticə hazır SQLite şablonu (1.4 MB) kimi image-ə qoyulur.

**Determinizm buna icazə verir — ölçülüb.** `seed.ts:107` sabit `NOW`
(`2026-07-29T09:00:00Z`), `seed.ts:470` sabit bcrypt duzu. İki müstəqil işlətmə
müqayisə edildi:

| Ölçü | 1-ci işlətmə | 2-ci işlətmə |
|---|---|---|
| `User` / `Post` / `Event` sayı | 125 / 300 / 25 | 125 / 300 / 25 |
| `User` sətirlərinin sha256-sı | `c940475657c3bbc3…` | `c940475657c3bbc3…` |
| **SQLite faylının sha256-sı** | `f4d165a1…` | `cdfe4991…` **← fərqli** |

⚠️ Yəni determinizm **məzmun səviyyəsindədir, bayt səviyyəsində deyil**: SQLite
səhifə yerləşdirmə sırası işlətmədən-işlətməyə dəyişir. Şablonu `sha256sum` ilə
müqayisə etmək yanlış nəticə verər — məzmunla müqayisə edilməlidir.

---

## QD-019 — Canlı instansiyada demo ADMIN parolu dəyişdirilir, üzv hesabları qalır

**Status:** qəbul edilib (Blok 12E, 2026-08-18) · Variant: **(b)** ·
Tətbiq anı: **ilk deploy** (`FLY_API_TOKEN` gəldiyi an — bax QD-018).

### Kontekst

`README.md` §«Test hesabları» beş seed hesabını və onların ORTAQ parolunu
(`Test1234!`) açıq yazır. Bu, lokal qiymətləndirmə üçün məqsədyönlüdür:
Holberton nəzarətçisi reponu klonlayıb `npm run db:seed` işlədir və dörd cohort
rolunu (`MEMBER` · `CLASS_REPRESENTATIVE` · `EVENT_COORDINATOR` ·
`CLASS_MODERATOR`) dərhal görə bilir.

Deploy (QD-018) bu tənliyi dəyişir: eyni sətirlər **internetdəki** instansiyaya
da açılır. Siyahıdakı hesablardan biri `admin@qu.edu.az` →
**`UNIVERSITY_ADMIN`**-dir, yəni README-ni oxuyan hər kəs canlı saytda tam
administrator kimi girə bilər. Bu, layihənin öz təhlükəsizlik iddiaları
(`docs/SECURITY.md`) ilə birbaşa ziddiyyət təşkil edir.

### Ölçülmüş risk — admin fərqi DƏRƏCƏ deyil, NÖVDÜR

Üzv hesablarının (rep / moderator / coordinator / alumni) zərər radiusu
məhduddur və modelin özü ilə çərçivəyə salınıb:

- hər sorğu `visibilityWhere(viewer)`-dən keçir — başqa sinfin məzmununa
  çatmırlar (CLAUDE.md §5);
- `PRIVATE` sahələr onlara da bağlıdır;
- `deletePost` **soft delete**-dir (`status = DELETED`), sətir qalır.

`UNIVERSITY_ADMIN` isə bir imkana görə ayrılır:
[`admin-users.service.ts` → `changeSystemRole`](../src/services/admin-users.service.ts)
istənilən istifadəçini `UNIVERSITY_ADMIN`-ə **yüksəldə bilir**. Yəni bir dəfəlik
giriş qalıcı nəzarətə çevrilir: sonradan `admin@qu.edu.az`-ın parolunu dəyişsək
belə, təcavüzkarın özünə açdığı ikinci admin hesabı QALIR. Bu, «demo datası
korlanar» səviyyəsindən fərqli bir haldır.

**Audit jurnalı bu boşluğu bağlamır.** Hər admin əməliyyatı `AuditLog`-a
düşür (`recordAudit`, YALNIZ ƏLAVƏ olunur) və moderasiya yolu tam auditlidir —
amma audit **izlənəbilirlikdir, geri qaytarma DEYİL**. Anonim internet
ziyarətçisinin `actorId`-sini bilmək heç nə vermir və `undo` yoxdur.

**Bərpa ucuz deyil — ölçülüb.** Canlı baza tək Fly volume-undadır (QD-018:
`min_machines_running = 1`, ehtiyat nüsxə yoxdur). Seed-i yenidən işlətmək
**destruktivdir** (25 cədvəldə `deleteMany`) və canlı instansiyada qadağandır.
Yəni «necə olsa sintetik datadır, bərpa edərik» arqumenti **yanlışdır**:
praktikada bərpa = volume-u silib sıfırdan deploy.

### Qərar

**Canlı instansiyada YALNIZ `admin@qu.edu.az`-ın parolu dəyişdirilir.**
Sənəddəki dörd üzv hesabı (`rep` · `moderator` · `coordinator` · `alumni`)
**toxunulmur** — portfolio nümayişinin dəyəri məhz onlardadır və zərər radiusu
yuxarıda göstərildiyi kimi modelin özü ilə çərçivələnib.

| | |
|---|---|
| Mexanizm | `fly secrets set DEMO_ADMIN_PASSWORD=…` + birdəfəlik rotasiya skripti |
| Nə vaxt | ilk uğurlu deploy-dan DƏRHAL SONRA, ilk ictimai link paylaşılmadan əvvəl |
| Lokalda | heç nə dəyişmir — `Test1234!` qalır, 20+ e2e faylı və `seed.ts` toxunulmur |
| README | üzv hesabları cədvəldə qalır; admin sətri «canlıda parol fərqlidir» qeydi ilə |

### Alternativlər

| Alternativ | Niyə seçilmədi |
|---|---|
| **(a) hamısı olduğu kimi qalır**, risk README-də yazılır | Xəbərdarlıq nəzarət deyil. Risk «sintetik data korlanar» kimi qiymətləndirilsəydi qəbul edilə bilərdi, amma `changeSystemRole` onu QALICI hesab ələ keçirməsinə çevirir və bərpa yolu (volume-u silmək) demo günü mövcud deyil |
| Bütün beş hesabın parolunu dəyişmək | Nümayişi öldürür: ziyarətçi dörd rolu görə bilməz, layihənin əsas iddiası (rol × görünürlük matrisi) yoxlanılmaz qalar. Zərər radiusu isə admin-dəki kimi genişlənmir |
| Admin hesabını canlıda tamamilə SİLMƏK | `checkSystemRoleChange` sonuncu admini qorumağa qurulub (`adminCount`); admin-siz instansiyada `/admin` səthi — 17 moduldan biri — nümayiş oluna bilməzdi |
| Canlıda `/admin`-i middleware ilə bağlamaq | Sənədləşdirilmiş funksionallığı gizlətmək qiymətləndirməni ÇƏTİNLƏŞDİRİR; problem səthdə deyil, PAYLAŞILMIŞ PAROLDADIR |

### Nəticə

Bu qərar deploy artefaktlarına toxunmur (QD-018 olduğu kimi qalır) və kodda
dəyişiklik tələb etmir — icra anı ilk deploy-dur. Token gəlməyənə qədər
**gözləyən vəziyyətdədir**; `README.md` və bu sənəd onu qabaqcadan bağlayır ki,
deploy günü unudulmasın.
