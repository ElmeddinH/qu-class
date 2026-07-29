# CLAUDE.md — QU CLASS

Bu fayl Claude Code üçündür. Layihə kökündə saxla. Hər sessiyanın başında oxunur.

---

## Layihə nədir

**QU CLASS** — Qarabağ Universitetinin tələbə və məzun sinif platforması. Holberton School final layihəsi.

Yeni qəbul olunan tələbələrin bir-birini tanımasına, tələbəlik xatirələrinin qorunmasına və məzuniyyətdən sonra sinif əlaqəsinin davam etməsinə xidmət edir.

**Üç mərhələ, EYNİ səhifə:** `INCOMING` → `STUDENT` → `ALUMNI`. Class Page heç vaxt bağlanmır; məzmun və widget sırası mərhələyə görə dəyişir.

Tam spesifikasiya: `PLAN.md`. Dizayn standartı: KUDS v1.0 (aşağıda).

---

## Stack (dəyişdirmə)

| | |
|---|---|
| Framework | **Next.js 15** (App Router) — v16 DEYİL. Layihə `create-next-app@15` ilə qurulub; `@latest` artıq 16 gətirir |
| Dil | TypeScript (`strict: true`) |
| Stil | **Tailwind CSS v3.4** (v4 DEYİL — config faylı v3 sintaksisindədir) |
| Komponentlər | **shadcn/ui v2** — `npx shadcn@2.10.0 add <ad> -y -o`. `shadcn@latest` (v3) Base UI + Tailwind v4 komponentləri yazır və KUDS-u səssizcə sındırır |
| İkonlar | Lucide (**yalnız**) — v1-də adlar dəyişib: `Loader2`→`LoaderCircle`, `Home`→`House`, `BarChart3`→`ChartColumn` |
| Formalar | React Hook Form + Zod |
| Data fetching | TanStack Query (client) + Server Components (server) |
| Qrafiklər | Recharts (**yalnız**) |
| Animasiya | Framer Motion |
| ORM | **Prisma 6** (v7 sxemdəki `datasource.url`-i rədd edir) |
| DB | SQLite (`file:./dev.db`) |
| Auth | Auth.js v5, Credentials + bcrypt, **JWT** sessiya |
| Test | Vitest + Playwright |

---

## 🔴 Danışılmaz qaydalar

1. **`src/components/ui/` toxunulmazdır.** Bunlar shadcn primitivləridir. Onları redaktə etmə, dublikat yaratma. Fərqli görünüş lazımdırsa `src/components/kuds/`-də wrapper yaz.

   Yeni komponent lazımdırsa **yalnız** belə əlavə et:
   ```bash
   npx shadcn@2.10.0 add <ad> -y -o && rm -f tailwind.config.js
   ```
   `shadcn@latest` İŞLƏTMƏ (v3 → Base UI + Tailwind v4, KUDS dağılır). `rm -f tailwind.config.js` məcburidir: shadcn `.js` konfiq yarada bilər, Tailwind isə `.js`-i `.ts`-dən əvvəl oxuyur və KUDS konfiqi səssizcə nəzərə alınmaz.

   ⚠️ Bəzi primitivlərdə mətn ingiliscə hardcode olunub (məs. `PaginationPrevious` → "Previous"). `ui/` faylını redaktə etmək əvəzinə aşağı səviyyəli primitivi (`PaginationLink`) azərbaycanca children ilə işlət — nümunə: `/kuds` səhifəsi.

2. **Hardcode rəng, ölçü, radius, kölgə YOXDUR.** Hər şey Tailwind token-lərindən gəlir (`bg-ku-green`, `rounded-card`, `shadow-sm-kuds`). `#`-lə başlayan rəng kod içində görünməməlidir.

3. **Spacing yalnız bu dəyərlərdən:** `4, 8, 12, 16, 24, 32, 48, 64, 96` px = Tailwind `1, 2, 3, 4, 6, 8, 12, 16, 24`. `p-5`, `gap-7`, `mt-9` **yazma**.
   ⚠️ Config-də default şkala **əvəz edilməyib**, çünki shadcn/ui öz mənbəyində `h-9`, `py-1.5`, `size-3.5` işlədir və şkalanı kəssək primitivlər dağılır. Yəni Tailwind səni dayandırmayacaq — intizam sənin üzərindədir, Blok 12-də grep ilə yoxlanılır.

4. **Heç bir `page.tsx` və ya route handler birbaşa `prisma.*` çağırmır.** Bütün DB girişi `src/services/` qatındandır və hər servis funksiyası ilk arqument kimi `Viewer` alır.

5. **Hər sorğu məxfilikdən keçir.** `visibilityWhere(viewer)` Prisma `where` şərtinə birləşdirilir. JS-də filtrləmə **qadağandır** (pagination-ı sındırır və sızma yaradır).

6. **Bütün enum-lar `src/lib/enums.ts`-dən gəlir.** SQLite native enum dəstəkləmir → `String` sütun + Zod enum. Sətir literal yazma, enum-u import et. Hər enum üç şey ixrac edir: `X_VALUES` (massiv), `XSchema` (Zod), `X` (tip + sabit obyekt). `Visibility` və `SystemRole` orada təkrar təyin olunmur — `visibility.ts`-dən yenidən ixrac edilir.

7. **`src/pages/` qovluğu YARADMA.** Next.js-də bu, köhnə Pages Router-i aktivləşdirir. KUDS §20-dəki `pages/` bizdə `src/features/`-dir.

8. **`page.tsx` faylları nazikdir.** Yalnız `src/features/*`-dan komponent import edib render edirlər. Məntiq `features/` və `services/`-dədir.

9. **Azərbaycan dili UI-da.** Bütün istifadəçi mətnləri azərbaycanca. Kod, dəyişən adları, commit-lər ingiliscə.

10. **Hər blokun sonunda:** `npx tsc --noEmit && npm run lint && npm run build` — üçü də təmiz olmalıdır.

11. **Auth.js konfiqi İKİYƏ BÖLÜNÜB — birləşdirmə.** `src/middleware.ts` Edge runtime-dadır və import qrafındakı hər modul Edge üçün bundle olunur; Prisma və bcryptjs orada işləmir.
    - `src/auth.config.ts` — **Edge-təhlükəsiz**: yalnız `callbacks` (`authorized`, `jwt`, `session`) və `providers: []`. Prisma/bcrypt import ETMİR.
    - `src/auth.ts` — **Node**: `auth.config`-i spread edir, Credentials provider-i (Prisma + bcrypt) və `signIn` callback-ini əlavə edir.
    - `src/middleware.ts` YALNIZ `auth.config`-dən `NextAuth()` qurur.
    - Server kodu `@/lib/auth` barrel-indən import edir (`auth`, `getViewer`, `requireAdmin`...).

    ⚠️ **JWT MİNİMALDIR: `userId` + `systemRole`.** `cohortIds`, `stage`, `moderatedCohortIds` token-ə YAZILMIR — dəyişkəndir və uzunömürlü JWT-də köhnəlir. Onlar hər sorğuda `getViewer()` ilə DB-dən oxunur (React `cache()` → render başına bir sorğu).

    ⚠️ **JWT tip genişlənməsi `@auth/core/jwt`-yə yazılır**, `next-auth/jwt`-yə YOX. Sonuncu yalnız `export *` edir, yəni orada `declare module` yazsan yeni interfeys yaranır və `token.userId` `unknown` qalır (bax `src/types/next-auth.d.ts`).

12. **Server komponentindən client komponentinə funksiya ötürmə.** React komponentləri (o cümlədən Lucide ikonları) funksiyadır və server → client sərhədindən keçmir — `npm run build` prerender mərhələsində sınır (*"Functions cannot be passed directly to Client Components"*). Konfiq massivlərində ikonu **ad** kimi saxla, komponentə client tərəfdə reyestrdən çevir (nümunə: `src/layouts/nav.ts` → `NAV_ICONS`).

---

## KUDS dizayn tokenləri

### Rənglər

| Token | Hex | İstifadə |
|---|---|---|
| `ku-green` | `#44766C` | **Primary.** Düymələr, aktiv link, brend |
| `ku-dark` | `#16423C` | Sidebar fonu, başlıq, hover |
| `ku-soft` | `#D3E8BF` | Yalnız fon/badge — **mətn rəngi kimi işlətmə** |
| `ku-blue` | `#CAEAF1` | Yalnız fon/badge |
| `ku-cream` | `#F0F3BF` | Yalnız fon/badge (accent) |
| `background` | `#F8FAFC` | Səhifə fonu |
| `surface` | `#FFFFFF` | Kart, modal, input fonu |
| `border` | `#E2E8F0` | Bütün sərhədlər |
| `text-primary` | `#1E293B` | Əsas mətn → sinif: `text-text-primary` |
| `text-secondary` | `#64748B` | İkinci dərəcəli mətn → sinif: `text-text-secondary` |
| `success` / `success-strong` | `#10B981` / `#047857` | fon-ikon / ağ mətn altında |
| `warning` / `warning-strong` | `#F59E0B` / `#B45309` | fon (üzərində tünd mətn) / ağ mətn altında |
| `danger` / `danger-strong` | `#EF4444` / `#B91C1C` | fon-ikon / ağ mətn altında |

⚠️ **`text-secondary` YAZMA.** Emitə olunan sinif `text-text-secondary`-dir. `text-secondary` yazsan Tailwind onu `secondary` *rənginə* çevirir — tamam başqa şey.

**Kontrast (hesablanıb, WCAG AA = 4.5:1):**
- Ağ / `ku-green` = **5.18:1** ✅
- `text-text-secondary` / `background` = **4.55:1** ✅ (sərhəddə — 14px-dən kiçik işlətmə)
- Ağ / `#10B981` = 2.54:1 ❌ · Ağ / `#EF4444` = 3.76:1 ❌ · Ağ / `#F59E0B` = 2.15:1 ❌
  → Filled fonda ağ mətn lazımdırsa `-strong` variantını işlət. Warning fonunda **tünd** mətn (6.78:1 ✅).
- `ku-soft`, `ku-blue`, `ku-cream` üzərində **yalnız** `text-text-primary`, ağ mətn **heç vaxt**.

⚠️ **KUDS §11 "Secondary = Outline / Transparent Background".** shadcn-də bu `variant="outline"`-dır. `<Button variant="secondary">` **işlətmə** — o, filled render olunur.

⚠️ **KUDS-da boşluq:** §11 "Accent: Gold" deyir, amma §3-də gold hex yoxdur. Müvəqqəti olaraq `ku-cream` (#F0F3BF) accent kimi işlədilir. Universitetdən brend kitabçasındakı gold dəyərini soruş.

### Tipoqrafiya — Poppins (fallback: Tahoma), line-height 150%

| Element | Ölçü | Çəki | Tailwind |
|---|---|---|---|
| Display | 40 | Bold | `text-display font-bold` |
| H1 | 32 | Bold | `text-h1 font-bold` |
| H2 | 24 | SemiBold | `text-h2 font-semibold` |
| H3 | 20 | SemiBold | `text-h3 font-semibold` |
| H4 | 18 | Medium | `text-h4 font-medium` |
| Body | 16 | Regular | `text-body` |
| Small | 14 | Regular | `text-small` |
| Caption | 12 | Regular | `text-caption` |

### Radius

`Button 8` · `Input 8` · `Badge 999` · `Card 12` · `Modal 16` · `Avatar 50%`
→ `rounded-btn` `rounded-input` `rounded-badge` `rounded-card` `rounded-modal` `rounded-avatar`

### Kölgələr — ağır kölgə QADAĞANDIR

`shadow-xs-kuds` `0 1px 2px rgba(0,0,0,.04)` · `shadow-sm-kuds` `0 2px 6px rgba(0,0,0,.06)` · `shadow-md-kuds` `0 8px 20px rgba(0,0,0,.08)`

### Layout

Desktop 1440 · Sidebar 280 · Header 72 · Content padding 32 · Card gap 24

### Breakpoint-lər

Mobile 0-767 · Tablet 768-1023 · Laptop 1024-1279 · Desktop 1280-1535 · Large 1536+

### İkon ölçüləri

Naviqasiya 24 · Kart 20 · Inline 16

### Kart strukturu (KUDS §12)

`Title → Description → Content → Actions`. Fon ağ, radius 12, border 1px, shadow SM, padding 24.

### Cədvəllər (KUDS §14) — məcburi funksiyalar

Sorting · Filtering · Pagination · Search · Export · Responsive

### Naviqasiya (KUDS §16)

Bütün sistemlərdə **sol sidebar + üst header**. İyerarxiya dəyişmir.

---

## Qovluq strukturu

```
src/
  auth.config.ts   Auth.js — EDGE-təhlükəsiz hissə (middleware bunu işlədir)
  auth.ts          Auth.js — NODE hissəsi (Credentials + Prisma + bcrypt)
  middleware.ts    route qorunması (Edge)
  app/
    (public)/      giriş etməmişlər üçün
    (app)/         auth tələb olunur
    (admin)/       UNIVERSITY_ADMIN
    forbidden.tsx  403 sərhədi (next.config → experimental.authInterrupts)
    api/
  components/
    ui/            shadcn — TOXUNMA
    kuds/          KUDS wrapper-ləri
    shared/        StatCard, EmptyState, VisibilityBadge, PostCard...
  layouts/         PublicShell, AppShell, AdminShell
  features/        feed/ class-home/ directory/ class-story/ timeline/
                   achievements/ memories/ events/ where-are-we-now/
                   privacy/ guide/ notifications/ admin/
  hooks/
  services/        BÜTÜN Prisma sorğuları burada
  lib/             db.ts auth.ts (barrel) viewer.ts visibility.ts enums.ts
                   stage.ts constants.ts routes.ts
  types/           next-auth.d.ts (sessiya/JWT tip genişlənməsi)
  utils/
  styles/
  assets/
```

---

## 🔒 Məxfilik modeli — ən vacib hissə

Dörd səviyyə: `PUBLIC` › `UNIVERSITY` › `CLASS` › `PRIVATE`

```ts
// src/lib/visibility.ts — VAHİD HƏQİQƏT MƏNBƏYİ
export type SystemRole = "USER" | "UNIVERSITY_ADMIN";

export type Viewer =
  | { kind: "ANONYMOUS" }
  | {
      kind: "USER";
      userId: string;
      cohortIds: string[];
      systemRole: SystemRole;
      moderatedCohortIds: string[];   // ⚠ məcburi
    };

export type OwnerField = "authorId" | "ownerId" | "createdById";

canView(viewer, { ownerId, cohortId, visibility }): boolean
canModerate(viewer, resource): boolean

visibilityWhere<W>(viewer, ownerField?): W
visibleWithStatus<W>(viewer, statuses: string[], ownerField?): W
activeVisibleWhere<W>(viewer, ownerField?): W

redactProfile(user: ProfileView, viewer, fieldVisibility): Partial<ProfileView>
```

`ownerField`: `Post/Memory → "authorId"` · `Achievement → "ownerId"` · `Event → "createdById"`

⚠️ Status dəyərləri modeldən modelə fərqlidir. `activeVisibleWhere` `"ACTIVE"` sabitini işlədir — yalnız `Post` və `Memory` üçün. `Achievement` (`VERIFIED|FEATURED`) və `Event` (`PUBLISHED|COMPLETED`) üçün `visibleWithStatus` çağır, yoxsa sıfır nəticə alarsan.

**Qaydalar:**
- Sahibi həmişə öz məzmununu görür.
- `PRIVATE` → yalnız sahibi. Admin belə oxumur (audit log istisna).
- `CLASS` → `viewer.cohortIds.includes(resource.cohortId)`.
- `UNIVERSITY` → istənilən autentifikasiya olunmuş istifadəçi.
- `PUBLIC` → hər kəs.
- `phone` və `personalEmail` default `PRIVATE` — qeydiyyatda belə yaradılır.
- Aqreqasiya (Where Are We Now) **ayrı** razılıq tələb edir: `includeInStats`. Görünürlük səviyyəsi kifayət deyil.
- İctimai görünüşdə dəqiq ünvan/koordinat **heç vaxt** göstərilmir — yalnız şəhər/ölkə. 3 nəfərdən kiçik xanalar `suppressSmallBuckets()` ilə "Digər"ə yığılır.
- Yeni sahə əlavə edirsənsə default `CLASS`, `PUBLIC` deyil.
- **Əlaqə sahələri əvvəlcə düzləndirilir.** `interests`, `hobbies`, `skills`, `languages`, `clubs`, `careerHistory`, `education` — bunlar `User` sütunu deyil (`UserTag` / `ClubMembership` / `CareerEntry` / `EducationEntry`-dən gəlir). `services/user.service.ts` → `buildProfileView()` onları `ProfileView` obyektinə düzləndirməlidir, yoxsa `redactProfile` sahəni sadəcə atlayır və həmin məxfilik açarı **səssizcə işləməz**.

**Yeni servis funksiyası yazarkən öz-özünə sual ver:** "Bu sorğu `visibilityWhere(viewer)` işlədirmi?" Cavab yoxdursa — səhvdir.

---

## Feed → Timeline / Achievements axını

`createPost` Server Action **tək transaksiyada** işləyir:

```
Post yaradılır
  ├─ showOnTimeline     → TimelineEntry (occurredAt, academicYear, visibility, category post-dan kopyalanır)
  ├─ showInAchievements → Achievement (status: SUBMITTED)
  └─ Notification-lar
```

**Silinmə — diqqət.** `deletePost` **soft delete** edir (`status = DELETED`), yəni sətir qalır və `onDelete: Cascade` **işə düşmür**. Buna görə eyni transaksiyada TimelineEntry-ni açıq şəkildə sil:

```ts
await prisma.$transaction([
  prisma.post.update({ where: { id }, data: { status: "DELETED" } }),
  prisma.timelineEntry.deleteMany({ where: { postId: id } }),
  prisma.achievement.updateMany({ where: { postId: id }, data: { status: "ARCHIVED" } }),
]);
```

Cascade yalnız hard delete üçün ehtiyat qoruyucudur. Spec §7 tələbi bu transaksiya ilə ödənilir.

**Timeline görünürlüyü** mənbədən kopyalanır və ondan daha açıq ola bilməz. Əlavə tavan varsa `narrowest(postVisibility, ceiling)` işlət; tavan yoxdursa sadəcə kopyala.

`academicYear` hesablanması: sentyabr 1-dən avqust 31-ə. `2026-11-05` → `"2026-2027"`.

**Mərhələ:** vahid həqiqət mənbəyi `resolveStage(cohort, now)`-dur (`cohort.academicStartsAt` / `cohort.graduatesAt`). `User.stage` yalnız keşdir — girişdə yenilənir, UI-da ona güvənmə.

---

## Data modeli — qısa xəritə

`User` — profil, mərhələ, alumni sahələri (JWT sessiya → `Session` cədvəli YOXDUR)
`Faculty` `Program` `Cohort` `CohortMembership` — akademik struktur, class page = cohort
  ↳ `Cohort.academicStartsAt` / `graduatesAt` mərhələ keçidini müəyyən edir
`FieldVisibility` — sahə-səviyyə məxfilik
`Tag` `UserTag` — maraq / hobbi / bacarıq / dil
`Post` `MediaAsset` `Comment` `Reaction` — feed
`TimelineEntry` — Post/Achievement/Event-dən törəmə
`Memory` — 8 növ xatirə, 4 ayrıca göstərilmə seçimi
`Achievement` — 12 kateqoriya, 4 status
`CareerEntry` `EducationEntry` `SupportOffer` — alumni & Where Are We Now
`Club` `ClubMembership`
`Event` `EventRSVP` — `scope` (təşkilatçı səviyyəsi) və `category` (tədbir növü) FƏRQLİDİR
`Notification` · `Report` `AuditLog`
`ContentPage` `Faq` `GuidePlace` — public məzmun & Xankəndi

Tam sxem: `prisma/schema.prisma`.

---

## Rollar

**Sistem:** `USER` · `UNIVERSITY_ADMIN`
**Cohort daxili** (`CohortMembership.role`): `MEMBER` · `CLASS_REPRESENTATIVE` · `EVENT_COORDINATOR` · `CLASS_MODERATOR`

İkisini qarışdırma. Cohort rolu yalnız həmin cohort-da keçərlidir.

**İcazə qapıları** (`@/lib/auth`) — server komponentində və server action-da işlət:

| Funksiya | Nə edir |
|---|---|
| `getViewer()` | `Viewer` qurur (`cache()`-lənib, render başına bir DB sorğusu) |
| `requireUser()` | sessiya yoxdursa `/login`-ə redirect |
| `requireAdmin()` | `UNIVERSITY_ADMIN` deyilsə `forbidden()` → 403 |
| `requireCohortRole(cohortId, roles)` | həmin cohort-da rol yoxdursa 403 (admin istisnadır) |
| `getPrimaryCohort()` | əsas cohort (`isPrimary`) — `/home` yönləndirməsi və naviqasiya |

Qorunan URL prefiksləri `src/lib/routes.ts`-dədir. **Yeni `(app)` səhifəsi əlavə edəndə prefiksini oraya da yaz** — route qrupu URL-də görünmür, middleware qrup adına baxa bilmir.

---

## Əmrlər

```bash
npm run dev
npx prisma migrate dev --name <ad>
npx prisma studio
npx prisma db seed
npx tsc --noEmit
npm run lint
npm run build
npm run test          # vitest
npm run test:e2e      # playwright
```

---

## İş üslubu

- **Blok-blok işlə.** `PLAN.md` §5-dəki sıra ilə. Bir blok bitməmiş növbətiyə keçmə.
- **Hər blokun sonunda commit et.** Mənalı mesaj, ingiliscə.
- **Böyük dəyişiklikdən sonra `npm run build` işlət** və səhvləri özün düzəlt.
- **Yeni asılılıq əlavə etmədən əvvəl soruş.** Stack kilidlidir.
- **Boş ekran buraxma.** Hər siyahının skeleton + empty state-i olmalıdır.
- **Şübhə varsa `PLAN.md`-yə bax**, təxmin etmə.
