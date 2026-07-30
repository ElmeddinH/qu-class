// ============================================================================
// scripts/backfill-field-visibility.ts
// İDARƏ OLUNAN SAHƏ SİYAHISINA YENİ SAHƏ ƏLAVƏ OLUNANDA işlədilən backfill.
//
// 🔴 NİYƏ LAZIMDIR. `CONTROLLED_PROFILE_FIELDS`-ə sahə əlavə etmək KOD
// tərəfində kifayətdir (`redactProfile` sətir tapmasa `defaultLevelFor()`-a
// düşür və fail-closed işləyir), amma `/me/privacy` paneli DB sətirlərini
// göstərir. Sətir yoxdursa istifadəçi seçiciyə toxunana qədər «bu sahə hansı
// səviyyədədir?» sualına DB-dən cavab alınmır və admin/analitika sorğuları
// ("neçə nəfər banneri gizlədib") natamam qalır.
//
// ⚠️ İDEMPOTENTDİR. Yalnız ÇATIŞMAYAN sətirlər yaradılır; mövcud sətrin
// səviyyəsinə TOXUNULMUR (istifadəçinin öz seçimini əzmək məxfilik pozuntusu
// olardı). Skripti istənilən sayda işə salmaq olar.
//
// ⚠️ Yeni sətrin səviyyəsi `defaultLevelFor()`-dan gəlir — yəni yeni sahə
// heç vaxt PUBLIC olmur (CLAUDE.md §"Məxfilik": default CLASS; `phone` /
// `personalEmail` PRIVATE).
//
// İşə salma:
//   npm run db:backfill            — dəyişikliyi TƏTBİQ EDİR
//   npm run db:backfill -- --dry   — yalnız hesabat verir, yazmır
// ============================================================================

import { prisma } from "@/lib/db";
import { CONTROLLED_PROFILE_FIELDS, defaultLevelFor } from "@/lib/visibility";

const DRY_RUN = process.argv.includes("--dry");

/** Bir `$transaction`-a yığılan `upsert` sayı. */
const CHUNK_SIZE = 200;

async function main(): Promise<void> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      fieldVisibility: { select: { field: true } },
    },
  });

  const missing: Array<{ userId: string; field: string; level: string }> = [];
  const perField = new Map<string, number>();

  for (const user of users) {
    const present = new Set(user.fieldVisibility.map((row) => row.field));

    for (const field of CONTROLLED_PROFILE_FIELDS) {
      if (present.has(field)) continue;

      missing.push({ userId: user.id, field, level: defaultLevelFor(field) });
      perField.set(field, (perField.get(field) ?? 0) + 1);
    }
  }

  console.log(`[backfill] istifadəçi: ${users.length}`);
  console.log(`[backfill] idarə olunan sahə: ${CONTROLLED_PROFILE_FIELDS.length}`);

  if (missing.length === 0) {
    console.log("[backfill] çatışmayan sətir YOXDUR — dəyişiklik edilmədi.");
    return;
  }

  for (const [field, count] of [...perField].sort()) {
    console.log(`[backfill]   ${field}: ${count} sətir (${defaultLevelFor(field)})`);
  }

  if (DRY_RUN) {
    console.log(`[backfill] --dry: ${missing.length} sətir YAZILMADI.`);
    return;
  }

  // ⚠️ `createMany({ skipDuplicates })` İŞLƏMİR — Prisma onu SQLite üçün
  // dəstəkləmir. `upsert` həm o boşluğu doldurur, həm də idempotentliyi
  // İKİNCİ qatda təmin edir: `update: {}` boşdur, yəni skript arada yaranmış
  // sətrin səviyyəsini ƏZMİR (istifadəçinin seçimi toxunulmazdır).
  let written = 0;
  for (let index = 0; index < missing.length; index += CHUNK_SIZE) {
    const chunk = missing.slice(index, index + CHUNK_SIZE);

    await prisma.$transaction(
      chunk.map((row) =>
        prisma.fieldVisibility.upsert({
          where: { userId_field: { userId: row.userId, field: row.field } },
          create: row,
          update: {},
        }),
      ),
    );

    written += chunk.length;
  }

  console.log(`[backfill] ${written} sətir yazıldı (mövcud səviyyələr dəyişmədi).`);
}

main()
  .catch((error) => {
    console.error("[backfill] SƏHV:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
