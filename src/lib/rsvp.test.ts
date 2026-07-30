// ============================================================================
// src/lib/rsvp.test.ts
// RSVP axınının saf qaydaları (spec §14): tutum · gözləmə siyahısı · son tarix.
//
// Bu qaydalar bazasız yoxlanılır, çünki səhv olduqda nəticə istifadəçiyə
// birbaşa dəyir: ya olmayan yerə qeydiyyat, ya da boş tədbirdə "yer yoxdur".
// ============================================================================

import { describe, expect, it } from "vitest";

import { RsvpStatus } from "./enums";
import {
  ATTENDED_RSVP_STATUSES,
  FEEDBACK_ELIGIBLE_STATUSES,
  SEAT_HOLDING_RSVP_STATUSES,
  attendanceRate,
  averageRating,
  canLeaveFeedback,
  holdsSeat,
  isFull,
  registrationClosed,
  resolveRsvpDecision,
  seatsLeft,
  summarizeRsvps,
  type RsvpContext,
} from "./rsvp";

const NOW = new Date("2026-07-30T10:00:00.000Z");
const TOMORROW = new Date("2026-07-31T10:00:00.000Z");
const YESTERDAY = new Date("2026-07-29T10:00:00.000Z");

function context(overrides: Partial<RsvpContext> = {}): RsvpContext {
  return {
    eventStatus: "PUBLISHED",
    capacity: null,
    seatsTaken: 0,
    registrationDeadline: null,
    startsAt: TOMORROW,
    now: NOW,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Yer tutan statuslar
// ---------------------------------------------------------------------------

describe("holdsSeat", () => {
  it("ACCEPTED / REGISTERED / ATTENDED / NO_SHOW yer tutur", () => {
    expect(SEAT_HOLDING_RSVP_STATUSES).toEqual([
      RsvpStatus.ACCEPTED,
      RsvpStatus.REGISTERED,
      RsvpStatus.ATTENDED,
      RsvpStatus.NO_SHOW,
    ]);
    for (const status of SEAT_HOLDING_RSVP_STATUSES) {
      expect(holdsSeat(status), status).toBe(true);
    }
  });

  it("INVITED yer TUTMUR — dəvət hələ cavab deyil", () => {
    // ⚠️ Bu vacibdir: `createEvent` sinfin hər üzvünə INVITED sətri yaradır.
    // Dəvət yer tutsaydı 20 nəfərlik sinifdə 15 yerlik tədbir dərhal dolardı.
    expect(holdsSeat(RsvpStatus.INVITED)).toBe(false);
  });

  it("WAITLISTED və DECLINED yer tutmur", () => {
    expect(holdsSeat(RsvpStatus.WAITLISTED)).toBe(false);
    expect(holdsSeat(RsvpStatus.DECLINED)).toBe(false);
  });

  it("naməlum status yer tutmur (fail closed)", () => {
    expect(holdsSeat("SOMETHING_ELSE")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tutum
// ---------------------------------------------------------------------------

describe("tutum hesabı", () => {
  it("`capacity = null` limitsizdir", () => {
    expect(isFull(null, 10_000)).toBe(false);
    expect(seatsLeft(null, 10_000)).toBeNull();
  });

  it("tutum dolduqda `isFull` doğrudur", () => {
    expect(isFull(10, 9)).toBe(false);
    expect(isFull(10, 10)).toBe(true);
    expect(isFull(10, 11)).toBe(true);
  });

  it("qalan yer mənfi olmur", () => {
    expect(seatsLeft(10, 3)).toBe(7);
    expect(seatsLeft(10, 15)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// resolveRsvpDecision
// ---------------------------------------------------------------------------

describe("resolveRsvpDecision", () => {
  it("REGISTER → REGISTERED (yer var)", () => {
    const decision = resolveRsvpDecision("REGISTER", context({ capacity: 10, seatsTaken: 3 }));
    expect(decision).toEqual({ ok: true, status: RsvpStatus.REGISTERED, waitlisted: false });
  });

  it("🔴 tutum dolubsa REGISTER → WAITLISTED", () => {
    const decision = resolveRsvpDecision("REGISTER", context({ capacity: 5, seatsTaken: 5 }));
    expect(decision).toEqual({ ok: true, status: RsvpStatus.WAITLISTED, waitlisted: true });
  });

  it("ACCEPT də yer tutur → dolu tədbirdə WAITLISTED", () => {
    const decision = resolveRsvpDecision("ACCEPT", context({ capacity: 2, seatsTaken: 2 }));
    expect(decision).toEqual({ ok: true, status: RsvpStatus.WAITLISTED, waitlisted: true });
  });

  it("ACCEPT → ACCEPTED (yer var)", () => {
    expect(resolveRsvpDecision("ACCEPT", context())).toEqual({
      ok: true,
      status: RsvpStatus.ACCEPTED,
      waitlisted: false,
    });
  });

  it("🔴 DECLINE HƏMİŞƏ qəbul olunur — ləğv edilmiş və bitmiş tədbirdə də", () => {
    // Koordinatorun siyahısı düzgün qalmalıdır: insan son anda fikrini
    // dəyişsə də bunu bildirə bilməlidir.
    expect(resolveRsvpDecision("DECLINE", context({ eventStatus: "CANCELLED" })).ok).toBe(true);
    expect(resolveRsvpDecision("DECLINE", context({ startsAt: YESTERDAY })).ok).toBe(true);
    expect(
      resolveRsvpDecision("DECLINE", context({ registrationDeadline: YESTERDAY })).ok,
    ).toBe(true);
  });

  it("PUBLISHED olmayan tədbir bağlıdır", () => {
    for (const status of ["DRAFT", "CANCELLED", "COMPLETED"]) {
      const decision = resolveRsvpDecision("REGISTER", context({ eventStatus: status }));
      expect(decision, status).toEqual({ ok: false, reason: "EVENT_CLOSED" });
    }
  });

  it("başlamış tədbirə yeni qeydiyyat yoxdur", () => {
    expect(resolveRsvpDecision("REGISTER", context({ startsAt: YESTERDAY }))).toEqual({
      ok: false,
      reason: "EVENT_FINISHED",
    });
  });

  it("son tarix KEÇİBSƏ yalnız REGISTER bloklanır, ACCEPT yox", () => {
    // İki fərqli hərəkətdir: dəvətə cavab vermək qeydiyyat deyil.
    const ctx = context({ registrationDeadline: YESTERDAY });
    expect(resolveRsvpDecision("REGISTER", ctx)).toEqual({
      ok: false,
      reason: "REGISTRATION_CLOSED",
    });
    expect(resolveRsvpDecision("ACCEPT", ctx).ok).toBe(true);
  });

  it("son tarix GƏLƏCƏKDƏDİRSƏ qeydiyyat açıqdır", () => {
    const ctx = context({ registrationDeadline: new Date("2026-07-30T23:00:00.000Z") });
    expect(resolveRsvpDecision("REGISTER", ctx).ok).toBe(true);
  });

  it("`capacity = 0` yer yoxdur deməkdir", () => {
    expect(resolveRsvpDecision("REGISTER", context({ capacity: 0 }))).toEqual({
      ok: true,
      status: RsvpStatus.WAITLISTED,
      waitlisted: true,
    });
  });
});

describe("registrationClosed", () => {
  it("son tarix yoxdursa bağlı deyil", () => {
    expect(registrationClosed(null, NOW)).toBe(false);
  });

  it("keçmiş son tarix bağlıdır, gələcək açıq", () => {
    expect(registrationClosed(YESTERDAY, NOW)).toBe(true);
    expect(registrationClosed(TOMORROW, NOW)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Statistika
// ---------------------------------------------------------------------------

describe("summarizeRsvps", () => {
  it("BÜTÜN statuslar sıfırla doldurulur (diaqram xanası itməsin)", () => {
    const breakdown = summarizeRsvps([]);
    expect(Object.keys(breakdown.byStatus).sort()).toEqual(
      [...Object.values(RsvpStatus)].sort(),
    );
    expect(breakdown.total).toBe(0);
    expect(breakdown.seatsTaken).toBe(0);
  });

  it("yer tutan statuslar `seatsTaken`-ə yığılır", () => {
    const breakdown = summarizeRsvps([
      { status: RsvpStatus.INVITED, count: 12 },
      { status: RsvpStatus.ACCEPTED, count: 4 },
      { status: RsvpStatus.REGISTERED, count: 6 },
      { status: RsvpStatus.WAITLISTED, count: 3 },
      { status: RsvpStatus.DECLINED, count: 2 },
      { status: RsvpStatus.ATTENDED, count: 5 },
      { status: RsvpStatus.NO_SHOW, count: 1 },
    ]);

    expect(breakdown.seatsTaken).toBe(4 + 6 + 5 + 1);
    expect(breakdown.attended).toBe(5);
    expect(breakdown.noShow).toBe(1);
    expect(breakdown.waitlisted).toBe(3);
    expect(breakdown.total).toBe(33);
  });

  it("naməlum status `total`-a düşür, xanaya YOX", () => {
    const breakdown = summarizeRsvps([{ status: "LEGACY_STATUS", count: 4 }]);
    expect(breakdown.total).toBe(4);
    expect(breakdown.seatsTaken).toBe(0);
  });
});

describe("attendanceRate", () => {
  it("məxrəc `seatsTaken`-dir, `total` YOX", () => {
    // Dəvəti rədd edən adam nisbəti aşağı salmamalıdır.
    const breakdown = summarizeRsvps([
      { status: RsvpStatus.DECLINED, count: 90 },
      { status: RsvpStatus.ATTENDED, count: 8 },
      { status: RsvpStatus.NO_SHOW, count: 2 },
    ]);
    expect(attendanceRate(breakdown)).toBe(80);
  });

  it("heç kim yer tutmayıbsa `null`", () => {
    expect(attendanceRate(summarizeRsvps([]))).toBeNull();
  });

  it("ATTENDED statusu «gəlib» sayılan yeganə statusdur", () => {
    expect(ATTENDED_RSVP_STATUSES).toEqual([RsvpStatus.ATTENDED]);
  });
});

describe("averageRating", () => {
  it("rəy yoxdursa `null`", () => {
    expect(averageRating([])).toBeNull();
  });

  it("bir onluq dəqiqliklə yuvarlaqlaşır", () => {
    expect(averageRating([5, 4, 4])).toBe(4.3);
    expect(averageRating([1, 5])).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Rəy icazəsi
// ---------------------------------------------------------------------------

describe("canLeaveFeedback", () => {
  it("tədbir bitməyibsə rəy yazıla bilməz", () => {
    expect(canLeaveFeedback(RsvpStatus.ATTENDED, false)).toBe(false);
  });

  it("RSVP sətri olmayan adam rəy yaza bilməz", () => {
    expect(canLeaveFeedback(null, true)).toBe(false);
  });

  it("yer tutmuş iştirakçı rəy yaza bilər", () => {
    for (const status of FEEDBACK_ELIGIBLE_STATUSES) {
      expect(canLeaveFeedback(status, true), status).toBe(true);
    }
  });

  it("dəvəti rədd edən və gəlməyən rəy yaza bilməz", () => {
    expect(canLeaveFeedback(RsvpStatus.DECLINED, true)).toBe(false);
    expect(canLeaveFeedback(RsvpStatus.NO_SHOW, true)).toBe(false);
    expect(canLeaveFeedback(RsvpStatus.INVITED, true)).toBe(false);
    expect(canLeaveFeedback(RsvpStatus.WAITLISTED, true)).toBe(false);
  });
});
