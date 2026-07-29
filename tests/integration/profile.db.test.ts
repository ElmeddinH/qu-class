// @vitest-environment node
// ============================================================================
// tests/integration/profile.db.test.ts
// Blok 7 [M7] — profil redaktəsi və üç razılığın REAL BAZAYA qarşı yoxlanışı.
//
// ⚠️ Bu fayl `directory.db.test.ts`-dən FƏRQLİ olaraq YAZIR. Ona görə:
//   · bütün dəyişikliklər `alumni@qu.edu.az` (usr-125) üzərindədir — həmin
//     istifadəçi kataloq testlərində yalnız KƏNAR VIEWER kimi işlədilir, yəni
//     onun sahələri oradakı gözləntilərə təsir etmir;
//   · `beforeAll` tam snapshot götürür, `afterAll` hər şeyi geri qaytarır —
//     seed determinizmi pozulmamalıdır (növbəti icra eyni bazanı görməlidir);
//   · yaradılan hər sətir id-si ilə izlənir və silinir.
//
// 🔴 FAYLIN ƏSAS DÖRD SUALI:
//   1. Başqasının `CareerEntry`-sini redaktə etmək mümkündürmü?      (YOX)
//   2. `includeInStats = false` qeyd statistikaya düşürmü?           (YOX)
//      Həmin qeyd profildə görünürmü?                                (BƏLİ)
//      → iki razılığın MÜSTƏQİL olduğunun sübutu
//   3. `openToSupport = false` olanda təkliflər görünürmü?           (YOX)
//   4. Redaktədən sonra `buildProfileView` yeni dəyəri qaytarırmı?   (BƏLİ)
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Visibility } from "@/lib/enums";
import { defaultLevelFor, type Viewer } from "@/lib/visibility";
import {
  createCareerEntry,
  deleteCareerEntry,
  getCareerWorkspace,
  updateCareerEntry,
  updateEducationEntry,
  updateSupportSettings,
} from "@/services/career.service";
import { listSupportOffers } from "@/services/cohort.service";
import { getWhereAreWeNowStats } from "@/services/stats.service";
import {
  buildProfileView,
  getFieldVisibility,
  getProfile,
  getProfileDraft,
  updateProfile,
} from "@/services/user.service";

const prisma = new PrismaClient();

type UserViewer = Extract<Viewer, { kind: "USER" }>;

async function viewerOf(email: string): Promise<UserViewer> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: {
      id: true,
      systemRole: true,
      memberships: { select: { cohortId: true, role: true } },
    },
  });

  return {
    kind: "USER",
    userId: user.id,
    cohortIds: user.memberships.map((m) => m.cohortId),
    systemRole: user.systemRole === "UNIVERSITY_ADMIN" ? "UNIVERSITY_ADMIN" : "USER",
    moderatedCohortIds: user.memberships
      .filter((m) => m.role === "CLASS_MODERATOR")
      .map((m) => m.cohortId),
  };
}

let alumni: UserViewer;
let alumniCohortId: string;
/** Məzunla EYNİ sinifdə olan başqa istifadəçi — "sinif yoldaşı" baxışı. */
let classmate: UserViewer;
/** BAŞQA sinifdən istifadəçi — sahiblik testlərində "yad adam". */
let outsider: UserViewer;

/**
 * Seed vəziyyəti — `afterAll` bunu geri yazır.
 *
 * ⚠️ Karyera və təhsil sətirləri TAM saxlanılır (yalnız id-ləri deyil):
 * testlər mövcud sətirlərə də toxunur — `isCurrent` təkliyi qaydası yeni cari
 * qeyd yaradanda KÖHNƏ sətri `false`-a çevirir. Yalnız id-ləri saxlasaydıq
 * artıq sətirlər silinər, amma dəyişdirilmiş sahə seed-də qalardı və növbəti
 * icra fərqli baza görərdi.
 */
type CareerRow = Awaited<ReturnType<typeof prisma.careerEntry.findMany>>[number];
type EducationRow = Awaited<ReturnType<typeof prisma.educationEntry.findMany>>[number];

let snapshot: {
  user: Record<string, unknown>;
  tags: Array<{ tagId: string; level: string | null }>;
  clubs: Array<{ clubId: string; role: string; joinedAt: Date }>;
  fieldVisibility: Array<{ id: string; field: string; level: string }>;
  offers: Array<{ id: string; type: string; note: string | null }>;
  career: CareerRow[];
  education: EducationRow[];
};

beforeAll(async () => {
  [alumni, outsider] = await Promise.all([
    viewerOf("alumni@qu.edu.az"),
    viewerOf("rep@qu.edu.az"),
  ]);

  expect(alumni.cohortIds.length).toBeGreaterThan(0);
  // Cohort-lar KƏSİŞMƏMƏLİDİR, yoxsa "yad adam" testləri mənasız olar.
  expect(alumni.cohortIds.filter((id) => outsider.cohortIds.includes(id))).toEqual([]);

  alumniCohortId = alumni.cohortIds[0];

  const other = await prisma.user.findFirstOrThrow({
    where: {
      memberships: { some: { cohortId: alumniCohortId } },
      id: { not: alumni.userId },
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  classmate = {
    kind: "USER",
    userId: other.id,
    cohortIds: [alumniCohortId],
    systemRole: "USER",
    moderatedCohortIds: [],
  };

  const [user, career, education] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: alumni.userId },
      select: {
        firstName: true,
        lastName: true,
        avatarUrl: true,
        hometown: true,
        currentCity: true,
        currentCountry: true,
        phone: true,
        personalEmail: true,
        bio: true,
        learningGoals: true,
        askMeAbout: true,
        expectations: true,
        currentCompany: true,
        currentPosition: true,
        industry: true,
        futurePlans: true,
        openToSupport: true,
        // ⚠️ `@updatedAt` bərpada da açıq verilir, yoxsa Prisma onu `now()`-a
        // çevirir və seed diff-i sıfır qalmır (Blok 1 determinizm tələbi).
        updatedAt: true,
        tags: { select: { tagId: true, level: true } },
        clubMemberships: { select: { clubId: true, role: true, joinedAt: true } },
        fieldVisibility: { select: { id: true, field: true, level: true } },
        supportOffers: { select: { id: true, type: true, note: true } },
      },
    }),
    // TAM sətirlər — `isCurrent` kimi sahələr testlərdə dəyişir.
    prisma.careerEntry.findMany({ where: { userId: alumni.userId } }),
    prisma.educationEntry.findMany({ where: { userId: alumni.userId } }),
  ]);

  const { tags, clubMemberships, fieldVisibility, supportOffers, ...scalars } = user;

  snapshot = {
    user: scalars,
    tags,
    clubs: clubMemberships,
    fieldVisibility,
    offers: supportOffers,
    career,
    education,
  };
});

afterAll(async () => {
  if (snapshot) {
    const userId = alumni.userId;

    // Karyera / təhsil: HAMISI silinib snapshot-dan yenidən yazılır — testlər
    // mövcud sətirlərin sahələrini də dəyişir (`isCurrent` təkliyi).
    await prisma.careerEntry.deleteMany({ where: { userId } });
    if (snapshot.career.length > 0) {
      await prisma.careerEntry.createMany({ data: snapshot.career });
    }

    await prisma.educationEntry.deleteMany({ where: { userId } });
    if (snapshot.education.length > 0) {
      await prisma.educationEntry.createMany({ data: snapshot.education });
    }

    // Seed vəziyyətinin bərpası.
    await prisma.user.update({ where: { id: userId }, data: snapshot.user });

    await prisma.userTag.deleteMany({ where: { userId } });
    if (snapshot.tags.length > 0) {
      await prisma.userTag.createMany({
        data: snapshot.tags.map((tag) => ({ userId, ...tag })),
      });
    }

    await prisma.clubMembership.deleteMany({ where: { userId } });
    if (snapshot.clubs.length > 0) {
      await prisma.clubMembership.createMany({
        data: snapshot.clubs.map((club) => ({ userId, ...club })),
      });
    }

    await prisma.fieldVisibility.deleteMany({ where: { userId } });
    if (snapshot.fieldVisibility.length > 0) {
      await prisma.fieldVisibility.createMany({
        data: snapshot.fieldVisibility.map((row) => ({ userId, ...row })),
      });
    }

    await prisma.supportOffer.deleteMany({ where: { userId } });
    if (snapshot.offers.length > 0) {
      await prisma.supportOffer.createMany({
        data: snapshot.offers.map((offer) => ({ userId, ...offer })),
      });
    }
  }

  await prisma.$disconnect();
});

/** Testlərdə işlədilən karyera qeydi — hər sahə açıq verilir. */
function careerPayload(overrides: Partial<Parameters<typeof createCareerEntry>[1]> = {}) {
  return {
    company: "QU Test Şirkəti",
    position: "Test mühəndisi",
    industry: "TECHNOLOGY",
    city: "Test şəhəri",
    country: "Testlandiya",
    startDate: new Date("2024-01-15"),
    endDate: null,
    isCurrent: true,
    description: null,
    visibility: Visibility.PUBLIC,
    includeInStats: false,
    ...overrides,
  };
}

async function createOwnedCareerEntry(
  overrides: Partial<Parameters<typeof createCareerEntry>[1]> = {},
): Promise<string> {
  const result = await createCareerEntry(alumni, careerPayload(overrides));
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("qeyd yaradılmadı");

  return result.value.id;
}

// ===========================================================================
// 1. 🔴 SAHİBLİK — başqasının qeydini redaktə etmək MÜMKÜN DEYİL
// ===========================================================================

describe("sahiblik yoxlaması", () => {
  it("🔴 yad istifadəçi başqasının CareerEntry-sini REDAKTƏ EDƏ BİLMİR", async () => {
    const entryId = await createOwnedCareerEntry();

    const result = await updateCareerEntry(outsider, entryId, careerPayload({
      company: "OĞURLANMIŞ ŞİRKƏT",
      position: "Sahibsiz vəzifə",
    }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("NOT_FOUND");

    // Sətir TOXUNULMAMIŞ qalıb — `updateMany` şərti uyğun gəlmədi.
    const row = await prisma.careerEntry.findUniqueOrThrow({
      where: { id: entryId },
      select: { company: true, userId: true },
    });
    expect(row.company).toBe("QU Test Şirkəti");
    expect(row.userId).toBe(alumni.userId);
  });

  it("🔴 yad istifadəçi başqasının CareerEntry-sini SİLƏ BİLMİR", async () => {
    const entryId = await createOwnedCareerEntry();

    const result = await deleteCareerEntry(outsider, entryId);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("NOT_FOUND");
    expect(await prisma.careerEntry.count({ where: { id: entryId } })).toBe(1);
  });

  it("🔴 SİNİF YOLDAŞI da redaktə edə bilmir (görmək ≠ dəyişmək)", async () => {
    // Qeyd `PUBLIC`-dir, yəni sinif yoldaşı onu GÖRÜR. Görünürlük isə yazma
    // icazəsi vermir — iki tamamilə ayrı sualdır.
    const entryId = await createOwnedCareerEntry();

    const visible = await buildProfileView(classmate, alumni.userId);
    expect(visible?.view.careerHistory.some((entry) => entry.id === entryId)).toBe(true);

    const result = await updateCareerEntry(classmate, entryId, careerPayload({ company: "X" }));
    expect(result.ok).toBe(false);
  });

  it("sahib ÖZ qeydini redaktə edə bilir", async () => {
    const entryId = await createOwnedCareerEntry();

    const result = await updateCareerEntry(
      alumni,
      entryId,
      careerPayload({ company: "Yenilənmiş şirkət" }),
    );

    expect(result.ok).toBe(true);
    const row = await prisma.careerEntry.findUniqueOrThrow({
      where: { id: entryId },
      select: { company: true },
    });
    expect(row.company).toBe("Yenilənmiş şirkət");
  });

  it("EducationEntry üçün də eyni qayda işləyir", async () => {
    const created = await prisma.educationEntry.create({
      data: {
        userId: alumni.userId,
        institution: "Test İnstitutu",
        degree: "MASTER",
        startYear: 2024,
        endYear: null,
        isCurrent: true,
        visibility: Visibility.PUBLIC,
        includeInStats: false,
      },
      select: { id: true },
    });

    const result = await updateEducationEntry(outsider, created.id, {
      institution: "OĞURLANMIŞ",
      degree: "PHD",
      field: null,
      country: null,
      startYear: 2020,
      endYear: null,
      isCurrent: true,
      visibility: Visibility.PUBLIC,
      includeInStats: true,
    });

    expect(result.ok).toBe(false);
    const row = await prisma.educationEntry.findUniqueOrThrow({
      where: { id: created.id },
      select: { institution: true },
    });
    expect(row.institution).toBe("Test İnstitutu");
  });
});

// ===========================================================================
// 2. 🔴 İKİ RAZILIQ MÜSTƏQİLDİR — görünürlük ≠ aqreqasiya
// ===========================================================================

describe("görünürlük və includeInStats müstəqilliyi", () => {
  it("🔴 `includeInStats = false` qeyd STATİSTİKAYA DÜŞMÜR, amma PROFİLDƏ GÖRÜNÜR", async () => {
    const before = await getWhereAreWeNowStats(alumni);

    // Qeyd ƏN AÇIQ səviyyədədir (PUBLIC) və caridir — yəni statistikaya
    // düşməməsinin YEGANƏ səbəbi aqreqasiya razılığının olmamasıdır.
    const entryId = await createOwnedCareerEntry({
      country: "Testlandiya-Stat",
      visibility: Visibility.PUBLIC,
      includeInStats: false,
      isCurrent: true,
    });

    // --- SANITY: sətir bazada VAR (boş nəticə ilə yaşıl olma tələsi) ---
    expect(
      await prisma.careerEntry.count({ where: { country: "Testlandiya-Stat" } }),
    ).toBe(1);

    const withoutConsent = await getWhereAreWeNowStats(alumni);

    // Statistika DƏYİŞMƏDİ: nə görünən xanalar, nə də "Digər" sayğacı.
    expect(withoutConsent.countries.visible).toEqual(before.countries.visible);
    expect(withoutConsent.countries.otherCount).toBe(before.countries.otherCount);
    expect(withoutConsent.respondentCount).toBe(before.respondentCount);

    // ...amma qeyd PROFİLDƏ görünür — hətta kənar sinif üzvünə də (PUBLIC).
    const outsiderView = await buildProfileView(outsider, alumni.userId);
    expect(outsiderView?.view.careerHistory.some((entry) => entry.id === entryId)).toBe(true);

    // --- İndi YALNIZ aqreqasiya razılığını veririk, görünürlüyə toxunmadan ---
    const consented = await updateCareerEntry(
      alumni,
      entryId,
      careerPayload({
        country: "Testlandiya-Stat",
        visibility: Visibility.PUBLIC,
        includeInStats: true,
        isCurrent: true,
      }),
    );
    expect(consented.ok).toBe(true);

    const withConsent = await getWhereAreWeNowStats(alumni);

    // Yeni ölkə TƏK sətirlik xanadır → k-anonimlik onu "Digər"ə yığır
    // (`MIN_BUCKET_SIZE = 3`), yəni ölkə adı ekranda GÖRÜNMÜR, amma sayılır.
    expect(withConsent.countries.otherCount).toBe(before.countries.otherCount + 1);
    expect(
      withConsent.countries.visible.some((bucket) => bucket.key === "Testlandiya-Stat"),
    ).toBe(false);
  });

  it("PRIVATE qeyd sinif yoldaşının profil görünüşünə DÜŞMÜR", async () => {
    // Sətir səviyyəli görünürlük (`visibilityWhereForUserOwned`) sahə
    // səviyyəsindən AYRI işləyir: `careerHistory` sahəsi açıq olsa da PRIVATE
    // sətir heç vaxt yüklənmir.
    const entryId = await createOwnedCareerEntry({
      company: "Gizli iş yeri",
      visibility: Visibility.PRIVATE,
      isCurrent: false,
      endDate: new Date("2024-06-01"),
    });

    const ownerView = await buildProfileView(alumni, alumni.userId);
    expect(ownerView?.view.careerHistory.some((entry) => entry.id === entryId)).toBe(true);

    const classmateView = await buildProfileView(classmate, alumni.userId);
    expect(classmateView?.view.careerHistory.some((entry) => entry.id === entryId)).toBe(false);
  });

  it("`isCurrent` TƏKDİR — yeni cari qeyd köhnəsini keçmişə keçirir", async () => {
    // Səbəb `stats.service`-dədir: cari sətirlər ölkə/sənaye xanalarında
    // sayılır, iki cari iş bir nəfəri iki ölkədə göstərərdi.
    const first = await createOwnedCareerEntry({ company: "Birinci", isCurrent: true });
    const second = await createOwnedCareerEntry({ company: "İkinci", isCurrent: true });

    const rows = await prisma.careerEntry.findMany({
      where: { userId: alumni.userId, isCurrent: true },
      select: { id: true },
    });

    expect(rows.map((row) => row.id)).toEqual([second]);
    expect(rows.map((row) => row.id)).not.toContain(first);
  });
});

// ===========================================================================
// 3. ÜÇÜNCÜ RAZILIQ — openToSupport
// ===========================================================================

describe("openToSupport", () => {
  it("🔴 bayraq SÖNÜLÜ olanda təkliflər HEÇ YERDƏ görünmür", async () => {
    const offers = [
      { type: "MENTORING", note: "Test qeydi" },
      { type: "CAREER_TALK", note: null },
    ];

    // --- Bayraq sönülü, seçim var ---
    const off = await updateSupportSettings(alumni, { openToSupport: false, offers });
    expect(off.ok).toBe(true);

    // Sətirlər BAZADA var — yəni boş nəticə "məlumat yoxdur"dan gəlmir.
    expect(await prisma.supportOffer.count({ where: { userId: alumni.userId } })).toBe(2);

    const hiddenList = await listSupportOffers(classmate, alumniCohortId, 100);
    expect(hiddenList.some((card) => card.user.id === alumni.userId)).toBe(false);

    const hiddenProfile = await getProfile(classmate, alumni.userId);
    expect(hiddenProfile?.support.offers).toEqual([]);
    expect(hiddenProfile?.support.openToSupport).toBe(false);

    // SAHİB isə öz seçimlərini görür (əks halda "niyə görünmürəm?" sualı
    // cavabsız qalardı) — UI orada xəbərdarlıq göstərir.
    const ownerProfile = await getProfile(alumni, alumni.userId);
    expect(ownerProfile?.support.offers).toHaveLength(2);

    // --- Bayraq AÇIQ, eyni seçimlər ---
    const on = await updateSupportSettings(alumni, { openToSupport: true, offers });
    expect(on.ok).toBe(true);

    const visibleList = await listSupportOffers(classmate, alumniCohortId, 100);
    expect(visibleList.some((card) => card.user.id === alumni.userId)).toBe(true);

    const visibleProfile = await getProfile(classmate, alumni.userId);
    expect(visibleProfile?.support.offers.map((offer) => offer.type).sort()).toEqual([
      "CAREER_TALK",
      "MENTORING",
    ]);
  });

  it("7 növün hamısı saxlanıla bilir və qeydlər itmir", async () => {
    const all = [
      "GUEST_LECTURE",
      "CAREER_TALK",
      "INTERNSHIP",
      "JOB_SHARING",
      "MENTORING",
      "STARTUP_COLLAB",
      "EVENT_PARTICIPATION",
    ].map((type) => ({ type, note: `${type} qeydi` }));

    const result = await updateSupportSettings(alumni, { openToSupport: true, offers: all });
    expect(result.ok).toBe(true);

    const workspace = await getCareerWorkspace(alumni);
    expect(workspace?.offers).toHaveLength(7);
    expect(workspace?.offers.every((offer) => offer.note?.endsWith("qeydi"))).toBe(true);
  });

  it("naməlum dəstək növü rədd olunur", async () => {
    const result = await updateSupportSettings(alumni, {
      openToSupport: true,
      offers: [{ type: "COFFEE_CHAT", note: null }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("INVALID_INPUT");
  });
});

// ===========================================================================
// 4. updateProfile — skalyar + əlaqə + görünürlük, TƏK transaksiya
// ===========================================================================

describe("updateProfile", () => {
  /** Cari vəziyyətdən tam giriş qurur — yalnız test etdiyimiz sahə dəyişir. */
  async function inputFromDraft(
    patch: Partial<{
      scalars: Record<string, string | null>;
      tags: Array<{ tagId: string; level: string | null }>;
      clubIds: string[];
      visibility: Record<string, string>;
    }> = {},
  ) {
    const draft = await getProfileDraft(alumni);
    if (!draft) throw new Error("draft yoxdur");

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: alumni.userId },
      select: { firstName: true, lastName: true },
    });

    return {
      firstName: user.firstName,
      lastName: user.lastName,
      scalars: { ...draft.scalars, ...(patch.scalars ?? {}) } as typeof draft.scalars,
      tags: patch.tags ?? draft.tags,
      clubIds: patch.clubIds ?? draft.clubs.map((club) => club.clubId),
      visibility: Object.entries({ ...draft.visibility, ...(patch.visibility ?? {}) }).map(
        ([field, level]) => ({ field, level }),
      ),
    };
  }

  it("🔴 redaktədən sonra `buildProfileView` YENİ dəyəri qaytarır", async () => {
    const marker = `Blok 7 inteqrasiya testi ${Date.now()}`;

    const result = await updateProfile(alumni, await inputFromDraft({ scalars: { bio: marker } }));
    expect(result.ok).toBe(true);

    const view = await buildProfileView(alumni, alumni.userId);
    expect(view?.view.bio).toBe(marker);
  });

  it("əlaqə sahəsi (taq) DİFF ilə yazılır — əlavə və çıxarma işləyir", async () => {
    const draft = await getProfileDraft(alumni);
    if (!draft) throw new Error("draft yoxdur");

    const selected = new Set(draft.tags.map((tag) => tag.tagId));
    const fresh = await prisma.tag.findFirstOrThrow({
      where: { id: { notIn: [...selected] }, type: "INTEREST" },
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });

    // --- ƏLAVƏ ---
    const added = await updateProfile(
      alumni,
      await inputFromDraft({ tags: [...draft.tags, { tagId: fresh.id, level: null }] }),
    );
    expect(added.ok).toBe(true);

    const afterAdd = await buildProfileView(alumni, alumni.userId);
    expect(afterAdd?.view.interests).toContain(fresh.name);

    // --- ÇIXARMA ---
    const removed = await updateProfile(alumni, await inputFromDraft({ tags: draft.tags }));
    expect(removed.ok).toBe(true);

    const afterRemove = await buildProfileView(alumni, alumni.userId);
    expect(afterRemove?.view.interests).not.toContain(fresh.name);
    // Qalan taqlara TOXUNULMAYIB.
    expect(
      await prisma.userTag.count({ where: { userId: alumni.userId } }),
    ).toBe(draft.tags.length);
  });

  it("dil taqının səviyyəsi sətir SİLİNMƏDƏN yenilənir", async () => {
    const language = await prisma.userTag.findFirst({
      where: { userId: alumni.userId, tag: { type: "LANGUAGE" } },
      select: { tagId: true, level: true },
    });

    // Məzunda dil taqı yoxdursa test mənasızdır — seed hər istifadəçiyə ən azı
    // bir dil verir, yəni bu şərt sanity yoxlamasıdır.
    expect(language, "seed hər istifadəçiyə dil taqı verir").not.toBeNull();
    if (!language) return;

    const draft = await getProfileDraft(alumni);
    if (!draft) throw new Error("draft yoxdur");

    const nextLevel = language.level === "C1" ? "B1" : "C1";
    const result = await updateProfile(
      alumni,
      await inputFromDraft({
        tags: draft.tags.map((tag) =>
          tag.tagId === language.tagId ? { ...tag, level: nextLevel } : tag,
        ),
      }),
    );
    expect(result.ok).toBe(true);

    const row = await prisma.userTag.findUniqueOrThrow({
      where: { userId_tagId: { userId: alumni.userId, tagId: language.tagId } },
      select: { level: true },
    });
    expect(row.level).toBe(nextLevel);
  });

  it("kataloqda OLMAYAN taq rədd olunur (yeni `Tag` yaradılmır)", async () => {
    const before = await prisma.tag.count();

    const result = await updateProfile(
      alumni,
      await inputFromDraft({ tags: [{ tagId: "uydurma-taq-id", level: null }] }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("UNKNOWN_TAG");
    // Kataloq TOXUNULMAYIB — sərbəst mətn taq yaratmır.
    expect(await prisma.tag.count()).toBe(before);
  });

  it("🔴 səviyyə DƏYİŞMƏYƏNDƏ `FieldVisibility` sətri yaranmır (defolt işləyir)", async () => {
    // Sətri silirik → `getFieldVisibility` defolta düşür.
    await prisma.fieldVisibility.deleteMany({
      where: { userId: alumni.userId, field: "skills" },
    });

    const levels = await getFieldVisibility(alumni);
    expect(levels.skills).toBe(defaultLevelFor("skills"));

    // Forma HƏMİN dəyəri geri göndərir (istifadəçi sahəyə toxunmayıb).
    const unchanged = await updateProfile(
      alumni,
      await inputFromDraft({ visibility: { skills: defaultLevelFor("skills") } }),
    );
    expect(unchanged.ok).toBe(true);

    expect(
      await prisma.fieldVisibility.count({ where: { userId: alumni.userId, field: "skills" } }),
      "dəyişməyən sahə üçün sətir yazılmamalıdır",
    ).toBe(0);

    // --- İndi HƏQİQƏTƏN dəyişirik → sətir yaranır ---
    const changed = await updateProfile(
      alumni,
      await inputFromDraft({ visibility: { skills: Visibility.PUBLIC } }),
    );
    expect(changed.ok).toBe(true);

    const row = await prisma.fieldVisibility.findFirstOrThrow({
      where: { userId: alumni.userId, field: "skills" },
      select: { level: true },
    });
    expect(row.level).toBe(Visibility.PUBLIC);
  });

  it("🔴 `phone` səviyyəsi profil redaktəsindən sonra da PRIVATE qalır", async () => {
    // Forma 21 sahəni birlikdə göndərir. Fərq süzülməsəydi (və ya defolt
    // səhv oxunsaydı) telefon səssizcə açıla bilərdi — bu, ən təhlükəli
    // səssiz səhv olardı.
    await prisma.fieldVisibility.deleteMany({
      where: { userId: alumni.userId, field: "phone" },
    });

    const result = await updateProfile(alumni, await inputFromDraft({ scalars: { bio: "yenidən" } }));
    expect(result.ok).toBe(true);

    const levels = await getFieldVisibility(alumni);
    expect(levels.phone).toBe(Visibility.PRIVATE);

    // Kənar viewer telefonu GÖRMÜR.
    const profile = await getProfile(classmate, alumni.userId);
    expect("phone" in (profile?.profile ?? {})).toBe(false);
  });

  it("görünürlük dəyişikliyi `getProfile` nəticəsində DƏRHAL əks olunur", async () => {
    const marker = `Görünürlük testi ${Date.now()}`;

    // CLASS → sinif yoldaşı görür, kənar sinif üzvü görmür.
    await updateProfile(
      alumni,
      await inputFromDraft({
        scalars: { bio: marker },
        visibility: { bio: Visibility.CLASS },
      }),
    );

    expect((await getProfile(classmate, alumni.userId))?.profile.bio).toBe(marker);
    expect("bio" in ((await getProfile(outsider, alumni.userId))?.profile ?? {})).toBe(false);

    // PRIVATE → sinif yoldaşı da görmür.
    await updateProfile(
      alumni,
      await inputFromDraft({ visibility: { bio: Visibility.PRIVATE } }),
    );

    expect("bio" in ((await getProfile(classmate, alumni.userId))?.profile ?? {})).toBe(false);
    // Sahib həmişə görür.
    expect((await getProfile(alumni, alumni.userId))?.profile.bio).toBe(marker);
  });

  it("naməlum sahə adı rədd olunur", async () => {
    const input = await inputFromDraft();
    input.visibility.push({ field: "secretField", level: Visibility.PUBLIC });

    const result = await updateProfile(alumni, input);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("UNKNOWN_FIELD");
  });

  it("anonim viewer profil redaktə edə bilmir", async () => {
    const result = await updateProfile(
      { kind: "ANONYMOUS" },
      await inputFromDraft({ scalars: { bio: "anonim" } }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("UNAUTHENTICATED");
  });
});
