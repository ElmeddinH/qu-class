// ============================================================================
// src/app/api/events/[id]/ics/route.ts
// Təqvim faylı — «Təqvimə əlavə et» (spec §14).
//
// ⚠️ Route handler `prisma.*` ÇAĞIRMIR və formatı ÖZÜ qurmur: sorğu
// `services/event.service.ts`-dədir, format `src/lib/ics.ts`-də (CLAUDE.md §4).
// Burada yalnız icazə, başlıqlar və fayl adı var.
//
// 🔴 GÖRÜNÜRLÜK BURADA DA YOXLANILIR. `.ics` ünvanı `(app)` prefiksindədir,
// yəni middleware anonim istifadəçini buraxmır — amma GİRİŞ ETMİŞ istifadəçi
// başqa sinfin `CLASS` tədbirinin id-sini bilsə faylı endirə bilərdi. Sorğu
// `visibleWithStatus`-dan keçir (`getEventForCalendar`), görünməyən tədbir 404
// verir.
// ============================================================================

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { EventStatus } from "@/lib/enums";
import { buildIcsCalendar, icsFileName } from "@/lib/ics";
import { getEventForCalendar } from "@/services/event.service";

/** `Date` və fayl qurulması — Edge-də lazım deyil, Node sadədir. */
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await requireUser();
  const { id } = await params;

  const event = await getEventForCalendar(viewer, id);
  if (!event) {
    return NextResponse.json({ error: "Tədbir tapılmadı." }, { status: 404 });
  }

  const origin = new URL(request.url).origin;

  const body = buildIcsCalendar(
    {
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      url: event.onlineUrl,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      cancelled: event.status === EventStatus.CANCELLED,
    },
    { now: new Date(), origin, eventPath: `/events/${event.id}` },
  );

  return new NextResponse(body, {
    status: 200,
    headers: {
      // ⚠️ `charset=utf-8` MƏCBURİDİR: azərbaycanca başlıq (`Buraxılış gecəsi`)
      // olmadan bəzi təqvim proqramlarında zibilə çevrilir.
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${icsFileName(event.title, event.id)}"`,
      // Tədbir redaktə oluna bilər — köhnə fayl keşdən verilməməlidir.
      "Cache-Control": "no-store",
    },
  });
}
