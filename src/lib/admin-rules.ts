// ============================================================================
// src/lib/admin-rules.ts
// Admin əməliyyatlarının QAYDALARI — SAF funksiyalar (Prisma / React yoxdur).
//
// 🔴 NİYƏ AYRI MODUL: bu qaydalar "admin özünü kilidləyə bilər" sinfindəndir və
// onların SƏHVİ geri qaytarıla bilməz (sistemdə heç bir admin qalmasa panelə
// girmək mümkün deyil). Qərar məntiqi servisdən ayrıldıqda DB olmadan, hər
// kombinasiya üçün testlə ölçülə bilir.
//
// ⚠️ Qayda UI-da DEYİL, SERVERDƏ tətbiq olunur. Düyməni gizlətmək qoruma
// sayılmır — server action birbaşa çağırıla bilər.
//
// ⚠️ `adminCount` TRANSAKSİYANIN İÇİNDƏN gəlməlidir. Kənarda sayılsa iki eyni
// anlı sorğu (son iki adminin ikisini də endirmək) hər ikisi "2 admin var"
// görüb keçərdi — klassik TOCTOU. Funksiyanın özü bunu yoxlaya bilmir, ona
// görə şərh çağıran tərəfə ünvanlanıb (`services/admin.service.ts`).
// ============================================================================

import { SystemRole, type SystemRole as SystemRoleValue } from "@/lib/enums";
import { asciiSlug } from "@/utils/slug";

// ---------------------------------------------------------------------------
// Rədd səbəbləri
// ---------------------------------------------------------------------------

export type AdminRuleRejection =
  | "SELF_DEMOTE"
  | "LAST_ADMIN"
  | "SELF_DEACTIVATE"
  | "ALREADY_APPLIED";

export const ADMIN_RULE_MESSAGES: Record<AdminRuleRejection, string> = {
  SELF_DEMOTE:
    "Öz sistem rolunuzu endirə bilməzsiniz. Başqa administrator bunu edə bilər.",
  LAST_ADMIN:
    "Sistemdə ən azı bir universitet administratoru qalmalıdır. Əvvəlcə başqasına admin rolu verin.",
  SELF_DEACTIVATE: "Öz hesabınızı deaktiv edə bilməzsiniz.",
  ALREADY_APPLIED: "Dəyişiklik yoxdur — dəyər artıq belədir.",
};

// ---------------------------------------------------------------------------
// 1. Sistem rolunun dəyişdirilməsi
// ---------------------------------------------------------------------------

export interface SystemRoleChangeInput {
  /** Əməliyyatı edən admin. */
  actorId: string;
  /** Rolu dəyişdirilən istifadəçi. */
  targetId: string;
  currentRole: SystemRoleValue;
  nextRole: SystemRoleValue;
  /**
   * AKTİV (deaktiv edilməmiş) `UNIVERSITY_ADMIN` sayı — hədəf aktivdirsə DAXİL.
   * ⚠️ Transaksiyanın içindən oxunmalıdır (fayl başlığına bax).
   */
  adminCount: number;
  /**
   * Hədəf AKTİV admindirmi?
   *
   * ⚠️ Deaktiv edilmiş adminin rolunu geri almaq sistemi kilidləmir — o, onsuz
   * da panelə girə bilmir və `adminCount`-a daxil deyil. Bu bayraq olmasaydı
   * qayda YALANDAN işə düşərdi: aktiv admin deaktiv adminin rolunu ala
   * bilməzdi, halbuki sistemdə hələ işlək admin var.
   */
  targetIsActive: boolean;
}

/**
 * Sistem rolu dəyişikliyi icazəlidirmi? İcazəlidirsə `null`.
 *
 * ÜÇ QORUMA (TƏLƏ C):
 *   1. admin ÖZ rolunu ENDİRƏ bilməz — səhv klik bütün panelə girişi bağlayar
 *      və düzəldəcək adam qalmaya bilər;
 *   2. SONUNCU admin endirilə bilməz — sistemdə admin qalmasa cohort
 *      yaratmaq, moderasiya etmək və rol vermək mümkün olmaz;
 *   3. dəyişiklik olmayan sorğu (eyni rol) audit jurnalını boş sətirlə
 *      doldurmasın.
 *
 * ⚠️ (1) və (2) AYRI qaydalardır və biri digərini əvəz etmir: admin BAŞQA
 * admini endirə bilər (bu, (1)-dən keçir) — amma o, sonuncudursa (2) dayandırır.
 *
 * 🔴 (2) PRAKTİKADA YALNIZ YARIŞ (race) HALINDA İŞƏ DÜŞÜR və bu, qorumanın
 * ZƏİFLİYİ deyil, MƏQSƏDİDİR. Ardıcıl icrada admin sayı heç vaxt 1-ə düşə
 * bilməz: əməliyyatı edən özü aktiv admindir, yəni hədəfdən BAŞQA ən azı bir
 * admin var (say ≥ 2). Say 1 YALNIZ iki eyni anlı endirmə sorğusunda görünür —
 * biri artıq keçib, ikincisi transaksiya İÇİNDƏ təzə sayı oxuyur. Məhz buna
 * görə say kənarda deyil, transaksiyada oxunmalıdır (fayl başlığı).
 */
export function checkSystemRoleChange(
  input: SystemRoleChangeInput,
): AdminRuleRejection | null {
  if (input.currentRole === input.nextRole) return "ALREADY_APPLIED";

  const demoting =
    input.currentRole === SystemRole.UNIVERSITY_ADMIN &&
    input.nextRole !== SystemRole.UNIVERSITY_ADMIN;

  if (!demoting) return null;

  if (input.actorId === input.targetId) return "SELF_DEMOTE";

  // Deaktiv adminin rolunu almaq sistemi kilidləmir — o, onsuz da işlək deyil.
  if (input.targetIsActive && input.adminCount <= 1) return "LAST_ADMIN";

  return null;
}

// ---------------------------------------------------------------------------
// 2. Hesabın deaktiv edilməsi
// ---------------------------------------------------------------------------

export interface DeactivationInput {
  actorId: string;
  targetId: string;
  targetRole: SystemRoleValue;
  /** Hazırkı admin sayı — hədəf DAXİL (transaksiya içindən). */
  adminCount: number;
  /** Hədəf ARTIQ deaktivdirmi? */
  alreadyDeactivated: boolean;
}

/**
 * Hesabın deaktiv edilməsi icazəlidirmi? İcazəlidirsə `null`.
 *
 * ⚠️ SİLMƏ YOXDUR VƏ OLMAYACAQ: `User` silinsə `onDelete: Cascade` onun bütün
 * paylaşımlarını, xatirələrini, nailiyyətlərini və şərhlərini aparardı — yəni
 * sinif xronologiyasında BAŞQALARININ da xatirəsi olan məzmun yox olardı.
 * Deaktivasiya girişi bağlayır, məzmun qalır.
 */
export function checkDeactivation(input: DeactivationInput): AdminRuleRejection | null {
  if (input.alreadyDeactivated) return "ALREADY_APPLIED";
  if (input.actorId === input.targetId) return "SELF_DEACTIVATE";

  if (input.targetRole === SystemRole.UNIVERSITY_ADMIN && input.adminCount <= 1) {
    return "LAST_ADMIN";
  }

  return null;
}

// ---------------------------------------------------------------------------
// 3. Cohort slug-ı (TƏLƏ F)
// ---------------------------------------------------------------------------

/**
 * 🔴 SXEM `@@unique([scope, facultyId, programId, admissionYear])` DUBLİKATI
 * DAYANDIRMIR: SQL-də iki `NULL` bir-birindən FƏRQLİ sayılır, yəni
 * `scope = UNIVERSITY` (hər ikisi null) halında məhdudiyyət heç vaxt pozulmur.
 * Sxem şərhi bunu açıq yazır. Əsl qoruyucu `Cohort.slug @unique`-dir.
 *
 * Buna görə slug TƏSADÜFİ deyil, DETERMİNİSTİK generasiya olunur: eyni
 * ixtisas + eyni məzuniyyət ili HƏMİŞƏ eyni slug verir və ikinci yaratma
 * cəhdi unikal indeksə çırpılır.
 *
 * Formul seed-lə EYNİDİR (`prisma/seed.ts` → `${program.slug}-${graduationYear}`)
 * — ayrılsaydı seed-dəki sinif ilə admin panelindən yaradılan sinif fərqli ad
 * qaydası daşıyardı.
 */
export function cohortSlugOf(programSlug: string, graduationYear: number): string {
  return `${asciiSlug(programSlug, 60)}-${graduationYear}`;
}

/** `displayName` də deterministikdir — seed-dəki forma ilə eyni. */
export function cohortDisplayNameOf(programName: string, graduationYear: number): string {
  return `${programName} — Class of ${graduationYear}`;
}

// ---------------------------------------------------------------------------
// 4. Cohort tarixləri
// ---------------------------------------------------------------------------

export type CohortDateRejection = "ORDER" | "SPAN";

export const COHORT_DATE_MESSAGES: Record<CohortDateRejection, string> = {
  ORDER: "Dərsin başlama tarixi məzuniyyət tarixindən əvvəl olmalıdır.",
  SPAN: "Təhsil müddəti 1 ildən qısa, 10 ildən uzun ola bilməz.",
};

const MIN_SPAN_DAYS = 365;
const MAX_SPAN_DAYS = 365 * 10;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * `academicStartsAt` < `graduatesAt` və müddət ağlabatan aralıqdadır.
 *
 * ⚠️ Tarixlər mərhələ mühərrikinin (`resolveStage`) GİRİŞİDİR — tərs sıralı
 * cohort `INCOMING` və `ALUMNI` şərtlərinin ikisini də ödəmir və sinif
 * səhifəsi heç bir mərhələdə düzgün render olunmaz.
 */
export function checkCohortDates(
  academicStartsAt: Date,
  graduatesAt: Date,
): CohortDateRejection | null {
  if (!(academicStartsAt.getTime() < graduatesAt.getTime())) return "ORDER";

  const spanDays = (graduatesAt.getTime() - academicStartsAt.getTime()) / DAY_MS;
  if (spanDays < MIN_SPAN_DAYS || spanDays > MAX_SPAN_DAYS) return "SPAN";

  return null;
}

// ---------------------------------------------------------------------------
// 5. Audit metadata-sının təhlükəsizliyi (TƏLƏ A-nın ikinci ucu)
// ---------------------------------------------------------------------------

/**
 * 🔴 AUDIT `metadata`-SINA MƏZMUN YAZILMIR.
 *
 * Audit jurnalı `/admin/audit`-də GÖSTƏRİLİR. Moderasiya baxışının audit
 * sətrinə şikayət edilmiş mətnin özü yazılsaydı, `PRIVATE` məzmun jurnalda
 * peyda olar və "admin belə oxumur" qaydası mənasını itirərdi — məzmun
 * qoruma qapısından yan keçib jurnala düşərdi.
 *
 * Bu siyahı İCAZƏ VERİLƏN açarların AĞ SİYAHISIDIR. Sərbəst mətn daşıyan
 * açar (`body`, `title`, `details`, `content`…) burada YOXDUR və olmamalıdır.
 */
export const AUDIT_METADATA_KEYS = [
  "operation",
  "from",
  "to",
  "reportId",
  "entityType",
  "entityId",
  "cohortId",
  "ownerId",
  "targetId",
  "visibility",
  "created",
  "updated",
  "rejected",
  "reason",
  "slug",
  "field",
  // ── Blok 12A · TƏLƏ T42 ───────────────────────────────────────────────────
  // Bu altı açar ARTIQ yazılırdı, amma `prisma.auditLog.create` BİRBAŞA
  // çağırıldığı üçün ağ siyahıdan yan keçirdi (lent / şərh / tədbir /
  // nailiyyət yolları). Çağırışlar `recordAudit`-ə köçürüldü, açarlar isə
  // buraya — əks halda süzgəc onları SƏSSİZCƏ atardı və jurnal məlumat itirərdi.
  //
  // ⚠️ Hamısı id / enum / SAY-dır. Sərbəst MƏTN (paylaşımın gövdəsi, şərh
  // mətni, xatirə mətni) bu siyahıya HEÇ VAXT əlavə edilməməlidir — jurnal
  // `/admin/audit` səhifəsində göstərilir və moderasiya qapısını yan keçərdi.
  "authorId",
  "postId",
  "memoryId",
  "category",
  "scope",
  "statuses",
  "recipients",
] as const;

export type AuditMetadataKey = (typeof AUDIT_METADATA_KEYS)[number];

/** `metadata` obyektinin ağ siyahıdan kənar açarları ATILIR. */
export function safeAuditMetadata(
  input: Partial<Record<AuditMetadataKey, unknown>>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const key of AUDIT_METADATA_KEYS) {
    const value = input[key];
    if (value !== undefined && value !== null) out[key] = value;
  }

  return out;
}

/**
 * `AuditLog.metadata` JSON SƏTRİDİR (SQLite-da JSON tipi yoxdur).
 * Xarab sətir səhifəni SINDIRMAMALIDIR — parse uğursuz olarsa `null` qayıdır
 * və UI xam mətni göstərir.
 */
export function parseAuditMetadata(raw: string | null): Record<string, unknown> | null {
  if (raw === null || raw.trim() === "") return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
