# Blok 12C — ƏLÇATANLIQ · PERFORMANS · RESPONSIVE · VƏZİYYƏTLƏR

> Yeni funksiya YOXDUR. Bu blok yalnız **ölçdü, tapdı, düzəltdi və sübut etdi**.
> Bütün rəqəmlər `next start` ilə qaldırılmış **istehsal build-inə** qarşı,
> `http://127.0.0.1:3100` ünvanında alınıb.

Tarix: 2026-07-31 · Baza: Blok 12B-nin sonu (29 commit)

---

## 0. Xülasə

| | Əvvəl | Sonra |
| --- | ---: | ---: |
| axe `serious`/`critical` (12 səhifə × 2 vəziyyət) | **141 node** | **0** |
| Lighthouse — desktop, 5 səhifə (ən aşağı bal) | 100 | **100** |
| Lighthouse — mobil, 5 səhifə (ən aşağı bal) | 86 | **87** |
| Üfüqi sürüşmə (5 breakpoint × 10 səhifə) | **2 səhifə** | **0** |
| Toxunma hədəfi < 24px (WCAG 2.2 AA) | **7 element sinfi** | **0** |
| vitest | 1 495 | **1 510** |
| playwright | 148 | **212** |

```
npx tsc --noEmit   ✓ təmiz
npm run lint       ✓ təmiz (0 error, 0 warning)
npm run build      ✓ təmiz
vitest             1510 passed (61 fayl)
playwright          212 passed (4.1 dəq)
```

**Yeni asılılıq:** yalnız `@axe-core/playwright@4.12.1` (devDependency, tapşırıqda
icazə verilib). Lighthouse **quraşdırılmayıb** — `npx lighthouse@12` ilə işlədilir.

**Yeni tələ:** T44 (aşağıda §1.4).

---

## 1. A bəndi — ƏLÇATANLIQ (KUDS §21, WCAG 2.2 AA)

### 1.1 Avtomatik audit — `tests/e2e/a11y.spec.ts`

12 səhifə × 2 vəziyyət (anonim + giriş etmiş) = **24 skan**.
Teqlər: `wcag2a`…`wcag22aa`. `best-practice` QOŞULMAYIB (standartın tələbi
deyil). Qapı: `serious` və ya `critical` = qırmızı.

⚠️ Anonim vəziyyətdə qorunan yollar `/login`-ə yönləndirilir — bu, səhv deyil,
anonim istifadəçinin REAL gördüyü ekrandır və skan onu ölçür (`finalPath`
nəticə JSON-una yazılır).

#### ƏVVƏL — 24 skanın 15-i qırmızı, 141 `serious` node

| Səhifə | anonim | giriş etmiş |
| --- | ---: | ---: |
| `/` | 0 | 0 |
| `/faq` | 7 | 7 |
| `/khankendi` | 5 | 5 |
| `/login` | 1 | 0 |
| `/register` | 0 | 0 |
| `/home` | 1 | 0 |
| `/class/[slug]` | 1 | 0 |
| `/class/[slug]/directory` | 1 | **96** |
| `/class/[slug]/timeline` | 1 | 12 |
| `/class/[slug]/map` | 1 | 1 |
| `/me/privacy` | 1 | 0 |
| `/admin` | 1 | 0 |
| **cəmi** | **20** | **121** |

#### Beş qayda, beş səbəb — hamısı düzəldilib

| axe qaydası | node | Səbəb | Düzəliş |
| --- | ---: | --- | --- |
| `dlitem` | 72 | `DirectoryCard`-da `dt`/`dd` **iki** `div` qatının altındaydı (`dl > div > div > dt`). HTML qruplaşdırma qaydası bir qata icazə verir. | Sütun düzülüşü `dd`-nin İÇİNƏ (`span`) köçürüldü — görünüş eynidir |
| `color-contrast` | 27 | `bg-muted` (#E2E8F0) üzərində `text-text-secondary` = **3.86:1**; `ku-cream/40` üzərində **4.49:1**; `ku-blue/40` üzərində eyni problem | Çip passiv tonu `bg-surface` + sərhəd (**4.76:1**, həm də KUDS §11 «Secondary = outline»); tint fonlarda `text-text-primary` (CLAUDE.md-nin öz qaydası) |
| `dlitem`-lə birlikdə `definition-list` | 24 | Eyni struktur pozuntusunun ikinci üzü | Eyni düzəliş |
| `link-in-text-block` | 16 | Cümlə içindəki link ətrafdakı mətndən YALNIZ rənglə seçilirdi (ku-green ↔ text-secondary = **1.09:1**); `hover:underline` kursoru olmayan istifadəçiyə çatmır | Yeni `.kuds-prose-link` sinfi — xətt HƏMİŞƏ var |
| `nested-interactive` | 2 | Xəritə SVG-si `role="img"` idi; ARIA-da `img` rolunun uşaqları TƏQDİMATDIR, yəni `role="button" tabIndex={0}` markerlər əlçatanlıq ağacından düşürdü (fokus «boşluğa» gedirdi) | `role="group"` — interaktiv övladlara icazə verir, etiket qalır |

#### SONRA — 24 skanın 24-ü yaşıl

Bütün təsir səviyyələrində (`minor`, `moderate`, `serious`, `critical`) **sıfır**
pozuntu. Nəticələr `test-results/axe/*.json`-a yazılır (gitignore-dadır).

### 1.2 Əl ilə yoxlanacaqlar — AVTOMATLAŞDIRILDI

Tapşırıqdakı 11 bənd `tests/e2e/a11y-keyboard.spec.ts`-də **14 test** kimi
yazıldı (əl ilə yoxlama təkrarlana bilmir — test təkrarlanır):

| Yoxlama | Nəticə |
| --- | --- |
| Skip-link: `sr-only` → fokusda görünür → `#main`-ə aparır | ✓ |
| `:focus-visible` KU Green halqa REAL render olunur | ✓ (⚠️ token HSL-dən çevrildiyi üçün `rgb(67,117,107)` — 1 vahid yuvarlaqlaşma; test dözümlü müqayisə edir) |
| Fokus tələsi yoxdur (60 Tab, ilişmə yoxdur, 10+ dayanacaq) | ✓ |
| Modal: fokus tələsi + Esc + fokus tetikləyiciyə qayıdır | 🔴 **SINIQ İDİ → düzəldildi (T44)** |
| Sheet (mobil naviqasiya): eyni üç şərt | ✓ (`SheetTrigger` işlədilir) |
| T23 — `sr-only` radio: label-a klik seçimi dəyişir | ✓ |
| T29 — Radix Select `combobox` rolu + klaviatura | ✓ (⚠️ açıq vəziyyətdə `getByRole` tetikləyicini tapmır — kənar məzmun `aria-hidden` olur; test CSS selektoruna keçir) |
| Hər `<img>` `alt` daşıyır (4 səhifə) | ✓ |
| Form xətası `aria-describedby` ilə bağlı + mətnli | ✓ |
| Canlı bölgələr: toast qabı + oxunmamış bildiriş sayı | ✓ (bildiriş üçün **yeni** `aria-live` bölgəsi əlavə olundu) |
| `prefers-reduced-motion` → uzun keçid qalmır | ✓ |

### 1.3 Kontrast qaydaları — mənbə skanı ilə kilidləndi

`src/lib/kuds-contrast.test.ts` (3 vitest testi) hər `.tsx` faylının hər
**sətir-literalını** ayrıca yoxlayır:

- `ku-soft` / `ku-blue` / `ku-cream` üzərində ağ mətn → **yoxdur** ✓
- doldurulmuş `success` / `danger` / `warning` üzərində ağ mətn → **yoxdur** ✓
  (hamısı `-strong` variantındadır; `warning` fonunda həmişə tünd mətn)

🔴 Skan vahidi FAYL deyil, SƏTİR-LİTERALIDIR — çünki layihədə
`emergency ? "bg-danger-strong text-white" : "bg-ku-cream text-text-primary"`
kimi ternarlar var və fayl səviyyəsində axtarış onları yalançı pozuntu kimi
bildirərdi.

⚠️ Üçüncü test **skanerin özünü** yoxlayır (süni fikstürlər): «sıfır tapıntı»
həm «kod təmizdir», həm «skaner sınıqdır» deməkdir və ikincisi daha
təhlükəlidir, çünki YAŞIL görünür (Blok 11C-nin `git:audit --self-test` dərsi).

### 1.4 🔴 T44 — Radix `Dialog` fokusu YALNIZ `DialogTrigger` olanda qaytarır

**Tapıntı.** Radix-in `DialogContent`-i daxilində belədir:

```js
onCloseAutoFocus = (event) => { event.preventDefault();
                                context.triggerRef.current?.focus(); }
```

Yəni brauzerin ÖZ fokus bərpasını **ləğv edir** və fokusu `DialogTrigger`-ə
qaytarır. Layihədəki 7 modaldan **6-sı** `open`/`onOpenChange` ilə idarə olunur
(tetikləyici ya başqa komponentdədir, ya modal ⌘K qısayolu ilə açılır) →
`triggerRef` **null** → `preventDefault()` işləyir, `focus()` heç kimə getmir →
fokus `<body>`-yə düşür.

**İstifadəçi üçün nə demək idi:** Esc-dən sonra növbəti `Tab` səhifənin ƏN
BAŞINDAN başlayır. Klaviatura istifadəçisi hər modal bağlayanda yerini itirir
(WCAG 2.4.3 — Fokus sırası).

**Düzəliş.** `src/components/kuds/use-dialog-focus-restore.ts` — `focusin`
hadisəsini dinləyib modaldan KƏNARDA fokuslanan son elementi yadda saxlayır və
`onCloseAutoFocus`-da ona qaytarır. Yeddi çağırış nöqtəsinin hamısına qoşuldu.

⚠️ «`open` dəyişəndə `document.activeElement`-i yadda saxla» yanaşması İŞLƏMİR:
Radix fokusu modalın içinə öz effektində keçirir, valideynin effekti isə
UŞAQLARDAN SONRA işləyir — yəni oxunan dəyər artıq modalın içindədir.

---

## 2. B bəndi — PERFORMANS (KUDS §22)

### 2.1 Lighthouse — desktop preset (hədəf profili)

| Səhifə | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 100 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 0.3 s | 0.7 s | 0 ms | 0 |
| `/home` | 100 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 0.3 s | 0.8 s | 0 ms | 0 |
| `/class/[slug]/directory` | 100 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 0.3 s | 0.8 s | 0 ms | 0 |
| `/class/[slug]/map` | 100 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 0.3 s | 0.7 s | 0 ms | 0 |
| `/admin` | 100 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 0.3 s | 0.7 s | 0 ms | 0 |

**Hədəflərin hamısı keçildi** (Performance ≥ 90, Accessibility ≥ 95,
Best Practices ≥ 90, SEO ≥ 90).

### 2.2 Lighthouse — mobil preset (dürüstlük üçün ikinci ölçmə)

Mobil profil «yavaş 4G + 4× zəiflədilmiş CPU» simulyasiyasıdır. Hədəf rəqəmlər
ona görə qoyulmayıb, amma «100 aldıq» cümləsi kontekstsiz oxunmasın deyə
ölçülüb və saxlanılıb.

| Səhifə | əvvəl | sonra | LCP | Qeyd |
| --- | ---: | ---: | ---: | --- |
| `/` | 94 | 92 | 3.2 s | ölçmə səs-küyü (±2) |
| `/home` | 86 | **87 ❌** | 3.9 s | **yönləndirmə** — aşağıda |
| `/class/[slug]/directory` | 92 | **94** | 3.1 s | |
| `/class/[slug]/map` | 88 | **92** | 3.4 s | Recharts dinamikləşdi |
| `/admin` | 90 | 90 | 3.3 s | |

🔴 **`/home` niyə 90-dan aşağıdır — səbəb ölçülüb.** `/home` istifadəçinin əsas
sinfinə **yönləndirir** (məhsul qərarı, PLAN.md §4.2). Lighthouse bunu
`redirects` auditində **600 ms itki** kimi bildirir. Sübut: **eyni hədəf səhifə
birbaşa ölçüləndə (`/class/[slug]`) mobil Performance = 91**, yəni fərq
tamamilə yönləndirmədəndir. Yönləndirməni silmək məhsul davranışını dəyişmək
deməkdir və 12C-nin əhatəsindən kənardır.

Tam hesabatlar: `docs/lighthouse/` (desktop) və `docs/lighthouse/mobile/`.
Yenidən qurmaq: `npm run build && npm start`, sonra `npm run audit:lighthouse`
(mobil üçün `LH_PRESET=mobile LH_OUT_DIR=docs/lighthouse/mobile`).

⚠️ **Ölçmə tələsi (yol boyu tapıldı).** `next start` REBUILD-DƏN SONRA yenidən
qaldırılmalıdır. Köhnə server köhnə HTML-i verir, brauzer isə artıq mövcud
olmayan chunk hash-lərini istəyir → 400 → Lighthouse «Best Practices 96»
göstərir. Bu, kodun deyil, ölçmənin nasazlığıdır.

### 2.3 Düzəlişlər

| Düzəliş | Ölçü nə deyirdi | Nəticə |
| --- | --- | --- |
| **Recharts → `next/dynamic(ssr:false)`** — 4 qrafik, 4 `*.lazy.tsx` faylı + `ChartSkeleton` | `/class/[slug]/map` mobil profildə **83 KiB işlənməmiş JS**; `/admin` `bootup-time 1.7 s` | `/class/[slug]/map` **279 → 159 kB** (−43%), `/events/[id]` **275 → 162 kB** (−41%) |
| **`next/image` + `sizes`** — bütün şəkillərdə var idi; `StoryHeader` istisna idi | Profil banneri xam `<img>` idi | `/uploads/…` yolları artıq `next/image` (+`priority`, `sizes`); XARİCİ ünvanlar `<img>` qalır — `remotePatterns` hər hostu tələb edir, ağ siyahıya almaq isə optimizatoru açıq proksiyə çevirər |
| **Font** | — | Dəyişiklik LAZIM DEYİL: Poppins onsuz da `next/font/google`, `display: swap`, `subsets: latin + latin-ext`, çəkilər 400/500/600/700 — dördü də işlədilir (`font-medium` 101 fayl, `font-semibold` 42, `font-bold` 29) |
| **`force-dynamic` (T5)** | — | Dəyişiklik LAZIM DEYİL: 25 auth səhifəsinin hamısında artıq var |

#### Ən ağır 5 route (düzəlişdən sonra)

| Route | First Load JS | Səbəb |
| --- | ---: | --- |
| `/class/[slug]/feed` | 253 kB | Sonsuz sürüşmə + TanStack Query + kompozitor + media yükləyici + şərh ağacı — səhifənin özü ən interaktiv səthdir |
| `/class/[slug]/memories` | 232 kB | Xatirə kompozitoru (media yükləyici + 8 növ formu) |
| `/class/[slug]/events` | 226 kB | Tədbir kompozitoru + təqvim (`react-day-picker`) |
| `/me/career` | 215 kB | İki dialoq forması (karyera + təhsil) + RHF/Zod resolver |
| `/events/[id]/manage` | 202 kB | İştirakçı cədvəli + toplu bildiriş + CSV eksportu |

Beşinin də ağırlığı **forma və redaktor** kodundandır, kitabxana təkrarından
deyil. `/class/[slug]/map` (əvvəl 1-ci yerdə, 279 kB) və `/events/[id]`
(2-ci, 275 kB) siyahını Recharts ayrılmasından sonra tərk etdi.

### 2.4 N+1 sorğular — `npm run audit:queries`

Ölçü üsulu: `src/lib/db.ts` sinqltonu QABAQLANIR (skript öz klientini
`globalThis.prisma`-ya qoyub servisləri sonra yükləyir) və `prisma:query`
hadisələri sayılır. Tək rəqəm mənasızdır, ona görə hər ssenari **iki fərqli
səhifə ölçüsü** ilə işlədilir — N+1 yalnız fərqdə görünür.

| Ssenari | sətir (kiçik → böyük) | sorğu (kiçik → böyük) | fərq | verdikt |
| --- | --- | --- | ---: | --- |
| feed (`listFeed`) | 6 → 24 | 11 → 11 | 0 | ✅ sabit |
| directory (`listDirectory`) | 6 → 24 | 11 → 11 | 0 | ✅ sabit |
| timeline (`listTimeline`) | 6 → 24 | 4 → 4 | 0 | ✅ sabit |

**N+1 YOXDUR** — sorğu sayı sətir sayından asılı deyil.

### 2.5 ⛔ ISR ictimai səhifələrdə TƏTBİQ EDİLMƏDİ — səbəb

`(public)` qrupunun karkası `ConsentGate` → `cookies()` çağırır (TƏLƏ E-nin
həlli: kuki serverdə oxunur ki, razılıq vermiş istifadəçi banneri bir anlıq
görməsin). Next.js-də `cookies()` bütün route-u DİNAMİK edir — sübut: `/docs`
səhifəsi DB-yə ümumiyyətlə toxunmur və `force-dynamic` daşımır, build çıxışında
yenə `ƒ (Dynamic)`-dir.

Üç yol var idi, üçü də rədd edildi:

1. **PPR (Partial Prerendering)** — `experimental`, stack isə kilidlidir.
2. **Razılığı client-ə köçürmək** — TƏLƏ E-ni geri qaytarır (banner hər
   yükləmədə bir anlıq görünür).
3. **Banneri həmişə HTML-ə yazıb inline script ilə gizlətmək** — məxfilik
   komponentini «yeni funksiya yoxdur» blokunda yenidən qurmaq deməkdir.

**Ölçü göstərir ki, itki yoxdur:** `server-response-time` 20–40 ms, desktop
Performance 100, CLS 0. Tam-route keşi hazırda darboğaz DEYİL. Bilinən
məhdudiyyət kimi §5-də saxlanılır.

---

## 3. C bəndi — RESPONSIVE (KUDS §9)

`scripts/responsive-shots.ts` — **5 breakpoint × 10 səhifə = 50 ekran
görüntüsü** (`docs/responsive/`). Skript yalnız şəkil çəkmir, **ölçür**:
üfüqi sürüşmə, taşan elementlər, kiçik toxunma hədəfləri.

⚠️ Skript 13B üçün təkrar işlədilə bilən saxlanılıb: baza ünvan, çıxış qovluğu,
hesab və tək səhifə filtri mühit dəyişənlərindədir (`SHOTS_BASE_URL`,
`SHOTS_OUT_DIR`, `SHOTS_EMAIL`, `SHOTS_ONLY`). Hər breakpoint **iki** kontekst
açır — anonim və giriş etmiş: `/login` giriş etmiş brauzerdə yönləndirilir və
tək sessiya ilə gəzmək ictimai səhifələri səssizcə BAŞQA səhifə kimi ölçərdi.

### 3.1 Üfüqi sürüşmə — 2 tapıntı, ikisi də düzəldilib

| Səhifə | 375px-də | Kök səbəb | Düzəliş |
| --- | --- | --- | --- |
| `/class/[slug]/directory` | `scrollWidth 472 > 375` | Kart `ul.grid`-in xanasıdır və `min-width: auto` onu uzun fakültə adının min-content enindən aşağı sıxılmağa qoymurdu; `MemberIdentity`-də `min-w-0` yalnız DAXİLİ qutuda vardı | `min-w-0` → `DirectoryCard` kökü + `MemberIdentity` xarici qutusu |
| `/admin/users` | `scrollWidth 409 > 375` | Native `<select>`-in İÇ MİNİMUM ENİ ən uzun opsiyanın enidir («Biznesin idarə edilməsi — Class of 2030 (20)» ≈ 368px); grid xanası `min-width: auto` ilə sıxıla bilmirdi | `min-w-0` + `w-full` → filtr xanaları və `<select>` |

**Sonra: beş breakpoint-in heç birində üfüqi sürüşmə yoxdur.**

### 3.2 Toxunma hədəfləri — iki hədd, bir qapı

| Hədd | Mənbə | Rol |
| --- | --- | --- |
| **24px** | WCAG 2.2 AA, SC 2.5.8 | **QAPI** — sıfır olmalıdır |
| 44px | KUDS (tapşırıq mətni) | məsləhət — say verilir |

🔴 44px QAPI EDİLMƏDİ: shadcn düymələri `h-9` (36px), input-lar `h-9`/`h-10`
ölçüsündədir və bu ölçülər `src/components/ui/` mənbəyindədir — CLAUDE.md §1-ə
görə TOXUNULMAZ. 44px-i qapı etsək hesabat 351 «pozuntu» göstərər və REAL
tapıntı həmin səs-küydə itərdi.

WCAG-ın **«Inline» istisnası** (SC 2.5.8) skriptdə dəqiq kodlaşdırılıb: link
`display: inline`-dırsa, yaxud `flex` sətrində bloklaşıb AMMA valideynində
hədəf olmayan mətn var və hündürlüyü öz `line-height`-inə bərabərdirsə
(«Samir Qasımov · 3 gün əvvəl») — istisna tətbiq olunur. Yalnız linklərdən
ibarət sətirdə (footer meta zolağı, breadcrumb) istisna İŞLƏMİR.

#### Tapıntılar — hamısı düzəldilib

| Element | Ölçü | Səbəb | Düzəliş |
| --- | --- | --- | --- |
| 🔴 Mobil naviqasiya düyməsi (`Naviqasiyanı aç`) | **16×36** | `size="icon"` 36×36 verir, amma header-in flex sətrində `flex-shrink: 1` defaultu ilə **16 px enə sıxılırdı** — hamburger ikonu kəsilirdi | `shrink-0` (`MobileNav` + `PublicNav`) |
| Breadcrumb linkləri | 64×18 | `text-caption` sətri 18px-dir, daxili boşluq yox idi | `inline-block py-1` |
| Footer meta linki (`API sənədləri`) | 75×18 | eyni | `inline-block py-1` |

**Sonra: 24px qapısında sıfır tapıntı.**

### 3.3 Gözlə baxış (50 görüntü)

- Sidebar mobildə **Sheet**-ə çevrilir (hamburger görünür, 280px sidebar yoxdur) ✓
- Cədvəllər mobildə **kart görünüşünə** keçir (`/admin/users` — 126 istifadəçi
  kart-kart, cədvəl deyil) ✓
- Uzun mətn kəsilmir (`truncate` + `min-w-0` zənciri) ✓
- Modal mobildə ekranı aşmır ✓
- Kuki banneri `fixed`-dir və axına eyni ölçüdə boşluq əlavə edir (səhifənin son
  pikselləri örtülü qalmır) ✓

---

## 4. D bəndi — VƏZİYYƏTLƏR

### 4.1 Route qrupu səviyyəsində sərhədlər

| Fayl | `(public)` | `(app)` | `(admin)` |
| --- | :-: | :-: | :-: |
| `error.tsx` | ✓ | ✓ | ✓ |
| `not-found.tsx` | ✓ | ✓ | ✓ |
| `loading.tsx` | ⛔ | ⛔ | ✓ |

Görünüşlər ORTAQDIR: `components/shared/RouteError.tsx`,
`RouteNotFound.tsx`, `PageSkeleton.tsx` — qrup faylları yalnız mətn və «geri»
keçidini verir.

**Nə qazandıq:** kök `app/error.tsx` və `app/not-found.tsx` route qrupu
layout-larının ÜSTÜNDƏDİR — yəni sinif səhifəsində xəta baş verəndə AppShell
(sidebar + header + naviqasiya) da yox olurdu. Qrup daxilindəki sərhəd qrupun
layout-u İÇİNDƏ render olunur: karkas yerində qalır. Bu, həm də bütün SERVER
siyahılarının («kataloq, xronologiya, xatirələr, tədbirlər, nailiyyətlər»)
**xəta ayağıdır** — onların skeleton və boş vəziyyəti komponentin öz içindədir,
xəta isə yalnız sərhədlə verilə bilər.

### 4.2 🔴 `loading.tsx` NİYƏ YALNIZ `(admin)`-dədir — ÖLÇÜLMÜŞ SƏBƏB

`loading.tsx` route seqmentini **axınla** (streaming) render edir: cavab
başlığı — o cümlədən **HTTP statusu** — məzmun hazır olmamışdan əvvəl göndərilir.
Seqment sonradan `notFound()` çağırsa belə status artıq **200**-dür.

**Ölçü:**

```
(app)/loading.tsx VAR  → GET /class/<mövcud-olmayan>  = 200   🔴
(app)/loading.tsx YOX  → GET /class/<mövcud-olmayan>  = 404   ✓
```

Bu, layihə üçün real regresdir:

- `(app)` və `(public)` qruplarında **25 səhifə** `notFound()` çağırır;
- «yoxdur» ilə «icazə yoxdur» QƏSDƏN ayırd edilmir (PLAN.md §4.3) — 200 cavabı
  ünvanın MÖVCUDLUĞUNU təsdiqləyir;
- üç mövcud e2e testi məhz 404 statusunu ölçür.

`(admin)` qrupunda isə **heç bir səhifə `notFound()` çağırmır** → orada axınla
render heç nəyi pozmur və skeleton sərbəst işlədilir. Digər iki qrupda skeleton
səhifə səviyyəsindəki `Suspense` sərhədləri ilə verilir (onlar statusu dəyişmir,
çünki `notFound()` onlardan ƏVVƏL, səhifənin öz gövdəsində işləyir).

### 4.3 Boş vəziyyətlərin gəzilməsi — `tests/e2e/empty-states.spec.ts`

Üsul: bazanı boşaltmaq ƏVƏZİNƏ hər siyahıya **etibarlı, lakin heç nəyə uyğun
gəlməyən filtr** verilir (`?name=zzzqwertyxyz`, `?year=1900-1901`, `?page=99`).
Nəticə eynidir — sıfır sətir — amma baza toxunulmaz qalır.

⚠️ Filtr dəyəri ETİBARLI olmalıdır: zibil enum (`?category=ZZZ`) parser
tərəfindən SƏSSİZCƏ atılır və səhifə BÜTÜN nəticələri göstərir — test heç nə
ölçməzdi.

12 test, hamısı yaşıl:

| # | Siyahı | Yoxlama |
| ---: | --- | --- |
| 1 | `/faq` | boş vəziyyət + səhifə ağ deyil |
| 2–6 | kataloq · xronologiya · xatirələr · tədbirlər · nailiyyətlər | eyni |
| 7–8 | axtarış · bildirişlər | eyni |
| 9–10 | admin istifadəçilər · admin audit | eyni |
| 11 | mövcud olmayan sinif | **404 statusu** + karkas yerində |
| 12 | mövcud olmayan ictimai ünvan | kök 404 ekranı |

`EmptyState` komponentinə `data-testid="empty-state"` əlavə olundu — mətnə görə
axtarmaq etibarsızdır (hər siyahının öz başlığı var). Lentin öz boş kartı da
eyni açarı daşıyır.

### 4.4 Lent — üçlüyün ayrıca hekayəsi

**Boş və xəta ayaqları `src/features/feed/FeedList.test.tsx`-dədir (4 vitest
testi), e2e-də deyil** — səbəb ölçülüb:

- Lent serverdən `initialData` ALIR;
- seed-də altı sinfin hamısında 38–65 post var və **hər 12 kateqoriyada** sətir
  mövcuddur → `?category=` ilə boş nəticə almaq mümkün deyil;
- `/api/feed` cavabını brauzerdə əvəz etmək də kömək etmir: `initialData`
  sayəsində komponent şəbəkəni gözləmədən dolu siyahı render edir.

🔴 **Yol boyu tapılan davranış:** `query.isError` şaxəsi praktikada
**çatılmazdır**. TanStack Query v5-də məlumat mövcud olanda uğursuz refetch
statusu `error`-a çevirmir (`status` `success` qalır). `initialData` isə həmişə
verilir. Yəni lentin real xəta ayağı SERVER render-idir və o, indi
`(app)/error.tsx` ilə örtülür. Test bunu müşahidə kimi kilidləyir: şəbəkə
xətasında istifadəçi mövcud paylaşımları görməyə davam edir (məlumat itmir).

### 4.5 Şərhlər — «xəta» «boşluq»dan ayrıldı

`CommentThread` uğursuz yükləmədə yalnız toast göstərirdi, ekranda isə **«Hələ
şərh yoxdur»** qalırdı — yəni SƏHV MƏLUMAT (şərhlər var, sadəcə gəlmədi). Toast
saniyələr sonra itir, yanlış cümlə ekranda qalır. İndi ayrıca xəta bloku +
«Yenidən cəhd et» düyməsi var.

---

## 5. Bilinən məhdudiyyətlər (12C-də QƏSDƏN toxunulmayıb)

| # | Məhdudiyyət | Səbəb |
| ---: | --- | --- |
| 1 | **ISR ictimai səhifələrdə yoxdur** | `ConsentGate` → `cookies()` bütün `(public)` route-larını dinamik edir; PPR experimental, stack kilidlidir. Ölçü itki göstərmir (§2.5) |
| 2 | **`/home` mobil Performance 87** | Yönləndirmə 600 ms alır; hədəf səhifə birbaşa ölçüləndə 91 (§2.2) |
| 3 | **`loading.tsx` yalnız `(admin)`-də** | Axınla render `notFound()` statusunu 200-ə çevirir (§4.2) |
| 4 | **KUDS 44px toxunma hədəfi tam ödənmir** (351 element 24–43px arası) | shadcn primitivlərinin öz ölçüsüdür (`h-9` = 36px), `src/components/ui/` toxunulmazdır. WCAG 2.2 AA-nın 24px qapısı **ödənilib** |
| 5 | **Profil banneri xarici ünvanda `<img>` qalır** | `next/image` hostu `remotePatterns`-də tələb edir; hər hostu ağ siyahıya almaq optimizatoru açıq proksiyə çevirər. `/uploads/…` yolları `next/image`-dədir |
| 6 | **`legacy-javascript` 11 KiB** | Next.js-in öz köhnə-brauzer polyfill dəsti; `browserslist` dəyişmək stack qərarıdır |
| 7 | **Kuki banneri mobil `/directory`-də CLS 0.035** | Banner `fixed`-dir və şrift `swap` ilə gələndə hündürlüyü bir qədər dəyişir. «Yaxşı» zolağın içindədir (< 0.1); digər səhifələrdə 0 |
| 8 | Blok 12B-dən qalan funksional borclar (toplu moderasiya, parol sıfırlama, `/admin/stats` kohort filtri, CMS-də yaratma, ikinci dərəcəli kohort rolu) | 12C-nin əhatəsi deyil (bax `docs/audit-12a.md` §6) |

---

## 6. Alətlər — hamısı təkrar işlədilə bilir

| Əmr | Nə edir | Çıxış |
| --- | --- | --- |
| `npx playwright test tests/e2e/a11y.spec.ts` | axe · 12 səhifə × 2 vəziyyət | `test-results/axe/*.json` |
| `npx playwright test tests/e2e/a11y-keyboard.spec.ts` | klaviatura · fokus · canlı bölgə | — |
| `npx playwright test tests/e2e/empty-states.spec.ts` | boş vəziyyət + 404 sərhədləri | — |
| `npm run audit:lighthouse` | Lighthouse · 5 səhifə (auth kukisi ilə) | `docs/lighthouse/` |
| `npm run audit:responsive` | 5 breakpoint × 10 səhifə + ölçmə | `docs/responsive/` |
| `npm run audit:queries` | N+1 sorğu profili | terminal cədvəli |

⚠️ **Törəmə artefaktlar repoya girmir.** `docs/lighthouse/**/*.{html,json}`
(17 MB) və `docs/responsive/*.png` (34 MB) `.gitignore`-dadır — hər işlətmədə
yenidən yaradılır. Xülasə markdown-ları (`docs/lighthouse/README.md`,
`docs/responsive/report.md`) və bu hesabat repoda QALIR.

---

## 7. Yeni tələ reyestri

**T44 — Radix `Dialog` fokusu YALNIZ `DialogTrigger` olanda qaytarır.**
`DialogContent` `onCloseAutoFocus`-da `event.preventDefault()` çağırıb fokusu
`context.triggerRef`-ə verir. `<DialogTrigger>` işlədilmirsə (idarə olunan
modal, klaviatura qısayolu ilə açılan modal) `triggerRef` null olur və fokus
`<body>`-yə düşür — brauzerin öz bərpası isə artıq ləğv edilib. Hər idarə olunan
`DialogContent` `useDialogFocusRestore()` idarəedicisini almalıdır.

---

# Blok 12E — YENİDƏN ÖLÇMƏ (Sprint 3/4 qalan meyarları)

> 12C-nin rəqəmləri **2026-07-31**-dəndir və o vaxtdan iki blok keçib
> (12A deploy artefaktları, 12D yüklənmə vəziyyəti + 51 səhifəlik responsive
> matrisi). Bu bölmə həmin ölçmələri **eyni alətlərlə təkrarlayır** — yuxarıdakı
> 12C mətni tarixi qeyd kimi olduğu kimi saxlanılır, silinmir.
>
> Tarix: **2026-08-18** · Baza: `next start` · `http://127.0.0.1:3100`

## 8. axe — 12 səhifə × 2 vəziyyət, TƏKRAR ÖLÇMƏ

`npx playwright test tests/e2e/a11y.spec.ts` → **24 skan, 24-ü yaşıl.**

| Təsir səviyyəsi | Node sayı |
| --- | ---: |
| `critical` | **0** |
| `serious` | **0** |
| `moderate` | **0** |
| `minor` | **0** |

⚠️ Sıfır YALNIZ `serious`/`critical`-da deyil — **dörd səviyyənin hamısında**.
12C-də qapı yalnız serious/critical idi və `moderate`/`minor` «sayılır, amma
qırmızı etmir» kimi yazılmışdı; bu ölçmədə onlar da boşdur.

Skan edilən 12 səhifə (hər biri anonim + giriş etmiş): `/` · `/faq` ·
`/khankendi` · `/login` · `/register` · `/home` · `/class/[slug]` ·
`/class/[slug]/directory` · `/class/[slug]/timeline` · `/class/[slug]/map` ·
`/me/privacy` · `/admin`.

⚠️ Anonim vəziyyətdə səkkiz yol `/login`-ə yönləndirilir (`finalPath` JSON-da
qeyd olunur) — yəni onlar «qorunan səhifənin əlçatanlığı» yox, **yönləndirmə
hədəfinin** əlçatanlığını ölçür. Bu, qüsur deyil, ölçmənin oxunuşudur.

⚠️ TƏLƏ J qüvvədədir: skandan əvvəl skeletonların yox olması `expect.poll` ilə
gözlənilir (`tests/e2e/settle.ts`). Skeleton görünən anda skan edilsəydi
`color-contrast` qaydası boz qutulara baxıb saxta tapıntı verərdi.

## 9. 🔴 Lighthouse — AÇILIŞ SƏHİFƏSİNDƏ REQRESSİYA TAPILDI VƏ DÜZƏLDİLDİ

### Tapıntı

Desktop preset açılış səhifəsini **Performance 88 · CLS 0.223** ölçdü.
12C-də eyni səhifə **100 · CLS 0** idi. Sıçrayış TƏK idi və node göstərilmişdi:

```
layout-shifts → score 0.2234 → body.antialiased > div.flex > footer.border-t
```

### Səbəb — ölçülüb, təxmin edilməyib

Blok 12D `(landing)/loading.tsx` əlavə etmişdi:
`PageSkeleton variant="cards"`. Səhifə JS söndürülmüş brauzerdə (yəni axının
**birinci** hissəsində, Suspense fallback-i yerində) ölçüldü:

| Vəziyyət | `<footer>`-in yeri | Sənəd hündürlüyü |
| --- | ---: | ---: |
| Skeleton (fallback) | **730 px** | 1 280 px |
| Məzmun gəldikdən sonra | **5 794 px** | 6 463 px |

`PublicShell`-in footer-i Suspense sərhədindən **kənardadır**, yəni skeleton
anında 940 px-lik ekranın **İÇİNDƏ** görünür, sonra 5 000 px aşağı tullanır.
Bu, ölçü cihazının şıltaqlığı deyil — istifadəçinin gözü ilə görünən sıçrayışdır.

⚠️ Səbəb `PageSkeleton`-un ÖZ müqaviləsinin pozulması idi: fayl başlığı
«skeleton real səhifənin FORMASINI təqlid edir» deyir, `count` prop-unun sənədi
isə «real səhifədəki İLK EKRAN sayına yaxın olmalıdır» tələb edir. Açılış
səhifəsi kart şəbəkəsi deyil — hero + doqquz bölmədir.

### Düzəliş

`src/features/welcome/WelcomeSkeleton.tsx` — real səhifənin formasını verən
skeleton (hero bloku + üç bölmə × üç kart). Eyni idiom Blok 12D-də
`YearbookSkeleton` üçün işlədilmişdi.

| | Əvvəl | Sonra |
| --- | ---: | ---: |
| `/` desktop Performance | 88 ❌ | **99 ✅** |
| `/` desktop CLS | **0.223** | **0** |
| Skeleton anında footer | 730 px (ekranın içində) | **1 773 px** (kənarda) |

🔴 **Hədəf «skeletonu 6 400 px etmək» DEYİL** — 6 400 px-lik boz qutu absurd
olardı. Hədəf ölçülə biləndir: footer **hər iki vəziyyətdə** ekrandan kənarda
qalsın. CLS yalnız viewport-da GÖRÜNƏN elementlərin sıçrayışını sayır.

### Qapı — rəqəm sənəddə yox, testdə saxlanılır

`tests/e2e/landing-cls.spec.ts` (**yeni**, 3 test). Desktop (1350×940) və mobil
(412×823) ekranda `javaScriptEnabled: false` ilə axının birinci hissəsi ölçülür
və footer-in ekrandan kənarda olması tələb olunur.

⚠️ **Qapı boş deyil — sübut edilib.** Köhnə `loading.tsx` müvəqqəti geri
qaytarıldı və test məhz gözlənilən mesajla AŞDI:

```
✘ desktop: skeleton anında footer EKRANDAN KƏNARDADIR
  Error: Skeleton çox qısadır: footer 730px-də, yəni 940px-lik ekranın
  İÇİNDƏ başlayır.
```

Mobil ölçüdə köhnə skeleton da keçirdi (412 px-də kartlar alt-alta düşür və
skeleton onsuz da 823 px-i aşır) — yəni bağlayıcı yoxlama **desktop**-dur.

### Desktop — yekun (5 səhifə)

| Səhifə | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | **99 ✅** | 100 ✅ | 100 ✅ | 91 ✅ | 0.8 s | 0 ms | **0** |
| `/home` | 99 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 0.9 s | 0 ms | 0 |
| `/class/[slug]/directory` | 100 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 0.8 s | 0 ms | 0 |
| `/class/[slug]/map` | 100 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 0.8 s | 0 ms | 0 |
| `/admin` | 100 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 0.7 s | 0 ms | 0 |

**Beş səhifənin hamısı bütün hədəfləri keçdi.**

⚠️ `/` üçün SEO **91** (12C-də 100) — `meta-description` auditi «yoxdur» deyir.
Yoxlanıldı: təsvir **HƏM** serverin verdiyi HTML-dədir (bayt 20 092), **HƏM**
hidratasiyadan sonrakı DOM-dadır. Səbəb `loading.tsx` ilə gələn axındır —
metadata shell-dən SONRAKI hissədə göndərilir və Lighthouse-un snapshot anı
bəzən ondan əvvələ düşür. Yəni bu, **ölçmə artefaktıdır**, sənədin özündə
boşluq deyil; hədəf (≥ 90) hər halda keçilib.

### Mobil — iki işlətmə, ölçmə səs-küyü açıq göstərilir

| Səhifə | 12C | 12E · 1-ci | 12E · 2-ci | Hədəf |
| --- | ---: | ---: | ---: | --- |
| `/` | 92 | 92 ✅ | 91 ✅ | ≥ 90 |
| `/home` | 87 | 78 ❌ | 86 ❌ | ≥ 90 |
| `/class/[slug]/directory` | 94 | 87 ❌ | 88 ❌ | ≥ 90 |
| `/class/[slug]/map` | 92 | 90 ✅ | 91 ✅ | ≥ 90 |
| `/admin` | 90 | 83 ❌ | 85 ❌ | ≥ 90 |

🔴 **Bu rəqəmlər kod reqressiyası kimi OXUNMAMALIDIR.** İki işlətmə arasında
FCP və LCP demək olar dəyişmir, **TBT isə 2–3 dəfə tərpənir** (60 → 400 ms
aralığı, EYNİ build). Mobil profil «4× zəiflədilmiş CPU» simulyasiyasıdır və
ölçən maşının öz yükünə həssasdır (`load average` ölçmə anında 2.6–3.1 idi).
Desktop profilində eyni build sabit şəkildə 99–100 verir.

✅ **Sabit və reproduksiya olunan yaxşılaşma:** CLS mobil profildə **bütün beş
səhifədə 0** — 12C-də `/directory` 0.035 idi (kuki banneri). Yəni §5-in 7-ci
məhdudiyyəti bu ölçmədə görünmür.

## 10. Qəbul edilmiş tapıntılar — səbəbi ilə

| # | Tapıntı | Niyə qəbul edilir |
| ---: | --- | --- |
| 1 | **24–43 px toxunma hədəfləri** (351 element) | shadcn primitivlərinin öz ölçüsüdür (`h-9` = 36 px) və `src/components/ui/` CLAUDE.md §1-ə görə toxunulmazdır. **WCAG 2.2 AA-nın 24 px qapısı ödənilib**; 44 px KUDS **tövsiyəsidir**, qapı deyil. ⚠️ İki primitiv (`Checkbox` 16×16, `Switch` 36×20) 24 px-in ALTINDADIR — bax §5 №9 və `STATE.md` 12D bölməsi: bu, açıq **dizayn sualıdır**, ölçülüb və gizlədilmir |
| 2 | **`/home` mobil Performance 90-dan aşağı** | `/home` istifadəçinin əsas sinfinə **yönləndirir** (məhsul qərarı, PLAN.md §4.2); Lighthouse `redirects` auditində ~600 ms itki yazır. Hədəf səhifə birbaşa ölçüləndə fərq itir. Yönləndirməni silmək məhsul davranışını dəyişməkdir |
| 3 | **`/` SEO 91** | Ölçmə artefaktı — `meta-description` həm HTML-də, həm final DOM-dadır (yuxarıda sübut). Hədəf keçilib |
| 4 | **Mobil TBT səs-küyü** | Ölçən maşının yükündən asılıdır; iki işlətmə cədvəldə YAN-YANA verilib ki, tək rəqəm həqiqətdən çox şey vəd etməsin |

⚠️ Kuki bannerinin CLS-i (12C-də 0.035) bu ölçmədə **0-dır** — «qəbul edilmiş
tapıntı» siyahısında saxlanmır, çünki artıq ölçülmür.

## 11. Alətlər — 12E-də əlavə olunanlar

| Əmr | Nə edir | Çıxış |
| --- | --- | --- |
| `npx playwright test tests/e2e/landing-cls.spec.ts` | açılış skeletonu footer-i ekrandan kənarda saxlayırmı | — (qapı) |
| `LH_PRESET=mobile LH_OUT_DIR=docs/lighthouse/mobile npm run audit:lighthouse` | mobil profil | `docs/lighthouse/mobile/README.md` |

⚠️ **§2.2-dəki ölçmə tələsi 12E-də DƏ baş verdi və vaxt itirdi.** `pkill` köhnə
`next start`-ı öldürməmişdi, yeni proses portu tuta bilmədi və səssizcə çıxdı —
Lighthouse **KÖHNƏ build-i** ölçdü, «düzəliş işləmir» kimi göründü. Yoxlama
üsulu: `ps -eo pid,lstart,cmd | grep next-server` — prosesin BAŞLAMA VAXTI
build-dən sonra olmalıdır.
