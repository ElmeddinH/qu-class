# QU CLASS — Arxitektura

> Bu sənəd sistemin **quruluşunu** izah edir: qatlar, data modeli, məxfilik
> qərar axını və auth. «Niyə belə?» sualının cavabı ayrı fayldadır —
> [`DECISIONS.md`](DECISIONS.md). Təhlükə modeli — [`SECURITY.md`](SECURITY.md).
>
> Diaqramlar Mermaid-dir və GitHub-da birbaşa render olunur.

**Ölçülmüş miqyas** (`2026-07-31`):

| | |
|---|---|
| Prisma modeli | **28** (miqrasiya: 3) |
| Səhifə (`page.tsx`) | **51** |
| Xüsusiyyət modulu (`src/features/*`) | **24** |
| Servis faylı (`src/services/*`) | **23** |
| REST endpoint (`/api/v1`) | **34** route · **33**-ü OpenAPI-də sənədləşib |
| Vahid + inteqrasiya testi | **1510** (61 fayl) |
| E2E testi | **213** (21 fayl) |
| TypeScript mənbə faylı | **512** (~69 000 sətir, testlərsiz) |

---

## 1. Sistem konteksti

Ayrı backend serveri **yoxdur**. Next.js həm render, həm API qatıdır; hər ikisi
eyni servis qatını çağırır.

```mermaid
flowchart TB
    subgraph Clients["İstifadəçi rolları"]
        Anon["Anonim ziyarətçi"]
        User["Tələbə / Məzun<br/>SystemRole = USER"]
        Mod["Sinif rolları<br/>MODERATOR · REPRESENTATIVE · COORDINATOR"]
        Admin["Universitet admini<br/>SystemRole = UNIVERSITY_ADMIN"]
        Ext["Xarici inteqrasiya<br/>Swagger UI · skript"]
    end

    subgraph Next["Next.js 15 — App Router, tək proses"]
        MW["middleware.ts<br/>EDGE runtime<br/>route qorunması"]
        RSC["Server Components<br/>(public) · (app) · (admin)"]
        SA["Server Actions<br/>mutasiyalar"]
        API["Route Handlers<br/>/api/v1 · REST səthi"]
    end

    subgraph Core["Qat: məxfilik + servis"]
        Viewer["getViewer()<br/>React cache — render başına 1 sorğu"]
        Vis["lib/visibility.ts<br/>VAHİD həqiqət mənbəyi"]
        Svc["services/*.ts<br/>YEGANƏ Prisma girişi"]
    end

    DB[("SQLite<br/>prisma/dev.db")]
    FS[("public/uploads/<br/>fayl saxlama")]

    Anon --> MW
    User --> MW
    Mod --> MW
    Admin --> MW
    Ext --> API

    MW --> RSC
    RSC --> SA
    RSC --> Viewer
    SA --> Viewer
    API --> Viewer

    Viewer --> Vis
    Vis --> Svc
    RSC --> Svc
    SA --> Svc
    API --> Svc

    Svc --> DB
    Svc --> FS
```

**Oxunacaq qayda:** `page.tsx` və route handler **heç vaxt** `prisma.*`
çağırmır. Hər servis funksiyası ilk arqument kimi `Viewer` alır və sorğuya
`visibilityWhere(viewer)` birləşdirir.

---

## 2. Qovluq strukturu və qat qaydaları

```
src/
  middleware.ts     Edge — route qorunması (YALNIZ auth.config)
  auth.config.ts    Auth.js — Edge-təhlükəsiz hissə
  auth.ts           Auth.js — Node hissəsi (Credentials + Prisma + bcrypt)
  app/              route ağacı — page.tsx faylları NAZİKDİR
    (public)/ (app)/ (admin)/ api/
  layouts/          PublicShell · AppShell · AdminShell · naviqasiya
  features/         24 modul — UI + server action-lar
  components/
    ui/             shadcn primitivləri — TOXUNULMAZ
    kuds/           KUDS wrapper-ləri
    shared/         StatCard · EmptyState · VisibilityBadge · PostCard...
  services/         23 fayl — BÜTÜN Prisma sorğuları
  lib/              visibility.ts · enums.ts · routes.ts · db.ts · auth.ts...
  hooks/ types/ utils/ styles/ assets/
```

Qat qaydası — ox **yalnız aşağı** göstərir:

```mermaid
flowchart TD
    A["app/**/page.tsx · route.ts<br/>NAZİK: import + render"]
    B["features/*<br/>UI · server action · Zod sxem"]
    C["components/ui · kuds · shared<br/>layouts/*"]
    D["services/*<br/>YEGANƏ Prisma girişi"]
    E["lib/*<br/>visibility · enums · routes · db"]
    F[("Prisma → SQLite")]

    A --> B
    A --> C
    B --> C
    B --> D
    B --> E
    C --> E
    D --> E
    D --> F

    X["🔴 QADAĞAN<br/>app/ və ya features/ → prisma.*"]
    A -.->|sınır| X
    B -.->|sınır| X

    style X fill:#fee,stroke:#b91c1c,color:#7f1d1d
```

| Qat | Nə edə bilər | Nə edə BİLMƏZ |
|---|---|---|
| `app/**` | `features/*`-dan import edib render etmək | `prisma.*`, biznes məntiqi |
| `features/*` | `services/*` və `lib/*` çağırmaq, UI qurmaq | `prisma.*` birbaşa |
| `components/ui/*` | heç nə — shadcn mənbəyidir | redaktə olunmaq, dublikat |
| `components/kuds`, `shared` | `lib/*` işlətmək | `services/*` çağırmaq |
| `services/*` | `prisma.*`, `lib/visibility` | React / UI import etmək |
| `lib/*` | saf funksiyalar, `db.ts` | `services/*`-dan asılı olmaq |

⚠️ **`src/pages/` YARADILMIR.** Next.js bunu köhnə Pages Router kimi qəbul edir.
KUDS §20-dəki `pages/` bizdə `src/features/`-dir — bax [`DECISIONS.md`](DECISIONS.md) → QD-004.

---

## 3. Data modeli — əsas 12 model

28 modelin hamısı deyil; diaqram **oxunaqlı** qalsın deyə nüvə seçilib.
Kənarda qalanlar: `Tag` `UserTag` `MediaAsset` `Comment` `Reaction`
`EducationEntry` `SupportOffer` `Club` `ClubMembership` `EventRSVP`
`Notification` `Report` `AuditLog` `ContentPage` `Faq` `GuidePlace`.
Tam sxem: [`prisma/schema.prisma`](../prisma/schema.prisma).

```mermaid
erDiagram
    Faculty  ||--o{ Program          : "təşkil edir"
    Faculty  ||--o{ Cohort           : "sahiblik edir"
    Program  ||--o{ Cohort           : "buraxır"
    Cohort   ||--o{ CohortMembership : "üzvləri"
    User     ||--o{ CohortMembership : "üzvlüyü"
    User     ||--o{ FieldVisibility  : "sahə məxfiliyi"
    User     ||--o{ Post             : "yazır"
    Cohort   ||--o{ Post             : "yerləşdirir"
    User     ||--o{ Memory           : "paylaşır"
    Cohort   ||--o{ Memory           : "toplayır"
    User     ||--o{ Achievement      : "sahibidir"
    Cohort   ||--o{ Achievement      : "toplayır"
    Cohort   ||--o{ TimelineEntry    : "xronologiyası"
    Cohort   ||--o{ Event            : "tədbirləri"
    User     ||--o{ Event            : "yaradır"
    User     ||--o{ CareerEntry      : "karyerası"
    Post     ||--o| TimelineEntry    : "törədir"
    Post     ||--o| Achievement      : "törədir"
    Post     ||--o| Memory           : "törədir"
    Achievement ||--o| TimelineEntry : "törədir"
    Event    ||--o| TimelineEntry    : "törədir"

    Faculty {
        string id PK
        string slug UK
        string name
    }
    Program {
        string id PK
        string facultyId FK
        string degree "BACHELOR MASTER PHD"
    }
    Cohort {
        string id PK
        string slug UK
        string scope "PROGRAM FACULTY UNIVERSITY"
        datetime academicStartsAt "mərhələ qapısı"
        datetime graduatesAt "mərhələ qapısı"
    }
    CohortMembership {
        string userId FK
        string cohortId FK
        string role "MEMBER REP COORDINATOR MODERATOR"
        boolean isPrimary
    }
    User {
        string id PK
        string email UK
        string passwordHash "bcrypt"
        string systemRole "USER UNIVERSITY_ADMIN"
        string stage "KEŞ — resolveStage həqiqətdir"
        boolean includeInStats "aqreqasiya razılığı"
    }
    FieldVisibility {
        string userId FK
        string field "phone personalEmail avatarUrl ..."
        string level "PUBLIC UNIVERSITY CLASS PRIVATE"
    }
    Post {
        string id PK
        string authorId FK
        string cohortId FK
        string visibility
        string status "ACTIVE PENDING HIDDEN DELETED"
        boolean showOnTimeline
        boolean showInAchievements
    }
    TimelineEntry {
        string id PK
        string sourceType "POST ACHIEVEMENT EVENT SYSTEM"
        string postId FK "unique nullable"
        string visibility "MƏNBƏDƏN kopyalanır"
        string academicYear "sentyabr-avqust"
    }
    Achievement {
        string id PK
        string ownerId FK
        string category "12 kateqoriya"
        string status "SUBMITTED VERIFIED FEATURED ARCHIVED"
    }
    Memory {
        string id PK
        string authorId FK
        string type "8 növ"
        string status "ACTIVE HIDDEN DELETED"
    }
    Event {
        string id PK
        string createdById FK
        string scope "təşkilatçı səviyyəsi"
        string category "tədbir NÖVÜ"
    }
    CareerEntry {
        string id PK
        string userId FK
        string country "koordinat sütunu YOXDUR"
        string city "pin şəhər mərkəzinə düşür"
    }
```

⚠️ **`CareerEntry`-də `salary` / `bonus` / `latitude` / `longitude` sütunu
QƏSDƏN yoxdur** — səbəb [`DECISIONS.md`](DECISIONS.md) → QD-011, QD-012.

---

## 4. Məxfilik qərar axını

Sistemin ürəyi. İki ayrı yol var və **hər ikisi eyni qaydanı** tətbiq edir:

- `canView(viewer, resource)` — **tək obyekt** üçün bool (səhifə sərhədi).
- `visibilityWhere(viewer)` — **siyahı** üçün Prisma `where` fraqmenti.

```mermaid
flowchart TD
    Start(["Sorğu gəlir"]) --> V["getViewer()<br/>cache-lənmiş — render başına 1 DB sorğusu"]
    V --> Kind{"viewer.kind"}

    Kind -->|ANONYMOUS| PubOnly["where: visibility = PUBLIC"]
    Kind -->|USER| Owner{"Sahibidirmi?<br/>ownerId === viewer.userId"}

    Owner -->|Bəli| Allow["✅ GÖRÜR<br/>səviyyədən ASILI DEYİL"]
    Owner -->|Xeyr| Level{"resource.visibility"}

    Level -->|PRIVATE| Deny["❌ GÖRMÜR<br/>admin də görmür"]
    Level -->|CLASS| InClass{"viewer.cohortIds<br/>resource.cohortId-ni<br/>ehtiva edirmi?"}
    Level -->|UNIVERSITY| Allow2["✅ hər autentifikasiya olunmuş"]
    Level -->|PUBLIC| Allow3["✅ hər kəs"]

    InClass -->|Bəli| Allow4["✅ GÖRÜR"]
    InClass -->|Xeyr| Mod{"canModerateCohort?<br/>MODERATOR / ADMIN"}
    Mod -->|Bəli| AllowMod["✅ GÖRÜR<br/>🔴 AuditLog MƏCBURİ"]
    Mod -->|Xeyr| Deny2["❌ GÖRMÜR"]

    PubOnly --> Q["Prisma sorğusu<br/>where DB SƏVİYYƏSİNDƏ"]
    Allow --> Q
    Allow2 --> Q
    Allow3 --> Q
    Allow4 --> Q
    AllowMod --> Q
    Deny --> Q
    Deny2 --> Q

    Q --> Extra{"Əlavə qapı<br/>lazımdırmı?"}
    Extra -->|"profil sahəsi"| Redact["redactProfile()<br/>FieldVisibility ilə sahə-səviyyə"]
    Extra -->|"aqreqasiya"| Stats["includeInStats = true<br/>+ suppressSmallBuckets(k=3)"]
    Extra -->|yox| Out(["Nəticə"])
    Redact --> Out
    Stats --> Out

    style Deny fill:#fee,stroke:#b91c1c,color:#7f1d1d
    style Deny2 fill:#fee,stroke:#b91c1c,color:#7f1d1d
    style AllowMod fill:#fef3c7,stroke:#b45309,color:#78350f
    style Q fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
```

🔴 **Filtr DB-dədir, JS-də deyil.** JS-də filtrləmə iki şeyi sındırır:
`take`/`skip` səhifələmə saymağı (istifadəçi «boş səhifə» görür) və
`count()` aqreqasiyası (say sızır). Bax [`DECISIONS.md`](DECISIONS.md) → QD-006.

**Status ölçüsü ayrıdır** — və modeldən modelə fərqlidir:

| Model | Aktiv statuslar | İşlədiləcək köməkçi |
|---|---|---|
| `Post`, `Memory` | `ACTIVE` | `activeVisibleWhere(viewer)` |
| `Achievement` | `VERIFIED`, `FEATURED` | `visibleWithStatus(viewer, [...])` |
| `Event` | `PUBLISHED`, `COMPLETED` | `visibleWithStatus(viewer, [...])` |
| `TimelineEntry` | — (status sütunu yoxdur) | `timelineVisibilityWhere(viewer)` |

⚠️ `Achievement`/`Event` üçün `activeVisibleWhere` çağırsan **sıfır nəticə**
alırsan — `"ACTIVE"` o cədvəllərdə mövcud status deyil.

---

## 5. Feed → Timeline → Achievement fan-out

Bir paylaşım üç səthdə görünə bilər. Üçü də **tək transaksiyada** yaranır.

```mermaid
sequenceDiagram
    autonumber
    actor U as İstifadəçi
    participant SA as Server Action<br/>features/feed/actions.ts
    participant PS as post.service.ts
    participant FO as features/feed/fanout.ts
    participant TX as prisma.$transaction
    participant DB as SQLite

    rect rgb(232, 245, 233)
    Note over U,DB: A — YARATMA
    U->>SA: createPost(body, visibility, bayraqlar)
    SA->>PS: createPost(viewer, data)
    PS->>PS: Zod validasiya + cohort üzvlüyü
    PS->>FO: fanoutSourceOf(data)
    PS->>TX: transaksiya başlayır
    TX->>DB: Post.create (status = ACTIVE)
    opt media varsa
        TX->>DB: MediaAsset.createMany
    end
    opt kind = MEMORY
        TX->>DB: Memory.create<br/>visibility = derivedVisibility(post)
    end
    opt showOnTimeline
        TX->>DB: TimelineEntry.create<br/>visibility MƏNBƏDƏN kopyalanır<br/>academicYear hesablanır
    end
    opt showInAchievements
        TX->>DB: Achievement.create (status = SUBMITTED)
    end
    TX->>DB: Notification.createMany<br/>(yalnız məzmunu GÖRƏ BİLƏN üzvlərə)
    TX-->>PS: commit
    PS-->>U: { ok: true, postId }
    end

    rect rgb(255, 235, 238)
    Note over U,DB: B — SİLMƏ (soft delete — 🔴 cascade İŞƏ DÜŞMÜR)
    U->>SA: deletePost(postId)
    SA->>PS: deletePost(viewer, postId)
    PS->>PS: sahib? yoxsa canModerate?
    alt moderasiya yolu
        PS->>TX: recordAudit(MODERATE)<br/>İZ ƏVVƏL yazılır
        Note right of TX: safeAuditMetadata ağ siyahısı<br/>prisma.auditLog.create BİRBAŞA çağırılmır
    end
    PS->>TX: transaksiya
    TX->>DB: Post.update status = DELETED
    Note right of TX: 🔴 sətir QALIR → onDelete Cascade<br/>İŞƏ DÜŞMÜR, əl ilə təmizlə
    TX->>DB: TimelineEntry.deleteMany({ postId })
    TX->>DB: Achievement.updateMany → ARCHIVED
    TX->>DB: Memory.updateMany → DELETED
    TX-->>PS: commit
    PS-->>U: { ok: true }
    end
```

**Görünürlük tavanı.** `TimelineEntry.visibility` mənbədən kopyalanır və ondan
**daha açıq ola bilməz**. Əlavə tavan varsa `narrowest(postVisibility, ceiling)`
işlədilir. `academicYear` sentyabr 1 – avqust 31 aralığı ilə hesablanır:
`2026-11-05` → `"2026-2027"`.

---

## 6. Auth axını — Edge / Node bölgüsü

Auth.js konfiqi **ikiyə bölünüb**, çünki `middleware.ts` Edge runtime-dadır və
onun import qrafındakı hər modul Edge üçün bundle olunur. Prisma engine və
`bcryptjs` orada işləmir → birləşdirilsə `npm run build` sınır.

```mermaid
sequenceDiagram
    autonumber
    actor U as Brauzer
    participant MW as middleware.ts<br/>⚡ EDGE
    participant AC as auth.config.ts<br/>⚡ EDGE-təhlükəsiz
    participant AN as auth.ts<br/>🟢 NODE
    participant DB as Prisma / SQLite
    participant PG as Server Component<br/>🟢 NODE

    rect rgb(232, 240, 254)
    Note over U,DB: A — GİRİŞ (yalnız NODE yolu)
    U->>AN: POST /api/auth/callback/credentials
    AN->>AN: Credentials.authorize()
    AN->>DB: user.findUnique({ email })
    DB-->>AN: passwordHash
    AN->>AN: compareSync(parol, hash)
    Note right of AN: ⚠️ «istifadəçi yoxdur» ≠ «parol səhv»<br/>FƏRQLƏNDİRİLMİR — eyni mesaj
    AN->>AC: jwt() callback
    Note right of AC: 🔴 TOKEN MİNİMALDIR<br/>userId + systemRole<br/>cohortIds / stage YAZILMIR
    AC-->>U: Set-Cookie: authjs.session-token<br/>httpOnly · SameSite=Lax
    end

    rect rgb(255, 251, 235)
    Note over U,PG: B — QORUNAN SƏHİFƏ (iki qapı)
    U->>MW: GET /class/cs-2028/feed
    MW->>AC: NextAuth(authConfig) → authorized()
    AC->>AC: resolveRouteAccess(pathname, viewerKind)
    alt token yoxdur
        AC-->>U: 302 /login?callbackUrl=...
    else admin route + systemRole ≠ ADMIN
        AC-->>U: 302 / (və ya forbidden)
    else keçir
        AC-->>MW: ✅
        MW->>PG: render
        PG->>DB: getViewer() — cohortIds DB-DƏN
        Note right of DB: React cache() → render başına 1 sorğu.<br/>Token köhnəlmir, çünki dəyişkən<br/>sahələr token-də saxlanmır.
        PG->>PG: requireUser() / requireAdmin()<br/>İKİNCİ qapı — server action yolu üçün
        PG-->>U: HTML
    end
    end
```

| Fayl | Runtime | Nə var | Nə YOXDUR |
|---|---|---|---|
| `auth.config.ts` | Edge | `callbacks` (`authorized`, `jwt`, `session`), kuka adı, `providers: []` | Prisma, bcrypt |
| `auth.ts` | Node | `auth.config` spread + `Credentials` provider + `signIn` callback | — |
| `middleware.ts` | Edge | `NextAuth(authConfig)` — **yalnız** | `auth.ts` importu |
| `lib/auth.ts` | Node | barrel: `auth`, `getViewer`, `requireUser`, `requireAdmin`, `requireCohortRole` | — |

⚠️ **Middleware yeganə qapı deyil.** Server action-lar middleware matcher-indən
keçməyə bilər, ona görə `requireUser()` / `requireAdmin()` səhifə səviyyəsində
eyni yoxlamanı təkrarlayır. Qorunan URL prefiksləri `src/lib/routes.ts`-dədir —
route qrupu (`(app)`) URL-də görünmür, middleware qrup adına baxa bilməz.

---

## 7. İki API səthi — niyə dublikat deyil

```mermaid
flowchart LR
    subgraph S1["Səth 1 — UI"]
        RSC["Server Components"]
        SA["Server Actions"]
    end
    subgraph S2["Səth 2 — REST"]
        V1["/api/v1 — 34 route<br/>33-ü OpenAPI-də"]
        SW["Swagger UI /docs"]
    end

    RSC --> SVC["services/*<br/>TƏK məntiq"]
    SA --> SVC
    V1 --> SVC
    SW -.-> V1

    SVC --> VIS["lib/visibility.ts<br/>TƏK məxfilik mühərriki"]
    VIS --> DB[("SQLite")]

    style SVC fill:#dcfce7,stroke:#15803d,color:#14532d
    style VIS fill:#dcfce7,stroke:#15803d,color:#14532d
```

`/api/v1` **sıfır yeni DB sorğusu** yazır — hamısı mövcud servis funksiyalarını
çağırır. OpenAPI sənədi Zod sxemlərindən **törəyir** (`src/lib/api/openapi.ts`),
yəni əl ilə yazılmış YAML köhnələ bilmir.

⚠️ v1 qatı bir yerdə UI-dan **daha məhduddur**: üzv olmadığın sinif üçün
endpoint `404` qaytarır (`src/lib/api/cohort-scope.ts`), səhifə isə boş siyahı
göstərir. `403` yerinə `404` — resursun **mövcudluğu** da məlumatdır.

## 8. Sənədə salınmayan daxili route-lar

`src/app/api` altında `/api/v1`-dən kənar 6 route var. İkisi (`/api/upload`,
`.../ics`) **ictimai müqavilədir** və OpenAPI sənədinə salınıb (`Media` /
`Events` taqları, `src/lib/api/openapi.ts`). Qalan dördü **daxili UI
detalıdır** — sənədə salınmır, çünki xarici müştəri onları HEÇ VAXT çağırmır
(brauzer naviqasiyası və ya UI-ın öz `fetch` kontraktı):

| Route | Niyə sənəddə yox |
|---|---|
| `/api/feed` | `FeedList` → `useInfiniteQuery` üçün UI müqaviləsidir; sənədlənmiş qarşılığı `/api/v1/cohorts/{slug}/posts`-dur (TƏLƏ F — bax `src/app/api/v1/cohorts/[slug]/posts/route.ts`). |
| `/api/search` | ⌘K palitrasının UI müqaviləsidir; sənədlənmiş qarşılığı `/api/v1/search`-dır (TƏLƏ F — bax `src/app/api/v1/search/route.ts`). |
| `/api/session/expired` | Auth.js yönləndirmə dövrəsini kəsən daxili qaçış yoludur — brauzer `Location` naviqasiyası ilə çağırılır, JSON müştərisi yoxdur, `redirect()` server komponentindən yazıla bilmədiyi üçün route handler kimi mövcuddur. |
| `/api/auth/[...nextauth]` | Auth.js v5-in ÖZ protokoludur (`handlers`-dən birbaşa) — bizim müqavilə deyil, kitabxananın daxili sorğu-cavab formatını daşıyır. |

⚠️ Bu, boşluğu **örtmək** deyil, **qərarı sənədləşdirməkdir**: müdafiədə
«niyə sənəddə deyil?» sualının cavabı budur. Ağ siyahı kod səviyyəsində
`src/lib/api/openapi.test.ts` → `UNDOCUMENTED_ROUTE_WHITELIST`-də bərkidilib
— yeni v1-dən kənar route əlavə olunanda test aşır və müəllif ya sənədə
salmalı, ya buraya (və o siyahıya) səbəblə yazmalıdır.

### `/api/upload` — niyə (a)

Fayl yükləmə real xarici müqavilədir: müştəri `multipart/form-data`
göndərir, server ölçü/format doğrulayır və `MediaAsset` sahələrini qaytarır.
Sənəddə (`Media` taqı) ölçü limiti, icazəli MIME tipləri VƏ real status
kodları göstərilir.

🔴 Başlanğıc fərziyyə ölçü aşımının **413** olduğu idi — kodu oxumadan qəbul
edilsəydi sənəd YALAN olardı: route handler (`src/app/api/upload/route.ts`)
`TOO_LARGE`-ı digər doğrulama xətaları ilə eyni statusa, **400**-ə yazır;
yalnız disk yazma xətası (`WRITE_FAILED`) 500 alır.

⚠️ Cavab v1 zərfindən (`{ data }`) keçmir və xəta forması da fərqlidir
(`{ error: "mətn" }`, v1-in `{ error: { code, message } }`-i YOX) —
`src/lib/api/respond.ts` başlığındakı qeyd bunu qəsdən elan edir (TƏLƏ F).
Sessiyasız sorğu da fərqlidir: `requireUser()` səhifə kimi çağırıldığı üçün
JSON 401 yox, **307 → `/login`** qaytarılır.

### `.../events/{id}/ics` — niyə (a)

Təqvim faylı Google Calendar / Outlook kimi xarici alətlərə verilir —
xarici müqavilədir. Sənəddə cavab `text/calendar` kimi (JSON YOX) elan
olunub və `Content-Disposition` / `Cache-Control` başlıqları təsvirdə
izah edilib.
