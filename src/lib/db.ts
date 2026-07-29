// ============================================================================
// src/lib/db.ts
// QU CLASS — PrismaClient singleton.
//
// Next.js dev rejimində hot-reload hər dəyişiklikdə modul qrafını yenidən
// qiymətləndirir. Hər dəfə `new PrismaClient()` çağırsaq, onlarla açıq
// bağlantı yığılır və SQLite "too many connections" / fayl kilidi verir.
// Buna görə klient `globalThis`-də saxlanılır — istehsalda isə YOX, çünki
// orada modul bir dəfə yüklənir.
//
// QAYDA (CLAUDE.md §4): heç bir `page.tsx` və ya route handler bu faylı
// birbaşa import etmir. Yalnız `src/services/*` qatı import edir.
// ============================================================================

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
