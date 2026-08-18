# QU CLASS — Müdafiə sual-cavab kartları

> **25 sual, 25 cavab.** Hər cavab 3–5 cümlədir, jarqonsuzdur və **fayl adı
> səviyyəsində** koda istinad edir — yəni komissiya iddianı yerində yoxlaya bilər.
>
> Sənəd **öyrənmək üçün deyil, yaddaşı təzələmək üçündür**. Müdafiədən əvvəl
> bir dəfə oxu; otaqda açıq saxlama.
>
> Demo ssenarisi — [`DEMO.md`](DEMO.md). Rəqəmlər — [`METRICS.md`](METRICS.md).
> Qərarların tam əsaslandırması — [`DECISIONS.md`](DECISIONS.md).

**Üç qızıl qayda:**

1. **Bilmirsənsə «bilmirəm» demə — hara baxacağını de.** «Bu, `DECISIONS.md`
   QD-011-dədir, açım?» tam qiymətli cavabdır.
2. **Zəif nöqtəni özün aç.** Komissiya boşluğu səndən əvvəl tapsa mövqe itir;
   sən açsan mövqe güclənir (bax §6).
3. **Rəqəm deyirsənsə mənbəyini de.** «1844 test» yox — «1844 test,
   `npm run test` ilə ölçülüb».

| Qrup | Suallar |
|---|---|
| [1 · Arxitektura](#1--arxitektura) | S1 – S4 |
| [2 · Məxfilik](#2--məxfilik) | S5 – S11 |
| [3 · Data](#3--data) | S12 – S15 |
| [4 · Auth](#4--auth) | S16 – S19 |
| [5 · Test](#5--test) | S20 – S22 |
| [5b · Yerləşdirmə və istismar](#5b--yerləşdirmə-və-istismar--blok-12a12f-sualları) | S22a – S22e |
| [6 · Zəif nöqtələr](#6--zəif-nöqtələr--dürüst-cavablar) | S23 – S25 |

---

## 1 · Arxitektura

### S1. Niyə tək repo, tək Next.js prosesi? Ayrı backend niyə yoxdur?

Çünki layihənin ən vacib qaydası — məxfilik filtri — **tək yerdə** olmalıdır.
İki ayrı proses olsaydı (React frontend + Express backend), görünürlük qaydası
ya iki dəfə yazılardı, ya da bir tərəfdə köhnələrdi; bu, məhz sızmanın
yarandığı yerdir. Next.js App Router həm render, həm API qatıdır və hər ikisi
**eyni servis funksiyalarını** çağırır (`src/services/`), yəni qapı fizikən
təkdir. Əlavə qazanc: ayrı deploy, ayrı auth, CORS və tip dublikatı problemi
ümumiyyətlə yaranmır — səbəblər `docs/DECISIONS.md` → QD-003-dədir.

### S2. Bəs `/api/v1` niyə var? Bu, məntiqin dublikatı deyilmi?

Xeyr — `/api/v1` **sıfır yeni baza sorğusu** yazır. Hər endpoint mövcud servis
funksiyasını çağırır, yəni eyni məxfilik mühərrikindən (`src/lib/visibility.ts`)
keçir; fərq yalnız cavabın formasındadır. Bu səth xarici inteqrasiya və
sənədləşdirmə üçündür: OpenAPI sənədi Zod sxemlərindən **törəyir**
(`src/lib/api/openapi.ts`), ona görə əl ilə yazılmış YAML kimi köhnələ bilmir.
Bir yerdə isə v1 səthi UI-dan **daha məhduddur**: üzv olmadığın sinif üçün
`404` qaytarır, çünki `403` «belə sinif var» məlumatını verərdi
(`src/lib/api/cohort-scope.ts`).

### S3. Bu sistem necə miqyaslanır? 125 istifadəçidən 10 000-ə keçsə nə olur?

Birinci məhdudiyyət **baza olur, kod yox**: SQLite tək yazıcı kilidi ilə işləyir.
Keçid yolu ölçülüb və repoda var — `docker-compose.yml`: Postgres qaldır, `.env`-də
bağlantını dəyiş, sxemdə **bir sətir** (`provider`), miqrasiyaları yenidən yarat.
**Tətbiq kodunda dəyişiklik yoxdur**, çünki bütün enum-lar onsuz da `String`
sütundur. İkinci məhdudiyyət rate-limit-dir — hazırda prosesdaxili yaddaşdadır və
çox instansiyalı yerləşdirmədə Redis-ə köçürülməlidir (`src/lib/api/rate-limit.ts`,
`docs/SECURITY.md` §7 bənd 4).

### S4. Kodun qat qaydası nədir və onu nə qoruyur?

Bir cümlə ilə: **heç bir səhifə və ya route handler birbaşa `prisma.*`
çağırmır.** Bütün baza girişi `src/services/` qatındadır və hər servis
funksiyası ilk arqument kimi `Viewer` alır — yəni «bu sorğunu kim edir» sualı
imzada məcburidir, unudula bilmir. Səhifə faylları nazikdir: yalnız
`src/features/`-dan komponent import edib render edirlər. Qat cədvəli və
diaqramı `docs/ARCHITECTURE.md` §2-dədir; qayda Blok 12A-da `grep` ilə
yoxlanılıb.

---

## 2 · Məxfilik

### S5. Niyə məxfilik filtri baza səviyyəsindədir? JavaScript-də filtrləsək nə olur?

**İki şey sınır və hər ikisi realdır.** Birincisi səhifələmə: bazadan 20 sətir
gətirib JS-də 12-sini atsan istifadəçi 8 sətirlik «yarımçıq səhifə» görür və
növbəti səhifə düyməsi yalan danışır. İkincisi — və daha pisi — sayğaclar:
`count()` filtrsiz hesablanır, yəni ekranda «45 paylaşım» yazılır, amma
istifadəçi 13-ünü görür — **görmədiyi məzmunun sayı sızır**. Ona görə
`visibilityWhere(viewer)` Prisma `where` şərtinə birləşdirilir və JS-də
filtrləmə **qadağandır** (`docs/DECISIONS.md` → QD-006).

### S6. Nə üçün `PRIVATE` məzmunu universitet admini də görmür? Admin hər şeyi görməli deyilmi?

Çünki `PRIVATE` sahə telefon nömrəsi və şəxsi e-poçtdur — onlar universitetin
işini görmək üçün lazım deyil. `src/lib/visibility.ts`-dəki `visibilityWhere`
funksiyasında admin üçün ayrıca «hamısını gör» şaxəsi **ümumiyyətlə yoxdur**;
`PRIVATE` yalnız sahib şaxəsi ilə görünür. Admin səlahiyyəti başqa yerdə
realdır: rol idarəsi, şikayət növbəsi, məzmun sistemi, SIS idxalı. Şikayət
edilmiş məzmuna baxmaq üçün ayrıca **moderasiya yolu** var və o, audit sətri
yazılmadan açılmır.

### S7. k-anonimlik nədir və niyə həddi məhz 3-dür?

k-anonimlik o deməkdir ki, statistikada göstərilən hər xana ən azı k nəfəri
təmsil etməlidir — əks halda rəqəm konkret şəxsi göstərmiş olur. Bizdə
`MIN_BUCKET_SIZE = 3` (`src/lib/visibility.ts`): üç nəfərdən kiçik xana
açılmır. **2 olsaydı qoruma olmazdı** — iki nəfərlik xanada hər biri o birini
onsuz da tanıyır. **5 olsaydı məhsul qalmazdı** — 14–28 nəfərlik sinifdə demək
olar hər xana gizlənərdi; bu, ölçülüb (`docs/DECISIONS.md` → QD-013). Vacib
detal: kiçik xana **silinmir**, ümumiləşdirilir — şəhər ölkəyə, ölkə isə
«Açıqlanmayan»a yığılır.

### S8. İki qrafiki bir-birindən çıxıb gizlədilmiş nəfəri tapmaq olarmı?

Xeyr, və bu qəsdən belə qurulub. Bütün bölgülər **tək sətir çoxluğu üzərində,
tək keçiddə** hesablanır və hər ölçüdə invariant saxlanılır:
`açıqlanan + açıqlanmayan + bildirilməyən = respondentCount`. Əvvəlki versiyada
beş ayrı `groupBy` sorğusu var idi və hər birinin `where`-i fərqli idi — cəmlər
uyğun gəlmirdi, yəni fərq götürüb qalıq tapmaq mümkün idi; bu, Blok 10B-də
tapılıb düzəldilib. Alqoritm və ölçülmüş alternativlər `src/lib/career-stats.ts`
faylının başlığındadır.

### S9. Niyə maaş göstəricisi yoxdur? Belə platformalarda o, ən dəyərli məlumatdır.

Bu, texniki boşluq deyil, **məhsul qərarıdır**. Problem xananın ölçüsündə deyil,
göstəricinin arifmetikasındadır: 19 nəfərlik sinifdə orta maaşı bilən bir nəfər
öz rəqəmini çıxarıb qalanları hesablayır, iki nəfər isə praktiki olaraq
üçüncünü tapır — **k-anonimlik bunu həll etmir**. Ona görə sahə ümumiyyətlə
yoxdur: nə sxemdə sütun, nə servisdə hesablama, nə API cavabında sahə. Qərar
şərhlə deyil, **testlə** qorunur — `src/lib/career-stats.test.ts` çıxışda
`salary|maaş|bonus|wage|income|compensation` şablonunu axtarır və tapsa testi
sındırır (`docs/DECISIONS.md` → QD-011).

### S10. Xəritə fərdin dəqiq yerini göstərirmi?

Xeyr — və göstərə **bilməz**, çünki koordinat bazada yoxdur. `CareerEntry`
modelində `latitude` / `longitude` sütunu qəsdən yaradılmayıb; pin `src/lib/geo.ts`
faylındakı **statik şəhər cədvəlindən** gəlir və şəhər mərkəzinə qoyulur. Nəticə:
eyni şəhərdəki iki nəfər eyni nöqtədə birləşir, yəni xəritədən fərd ayırd
edilə bilmir. Tanınmayan şəhər isə ümumiyyətlə pin yaratmır — sətir ölkə
səviyyəsində sayılır (`docs/DECISIONS.md` → QD-012).

### S11. Moderasiya necə auditlənir? Admin izi silə bilərmi?

Silə bilməz və bu, **üç qatda** saxlanılır: servis qatı silmə funksiyası
**ixrac etmir** (`src/services/audit.service.ts`), `/admin/audit` yalnız oxu
formasıdır — düymə yoxdur, `/api/v1/admin/audit` isə yalnız `GET` ixrac edir və
`DELETE` route-u **mövcud deyil**. İkinci qayda atomiklikdir: audit sətri
əməliyyatla **eyni transaksiyada** yazılır, yəni «əməliyyat oldu, iz yoxdur»
halı mümkün deyil. Üçüncüsü — metadata **ağ siyahıdır** (`safeAuditMetadata`):
şikayət edilmiş `PRIVATE` paylaşımın mətni jurnala düşmür, əks halda məzmun
moderasiya qapısından yan keçib adminə göstərilən jurnalda peyda olardı
(`docs/SECURITY.md` §4).

---

## 3 · Data

### S12. Niyə SQLite? PostgreSQL daha «ciddi» seçim deyilmi?

Şərt belə idi: qiymətləndirici reponu klonlayıb **bir əmrlə** sistemi qaldıra
bilməlidir. Postgres bunu sındırır — Docker quraşdırılmalı, konteyner qalxmalı,
port boş olmalıdır; müdafiə otağında şəbəkə olmaya da bilər. Yük ölçülüb:
sinif 14–28 nəfərdir, seed 6 sinif və 125 istifadəçi yaradır, yazma yükü demək
olar yoxdur. Ən vacibi — seçim «Postgres-i bacarmadıq» deyil: keçidin ucuz
olduğu **ölçülüb və repoda sənədləşib** (`docker-compose.yml`, `QD-002`).

### S13. Postgres-ə keçid neçə sətir dəyişiklik tələb edir?

**Tətbiq kodunda sıfır sətir.** Dəyişən iki sətirdir: `.env`-də `DATABASE_URL`
və `prisma/schema.prisma`-dakı `datasource` blokunda `provider = "sqlite"` →
`"postgresql"`. Üçüncü addım kod deyil, əməliyyatdır: miqrasiya qovluğu yenidən
yaradılır (`rm -rf prisma/migrations && npx prisma migrate dev --name init`),
çünki SQLite-ın DDL-i Postgres-ə uyğun deyil. Enum köçürməsi **tələb olunmur** —
səbəbi növbəti sualdadır.

### S14. Niyə bütün enum-lar `String` sütundur? Bu, zəif tiplənmə deyilmi?

Başlanğıcda məcburiyyət idi: SQLite Prisma-da native `enum` dəstəkləmir. Amma
məhdudiyyət üstünlüyə çevrildi — Postgres-ə keçəndə native enum köçürməsi
**tələb olunmur**. Tiplənmə itmir, sadəcə yeri dəyişir: həqiqət mənbəyi
`src/lib/enums.ts`-dir və hər enum ailəsi üç şey ixrac edir — `X_VALUES`
massivi, `XSchema` Zod validatoru (sərhəddə, yəni `req.json()` və
`searchParams`-da) və `X` tipi. Hazırda **37 enum ailəsi** var; kodda sətir
literalı yazılmır, enum import edilir və bu, Blok 12A-da `grep` ilə yoxlanılıb.

### S15. Niyə `TimelineEntry` ayrıca cədvəldir? Bu, data dublikatı deyilmi?

Dublikatdır — və şüurlu qərardır. Xronologiya dörd mənbədən qidalanır
(paylaşım, nailiyyət, tədbir, sistem mərhələsi), üç filtr təklif edir və
səhifələnir; üç cədvəli sorğu zamanı birləşdirmək istəsək SQLite-da Prisma
`UNION` vermir, yəni üç ayrı sorğu + JS-də birləşdirmə + JS-də sıralama olardı —
bu isə **QD-006-nı pozur**, səhifələmə sınır. Ona görə `title`, `category`,
`occurredAt`, `visibility` və `academicYear` mənbədən **kopyalanır** və indekslə
tək sorğuda oxunur. Kopyalanmış datanın riski iki qayda ilə bağlanıb:
görünürlük mənbədən **daha açıq ola bilməz**, və silmə *soft delete* olduğu üçün
`deletePost` eyni transaksiyada `timelineEntry.deleteMany` çağırır
(`src/services/post.service.ts`, `src/features/feed/fanout.test.ts`).

---

## 4 · Auth

### S16. Niyə JWT sessiya? Niyə `Session` cədvəli yoxdur?

Çünki route qoruması `src/middleware.ts`-dədir və o, **Edge runtime**-da işləyir —
orada Prisma işləmir, yəni sessiyanı bazadan oxumaq **texniki cəhətdən mümkün
deyil**. `database` strategiyası seçilsəydi middleware qoruması tamamilə ləğv
olunardı və qorunma yalnız səhifə səviyyəsində qalardı. JWT ilə sessiya imzalanmış
kukadan oxunur, üç cədvəl (`Session`, `Account`, `VerificationToken`) isə
ümumiyyətlə yaranmır. Qiyməti var və onu gizlətmirik — S18-ə bax
(`docs/DECISIONS.md` → QD-009).

### S17. Token-də nə var, nə yoxdur — və niyə?

Token-də **yalnız iki şey** var: `userId` və `systemRole`. `cohortIds`, `stage`
və `moderatedCohortIds` **qəsdən yoxdur**, çünki onlar dəyişkəndir: sinifdən
çıxarılmış istifadəçi token bitənə qədər sinif məzmununu görməkdə davam edərdi,
moderatorluqdan alınan şəxs isə moderasiya etməkdə. Onun əvəzinə həmin sahələr
hər sorğuda `getViewer()` ilə bazadan oxunur; funksiya React `cache()` ilə
örtülüb, yəni **render başına bir sorğudur**. Nəticə: icazə həmişə cari, token
kiçik (`docs/DECISIONS.md` → QD-010, `src/lib/viewer.ts`).

### S18. Bu Edge runtime problemi konkret nədir və necə həll olunub?

`middleware.ts` default olaraq Edge-də işləyir və onun **import qrafındakı hər
modul** Edge üçün bundle olunur — yəni auth konfiqi bir faylda olsaydı Prisma
engine və `bcryptjs` Edge bundle-a düşərdi və `npm run build` **sınardı**. Həll
Auth.js-in «split config» nümunəsidir: `src/auth.config.ts` Edge-təhlükəsizdir
(yalnız callback-lər, `providers: []`), `src/auth.ts` isə Node hissəsidir və
Credentials provider-i əlavə edir. `middleware.ts` **yalnız** `auth.config`-i
import edir. Bu, üslub seçimi deyil, məcburiyyətdir — və hər iki faylın başında
böyük hərflərlə yazılıb (`docs/DECISIONS.md` → QD-008).

### S19. Oğurlanmış sessiyanı dərhal ləğv edə bilirsinizmi?

**Xeyr — və bunu açıq yazırıq.** JWT strategiyasında token öz müddətinə qədər
keçərlidir; server tərəfdə saxlanan vəziyyət olmadığı üçün tək bir sessiyanı
ləğv etmək mümkün deyil. Yeganə toplu cavab `AUTH_SECRET` rotasiyasıdır və o,
**hamını** çıxarır. Qismən qoruma var: deaktiv edilmiş hesab üçün boşluq
`authorize()`-da `deactivatedAt` yoxlaması ilə **girişdə** bağlanır, servis
qatında isə `assertFreshAdmin()` admin rolunu **hər çağırışda bazadan** oxuyur —
yəni köhnə token adminlik verə bilmir (`docs/SECURITY.md` B1, §6).

---

## 5 · Test

### S20. 1844 test nəyi qoruyur? Sadəcə rəqəm deyilmi?

Rəqəm deyil, çünki testlərin çəkisi bərabər deyil — 13-ü **real bazaya qarşı**
işləyən inteqrasiya faylıdır (`tests/integration/`). Onlar «UI-da göstərmirik»
ilə «sorğu onu gətirmir» arasındakı fərqi yoxlayır, yəni məxfilik iddiasını
davranış səviyyəsində bərkidir. Qalanları saf funksiyaları (görünürlük məntiqi,
k-anonimlik, akademik il hesablaması, kontrast dəyərləri) və komponentləri
örtür. Üstəlik 220 Playwright testi **istehsal build-inə** qarşı işləyir, yəni
build-də sınan şeyi tuturlar.

### S21. Ən kritik beş test hansıdır?

| # | Fayl | Nəyi qoruyur | Test sayı |
|---|---|---|---|
| 1 | `tests/integration/visibility.db.test.ts` | Görünürlük filtri **real bazada** — sətirlərin həqiqətən gəlmədiyini yoxlayır | 25 |
| 2 | `src/lib/career-stats.test.ts` | k-anonimlik, çarpaz ölçü invariantı və **maaş sahəsinin yoxluğu** | 30 |
| 3 | `tests/integration/profile.db.test.ts` | Sahə-səviyyə redaktə — `phone` / `personalEmail` sızmır | 20 |
| 4 | `src/features/feed/fanout.test.ts` | Paylaşım → xronologiya → nailiyyət fan-out-u və **soft delete təmizliyi** | 40 |
| 5 | `src/lib/api/openapi.test.ts` | Sənəd–kod uyğunluğu; `salary` / `DELETE /audit` sənəddə **yoxdur** | 25 |

Beşinci sətir xüsusi vacibdir: o, **sənədin özünü** testə çevirir — yəni
«maaş sahəsi yoxdur» iddiası şərh deyil, sınaqdır.

### S22. Niyə iki ayrı E2E dəsti var?

Çünki onlar fərqli serverə baxır və eyni konfiqdə birləşdirilə bilmirlər. Əsas
dəst (`npm run test:e2e`, 220 test / 22 fayl) **istehsal serverinə** qarşı işləyir
(`next start`, port 3100) — yəni build zamanı yaranan problemləri tutur. İkincisi
(`npm run test:e2e:dev`, 1 test) **dev serverinə** baxır və bir sualı yoxlayır:
«F5 basanda işləyirmi?» — `/` açılır, giriş sinif səhifəsinə aparır, `/kuds`
render olunur və **brauzer konsolunda xəta yoxdur**.

---

## 5b · Yerləşdirmə və istismar — Blok 12A/12F sualları

> Bu beş sual müdafiədə **çox güman ki** veriləcək: dördü deploy blokundan
> (12A/12E), biri isə 12B-nin ən çətin səhvindəndir. Cavablar `fayl:sətir`
> göstərir.

### S22a. Niyə SQLite? Bu miqyasda necə davranır, harada sınır?

**Qərar:** [QD-002](DECISIONS.md#qd-002--baza-sqlite-postgresql-deyil).

Vahid **sinifdir**: 14–28 nəfər. Bu layihədə ən böyük cohort **125 üzvdür** və
bütün seed **6323 sətirdir** ([`METRICS.md`](METRICS.md) §3.1) — yəni data
həcmi bir Postgres instansiyasını haqq qazandırmır.

**Harada sınır — dürüst hədd:** SQLite **tək yazıcı** kilidi ilə işləyir. Oxu
paralel gedir, amma yazı serializə olunur. Bu miqyasda hiss olunmur (yazı
hadisələri: paylaşım, şərh, reaksiya — saniyədə onlarla deyil), lakin **çox
istifadəçili istehsalda birinci məhdudiyyət budur** və README «Bilinən
məhdudiyyətlər» → «Miqyas» bəndində açıq yazılıb.

**İddia sınanıb, təxmin deyil:** keçid yolu ölçülüb —
[`docker-compose.yml`](../docker-compose.yml) + `provider = "postgresql"`
dəyişikliyi, **tətbiq kodunda sıfır dəyişiklik**. Səbəb: hər sorğu Prisma-dan
və `src/services/` qatından keçir, xam SQL yoxdur.

### S22b. «Tək maşın məhdudiyyəti» konkret nə deməkdir?

Fly.io konfiqi bunu **qəsdən** bir maşına bağlayır:

| Ayar | Dəyər | Fayl |
|---|---|---|
| `min_machines_running` | **1** | [`fly.toml:66`](../fly.toml) |
| `auto_stop_machines` | `"off"` | [`fly.toml:62`](../fly.toml) |
| volume `source` / `destination` | `qu_data` → `/data` | [`fly.toml:41-43`](../fly.toml) |

**Səbəb:** Fly volume **bir maşına** bağlanır. İkinci maşın qalxsa öz **BOŞ**
volume-unu görər — yəni istifadəçi sorğusu hansı maşına düşdüyündən asılı olaraq
ya dolu, ya boş baza tapar. Bu, «yavaş işləyir» deyil, **məlumatın itməsi kimi
görünən** pozuntudur. Ona görə CLAUDE.md deploy bölməsi `min_machines_running = 1`-i
danışılmaz qayda kimi yazır.

**Qiyməti dürüst deyilir:** üfüqi miqyaslanma yoxdur, deploy zamanı qısa fasilə
var və **ehtiyat nüsxə yoxdur** — bu üçü QD-018-də və QD-019-un «bərpa ucuz
deyil» bəndində yazılıb.

### S22c. Demo parolu README-də açıqdırsa, sayt təhlükəsizdirmi?

**Qərar:** [QD-019](DECISIONS.md#qd-019--canlı-instansiyada-demo-admin-parolu-dəyişdirilir-üzv-hesabları-qalır).

Sual doğrudur və cavab **«README-də yazmaqla problem yoxdur»** deyil. Qərar
hesabları **ikiyə bölür**:

| Hesab | Canlı instansiyada | Niyə |
|---|---|---|
| `admin@qu.edu.az` (`UNIVERSITY_ADMIN`) | **parol dəyişdirilir** | `changeSystemRole` istənilən istifadəçini admin edə bilir → bir dəfəlik giriş **qalıcı** nəzarətə çevrilir. Sonradan parolu dəyişsək belə, təcavüzkarın açdığı ikinci admin QALIR |
| dörd üzv hesabı (rep · moderator · coordinator · alumni) | **qalır** | Zərər radiusu modelin özü ilə bağlıdır: hər sorğu `visibilityWhere(viewer)`-dən keçir, `PRIVATE` onlara da bağlıdır, silmə **soft delete**-dir. Qiymətləndirici dörd cohort rolunu görməlidir — bu, layihənin qiymətləndirilmə şərtidir |

🔴 **Ən vacib hissə — audit jurnalı bu boşluğu BAĞLAMIR.** Hər admin əməliyyatı
`AuditLog`-a düşür və jurnal yalnız-əlavədir, amma **audit izlənəbilirlikdir,
geri qaytarma deyil**: anonim ziyarətçinin `actorId`-si heç nə vermir və `undo`
yoxdur. Bunu özümüz yazmışıq, komissiya tapmayıb.

### S22d. Next-in `public/` keş qüsurunu necə tapdın?

**Simptom:** istifadəçi şəkil yükləyir, `MediaAsset` sətri yaranır, feed kartı
render olunur — **şəkil açılmır**. Amma `npm run dev`-də hər şey işləyir.

**Səbəb — ölçülüb, təxmin edilməyib** ([`src/services/uploads-serve.ts`](../src/services/uploads-serve.ts)
başlığında tam protokol var): Next istehsal rejimində `public/` siyahısını
**server başlayanda BİR DƏFƏ** oxuyur və yaddaşda saxlayır
(`next/dist/server/lib/router-utils/filesystem.js` → `publicFolderItems`;
`recursiveReadDir` yalnız `!opts.dev` blokunda çağırılır). Sonrakı sorğuda diskə
baxılmır.

**Necə sübut edildi** — `next start` altında üç ölçmə:

| Fayl | Nəticə |
|---|---|
| serverdən **əvvəl** mövcud (`/uploads/boot/boot.svg`) | **200** |
| serverdən **sonra** yaradılan (`/uploads/runtime/x.svg`) | **404** |
| eyni fayl `next/image` ilə | **400** |

🔴 **Niyə `dev`-də görünmür:** `if (!matchedItem && opts.dev)` budağı dev-də hər
sorğuda diskə yenidən baxır. Yəni qüsur **yalnız istehsalda** və **yalnız
serverin ömrü içində yaradılmış fayllarda** üzə çıxır — deploy olmadan tapıla
bilməzdi.

**Həll:** `src/app/uploads/[...path]/route.ts` qatı. Statik sürətli yol İTMİR —
Next `publicFolder`-i `appFile`-dan əvvəl yoxlayır, ona görə bu route-a yalnız
start-dan sonra yaranmış fayllar düşür.

### S22e. `loading.tsx` 404-ü niyə sındırırdı?

**Simptom:** `loading.tsx` əlavə edilən seqmentdə mövcud olmayan resurs **404
əvəzinə 200** qaytarırdı.

**Səbəb:** `loading.tsx` seqmenti **axınla render**-ə (streaming) keçirir. Axın
HTTP cavab **başlığını** — yəni **statusu** — məzmundan ƏVVƏL göndərir. Sonra
`notFound()` və ya `forbidden()` çağırılsa, status artıq **200 kimi yola
düşüb**; Next yalnız `<body>` içində 404 UI-nı göstərə bilir. Nəticə:
istifadəçi 404 səhifəsini görür, **brauzer və axtarış robotu isə 200 alır**.

**Ona görə səhifələr A/B bölünüb** (README «Bilinən məhdudiyyətlər» №8):

| Qrup | Şərt | Həll |
|---|---|---|
| **A** | status qapısı **yoxdur** | seqmentin ƏN DAR yerində `loading.tsx` (üç yerdə route qrupu ilə daraldılıb ki, qonşu dinamik seqmentə düşməsin) |
| **B** | `notFound()` / `forbidden()` **var** | qapı `await` edilir, YALNIZ ondan SONRAKI alt-ağac `<Suspense>`-ə bükülür |

⚠️ `src/app` altında **28 səhifə** status qapısı çağırır — yəni bu, kənar hal
deyil, səhifələrin yarısıdır. Qalan 12 səhifədə heç bir yüklənmə vəziyyəti
yoxdur və səbəbi ayrıca yazılıb: ya gözləyəcək sorğu yoxdur (`/kuds`, `/docs`,
`/login`), ya səhifə yönləndirir (`/home`, `/me`), ya da yeganə sorğu **404
qərarının ÖZÜDÜR** — onu sərhədin arxasına salmaq statusu sındırardı.

---

## 6 · Zəif nöqtələr — dürüst cavablar

> Bu bölmə **gizlədilmir**. Boşluğu özün açsan bu, layihənin sənədləşdirmə
> mədəniyyətinin sübutudur; komissiya tapsa — nəzarətdən çıxmış detaldır.
> Tam siyahı `docs/SECURITY.md` §2 və README «Bilinən məhdudiyyətlər»-dədir.

### S23. Nə işləmir? — funksional boşluqlar

| # | Boşluq | Səbəb — dürüst formulə |
|---|---|---|
| 1 | **Parol sıfırlama axını yoxdur** | E-poçt / SMTP xidməti quraşdırılmayıb. Tokeni çatdıra bilməyən axın işləməyən düymədir və gözlənti yaradır; «müvəqqəti şifrəni ekranda göstər» kimi həllər isə hesab ələ keçirmə vektorudur. Gələcək həllin tam planı QD-001-dədir |
| 2 | **SIS ilə idxal edilmiş hesabın self-service yolu yoxdur** | Hesab `!unset` şifrə ilə yaranır və girişə buraxılmır; `/register` isə e-poçt məşğul olduğuna görə imtina edir. Aktivləşdirmə administrasiyadan asılıdır — bu, №1-in birbaşa nəticəsidir və `/accessibility` səhifəsində də yazılıb |
| 3 | **Cohort səviyyəsində təqvim abunəsi (`.ics` lenti) yoxdur** | Tədbir başına ixrac var, abunə lenti yox. Səbəb texniki maneə **deyil**: Blok 9-un tapşırığına salınmamışdı və sonrakı bloklarda geri qayıdılmadı (`GW-COMPARISON.md` §2, #4) |
| 4 | **Tədbir paylaşma düymələri yoxdur** (FB / X / LinkedIn) | Eyni səbəb — əhatənin daralması. Tədbir URL-i onsuz da paylaşıla biləndir, çünki server-render olunur (`GW-COMPARISON.md` §2, #5) |
| 5 | **Tədbirlərdə populyarlığa görə sıralama yoxdur** | Tutum göstəricisi («N yer qalıb») var, sıralama yoxdur — `src/services/event.service.ts`-də yeganə `orderBy` `startsAt`-dır (`GW-COMPARISON.md` §2, #7) |
| ~~6~~ | ~~**Toplu moderasiya, `/admin/stats` cohort filtri, CMS-də yaratma, ikinci dərəcəli kohort rolu**~~ | ✅ **ARTIQ BOŞLUQ DEYİL** — dördü də bağlanıb və e2e ilə örtülüb: toplu qərar `moderation.service.ts:698` (`tests/e2e/admin.spec.ts:314,418`) · `/admin/stats` sinif filtri `app/(admin)/admin/stats/page.tsx:35` (`admin.spec.ts:902`) · CMS-də yaratma `admin-content.service.ts:254/398/558` (`admin.spec.ts:732,802`) · ikinci dərəcəli kohort rolu `admin-users.service.ts:410` (`admin.spec.ts:555`). 🔴 Blok 12F-də tapıldı: README və SECURITY.md bunları hələ də «açıq borc» kimi yazırdı |

### S24. Nə təhlükəsiz deyil? — açıq qalan risklər

| # | Risk | Niyə açıq qalıb və real təsiri |
|---|---|---|
| 1 | **Sessiya dərhal ləğv edilə bilmir** | JWT strategiyasının qiyməti (S19). Oğurlanmış kuka öz müddətinə qədər keçərlidir; toplu cavab `AUTH_SECRET` rotasiyasıdır |
| 2 | **İki faktorlu autentifikasiya yoxdur** | Miqyas və vaxt büdcəsi. Parol tək müdafiə xəttidir — buna qarşı rate-limit var: 10 dəqiqədə 5 uğursuz cəhd, sayğac **yalnız uğursuzda** artır (`src/lib/api/rate-limit.ts`) |
| 3 | **Yüklənmiş fayllar `public/uploads/` altındadır** | Statik verilir, yəni URL-i bilən hər kəs faylı açır. URL təsadüfidir, amma bu «gizlilik obscurity ilə»dir, icazə yoxlaması deyil. İstehsal siyahısında bənd 5-dir |
| 4 | **`/register` e-poçt enumerasiyasına açıqdır** | Giriş axını enumerasiyanı həm mesaj, həm **vaxt** kanalında bağlayır (`equalizeFailureTiming`), amma qeydiyyat forması `EMAIL_TAKEN` səbəbini qaytarır. Bilinən güzəştdir: səbəb deyilməsə istifadəçi axını tamamilə dayanır (QD-015) |
| 5 | **Rate-limit prosesdaxili yaddaşdadır** | Redis yoxdur; çox instansiyalı yerləşdirmədə limit instansiya başına işləyir və server restartında sıfırlanır |
| 6 | **Baza diskdə şifrələnmir** | SQLite faylı açıq mətndir — diskə fiziki giriş bütün dataya girişdir. İstehsala çıxmadan əvvəl Postgres + disk şifrələməsi tələb olunur |

### S25. Layihənin ən zəif yeri hansıdır — bir cümlə ilə?

**İntizamdan asılılıq.** Məxfilik mühərriki güclüdür, amma o, hər yeni servis
funksiyasının `visibilityWhere(viewer)` çağırmasına söykənir — Prisma
middleware kimi «görünməz» qoruma qəsdən seçilməyib, çünki görünməz qayda
oxunan koddan çıxır və review-da yoxlanıla bilmir (QD-006). Bunun əvəzi üç
qatdır: `CLAUDE.md` §5-dəki qayda, `tests/integration/` altındakı 13 baza testi
və Blok 12A-nın `grep` auditi. Yeni komanda üzvü qaydanı bilmirsə **kompilyator
onu dayandırmayacaq** — test dayandıracaq, amma yalnız örtülən yollarda. Bunu
tam bağlayan tək yol Postgres + sətir səviyyəsində təhlükəsizlikdir (RLS) və o,
SQLite-da mövcud deyil.

---

## Əlavə — «bilmirəm» əvəzinə deyiləcək cümlələr

| Vəziyyət | De |
|---|---|
| Sual sənəddədir, amma detalı unutmusan | «Bu, `DECISIONS.md` QD-0XX-dədir — alternativlərlə birlikdə yazılıb, açım?» |
| Rəqəmi dəqiq xatırlamırsan | «Dəqiq rəqəm `docs/METRICS.md`-dədir və ölçmə əmri də orada yazılıb — indi işlədə bilərəm» |
| Funksiya yoxdur | «Yoxdur. Səbəb: [texniki maneə / əhatə qərarı]. Sənədləşdirilib — `GW-COMPARISON.md` §2» |
| Qərarla razılaşmırlar | «Alternativi ölçdük və nəticəni yazdıq: [alternativ] belə sınırdı. Başqa şərtlərdə seçim də başqa olardı» |
| Sual əhatədən kənardır | «Bu, sinif platformasının əhatəsində deyil — spesifikasiya §1. Universitetin institusional funksiyasıdır» |
