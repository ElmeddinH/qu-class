# Responsive audit — `docs/responsive/report.md`

> ⚠️ **BU FAYL AVTOMATİK YARADILIR** — `npm run audit:responsive`.
> Əl ilə redaktə etmə: növbəti işlətmə üzərinə yazır. Mətn dəyişikliyi
> `scripts/responsive-shots.ts` → `reportMarkdown()`-dadır.

Baza: `http://127.0.0.1:3100` · Breakpoint-lər: 375 / 768 / 1024 / 1280 / 1536 px
Əhatə: **51 səhifə × 5 breakpoint = 255 ölçmə**
Toxunma hədəfi: QAPI 24px (WCAG 2.2 AA) · MƏSLƏHƏT 44px (KUDS)

🔴 **BU HESABAT QAPI DEYİL, SƏNƏDDİR.** Reqressiya qapısı
`tests/e2e/responsive.spec.ts`-dir: eyni 51 səhifəni eyni beş breakpoint-də
gəzir və dörd şərti ölçür (üfüqi sürüşmə · header 72px · sidebar 280px/çəkməcə
· məzmun kəsilmir). Səbəb: 255 PNG-yə baxıb «yaxşıdır» demək təkrarlana
bilməyən sübutdur — növbəti dəyişiklikdə heç nə xəbərdarlıq etmir.

## 1. Üfüqi sürüşmə

**Tapıntı yoxdur** — beş breakpoint-in heç birində üfüqi sürüşmə yoxdur ✅

## 2. Toxunma hədəfi — QAPI (WCAG 2.2 AA, 24px)

| Səhifə | Breakpoint | Elementlər |
| --- | --- | --- |
| `/class/[slug]/memories` | 375 (mobile) | `button#memory-place-only.grid.place-content-center.peer` 16×16 |
| `/events/[id]/manage` | 375 (mobile) | `button#notify-REGISTERED.grid.place-content-center.peer` 16×16<br>`input` 16×16<br>`button#notify-ACCEPTED.grid.place-content-center.peer` 16×16<br>`button#notify-WAITLISTED.grid.place-content-center.peer` 16×16 |
| `/kuds` | 375 (mobile) | `button#kuds-timeline.grid.place-content-center.peer` 16×16<br>`button#kuds-achievements.grid.place-content-center.peer` 16×16<br>`button#kuds-stats.peer.inline-flex.h-5` 36×20 |
| `/me/career` | 375 (mobile) | `button#open-to-support.peer.inline-flex.h-5` 36×20<br>`input` 36×20<br>`button#offer-GUEST_LECTURE.grid.place-content-center.peer` 16×16<br>`button#offer-CAREER_TALK.grid.place-content-center.peer` 16×16<br>`button#offer-INTERNSHIP.grid.place-content-center.peer` 16×16<br>`button#offer-JOB_SHARING.grid.place-content-center.peer` 16×16<br>`button#offer-MENTORING.grid.place-content-center.peer` 16×16 |
| `/admin/moderation` | 375 (mobile) | `button#report-select-rpt-02.grid.place-content-center.peer` 16×16<br>`button#report-select-rpt-01.grid.place-content-center.peer` 16×16<br>`button#report-select-rpt-05.grid.place-content-center.peer` 16×16<br>`button#report-select-rpt-06.grid.place-content-center.peer` 16×16<br>`button#report-select-rpt-10.grid.place-content-center.peer` 16×16<br>`button#report-select-rpt-09.grid.place-content-center.peer` 16×16 |
| `/class/[slug]/memories` | 768 (tablet) | `button#memory-place-only.grid.place-content-center.peer` 16×16 |
| `/events/[id]/manage` | 768 (tablet) | `button#notify-REGISTERED.grid.place-content-center.peer` 16×16<br>`input` 16×16<br>`button#notify-ACCEPTED.grid.place-content-center.peer` 16×16 |
| `/kuds` | 768 (tablet) | `button#kuds-timeline.grid.place-content-center.peer` 16×16<br>`button#kuds-achievements.grid.place-content-center.peer` 16×16 |
| `/me/career` | 768 (tablet) | `button#open-to-support.peer.inline-flex.h-5` 36×20<br>`input` 36×20<br>`button#offer-GUEST_LECTURE.grid.place-content-center.peer` 16×16<br>`button#offer-CAREER_TALK.grid.place-content-center.peer` 16×16<br>`button#offer-INTERNSHIP.grid.place-content-center.peer` 16×16<br>`button#offer-JOB_SHARING.grid.place-content-center.peer` 16×16 |
| `/admin/moderation` | 768 (tablet) | `button#report-select-rpt-02.grid.place-content-center.peer` 16×16<br>`button#report-select-rpt-01.grid.place-content-center.peer` 16×16<br>`button#report-select-rpt-05.grid.place-content-center.peer` 16×16<br>`button#report-select-rpt-06.grid.place-content-center.peer` 16×16<br>`button#report-select-rpt-10.grid.place-content-center.peer` 16×16 |
| `/class/[slug]/memories` | 1024 (laptop) | `button#memory-place-only.grid.place-content-center.peer` 16×16 |
| `/events/[id]/manage` | 1024 (laptop) | `button#notify-REGISTERED.grid.place-content-center.peer` 16×16<br>`input` 16×16 |
| `/kuds` | 1024 (laptop) | `button#kuds-timeline.grid.place-content-center.peer` 16×16 |
| `/me/career` | 1024 (laptop) | `button#open-to-support.peer.inline-flex.h-5` 36×20<br>`input` 36×20<br>`button#offer-GUEST_LECTURE.grid.place-content-center.peer` 16×16<br>`button#offer-CAREER_TALK.grid.place-content-center.peer` 16×16<br>`button#offer-INTERNSHIP.grid.place-content-center.peer` 16×16 |
| `/admin/moderation` | 1024 (laptop) | `button#report-select-rpt-02.grid.place-content-center.peer` 16×16<br>`button#report-select-rpt-01.grid.place-content-center.peer` 16×16<br>`button#report-select-rpt-05.grid.place-content-center.peer` 16×16<br>`button#report-select-rpt-06.grid.place-content-center.peer` 16×16 |
| `/class/[slug]/memories` | 1280 (desktop) | `button#memory-place-only.grid.place-content-center.peer` 16×16 |
| `/events/[id]/manage` | 1280 (desktop) | `button#notify-REGISTERED.grid.place-content-center.peer` 16×16<br>`input` 16×16 |
| `/kuds` | 1280 (desktop) | `button#kuds-timeline.grid.place-content-center.peer` 16×16 |
| `/me/career` | 1280 (desktop) | `button#open-to-support.peer.inline-flex.h-5` 36×20<br>`input` 36×20<br>`button#offer-GUEST_LECTURE.grid.place-content-center.peer` 16×16<br>`button#offer-CAREER_TALK.grid.place-content-center.peer` 16×16<br>`button#offer-INTERNSHIP.grid.place-content-center.peer` 16×16 |
| `/admin/moderation` | 1280 (desktop) | `button#report-select-rpt-02.grid.place-content-center.peer` 16×16<br>`button#report-select-rpt-01.grid.place-content-center.peer` 16×16<br>`button#report-select-rpt-05.grid.place-content-center.peer` 16×16<br>`button#report-select-rpt-06.grid.place-content-center.peer` 16×16 |
| `/class/[slug]/memories` | 1536 (large) | `button#memory-place-only.grid.place-content-center.peer` 16×16 |
| `/events/[id]/manage` | 1536 (large) | `button#notify-REGISTERED.grid.place-content-center.peer` 16×16<br>`input` 16×16 |
| `/kuds` | 1536 (large) | `button#kuds-timeline.grid.place-content-center.peer` 16×16 |
| `/me/career` | 1536 (large) | `button#open-to-support.peer.inline-flex.h-5` 36×20<br>`input` 36×20<br>`button#offer-GUEST_LECTURE.grid.place-content-center.peer` 16×16<br>`button#offer-CAREER_TALK.grid.place-content-center.peer` 16×16<br>`button#offer-INTERNSHIP.grid.place-content-center.peer` 16×16 |
| `/admin/moderation` | 1536 (large) | `button#report-select-rpt-02.grid.place-content-center.peer` 16×16<br>`button#report-select-rpt-01.grid.place-content-center.peer` 16×16<br>`button#report-select-rpt-05.grid.place-content-center.peer` 16×16<br>`button#report-select-rpt-06.grid.place-content-center.peer` 16×16 |

## 3. Toxunma hədəfi — MƏSLƏHƏT (KUDS 44px)

1679 element 24px-i keçir, amma KUDS-un 44px tövsiyəsindən kiçikdir.
Böyük hissəsi shadcn primitivlərinin öz ölçüsüdür (`h-9` = 36px) və
`src/components/ui/` CLAUDE.md §1-ə görə toxunulmazdır — ona görə bu bölmə
qapı deyil, siyahıdır.

Ekran görüntüləri: `<səhifə>__<en>.png` (255 ədəd).
⚠️ PNG-lər `.gitignore`-dadır (~34 MB+) və bu, QƏSDƏNDİR — repoda yalnız
bu xülasə qalır. Yenidən yaratmaq: `npm run audit:responsive`.

## 4. Blok 12D — tapılan və düzəldilən qırıqlar

| Səhifə | Breakpoint | Qırıq | Düzəliş |
| --- | --- | --- | --- |
| `/admin/cohorts` | 375px | **157px üfüqi sürüşmə** — «Yeni sinif» formasındakı native `<select>`-in iç minimum eni ən uzun opsiyanın enidir (≈491px); grid xanası `min-width: auto` daşıdığı üçün ondan aşağı sıxıla bilmir | `min-w-0` + `w-full` (`features/admin/CohortCreateForm.tsx`). Eyni düzəliş Blok 12C-də `AdminUserFilters.tsx`-ə verilmişdi, bu forma unudulmuşdu |
| `/events/[id]/manage` | hamısı | **Çeşidləmə düyməsi 73×21px** — WCAG 2.2 AA 24px qapısından aşağı. `text-small` sətir hündürlüyü 21px verir, düymədə dolğu yoxdur; «Inline» istisnası cədvəl başlığında keçmir | `min-h-6` (`features/events/manage/AttendeeTable.tsx`) |

Üfüqi sürüşmə, kəsilmiş məzmun və sıfır enli landmark üzrə qalan **50
səhifədə** heç bir breakpoint-də tapıntı yoxdur (§1).

## 5. Düzəldilməyənlər və niyə

🔴 **DÜZƏLİŞ: §2-dəki 24px QAPISI ARTIQ TAM ÖDƏNMİR.** Blok 12C bu qapını
«ödənilib» kimi yazmışdı, amma həmin ölçmə **10 səhifədə** aparılmışdı.
51 səhifəyə genişlənəndə iki shadcn primitivi qapının altında qaldı:

| Element | Ölçü | Harada | Niyə toxunulmadı |
| --- | --- | --- | --- |
| `Checkbox` | **16×16** | `/me/career`, `/admin/moderation`, `/events/[id]/manage`, `/class/[slug]/memories`, `/kuds` | `src/components/ui/checkbox.tsx` → `h-4 w-4`. CLAUDE.md §1: `ui/` toxunulmazdır. Çağırış yerində `className` ilə böyütmək mümkündür, amma bu, bütün sistemdə checkbox ölçüsünü dəyişən DİZAYN qərarıdır — responsive qırığı deyil və bu blokun səlahiyyətindən kənardır |
| `Switch` | **36×20** | `/me/career`, `/kuds` | `src/components/ui/switch.tsx` → `h-5 w-9`. Eyni səbəb |

⚠️ Radix hər ikisinin arxasında gizli `<input>` render edir (13×13 / 16×16 /
36×20) — §2-dəki `input` sətirləri ayrı tapıntı deyil, EYNİ primitivdir.

Qərar sənədləşdirilib: README «Bilinən məhdudiyyətlər» №9.

| Digər hal | Niyə toxunulmadı |
| --- | --- |
| KUDS 44px tövsiyəsi (§3-dəki say) | shadcn primitivlərinin öz ölçüsüdür (`h-9` = 36px); §3 qapı deyil, siyahıdır |
| Kuki bannerinin CLS 0.035-i | «Yaxşı» zolağın içindədir (< 0.1). Banner `fixed`-dir, şrift `swap` ilə gələndə hündürlüyü dəyişir — README №11 |
| `/home` mobil Performance 87 | Yönləndirmə xərcidir; hədəf səhifə birbaşa ölçüləndə 91 — README №7 |

## 6. Nə ÖLÇÜLMÜR (dürüst hədd)

· `/home` və `/me` **yönləndirmə səhifələridir**. Seed-də üzvlüyü olmayan
istifadəçi yoxdur, ona görə `/home`-un «sinif təyin olunmayıb» ekranı nə
testdə, nə də burada açıla bilmir — ölçülən səth yönləndirmənin HƏDƏFİdir.

· Dörd hüquqi sənəd eyni `page.tsx`-dən gəlir və matrisdə **bir** sətir kimi
sayılır; dördünün də 200 verdiyi `tests/e2e/public.spec.ts`-də ölçülür.

· Ölçmə yalnız Chromium-dadır (`playwright.config.ts` → tək layihə).

## 7. Yüklənmə vəziyyəti — A/B bölgüsü (Blok 12D · Sprint 3 F4)

🔴 **NİYƏ BÖLGÜ LAZIMDIR.** `loading.tsx` seqmenti `<Suspense>`-ə bükür,
yəni cavab AXINLA gedir. Axın başlayan kimi HTTP başlıqları — o cümlədən
STATUS — göndərilib: seqment sonradan `notFound()` çağırsa status **200**
olur, 404 yox. Səhifədə «tapılmadı» yazır, protokol isə «tapıldı» deyir.
Bu, SEO, monitorinq və `/api` müqaviləsi üçün real regresdir və üç mövcud
e2e testi məhz statusu ölçür.

Ona görə 51 səhifə status qapısına görə bölünüb:

| Qrup | Say | Mexanizm |
| --- | ---: | --- |
| **A** — status qapısı YOXDUR | **19** | Seqmentin ƏN DAR yerində `loading.tsx` |
| **B** — status qapısı VAR | **20** | Qapı `await` edilir, YALNIZ ondan sonrakı alt-ağac `<Suspense>`-ə bükülür |
| **—** — uyğun deyil | **12** | Aşağıdakı üç səbəbdən biri |

### A qrupu — `loading.tsx` (19 səhifə)

`(admin)/loading.tsx` doqquz admin səhifəsini örtür (qrupda `notFound()`
yoxdur; `requireAdmin()` → 403 LAYOUT-dadır, yəni sərhəddən kənarda).
Cədvəl formalı iki səhifə (`/admin/users`, `/admin/audit`) öz dar
seqmentində onu üstələyir — kart qridi skeletonu cədvəl üçün səhv
hündürlük verir (CLS).

Qalan on: `/notifications`, `/search`, `/me/privacy`, `/accessibility`,
`/events`, `/faq`, `/register`, `/`, `/faculties`, `/khankendi`.

⚠️ **Son üçü ROUTE QRUPU ilə daraldılıb** (`(landing)`, `faculties/(index)`,
`khankendi/(index)`). Səbəb: `loading.tsx` BÜTÜN ALT AĞACA şamil olunur.
`faculties/loading.tsx` yazılsaydı qonşu `faculties/[slug]`-a da düşərdi və
naməlum fakültə slug-ı 404 əvəzinə 200 verərdi. Route qrupu URL-i DƏYİŞMİR
(`/faculties` yenə `/faculties`-dır), amma seqment ağacında ayrıca səviyyə
yaradır.

### B qrupu — səhifə daxili `<Suspense>` (20 səhifə)

11 sinif səhifəsi + `/khankendi/[id]`, `/me/edit` və yeddi redaksiya
səhifəsi (`/about`, `/history`, `/mission`, `/campus-life`, `/clubs`,
`/services`, `/newcomers`).

⚠️ **Sərhəd YALNIZ İÇİNDƏ `await` edən komponenti bükəndə işləyir.**
Valideyndə `await` edib nəticəni prop kimi vermək boundary-ni boşa çıxarır:
data artıq gözlənilib, skeleton HEÇ VAXT görünmür, amma kod «edilmiş» kimi
görünür. Ona görə üç yeni server qabığı yazıldı — `ClassFeedSection`,
`ProfileEditSection`, `WhereAreWeNowBody`/`SupportBody`/`ModerationBody` —
sorğular səhifədən onların İÇİNƏ köçürüldü.

### Uyğun olmayan 12 səhifə — səbəb

| Səbəb | Səhifələr |
| --- | --- |
| Gözləyəcək server sorğusu yoxdur — skeleton heç vaxt görünməzdi | `/kuds`, `/docs`, `/login` |
| Səhifə yönləndirir; `loading.tsx` statusu 200-ə çevirib yönləndirməni müştəri tərəfinə keçirərdi | `/home`, `/me` |
| Yeganə sorğu 404/403 qərarının ÖZÜDÜR — sərhədin arxasına salmaq statusu sındırardı | `/events/[id]`, `/events/[id]/manage`, `/events/[id]/report`, `/me/career`, `/u/[userId]`, `/faculties/[slug]`, `/legal/[slug]` |

Sonuncu sətir bu blokun ƏSAS nəticəsidir: **status düzgünlüyü ilə skeleton
arasında seçim var** və seçim statusun xeyrinədir. Alternativ — yalnız
dekorativ skeleton üçün İKİNCİ, mövcudluq yoxlayan sorğu əlavə etmək —
sorğu sayını artırır və heç nəyi sürətləndirmir.
