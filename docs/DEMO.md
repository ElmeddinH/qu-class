# QU CLASS — 8 dəqiqəlik canlı demo ssenarisi

> Bu sənəd **müdafiə otağı üçün icra planıdır**: hansı hesabla, hansı ardıcıllıqla,
> nə göstərilir və **nə deyilir**. Danışıq mətni azərbaycancadır və birbaşa
> oxuna bilər.
>
> Sual-cavab hissəsi ayrı fayldadır — [`DEFENSE-QA.md`](DEFENSE-QA.md).
> Rəqəmlərin mənbəyi — [`METRICS.md`](METRICS.md).

**Ümumi büdcə: 8:00.** Vaxt sütunu **kumulyativdir** — hər addımın sonunda saat
o rəqəmi göstərməlidir. Geridə qalsan §7-dəki «kəsilə bilən» siyahıya bax.

| Vaxt | Səth | Nə göstərilir |
|---|---|---|
| 0:00–0:40 | `/` (anonim) | Problem və ictimai səth |
| 0:40–1:20 | `/class/maliyye-2022/feed` | Sinif lenti — giriş etmiş üzv |
| **1:20–3:30** | **🔒 ZİRVƏ 1 — məxfilik mühərriki** | Eyni URL, iki hesab · «Preview as» · `PRIVATE` |
| **3:30–5:00** | **🔒 ZİRVƏ 2 — «İndi haradayıq?»** | k-anonimlik · razılığın geri alınması |
| 5:00–5:45 | `/timeline` + `/yearbook` | Üç mərhələnin nəticəsi |
| 5:45–6:35 | `/admin` + `/admin/audit` | Moderasiya və dəyişdirilə bilməyən iz |
| 6:35–7:20 | `/docs` + terminal | Swagger · 1844 test |
| 7:20–8:00 | Bağlanış | Bilinən məhdudiyyətlər — dürüst |

---

## 0. ƏVVƏLCƏDƏN HAZIRLA (demodan 10 dəqiqə əvvəl)

### 0.1 Server — **istehsal rejimi**, dev rejimi DEYİL

```bash
cd qu-class
npx prisma db seed        # bazanı təmiz seed vəziyyətinə qaytar
npm run build             # ~1–2 dəqiqə — DEMODAN ƏVVƏL BİTMƏLİDİR
npm start                 # http://localhost:3000
```

🔴 **`npm run dev` ilə demo etmə.** Dev serverdə hər səhifə ilk açılışda
kompilyasiya olunur (2–5 saniyə boş ekran). `npm start` build-i hazır verir.
`.env`-də **`AUTH_TRUST_HOST=true`** olmalıdır, yoxsa `next start` rejimində
giriş `UntrustedHost` xətası verir.

### 0.2 İki brauzer pəncərəsi — hər ikisi ƏVVƏLCƏDƏN GİRİŞ ETMİŞ

Şifrə hər ikisi üçün: **`Test1234!`**

| Pəncərə | Hesab | Rolu | Açıq tab-lar (soldan sağa) |
|---|---|---|---|
| **A — normal pəncərə** | `alumni@qu.edu.az` | `USER`, `maliyye-2022` sinfinin **üzvü**, ALUMNI | 1. `/class/maliyye-2022/feed`<br>2. `/u/usr-125`<br>3. `/class/maliyye-2022/map`<br>4. `/me/career`<br>5. `/class/maliyye-2022/timeline`<br>6. `/class/maliyye-2022/yearbook` |
| **B — anonim (incognito) pəncərə** | `admin@qu.edu.az` | `UNIVERSITY_ADMIN`, **başqa sinifdə** (`informasiya-tehlukesizliyi-2027`) | 1. `/class/maliyye-2022/feed`<br>2. `/u/usr-125`<br>3. `/admin`<br>4. `/admin/audit`<br>5. `/docs` |

🔴 **İki hesab MÜTLƏQ ayrı brauzer profilində olmalıdır** (normal + incognito).
Eyni profildə ikinci giriş birincini çıxarır — demo ortasında yenidən giriş
etməli olarsan zirvə nöqtəsi dağılır.

⚠️ **Hər iki pəncərədə kuki bannerini əvvəlcədən qəbul et** — banner ekranın
altını örtür və ekran görüntüsündə məzmunu kəsir.

### 0.3 Terminal — hazır, amma boş

Ayrı terminal pəncərəsi, `qu-class` qovluğunda, **əmr yazılmış amma
işlədilməmiş** (Enter-ə basmağa hazır):

```bash
npm run test
```

### 0.4 Seed vəziyyətinin yoxlanışı — demo bu rəqəmlərə söykənir

Demodan əvvəl bu üç rəqəmi təsdiqlə. Uyğun gəlmirsə `npx prisma db seed` işlət.

| Yoxlama | Gözlənilən |
|---|---|
| `/class/maliyye-2022/feed` — **A pəncərəsi** | 27 paylaşım (ilk səhifə 20) |
| `/class/maliyye-2022/feed` — **B pəncərəsi** | **13** paylaşım, «Sinif» nişanı **yoxdur** |
| `/class/maliyye-2022/map` — razılıq bloku | «19 üzvdən 19-u razılıq verib», **14 nəfər** bölgüdə |

### 0.5 Demo boyu **YALNIZ BİR** data dəyişikliyi var

`/me/career`-də bir açarın söndürülməsi (§4, addım 4.3) və **dərhal geri
qaytarılması** (addım 4.5). Başqa heç nə yazılmır. Yəni demo əsnasında seed
sıfırlamağa ehtiyac **yoxdur**; demo bitəndə baza başladığı vəziyyətdədir.

### 0.6 Ehtiyat plan

- Layihə **oflayn işləyir** — Wi-Fi olmasa da hər şey açılır (SQLite, Swagger
  aktivləri lokaldır). Yeganə xarici şey — avatar şəkilləri (DiceBear); onlar
  yüklənməsə düzülüş **dəyişmir**.
- Proyektor 1440×900-dan kiçikdirsə brauzer zoom-unu **90%** et; KUDS düzülüşü
  1440 üçündür.
- Hər şey sınarsa: `docs/screenshots/` altında 17 ekranın hamısı hazırdır.

---

## 1. AÇILIŞ — 0:00 → 0:40 (40 san)

**Ekran:** B pəncərəsində yeni tab, `http://localhost:3000/` — **giriş etmədən**.
(Ən sadə yol: incognito-da yeni tab açıb `/` yazmaq; admin sessiyası qalır.)

> «Bu — QU CLASS. Qarabağ Universitetinin sinif platforması.
>
> Problem sadədir: birinci kurs tələbəsi sinif yoldaşlarını tanımır, dörd il
> sonra isə əksi olur — məzuniyyət günü qrup çatı sönür və sinif bir-birini
> itirir. Universitet portalları **prosesi** idarə edir: qeydiyyat, qiymət,
> cədvəl. **Münasibəti** yox.
>
> Bu, açılış səhifəsidir və hazırda mən **sistemə daxil olmamışam**. Diqqət
> edin: burada bir dənə də sinif paylaşımı yoxdur. Səhifədəki xəbərlər və
> hekayələr **bazadan gəlir**, amma anonim ziyarətçi üçün süzgəcdən keçir —
> yalnız `PUBLIC` səviyyəli məzmun. Bu, ayrıca yazılmış «ictimai səhifə» deyil;
> eyni sorğu, fərqli ziyarətçi.»

**Vurğu:** bu cümlə bütün demonun tezisidir — *fərqi məzmun deyil, ziyarətçi
yaradır*.

---

## 2. GİRİŞ VƏ SİNİF LENTİ — 0:40 → 1:20 (40 san)

**Ekran:** A pəncərəsi, tab 1 — `/class/maliyye-2022/feed`.

> «İndi mən Elvin Məmmədovam — Maliyyə 2018 qəbulunun məzunu. 2022-də
> məzun olmuşam, amma sinif səhifəm **bağlanmayıb**.
>
> Platformanın əsas fikri budur: `INCOMING → STUDENT → ALUMNI` — üç mərhələ,
> **eyni səhifə**. Qəbul günündən məzuniyyətdən sonrakı illərə qədər açıq
> qalır; yalnız məzmun və widget sırası dəyişir.
>
> Bu, sinif lentidir — 12 kateqoriya, reaksiya, şərh. Hər paylaşımın sağ
> üstündə **görünürlük nişanı** var: «Hamı», «Universitet», «Sinif».
> Mən bu sinfin üzvüyəm, ona görə **27 paylaşım** görürəm.»

**Hərəkət:** bir «Sinif» nişanlı paylaşımı barmaqla göstər (məsələn *«Təcrübə
müsahibəsindən keçdim…»*) — növbəti addımda məhz onu axtaracağıq.

---

## 3. 🔒 ZİRVƏ 1 — MƏXFİLİK MÜHƏRRİKİ — 1:20 → 3:30 (2 dəq 10 san)

> Demonun ən vacib hissəsi. Üç hərəkət, hər biri əvvəlkini gücləndirir.
> **Tələsmə** — komissiya bu üç dəqiqəni xatırlayacaq.

### 3.1 Eyni URL, iki hesab — 1:20 → 2:05 (45 san)

**Hərəkət:** Alt+Tab ilə **B pəncərəsinə** keç. Eyni URL açıqdır:
`/class/maliyye-2022/feed`.

> «İndi **eyni ünvandayam** — hərfi hərfinə eyni URL. Amma bu pəncərədə
> universitet **admini** kimi daxil olmuşam. Ən yüksək sistem rolu.
>
> Baxın: lent **13 paylaşımda bitir**. Və siyahıda bir dənə də «Sinif» nişanı
> yoxdur — yalnız «Hamı» və «Universitet».
>
> Yəni universitet admini bu sinfin daxili söhbətini **oxumur**. Bu, UI-da
> gizlətmə deyil: `visibilityWhere()` funksiyası Prisma sorğusunun `where`
> şərtinə birləşir və `CLASS` səviyyəli sətirlər **bazadan heç vaxt
> gəlmir**. Kodda admin üçün ayrıca «hər şeyi gör» şaxəsi **yoxdur** —
> `src/lib/visibility.ts`-ə baxsanız görəcəksiniz.»

**Hərəkət:** iki pəncərə arasında Alt+Tab ilə **bir dəfə də** get-gəl et —
fərq gözlə görünsün.

### 3.2 «Preview as» — 2:05 → 2:55 (50 san)

**Hərəkət:** A pəncərəsinə qayıt, tab 2 — `/u/usr-125` (Elvinin öz profili).

> «Bu, mənim profilimdir. Sual: mən paylaşdığımı **kimin necə gördüyünü**
> haradan bilim? Adətən bunu bilmirsən — «ümid edirsən».
>
> Burada yuxarıda «Başqasının gözü ilə bax» seçimi var. Üç rejim.»

**Hərəkət:** üç rejimi **ardıcıl** kliklə, hər birində 5–6 saniyə dayan:

| Rejim | Ekranda nə olur | Nə deyilir |
|---|---|---|
| **Anonim ziyarətçi** | Səhifə demək olar boşalır — yalnız gələcək planlar və ölkə qalır | «Kənar ziyarətçi bunu görür. Şəhər yoxdur, şirkət yoxdur, bio yoxdur.» |
| **Universitet istifadəçisi** | Şəhər, şirkət, vəzifə, bacarıqlar, maraqlar qayıdır; bio və doğma şəhər hələ də yoxdur | «Başqa sinifdən QU istifadəçisi. Bir qat açıldı.» |
| **Sinif yoldaşı** | Bio, doğma şəhər, dillər, təhsil də görünür | «Sinif yoldaşım. Amma diqqət edin — telefon **hələ də yoxdur**.» |

> «Ən vacibi: bu «önizləmə» ayrıca yazılmış saxta ekran **deyil**. Kod sintetik
> bir `Viewer` obyekti qurur və **eyni `getProfile()` funksiyasını** çağırır.
> Yəni ekranda gördüyünüz şey əsl kod yolundan keçir —
> `src/features/profile/preview.ts`.»

### 3.3 `PRIVATE` — admin də görmür — 2:55 → 3:30 (35 san)

**Hərəkət:** önizləmədən çıx (normal görünüş). Telefon və şəxsi e-poçtu göstər —
onlar **sahibinə** görünür.

> «Bu iki sahə — telefon və şəxsi e-poçt — `PRIVATE` səviyyədədir. Qeydiyyat
> anında **avtomatik** belə yaranır; istifadəçi heç nə etməsə də qorunur.»

**Hərəkət:** B pəncərəsinə keç, tab 2 — **eyni profil**, `/u/usr-125`, admin gözü ilə.

> «Eyni profil, universitet admini. Telefon **yoxdur**. Şəxsi e-poçt **yoxdur**.
> Hobbilər **yoxdur** — çünki bu istifadəçi onları da `PRIVATE` seçib.
>
> Və bu, «düymə deaktivdir» hekayəsi deyil — sahə **cavab obyektində
> ümumiyyətlə mövcud deyil**. `redactProfile()` onu obyektə köçürmür.
>
> Qayda birdir: **`PRIVATE` = yalnız sahibi.** Admin istisna deyil. Yeganə
> istisna moderasiya baxışıdır — və o, audit jurnalına yazılmadan aça bilmir.
> Bunu bir azdan göstərəcəyəm.»

---

## 4. 🔒 ZİRVƏ 2 — «İNDİ HARADAYIQ?» VƏ k-ANONİMLİK — 3:30 → 5:00 (1 dəq 30 san)

### 4.1 Panel — 3:30 → 4:05 (35 san)

**Hərəkət:** A pəncərəsi, tab 3 — `/class/maliyye-2022/map`.

> «Bu, məzun sinfin ən həssas səthidir: kim harada işləyir. Səkkiz görünüş —
> dünya xəritəsi, Azərbaycan, şəhərlər, ölkələr, şirkətlər, sənayelər,
> vəzifələr, təhsil.
>
> Üç qərar burada sənədləşdirilib və üçü də «etmədik» qərarıdır:
>
> **Birincisi — maaş göstəricisi yoxdur.** Nə sxemdə sütun, nə API-də sahə.
> Səbəb arifmetikadır: 19 nəfərlik sinifdə orta maaşı bilən bir nəfər özünü
> çıxarıb qalanları hesablayır. k-anonimlik bunu **həll etmir**, ona görə sahə
> ümumiyyətlə yoxdur.
>
> **İkincisi — xəritədə koordinat bazadan gəlmir.** `CareerEntry`-də
> `latitude`/`longitude` sütunu **yoxdur**. Pin şəhər mərkəzinə qoyulur —
> eyni şəhərdəki iki nəfər eyni nöqtədə birləşir.»

**Hərəkət:** «Şəhərlər» tabına keç.

> «**Üçüncüsü — k-anonimlik.** Baxın: Bakı 9, Xankəndi 4. Və bir sətir də var:
> «Açıqlanmayan — 1 nəfər». Bu bir nəfər İstanbuldadır. Üç nəfərdən kiçik
> olduğu üçün şəhər xanası açılmır — sətir **silinmir**, ölkə səviyyəsinə
> yığılır; ölkə də kiçik olduğu üçün «Açıqlanmayan» olur.
>
> Hədd `MIN_BUCKET_SIZE = 3`. Niyə 3? İki nəfərlik xanada hər biri o birini
> onsuz da tanıyır — qoruma yoxdur. Beş isə 19 nəfərlik sinifdə **hər xananı**
> gizlədir və göstəriləcək bir şey qalmır.»

### 4.2 Razılıq şəffaflığı — 4:05 → 4:25 (20 san)

**Hərəkət:** panelin altındakı mavi razılıq blokunu göstər.

> «Panelin altında yazılıb: **19 üzvdən 19-u razılıq verib, onlardan 14 nəfərin
> cari iş qeydi var və bölgüdə sayılır.** Və: «Sənin məlumatın bu statistikada
> **iştirak edir**».
>
> Diqqət: görünürlük səviyyəsi statistikaya girmək üçün **kifayət deyil**.
> «Sinif yoldaşım görsün» ilə «rəqəm kimi sayılım» fərqli məqsədlərdir, ona görə
> ayrıca razılıq açarı var — `includeInStats`.
>
> İndi onu geri alacağam.»

### 4.3 🔴 CANLI SÜBUT — razılığı söndür — 4:25 → 4:45 (20 san)

**Hərəkət:** tab 4 — `/me/career` → cari iş qeydinin **«Redaktə et»** düyməsi →
dialoqda **«Statistikaya daxil olsun»** açarını **söndür** → **Yadda saxla**.

**Hərəkət:** tab 3-ə qayıt, səhifəni **yenilə** (F5).

> «Bir açar. Baxın nə dəyişdi.»

| Göstərici | Əvvəl | Sonra |
|---|---|---|
| Razılıq verən | 19 | **18** |
| Bölgüdə sayılan | 14 | **13** |
| Xankəndi | 4 | **3** |
| Azərbaycan | 13 | **12** |
| Mənim iştirakım | «iştirak edir» | «**iştirak etmir**» |

> «Rəqəm dəyişdi — çünki mən statistikadan çıxdım. Və Xankəndi indi düz həddin
> üstündədir: **3**. Daha bir nəfər çıxsa bu xana da bağlanacaq və sətir ölkə
> səviyyəsinə yığılacaq. Data itmir — **kobudlaşır**.
>
> Bu, GDPR-in «razılığı geri al» prinsipinin işləyən formasıdır: geri alma
> yolu istifadəçiyə **görünən** yerdədir və nəticəsi **dərhal** görünür.»

### 4.4 Bağlanış cümləsi — 4:45 → 4:55 (10 san)

> «Bütün bölgülər **tək sətir çoxluğu üzərində, tək keçiddə** hesablanır və hər
> ölçüdə cəm eynidir. Ona görə iki qrafiki bir-birindən çıxıb qalıq — deməli
> fərd — tapmaq mümkün deyil.»

### 4.5 🔴 GERİ QAYTAR — 4:55 → 5:00 (5 san)

**Hərəkət:** tab 4 — `/me/career` → eyni dialoq → açarı **yenidən yandır** →
**Yadda saxla**.

> «Və geri qaytarıram.»

⚠️ **Bu addımı ATLAMA.** Baza demonun əvvəlindəki vəziyyətə qayıdır və növbəti
demo üçün seed sıfırlamağa ehtiyac qalmır.

---

## 5. XRONOLOGİYA VƏ İLLİK — 5:00 → 5:45 (45 san)

**Hərəkət:** A pəncərəsi, tab 5 — `/class/maliyye-2022/timeline`.

> «Sinif lenti xronologiyaya çevrilir. Burada dörd mənbə birləşir: paylaşımlar,
> nailiyyətlər, tədbirlər və sistem mərhələləri — qəbul, məzuniyyət. Akademik
> ilə görə filtrlənir.
>
> Texniki detal: bu, sorğu zamanı birləşdirilmiş üç cədvəl deyil — ayrıca
> `TimelineEntry` cədvəlidir. Səbəb: üç cədvəli JS-də birləşdirsək **səhifələmə
> sınır**. Və görünürlük mənbədən **kopyalanır** — xronologiya qeydi mənbəyindən
> **daha açıq ola bilməz**.»

**Hərəkət:** tab 6 — `/class/maliyye-2022/yearbook`.

> «Xronologiyanın sonu isə rəqəmsal illikdir. Bu, redaksiya məqaləsi deyil —
> **üzvün özü** hansı xatirənin illiyə düşəcəyini seçir. Səhifə çap üçün
> hazırlanıb: `Ctrl+P` deyəndə naviqasiya itir, hər bölmə yeni səhifədən
> başlayır.»

*(Vaxt azdırsa `Ctrl+P` göstərmə — sadəcə de.)*

---

## 6. İDARƏ PANELİ VƏ AUDİT — 5:45 → 6:35 (50 san)

**Hərəkət:** B pəncərəsi, tab 3 — `/admin`.

> «İdarə paneli: analitika, şikayət növbəsi, rol idarəsi, CSV ilə SIS idxalı,
> məzmun sistemi. Səkkiz alt səhifə.
>
> Amma yadınızdadır — admin sinif məzmununu **oxumur**. Bəs şikayət edilmiş
> paylaşımı necə yoxlayır?»

**Hərəkət:** tab 4 — `/admin/audit`.

> «Belə. Moderasiya baxışı ayrı yoldur və hər açılış bura yazılır. Üç qayda:
>
> **Bir** — jurnal **əlavə-yalnızdır**. Servis qatında silmə funksiyası
> **ixrac olunmur**, UI-da düymə yoxdur, API-də `DELETE` route-u **mövcud
> deyil**. Üç qat, üçü də testlə bərkidilib.
>
> **İki** — iz məzmunla **eyni transaksiyada** yazılır. Ayrı yazılsaydı
> «əməliyyat oldu, iz yoxdur» halı mümkün olardı.
>
> **Üç** — metadata **ağ siyahıdır**. Şikayət edilmiş paylaşımın mətni jurnala
> düşmür. Əks halda məxfi məzmun moderasiya qapısından **yan keçib** jurnalda
> peyda olardı — jurnal isə adminə göstərilir.»

---

## 7. MÖHKƏMLİK — 6:35 → 7:20 (45 san)

**Hərəkət:** B pəncərəsi, tab 5 — `/docs` (Swagger UI).

> «Ayrı backend serveri **yoxdur**. Next.js həm render, həm API qatıdır. Amma
> xarici inteqrasiya üçün 36 endpoint-lik REST səthi var və sənədi buradadır —
> **oflayn**, CDN olmadan.
>
> Sənəd əl ilə yazılmayıb: Zod sxemlərindən **törəyir**. Yəni köhnələ bilmir.
> Və bu endpoint-lər **sıfır yeni baza sorğusu** yazır — eyni servis qatını
> çağırırlar, yəni eyni məxfilik mühərrikindən keçirlər.»

**Hərəkət:** terminala keç, hazır duran əmrə **Enter**: `npm run test`.

> «Test işləyərkən deyim: **1844 vahid və inteqrasiya testi, 68 faylda.**
> Üstəgəl 220 Playwright testi — onlar istehsal build-inə qarşı işləyir.
>
> Ən kritik olanı `tests/integration/visibility.db.test.ts`-dir: **real bazaya
> qarşı** yoxlayır ki, sətirlər həqiqətən gəlmir. Çünki «UI-da göstərmirik»
> ilə «sorğu onu gətirmir» eyni şey deyil.»

**Hərəkət:** testlər bitəndə yaşıl nəticəni göstər (≈80 saniyə).

> «Bir də: Lighthouse desktop **100/100/100/100** — beş səhifədə. WCAG 2.2 AA
> qapısı bağlıdır, `axe` ilə 12 səhifə × 2 vəziyyət yoxlanılıb.»

---

## 8. BAĞLANIŞ — 7:20 → 8:00 (40 san)

**Ekran:** README-nin **«Bilinən məhdudiyyətlər»** bölməsi (və ya sadəcə danış).

> «Bitirməzdən əvvəl **işləməyənləri** deyim — çünki onları gizlətmək
> layihənin öz məntiqinə ziddir.
>
> **Parol sıfırlama axını yoxdur.** E-poçt xidməti quraşdırılmayıb; tokeni
> çatdıra bilməyən axın işləməyən düymədir. Qərar sənədləşdirilib.
>
> **Sessiya serverdən dərhal ləğv edilə bilmir** — JWT strategiyasının qiyməti
> budur. Açıq yazılıb.
>
> **İki GW funksiyası yazılmadı:** cohort səviyyəsində təqvim abunəsi və
> sosial paylaşma düymələri. Səbəb texniki maneə deyil — həmin blokun
> tapşırığına salınmamışdı.
>
> Yekun: 17 modul, 51 səhifə, 28 data modeli, 36 endpoint, 1844 test.
> Amma layihənin nüvəsi say deyil. Nüvə budur: **insanlar öz həyatlarını
> yalnız kimin görəcəyini dəqiq bildikdə paylaşırlar.** Ona görə görünürlük
> burada sonradan əlavə olunmuş filtr deyil — **hər sorğunun keçdiyi qapıdır**.
>
> Suallarınızı gözləyirəm.»

---

## 9. 🔴 NƏYİ GÖSTƏRMƏ

Bunlar **qadağan siyahısıdır** — hər biri ya vaxt yeyir, ya sual doğurur.

### 9.1 Yavaş və ya sınıq gedən yerlər

| Nə | Niyə göstərmə |
|---|---|
| **`npm run dev` ilə demo** | Hər səhifə ilk açılışda kompilyasiya olunur — 2–5 saniyə boş ekran. `npm start` işlət |
| **`/home` yönləndirməsi** | Yönləndirmə ~600 ms alır. Birbaşa `/class/maliyye-2022/...` yaz |
| **`npm run build` demo əsnasında** | 1–2 dəqiqə. Əvvəlcədən bitir |
| **`npm run test:e2e`** | Brauzer qaldırır, dəqiqələr çəkir. Yalnız `npm run test` göstər |
| **Prisma Studio** | Açılması yavaşdır və **xam bazanı** göstərir — məxfilik mühərrikinin **yan keçildiyi** yeganə ekran. Demonun tezisini zəiflədir |
| **Mobil `/directory` kuki banneri** | Banner şrift yüklənəndə bir az sıçrayır (CLS 0.035). Ölçülüb, «yaxşı» zolaqdadır, amma ekranda pis görünür |

### 9.2 Bilinən məhdudiyyətlər — soruşulmasa AÇMA

Bunlar sənədləşdirilib və §8-də **öz sözlərinlə** deyilir. Amma **ekranda
göstərmə** — işləməyən şeyi kliklə nümayiş etdirmək demo deyil, öz-özünü
sabotajdır.

| Nə | Soruşulsa cavab |
|---|---|
| «Şifrəni unutdum» axtarışı `/login`-də | Yoxdur — QD-001, e-poçt kanalı yoxdur |
| Tədbirdə paylaşma düymələri | Yoxdur — GW-COMPARISON §2, #5 |
| `/events` səhifəsində populyarlığa görə sıralama | Yoxdur — yalnız tarixə görə (§2, #7) |
| `/admin/stats`-də cohort filtri | Blok 12B borcu |
| Toplu moderasiya | Blok 12B borcu |

### 9.3 Deməmək lazım olan cümlələr

- ❌ «Vaxt çatmadı» → ✅ «Həmin blokun tapşırığına salınmamışdı» (dürüst və dəqiq).
- ❌ «SQLite-ı sadəlik üçün seçdik» → ✅ «Keçidin ucuz olduğunu ölçdük: `docker-compose.yml`, dörd addım, tətbiq kodunda sıfır dəyişiklik».
- ❌ «Admin hər şeyi görür» → ✅ «Admin `PRIVATE` və başqa sinfin `CLASS` məzmununu **görmür**».

---

## 10. Vaxt daralsa — kəsilmə sırası

Kəsmə **yuxarıdan aşağı**. Zirvə nöqtələrinə (§3, §4) **toxunma**.

| Sıra | Kəsilən | Qazanc |
|---|---|---|
| 1 | §5 illik (`/yearbook`) | 20 san |
| 2 | §7-də testi **işlətmə**, sadəcə rəqəmi de | 40 san |
| 3 | §6 audit — `/admin`-i atla, birbaşa `/admin/audit` | 25 san |
| 4 | §3.2-də «Universitet istifadəçisi» rejimini atla (anonim → sinif yoldaşı) | 15 san |
| 5 | §1 açılışı 20 saniyəyə qısalt | 20 san |

**Heç vaxt kəsilməyən:** §3.1 (iki hesab), §3.3 (`PRIVATE`), §4.3 (canlı toggle),
§8 (dürüst məhdudiyyətlər).
