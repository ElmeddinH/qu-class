# QU CLASS — Təhlükəsizlik və təhdid modeli

> Bu sənəd **nəyi qoruduğumuzu və nəyi qorumadığımızı** açıq yazır.
> «Qorumuruq» siyahısı qəsdən birinci gəlir: sənədləşdirilməmiş boşluq
> istifadəçi üçün sənədləşdirilmiş boşluqdan **daha təhlükəlidir**.
>
> Qərarların səbəbi — [`DECISIONS.md`](DECISIONS.md).
> Quruluş — [`ARCHITECTURE.md`](ARCHITECTURE.md).

**⚠️ QU CLASS bir universitet portfolio layihəsidir.** Aşağıdakı qorumalar
realdır və testlərlə bərkidilib, amma sistem **istehsal yerləşdirməsi üçün
auditdən keçməyib**. İstehsala çıxarılmadan əvvəl §7-dəki siyahı bağlanmalıdır.

---

## 1. Nəyi qoruyuruq

| # | Aktiv | Təhdid | Qoruma | Sübut |
|---|---|---|---|---|
| A1 | **Sinif məzmunu** (paylaşım, xatirə, nailiyyət) | Kənar şəxs və ya başqa sinfin üzvü oxuyur | 4 səviyyəli görünürlük, filtr **DB sorğusunda** (`visibilityWhere`) | `tests/integration/visibility.db.test.ts` |
| A2 | **`PRIVATE` məzmun** | Admin səlahiyyəti ilə oxunur | `PRIVATE` → yalnız sahibi. **Admin də oxumur** | `src/lib/visibility.ts` → `canView` |
| A3 | **Profil sahələri** (telefon, şəxsi e-poçt) | Kataloqda və ya API cavabında sızır | Sahə-səviyyə `FieldVisibility`; `phone` və `personalEmail` default **`PRIVATE`** | `tests/integration/profile.db.test.ts` |
| A4 | **Karyera məlumatı** | Aqreqasiyadan fərd çıxarılır | k-anonimlik (k=3) + çarpaz ölçü uzlaşması + `includeInStats` razılığı | `src/lib/career-stats.test.ts` |
| A5 | **Hesab siyahısı** | Giriş cavabına görə e-poçt enumerasiyası | Eyni mesaj + **eyni müddət** (real bcrypt işi) | `src/auth.ts` → `equalizeFailureTiming` |
| A6 | **Parollar** | Baza sızsa açıq mətn oxunur | `bcrypt`, `BCRYPT_ROUNDS = 10`, hər istifadəçi üçün **təsadüfi duz** | `src/services/auth.service.ts:53` |
| A7 | **Moderasiya səlahiyyəti** | Rolu alınmış şəxs davam edir | Token-də rol saxlanmır; `cohortIds` və `moderatedCohortIds` **hər sorğuda DB-dən** | [QD-010](DECISIONS.md#qd-010--jwt-minimaldır--cohortids-token-də-saxlanmır) |
| A8 | **Admin əməliyyatları** | İz qalmadan icra olunur | `AuditLog` **append-only**, əməliyyatla **eyni transaksiyada** | `src/services/audit.service.ts` |
| A9 | **Fayl yükləmə** | Skript daşıyan fayl `public/` altından verilir | MIME **ağ siyahısı** (fail-closed), **SVG qəsdən yoxdur**, 10 MB limit, `sharp` ilə WebP-yə yenidən kodlaşdırma | `src/services/storage.ts` |
| A10 | **Brute-force giriş** | Şifrə sınaqla tapılır | 10 dəqiqədə 5 uğursuz cəhd; sayğac **yalnız uğursuzda** artır | `src/lib/api/rate-limit.ts` |
| A11 | **Sirlərin repoya düşməsi** | `.env` / `dev.db` tarixçəyə commit olunur | `.gitignore` + **bütün commit ağacını gəzən** push öncəsi audit | `npm run git:audit` |

---

## 2. Nəyi QORUMURUQ (açıq boşluqlar)

| # | Boşluq | Niyə | Real risk |
|---|---|---|---|
| B1 | **Sessiya serverdən dərhal ləğv edilə bilmir** | JWT strategiyası, `Session` cədvəli yoxdur ([QD-009](DECISIONS.md#qd-009--jwt-sessiya--session-cədvəli-yoxdur)) | Oğurlanmış kuka öz müddətinə qədər keçərlidir. Yeganə toplu həll — `AUTH_SECRET` rotasiyası (hamını çıxarır) |
| B2 | **Parol sıfırlama yoxdur** | E-poçt kanalı yoxdur ([QD-001](DECISIONS.md#qd-001--parol-sıfırlama-axını-qəsdən-yazılmayıb)) | Şifrəsini unudan istifadəçi admindən asılıdır |
| B3 | **İki faktorlu autentifikasiya yoxdur** | Miqyas və vaxt büdcəsi | Parol tək müdafiə xəttidir |
| B4 | **Rate-limit yaddaşdadır** | Prosesdaxili `Map`; Redis yoxdur | Çox instansiyalı yerləşdirmədə limit instansiya başına işləyir. Server restartında sıfırlanır |
| B5 | **Yüklənmiş fayllar ictimai qovluqdadır** | `public/uploads/` — statik verilir | URL-i bilən **hər kəs** faylı görür. URL təsadüfidir, amma bu «gizlilik obscurity ilə»dir, icazə yoxlaması deyil |
| B6 | **Şifrələnmiş saxlama yoxdur** | SQLite faylı açıq mətndir | Diskə fiziki giriş = bütün dataya giriş |
| B7 | **`/register` e-poçt enumerasiyası** | `EMAIL_TAKEN` səbəbi qaytarılır ([QD-015](DECISIONS.md#qd-015--giriş-xətası-hesab-enumerasiyasını-fərqləndirmir)) | Qeydiyyat forması vasitəsilə e-poçtun mövcudluğu yoxlanıla bilir. Bilinən güzəştdir |
| ~~B8~~ | ~~**Toplu moderasiya, ikinci dərəcəli kohort rolu, CMS-də yaratma**~~ | ✅ **BAĞLANDI** (12B/12E) — `moderation.service.ts:698` (`BULK_DECISION_LIMIT`), `admin-users.service.ts:410` (`changeCohortRole` açıq `cohortId` alır), `admin-content.service.ts:254/398/558` (`createContentPage` · `createFaq` · `createGuidePlace`). E2E: `tests/e2e/admin.spec.ts:314,555,732,802` | Sətir tarixi qeyd kimi saxlanılır |
| B9 | **Şəbəkə səviyyəsi (WAF, DDoS, TLS terminasiyası)** | Yerləşdirmə qatının məsuliyyəti | Layihə HTTPS arxasında işlədilməlidir — `AUTH_URL` `https://` olduqda kuka `__Secure-` prefiksi alır |

---

## 3. 🔴 Seed duzu YALNIZ demo üçündür

`prisma/seed.ts`-də **sabit bcrypt duzu** işlədilir:

```ts
// prisma/seed.ts
const SEED_BCRYPT_SALT = "$2a$10$QUCLASSseedSalt1234567";
const passwordHash = hashSync("Test1234!", SEED_BCRYPT_SALT);
```

**Niyə sabitdir:** `bcrypt` hər çağırışda təsadüfi duz yaradır. Seed isə
**deterministik** olmalıdır — eyni əmr eyni bazanı verməlidir, yoxsa 1844 test
və 220 E2E ssenarisi təkrar işlədiləndə fərqli nəticə alır.

### 🔴 Bu duz istehsal yoluna TOXUNMUR

Qeydiyyat axını **tamamilə başqa koddur** və hər istifadəçi üçün **təsadüfi duz**
yaradır:

```ts
// src/services/auth.service.ts:53
const passwordHash = hashSync(input.password, BCRYPT_ROUNDS);   // BCRYPT_ROUNDS = 10
```

`hashSync(parol, 10)` — ikinci arqument **rounds** rəqəmidir, duz deyil; bcrypt
duzu özü təsadüfi yaradır. Yəni:

| | Duz | İşlədilir |
|---|---|---|
| `prisma/seed.ts` | **sabit** | yalnız demo datası — 125 nümunə hesab |
| `src/services/auth.service.ts` → `registerUser` | **təsadüfi** | `/register` və `POST /api/v1/auth/register` |

### Nəticələr — açıq yazılır

- Seed edilmiş **125 hesabın şifrəsi eynidir** (`Test1234!`) və hash-ləri də
  eynidir. Bu, **qəsdəndir** və README-də test hesabları kimi sənədləşib.
- 🔴 **Seed edilmiş baza istehsala aparılmamalıdır.** `npm run db:seed` yalnız
  dev/demo əmridir.
- İstehsalda: seed işlədilmir, hesablar `/register` və ya SIS idxalı ilə yaranır.
  SIS ilə idxal edilən hesab `UNSET_PASSWORD_HASH` (`"!unset"`) alır və
  `isPasswordUnset()` sayəsində **girişə buraxılmır** — şifrəsiz hesab aktiv
  hesab deyil.

---

## 4. AuditLog — append-only

Audit jurnalını silə bilən admin auditin **özünü mənasız edir**. Qadağa
**üç qatda** saxlanılır:

| Qat | Nə edir |
|---|---|
| 1 · Servis | `src/services/audit.service.ts` **silmə / redaktə funksiyası ixrac ETMİR**. `audit.service.test.ts` modul ixraclarını gəzib bunu bərkidir |
| 2 · UI | `/admin/audit` yalnız oxu formasıdır — düymə yoxdur |
| 3 · API | `/api/v1/admin/audit` yalnız `GET` ixrac edir; `POST`/`DELETE` route-u **mövcud deyil** (`openapi.test.ts` yoxlayır) |

Əlavə qaydalar:

- **Atomiklik.** `recordAudit(tx, …)` `tx`-i arqument kimi alır — audit sətri
  əməliyyatla **eyni transaksiyada** yazılır. Ayrı yazılsaydı «əməliyyat oldu,
  iz yoxdur» (və ya əksi) halı mümkün olardı.
- **Metadata ağ siyahıdır.** `safeAuditMetadata()` yalnız icazəli açarları
  saxlayır (`operation`, `reportId`, `cohortId`, `visibility`, `reason`, …).
  Səbəb: jurnal adminə **göstərilir**. Şikayət edilmiş `PRIVATE` paylaşımın
  gövdəsi metadata-ya düşsəydi, məzmun moderasiya qapısından **yan keçib**
  jurnalda peyda olardı.
- **Yeganə yazma yolu `recordAudit`-dir.** `prisma.auditLog.create` birbaşa
  çağırılmır — Blok 12A auditi (T42) altı belə çağırış tapıb köçürdü, çünki
  onlar ağ siyahıdan yan keçirdi.
- **İstisna:** `prisma.auditLog.deleteMany()` **seed-də** işlədilir — seed servis
  qatından keçmir, bazanı sıfırdan qurur. Tətbiq içində belə çağırış yoxdur.

**Moderasiya qaydası:** moderator başqasının məzmununu silirsə audit sətri
**məcburidir** və **məzmundan əvvəl** yazılır (`deletePost` → `openModerationReview`
ilə eyni sıra).

---

## 5. Sirlər və `.env` qaydaları

### Qaydalar

1. **`.env` heç vaxt commit olunmur.** `.gitignore` → `.env*` bağlıdır,
   `!.env.example` yeganə istisnadır.
2. **`.env.example`-də real dəyər olmur.** Hər sahə ya boşdur, ya `change-me`.
   Fayl repoya girdiyinə görə buraya yazılan hər şey **tarixçəyə düşür və geri
   qaytarıla bilmir**.
3. **`AUTH_SECRET` maşına məxsusdur.** `npx auth secret` ilə yaradılır.
   Dəyişdirildikdə bütün açıq sessiyalar etibarsız olur — bu, B1-in yeganə
   toplu cavabıdır.
4. **`prisma/dev.db` commit olunmur.** İçində 125 hesabın (demo olsa da) hash-i
   və bütün seed məzmunu var.

### 🔴 `GITHUB_TOKEN` `.env`-də SAXLANMIR

`npm run git:push` tokeni **yalnız prosesin mühitindən** oxuyur:

```bash
read -rsp "PAT: " GITHUB_TOKEN && export GITHUB_TOKEN \
  GITHUB_REPO=owner/qu-class && npm run git:push; unset GITHUB_TOKEN
```

| Yol | Niyə pisdir |
|---|---|
| Əmr sətrində argument | `ps` çıxışı maşındakı **hər prosesə** görünür; bash tarixçəsində qalır |
| `.env` faylında | Diskdə açıq mətndir — redaktorda, backup-da, ekran paylaşımında görünür |
| Skriptin içində | Commit olunur → tarixçədə əbədi qalır |

`read -rs` dəyəri ekranda göstərmir və tarixçəyə yazmır.

### Push öncəsi audit — `npm run git:audit`

Şəbəkəsiz, yalnız oxu. **Bütün commit-lərin ağacını** gəzir, yalnız HEAD-i yox:
`.gitignore` gələcək commit-ləri süzür, amma **bir dəfə commit olunmuş** `.env`
tarixçədə qalır və `git log -p` ilə görünür.

Skript qadağan yolları, məzmunda sirr nümunələrini və blob ölçülərini yoxlayır;
tapıntı varsa **çıxış kodu 1** olur, yəni `git:audit && git:push` zənciri
sızma halında öz-özünə dayanır. Tapılan hər dəyər hesabatda **maskalanır**
(ilk 4 simvol + `****`) — hesabatın özü sızma mənbəyinə çevrilməməlidir.

**Son ölçmə** (`docs/git-audit-report.md`, 2026-07-31): 33 commit gəzilib,
871 unikal blob, **0 bloklayan tapıntı, 0 xəbərdarlıq**.

🔴 **Push geri qaytarıla bilməz.** Sızmış sirr push olunubsa yeganə düzgün cavab
dəyəri **rotasiya etməkdir** — GitHub silinmiş obyektləri bir müddət saxlayır,
fork və keş isə əbədi qala bilər.

---

## 6. Autentifikasiya və icazə — qat-qat

```
1. middleware.ts (Edge)      → qorunan prefiks + admin route yoxlaması
2. requireUser() / requireAdmin() / requireCohortRole()  → səhifə + server action
3. assertFreshAdmin()        → servis qatı, rolu HƏR ÇAĞIRIŞDA BAZADAN oxuyur
4. visibilityWhere(viewer)   → sorğu səviyyəsi, DB-də
```

**Niyə dörd qat:**

- Middleware server action çağırışlarını əldən verə bilər → 2-ci qat lazımdır.
- `viewer.systemRole` çağıran tərəfin qurduğu obyektdən gəlir və köhnə JWT-dən
  qidalana bilər → `assertFreshAdmin()` rolu **DB-dən** oxuyur (`admin-guard.ts`,
  TƏLƏ B). Qapının gücü məhz həmin sorğudadır.
- Səhifə keçsə də sorğu öz filtrini tətbiq edir → 4-cü qat məzmun sızmasını
  bağlayır.

**Fail-closed davranış:** naməlum `systemRole` dəyəri
`SystemRoleSchema.catch("USER")` ilə **ən aşağı səlahiyyətə** düşür.
Deaktiv hesab (`deactivatedAt !== null`) admin sayılmır — deaktivasiya rolu
silmir, girişi bağlayır.

**`403` yerinə `404`.** `/api/v1`-də üzv olmadığın sinif üçün endpoint `404`
qaytarır (`src/lib/api/cohort-scope.ts`). Səbəb: resursun **mövcudluğu** da
məlumatdır — `403` «belə bir sinif var, amma sən üzv deyilsən» deyir.

---

## 7. İstehsala çıxmadan əvvəl bağlanmalı siyahı

1. `npm run db:seed` **işlədilmir**; seed hesabları (`Test1234!`) mövcud olmamalıdır.
2. `AUTH_SECRET` yenidən yaradılır və secret manager-də saxlanılır.
3. `AUTH_URL` `https://…` qoyulur → sessiya kukisi `__Secure-` prefiksi və
   `secure` bayrağı alır.
4. Rate-limit paylaşılan yaddaşa (Redis) köçürülür — B4.
5. Yüklənmiş fayllar `public/` altından çıxarılır və icazə yoxlanışı olan
   endpoint arxasına keçir — B5.
6. Parol sıfırlama axını qurulur (QD-001 §«Gələcək həll»).
7. Baza PostgreSQL-ə köçürülür ([`docker-compose.yml`](../docker-compose.yml)),
   diskdə şifrələmə açılır — B6.
8. `npm run git:audit` sıfır tapıntı ilə keçir.

---

## 8. Boşluq bildirmək

Bu, akademik portfolio layihəsidir — rəsmi təhlükəsizlik proqramı yoxdur.
Boşluq tapsanız repo issue-su açın; **istismar detalını ictimai issue-da
yazmayın**, yalnız təsir sahəsini göstərin.
