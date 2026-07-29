// @vitest-environment node
// ============================================================================
// tests/integration/directory.db.test.ts
// Class Directory [M6] — 13 filtrin REAL BAZAYA qarşı yoxlanışı.
//
// ⚠️ YALNIZ OXUYUR — heç bir sətir yaratmır, dəyişmir, silmir. Seed edilmiş
// `prisma/dev.db` tələb olunur (`npm run db:seed`).
//
// 🔴 BU FAYLIN ƏSAS SUALI: gizlədilmiş sahəyə görə filtr həmin sahəni
// sızdırırmı? Vahid testlər (`src/lib/directory-filters.test.ts`) filtrin
// TƏRİFİNİ yoxlayır; bu fayl həmin tərifin SQL-ə düşəndə əsl nəticə verdiyini
// yoxlayır.
//
// Hər testdə "boş nəticə ilə yaşıl olmaq" tələsinə qarşı SANITY yoxlaması var:
// əvvəlcə süzülməli məlumatın BAZADA MÖVCUD olduğu təsdiqlənir.
// ============================================================================

import { PrismaClient, type Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  DIRECTORY_FILTERS,
  FACETED_FILTER_KEYS,
  emptyDirectoryFilters,
  type DirectoryFilterKey,
  type DirectoryFilterState,
} from "@/lib/directory-filters";
import { ANONYMOUS, fieldVisibleWhere, type Viewer } from "@/lib/visibility";
import {
  listDirectory,
  listDirectoryFacets,
  searchUsers,
  type DirectoryFacetOption,
} from "@/services/user.service";
import { searchEverything } from "@/services/search.service";

const prisma = new PrismaClient();

/** Səhifələmə deyil, ƏHATƏ yoxlanılır — bütün uyğun sətirlər çəkilir. */
const ALL = 1000;

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

/** Tək filtri qoyulmuş vəziyyət — `multi` açarlar massiv istəyir. */
function withFilter(key: DirectoryFilterKey, value: string): DirectoryFilterState {
  const base = emptyDirectoryFilters();

  switch (key) {
    case "interest":
    case "language":
    case "club":
      return { ...base, [key]: [value] };
    case "admissionYear":
    case "graduationYear":
      return { ...base, [key]: Number.parseInt(value, 10) };
    default:
      return { ...base, [key]: value };
  }
}

let student: UserViewer;
let alumni: UserViewer;
let studentCohortId: string;

beforeAll(async () => {
  // PLAN.md §7 test hesabları: `rep` sec2023-də, `alumni` fin2018-də.
  [student, alumni] = await Promise.all([
    viewerOf("rep@qu.edu.az"),
    viewerOf("alumni@qu.edu.az"),
  ]);

  // Cohort-lar KƏSİŞMƏMƏLİDİR, yoxsa "fərqli sinif" testləri mənasız olar.
  expect(student.cohortIds.filter((id) => alumni.cohortIds.includes(id))).toEqual([]);
  expect(student.cohortIds.length).toBeGreaterThan(0);

  studentCohortId = student.cohortIds[0];
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ===========================================================================
// 1. 🔴 ƏN VACİB — PRIVATE sahəyə görə filtr həmin istifadəçini GİZLƏDİR
// ===========================================================================

describe("PRIVATE sahəyə görə filtr", () => {
  it("şəhərini gizlədən istifadəçini şəhər filtri QAYTARMIR", async () => {
    // --- SANITY: belə istifadəçi bazada VAR (boş nəticə ilə yaşıl olma tələsi) ---
    const hidden = await prisma.user.findMany({
      where: {
        memberships: { some: { cohortId: studentCohortId } },
        currentCity: { not: null },
        fieldVisibility: { some: { field: "currentCity", level: "PRIVATE" } },
      },
      select: { id: true, currentCity: true },
    });

    expect(hidden.length, "PRIVATE şəhərli seed istifadəçisi").toBeGreaterThan(0);

    const city = hidden[0].currentCity!;
    const hiddenIds = new Set(
      hidden.filter((row) => row.currentCity === city).map((row) => row.id),
    );

    // --- SANITY: həmin şəhərdə GÖRÜNƏN istifadəçilər də var, yəni filtr
    //     ümumiyyətlə işləyir (nəticə tam boş deyil) ---
    const visibleSame = await prisma.user.count({
      where: {
        memberships: { some: { cohortId: studentCohortId } },
        currentCity: city,
        fieldVisibility: {
          some: { field: "currentCity", level: { in: ["PUBLIC", "UNIVERSITY", "CLASS"] } },
        },
      },
    });
    expect(visibleSame, `${city} şəhərində görünən istifadəçi`).toBeGreaterThan(0);

    const page = await listDirectory(student, {
      cohortId: studentCohortId,
      filters: withFilter("city", city),
      take: ALL,
    });

    expect(page.items.length).toBeGreaterThan(0);

    // 🔴 Gizlədən istifadəçi nəticədə YOXDUR — dəyər ekranda görünməsə də,
    // sətrin qayıtması özü şəhəri açıqlayardı.
    for (const item of page.items) {
      expect(hiddenIds.has(item.id), `${item.id} gizli şəhərlə qayıtdı`).toBe(false);
    }
    expect(page.total).toBe(visibleSame);
  });

  it("sahibi ÖZ gizli sahəsinə görə filtrləyə bilir", async () => {
    const owner = await prisma.user.findFirstOrThrow({
      where: {
        memberships: { some: { cohortId: studentCohortId } },
        currentCity: { not: null },
        fieldVisibility: { some: { field: "currentCity", level: "PRIVATE" } },
      },
      select: { id: true, currentCity: true, memberships: { select: { cohortId: true } } },
    });

    const selfViewer: UserViewer = {
      kind: "USER",
      userId: owner.id,
      cohortIds: owner.memberships.map((m) => m.cohortId),
      systemRole: "USER",
      moderatedCohortIds: [],
    };

    const page = await listDirectory(selfViewer, {
      cohortId: studentCohortId,
      filters: withFilter("city", owner.currentCity!),
      take: ALL,
    });

    // Sahib şaxəsi (`fieldVisibleWhere` → (1)) işləyir: öz məlumatını görür.
    expect(page.items.map((item) => item.id)).toContain(owner.id);
  });

  it("HEÇ BİR filtr gizli sahəsi olan istifadəçini qaytarmır (13 filtr üzrə süpürgə)", async () => {
    // Generik yoxlama: hər facet dəyəri üçün filtr işlədilir və qaytarılan
    // sətirlərin heç birində həmin sahə PRIVATE olmamalıdır. Yeni filtr əlavə
    // olunanda bu test onu AVTOMATİK əhatə edir.
    const facets = await listDirectoryFacets(student, { cohortId: studentCohortId });
    let checkedFilters = 0;

    for (const key of FACETED_FILTER_KEYS) {
      const field = DIRECTORY_FILTERS[key].profileField;
      if (field === null) continue;

      for (const option of facets[key]) {
        const page = await listDirectory(student, {
          cohortId: studentCohortId,
          filters: withFilter(key, option.value),
          take: ALL,
        });
        if (page.items.length === 0) continue;

        const leaked = await prisma.user.findMany({
          where: {
            id: { in: page.items.map((item) => item.id) },
            fieldVisibility: { some: { field, level: "PRIVATE" } },
          },
          select: { id: true },
        });

        expect(leaked, `${key}=${option.value} → ${field} PRIVATE sızdı`).toEqual([]);
        checkedFilters += 1;
      }
    }

    // Süpürgə boş getməsin: ən azı bir neçə filtr dəyəri yoxlanmış olmalıdır.
    expect(checkedFilters, "yoxlanmış filtr dəyəri").toBeGreaterThan(0);
  });
});

// ===========================================================================
// 2. CLASS səviyyəsi — sinif paylaşmayan viewer filtrləyə BİLMİR
// ===========================================================================

describe("CLASS sahəsinə görə filtr", () => {
  it("fərqli cohort üzvü üçün mühərrikin şərti sıfır sətir seçir", async () => {
    // Kataloq onsuz da yalnız viewer-in öz siniflərini göstərir, yəni bu
    // qoruma praktikada ikinci qatdır. Ona görə invariant BİRBAŞA ölçülür:
    // `fieldVisibleWhere` şərti kənar viewer üçün CLASS sətirlərini seçmir.
    const target = await prisma.user.findFirstOrThrow({
      where: {
        memberships: { some: { cohortId: studentCohortId } },
        currentCity: { not: null },
        fieldVisibility: { some: { field: "currentCity", level: "CLASS" } },
      },
      select: { id: true },
      orderBy: { id: "asc" },
    });

    const outsiderMatch = await prisma.user.count({
      where: {
        AND: [
          { id: target.id },
          fieldVisibleWhere<Prisma.UserWhereInput>(alumni, "currentCity"),
        ],
      },
    });
    expect(outsiderMatch, "kənar viewer CLASS sahəsini görməməli").toBe(0);

    const classmateMatch = await prisma.user.count({
      where: {
        AND: [
          { id: target.id },
          fieldVisibleWhere<Prisma.UserWhereInput>(student, "currentCity"),
        ],
      },
    });
    expect(classmateMatch, "sinif yoldaşı CLASS sahəsini görməli").toBe(1);
  });

  it("fərqli cohort üzvü o sinfin kataloqunu ümumiyyətlə aça bilmir", async () => {
    const page = await listDirectory(alumni, {
      cohortId: studentCohortId,
      take: ALL,
    });

    // `cohortId` kənardan gəlir və viewer-in üzvlükləri ilə kəsişməyə salınır.
    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);

    const facets = await listDirectoryFacets(alumni, { cohortId: studentCohortId });
    expect(facets.city).toEqual([]);
  });

  it("anonim viewer kataloqda heç nə görmür", async () => {
    const membersExist = await prisma.user.count({
      where: { memberships: { some: { cohortId: studentCohortId } } },
    });
    expect(membersExist).toBeGreaterThan(0);

    const page = await listDirectory(ANONYMOUS, { cohortId: studentCohortId, take: ALL });
    expect(page).toEqual({ items: [], total: 0 });

    const facets = await listDirectoryFacets(ANONYMOUS, { cohortId: studentCohortId });
    for (const key of FACETED_FILTER_KEYS) {
      expect(facets[key], key).toEqual([]);
    }
  });
});

// ===========================================================================
// 3. Facet sayları
// ===========================================================================

describe("listDirectoryFacets", () => {
  it("facet sayı həmin filtrin nəticə sayı ilə ÜST-ÜSTƏ DÜŞÜR", async () => {
    const facets = await listDirectoryFacets(student, { cohortId: studentCohortId });
    let checked = 0;

    for (const key of FACETED_FILTER_KEYS) {
      for (const option of facets[key]) {
        const page = await listDirectory(student, {
          cohortId: studentCohortId,
          filters: withFilter(key, option.value),
          take: ALL,
        });

        expect(page.total, `${key}=${option.value}`).toBe(option.count);
        checked += 1;
      }
    }

    expect(checked, "yoxlanmış facet dəyəri").toBeGreaterThan(0);
  });

  it("facet sayı sahəsini gizlədən istifadəçini SAYMIR", async () => {
    // "Bakı (12)" yazısı da sızdırır: say görünürlük şərtindən keçməsə,
    // istifadəçi gizlədilmiş şəhəri rəqəmdən hesablaya bilər.
    const hidden = await prisma.user.findFirstOrThrow({
      where: {
        memberships: { some: { cohortId: studentCohortId } },
        currentCity: { not: null },
        fieldVisibility: { some: { field: "currentCity", level: "PRIVATE" } },
      },
      select: { currentCity: true },
    });

    const city = hidden.currentCity!;

    const rawCount = await prisma.user.count({
      where: { memberships: { some: { cohortId: studentCohortId } }, currentCity: city },
    });

    const facets = await listDirectoryFacets(student, { cohortId: studentCohortId });
    const option = facets.city.find((item) => item.value === city);

    expect(option, `${city} facet-i`).toBeDefined();
    expect(option!.count).toBeLessThan(rawCount);
  });

  it("facet öz filtrini KƏNARDA saxlayır — seçimdən sonra digər variantlar qalır", async () => {
    const base = await listDirectoryFacets(student, { cohortId: studentCohortId });
    expect(base.city.length, "sinifdə ən azı iki şəhər").toBeGreaterThan(1);

    const chosen = base.city[0].value;
    const narrowed = await listDirectoryFacets(student, {
      cohortId: studentCohortId,
      filters: withFilter("city", chosen),
    });

    // Şəhər seçildikdən sonra şəhər siyahısı DARALMAMALIDIR (əks halda
    // istifadəçi filtri dəyişə bilməzdi), digər qruplar isə daralır.
    expect(narrowed.city.map((option) => option.value)).toEqual(
      base.city.map((option) => option.value),
    );
  });

  it("facet dəyərləri boş və dublikat DEYİL", async () => {
    const facets = await listDirectoryFacets(student, { cohortId: studentCohortId });

    for (const key of FACETED_FILTER_KEYS) {
      const values = facets[key].map((option: DirectoryFacetOption) => option.value);
      expect(new Set(values).size, `${key} dublikat`).toBe(values.length);

      for (const option of facets[key]) {
        expect(option.value, key).not.toBe("");
        expect(option.count, `${key}=${option.value}`).toBeGreaterThan(0);
      }
    }
  });
});

// ===========================================================================
// 4. Kartda gizli sahə yoxdur (redactProfile) + səhifələmə
// ===========================================================================

describe("kataloq sətirləri", () => {
  it("PRIVATE sahə kart obyektində ÜMUMİYYƏTLƏ yoxdur", async () => {
    const target = await prisma.user.findFirstOrThrow({
      where: {
        memberships: { some: { cohortId: studentCohortId } },
        bio: { not: null },
        fieldVisibility: { some: { field: "bio", level: "PRIVATE" } },
        id: { not: student.userId },
      },
      select: { id: true },
      orderBy: { id: "asc" },
    });

    const page = await listDirectory(student, { cohortId: studentCohortId, take: ALL });
    const entry = page.items.find((item) => item.id === target.id);

    expect(entry, "gizli bio-lu istifadəçi kataloqda görünməlidir").toBeDefined();
    // `null` DEYİL — AÇARIN ÖZÜ yoxdur.
    expect("bio" in entry!).toBe(false);
  });

  it("sinif konteksti yalnız viewer-in öz siniflərini göstərir", async () => {
    const page = await listDirectory(student, { cohortId: studentCohortId, take: ALL });

    for (const item of page.items) {
      expect(item.cohorts.length).toBeGreaterThan(0);
      for (const cohort of item.cohorts) {
        expect(student.cohortIds).toContain(cohort.id);
      }
    }
  });

  it("səhifələmə `total`-ı dəyişmir və sətirləri təkrarlamır", async () => {
    const pageSize = 5;
    const first = await listDirectory(student, {
      cohortId: studentCohortId,
      take: pageSize,
      skip: 0,
    });
    const second = await listDirectory(student, {
      cohortId: studentCohortId,
      take: pageSize,
      skip: pageSize,
    });

    expect(first.total).toBe(second.total);
    expect(first.total).toBeGreaterThan(pageSize);
    expect(first.items).toHaveLength(pageSize);

    const overlap = first.items
      .map((item) => item.id)
      .filter((id) => second.items.some((item) => item.id === id));
    expect(overlap).toEqual([]);
  });

  it("diapazondan kənar səhifə boş nəticə verir, `total` isə qalır", async () => {
    const page = await listDirectory(student, {
      cohortId: studentCohortId,
      take: 24,
      skip: 24 * 50,
    });

    expect(page.items).toEqual([]);
    expect(page.total).toBeGreaterThan(0);
  });
});

// ===========================================================================
// 5. TƏLƏ T14 — azərbaycan hərfləri ilə ad axtarışı
// ===========================================================================

describe("ad filtri (SQLite hərf həssaslığı)", () => {
  it("kiçik hərflə yazılmış azərbaycan adı tapılır", async () => {
    // Sanity: sinifdə azərbaycan hərfi ilə başlayan ad var.
    const members = await prisma.user.findMany({
      where: { memberships: { some: { cohortId: studentCohortId } } },
      select: { id: true, firstName: true },
    });

    const special = members.find((member) => /^[ƏÖÜĞŞÇİ]/.test(member.firstName));
    expect(special, "azərbaycan hərfi ilə başlayan seed adı").toBeDefined();

    const lowered = special!.firstName.toLocaleLowerCase("az");
    expect(lowered).not.toBe(special!.firstName);

    const page = await listDirectory(student, {
      cohortId: studentCohortId,
      filters: { ...emptyDirectoryFilters(), name: lowered },
      take: ALL,
    });

    expect(page.items.map((item) => item.id)).toContain(special!.id);
  });

  it("ad + soyad birlikdə axtarıla bilir", async () => {
    const member = await prisma.user.findFirstOrThrow({
      where: { memberships: { some: { cohortId: studentCohortId } } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { id: "asc" },
    });

    const page = await listDirectory(student, {
      cohortId: studentCohortId,
      filters: {
        ...emptyDirectoryFilters(),
        name: `${member.firstName} ${member.lastName}`,
      },
      take: ALL,
    });

    expect(page.items.map((item) => item.id)).toContain(member.id);
  });
});

// ===========================================================================
// 6. Qlobal axtarış [M16]
// ===========================================================================

describe("searchUsers / searchEverything", () => {
  it("istifadəçi axtarışı YALNIZ viewer-in siniflərini əhatə edir", async () => {
    const outsider = await prisma.user.findFirstOrThrow({
      where: {
        memberships: { some: { cohortId: studentCohortId } },
        NOT: { memberships: { some: { cohortId: { in: alumni.cohortIds } } } },
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { id: "asc" },
    });

    // Öz sinfindən axtaran tapır...
    const found = await searchUsers(student, `${outsider.firstName} ${outsider.lastName}`, 10);
    expect(found.map((hit) => hit.id)).toContain(outsider.id);

    // ...kənar sinif üzvü isə TAPMIR (üzv siyahısı sinif daxili məlumatdır).
    const notFound = await searchUsers(
      alumni,
      `${outsider.firstName} ${outsider.lastName}`,
      10,
    );
    expect(notFound.map((hit) => hit.id)).not.toContain(outsider.id);
  });

  it("anonim viewer istifadəçi tapmır", async () => {
    const member = await prisma.user.findFirstOrThrow({
      where: { memberships: { some: { cohortId: studentCohortId } } },
      select: { firstName: true, lastName: true },
      orderBy: { id: "asc" },
    });

    expect(await searchUsers(ANONYMOUS, member.firstName, 10)).toEqual([]);
  });

  it("çox qısa sorğu DB-yə çıxmır və boş nəticə verir", async () => {
    const results = await searchEverything(student, "a", 5);
    expect(results).toEqual({ users: [], posts: [], events: [], achievements: [] });
  });

  it("dörd növ də limitə tabedir", async () => {
    const member = await prisma.user.findFirstOrThrow({
      where: { memberships: { some: { cohortId: studentCohortId } } },
      select: { firstName: true },
      orderBy: { id: "asc" },
    });

    const results = await searchEverything(student, member.firstName, 5);

    expect(results.users.length).toBeLessThanOrEqual(5);
    expect(results.posts.length).toBeLessThanOrEqual(5);
    expect(results.events.length).toBeLessThanOrEqual(5);
    expect(results.achievements.length).toBeLessThanOrEqual(5);
    expect(results.users.length).toBeGreaterThan(0);
  });

  it("anonim axtarışda görünən paylaşımların hamısı PUBLIC-dir", async () => {
    // Sanity: PUBLIC olmayan, mətni "universitet" olan paylaşım var.
    const term = "universitet";
    const hidden = await prisma.post.count({
      where: {
        status: "ACTIVE",
        visibility: { not: "PUBLIC" },
        body: { contains: term },
      },
    });
    expect(hidden).toBeGreaterThan(0);

    const results = await searchEverything(ANONYMOUS, term, 20);
    expect(results.users).toEqual([]);

    // Nəticələr `visiblePostWhere`-dən keçir: anonim üçün yalnız PUBLIC.
    const returned = await prisma.post.findMany({
      where: { id: { in: results.posts.map((hit) => hit.id) } },
      select: { visibility: true },
    });
    for (const post of returned) {
      expect(post.visibility).toBe("PUBLIC");
    }
  });
});
