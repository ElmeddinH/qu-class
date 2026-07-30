// ============================================================================
// prisma/seed.ts
// QU CLASS — demo datasının doldurulması.
//
// İşə salma:  npx prisma db seed      (package.json → prisma.seed = tsx)
//
// PRİNSİPLƏR
// 1. DETERMİNİSTİK. Bütün təsadüfilik `mulberry32` seeded PRNG-dən gəlir,
//    bütün tarixlər sabit `NOW`-a nisbətəndir, bütün ID-lər əl ilə verilir.
//    Yəni seed-i iki dəfə işlətsən eyni baza alınır (diff = 0).
// 2. ENUM SƏTİR LİTERALI YOXDUR. Hər dəyər `src/lib/enums.ts`-dən gəlir
//    (CLAUDE.md §6).
// 3. MƏRHƏLƏ COHORT-DAN GƏLİR. `User.stage` keşi `resolveStage()` ilə
//    hesablanır, əl ilə yazılmır (PLAN.md §4.6).
// 4. HEÇ BİR CƏDVƏL BOŞ QALMIR — Blok 1 DoD tələbi.
// ============================================================================

import { Prisma } from "@prisma/client";
import { hashSync } from "bcryptjs";

import { prisma } from "@/lib/db";
import {
  AchievementStatus,
  AuditAction,
  ClubRole,
  CohortRole,
  CohortScope,
  ContentStatus,
  Degree,
  EventScope,
  EventStatus,
  INDUSTRY_VALUES,
  LANGUAGE_LEVEL_VALUES,
  MEMORY_TYPE_VALUES,
  MediaType,
  NotificationEntityType,
  NotificationType,
  POST_CATEGORY_VALUES,
  PostCategory,
  PostKind,
  PostStatus,
  REPORT_ENTITY_TYPE_VALUES,
  REPORT_REASON_VALUES,
  ReactionType,
  ReportEntityType,
  ReportStatus,
  RsvpStatus,
  SUPPORT_OFFER_TYPE_VALUES,
  SystemRole,
  TagType,
  TimelineSourceType,
  Visibility,
  type AchievementCategory,
  type JobFunction,
  type MemoryType,
  type Visibility as VisibilityType,
} from "@/lib/enums";
import { ACHIEVEMENT_CATEGORY_VALUES } from "@/lib/enums";
import { buildCohortMilestones } from "@/lib/milestones";
import { academicYearOf, resolveStage } from "@/lib/stage";

import {
  ACHIEVEMENT_CONTENT,
  ASK_ME_ABOUT,
  BIOS,
  CAREER_DESCRIPTIONS,
  CLUBS,
  COHORTS,
  COMMENT_BODIES,
  COMPANIES,
  CONTENT_PAGES,
  COUNTRIES,
  EDUCATION_FIELDS,
  EVENTS,
  EXPECTATIONS,
  FACULTIES,
  FAQS,
  FEMALE_FIRST_NAMES,
  FUTURE_PLANS,
  GUIDE_PLACES,
  HOMETOWNS,
  INSTITUTIONS,
  LAST_NAME_STEMS,
  LEARNING_GOALS,
  MALE_FIRST_NAMES,
  MEMORY_CONTENT,
  POSITIONS,
  POST_BODIES,
  POST_CLOSERS,
  PROGRAMS,
  REPORT_DETAILS,
  REPORT_RESOLUTIONS,
  SUPPORT_OFFER_NOTES,
  TAGS,
} from "./seed-data/content";

// ============================================================================
// 0. Deterministik təməl
// ============================================================================

/** Sabit "indi" — seed-in təkrar işlədilməsində eyni nəticə üçün. */
const NOW = new Date("2026-07-29T09:00:00.000Z");

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * `POSITIONS`-dəki hər sərbəst-mətn vəzifəni aqreqasiya kateqoriyasına bağlayır
 * (Blok 7B — GW analizi, `CareerEntry.jobFunction`).
 *
 * ⚠️ TƏLƏ T6: `pick`/`cycle` İŞLƏDİLMİR — xəritə SABİTDİR. `jobFunction`
 * artıq seçilmiş `position` dəyərinin funksiyasıdır (təkrar seçim olsaydı
 * eyni istifadəçinin vəzifəsi ilə rol kateqoriyası bir-birinə uyğunsuz
 * düşə bilərdi və seed determinizmi eyni qalsa da MƏNASIZ olardı).
 * "Təcrübəçi" (tələbə təcrübə qeydləri) xəritədə YOXDUR — `null` qalır.
 */
const POSITION_JOB_FUNCTIONS: Record<string, JobFunction> = {
  "Proqram təminatı mühəndisi": "ENGINEERING",
  "Məlumat analitiki": "DATA",
  "Kibertəhlükəsizlik mütəxəssisi": "SECURITY",
  "Sistem administratoru": "ENGINEERING",
  "Layihə meneceri": "PRODUCT",
  "Biznes analitiki": "DATA",
  "Maliyyə analitiki": "FINANCE",
  "Kredit mütəxəssisi": "FINANCE",
  "Audit üzrə köməkçi": "FINANCE",
  "Marketinq mütəxəssisi": "MARKETING",
  "Rəqəmsal marketinq üzrə mütəxəssis": "MARKETING",
  "Məzmun redaktoru": "MARKETING",
  "İngilis dili müəllimi": "EDUCATION",
  "Məktəb psixoloqu": "EDUCATION",
  "Tədris koordinatoru": "EDUCATION",
  Aqronom: "OPERATIONS",
  "Keyfiyyətə nəzarət mütəxəssisi": "OPERATIONS",
  "Layihə mühəndisi": "ENGINEERING",
  "İnsan resursları üzrə mütəxəssis": "OPERATIONS",
  "Məhsul meneceri": "PRODUCT",
};

/** mulberry32 — kiçik, sürətli, tam deterministik PRNG. */
function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createRng(20260729);

function randInt(min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

/** Növbə ilə seçim — bütün dəyərlərin data-da görünməsini zəmanətə salır. */
function cycle<T>(items: readonly T[], index: number): T {
  return items[index % items.length];
}

function chance(probability: number): boolean {
  return rng() < probability;
}

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function dateBetween(start: Date, end: Date): Date {
  const span = end.getTime() - start.getTime();
  return new Date(start.getTime() + Math.floor(rng() * Math.max(span, 1)));
}

const AZ_TRANSLITERATION: Record<string, string> = {
  ə: "e", Ə: "E", ı: "i", İ: "I", ö: "o", Ö: "O", ü: "u", Ü: "U",
  ğ: "g", Ğ: "G", ş: "s", Ş: "S", ç: "c", Ç: "C",
};

function toAscii(value: string): string {
  return value
    .split("")
    .map((ch) => AZ_TRANSLITERATION[ch] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** SQLite-ın parametr limitinə düşməmək üçün createMany-ni hissələrə bölür. */
async function insertMany<T>(
  label: string,
  rows: readonly T[],
  create: (chunk: T[]) => Promise<unknown>,
): Promise<number> {
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await create(rows.slice(i, i + CHUNK) as T[]);
  }
  counters[label] = rows.length;
  return rows.length;
}

const counters: Record<string, number> = {};

// ============================================================================
// 1. Görünürlük paylanması
// ============================================================================

/** Realistik paylanma: əksəriyyət CLASS, azlıq PRIVATE. */
function randomVisibility(): VisibilityType {
  const roll = rng();
  if (roll < 0.15) return Visibility.PUBLIC;
  if (roll < 0.45) return Visibility.UNIVERSITY;
  if (roll < 0.95) return Visibility.CLASS;
  return Visibility.PRIVATE;
}

/**
 * Profil sahələri və onların standart görünürlük səviyyəsi.
 * ⚠️ `phone` və `personalEmail` HƏMİŞƏ PRIVATE-dir (CLAUDE.md §məxfilik).
 * Blok 2-də qeydiyyat axını eyni siyahını istifadə edəcək.
 */
const PROFILE_FIELDS: readonly { field: string; fixed?: VisibilityType }[] = [
  { field: "avatarUrl" },
  { field: "hometown" },
  { field: "currentCity" },
  { field: "currentCountry" },
  { field: "phone", fixed: Visibility.PRIVATE },
  { field: "personalEmail", fixed: Visibility.PRIVATE },
  { field: "bio" },
  { field: "learningGoals" },
  { field: "askMeAbout" },
  { field: "expectations" },
  { field: "interests" },
  { field: "hobbies" },
  { field: "skills" },
  { field: "languages" },
  { field: "clubs" },
  { field: "careerHistory" },
  { field: "education" },
  { field: "currentCompany" },
  { field: "currentPosition" },
  { field: "industry" },
];

// ============================================================================
// 2. Wipe — FK-təhlükəsiz sıra ilə
// ============================================================================

async function wipe(): Promise<void> {
  await prisma.auditLog.deleteMany();
  await prisma.report.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.eventRSVP.deleteMany();
  await prisma.timelineEntry.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.memory.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.post.deleteMany();
  await prisma.event.deleteMany();
  await prisma.clubMembership.deleteMany();
  await prisma.club.deleteMany();
  await prisma.supportOffer.deleteMany();
  await prisma.educationEntry.deleteMany();
  await prisma.careerEntry.deleteMany();
  await prisma.userTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.fieldVisibility.deleteMany();
  await prisma.cohortMembership.deleteMany();
  await prisma.cohort.deleteMany();
  await prisma.program.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.user.deleteMany();
  await prisma.contentPage.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.guidePlace.deleteMany();
}

// ============================================================================
// 3. Əsas axın
// ============================================================================

interface CohortRuntime {
  id: string;
  key: string;
  facultyId: string;
  programId: string;
  displayName: string;
  academicStartsAt: Date;
  graduatesAt: Date;
  admissionYear: number;
  /** Məzmun üçün tarix pəncərəsi — postlar bu aralıqda yaranır. */
  contentFrom: Date;
  contentTo: Date;
  memberIds: string[];
}

interface UserRuntime {
  id: string;
  firstName: string;
  lastName: string;
  cohortKey: string;
  stage: string;
}

async function main(): Promise<void> {
  console.log("→ Köhnə data silinir...");
  await wipe();

  // -------------------------------------------------------------------------
  // 3.1 Fakültələr və proqramlar
  // -------------------------------------------------------------------------
  const facultyIdByKey = new Map<string, string>();
  await insertMany("Faculty", FACULTIES, (chunk) =>
    prisma.faculty.createMany({
      data: chunk.map((f) => {
        const id = `fac-${f.key}`;
        facultyIdByKey.set(f.key, id);
        return {
          id,
          name: f.name,
          nameEn: f.nameEn,
          slug: f.slug,
          description: f.description,
        };
      }),
    }),
  );

  const programIdByKey = new Map<string, string>();
  await insertMany("Program", PROGRAMS, (chunk) =>
    prisma.program.createMany({
      data: chunk.map((p) => {
        const id = `prg-${p.key}`;
        programIdByKey.set(p.key, id);
        return {
          id,
          name: p.name,
          nameEn: p.nameEn,
          slug: p.slug,
          degree: p.degree,
          facultyId: facultyIdByKey.get(p.facultyKey)!,
        };
      }),
    }),
  );

  // -------------------------------------------------------------------------
  // 3.2 Cohort-lar
  // -------------------------------------------------------------------------
  const cohorts: CohortRuntime[] = COHORTS.map((c) => {
    const program = PROGRAMS.find((p) => p.key === c.programKey)!;
    const academicStartsAt = new Date(c.academicStartsAt);
    const graduatesAt = new Date(c.graduatesAt);
    const stage = resolveStage({ academicStartsAt, graduatesAt }, NOW);

    // INCOMING cohort-larda dərslər hələ başlamayıb → məzmun qəbul dövrünə aiddir.
    const contentFrom =
      stage === "INCOMING" ? new Date(`${c.admissionYear}-06-20T00:00:00.000Z`) : academicStartsAt;
    const contentTo = graduatesAt < NOW ? graduatesAt : NOW;

    return {
      id: `coh-${c.key}`,
      key: c.key,
      facultyId: facultyIdByKey.get(program.facultyKey)!,
      programId: programIdByKey.get(program.key)!,
      displayName: `${program.name} — Class of ${c.graduationYear}`,
      academicStartsAt,
      graduatesAt,
      admissionYear: c.admissionYear,
      contentFrom,
      contentTo,
      memberIds: [],
    };
  });

  await insertMany("Cohort", COHORTS, (chunk) =>
    prisma.cohort.createMany({
      data: chunk.map((c) => {
        const runtime = cohorts.find((r) => r.key === c.key)!;
        const program = PROGRAMS.find((p) => p.key === c.programKey)!;
        return {
          id: runtime.id,
          scope: CohortScope.PROGRAM,
          facultyId: runtime.facultyId,
          programId: runtime.programId,
          admissionYear: c.admissionYear,
          graduationYear: c.graduationYear,
          academicStartsAt: runtime.academicStartsAt,
          graduatesAt: runtime.graduatesAt,
          displayName: runtime.displayName,
          slug: `${program.slug}-${c.graduationYear}`,
          coverUrl: `https://picsum.photos/seed/qu-cohort-${c.key}/1600/400`,
          welcomeMessage: c.welcomeMessage,
          createdAt: addDays(runtime.academicStartsAt, -90),
        };
      }),
    }),
  );

  // -------------------------------------------------------------------------
  // 3.3 İstifadəçilər
  // -------------------------------------------------------------------------
  // ⚠️ bcrypt hər çağırışda təsadüfi duz yaradır → seed deterministik olmazdı.
  // Demo mühiti üçün duz sabitdir; istehsalda (Blok 2 qeydiyyat axını) hər
  // istifadəçi üçün `hashSync(password, 10)` ilə TƏSADÜFİ duz işlədilir.
  const SEED_BCRYPT_SALT = "$2a$10$QUCLASSseedSalt1234567";
  const passwordHash = hashSync("Test1234!", SEED_BCRYPT_SALT);

  const users: UserRuntime[] = [];
  const userRows: Prisma.UserCreateManyInput[] = [];
  const membershipRows: { id: string; userId: string; cohortId: string; role: string; joinedAt: Date; isPrimary: boolean }[] = [];
  const usedEmails = new Set<string>();

  let userIndex = 0;

  function buildUser(options: {
    cohort: CohortRuntime;
    firstName: string;
    lastName: string;
    email?: string;
    systemRole?: string;
    cohortRole?: string;
  }): string {
    const { cohort, firstName, lastName } = options;
    const id = `usr-${String(userIndex + 1).padStart(3, "0")}`;
    const stage = resolveStage(cohort, NOW);

    let email = options.email;
    if (!email) {
      const base = `${toAscii(firstName)}.${toAscii(lastName)}`;
      let candidate = `${base}@qu.edu.az`;
      let suffix = 1;
      while (usedEmails.has(candidate)) {
        suffix += 1;
        candidate = `${base}${suffix}@qu.edu.az`;
      }
      email = candidate;
    }
    usedEmails.add(email);

    const isAlumni = stage === "ALUMNI";
    const homeCity = pick(HOMETOWNS);
    const placement = isAlumni ? pick(COUNTRIES) : null;
    const currentCity = placement ? pick(placement.cities) : chance(0.7) ? "Xankəndi" : homeCity;
    const currentCountry = placement ? placement.country : "Azərbaycan";

    const careerCompany = isAlumni ? pick(COMPANIES) : null;
    const careerPosition = isAlumni ? pick(POSITIONS) : null;
    const careerIndustry = isAlumni ? cycle(INDUSTRY_VALUES, userIndex) : null;

    userRows.push({
      id,
      email,
      passwordHash,
      emailVerified: chance(0.9) ? addDays(cohort.contentFrom, randInt(0, 30)) : null,
      systemRole: options.systemRole ?? SystemRole.USER,
      stage,
      firstName,
      lastName,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(`${firstName}-${lastName}-${id}`)}`,
      coverUrl: chance(0.4) ? `https://picsum.photos/seed/qu-cover-${id}/1200/300` : null,
      hometown: homeCity,
      currentCity,
      currentCountry,
      phone: chance(0.75) ? `+994 ${randInt(50, 55)} ${randInt(200, 799)} ${randInt(10, 99)} ${randInt(10, 99)}` : null,
      personalEmail: chance(0.5) ? `${toAscii(firstName)}.${toAscii(lastName)}${randInt(10, 99)}@mail.az` : null,
      bio: chance(0.85) ? pick(BIOS) : null,
      learningGoals: chance(0.7) ? pick(LEARNING_GOALS) : null,
      askMeAbout: chance(0.6) ? pick(ASK_ME_ABOUT) : null,
      expectations: chance(0.65) ? pick(EXPECTATIONS) : null,
      currentCompany: careerCompany,
      currentPosition: careerPosition,
      industry: careerIndustry,
      futurePlans: isAlumni || chance(0.3) ? pick(FUTURE_PLANS) : null,
      openToSupport: isAlumni ? chance(0.6) : false,
      createdAt: addDays(cohort.contentFrom, randInt(0, 20)),
      // @updatedAt sahələri açıq verilir — yoxsa hər icrada `now()` düşür və
      // seed determinizmi pozulur.
      updatedAt: addDays(NOW, -randInt(0, 60)),
      lastSeenAt: addDays(NOW, -randInt(0, 45)),
    });

    membershipRows.push({
      id: `mem-${String(userIndex + 1).padStart(3, "0")}`,
      userId: id,
      cohortId: cohort.id,
      role: options.cohortRole ?? CohortRole.MEMBER,
      joinedAt: addDays(cohort.contentFrom, randInt(0, 14)),
      isPrimary: true,
    });

    cohort.memberIds.push(id);
    users.push({ id, firstName, lastName, cohortKey: cohort.key, stage });
    userIndex += 1;

    return id;
  }

  // 120 adi istifadəçi, cohort-lara paylanmış
  for (const cohortSeed of COHORTS) {
    const cohort = cohorts.find((c) => c.key === cohortSeed.key)!;
    for (let i = 0; i < cohortSeed.memberCount; i += 1) {
      const isFemale = chance(0.5);
      const firstName = isFemale ? pick(FEMALE_FIRST_NAMES) : pick(MALE_FIRST_NAMES);
      const stem = pick(LAST_NAME_STEMS);
      const lastName = isFemale ? `${stem}a` : stem;
      buildUser({ cohort, firstName, lastName });
    }
  }

  // 5 test hesabı — hər rol üçün bir dənə (PLAN.md §7)
  const studentCohort = cohorts.find((c) => c.key === "sec2023")!;
  const alumniCohort = cohorts.find((c) => c.key === "fin2018")!;

  const adminId = buildUser({
    cohort: studentCohort,
    firstName: "Aynur",
    lastName: "Rəhimova",
    email: "admin@qu.edu.az",
    systemRole: SystemRole.UNIVERSITY_ADMIN,
    cohortRole: CohortRole.MEMBER,
  });
  const moderatorId = buildUser({
    cohort: studentCohort,
    firstName: "Kamran",
    lastName: "Əliyev",
    email: "moderator@qu.edu.az",
    cohortRole: CohortRole.CLASS_MODERATOR,
  });
  const repId = buildUser({
    cohort: studentCohort,
    firstName: "Nərmin",
    lastName: "Quliyeva",
    email: "rep@qu.edu.az",
    cohortRole: CohortRole.CLASS_REPRESENTATIVE,
  });
  const coordinatorId = buildUser({
    cohort: studentCohort,
    firstName: "Tural",
    lastName: "Həsənov",
    email: "coordinator@qu.edu.az",
    cohortRole: CohortRole.EVENT_COORDINATOR,
  });
  const alumniId = buildUser({
    cohort: alumniCohort,
    firstName: "Elvin",
    lastName: "Məmmədov",
    email: "alumni@qu.edu.az",
    cohortRole: CohortRole.MEMBER,
  });

  // Hər cohort-da bir nümayəndə və bir moderator olsun (test hesabları istisna)
  for (const cohort of cohorts) {
    if (cohort.key === studentCohort.key) continue;
    const [first, second, third] = cohort.memberIds;
    for (const [userId, role] of [
      [first, CohortRole.CLASS_REPRESENTATIVE],
      [second, CohortRole.CLASS_MODERATOR],
      [third, CohortRole.EVENT_COORDINATOR],
    ] as const) {
      const row = membershipRows.find((m) => m.userId === userId);
      if (row) row.role = role;
    }
  }

  await insertMany("User", userRows, (chunk) => prisma.user.createMany({ data: chunk }));
  await insertMany("CohortMembership", membershipRows, (chunk) =>
    prisma.cohortMembership.createMany({ data: chunk }),
  );

  const allUserIds = users.map((u) => u.id);
  const userById = new Map(users.map((u) => [u.id, u]));
  const cohortByKey = new Map(cohorts.map((c) => [c.key, c]));
  const cohortOfUser = (userId: string): CohortRuntime =>
    cohortByKey.get(userById.get(userId)!.cohortKey)!;

  // -------------------------------------------------------------------------
  // 3.4 FieldVisibility
  // -------------------------------------------------------------------------
  const fieldVisibilityRows = allUserIds.flatMap((userId, i) =>
    PROFILE_FIELDS.map((f, j) => ({
      id: `fvz-${String(i + 1).padStart(3, "0")}-${String(j).padStart(2, "0")}`,
      userId,
      field: f.field,
      level: f.fixed ?? randomVisibility(),
    })),
  );
  await insertMany("FieldVisibility", fieldVisibilityRows, (chunk) =>
    prisma.fieldVisibility.createMany({ data: chunk }),
  );

  // -------------------------------------------------------------------------
  // 3.5 Taqlar
  // -------------------------------------------------------------------------
  const tagIds = TAGS.map((_, i) => `tag-${String(i + 1).padStart(2, "0")}`);
  await insertMany("Tag", TAGS, (chunk) =>
    prisma.tag.createMany({
      data: chunk.map((t) => ({
        id: tagIds[TAGS.indexOf(t)],
        type: t.type,
        name: t.name,
        slug: t.slug,
      })),
    }),
  );

  const languageTagIndexes = TAGS.map((t, i) => (t.type === TagType.LANGUAGE ? i : -1)).filter(
    (i) => i >= 0,
  );

  const userTagRows: { userId: string; tagId: string; level: string | null }[] = [];
  for (const userId of allUserIds) {
    const count = randInt(3, 8);
    const chosen = shuffled(TAGS.map((_, i) => i)).slice(0, count);
    // Hər istifadəçidə ən azı bir dil taqı olsun
    if (!chosen.some((i) => languageTagIndexes.includes(i))) {
      chosen.push(pick(languageTagIndexes));
    }
    for (const idx of new Set(chosen)) {
      userTagRows.push({
        userId,
        tagId: tagIds[idx],
        level: TAGS[idx].type === TagType.LANGUAGE ? pick(LANGUAGE_LEVEL_VALUES) : null,
      });
    }
  }
  await insertMany("UserTag", userTagRows, (chunk) => prisma.userTag.createMany({ data: chunk }));

  // -------------------------------------------------------------------------
  // 3.6 Klublar
  // -------------------------------------------------------------------------
  const clubIds = CLUBS.map((_, i) => `clb-${i + 1}`);
  await insertMany("Club", CLUBS, (chunk) =>
    prisma.club.createMany({
      data: chunk.map((c) => ({
        id: clubIds[CLUBS.indexOf(c)],
        name: c.name,
        slug: c.slug,
        description: c.description,
        category: c.category,
        logoUrl: `https://picsum.photos/seed/qu-club-${c.slug}/200/200`,
      })),
    }),
  );

  const clubMembershipKeys = new Set<string>();
  const clubMembershipRows: { userId: string; clubId: string; role: string; joinedAt: Date }[] = [];
  for (const userId of allUserIds) {
    if (!chance(0.55)) continue;
    const count = randInt(1, 2);
    for (let i = 0; i < count; i += 1) {
      const clubId = pick(clubIds);
      const key = `${userId}:${clubId}`;
      if (clubMembershipKeys.has(key)) continue;
      clubMembershipKeys.add(key);
      clubMembershipRows.push({
        userId,
        clubId,
        role: chance(0.1) ? ClubRole.BOARD : ClubRole.MEMBER,
        joinedAt: dateBetween(cohortOfUser(userId).contentFrom, cohortOfUser(userId).contentTo),
      });
    }
  }
  // Hər klubda ən azı bir prezident olsun
  for (const clubId of clubIds) {
    const row = clubMembershipRows.find((m) => m.clubId === clubId);
    if (row) row.role = ClubRole.PRESIDENT;
  }
  await insertMany("ClubMembership", clubMembershipRows, (chunk) =>
    prisma.clubMembership.createMany({ data: chunk }),
  );

  // -------------------------------------------------------------------------
  // 3.7 Tədbirlər
  // -------------------------------------------------------------------------
  interface EventRuntime {
    id: string;
    cohortId: string | null;
    title: string;
    category: string;
    scope: string;
    startsAt: Date;
    isPast: boolean;
    status: string;
    visibility: VisibilityType;
    addedToTimeline: boolean;
  }

  const eventRuntimes: EventRuntime[] = [];
  const eventRows: Prisma.EventCreateManyInput[] = [];
  const eventMediaRows: Prisma.MediaAssetCreateManyInput[] = [];

  EVENTS.forEach((e, i) => {
    const id = `evt-${String(i + 1).padStart(2, "0")}`;
    const startsAt = addDays(NOW, e.dayOffset);
    const isPast = e.dayOffset < 0;

    // Statuslar: keçmişdə əsasən COMPLETED, gələcəkdə PUBLISHED — hər dördü də təmsil olunur.
    let status: string = isPast ? EventStatus.COMPLETED : EventStatus.PUBLISHED;
    if (i === 4) status = EventStatus.CANCELLED;
    if (i === 11) status = EventStatus.CANCELLED;
    if (i === 22) status = EventStatus.DRAFT;

    const scopedCohort =
      e.scope === EventScope.REUNION
        ? cycle([cohortByKey.get("fin2018")!, cohortByKey.get("psy2019")!], i)
        : e.scope === EventScope.CLASS
          ? cycle(cohorts, i)
          : null;

    const club = e.scope === EventScope.CLUB ? cycle(clubIds, i) : null;
    const faculty = e.scope === EventScope.FACULTY ? cycle([...facultyIdByKey.values()], i) : null;

    const creatorId =
      e.scope === EventScope.CLASS || e.scope === EventScope.REUNION
        ? (scopedCohort?.memberIds[2] ?? coordinatorId)
        : cycle([coordinatorId, adminId, repId], i);

    const visibility: VisibilityType =
      e.scope === EventScope.UNIVERSITY
        ? Visibility.UNIVERSITY
        : e.scope === EventScope.CLASS
          ? Visibility.CLASS
          : chance(0.4)
            ? Visibility.PUBLIC
            : Visibility.UNIVERSITY;

    const addedToTimeline = isPast && status === EventStatus.COMPLETED && chance(0.6);

    eventRows.push({
      id,
      cohortId: scopedCohort?.id ?? null,
      clubId: club,
      facultyId: faculty,
      scope: e.scope,
      category: e.category,
      title: e.title,
      description: e.description,
      agenda: e.agenda,
      startsAt,
      endsAt: new Date(startsAt.getTime() + e.durationHours * 60 * 60 * 1000),
      location: e.location,
      onlineUrl: e.isOnline ? `https://meet.qu.edu.az/${id}` : null,
      isOnline: e.isOnline,
      capacity: e.capacity,
      registrationDeadline: addDays(startsAt, -3),
      coverUrl: `https://picsum.photos/seed/qu-event-${id}/1200/500`,
      createdById: creatorId,
      contactId: cycle([coordinatorId, repId, adminId], i + 1),
      visibility,
      status,
      summary: isPast && status === EventStatus.COMPLETED ? `${e.title} başa çatdı. İştirak fəal oldu, geri bildirimlər müsbətdir.` : null,
      attendeeCount: isPast && status === EventStatus.COMPLETED ? randInt(20, e.capacity) : null,
      addedToTimeline,
      createdAt: addDays(startsAt, -randInt(20, 60)),
      updatedAt: addDays(startsAt, -randInt(1, 19)),
    });

    eventRuntimes.push({
      id,
      cohortId: scopedCohort?.id ?? null,
      title: e.title,
      category: e.category,
      scope: e.scope,
      startsAt,
      isPast,
      status,
      visibility,
      addedToTimeline,
    });

    if (isPast && status === EventStatus.COMPLETED) {
      for (let m = 0; m < randInt(1, 3); m += 1) {
        eventMediaRows.push({
          id: `mda-evt-${id}-${m}`,
          eventId: id,
          url: `https://picsum.photos/seed/qu-event-${id}-${m}/1200/800`,
          type: MediaType.IMAGE,
          caption: `${e.title} — tədbirdən kadr ${m + 1}`,
          order: m,
          createdAt: addDays(startsAt, 1),
        });
      }
    }
  });

  await insertMany("Event", eventRows, (chunk) => prisma.event.createMany({ data: chunk }));

  // RSVP-lər
  const rsvpRows: { id: string; eventId: string; userId: string; status: string; registeredAt: Date | null; checkedInAt: Date | null; rating: number | null; feedback: string | null }[] = [];
  let rsvpIndex = 0;
  for (const evt of eventRuntimes) {
    if (evt.status === EventStatus.DRAFT) continue;
    const audience = evt.cohortId
      ? cohorts.find((c) => c.id === evt.cohortId)!.memberIds
      : allUserIds;
    const invited = shuffled(audience).slice(0, Math.min(randInt(10, 30), audience.length));

    for (const userId of invited) {
      rsvpIndex += 1;
      const status = evt.isPast
        ? pick([RsvpStatus.ATTENDED, RsvpStatus.ATTENDED, RsvpStatus.ATTENDED, RsvpStatus.NO_SHOW, RsvpStatus.REGISTERED])
        : pick([RsvpStatus.INVITED, RsvpStatus.ACCEPTED, RsvpStatus.REGISTERED, RsvpStatus.DECLINED, RsvpStatus.WAITLISTED]);
      const attended = status === RsvpStatus.ATTENDED;
      rsvpRows.push({
        id: `rsv-${String(rsvpIndex).padStart(4, "0")}`,
        eventId: evt.id,
        userId,
        status,
        registeredAt: status === RsvpStatus.INVITED ? null : addDays(evt.startsAt, -randInt(1, 14)),
        checkedInAt: attended ? evt.startsAt : null,
        rating: attended && chance(0.6) ? randInt(3, 5) : null,
        feedback: attended && chance(0.25) ? "Təşkilat yaxşı idi, vaxt cədvəlinə riayət olundu." : null,
      });
    }
  }
  await insertMany("EventRSVP", rsvpRows, (chunk) => prisma.eventRSVP.createMany({ data: chunk }));

  // -------------------------------------------------------------------------
  // 3.8 Paylaşımlar (Feed)
  // -------------------------------------------------------------------------
  const POST_COUNT = 300;

  interface PostRuntime {
    id: string;
    authorId: string;
    cohortId: string;
    cohortKey: string;
    category: string;
    kind: string;
    visibility: VisibilityType;
    status: string;
    occurredAt: Date;
    createdAt: Date;
    showOnTimeline: boolean;
    showInAchievements: boolean;
    title: string;
  }

  const postRuntimes: PostRuntime[] = [];
  const postRows: Prisma.PostCreateManyInput[] = [];
  const postMediaRows: Prisma.MediaAssetCreateManyInput[] = [];

  // Cohort-lar üzv sayına görə paylanır ki, böyük siniflərdə daha çox məzmun olsun.
  const postPool: CohortRuntime[] = cohorts.flatMap((c) =>
    Array.from({ length: c.memberIds.length }, () => c),
  );

  for (let i = 0; i < POST_COUNT; i += 1) {
    const id = `pst-${String(i + 1).padStart(3, "0")}`;
    const cohort = pick(postPool);
    const authorId = pick(cohort.memberIds);
    const category = cycle(POST_CATEGORY_VALUES, i);
    const bodyPool = POST_BODIES[category];
    const body = `${bodyPool[i % bodyPool.length]} ${cycle(POST_CLOSERS, i + Math.floor(i / 12))}`;

    const occurredAt = dateBetween(cohort.contentFrom, cohort.contentTo);
    const createdAt = new Date(Math.min(occurredAt.getTime() + randInt(0, 3) * DAY_MS, cohort.contentTo.getTime()));

    let kind: string = PostKind.TEXT;
    const kindRoll = rng();
    if (category === PostCategory.EVENT_PHOTOS) kind = kindRoll < 0.6 ? PostKind.ALBUM : PostKind.PHOTO;
    else if (kindRoll < 0.22) kind = PostKind.PHOTO;
    else if (kindRoll < 0.3) kind = PostKind.ALBUM;
    else if (kindRoll < 0.36) kind = PostKind.LINK;
    else if (kindRoll < 0.42) kind = PostKind.EVENT;
    else if (kindRoll < 0.5) kind = PostKind.MEMORY;
    else if (kindRoll < 0.53) kind = PostKind.VIDEO;
    else if (kindRoll < 0.58) kind = PostKind.ACHIEVEMENT;

    const statusRoll = rng();
    const status =
      statusRoll < 0.9
        ? PostStatus.ACTIVE
        : statusRoll < 0.94
          ? PostStatus.PENDING_REVIEW
          : statusRoll < 0.97
            ? PostStatus.HIDDEN
            : PostStatus.DELETED;

    const visibility = randomVisibility();
    const showOnTimeline = chance(0.4);
    // Nailiyyət kateqoriyalarında ehtimal yüksəkdir; ümumi pay ≈ 15% (spec §7).
    const isAchievementCategory =
      category === PostCategory.ACADEMIC_ACHIEVEMENT ||
      category === PostCategory.SOCIAL_ACHIEVEMENT ||
      category === PostCategory.COMPETITION;
    const showInAchievements =
      kind === PostKind.ACHIEVEMENT || (isAchievementCategory ? chance(0.45) : chance(0.08));

    const referencedEvent =
      kind === PostKind.EVENT
        ? eventRuntimes.filter((e) => e.status !== EventStatus.DRAFT)[
            randInt(0, eventRuntimes.filter((e) => e.status !== EventStatus.DRAFT).length - 1)
          ]
        : null;

    postRows.push({
      id,
      authorId,
      cohortId: cohort.id,
      category,
      kind,
      body,
      linkUrl: kind === PostKind.LINK ? `https://qu.edu.az/xeberler/${toAscii(category)}-${i}` : null,
      linkTitle: kind === PostKind.LINK ? "Universitetin rəsmi elanı" : null,
      linkImage: kind === PostKind.LINK ? `https://picsum.photos/seed/qu-link-${id}/600/300` : null,
      referencedEventId: referencedEvent?.id ?? null,
      visibility,
      showOnTimeline,
      showInAchievements,
      occurredAt,
      status,
      createdAt,
      updatedAt: createdAt,
    });

    postRuntimes.push({
      id,
      authorId,
      cohortId: cohort.id,
      cohortKey: cohort.key,
      category,
      kind,
      visibility,
      status,
      occurredAt,
      createdAt,
      showOnTimeline,
      showInAchievements,
      title: body.slice(0, 70),
    });

    if (kind === PostKind.PHOTO || kind === PostKind.ALBUM) {
      const count = kind === PostKind.ALBUM ? randInt(3, 5) : 1;
      for (let m = 0; m < count; m += 1) {
        postMediaRows.push({
          id: `mda-pst-${id}-${m}`,
          postId: id,
          url: `https://picsum.photos/seed/qu-post-${id}-${m}/1200/800`,
          thumbUrl: `https://picsum.photos/seed/qu-post-${id}-${m}/400/300`,
          type: MediaType.IMAGE,
          mimeType: "image/jpeg",
          sizeBytes: randInt(180_000, 2_400_000),
          width: 1200,
          height: 800,
          caption: `Kadr ${m + 1}`,
          order: m,
          createdAt,
        });
      }
    }
  }

  await insertMany("Post", postRows, (chunk) => prisma.post.createMany({ data: chunk }));
  await insertMany("MediaAsset", [...postMediaRows, ...eventMediaRows], (chunk) =>
    prisma.mediaAsset.createMany({ data: chunk }),
  );

  const visiblePosts = postRuntimes.filter((p) => p.status === PostStatus.ACTIVE);

  // -------------------------------------------------------------------------
  // 3.9 Şərhlər və reaksiyalar
  // -------------------------------------------------------------------------
  const commentRows: { id: string; postId: string; authorId: string; body: string; parentId: string | null; status: string; createdAt: Date }[] = [];
  for (let i = 0; i < 150; i += 1) {
    const post = pick(visiblePosts);
    const cohort = cohortByKey.get(post.cohortKey)!;
    const id = `cmt-${String(i + 1).padStart(3, "0")}`;
    // Şərhlərin ~15%-i əvvəlki şərhə cavabdır
    const parent =
      i > 10 && chance(0.15)
        ? commentRows.filter((c) => c.postId === post.id && c.parentId === null)[0]
        : undefined;

    commentRows.push({
      id,
      postId: post.id,
      authorId: pick(cohort.memberIds),
      body: cycle(COMMENT_BODIES, i),
      parentId: parent?.id ?? null,
      status: chance(0.97) ? ContentStatus.ACTIVE : ContentStatus.HIDDEN,
      createdAt: new Date(post.createdAt.getTime() + randInt(1, 240) * 60 * 1000),
    });
  }
  await insertMany("Comment", commentRows, (chunk) => prisma.comment.createMany({ data: chunk }));

  const reactionKeys = new Set<string>();
  const reactionRows: { postId: string; userId: string; type: string; createdAt: Date }[] = [];
  let reactionGuard = 0;
  while (reactionRows.length < 400 && reactionGuard < 5000) {
    reactionGuard += 1;
    const post = pick(visiblePosts);
    const cohort = cohortByKey.get(post.cohortKey)!;
    const userId = pick(cohort.memberIds);
    const key = `${post.id}:${userId}`;
    if (reactionKeys.has(key)) continue;
    reactionKeys.add(key);
    reactionRows.push({
      postId: post.id,
      userId,
      type: pick([ReactionType.LIKE, ReactionType.LIKE, ReactionType.CELEBRATE, ReactionType.SUPPORT, ReactionType.LOVE]),
      createdAt: new Date(post.createdAt.getTime() + randInt(1, 600) * 60 * 1000),
    });
  }
  await insertMany("Reaction", reactionRows, (chunk) => prisma.reaction.createMany({ data: chunk }));

  // -------------------------------------------------------------------------
  // 3.10 Nailiyyətlər
  // -------------------------------------------------------------------------
  interface AchievementRuntime {
    id: string;
    ownerId: string;
    cohortId: string;
    title: string;
    category: string;
    status: string;
    visibility: VisibilityType;
    awardedAt: Date;
  }

  const achievementRuntimes: AchievementRuntime[] = [];
  const achievementRows: Prisma.AchievementCreateManyInput[] = [];

  const achievementPosts = visiblePosts.filter((p) => p.showInAchievements);
  const ACHIEVEMENT_COUNT = 80;

  for (let i = 0; i < ACHIEVEMENT_COUNT; i += 1) {
    const id = `ach-${String(i + 1).padStart(3, "0")}`;
    const sourcePost = i < Math.min(achievementPosts.length, ACHIEVEMENT_COUNT) ? achievementPosts[i] : null;
    const cohort = sourcePost ? cohortByKey.get(sourcePost.cohortKey)! : pick(cohorts);
    const ownerId = sourcePost ? sourcePost.authorId : pick(cohort.memberIds);
    const category: AchievementCategory = cycle(ACHIEVEMENT_CATEGORY_VALUES, i);
    const content = cycle(ACHIEVEMENT_CONTENT[category], i);

    const statusRoll = rng();
    const status =
      statusRoll < 0.25
        ? AchievementStatus.SUBMITTED
        : statusRoll < 0.7
          ? AchievementStatus.VERIFIED
          : statusRoll < 0.9
            ? AchievementStatus.FEATURED
            : AchievementStatus.ARCHIVED;

    const isVerified = status === AchievementStatus.VERIFIED || status === AchievementStatus.FEATURED;
    const awardedAt = sourcePost ? sourcePost.occurredAt : dateBetween(cohort.contentFrom, cohort.contentTo);
    const visibility = sourcePost ? sourcePost.visibility : randomVisibility();

    achievementRows.push({
      id,
      ownerId,
      cohortId: cohort.id,
      postId: sourcePost?.id ?? null,
      category,
      title: content.title,
      description: content.description,
      organization: content.organization,
      proofUrl: chance(0.5) ? `https://qu.edu.az/tesdiq/${id}` : null,
      imageUrl: chance(0.4) ? `https://picsum.photos/seed/qu-ach-${id}/800/600` : null,
      awardedAt,
      status,
      visibility,
      verifiedById: isVerified ? adminId : null,
      verifiedAt: isVerified ? addDays(awardedAt, randInt(2, 20)) : null,
      verifyNote: isVerified ? "Təqdim olunan sənəd yoxlanıldı və təsdiqləndi." : null,
      createdAt: addDays(awardedAt, randInt(0, 10)),
    });

    achievementRuntimes.push({
      id,
      ownerId,
      cohortId: cohort.id,
      title: content.title,
      category,
      status,
      visibility,
      awardedAt,
    });
  }
  await insertMany("Achievement", achievementRows, (chunk) =>
    prisma.achievement.createMany({ data: chunk }),
  );

  // -------------------------------------------------------------------------
  // 3.10b Xankəndi bələdçisi (Memory-dən ƏVVƏL) — "sevimli yer" körpüsü
  // (Blok 7B — M9 ↔ M3, spec §19). GuidePlace-in özündə FK asılılığı yoxdur,
  // amma AŞAĞIDAKI Memory sətirləri `guidePlaceId` ilə buna işarə edir — SQLite
  // FK-nı yoxlayır, ona görə valideyn sətir ƏVVƏLCƏ mövcud olmalıdır.
  // -------------------------------------------------------------------------
  await insertMany("GuidePlace", GUIDE_PLACES, (chunk) =>
    prisma.guidePlace.createMany({
      data: chunk.map((g) => {
        const index = GUIDE_PLACES.indexOf(g);
        return {
          id: `gpl-${String(index + 1).padStart(2, "0")}`,
          category: g.category,
          title: g.title,
          description: g.description,
          address: g.address ?? null,
          latitude: g.lat ?? null,
          longitude: g.lng ?? null,
          imageUrl: `https://picsum.photos/seed/qu-guide-${index + 1}/900/600`,
          phone: g.phone ?? null,
          openingHours: g.openingHours ?? null,
          websiteUrl: null,
          isEmergency: g.isEmergency ?? false,
          order: index,
        };
      }),
    }),
  );
  const guidePlaceIds = GUIDE_PLACES.map((_, i) => `gpl-${String(i + 1).padStart(2, "0")}`);

  // -------------------------------------------------------------------------
  // 3.11 Xatirələr
  // -------------------------------------------------------------------------
  const memoryPosts = visiblePosts.filter((p) => p.kind === PostKind.MEMORY);
  const memoryRows: Prisma.MemoryCreateManyInput[] = [];

  for (let i = 0; i < 60; i += 1) {
    const id = `mry-${String(i + 1).padStart(3, "0")}`;
    const type: MemoryType = cycle(MEMORY_TYPE_VALUES, i);
    const content = cycle(MEMORY_CONTENT[type], Math.floor(i / MEMORY_TYPE_VALUES.length));
    const sourcePost = i < memoryPosts.length ? memoryPosts[i] : null;
    const cohort = sourcePost ? cohortByKey.get(sourcePost.cohortKey)! : pick(cohorts);
    const authorId = sourcePost ? sourcePost.authorId : pick(cohort.memberIds);
    const occurredAt = sourcePost ? sourcePost.occurredAt : dateBetween(cohort.contentFrom, cohort.contentTo);
    memoryRows.push({
      id,
      authorId,
      cohortId: cohort.id,
      postId: sourcePost?.id ?? null,
      type,
      title: content.title,
      body: content.body,
      dedicatedTo:
        type === "THANKS_TEACHER"
          ? `${pick(MALE_FIRST_NAMES)} ${pick(LAST_NAME_STEMS)} (müəllim)`
          : type === "THANKS_CLASSMATE"
            ? `${pick(FEMALE_FIRST_NAMES)} ${pick(LAST_NAME_STEMS)}a`
            : null,
      imageUrl: chance(0.35) ? `https://picsum.photos/seed/qu-mry-${id}/900/600` : null,
      // ~40% (24/60) — DETERMİNİSTİK: PRNG yox, indeksin qalığı (`i % 5 < 2`).
      // Seçilən məkan `cycle(guidePlaceIds, i)`-dir.
      guidePlaceId: i % 5 < 2 ? cycle(guidePlaceIds, i) : null,
      showInProfile: chance(0.9),
      showInFeed: sourcePost !== null || chance(0.6),
      showInTimeline: chance(0.35),
      showInYearbook: chance(0.45),
      visibility: sourcePost ? sourcePost.visibility : randomVisibility(),
      status: chance(0.97) ? ContentStatus.ACTIVE : ContentStatus.HIDDEN,
      occurredAt,
      createdAt: addDays(occurredAt, randInt(0, 30)),
    });
  }
  await insertMany("Memory", memoryRows, (chunk) => prisma.memory.createMany({ data: chunk }));

  // -------------------------------------------------------------------------
  // 3.12 Timeline (TÖRƏMƏ — əl ilə doldurulmur)
  // -------------------------------------------------------------------------
  const timelineRows: Prisma.TimelineEntryCreateManyInput[] = [];
  let timelineIndex = 0;

  function pushTimeline(row: {
    cohortId: string;
    sourceType: string;
    postId?: string;
    achievementId?: string;
    eventId?: string;
    title: string;
    summary: string | null;
    category: string;
    occurredAt: Date;
    visibility: VisibilityType;
    isSystemMilestone?: boolean;
  }): void {
    timelineIndex += 1;
    timelineRows.push({
      id: `tml-${String(timelineIndex).padStart(3, "0")}`,
      cohortId: row.cohortId,
      sourceType: row.sourceType,
      postId: row.postId ?? null,
      achievementId: row.achievementId ?? null,
      eventId: row.eventId ?? null,
      title: row.title,
      summary: row.summary,
      category: row.category,
      occurredAt: row.occurredAt,
      // ⚠️ academicYear occurredAt-dan hesablanır (sentyabr 1 – avqust 31)
      academicYear: academicYearOf(row.occurredAt),
      // ⚠️ Görünürlük MƏNBƏDƏN kopyalanır, daha açıq ola bilməz.
      visibility: row.visibility,
      isSystemMilestone: row.isSystemMilestone ?? false,
      createdAt: row.occurredAt,
    });
  }

  // POST → Timeline (silinmiş paylaşımlar üçün qeyd YARADILMIR — deletePost
  // eyni transaksiyada TimelineEntry-ni silir, CLAUDE.md "Feed → Timeline")
  for (const post of postRuntimes) {
    if (!post.showOnTimeline || post.status === PostStatus.DELETED) continue;
    pushTimeline({
      cohortId: post.cohortId,
      sourceType: TimelineSourceType.POST,
      postId: post.id,
      title: post.title,
      summary: null,
      category: post.category,
      occurredAt: post.occurredAt,
      visibility: post.visibility,
    });
  }

  // ACHIEVEMENT → Timeline (yalnız təsdiqlənmiş / seçilmiş)
  for (const ach of achievementRuntimes) {
    if (ach.status !== AchievementStatus.FEATURED && ach.status !== AchievementStatus.VERIFIED) continue;
    if (!chance(0.6)) continue;
    pushTimeline({
      cohortId: ach.cohortId,
      sourceType: TimelineSourceType.ACHIEVEMENT,
      achievementId: ach.id,
      title: ach.title,
      summary: "Nailiyyət təsdiqləndi.",
      category: ach.category,
      occurredAt: ach.awardedAt,
      visibility: ach.visibility,
    });
  }

  // EVENT → Timeline
  for (const evt of eventRuntimes) {
    if (!evt.addedToTimeline || !evt.cohortId) continue;
    pushTimeline({
      cohortId: evt.cohortId,
      sourceType: TimelineSourceType.EVENT,
      eventId: evt.id,
      title: evt.title,
      summary: "Tədbir keçirildi.",
      category: evt.category,
      occurredAt: evt.startsAt,
      visibility: evt.visibility,
    });
  }

  // Cohort səviyyəli hərəkətsiz cohort-lar üçün ən azı bir tədbir qeydi
  for (const cohort of cohorts) {
    const pastEvent = eventRuntimes.find(
      (e) => e.cohortId === cohort.id && e.isPast && !e.addedToTimeline && e.status === EventStatus.COMPLETED,
    );
    if (!pastEvent) continue;
    if (timelineRows.some((r) => r.eventId === pastEvent.id)) continue;
    pushTimeline({
      cohortId: cohort.id,
      sourceType: TimelineSourceType.EVENT,
      eventId: pastEvent.id,
      title: pastEvent.title,
      summary: "Tədbir keçirildi.",
      category: pastEvent.category,
      occurredAt: pastEvent.startsAt,
      visibility: pastEvent.visibility,
    });
  }

  // SYSTEM milestone-ları — hər cohort üçün.
  //
  // ⚠️ Blok 8-dən sonra bu sətirlər ƏL İLƏ qurulmur: `buildCohortMilestones`
  // (saf modul) həm seed-in, həm də `ensureCohortMilestones` servisinin VAHİD
  // mənbəyidir. İki yerdə ayrı-ayrı qursaydıq, Timeline səhifəsinin ilk
  // açılışında servis öz variantını yazar və seed-inki DUBLİKAT kimi qalardı
  // (id-lər fərqli olduğu üçün `upsert` onları görməzdi).
  //
  // Deterministik id (`mil-<cohortId>-<açar>`) buradan da gəlir, yəni seed-dən
  // sonra servisin ilk çağırışı heç nə DƏYİŞMİR — `upsert` eyni sətirlərə düşür.
  for (const cohort of cohorts) {
    for (const milestone of buildCohortMilestones(cohort, NOW)) {
      timelineRows.push({ ...milestone, createdAt: milestone.occurredAt });
    }
  }

  await insertMany("TimelineEntry", timelineRows, (chunk) =>
    prisma.timelineEntry.createMany({ data: chunk }),
  );

  // -------------------------------------------------------------------------
  // 3.13 Where Are We Now — karyera, təhsil, dəstək
  // -------------------------------------------------------------------------
  const alumniUsers = users.filter((u) => u.stage === "ALUMNI");
  const careerRows: Prisma.CareerEntryCreateManyInput[] = [];
  let careerIndex = 0;

  alumniUsers.forEach((user) => {
    const cohort = cohortByKey.get(user.cohortKey)!;
    const entryCount = randInt(1, 3);
    let cursor = addDays(cohort.graduatesAt, randInt(10, 120));

    for (let e = 0; e < entryCount; e += 1) {
      careerIndex += 1;
      const isCurrent = e === entryCount - 1;
      const placement = cycle(COUNTRIES, careerIndex);
      const startDate = cursor;
      const endDate = isCurrent ? null : addDays(startDate, randInt(300, 900));
      cursor = endDate ? addDays(endDate, randInt(5, 60)) : startDate;
      if (!isCurrent && cursor > NOW) break;

      const position = cycle(POSITIONS, careerIndex);

      careerRows.push({
        id: `car-${String(careerIndex).padStart(3, "0")}`,
        userId: user.id,
        company: cycle(COMPANIES, careerIndex),
        position,
        jobFunction: POSITION_JOB_FUNCTIONS[position] ?? null,
        industry: cycle(INDUSTRY_VALUES, careerIndex),
        city: cycle(placement.cities, careerIndex),
        country: placement.country,
        startDate,
        endDate,
        isCurrent,
        description: chance(0.7) ? cycle(CAREER_DESCRIPTIONS, careerIndex) : null,
        // ⚠️ Aqreqasiya AYRICA razılıqdır — görünürlük səviyyəsi kifayət etmir.
        includeInStats: chance(0.7),
        visibility: randomVisibility(),
      });
    }
  });

  // Bir neçə tələbənin də təcrübə qeydi olsun (Where Are We Now yalnız alumni deyil)
  const internUsers = users.filter((u) => u.stage === "STUDENT").slice(0, 12);
  internUsers.forEach((user, i) => {
    careerIndex += 1;
    const placement = cycle(COUNTRIES, i);
    careerRows.push({
      id: `car-${String(careerIndex).padStart(3, "0")}`,
      userId: user.id,
      company: cycle(COMPANIES, careerIndex),
      position: "Təcrübəçi",
      // ⚠️ "Təcrübəçi" `POSITION_JOB_FUNCTIONS`-da YOXDUR — tələbə təcrübəsi
      // rol taksonomiyasının hədəfi deyil, statistikaya `null` kimi düşür.
      jobFunction: null,
      industry: cycle(INDUSTRY_VALUES, careerIndex),
      city: cycle(placement.cities, i),
      country: placement.country,
      startDate: addDays(NOW, -randInt(60, 400)),
      endDate: addDays(NOW, -randInt(1, 50)),
      isCurrent: false,
      description: cycle(CAREER_DESCRIPTIONS, i),
      includeInStats: chance(0.7),
      visibility: randomVisibility(),
    });
  });

  await insertMany("CareerEntry", careerRows, (chunk) =>
    prisma.careerEntry.createMany({ data: chunk }),
  );

  const educationRows = Array.from({ length: 25 }, (_, i) => {
    const user = cycle(alumniUsers, i);
    const cohort = cohortByKey.get(user.cohortKey)!;
    const startYear = cohort.graduatesAt.getFullYear() + (i % 2);
    const isCurrent = chance(0.2);
    return {
      id: `edu-${String(i + 1).padStart(2, "0")}`,
      userId: user.id,
      institution: cycle(INSTITUTIONS, i),
      degree: cycle([Degree.MASTER, Degree.MASTER, Degree.PHD, Degree.CERTIFICATE], i),
      field: cycle(EDUCATION_FIELDS, i),
      country: cycle(COUNTRIES, i).country,
      startYear,
      endYear: isCurrent ? null : startYear + 2,
      isCurrent,
      includeInStats: chance(0.7),
      visibility: randomVisibility(),
    };
  });
  await insertMany("EducationEntry", educationRows, (chunk) =>
    prisma.educationEntry.createMany({ data: chunk }),
  );

  const supportKeys = new Set<string>();
  const supportRows: { id: string; userId: string; type: string; note: string | null }[] = [];
  let supportIndex = 0;
  let supportGuard = 0;
  while (supportRows.length < 40 && supportGuard < 500) {
    supportGuard += 1;
    const user = cycle(alumniUsers, supportGuard);
    const type = cycle(SUPPORT_OFFER_TYPE_VALUES, supportGuard);
    const key = `${user.id}:${type}`;
    if (supportKeys.has(key)) continue;
    supportKeys.add(key);
    supportIndex += 1;
    supportRows.push({
      id: `sup-${String(supportIndex).padStart(2, "0")}`,
      userId: user.id,
      type,
      note: chance(0.7) ? cycle(SUPPORT_OFFER_NOTES, supportIndex) : null,
    });
  }
  await insertMany("SupportOffer", supportRows, (chunk) =>
    prisma.supportOffer.createMany({ data: chunk }),
  );

  // -------------------------------------------------------------------------
  // 3.14 Bildirişlər
  // -------------------------------------------------------------------------
  const notificationRows: Prisma.NotificationCreateManyInput[] = [];
  let notificationIndex = 0;

  function pushNotification(row: {
    recipientId: string;
    actorId: string | null;
    type: string;
    entityType: string | null;
    entityId: string | null;
    title: string;
    body: string | null;
    url: string | null;
    createdAt: Date;
  }): void {
    notificationIndex += 1;
    notificationRows.push({
      id: `ntf-${String(notificationIndex).padStart(3, "0")}`,
      ...row,
      readAt: chance(0.55) ? addDays(row.createdAt, randInt(0, 3)) : null,
    });
  }

  for (const reaction of reactionRows.slice(0, 60)) {
    const post = postRuntimes.find((p) => p.id === reaction.postId)!;
    if (post.authorId === reaction.userId) continue;
    const actor = userById.get(reaction.userId)!;
    pushNotification({
      recipientId: post.authorId,
      actorId: reaction.userId,
      type: NotificationType.POST_LIKE,
      entityType: NotificationEntityType.POST,
      entityId: post.id,
      title: `${actor.firstName} ${actor.lastName} paylaşımınıza reaksiya verdi`,
      body: null,
      url: `/feed/${post.id}`,
      createdAt: reaction.createdAt,
    });
  }

  for (const comment of commentRows.slice(0, 50)) {
    const post = postRuntimes.find((p) => p.id === comment.postId)!;
    if (post.authorId === comment.authorId) continue;
    const actor = userById.get(comment.authorId)!;
    pushNotification({
      recipientId: post.authorId,
      actorId: comment.authorId,
      type: NotificationType.POST_COMMENT,
      entityType: NotificationEntityType.POST,
      entityId: post.id,
      title: `${actor.firstName} ${actor.lastName} paylaşımınıza şərh yazdı`,
      body: comment.body.slice(0, 80),
      url: `/feed/${post.id}`,
      createdAt: comment.createdAt,
    });
  }

  for (const evt of eventRuntimes.filter((e) => !e.isPast && e.status === EventStatus.PUBLISHED).slice(0, 6)) {
    const audience = evt.cohortId
      ? cohorts.find((c) => c.id === evt.cohortId)!.memberIds
      : shuffled(allUserIds).slice(0, 8);
    for (const recipientId of audience.slice(0, 8)) {
      pushNotification({
        recipientId,
        actorId: coordinatorId,
        type: NotificationType.EVENT_INVITE,
        entityType: NotificationEntityType.EVENT,
        entityId: evt.id,
        title: `Yeni tədbir: ${evt.title}`,
        body: "Tədbirə qeydiyyat açıqdır.",
        url: `/events/${evt.id}`,
        createdAt: addDays(evt.startsAt, -randInt(5, 20)),
      });
    }
  }

  for (const ach of achievementRuntimes.filter((a) => a.status === AchievementStatus.VERIFIED).slice(0, 20)) {
    pushNotification({
      recipientId: ach.ownerId,
      actorId: adminId,
      type: NotificationType.ACHIEVEMENT_VERIFIED,
      entityType: NotificationEntityType.ACHIEVEMENT,
      entityId: ach.id,
      title: "Nailiyyətiniz təsdiqləndi",
      body: ach.title,
      url: `/achievements/${ach.id}`,
      createdAt: addDays(ach.awardedAt, randInt(2, 20)),
    });
  }

  for (const cohort of cohorts) {
    const newcomer = cohort.memberIds[cohort.memberIds.length - 1];
    const newcomerUser = userById.get(newcomer)!;
    for (const recipientId of cohort.memberIds.slice(0, 6)) {
      if (recipientId === newcomer) continue;
      pushNotification({
        recipientId,
        actorId: newcomer,
        type: NotificationType.NEW_MEMBER,
        entityType: NotificationEntityType.USER,
        entityId: newcomer,
        title: `${newcomerUser.firstName} ${newcomerUser.lastName} sinifə qoşuldu`,
        body: null,
        url: `/directory/${newcomer}`,
        createdAt: addDays(cohort.contentFrom, randInt(1, 20)),
      });
    }
  }

  pushNotification({
    recipientId: adminId,
    actorId: null,
    type: NotificationType.SYSTEM,
    entityType: null,
    entityId: null,
    title: "Sistem: seed datası yükləndi",
    body: "Demo mühiti hazırdır.",
    url: "/admin",
    createdAt: NOW,
  });

  await insertMany("Notification", notificationRows, (chunk) =>
    prisma.notification.createMany({ data: chunk }),
  );

  // -------------------------------------------------------------------------
  // 3.15 Moderasiya
  // -------------------------------------------------------------------------
  const reportRows = Array.from({ length: 12 }, (_, i) => {
    const entityType: ReportEntityType = cycle(REPORT_ENTITY_TYPE_VALUES, i);
    const entityId =
      entityType === "COMMENT"
        ? cycle(commentRows, i).id
        : entityType === "MEMORY"
          ? cycle(memoryRows, i).id!
          : entityType === "ACHIEVEMENT"
            ? cycle(achievementRuntimes, i).id
            : entityType === "EVENT"
              ? cycle(eventRuntimes, i).id
              : entityType === "USER"
                ? cycle(allUserIds, i)
                : cycle(visiblePosts, i).id;

    const status = cycle(
      [ReportStatus.OPEN, ReportStatus.IN_REVIEW, ReportStatus.RESOLVED, ReportStatus.REJECTED],
      i,
    );
    const isClosed = status === ReportStatus.RESOLVED || status === ReportStatus.REJECTED;
    const createdAt = addDays(NOW, -randInt(5, 120));

    return {
      id: `rpt-${String(i + 1).padStart(2, "0")}`,
      reporterId: cycle(allUserIds, i * 7 + 3),
      entityType,
      entityId,
      reason: cycle(REPORT_REASON_VALUES, i),
      details: cycle(REPORT_DETAILS, i),
      status,
      resolvedById: isClosed ? cycle([adminId, moderatorId], i) : null,
      resolvedAt: isClosed ? addDays(createdAt, randInt(1, 10)) : null,
      resolution: isClosed ? cycle(REPORT_RESOLUTIONS, i) : null,
      createdAt,
    };
  });
  await insertMany("Report", reportRows, (chunk) => prisma.report.createMany({ data: chunk }));

  const auditRows: Prisma.AuditLogCreateManyInput[] = [];
  let auditIndex = 0;
  function pushAudit(row: {
    actorId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
  }): void {
    auditIndex += 1;
    auditRows.push({
      id: `aud-${String(auditIndex).padStart(3, "0")}`,
      actorId: row.actorId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: JSON.stringify(row.metadata),
      createdAt: row.createdAt,
    });
  }

  for (const ach of achievementRuntimes.filter((a) => a.status === AchievementStatus.VERIFIED).slice(0, 15)) {
    pushAudit({
      actorId: adminId,
      action: AuditAction.VERIFY,
      entityType: "Achievement",
      entityId: ach.id,
      metadata: { from: AchievementStatus.SUBMITTED, to: AchievementStatus.VERIFIED },
      createdAt: addDays(ach.awardedAt, randInt(2, 20)),
    });
  }
  for (const post of postRuntimes.filter((p) => p.status === PostStatus.HIDDEN).slice(0, 8)) {
    pushAudit({
      actorId: moderatorId,
      action: AuditAction.MODERATE,
      entityType: "Post",
      entityId: post.id,
      metadata: { from: PostStatus.ACTIVE, to: PostStatus.HIDDEN, reason: "Şikayət əsasında yoxlanıldı" },
      createdAt: addDays(post.createdAt, randInt(1, 20)),
    });
  }
  for (const post of postRuntimes.filter((p) => p.status === PostStatus.DELETED).slice(0, 6)) {
    pushAudit({
      actorId: post.authorId,
      action: AuditAction.DELETE,
      entityType: "Post",
      entityId: post.id,
      metadata: { softDelete: true },
      createdAt: addDays(post.createdAt, randInt(1, 40)),
    });
  }
  for (const [i, membership] of membershipRows
    .filter((m) => m.role !== CohortRole.MEMBER)
    .slice(0, 8)
    .entries()) {
    pushAudit({
      actorId: adminId,
      action: AuditAction.ROLE_CHANGE,
      entityType: "CohortMembership",
      entityId: membership.id,
      metadata: { from: CohortRole.MEMBER, to: membership.role },
      createdAt: addDays(membership.joinedAt, randInt(10, 60) + i),
    });
  }
  for (const cohort of cohorts) {
    pushAudit({
      actorId: adminId,
      action: AuditAction.CREATE,
      entityType: "Cohort",
      entityId: cohort.id,
      metadata: { displayName: cohort.displayName, scope: CohortScope.PROGRAM },
      createdAt: addDays(cohort.academicStartsAt, -90),
    });
  }
  for (const report of reportRows.filter((r) => r.status === ReportStatus.RESOLVED)) {
    pushAudit({
      actorId: report.resolvedById,
      action: AuditAction.UPDATE,
      entityType: "Report",
      entityId: report.id,
      metadata: { status: report.status },
      createdAt: report.resolvedAt ?? report.createdAt,
    });
  }
  await insertMany("AuditLog", auditRows, (chunk) => prisma.auditLog.createMany({ data: chunk }));

  // -------------------------------------------------------------------------
  // 3.16 İctimai məzmun
  // -------------------------------------------------------------------------
  await insertMany("ContentPage", CONTENT_PAGES, (chunk) =>
    prisma.contentPage.createMany({
      data: chunk.map((p, i) => ({
        id: `cnt-${p.slug}`,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        body: p.body,
        coverUrl: `https://picsum.photos/seed/qu-page-${p.slug}/1200/500`,
        section: p.section,
        order: i,
        isPublished: true,
        updatedAt: addDays(NOW, -30),
      })),
    }),
  );

  await insertMany("Faq", FAQS, (chunk) =>
    prisma.faq.createMany({
      data: chunk.map((f, i) => ({
        id: `faq-${String(FAQS.indexOf(f) + 1).padStart(2, "0")}`,
        question: f.question,
        answer: f.answer,
        category: f.category,
        order: i,
        isPublished: true,
      })),
    }),
  );

  // -------------------------------------------------------------------------
  // 4. Hesabat
  // -------------------------------------------------------------------------
  console.log("\n✓ Seed tamamlandı. Cədvəl-cədvəl sətir sayı:\n");
  const width = Math.max(...Object.keys(counters).map((k) => k.length));
  for (const [table, count] of Object.entries(counters)) {
    console.log(`  ${table.padEnd(width)}  ${String(count).padStart(5)}`);
  }
  console.log(
    `\n  Test hesabları (şifrə: Test1234!):\n` +
      `    admin@qu.edu.az        UNIVERSITY_ADMIN  → ${adminId}\n` +
      `    moderator@qu.edu.az    CLASS_MODERATOR   → ${moderatorId}\n` +
      `    rep@qu.edu.az          CLASS_REPRESENTATIVE → ${repId}\n` +
      `    coordinator@qu.edu.az  EVENT_COORDINATOR → ${coordinatorId}\n` +
      `    alumni@qu.edu.az       ALUMNI MEMBER     → ${alumniId}\n`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("✗ Seed uğursuz oldu:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
