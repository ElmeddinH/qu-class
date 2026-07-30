# Qərarlar jurnalı (ADR)

> Bu fayl **Blok 12B-də açılıb** və **Blok 13A-da tamamlanacaq**: təhvil
> paketinin qərar jurnalı burada toplanır. Hazırda yalnız 12B-nin qəsdən
> BURAXILMIŞ işi sənədləşdirilib — buraxılmış iş yazılmasa «unudulub» kimi
> oxunar, halbuki qərardır.
>
> Format: **Kontekst → Qərar → Səbəb → Hazırkı iş axını → Gələcək həll**.

---

## QD-001 — Parol sıfırlama axını QƏSDƏN yazılmayıb

**Status:** qəbul edilib (Blok 12B, 2026-07-31) · yenidən baxılacaq: e-poçt
xidməti qurulanda.

### Kontekst

Blok 12B-nin borc siyahısında «parol sıfırlama axını yoxdur» maddəsi var idi.
Standart həll üç hissədən ibarətdir: (1) birdəfəlik token saxlayan yeni cədvəl,
(2) həmin tokeni istifadəçiyə çatdıran e-poçt kanalı, (3) tokeni qəbul edən
ictimai səhifə.

### Qərar

**Bu mərhələdə kod yazılmayıb.** Nə yeni cədvəl, nə endpoint, nə səhifə.

### Səbəb

1. **E-poçt xidməti yoxdur.** Layihədə heç bir SMTP / e-poçt provayderi
   quraşdırılmayıb və stack kilidlidir (CLAUDE.md §"Stack"). Tokeni
   çatdıra bilməyən sıfırlama axını işləməyən düymədir — istifadəçi üçün
   mövcud olmayan funksiyadan da pisdir, çünki gözlənti yaradır.
2. **Sxem dəyişikliyi bu mərhələdə risklidir.** Token cədvəli yeni miqrasiya
   deməkdir; miqrasiya isə seed determinizminə və 1400+ testin oxuduğu bazaya
   toxunur. Fayda sıfırdır (bax 1), risk realdır.
3. **Yarımçıq təhlükəsizlik axını təhlükəlidir.** Çatdırılma kanalı olmadan
   qurulan «müvəqqəti şifrəni ekranda göstər» kimi həllər hesab ələ
   keçirmə vektorudur. Zəif axın YOXLUQDAN pisdir.

### Hazırkı iş axını (ölçülmüş, təxmin deyil)

- **Özü qeydiyyatdan keçən istifadəçi** şifrəsini `/register`-də təyin edir
  (`registerUser` → `hashSync(password, 10)`).
- **SIS ilə idxal edilən hesab** `UNSET_PASSWORD_HASH` (`"!unset"`) ilə yaranır
  (`services/sis-import.service.ts`) və `isPasswordUnset()` sayəsində girişə
  buraxılmır — yəni CSV faylında şifrə olmadığı üçün hesab «yarımçıq» qalır.
- ⚠️ **Bu hesab özü də qeydiyyatdan KEÇƏ BİLMİR:** `/register` e-poçt artıq
  bazada olduğuna görə `EMAIL_TAKEN` qaytarır. Yəni SIS ilə idxal edilmiş
  istifadəçinin hazırda **texniki self-service yolu yoxdur** — hesabın
  aktivləşdirilməsi üçün universitet administrasiyası ilə əlaqə saxlanılır
  (admin `/admin/users`-dən hesabı idarə edir).
  Bu məhdudiyyət `/accessibility` səhifəsindəki «bilinən məhdudiyyətlər»
  siyahısında da açıq yazılıb — sənəd və davranış ayrılmır.

### Gələcək həll (e-poçt xidməti qurulandan sonra)

1. `PasswordResetToken` modeli: `tokenHash` (xam token SAXLANMIR), `userId`,
   `expiresAt` (≈ 30 dəqiqə), `usedAt`. Tək istifadəlik.
2. `POST /api/v1/auth/forgot-password` — **enumerasiyaya bağlı**: hesab olsa da
   olmasa da eyni cavab və eyni gecikmə (mövcud giriş axını ilə eyni qayda:
   «istifadəçi yoxdur» ilə «parol səhv» fərqləndirilmir).
3. Rate-limit — `POST /api/v1/auth/login`-dəki mövcud mexanizm təkrar işlədilir.
4. `/reset-password?token=…` səhifəsi + `hashSync(password, 10)`; uğurdan sonra
   token `usedAt` ilə bağlanır və açıq sessiyalar üçün `AuditLog` sətri yazılır.
5. **SIS boşluğunun bağlanması:** eyni token mexanizmi «hesabı aktivləşdir»
   axını kimi də işlədilir — admin idxaldan sonra dəvət göndərir, istifadəçi
   şifrəsini özü təyin edir. Bu, yuxarıdakı ⚠️ maddəsini aradan qaldırır.

### Nəticələri

- ➕ Yalan vəd verən düymə yoxdur; sxem və test bazası sabit qalır.
- ➖ SIS ilə idxal edilmiş istifadəçi administrasiyadan asılıdır (əl ilə
  müdaxilə). Kiçik universitet miqyasında (14–28 nəfərlik siniflər) bu,
  idarə oluna biləndir, amma miqyas artanda ilk bağlanmalı boşluqdur.
