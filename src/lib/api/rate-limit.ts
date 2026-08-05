// ============================================================================
// src/lib/api/rate-limit.ts
// Sabit pəncərəli (fixed window) sayğaclar — `/api/v1` üçün.
//
// İKİ İSTİFADƏÇİ VAR və onların SAYMA QAYDASI FƏRQLİDİR:
//
//   1. LOGIN (`checkLoginRate` · `recordFailedLogin`) — YALNIZ UĞURSUZ cəhd
//      sayılır, uğurlu giriş sayğacı sıfırlayır. Hədəf: parol təxmini.
//
//   2. YAZMA (`consumeWriteRate`, Blok 14B) — HƏR sorğu sayılır, uğurlu da.
//      Hədəf spam-dır: 500 uğurlu paylaşım da eyni dərəcədə zərərlidir və
//      "uğursuzluğu" olmayan əməliyyatda uğursuzluq saymağın mənası yoxdur.
//      Ona görə yoxlama və artırma TƏK çağırışdadır (`consume`), login-dəki
//      iki addımlı (`check` + `record`) nümunə TƏKRARLANMIR.
//
// 🔴 LİMİTSİZ YAZMA ENDPOINT-İ SPAM QAPISIDIR. `POST` / `PATCH` / `DELETE`
// hər biri transaksiya, bildiriş yayımı və (silmədə) audit sətri deməkdir —
// yəni bir sorğu onlarla sətir yaradır. Bu, "gözəl olardı" deyil, sənədləşmiş
// təhlükəsizlik tələbidir; aşan sorğu 429 + `Retry-After` alır.
//
// 🔴 MƏHDUDİYYƏT AÇIQ YAZILIR: sayğac MODUL SƏVİYYƏSİNDƏ `Map`-dir, yəni
// YALNIZ BİR Node prosesi üçün işləyir. İki instans (horizontal scale,
// serverless soyuq başlangıc, Vercel-in bir neçə region-u) hər biri öz
// sayğacını saxlayır və faktiki hədd N dəfə artır. İstehsalda bunun yerini
// paylaşılan saxlanc (Redis / Upstash) tutmalıdır — açar sxemi eynidir.
//
// Bu, "unutdum" deyil, QƏSDƏN seçilmiş sadəlikdir: layihə SQLite + tək proses
// üzərində işləyir, əlavə infrastruktur (Redis) stack-i şişirdərdi. Alternativ
// (cəhdləri DB-yə yazmaq) hər uğursuz girişdə yazma sorğusu deməkdir və
// brute-force hücumunu DB-yə yönləndirər.
//
// ⚠️ Açar `e-poçt + IP`-dir, tək IP deyil: universitet şəbəkəsində (NAT) bütün
// kampus eyni IP-dən çıxa bilər və yalnız IP-yə görə sayğac bir nəfərin səhv
// şifrəsi ilə HAMINI bloklardı.
//
// ⚠️ YALNIZ UĞURSUZ cəhd sayılır. Uğurlu giriş sayğacı sıfırlayır — əks halda
// düzgün şifrə ilə 5 dəfə daxil olan istifadəçi bloklanardı.
// ============================================================================

import { fail } from "./respond";

/** Pəncərə: 10 dəqiqə. */
export const LOGIN_WINDOW_MS = 10 * 60 * 1000;

/** Pəncərə ərzində icazə verilən uğursuz cəhd sayı. */
export const LOGIN_MAX_ATTEMPTS = 5;

interface Bucket {
  count: number;
  /** Pəncərənin bitmə anı (ms). */
  resetAt: number;
}

/**
 * Sayğac anbarları AYRIDIR, tək `Map` + prefiks DEYİL.
 *
 * ⚠️ `loginAttemptKey` `«e-poçt|IP»` qaytarır və bu forma testlərdə bərkidilib.
 * Yazma açarı isə `«userId|əhatə»`-dir — eyni `Map`-də saxlasaydıq
 * `ali@qu.edu.az|10.0.0.1` ilə hipotetik bir `userId|scope` açarı toqquşa
 * bilərdi. İki anbar həm də hər sayğacın ayrıca sıfırlanmasına imkan verir
 * (testlərdə biri digərini pozmur).
 */
const buckets = new Map<string, Bucket>();
const writeBuckets = new Map<string, Bucket>();

/**
 * Sabit pəncərə məntiqinin ORTAQ nüvəsi — hər iki sayğac bunu işlədir.
 * Bitmiş xana silinir ki, `Map` sonsuz böyüməsin.
 */
function readBucket(
  store: Map<string, Bucket>,
  key: string,
  now: number,
): Bucket | null {
  const bucket = store.get(key);
  if (!bucket) return null;

  if (bucket.resetAt <= now) {
    store.delete(key);
    return null;
  }

  return bucket;
}

/**
 * Sayğac açarı. E-poçt normallaşdırılmış GƏLMƏLİDİR (`normalizeEmail`),
 * yoxsa `Ali@qu.edu.az` və `ali@qu.edu.az` iki ayrı xana alar.
 */
export function loginAttemptKey(email: string, ip: string): string {
  return `${email}|${ip}`;
}

/**
 * Sorğunun IP-si. Proxy arxasında `x-forwarded-for` ilk dəyəri işlədilir.
 *
 * ⚠️ Başlıq SAXTALAŞDIRILA bilər — bu, kriptoqrafik qoruma deyil, sadəcə
 * brute-force-u çətinləşdirən qat. Əsl müdafiə bcrypt-in qiymətidir
 * (`BCRYPT_ROUNDS`) və eyni cavab mətnidir (istifadəçi sayğacı bağlanır).
 */
export function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export interface RateLimitVerdict {
  allowed: boolean;
  /** Pəncərə bitənə qədər qalan saniyə — `Retry-After` başlığı üçün. */
  retryAfterSeconds: number;
  /** Qalan cəhd sayı (yalnız `allowed` olduqda mənalıdır). */
  remaining: number;
}

/**
 * Cəhdə İCAZƏ VAR? Sayğacı ARTIRMIR — yalnız oxuyur.
 * Uğursuz cəhddən sonra `recordFailedLogin()` çağırılır.
 */
export function checkLoginRate(key: string, now: number = Date.now()): RateLimitVerdict {
  // Pəncərə bitibsə xana silinir — Map sonsuz böyüməsin.
  const bucket = readBucket(buckets, key, now);

  if (!bucket) {
    return { allowed: true, retryAfterSeconds: 0, remaining: LOGIN_MAX_ATTEMPTS };
  }

  if (bucket.count >= LOGIN_MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: LOGIN_MAX_ATTEMPTS - bucket.count,
  };
}

/**
 * Uğursuz cəhdi qeyd edir.
 *
 * ⚠️ Pəncərə İLK uğursuz cəhddən başlayır və sonrakı cəhdlərlə UZANMIR
 * (sliding window deyil). Sadə fixed window: 10 dəqiqədə 5 cəhd, sonra
 * sayğac sıfırlanır. Sürüşən pəncərə hər cəhddə vaxtı uzadardı və düzgün
 * şifrəni sonradan yazan istifadəçi də gözləməli olardı.
 */
export function recordFailedLogin(key: string, now: number = Date.now()): void {
  const bucket = readBucket(buckets, key, now);

  if (!bucket) {
    buckets.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }

  bucket.count += 1;
}

/** Uğurlu giriş — sayğac silinir. */
export function clearLoginAttempts(key: string): void {
  buckets.delete(key);
}

/** Yalnız TEST üçün: qlobal vəziyyəti sıfırlayır. */
export function resetLoginRateLimiter(): void {
  buckets.clear();
}

// ---------------------------------------------------------------------------
// YAZMA sayğacı (Blok 14B) — POST / PATCH / DELETE
// ---------------------------------------------------------------------------

/** Yazma pəncərəsi: 1 dəqiqə. */
export const WRITE_WINDOW_MS = 60 * 1000;

/**
 * Bir pəncərədə icazə verilən yazma sayı.
 *
 * ⚠️ Rəqəm REAL istifadəyə görə seçilib, "təhlükəsiz görünsün" deyə yox:
 * kompozitorda ardıcıl bir neçə paylaşım etmək və səthləri düzəltmək normaldır
 * (yaz → bayrağı aç → fikrini dəyiş → sil). 20 sorğu/dəqiqə insanı narahat
 * etmir, skriptli spam-ı isə dərhal kəsir.
 */
export const WRITE_MAX_REQUESTS = 20;

/**
 * Yazma sayğacının açarı.
 *
 * 🔴 Açar `userId`-dir, IP DEYİL — login-dən fərqli olaraq bu endpoint-lər
 * QORUNANDIR (`withUser`), yəni kimliyi onsuz da bilirik. IP işlətsəydik
 * universitet şəbəkəsində (NAT) bir tələbənin aktivliyi bütün kampusu
 * bloklayardı; `userId` isə saxtalaşdırıla bilməz (JWT imzalıdır),
 * `x-forwarded-for` isə bilər.
 *
 * `scope` ayrı büdcə yaradır: 14C-də memories / events öz açarını verəcək və
 * paylaşım limiti onların limitini yeməyəcək.
 */
export function writeRateKey(userId: string, scope: string): string {
  return `${userId}|${scope}`;
}

/**
 * Yazma cəhdini SAYIR və nəticəni qaytarır.
 *
 * ⚠️ Login-dəki `check` + `record` ayrılığı BURADA YOXDUR və bu, qəsdəndir:
 * yazmada "uğursuz cəhd" anlayışı yoxdur — hər qəbul edilmiş sorğu resurs
 * xərcləyir. Tək çağırış həm də iki addım arasında qalan yarışı (eyni anda
 * gələn iki sorğunun ikisi də `check`-dən keçməsi) aradan qaldırır.
 *
 * ⚠️ Hədd AŞILANDA da sayğac artmır: əks halda blok müddəti hər cəhddə
 * uzanardı (sürüşən pəncərə davranışı) və istifadəçi heç vaxt çıxa bilməzdi.
 */
export function consumeWriteRate(
  key: string,
  now: number = Date.now(),
): RateLimitVerdict {
  const bucket = readBucket(writeBuckets, key, now);

  if (!bucket) {
    writeBuckets.set(key, { count: 1, resetAt: now + WRITE_WINDOW_MS });
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: WRITE_MAX_REQUESTS - 1,
    };
  }

  if (bucket.count >= WRITE_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: WRITE_MAX_REQUESTS - bucket.count,
  };
}

/**
 * Route qapısı: hədd aşılıbsa hazır 429 cavabı, yoxsa `null`.
 *
 * `Retry-After` MƏCBURİDİR — onsuz müştəri nə vaxt təkrarlayacağını bilmir və
 * praktikada dərhal yenidən vurur (RFC 9110 §10.2.3).
 *
 * ```ts
 * const limited = enforceWriteRate(viewer.userId, "posts");
 * if (limited) return limited;
 * ```
 */
export function enforceWriteRate(userId: string, scope: string): Response | null {
  const verdict = consumeWriteRate(writeRateKey(userId, scope));
  if (verdict.allowed) return null;

  return fail("TOO_MANY_REQUESTS", {
    message: "Çox sayda yazma sorğusu göndərdiniz. Bir azdan yenidən cəhd edin.",
    headers: { "retry-after": String(verdict.retryAfterSeconds) },
  });
}

/** Yalnız TEST üçün: yazma sayğacını sıfırlayır. */
export function resetWriteRateLimiter(): void {
  writeBuckets.clear();
}
