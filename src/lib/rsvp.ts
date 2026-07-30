// ============================================================================
// src/lib/rsvp.ts
// RSVP axınının SAF qaydaları (spec §14): dəvət → qəbul / rədd → qeydiyyat →
// gözləmə siyahısı → iştirak təsdiqi.
//
// 🔴 BU FAYL PRISMA İMPORT ETMİR. Səbəb `features/feed/fanout.ts` ilə eynidir:
// tutum hesabı və gözləmə siyahısı məhz burada səhv salınsa istifadəçi ya
// olmayan yerə qeydiyyatdan keçir, ya da boş tədbirdə "yer yoxdur" görür.
// Qaydalar bazasız unit testlə bərkidilir (`rsvp.test.ts`), servis isə yalnız
// sətirləri gətirib bu funksiyaları çağırır.
//
// ⚠️ SEED-də hazır RSVP-lər var (459 sətir, 7 statusa paylanmış), yəni bütün
// hesablamalar mövcud verilənlərlə də düzgün işləməlidir — `INVITED` sətri
// yer TUTMUR, `WAITLISTED` sətri də yer tutmur.
// ============================================================================

import { RsvpStatus, type RsvpStatus as RsvpStatusType } from "@/lib/enums";

// ---------------------------------------------------------------------------
// Yer tutan statuslar
// ---------------------------------------------------------------------------

/**
 * Tutumdan yer TUTAN statuslar.
 *
 * ⚠️ `ATTENDED` və `NO_SHOW` da buradadır. Tədbirdən sonra check-in statusu
 * dəyişir, amma o adam yeri ONSUZ DA tutmuşdu — siyahıdan çıxarsaydıq
 * "40/40" olan tədbir mərasimdən sonra birdən "12/40"-a düşərdi və hesabat
 * mənasını itirərdi.
 *
 * ⚠️ `INVITED` yer tutmur: dəvət hələ cavab deyil. `WAITLISTED` də tutmur —
 * onun bütün mənası yer AZAD OLANDA irəli keçməkdir. `DECLINED` aydındır.
 */
export const SEAT_HOLDING_RSVP_STATUSES = [
  RsvpStatus.ACCEPTED,
  RsvpStatus.REGISTERED,
  RsvpStatus.ATTENDED,
  RsvpStatus.NO_SHOW,
] as const satisfies readonly RsvpStatusType[];

export function holdsSeat(status: string): boolean {
  return (SEAT_HOLDING_RSVP_STATUSES as readonly string[]).includes(status);
}

/** İştirakçı cədvəlində «gəlib» sayılan statuslar (iştirak nisbəti üçün). */
export const ATTENDED_RSVP_STATUSES = [RsvpStatus.ATTENDED] as const;

// ---------------------------------------------------------------------------
// İstifadəçinin seçimi
// ---------------------------------------------------------------------------

/**
 * Detal səhifəsindəki üç düymə (spec §14).
 *
 * ⚠️ Bunlar `RsvpStatus` DEYİL — NİYYƏTdir. `REGISTER` niyyəti tutuma görə
 * ya `REGISTERED`, ya da `WAITLISTED` statusu ilə nəticələnir; istifadəçi
 * statusu birbaşa seçə bilməz (əks halda hər kəs özünü `REGISTERED` edərdi).
 */
export const RSVP_INTENT_VALUES = ["ACCEPT", "DECLINE", "REGISTER"] as const;
export type RsvpIntent = (typeof RSVP_INTENT_VALUES)[number];

export type RsvpRejection =
  | "EVENT_CLOSED"
  | "REGISTRATION_CLOSED"
  | "EVENT_FINISHED";

export type RsvpDecision =
  | { ok: true; status: RsvpStatusType; waitlisted: boolean }
  | { ok: false; reason: RsvpRejection };

export interface RsvpContext {
  /** `Event.status` — `PUBLISHED` olmayan tədbirə RSVP verilmir. */
  eventStatus: string;
  /** `Event.capacity` — `null` = limitsiz. */
  capacity: number | null;
  /** Hazırda yer tutanların sayı (viewer-in ÖZ sətri ÇIXILMIŞ halda). */
  seatsTaken: number;
  /** `Event.registrationDeadline` — `null` = son tarix yoxdur. */
  registrationDeadline: Date | null;
  /** Tədbirin başlama vaxtı. */
  startsAt: Date;
  now: Date;
}

/**
 * Niyyət + kontekst → yeni RSVP statusu.
 *
 * QAYDALAR:
 *   1. `PUBLISHED` olmayan tədbir (DRAFT / CANCELLED / COMPLETED) → bağlıdır.
 *   2. Tədbir BAŞLAYIBSA yeni qəbul/qeydiyyat alınmır. «Rədd et» isə həmişə
 *      mümkündür — insan fikrini son anda da dəyişə bilər və koordinatorun
 *      siyahısı düzgün qalmalıdır.
 *   3. Qeydiyyat son tarixi KEÇİBSƏ yalnız `REGISTER` bloklanır; `ACCEPT`
 *      (dəvətə cavab) bloklanmır — bunlar iki fərqli hərəkətdir.
 *   4. Tutum dolubsa `REGISTER` → `WAITLISTED`.
 *
 * ⚠️ `seatsTaken` çağıran tərəfdən VIEWER-İN ÖZ SƏTRİ ÇIXILMIŞ gəlir. Əks
 * halda artıq qeydiyyatda olan adam düyməni ikinci dəfə basanda özünü
 * gözləmə siyahısına salardı.
 */
export function resolveRsvpDecision(
  intent: RsvpIntent,
  context: RsvpContext,
): RsvpDecision {
  if (intent === "DECLINE") {
    // Qayda 2 — rədd hər zaman qəbul olunur, hətta ləğv edilmiş tədbirdə də.
    return { ok: true, status: RsvpStatus.DECLINED, waitlisted: false };
  }

  if (context.eventStatus !== "PUBLISHED") return { ok: false, reason: "EVENT_CLOSED" };
  if (context.startsAt.getTime() <= context.now.getTime()) {
    return { ok: false, reason: "EVENT_FINISHED" };
  }

  if (intent === "ACCEPT") {
    // Dəvəti qəbul etmək də yer tutur — tutum burada da yoxlanılır.
    return seatOutcome(context, RsvpStatus.ACCEPTED);
  }

  if (
    context.registrationDeadline !== null &&
    context.registrationDeadline.getTime() < context.now.getTime()
  ) {
    return { ok: false, reason: "REGISTRATION_CLOSED" };
  }

  return seatOutcome(context, RsvpStatus.REGISTERED);
}

function seatOutcome(
  context: RsvpContext,
  wanted: Extract<RsvpStatusType, "ACCEPTED" | "REGISTERED">,
): RsvpDecision {
  if (isFull(context.capacity, context.seatsTaken)) {
    return { ok: true, status: RsvpStatus.WAITLISTED, waitlisted: true };
  }
  return { ok: true, status: wanted, waitlisted: false };
}

/** `capacity = null` → limitsiz. Sıfır tutum «yer yoxdur» deməkdir. */
export function isFull(capacity: number | null, seatsTaken: number): boolean {
  return capacity !== null && seatsTaken >= capacity;
}

/** Qalan yer sayı. Limitsiz tədbir üçün `null`. */
export function seatsLeft(capacity: number | null, seatsTaken: number): number | null {
  if (capacity === null) return null;
  return Math.max(0, capacity - seatsTaken);
}

export function registrationClosed(
  deadline: Date | null,
  now: Date,
): boolean {
  return deadline !== null && deadline.getTime() < now.getTime();
}

// ---------------------------------------------------------------------------
// Statistika — Recharts diaqramı və yekun hesabat üçün
// ---------------------------------------------------------------------------

export interface RsvpBreakdown {
  /** Status → say. Sıfır olan statuslar da açardadır (diaqram xanası itməsin). */
  byStatus: Record<RsvpStatusType, number>;
  /** Yer tutanların cəmi. */
  seatsTaken: number;
  /** `ATTENDED` say. */
  attended: number;
  /** `NO_SHOW` say. */
  noShow: number;
  /** Gözləmə siyahısının uzunluğu. */
  waitlisted: number;
  /** Bütün RSVP sətirlərinin sayı (dəvətlər və rədlər daxil). */
  total: number;
}

/**
 * Status sətirlərini hesabat xanalarına yığır.
 *
 * ⚠️ Bütün statuslar SIFIRLA doldurulur. Recharts boş massivdə oxları
 * çəkmir — "hələ heç kim gəlməyib" halı boş diaqram yox, sıfır sütunlar kimi
 * görünməlidir.
 */
export function summarizeRsvps(
  rows: Array<{ status: string; count: number }>,
): RsvpBreakdown {
  const byStatus = Object.fromEntries(
    (Object.values(RsvpStatus) as RsvpStatusType[]).map((status) => [status, 0]),
  ) as Record<RsvpStatusType, number>;

  let total = 0;

  for (const row of rows) {
    total += row.count;
    if (row.status in byStatus) byStatus[row.status as RsvpStatusType] += row.count;
  }

  const seatsTaken = SEAT_HOLDING_RSVP_STATUSES.reduce(
    (sum, status) => sum + byStatus[status],
    0,
  );

  return {
    byStatus,
    seatsTaken,
    attended: byStatus.ATTENDED,
    noShow: byStatus.NO_SHOW,
    waitlisted: byStatus.WAITLISTED,
    total,
  };
}

/**
 * İştirak nisbəti: gələnlər ÷ yer tutanlar (%, tam ədəd).
 *
 * Məxrəc `seatsTaken`-dir, `total` DEYİL: dəvəti rədd edən adam nisbəti
 * aşağı salmamalıdır — o, gəlməyi heç vaxt vəd etməyib.
 */
export function attendanceRate(breakdown: RsvpBreakdown): number | null {
  if (breakdown.seatsTaken === 0) return null;
  return Math.round((breakdown.attended / breakdown.seatsTaken) * 100);
}

/** Rəy sorğusunun ortalaması — 1 onluq dəqiqliklə. `null` = rəy yoxdur. */
export function averageRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((total, value) => total + value, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Rəy sorğusu
// ---------------------------------------------------------------------------

export const MIN_EVENT_RATING = 1;
export const MAX_EVENT_RATING = 5;

/**
 * Rəy verə bilən statuslar.
 *
 * Tədbirdə OLMAYAN adam onu qiymətləndirməməlidir, ona görə siyahı
 * `ATTENDED` + yer tutmuş statuslarla məhdudlaşır (check-in hər tədbirdə
 * aparılmır — `REGISTERED` qalmış iştirakçı da rəy yaza bilməlidir).
 */
export const FEEDBACK_ELIGIBLE_STATUSES = [
  RsvpStatus.ACCEPTED,
  RsvpStatus.REGISTERED,
  RsvpStatus.ATTENDED,
] as const satisfies readonly RsvpStatusType[];

export function canLeaveFeedback(status: string | null, eventFinished: boolean): boolean {
  if (!eventFinished || status === null) return false;
  return (FEEDBACK_ELIGIBLE_STATUSES as readonly string[]).includes(status);
}
