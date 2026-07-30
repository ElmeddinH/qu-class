// ============================================================================
// src/lib/admin-rules.test.ts
// 🔴 TƏLƏ C-nin ÜÇ QORUMASI — SAF funksiya kimi, hər kombinasiya üçün.
//
// Bu qaydaların səhvi geri qaytarıla bilməz: sistemdə heç bir admin qalmasa
// panelə girmək və rol vermək mümkün olmaz. Ona görə onlar servisdən ayrılıb
// və DB olmadan sınanır.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  AUDIT_METADATA_KEYS,
  COHORT_DATE_MESSAGES,
  checkCohortDates,
  checkDeactivation,
  checkSystemRoleChange,
  cohortDisplayNameOf,
  cohortSlugOf,
  parseAuditMetadata,
  safeAuditMetadata,
} from "./admin-rules";

const ADMIN = "UNIVERSITY_ADMIN" as const;
const USER = "USER" as const;

describe("checkSystemRoleChange — TƏLƏ C", () => {
  it("🔴 admin ÖZ rolunu ENDİRƏ bilməz", () => {
    expect(
      checkSystemRoleChange({
        actorId: "a1",
        targetId: "a1",
        currentRole: ADMIN,
        nextRole: USER,
        adminCount: 5,
        targetIsActive: true,
      }),
    ).toBe("SELF_DEMOTE");
  });

  it("🔴 SONUNCU AKTİV admin endirilə bilməz", () => {
    // ⚠️ Bu hal ardıcıl icrada YARANMIR (əməliyyatı edən özü aktiv admindir,
    // yəni say ≥ 2). Say 1 YALNIZ iki eyni anlı endirmə sorğusunda görünür —
    // ona görə servis sayı transaksiya İÇİNDƏ oxuyur.
    expect(
      checkSystemRoleChange({
        actorId: "a1",
        targetId: "a2",
        currentRole: ADMIN,
        nextRole: USER,
        adminCount: 1,
        targetIsActive: true,
      }),
    ).toBe("LAST_ADMIN");
  });

  it("🔴 DEAKTİV adminin rolunu almaq BLOKLANMIR", () => {
    // Deaktiv admin onsuz da panelə girə bilmir və `adminCount`-a daxil deyil.
    // `targetIsActive` bayrağı olmasaydı qayda YALANDAN işə düşərdi: sistemdə
    // işlək admin qaldığı halda deaktiv adminin rolu geri alına bilməzdi.
    expect(
      checkSystemRoleChange({
        actorId: "a1",
        targetId: "a2",
        currentRole: ADMIN,
        nextRole: USER,
        adminCount: 1,
        targetIsActive: false,
      }),
    ).toBeNull();
  });

  it("iki qayda AYRIDIR: admin BAŞQA admini endirə bilər (say kifayətdirsə)", () => {
    expect(
      checkSystemRoleChange({
        actorId: "a1",
        targetId: "a2",
        currentRole: ADMIN,
        nextRole: USER,
        adminCount: 2,
        targetIsActive: true,
      }),
    ).toBeNull();
  });

  it("özünü ADMİN ETMƏK bloklanmır — endirmə deyil", () => {
    // Praktikada mənasızdır (artıq admindir), amma qayda YALNIZ endirməyə
    // aiddir və bunu açıq yoxlamaq lazımdır.
    expect(
      checkSystemRoleChange({
        actorId: "a1",
        targetId: "a1",
        currentRole: USER,
        nextRole: ADMIN,
        adminCount: 1,
        targetIsActive: true,
      }),
    ).toBeNull();
  });

  it("adi istifadəçini ADMİN ETMƏK həmişə icazəlidir", () => {
    expect(
      checkSystemRoleChange({
        actorId: "a1",
        targetId: "u9",
        currentRole: USER,
        nextRole: ADMIN,
        adminCount: 1,
        targetIsActive: true,
      }),
    ).toBeNull();
  });

  it("dəyişiklik olmayan sorğu audit jurnalını doldurmur", () => {
    expect(
      checkSystemRoleChange({
        actorId: "a1",
        targetId: "u9",
        currentRole: USER,
        nextRole: USER,
        adminCount: 3,
        targetIsActive: true,
      }),
    ).toBe("ALREADY_APPLIED");
  });

  it("SIRA: özünü endirmə «son admin»dən ƏVVƏL yoxlanılır", () => {
    // Tək admin öz rolunu endirməyə çalışsa səbəb SELF_DEMOTE olmalıdır —
    // istifadəçiyə «başqa administrator bunu edə bilər» demək daha faydalıdır.
    expect(
      checkSystemRoleChange({
        actorId: "a1",
        targetId: "a1",
        currentRole: ADMIN,
        nextRole: USER,
        adminCount: 1,
        targetIsActive: true,
      }),
    ).toBe("SELF_DEMOTE");
  });
});

describe("checkDeactivation — TƏLƏ C", () => {
  it("🔴 admin ÖZ hesabını deaktiv edə bilməz", () => {
    expect(
      checkDeactivation({
        actorId: "a1",
        targetId: "a1",
        targetRole: ADMIN,
        adminCount: 5,
        alreadyDeactivated: false,
      }),
    ).toBe("SELF_DEACTIVATE");
  });

  it("🔴 SONUNCU admin deaktiv edilə bilməz", () => {
    expect(
      checkDeactivation({
        actorId: "a1",
        targetId: "a2",
        targetRole: ADMIN,
        adminCount: 1,
        alreadyDeactivated: false,
      }),
    ).toBe("LAST_ADMIN");
  });

  it("adi istifadəçi say şərtindən ASILI DEYİL", () => {
    expect(
      checkDeactivation({
        actorId: "a1",
        targetId: "u9",
        targetRole: USER,
        adminCount: 1,
        alreadyDeactivated: false,
      }),
    ).toBeNull();
  });

  it("artıq deaktiv hesab təkrar deaktiv edilmir", () => {
    expect(
      checkDeactivation({
        actorId: "a1",
        targetId: "u9",
        targetRole: USER,
        adminCount: 3,
        alreadyDeactivated: true,
      }),
    ).toBe("ALREADY_APPLIED");
  });

  it("SIRA: «artıq deaktiv» yoxlaması hər şeydən ƏVVƏLdir", () => {
    expect(
      checkDeactivation({
        actorId: "a1",
        targetId: "a1",
        targetRole: ADMIN,
        adminCount: 1,
        alreadyDeactivated: true,
      }),
    ).toBe("ALREADY_APPLIED");
  });
});

describe("cohort slug-ı — TƏLƏ F", () => {
  it("DETERMİNİSTİKDİR: eyni giriş → eyni slug", () => {
    expect(cohortSlugOf("maliyye", 2022)).toBe("maliyye-2022");
    expect(cohortSlugOf("maliyye", 2022)).toBe(cohortSlugOf("maliyye", 2022));
  });

  it("azərbaycan hərfləri transliterasiya olunur (ASCII ünvan)", () => {
    expect(cohortSlugOf("İnformasiya Təhlükəsizliyi", 2027)).toBe(
      "informasiya-tehlukesizliyi-2027",
    );
  });

  it("FƏRQLİ ixtisas / il → FƏRQLİ slug (dublikat qorumasının şərti)", () => {
    expect(cohortSlugOf("maliyye", 2022)).not.toBe(cohortSlugOf("maliyye", 2023));
    expect(cohortSlugOf("maliyye", 2022)).not.toBe(cohortSlugOf("marketinq", 2022));
  });

  it("göstərilən ad seed formatı ilə eynidir", () => {
    expect(cohortDisplayNameOf("Maliyyə", 2022)).toBe("Maliyyə — Class of 2022");
  });
});

describe("checkCohortDates", () => {
  it("başlanğıc məzuniyyətdən ƏVVƏL olmalıdır", () => {
    expect(
      checkCohortDates(new Date("2030-09-01"), new Date("2026-06-30")),
    ).toBe("ORDER");
    expect(
      checkCohortDates(new Date("2026-09-01"), new Date("2026-09-01")),
    ).toBe("ORDER");
  });

  it("çox qısa və çox uzun müddət rədd olunur", () => {
    expect(checkCohortDates(new Date("2026-09-01"), new Date("2026-12-01"))).toBe("SPAN");
    expect(checkCohortDates(new Date("2026-09-01"), new Date("2050-09-01"))).toBe("SPAN");
  });

  it("dörd illik bakalavr proqramı keçir", () => {
    expect(checkCohortDates(new Date("2026-09-01"), new Date("2030-06-30"))).toBeNull();
  });

  it("hər səbəbin azərbaycanca mesajı var", () => {
    expect(COHORT_DATE_MESSAGES.ORDER).toBeTruthy();
    expect(COHORT_DATE_MESSAGES.SPAN).toBeTruthy();
  });
});

describe("audit metadata — TƏLƏ A-nın ikinci ucu", () => {
  it("🔴 AĞ SİYAHIDAN KƏNAR AÇARLAR ATILIR (məzmun jurnala düşmür)", () => {
    // ⚠️ Tip səviyyəsində `body` / `title` onsuz da qəbul olunmur (ağ siyahı
    // `Partial<Record<AuditMetadataKey, unknown>>`-dur). Test ÇALIŞMA ANINI
    // ölçür: kimsə `as` ilə tipi keçsə də dəyər çıxışa DÜŞMƏMƏLİDİR.
    const dirty = {
      operation: "openModerationReview",
      visibility: "PRIVATE",
      body: "şikayət olunan gizli mətn",
      title: "başlıq",
    } as unknown as Parameters<typeof safeAuditMetadata>[0];

    const out = safeAuditMetadata(dirty);

    expect(out).toEqual({ operation: "openModerationReview", visibility: "PRIVATE" });
    expect(JSON.stringify(out)).not.toContain("gizli mətn");
  });

  it("ağ siyahıda MƏTN daşıyan açar yoxdur", () => {
    for (const forbidden of ["body", "title", "details", "content", "answer", "summary"]) {
      expect(AUDIT_METADATA_KEYS as readonly string[]).not.toContain(forbidden);
    }
  });

  it("`undefined` və `null` dəyərlər yazılmır (boş açar səs-küydür)", () => {
    expect(safeAuditMetadata({ operation: "x", from: undefined, to: null })).toEqual({
      operation: "x",
    });
  });

  it("xarab JSON səhifəni SINDIRMIR — `null` qayıdır", () => {
    expect(parseAuditMetadata("{yarımçıq")).toBeNull();
    expect(parseAuditMetadata(null)).toBeNull();
    expect(parseAuditMetadata("   ")).toBeNull();
    // Massiv və skalyar da obyekt deyil → `null`.
    expect(parseAuditMetadata("[1,2]")).toBeNull();
    expect(parseAuditMetadata('"mətn"')).toBeNull();
  });

  it("düzgün JSON obyekt kimi qayıdır", () => {
    expect(parseAuditMetadata('{"from":"OPEN","to":"RESOLVED"}')).toEqual({
      from: "OPEN",
      to: "RESOLVED",
    });
  });
});
