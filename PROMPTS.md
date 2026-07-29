# PROMPTS.md — Claude Code prompt playbook

Hər blok üçün kopyala-yapışdır prompt. **Sıra ilə işlət.**

## İstifadə qaydaları

1. **Hər blokdan əvvəl `/clear`** — kontekst təmizlənir, Claude Code `CLAUDE.md`-ni yenidən oxuyur və yavaşlamır.
2. **Bir promptda bir blok.** İki blok birləşdirmə — yarımçıq iş yaranır.
3. **Prompt sonundakı `DoD` bəndini silmə** — Claude Code işini ona görə yoxlayır.
4. Səhv çıxsa: *"Build səhvi verir, çıxışı oxu və düzəlt"* — özü həll edir.
5. Blok bitəndə: `git add -A && git commit -m "..."`.

---

## Blok 0 — Skeleton & KUDS

```
PLAN.md və CLAUDE.md fayllarını oxu. Blok 0-ı icra et.

Etməli olduqların:
0. ƏVVƏLCƏ PLAN.md §8 addım 1-7-ni yoxla və natamam qalanı tamamla:
   - `npm ls tailwindcss` v3.4 olmalıdır (v4-dürsə endir)
   - `ls tailwind.config.*` YALNIZ .ts qaytarmalıdır. tailwind.config.js
     varsa SİL — Tailwind .js-i .ts-dən əvvəl oxuyur və KUDS konfiqi
     səssizcə nəzərə alınmır.
   - `ls postcss.config.*` YALNIZ bir fayl qaytarmalıdır (.js). v4-dən
     qalan postcss.config.mjs varsa sil.
   - `tailwindcss-animate` quraşdırılmış olmalıdır (konfiq onu tələb edir).
1. shadcn/ui-ı qur (ƏGƏR hələ qurulmayıbsa) və CLAUDE.md-dəki məcburi
   komponentlərin hamısını əlavə et.
   ⚠️ `shadcn init` globals.css və tailwind konfiqini öz şablonu ilə üzərinə
   yazır — buna görə O ƏVVƏL, snippetlər SONRA gəlir.
2. İNDİ tailwind.config.ts və src/app/globals.css fayllarını snippets/
   qovluğundakı versiyalarla əvəz et (KUDS tokenləri).
   DİQQƏT: config Tailwind-in default spacing şkalasını ƏVƏZ ETMİR, `extend`
   ilə əlavə edir — bu qəsdəndir, shadcn primitivləri h-9/py-1.5 işlədir.
   Əvəzləmədən sonra `npm run dev` işlədib /-in hələ də render olunduğunu yoxla.
3. Poppins fontunu next/font/google ilə qur, fallback Tahoma. CSS dəyişəni
   --font-poppins olsun, root layout-da tətbiq et.
4. Üç layout yarat:
   - src/layouts/PublicShell.tsx  — üst header + footer, giriş etməmişlər üçün
   - src/layouts/AppShell.tsx     — 280px sol sidebar + 72px üst header
   - src/layouts/AdminShell.tsx   — AppShell variantı, admin naviqasiyası ilə
   Sidebar mobil ekranda shadcn Sheet-ə çevrilsin.
5. src/app/kuds/page.tsx — daxili stil bələdçisi səhifəsi yarat. Orada göstər:
   bütün rəng tokenləri (hex + istifadə qeydi ilə), 8 tipoqrafiya səviyyəsi,
   spacing şkalası, radius nümunələri, 3 kölgə, bütün düymə variantları
   (primary / secondary=outline / accent / danger / disabled / loading), kart,
   form elementləri, badge, avatar, modal, cədvəl, boş vəziyyət, skeleton.
   Hər rəng nümunəsinin yanında ağ və tünd mətnlə kontrast nisbətini yaz.
   KUDS Secondary = outline: variant="secondary" İŞLƏTMƏ.
6. src/lib/enums.ts — PLAN.md və prisma/schema.prisma-dakı BÜTÜN enum
   dəyərlərini Zod enum kimi təyin et (Visibility, PostCategory, PostKind,
   MemoryType, AchievementCategory, AchievementStatus, EventScope,
   EventCategory, EventStatus, RsvpStatus, CohortRole, SystemRole, UserStage,
   NotificationType, ReportReason, ReportStatus, GuideCategory, Industry,
   PostStatus, TimelineSourceType, SupportOfferType, Degree).

Qaydalar: hardcode rəng/ölçü yoxdur, yalnız Tailwind tokenləri. src/pages/
qovluğu yaratma. src/components/ui/ altındakı shadcn fayllarına toxunma.

DoD: `npm run dev` işləyir, /kuds səhifəsi bütün komponentləri KUDS-a uyğun
göstərir, `npx tsc --noEmit` və `npm run build` təmizdir. Bitəndə commit et.
```

---

## Blok 1 — Data qatı & seed

```
/clear etdikdən sonra: PLAN.md və CLAUDE.md oxu. Blok 1-i icra et.

1. Prisma qur. prisma/schema.prisma artıq hazırdır — ONU DƏYİŞMƏ, sadəcə
   `npx prisma validate` işlət, səhv varsa mənə de.
2. `npx prisma migrate dev --name init`
3. src/lib/db.ts — PrismaClient singleton (dev hot-reload üçün globalThis).
4. src/lib/stage.ts:
   - resolveStage({ academicStartsAt, graduatesAt }, now) → INCOMING|STUDENT|ALUMNI
     (bu iki sahə Cohort modelindədir — admissionYear/graduationYear yalnız etiketdir)
   - academicYearOf(date) → "2026-2027" (sentyabr 1 – avqust 31)
   - syncUserStage(userId) — User.stage keşini cohort-a görə yeniləyir
5. prisma/seed.ts yaz və işlət. Realistik həcm:
   - 4 fakültə, 10 ixtisas
   - 6 cohort: 2 INCOMING (2026 qəbul), 2 STUDENT (2023-2024 qəbul),
     2 ALUMNI (2018-2019 qəbul) — hər birinə academicStartsAt/graduatesAt ver
   - 120 istifadəçi, real azərbaycanca ad-soyad, cohort-lara paylanmış
   - hər istifadəçi üçün FieldVisibility sətirləri (phone/personalEmail PRIVATE,
     qalanı qarışıq PUBLIC/UNIVERSITY/CLASS)
   - 40 Tag (maraq/hobbi/bacarıq/dil) və UserTag bağlantıları
   - 300 post: 12 kateqoriyaya paylanmış, ~40%-i showOnTimeline, ~15%-i
     showInAchievements, görünürlük səviyyələri qarışıq
   - hər showOnTimeline post üçün TimelineEntry
   - 150 şərh, 400 reaksiya
   - 80 Achievement (SUBMITTED/VERIFIED/FEATURED/ARCHIVED qarışıq)
   - 60 Memory (8 növ üzrə)
   - 25 Event (15 keçmiş + 10 gələcək) + hər birinə 10-30 RSVP
   - ALUMNI cohort üzvləri üçün CareerEntry (15 ölkə, 40 şirkət, 8 sənaye)
     — ~70%-i includeInStats: true
   - 25 EducationEntry, 40 SupportOffer
   - 6 Club + üzvlüklər
   - 30 GuidePlace (Xankəndi, 11 kateqoriya üzrə)
   - 20 Faq, 8 ContentPage
   - 5 test hesabı, hamısının şifrəsi Test1234! (hər rol üçün bir dənə):
       admin@qu.edu.az        UNIVERSITY_ADMIN + MEMBER (bir STUDENT cohort-da
                              — cohort-suz qalsa /home yönləndirməsi sınır)
       moderator@qu.edu.az    USER + CLASS_MODERATOR        (STUDENT cohort)
       rep@qu.edu.az          USER + CLASS_REPRESENTATIVE   (STUDENT cohort)
       coordinator@qu.edu.az  USER + EVENT_COORDINATOR      (STUDENT cohort)
       alumni@qu.edu.az       USER + MEMBER                 (ALUMNI cohort)
   - 25 Event üçün category (MEETING|TRIP|SEMINAR|WORKSHOP|CEREMONY|
     COMPETITION|SOCIAL|CAREER|OTHER) — REUNION category DEYİL, scope-dur.
     scope=FACULTY olanlara facultyId ver, 3 tədbir scope=REUNION olsun.
   Şifrələr bcrypt ilə hash-lənsin. Deterministik olsun (seeded random) ki,
   təkrar işlədəndə eyni nəticə çıxsın.
6. package.json-a prisma.seed skripti əlavə et (tsx ilə).
7. Avatar-lar üçün DiceBear API URL-ləri işlət (xarici şəkil yükləmə yoxdur):
   https://api.dicebear.com/7.x/avataaars/svg?seed=<name>
   next.config.ts-də bu domeni images.remotePatterns-ə əlavə et.

DoD: `npx prisma studio` açılır, bütün cədvəllər doludur, heç bir cədvəl boş
deyil. Commit et.
```

> 💡 Seed mətnlərini (bio, xatirə, Xankəndi təsvirləri) Cowork sessiyasında
> hazırlatdırıb JSON kimi `prisma/seed-data/` qovluğuna qoysan, bu blok
> 2 dəfə sürətli bitir.

---

## Blok 2 — Auth & rollar

```
/clear. PLAN.md, CLAUDE.md oxu. Blok 2-ni icra et.

1. Auth.js v5 (next-auth@beta) qur. Credentials provider, bcrypt ilə şifrə
   yoxlaması. JWT sessiya strategiyası.
2. Sessiya token-inə əlavə et: userId, systemRole, stage.
3. src/lib/auth.ts:
   - auth(), signIn(), signOut() ixracları
   - getViewer(): Promise<Viewer> — sessiyadan Viewer obyektini qurur
     (userId + cohortIds + systemRole + moderatedCohortIds). cohortIds tək
     sorğu ilə CohortMembership-dən gəlsin.
   - requireUser(), requireAdmin(), requireCohortRole(cohortId, roles[])
     — icazə yoxdursa Next.js `forbidden()` / redirect.
   Qeyd: JWT strategiya işlədilir, Session/Account/VerificationToken cədvəlləri
   YOXDUR və lazım deyil. E-poçt təsdiqi v1-in əhatəsində deyil.
4. Səhifələr: /login, /register, /logout
   Qeydiyyat formu (RHF + Zod): ad, soyad, e-poçt, şifrə, fakültə, ixtisas,
   qəbul ili. E-poçt @qu.edu.az ilə bitməlidir (Zod refine) — domen sabiti
   src/lib/constants.ts-də saxlanılsın, hardcode etmə.
   Uyğun Cohort tapılır → CohortMembership yaradılır →
   default FieldVisibility sətirləri yaradılır (snippets/visibility.ts-dəki
   defaultLevelFor funksiyası ilə).
5. src/middleware.ts: (app)/* → auth tələb edir; (admin)/* → UNIVERSITY_ADMIN.
6. AppShell header-ində istifadəçi menyusu (avatar + dropdown).
7. syncUserStage(userId)-i HƏR uğurlu girişdə çağır (Auth.js `signIn`
   callback-i) — User.stage yalnız keşdir, cohort tarixlərinə görə yenilənməsə
   köhnəlir. Cron QURMA: giriş anında sinxronlaşma v1 üçün kifayətdir,
   UI isə həmişə resolveStage()-in nəticəsini göstərir.
8. /home route: istifadəçinin əsas (isPrimary) cohort-una yönləndirir.
   cohortIds BOŞDURSA yönləndirmə yoxdur — cohort seçmə/gözləmə ekranı göstər.
   Bu real haldır (yeni admin, hələ cohort-a bağlanmamış istifadəçi).

DoD: 5 seed hesabının hər biri ilə giriş edirsən, hər biri düzgün səhifələri
görür, /admin-ə student girişi 403 verir. tsc + build təmiz. Commit et.
```

---

## Blok 3 — 🔒 Məxfilik mühərriki (ƏN VACİB)

```
/clear. PLAN.md §4.3 və CLAUDE.md-nin məxfilik bölməsini DİQQƏTLƏ oxu.
Blok 3-ü icra et.

1. snippets/visibility.ts faylını src/lib/visibility.ts-ə OLDUĞU KİMİ köçür.
   Bu fayl Prisma-dan asılı deyil və `tsc --strict` altında təmiz kompilyasiya
   olunur — məzmununu DƏYİŞMƏ. Yalnız `npx tsc --noEmit` işlədib təsdiqlə.
2. src/services/ qatını qur. Hər fayl `Viewer`-i BİRİNCİ arqument kimi alır:
   - services/post.service.ts       listFeed, getPost, createPost, deletePost
   - services/user.service.ts       getProfile, listDirectory, updateProfile
   - services/timeline.service.ts   listTimeline
   - services/achievement.service.ts
   - services/memory.service.ts
   - services/event.service.ts
   - services/stats.service.ts
   Hamısında `visibilityWhere<W>(viewer, ownerField)` Prisma where şərtinə
   birləşdirilir. ownerField: Post/Memory → "authorId", Achievement → "ownerId",
   Event → "createdById".
   ⚠️ Status filtri üçün `visibleWithStatus(viewer, [...])` işlət.
   `activeVisibleWhere` "ACTIVE" sabitini işlədir — yalnız Post və Memory üçün.
   Achievement statusları VERIFIED|FEATURED, Event statusları
   PUBLISHED|COMPLETED-dir; səhv işlətsən sıfır nəticə alarsan.
   HEÇ BİR yerdə nəticə massivini JS-də filtrləmə.
   Əlavə olaraq services/user.service.ts-də buildProfileView(userId) yaz:
   User sütunları + düzləndirilmiş əlaqələr (interests, hobbies, skills,
   languages, clubs, careerHistory, education) + cohortIds → ProfileView.
   redactProfile YALNIZ bu obyektlə işləyir; düzləndirməsən həmin 7 məxfilik
   açarı səssizcə işləməz.
3. /me/privacy səhifəsi [M14] (spesifikasiya §5):
   - CONTROLLED_PROFILE_FIELDS-in hamısı üçün 4 səviyyəli seçici
   - Səviyyələr qruplaşdırılmış bölmələrdə: Əsas / Əlaqə / Maraqlar / Karyera
   - Hər səviyyənin yanında izah: "Kim görə bilər: ..."
   - "Hamısını dəyiş" toplu əməliyyat düymələri
   - Server Action ilə saxlanma, optimistic UI
4. Komponentlər:
   - src/components/shared/VisibilitySelector.tsx — 4 seçimli, ikonlu
     (Globe / Building2 / Users / Lock)
   - src/components/shared/VisibilityBadge.tsx — kompakt göstərici
5. "Preview as" funksiyası: /u/[userId]?as=anonymous|university|class
   — istifadəçi öz profilinə başqasının gözü ilə baxır. Yalnız öz profilində
   işləsin. Yuxarıda xəbərdarlıq banner-i göstər.
6. src/lib/visibility.test.ts (Vitest) — matris testi:
   4 görünürlük səviyyəsi × 4 viewer tipi (anonim / sahib / eyni sinif /
   fərqli sinif) = 16 hal. Üstəlik:
   - PRIVATE-ı admin də oxuya bilmir
   - visibilityWhere ANONYMOUS üçün yalnız PUBLIC qaytarır
   - narrowest() Timeline-ın mənbədən açıq olmasına imkan vermir
   - suppressSmallBuckets 3-dən az xanaları gizlədir

DoD: `npm run test` yaşıldır (16+ test). Incognito brauzerdə CLASS səviyyəli
məzmun görünmür. "Preview as: Anonim" real olaraq sahələri gizlədir.
Commit et: "feat: 4-level privacy engine with DB-level filtering".
```

---

## Blok 4 — Class Feed

```
/clear. PLAN.md Blok 4-ü oxu və icra et.

1. /api/upload route handler: multipart, `sharp` ilə şəkil optimizasiyası
   (max 1600px, webp), public/uploads/YYYY/MM/ altına yazır, MediaAsset
   qaytarır. Ölçü limiti 10MB, MIME whitelist.
   Bunu src/services/storage.ts arxasına gizlə ki, sonradan S3-ə keçirilə bilsin.
2. features/feed/PostComposer.tsx:
   - kateqoriya seçimi (12 seçim) — MƏCBURİ, Zod ilə
   - növ (spesifikasiya §6 — SƏKKİZ növ, beşi deyil):
     TEXT / PHOTO / ALBUM / VIDEO / LINK / EVENT / ACHIEVEMENT / MEMORY
     EVENT seçiləndə mövcud tədbirə istinad (Post.referencedEventId),
     ACHIEVEMENT seçiləndə nailiyyət sahələri, MEMORY seçiləndə xatirə növü
     inline göstərilir
   - şəkil sürükle-burax, çoxlu fayl, önizləmə, sıralama
   - VisibilitySelector
   - iki checkbox: "Class Timeline-a əlavə et" / "Class Achievements-ə əlavə et"
   - occurredAt tarix seçici (keçmiş tarix üçün)
3. createPost Server Action — prisma.$transaction içində:
   Post → (showOnTimeline ? TimelineEntry) → (showInAchievements ? Achievement)
   → Notification-lar. TimelineEntry-də visibility post-dan KOPYALANIR
   (əlavə tavan yoxdur), academicYear academicYearOf(occurredAt) ilə hesablanır,
   category post-dan götürülür.
4. features/feed/PostCard.tsx: müəllif başlığı, kateqoriya badge,
   VisibilityBadge, media qalereyası (lightbox), reaksiya düymələri,
   şərh bölməsi (lazy), sahibi üçün redaktə/sil menyusu, şikayət düyməsi.
5. /api/feed — cursor pagination (createdAt + id), 20 element.
   features/feed/FeedList.tsx — useInfiniteQuery, skeleton, empty state.
6. Kateqoriya filtri (URL-də saxlanılır).
7. deletePost Server Action. DİQQƏT: soft delete olduğu üçün sxemdəki
   onDelete: Cascade İŞƏ DÜŞMÜR — TimelineEntry-ni açıq şəkildə sil:
     await prisma.$transaction([
       prisma.post.update({ where: { id }, data: { status: "DELETED" } }),
       prisma.timelineEntry.deleteMany({ where: { postId: id } }),
       prisma.achievement.updateMany({ where: { postId: id }, data: { status: "ARCHIVED" } }),
     ]);
   Eyni məntiq "Timeline icazəsini ləğv et" əməliyyatı üçün də lazımdır
   (showOnTimeline false olanda TimelineEntry silinir) — spesifikasiya §7.

DoD: Paylaşım yaradıb Timeline-a əlavə edirsən → /class/[slug]/timeline-da
görünür. Postu silirsən → Timeline-dan yox olur. İnfinite scroll işləyir.
Commit et.
```

---

## Blok 5 — Class Page ana səhifəsi + Incoming Class

```
/clear. PLAN.md Blok 5 və §4.6 (mərhələ keçidi) oxu. İcra et.

1. /class/[slug]/page.tsx — 14 bloklu ana görünüş, spesifikasiya §16 sırası ilə:
   cover + əsas məlumatlar / sinif adı + məzuniyyət ili / üzv sayı /
   welcome message / qarşıdan gələn tədbirlər / Class Feed önizləmə (5 post) /
   son nailiyyətlər / Timeline-dan son hadisələr / yeni üzvlər /
   son xatirələr / Directory keçidi / Where Are We Now xülasəsi /
   "Tədbir yarat" / "Paylaşım yarat" düymələri.
2. ClassHome komponenti `stage` prop-una görə widget SIRASINI dəyişir
   (PLAN.md §4.6-dakı cədvəl). Üç ayrı səhifə YAZMA — bir komponent, bir massiv.
3. Incoming rejimi (features/class-home/incoming/):
   - "Özünü təqdim et" onboarding sihirbazı (4 addım, tamamlanma faizi)
   - Tanışlıq kartları: "sənin kimi maraqları olanlar" (Tag üst-üstə düşməsi)
   - Kampusa hazırlıq materialları (ContentPage section=NEWCOMERS)
   - Xankəndi bələdçisinə keçid kartı
4. Bütün widget-lər Server Component, məlumat services/ qatından, hər biri
   öz Suspense + skeleton-u ilə.

DoD: Üç fərqli cohort-a girirsən (INCOMING / STUDENT / ALUMNI), hər biri
fərqli düzülüş göstərir. Commit et.
```

---

## Blok 6 — Class Directory + Axtarış

```
/clear. PLAN.md Blok 6 oxu. İcra et.

1. /class/[slug]/directory — profil kartı grid (KUDS: radius 12, shadow SM,
   padding 24, gap 24). Kartda: avatar, ad-soyad, fakültə/ixtisas, qəbul/
   məzuniyyət ili, maraq çipləri, hazırkı şəhər, fəaliyyət sahəsi —
   HAMISI redactProfile-dan keçmiş.
2. 13 filtr (spesifikasiya §8): ad, fakültə, ixtisas, qəbul ili, məzuniyyət ili,
   şəhər, ölkə, fəaliyyət sahəsi, şirkət, maraqlar, dil bacarıqları,
   tələbə klubu, status (tələbə/məzun).
   Sol tərəfdə filtr paneli (mobil: Sheet). Aktiv filtrlər çip kimi yuxarıda,
   "hamısını təmizlə" düyməsi.
3. Filtr vəziyyəti URL search params-da (nuqs istifadə et) — link paylaşıla bilir.
4. Server tərəfdə pagination (24 kart/səhifə), shadcn Pagination.
5. /search — qlobal axtarış: istifadəçi + post + tədbir + nailiyyət, tab-larla
   ayrılmış. Debounce 300ms. Header-də ⌘K command palette (shadcn Command).
6. Filtr seçimlərini (fakültə, ixtisas, şəhər, şirkət siyahıları) DB-dən
   distinct sorğularla gətir, hardcode etmə.

DoD: Filtr kombinasiyaları işləyir, URL paylaşılanda eyni nəticə açılır,
gizli sahələr kartda görünmür (fərqli hesabla yoxla). Commit et.
```

---

## Blok 7 — My Class Story

```
/clear. PLAN.md Blok 7 oxu. İcra et.

DİQQƏT: Bu səhifə CV DEYİL. Spesifikasiya §9 bunu xüsusi vurğulayır — şəxsi
inkişaf HEKAYƏSİ formatında olmalıdır. Vizual, xronoloji, emosional.

1. /u/[userId] — public profil:
   - Hero: cover + avatar + ad + cohort + fakültə/ixtisas + doğma şəhər
   - "Mənim haqqımda" bölməsi
   - Üç sual-cavab kartı: nə öyrənmək istəyirəm / mənə nə üçün müraciət et /
     gözləntilərim
   - Çip qrupları: maraqlar, hobbilər, bacarıqlar, dillər (səviyyə ilə), klublar
   - Seçilmiş paylaşımlar (masonry grid)
   - İştirak etdiyi tədbirlər
   - Nailiyyətlər (VERIFIED olanlar nişanlı)
   - Xatirələr (showInProfile = true olanlar)
2. Alumni rejimi (stage = ALUMNI) əlavə bölmələr:
   - Karyera timeline-ı (şaquli, CareerEntry-dən)
   - Təhsil (EducationEntry)
   - Hazırkı iş yeri / vəzifə / sənaye / ölkə-şəhər
   - Gələcək planlar
   - Dəstək təklifləri: 7 növ, rozet kartları şəklində, "əlaqə saxla" düyməsi
3. /me/edit — profil redaktəsi, RHF + Zod, bölmələrə ayrılmış tab-lar.
   HƏR sahənin yanında inline VisibilitySelector (kiçik ikon düymə).
   Avatar/cover yükləmə.
4. /me/career — alumni karyera və təhsil qeydlərinin CRUD-u, hər qeydin
   yanında `includeInStats` açarı və izahı: "Bu qeyd Where Are We Now
   statistikasında anonim şəkildə istifadə olunsun".
5. Preview as (Blok 3-dən) bu səhifədə işləməlidir.

DoD: Tələbə və məzun profillərinin ikisi də dolu və gözəl görünür.
Preview as ilə sahələrin gizləndiyini görürsən. Commit et.
```

---

## Blok 8 — Timeline + Achievements

```
/clear. PLAN.md Blok 8 oxu. İcra et.

1. /class/[slug]/timeline — şaquli xronoloji timeline:
   - Tədris ilinə görə qruplaşdırılmış (sticky il başlığı)
   - Hər sətir: tarix, kateqoriya ikonu, başlıq, xülasə, media önizləmə,
     mənbəyə keçid
   - Sistem milestone-ları fərqli stildə (ku-green nöqtə, daha qalın)
   - Framer Motion ilə scroll-a görə görünmə animasiyası (reduced-motion-a hörmət)
2. Filtrlər (spesifikasiya §10): tədris ili, kateqoriya, tədbir, fakültə,
   ixtisas, dövr (tələbəlik / alumni). URL-də saxlanılır.
3. /class/[slug]/achievements:
   - Üst hissədə FEATURED nailiyyətlər vitrini (böyük kartlar)
   - 12 kateqoriya üzrə tab / filtr
   - Status nişanları: SUBMITTED (boz) / VERIFIED (yaşıl ✓) / FEATURED (qızılı ★)
     / ARCHIVED (solğun)
   - Statistika zolağı: ümumi say, kateqoriya üzrə paylanma (Recharts bar)
4. Moderator axını: CLASS_MODERATOR və ya UNIVERSITY_ADMIN nailiyyəti
   VERIFIED / FEATURED / ARCHIVED edə bilir, qeyd yaza bilir.
   Hər status dəyişikliyi → sahibinə Notification + AuditLog sətri.
   /admin/achievements — bütün cohort-lar üzrə SUBMITTED növbəsi (KUDS §14
   cədvəl tələbləri ilə: sort, filter, pagination, search, export).
5. Nailiyyət əlavə etmə formu (Feed-dən kənar birbaşa yol da olsun).

DoD: Timeline filtrləri işləyir, moderator təsdiq edir, sahibinə bildiriş gedir.
Commit et.
```

---

## Blok 9 — Events & Reunion

```
/clear. PLAN.md Blok 9 oxu. İcra et.

1. Tədbir yaratma formu — spesifikasiya §14-dəki 10 sahə:
   ad, təsvir, tarix-saat (başlama/bitmə), məkan, onlayn keçid, iştirakçı
   limiti, qeydiyyat son tarixi, proqram (markdown), əlaqələndirici şəxs,
   görünürlük səviyyəsi.
   Bizim əlavələrimiz (spec-də yoxdur, filtrlər üçün lazımdır):
   scope (UNIVERSITY/FACULTY/CLUB/CLASS/REUNION) — təşkilatçı səviyyəsi,
   category (MEETING/TRIP/SEMINAR/WORKSHOP/CEREMONY/COMPETITION/SOCIAL/
   CAREER/OTHER) — tədbirin növü, iki siyahı KƏSİŞMİR,
   facultyId (scope=FACULTY olduqda).
   Yalnız CLASS_REPRESENTATIVE / EVENT_COORDINATOR / UNIVERSITY_ADMIN.
2. /events/[id] — tədbir detalı:
   - Cover, məlumatlar, proqram, xəritə linki
   - RSVP düymələri: Qəbul et / Rədd et / Qeydiyyatdan keç
   - Tutum dolubsa gözləmə siyahısı
   - İştirakçı avatarları (görünürlüyə hörmətlə)
   - "Təqvimə əlavə et" → .ics faylı generasiyası (/api/events/[id]/ics)
3. Tədbirdən sonra:
   - Foto albom yükləmə (MediaAsset, eventId ilə)
   - Rəy sorğusu: 1-5 ulduz + mətn
   - İştirak statistikası (qeydiyyat / gəlmə nisbəti — Recharts)
   - "Class Timeline-a əlavə et" düyməsi → TimelineEntry
4. /events/[id]/manage — Event Coordinator paneli:
   - Dəvət olunanlar / qeydiyyatlar cədvəli (KUDS §14: sort, filter,
     pagination, search, export CSV, responsive)
   - Toplu bildiriş göndərmə
   - Qeydiyyat təsdiqi, check-in
   - Yekun hesabat (PDF deyil, çap üçün stillənmiş səhifə kifayətdir)
5. /class/[slug]/events + qarşıdan gələn tədbirlər bloku [M12] (spec §15):
   6 filtr — tarix, kateqoriya, təşkilatçı, fakültə, klub, onlayn/üzbəüz.
6. Reunion xüsusi hal: YALNIZ scope = "REUNION" ilə işarələnir (category ilə
   YOX — scope təşkilatçı səviyyəsi, category tədbir növüdür və dəyər
   siyahıları kəsişmir). ALUMNI cohort-larında görünür, fərqli vizual
   (ku-cream accent).

DoD: Tədbir yaradıb qeydiyyatdan keçirsən, .ics yüklənir, coordinator
paneli CSV export edir. Commit et.
```

---

## Blok 10 — Share Memories + Where Are We Now

```
/clear. PLAN.md Blok 10 oxu. İcra et.

A) SHARE MEMORIES [M9] (spesifikasiya §11)
1. /class/[slug]/memories — Feed-dən VİZUAL OLARAQ FƏRQLİ olmalıdır:
   hekayəvi, böyük tipoqrafiya, masonry düzülüş, yumşaq fon rəngləri
   (ku-soft / ku-blue / ku-cream növbələşən), sitat üslubu.
2. Xatirə yaratma: 8 növ seçimi (qısa xatirə, universitet hekayəsi,
   müəllimə təşəkkür, sinif yoldaşına təşəkkür, unudulmaz dərs,
   yaddaqalan hadisə, universitetin qazandırdıqları, QU-ya mesaj).
   "Kimə həsr olunub" sahəsi (müəllim/sinif yoldaşı).
3. DÖRD ayrıca göstərilmə açarı (spesifikasiya §11): profilimdə / Feed-də /
   Timeline-da / gələcək Digital Yearbook-da. Bunlar bir-birindən müstəqildir.
4. Növ üzrə filtr + "təsadüfi xatirə" düyməsi.

B) WHERE ARE WE NOW [M11] (spesifikasiya §13)
5. /api/stats/where-are-we-now — aqreqasiya:
   - YALNIZ includeInStats = true olan CareerEntry/EducationEntry
   - suppressSmallBuckets() ilə 3-dən az xanalar "Digər"ə yığılır
   - coarsenLocation() — heç bir dəqiq ünvan/koordinat qaytarılmır
6. /class/[slug]/map — spesifikasiya §13-dəki YEDDİ vizualın hamısı:
   (1) dünya xəritəsi (react-simple-maps, TopoJSON, choropleth — ku-green şkalası)
   (2) Azərbaycan xəritəsi (regionlar üzrə)
   (3) şəhərlər üzrə paylanma (Recharts horizontal bar, top 15)
   (4) ölkələr üzrə paylanma (Recharts bar)
   (5) şirkətlər üzrə statistika (top 20 siyahı + say)
   (6) sənaye sahələri üzrə diaqram (Recharts pie)
   (7) təhsil pillələri üzrə göstəricilər (Recharts donut)
   - Xülasə kartları: "24 məzun Azərbaycanda", "40% təhsil sektorunda" tipli
7. Hər qrafikin altında qeyd: "Yalnız razılıq vermiş məzunların məlumatları
   əsasında. Fərdi məkan göstərilmir." + neçə nəfərin razılıq verdiyi.

DoD: Statistikalar seed data-dan real rəqəmlər verir. Bir istifadəçinin
includeInStats-ını söndürüb rəqəmlərin dəyişdiyini yoxla. Commit et.
```

---

## Blok 11 — Welcome Page + Xankəndi + Bildirişlər + Admin

```
/clear. PLAN.md Blok 11 oxu. İcra et.

A) PUBLIC WELCOME PAGE [M1] + UNIVERSITY INFO [M2] (spec §2) — / route, auth yoxdur
   Bölmələr: hero (şüar: "Bir sinif. Bir hekayə. Ömürlük əlaqə.") /
   universitet haqqında / tarix və missiya / fakültələr və ixtisaslar grid /
   tələbə klubları / kampus həyatı / tələbə xidmətləri / yeni tələbələr üçün
   vacib məlumatlar / qarşıdan gələn açıq tədbirlər (visibility=PUBLIC) /
   FAQ akkordeonu / platformaya giriş CTA.
   Məzmun ContentPage və Faq cədvəllərindən gəlir.
   SEO: metadata, OG şəkilləri. ISR (revalidate: 3600).

B) XANKƏNDİ BƏLƏDÇİSİ [M3] (spec §3) — /khankendi
   11 kateqoriya — spec §3-ün 10 bəndindən genişləndirilib ("marketlər" və
   "gündəlik xidmətlər" ayrılıb, "xəritə" kateqoriya yox, görünüş kimi həll
   olunub): (tarix, məkanlar, nəqliyyat, universitetə yol, marketlər,
   xidmətlər, sağlamlıq, mədəniyyət, istirahət, təhlükəsizlik, məsləhətlər).
   Kart grid + kateqoriya filtri. Təcili əlaqə nömrələri ayrıca vurğulanmış
   bölmədə (isEmergency = true). Koordinatı olan yerlər üçün sadə xəritə
   görünüşü.

C) BİLDİRİŞLƏR [M15] — /notifications
   Siyahı, oxunmuş/oxunmamış, növ filtri, "hamısını oxunmuş et".
   Header-də zəng ikonu + oxunmamış sayı badge. Polling 60s (React Query).

D) MODERASİYA & ADMİN [M17] (spec §17)
   - /admin — statistika dashboard (Recharts): istifadəçi artımı, post sayı,
     cohort üzrə fəallıq, nailiyyət paylanması
   - /admin/moderation — şikayət növbəsi (KUDS cədvəl tələbləri ilə),
     məzmunu aç / gizlət / rədd et, canModerate() + AuditLog məcburi
   - /admin/users — istifadəçi siyahısı, rol dəyişikliyi, cohort bağlantısı
   - /admin/cohorts — cohort yaratma/redaktə, üzv idarəetməsi
   - /admin/cohorts/import — CSV SIS import (services/sis-import.ts):
     ad, soyad, e-poçt, fakültə, ixtisas, qəbul ili sütunları; önizləmə →
     təsdiq → toplu yaratma, xəta hesabatı
   - /admin/content — ContentPage / Faq / GuidePlace CMS
   - /admin/audit — AuditLog görünüşü
   - Şikayət düyməsi PostCard, Comment, Memory, Achievement, profil
     komponentlərinə əlavə edilir

DoD: Anonim brauzerdə / tam yüklənir. Şikayət göndərib admin panelində
həll edirsən, AuditLog sətri yaranır. Commit et.
```

---

## Blok 12 — Keyfiyyət keçidi

```
/clear. PLAN.md Blok 12 oxu. İcra et. Bu blok YENİ FUNKSİYA əlavə etmir —
mövcud olanı cilalayır.

1. KUDS AUDİTİ:
   - `grep -rn "#[0-9a-fA-F]\{3,6\}" src/ --include=*.tsx --include=*.ts \
        --exclude-dir=ui`
     → tapılan hər hardcode rəngi token ilə əvəz et (globals.css istisna)
   - `grep -rEn "\b(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space-[xy])-(5|7|9|10|11|14|20)\b" \
        src/ --exclude-dir=ui`
     → KUDS spacing şkalasına gətir (1,2,3,4,6,8,12,16,24).
     ⚠️ src/components/ui/ QƏSDƏN istisnadır — shadcn primitivləri h-9/py-1.5
     işlədir və onlara toxunmaq qadağandır.
   - `grep -rn "variant=\"secondary\"" src/ --exclude-dir=ui`
     → KUDS §11-ə görə Secondary = outline. Hamısını variant="outline" et.
   - `grep -rnE "(^|[^-])text-secondary\b" src/ --exclude-dir=ui`
     → `text-text-secondary` olmalıdır (bu şablon düzgün istifadəni saymır)
   - Ağ mətn semantik fon üzərində: `bg-success`, `bg-danger`, `bg-warning`
     ilə `text-white` birləşməsini axtar → `-strong` variantına keçir
     (warning-də isə tünd mətnə).
   - shadcn ui/ fayllarında dəyişiklik olub-olmadığını yoxla (`git log`)
   - Bütün ikonların lucide-react-dən gəldiyini təsdiqlə

2. ACCESSIBILITY (KUDS §21, WCAG 2.2):
   - @axe-core/react qur, dev-də konsol xəbərdarlıqlarını təmizlə
   - Hər interaktiv element klaviatura ilə əlçatan olsun (Tab sırası məntiqli)
   - Bütün şəkillərdə alt, bütün ikon düymələrində aria-label
   - Modal-larda focus trap, Esc ilə bağlanma
   - Skip-link işləsin
   - Semantik HTML: main, nav, aside, article, section
   - Rəng kontrastını yoxla — ku-soft/ku-blue/ku-cream üzərində ağ mətn OLMASIN

3. PERFORMANCE (KUDS §22):
   - Bütün <img> → next/image, sizes atributu ilə
   - Xəritə, Recharts, Tiptap → next/dynamic ilə lazy
   - Public səhifələrdə ISR
   - Lighthouse işlət, Performance ≥ 90 hədəf

4. RESPONSIVE (KUDS §9):
   Hər əsas səhifəni 375 / 768 / 1024 / 1280 / 1536 px-də yoxla.
   Sidebar mobil-də Sheet, cədvəllər mobil-də kart görünüşü.

5. VƏZİYYƏTLƏR:
   Hər siyahı üçün loading skeleton + empty state (illüstrasiya + izah + CTA)
   + error boundary. Heç bir yerdə ağ boş ekran qalmasın.

6. TESTLƏR:
   - Vitest: visibility matrisi (artıq var), timeline axını (post → timeline →
     silmə), cohort həlli, academicYear hesablanması, suppressSmallBuckets
   - Playwright smoke (5 ssenari):
     1) Anonim istifadəçi welcome page-i görür, CLASS postu görmür
     2) Giriş → feed-də post yaratma → timeline-da görünmə
     3) Məxfilik dəyişikliyi → preview as ilə təsdiq
     4) Tədbir yaratma → RSVP
     5) Admin → şikayət həlli

7. YEKUN: `npx tsc --noEmit && npm run lint && npm run build && npm run test`
   Dördü də təmiz olmalıdır.

DoD: Hamısı yaşıl, Lighthouse ≥ 90, axe kritik xəta yoxdur. Commit et.
```

---

## Blok 13 — Təhvil paketi

```
/clear. PLAN.md Blok 13 oxu. İcra et.

1. README.md:
   Layihə adı + şüar / Problem / Həll / Demo GIF yeri / Xüsusiyyətlər
   (17 modul, qısa) / Texnoloji stack / Arxitektura (Mermaid diaqram) /
   Məxfilik modeli izahı / Quraşdırma addımları (kopyala-işlət) /
   Test hesabları / Ekran görüntüləri / Komanda / Lisenziya
2. docs/ARCHITECTURE.md — Mermaid diaqramları:
   - Sistem konteksti
   - ER diaqramı (əsas 12 model)
   - Məxfilik qərar axını (flowchart)
   - Feed → Timeline sequence diagram
3. docs/DECISIONS.md — texniki qərarlar və trade-off-lar:
   niyə SQLite, niyə tək repo, niyə TimelineEntry denormalizə edilib,
   niyə pages/ → features/, niyə String enum
4. .env.example
5. docker-compose.yml (opsional, Postgres-ə keçid üçün hazır)
6. Ekran görüntüləri: Playwright ilə avtomatik çək (docs/screenshots/):
   welcome, feed, directory, class story, timeline, achievements, map,
   privacy, admin — hər biri 1440x900.
7. package.json skriptlərini yoxla və README-yə uyğunlaşdır.

DoD: Təmiz clone → README-dəki addımlarla işə düşür. Commit + tag v1.0.0.
```

---

## Faydalı ara promptlar

**Səhv düzəltmə**
```
npm run build səhv verir. Çıxışı oxu, kök səbəbi tap və düzəlt.
Simptomu gizlətmə — həqiqi problemi həll et.
```

**Məxfilik auditi**
```
src/services/ və src/app/ qovluqlarını nəzərdən keçir. Prisma sorğusu tap ki,
visibilityWhere() işlətmir və ya nəticəni JS-də filtrləyir. Hər tapıntı üçün
fayl:sətir və düzəliş təklif et.
```

**KUDS auditi**
```
Bütün src/ altında KUDS §23 qadağalarını pozan yerləri tap: hardcode rəng,
şkala xarici spacing, fərqli radius/kölgə, lucide olmayan ikon, ui/ altında
dəyişdirilmiş shadcn faylı. Siyahı ver, sonra düzəlt.
```

**Kontekst bərpası (uzun sessiyadan sonra)**
```
CLAUDE.md və PLAN.md-ni yenidən oxu. Hansı bloklar bitib, hansı qalıb —
git log və mövcud fayllara baxaraq müəyyən et və mənə qısa hesabat ver.
```

**Performans**
```
İnfinite feed yavaş işləyir. Prisma sorğularını yoxla: N+1 var? Lazımsız
include? İndeks çatışmır? Ölç, sonra düzəlt.
```
