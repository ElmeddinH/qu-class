// ============================================================================
// src/services/admin-content.service.ts
// CMS — `ContentPage` · `Faq` · `GuidePlace` redaktəsi (spec §17).
//
// `content.service.ts` İCTİMAİ oxu qatıdır və yalnız `isPublished = true`
// sətirləri qaytarır (orada `includeDrafts` bayrağı QƏSDƏN yoxdur — bir
// çağırışda unudulsa qaralama internetə düşərdi). Bu fayl ADMİN qatıdır:
// qaralamaları da görür, amma `assertFreshAdmin` qapısının arxasındadır.
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 GÖVDƏ ETİBARSIZ GİRİŞDİR
// ────────────────────────────────────────────────────────────────────────────
// `ContentPage.body` Markdown-dur və admin tərəfindən yazılır. Render tərəfi
// `components/shared/Markdown.tsx`-dir və o, `dangerouslySetInnerHTML`
// İŞLƏTMİR: `lib/markdown.ts` HTML QURMUR, blok siyahısı qaytarır və bloklar
// React elementlərinə çevrilir. Yəni gövdədəki `<script>` ekranda MƏTN kimi
// görünür. Bu, servisdə əlavə sanitizasiya ehtiyacını aradan qaldırır —
// zəmanət parse qatındadır və `markdown.test.ts` onu ölçür.
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 SLUG DƏYİŞİKLİYİ — MARŞRUT XƏRİTƏSİNDƏKİLƏR KİLİDLİDİR
// ────────────────────────────────────────────────────────────────────────────
// `lib/content-routes.ts` ünvan ↔ slug xəritəsidir: `/about`, `/history`,
// `/mission`, `/legal/<slug>` və s. MƏHZ həmin slug-lara baxır. Slug dəyişsə
// ictimai səhifə 404 verər — və bu, sakit sınmadır (heç kim şikayət etmir,
// sadəcə səhifə yoxa çıxır). Ona görə xəritədə adı keçən slug-lar üçün
// dəyişikliyə İCAZƏ VERİLMİR; qalanlarda xəbərdarlıq göstərilir.
// ============================================================================

import { Prisma } from "@prisma/client";

import { assertFreshAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import {
  AuditAction,
  type ContentSection,
  type FaqCategory,
  type GuideCategory,
} from "@/lib/enums";
import { CONTENT_ROUTES, LEGAL_PAGES } from "@/lib/content-routes";
import { slugify } from "@/lib/slugify";
import type { Viewer } from "@/lib/visibility";
import { recordAudit } from "@/services/audit.service";

/**
 * Unikal indeks pozuntusu (P2002) — slug artıq işlədilir.
 *
 * 🔴 ƏVVƏLCƏDƏN YOXLAMA YARIŞI BAĞLAMIR: `findUnique` ilə baxıb sonra yazsaq
 * iki paralel sorğu arasında sətir yarana bilər. Yoxlama İSTİFADƏÇİ MESAJI
 * üçün faydalıdır, ZƏMANƏTİ isə indeks verir — ona görə hər iki qat var.
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

// ---------------------------------------------------------------------------
// Kilidli slug-lar
// ---------------------------------------------------------------------------

/**
 * Marşrut xəritəsinə bağlı slug-lar — DƏYİŞDİRİLƏ BİLMƏZ.
 *
 * Siyahı `lib/content-routes.ts`-dən TÖRƏYİR, əl ilə yazılmır: yeni ictimai
 * səhifə əlavə edən adam kilidi ayrıca yeniləməyi unutsa, slug dəyişikliyi
 * yenidən mümkün olardı.
 */
export const LOCKED_CONTENT_SLUGS: readonly string[] = [
  // ⚠️ `kind: "section"` marşrutlarının `slug`-ı YOXDUR — onlar bölmənin
  // BÜTÜN səhifələrini göstərir (`/services`, `/newcomers`), yəni konkret
  // slug-a bağlı deyil. `kind: "page"` isə birbaşa bir slug-a baxır.
  ...CONTENT_ROUTES.filter((route) => route.kind === "page").map((route) => route.slug),
  ...LEGAL_PAGES.map((page) => page.slug),
];

export function isLockedContentSlug(slug: string): boolean {
  return LOCKED_CONTENT_SLUGS.includes(slug);
}

// ---------------------------------------------------------------------------
// ContentPage
// ---------------------------------------------------------------------------

export interface AdminContentPage {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  section: string;
  order: number;
  isPublished: boolean;
  updatedAt: Date;
  /** Slug marşrut xəritəsinə bağlıdırmı? (UI kilidi göstərir) */
  locked: boolean;
}

const CONTENT_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  body: true,
  section: true,
  order: true,
  isPublished: true,
  updatedAt: true,
} satisfies Prisma.ContentPageSelect;

/** Bütün səhifələr — QARALAMALAR DA DAXİL (admin qapısının arxasında). */
export async function listAdminContentPages(
  viewer: Viewer,
  section?: ContentSection,
): Promise<AdminContentPage[]> {
  await assertFreshAdmin(viewer);

  const rows = await prisma.contentPage.findMany({
    where: section ? { section } : {},
    orderBy: [{ section: "asc" }, { order: "asc" }, { title: "asc" }],
    select: CONTENT_SELECT,
  });

  return rows.map((row) => ({ ...row, locked: isLockedContentSlug(row.slug) }));
}

export async function getAdminContentPage(
  viewer: Viewer,
  id: string,
): Promise<AdminContentPage | null> {
  await assertFreshAdmin(viewer);

  const row = await prisma.contentPage.findUnique({
    where: { id },
    select: CONTENT_SELECT,
  });

  return row === null ? null : { ...row, locked: isLockedContentSlug(row.slug) };
}

export type ContentUpdateFailure = "NOT_FOUND" | "SLUG_LOCKED" | "SLUG_TAKEN";

export const CONTENT_FAILURE_MESSAGES: Record<ContentUpdateFailure, string> = {
  NOT_FOUND: "Səhifə tapılmadı.",
  SLUG_LOCKED:
    "Bu səhifənin ünvanı marşrut xəritəsinə bağlıdır (lib/content-routes.ts) — slug dəyişdirilə bilməz.",
  SLUG_TAKEN: "Bu slug artıq başqa səhifədə işlədilir.",
};

export interface UpdateContentPageInput {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  isPublished: boolean;
}

export type ContentUpdateResult =
  | { ok: true; value: { id: string; slug: string } }
  | { ok: false; reason: ContentUpdateFailure };

/** Səhifəni yeniləyir. Hər redaktə → AuditLog. */
export async function updateContentPage(
  viewer: Viewer,
  input: UpdateContentPageInput,
): Promise<ContentUpdateResult> {
  const admin = await assertFreshAdmin(viewer);

  const page = await prisma.contentPage.findUnique({
    where: { id: input.id },
    select: { id: true, slug: true, title: true, isPublished: true },
  });
  if (!page) return { ok: false, reason: "NOT_FOUND" };

  const slugChanged = page.slug !== input.slug;

  // 🔴 Kilidli slug — bax fayl başlığı.
  if (slugChanged && isLockedContentSlug(page.slug)) {
    return { ok: false, reason: "SLUG_LOCKED" };
  }

  if (slugChanged) {
    const clash = await prisma.contentPage.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (clash) return { ok: false, reason: "SLUG_TAKEN" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.contentPage.update({
      where: { id: page.id },
      data: {
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt,
        body: input.body,
        isPublished: input.isPublished,
      },
    });

    await recordAudit(tx, {
      actorId: admin.userId,
      action: AuditAction.UPDATE,
      entityType: "ContentPage",
      entityId: page.id,
      metadata: {
        operation: "updateContentPage",
        slug: input.slug,
        // ⚠️ GÖVDƏ METADATA-YA YAZILMIR — jurnal mətn anbarı deyil.
        from: page.isPublished ? "PUBLISHED" : "DRAFT",
        to: input.isPublished ? "PUBLISHED" : "DRAFT",
      },
    });
  });

  return { ok: true, value: { id: page.id, slug: input.slug } };
}

export type ContentCreateFailure = "SLUG_TAKEN" | "SLUG_EMPTY";

export const CONTENT_CREATE_FAILURE_MESSAGES: Record<ContentCreateFailure, string> = {
  SLUG_TAKEN:
    "Bu başlıqdan alınan ünvan (slug) artıq işlədilir. Başlığı bir qədər dəyişin.",
  SLUG_EMPTY:
    "Başlıqdan ünvan (slug) qurmaq olmadı — ən azı bir hərf və ya rəqəm yazın.",
};

export interface CreateContentPageInput {
  title: string;
  excerpt: string | null;
  body: string;
  section: ContentSection;
  order: number;
  isPublished: boolean;
}

export type ContentCreateResult =
  | { ok: true; value: { id: string; slug: string } }
  | { ok: false; reason: ContentCreateFailure };

/**
 * Yeni ictimai səhifə.
 *
 * 🔴 SLUG BAŞLIQDAN DETERMİNİSTİK QURULUR (`lib/slugify.ts`) — təsadüfi
 * şəkilçi yoxdur. Səbəb: eyni başlıqla iki səhifə yaradılsa bu, SƏHVDİR və
 * istifadəçi bunu görməlidir; təsadüfi şəkilçi həmin səhvi gizlədərdi.
 *
 * ⚠️ Unikallıq İKİ QATDADIR: (1) əvvəlcədən `findUnique` — dostcasına mesaj
 * üçün; (2) `@unique` indeksi + `P2002` tutulması — yarışı MƏHZ bu bağlayır.
 */
export async function createContentPage(
  viewer: Viewer,
  input: CreateContentPageInput,
): Promise<ContentCreateResult> {
  const admin = await assertFreshAdmin(viewer);

  const slug = slugify(input.title);
  if (slug === "") return { ok: false, reason: "SLUG_EMPTY" };

  const clash = await prisma.contentPage.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (clash) return { ok: false, reason: "SLUG_TAKEN" };

  try {
    const created = await prisma.$transaction(async (tx) => {
      const page = await tx.contentPage.create({
        data: {
          slug,
          title: input.title,
          excerpt: input.excerpt,
          body: input.body,
          section: input.section,
          order: input.order,
          isPublished: input.isPublished,
        },
        select: { id: true, slug: true },
      });

      await recordAudit(tx, {
        actorId: admin.userId,
        action: AuditAction.CREATE,
        entityType: "ContentPage",
        entityId: page.id,
        metadata: {
          operation: "createContentPage",
          slug: page.slug,
          section: input.section,
          // ⚠️ GÖVDƏ METADATA-YA YAZILMIR — jurnal mətn anbarı deyil.
          to: input.isPublished ? "PUBLISHED" : "DRAFT",
        },
      });

      return page;
    });

    return { ok: true, value: created };
  } catch (error) {
    // Yarış: yoxlama ilə yazı arasında eyni slug yarandı.
    if (isUniqueViolation(error)) return { ok: false, reason: "SLUG_TAKEN" };
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Faq
// ---------------------------------------------------------------------------

export interface AdminFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  isPublished: boolean;
}

export async function listAdminFaqs(
  viewer: Viewer,
  category?: FaqCategory,
): Promise<AdminFaq[]> {
  await assertFreshAdmin(viewer);

  return prisma.faq.findMany({
    where: category ? { category } : {},
    orderBy: [{ category: "asc" }, { order: "asc" }, { question: "asc" }],
    select: {
      id: true,
      question: true,
      answer: true,
      category: true,
      order: true,
      isPublished: true,
    },
  });
}

export type FaqUpdateResult =
  | { ok: true; value: { id: string } }
  | { ok: false; reason: "NOT_FOUND" };

export async function updateFaq(
  viewer: Viewer,
  input: { id: string; question: string; answer: string; isPublished: boolean },
): Promise<FaqUpdateResult> {
  const admin = await assertFreshAdmin(viewer);

  const faq = await prisma.faq.findUnique({
    where: { id: input.id },
    select: { id: true, isPublished: true },
  });
  if (!faq) return { ok: false, reason: "NOT_FOUND" };

  await prisma.$transaction(async (tx) => {
    await tx.faq.update({
      where: { id: faq.id },
      data: {
        question: input.question,
        answer: input.answer,
        isPublished: input.isPublished,
      },
    });

    await recordAudit(tx, {
      actorId: admin.userId,
      action: AuditAction.UPDATE,
      entityType: "Faq",
      entityId: faq.id,
      metadata: {
        operation: "updateFaq",
        from: faq.isPublished ? "PUBLISHED" : "DRAFT",
        to: input.isPublished ? "PUBLISHED" : "DRAFT",
      },
    });
  });

  return { ok: true, value: { id: faq.id } };
}

export interface CreateFaqInput {
  question: string;
  answer: string;
  category: FaqCategory;
  order: number;
  isPublished: boolean;
}

/**
 * Yeni FAQ sətri.
 *
 * ⚠️ `Faq`-ın slug-ı YOXDUR (ünvana düşmür) — unikallıq yoxlaması da yoxdur.
 * Eyni sualın iki dəfə yazılması məzmun qərarıdır, texniki pozuntu deyil.
 */
export async function createFaq(
  viewer: Viewer,
  input: CreateFaqInput,
): Promise<{ ok: true; value: { id: string } }> {
  const admin = await assertFreshAdmin(viewer);

  const created = await prisma.$transaction(async (tx) => {
    const faq = await tx.faq.create({
      data: {
        question: input.question,
        answer: input.answer,
        category: input.category,
        order: input.order,
        isPublished: input.isPublished,
      },
      select: { id: true },
    });

    await recordAudit(tx, {
      actorId: admin.userId,
      action: AuditAction.CREATE,
      entityType: "Faq",
      entityId: faq.id,
      metadata: {
        operation: "createFaq",
        category: input.category,
        to: input.isPublished ? "PUBLISHED" : "DRAFT",
      },
    });

    return faq;
  });

  return { ok: true, value: created };
}

// ---------------------------------------------------------------------------
// GuidePlace — Xankəndi bələdçisi (yalnız mətn redaktəsi)
// ---------------------------------------------------------------------------

export interface AdminGuidePlace {
  id: string;
  category: string;
  title: string;
  description: string;
  address: string | null;
  phone: string | null;
  isEmergency: boolean;
  order: number;
}

export async function listAdminGuidePlaces(viewer: Viewer): Promise<AdminGuidePlace[]> {
  await assertFreshAdmin(viewer);

  return prisma.guidePlace.findMany({
    orderBy: [{ category: "asc" }, { order: "asc" }, { title: "asc" }],
    select: {
      id: true,
      category: true,
      title: true,
      description: true,
      address: true,
      phone: true,
      isEmergency: true,
      order: true,
    },
  });
}

export type GuidePlaceUpdateResult =
  | { ok: true; value: { id: string } }
  | { ok: false; reason: "NOT_FOUND" };

/**
 * Bələdçi məkanının mətn sahələri.
 *
 * ⚠️ `latitude` / `longitude` BURADAN redaktə edilmir: xəritə mövqeyi səhvən
 * dəyişdirilsə istifadəçi mövcud olmayan ünvana gedər. Koordinat seed-dən
 * gəlir və dəyişikliyi ayrıca iş tələb edir (xəritə seçicisi).
 */
export async function updateGuidePlace(
  viewer: Viewer,
  input: {
    id: string;
    title: string;
    description: string;
    address: string | null;
    phone: string | null;
  },
): Promise<GuidePlaceUpdateResult> {
  const admin = await assertFreshAdmin(viewer);

  const place = await prisma.guidePlace.findUnique({
    where: { id: input.id },
    select: { id: true, title: true },
  });
  if (!place) return { ok: false, reason: "NOT_FOUND" };

  await prisma.$transaction(async (tx) => {
    await tx.guidePlace.update({
      where: { id: place.id },
      data: {
        title: input.title,
        description: input.description,
        address: input.address,
        phone: input.phone,
      },
    });

    await recordAudit(tx, {
      actorId: admin.userId,
      action: AuditAction.UPDATE,
      entityType: "GuidePlace",
      entityId: place.id,
      metadata: { operation: "updateGuidePlace", from: place.title, to: input.title },
    });
  });

  return { ok: true, value: { id: place.id } };
}

export interface CreateGuidePlaceInput {
  category: GuideCategory;
  title: string;
  description: string;
  address: string | null;
  phone: string | null;
  /** ⚠️ Koordinat İXTİYARİDİR — ikisi birlikdə verilir və ya heç biri. */
  latitude: number | null;
  longitude: number | null;
  isEmergency: boolean;
  order: number;
}

export type GuidePlaceCreateFailure = "COORDINATES_INCOMPLETE";

export const GUIDE_PLACE_CREATE_FAILURE_MESSAGES: Record<
  GuidePlaceCreateFailure,
  string
> = {
  COORDINATES_INCOMPLETE:
    "Koordinatların HƏR İKİSİNİ yazın və ya hər ikisini boş buraxın — yalnız biri xəritədə mövqe vermir.",
};

export type GuidePlaceCreateResult =
  | { ok: true; value: { id: string } }
  | { ok: false; reason: GuidePlaceCreateFailure };

/**
 * Yeni bələdçi məkanı.
 *
 * ⚠️ REDAKTƏDƏN FƏRQLİ OLARAQ koordinat BURADA verilir. `updateGuidePlace`
 * onu qəsdən buraxmır (səhvən sürüşdürülən pin istifadəçini mövcud olmayan
 * ünvana aparar), amma YARADARKƏN mövqeyi ilk dəfə kimsə yazmalıdır — yoxsa
 * yeni məkan xəritədə heç vaxt görünməz.
 *
 * ⚠️ Yarımçıq koordinat RƏDD OLUNUR: yalnız `latitude` yazılsa Prisma sətri
 * qəbul edər, xəritə isə mövqe qura bilməz və məkan səssizcə xəritədən
 * düşərdi.
 */
export async function createGuidePlace(
  viewer: Viewer,
  input: CreateGuidePlaceInput,
): Promise<GuidePlaceCreateResult> {
  const admin = await assertFreshAdmin(viewer);

  const hasLat = input.latitude !== null;
  const hasLon = input.longitude !== null;
  if (hasLat !== hasLon) return { ok: false, reason: "COORDINATES_INCOMPLETE" };

  const created = await prisma.$transaction(async (tx) => {
    const place = await tx.guidePlace.create({
      data: {
        category: input.category,
        title: input.title,
        description: input.description,
        address: input.address,
        phone: input.phone,
        latitude: input.latitude,
        longitude: input.longitude,
        isEmergency: input.isEmergency,
        order: input.order,
      },
      select: { id: true },
    });

    await recordAudit(tx, {
      actorId: admin.userId,
      action: AuditAction.CREATE,
      entityType: "GuidePlace",
      entityId: place.id,
      metadata: {
        operation: "createGuidePlace",
        category: input.category,
        // ⚠️ DƏQİQ KOORDİNAT jurnala YAZILMIR: audit səhifəsi metadata-nı
        // olduğu kimi göstərir, məkan ünvanı isə orada lazım deyil.
        to: input.isEmergency ? "EMERGENCY" : "REGULAR",
      },
    });

    return place;
  });

  return { ok: true, value: created };
}
