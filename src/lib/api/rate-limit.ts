// ============================================================================
// src/lib/api/rate-limit.ts
// Login cəhdlərinin sadə sayğacı — `POST /api/v1/auth/login` üçün.
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

/** Pəncərə: 10 dəqiqə. */
export const LOGIN_WINDOW_MS = 10 * 60 * 1000;

/** Pəncərə ərzində icazə verilən uğursuz cəhd sayı. */
export const LOGIN_MAX_ATTEMPTS = 5;

interface Bucket {
  count: number;
  /** Pəncərənin bitmə anı (ms). */
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

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
  const bucket = buckets.get(key);

  // Pəncərə bitibsə xana silinir — Map sonsuz böyüməsin.
  if (bucket && bucket.resetAt <= now) {
    buckets.delete(key);
    return { allowed: true, retryAfterSeconds: 0, remaining: LOGIN_MAX_ATTEMPTS };
  }

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
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
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
