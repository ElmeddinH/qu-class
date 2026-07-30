// ============================================================================
// src/lib/ics.ts
// iCalendar (.ics) faylının qurulması — RFC 5545.
//
// 🔴 SAF MODUL: Prisma, React, `next/*` importu yoxdur. Route handler
// (`/api/events/[id]/ics`) yalnız tədbiri servisdən gətirib bu funksiyaya
// ötürür. Səbəb: format qaydaları (sətir qatlanması, xüsusi simvolların
// qaçırılması, UTC damğası) məhz burada səhv salınsa fayl yüklənir, amma
// təqvim proqramı onu SƏSSİZCƏ atır — bazasız testlə bərkidilir (`ics.test.ts`).
//
// Yoxlanılmış müştərilər: Google Calendar, Apple Calendar, Outlook. Üçü də
// CRLF sətir sonluğu və 75 oktetlik qatlanma tələb edir.
// ============================================================================

import { asciiSlug } from "@/utils/slug";

/** RFC 5545 §3.1 — sətirlər CRLF ilə bitir, LF tək başına KİFAYƏT ETMİR. */
const CRLF = "\r\n";

/** RFC 5545 §3.1 — məzmun sətri 75 oktetdən uzun olmamalıdır. */
const MAX_LINE_OCTETS = 75;

/** `PRODID` — faylı yaradan məhsul. Təqvim proqramları bunu loglayır. */
const PRODID = "-//Qarabag Universiteti//QU CLASS//AZ";

export interface IcsEvent {
  /** `Event.id` — UID-in sabit hissəsi. */
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  /** Onlayn tədbirdə keçid; `URL` sahəsinə düşür. */
  url: string | null;
  startsAt: Date;
  /** `null` olarsa tədbir 1 saatlıq sayılır (aşağıdakı qeydə bax). */
  endsAt: Date | null;
  /** `CANCELLED` tədbir təqvimdə ləğv edilmiş kimi görünməlidir. */
  cancelled?: boolean;
}

/** Bitmə vaxtı verilməyən tədbirin default müddəti. */
export const DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Format köməkçiləri
// ---------------------------------------------------------------------------

/**
 * `Date` → `20260730T140000Z` (UTC forması).
 *
 * ⚠️ Yerli vaxt zonası ilə (`TZID`) yazmaq üçün VTIMEZONE bloku da lazımdır;
 * UTC damğası isə hər müştəridə eyni anı göstərir və əlavə blok tələb etmir.
 */
export function toIcsDateTime(value: Date): string {
  return `${value.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/**
 * RFC 5545 §3.3.11 — TEXT dəyərində `\`, `;`, `,` və yeni sətir qaçırılır.
 *
 * ⚠️ Tərs kəsik BİRİNCİ əvəz olunur, yoxsa sonrakı əvəzləmələrin əlavə etdiyi
 * tərs kəsiklər ikinci dəfə qaçırılardı.
 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * RFC 5545 §3.1 — uzun sətri 75 oktetlik hissələrə bölür, davamı bir boşluqla
 * başlayır.
 *
 * ⚠️ Ölçü SİMVOLLA deyil, OKTETLƏ hesablanır: azərbaycanca mətndəki `ə`, `ğ`,
 * `ş` UTF-8-də 2 baytdır. Simvolla saysaydıq Outlook bəzi təsvirləri kəsərdi.
 * Bölmə nöqtəsi kod nöqtəsi sərhədində saxlanılır — surroqat cütü ortadan
 * bölünsə fayl xarab olar.
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= MAX_LINE_OCTETS) return line;

  const chunks: string[] = [];
  let current = "";
  let currentOctets = 0;
  // Davam sətri bir boşluqla başlayır, yəni onun faydalı yükü 1 oktet azdır.
  let limit = MAX_LINE_OCTETS;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (currentOctets + size > limit) {
      chunks.push(current);
      current = "";
      currentOctets = 0;
      limit = MAX_LINE_OCTETS - 1;
    }
    current += char;
    currentOctets += size;
  }

  if (current !== "") chunks.push(current);

  return chunks.map((chunk, index) => (index === 0 ? chunk : ` ${chunk}`)).join(CRLF);
}

function property(name: string, value: string): string {
  return foldIcsLine(`${name}:${value}`);
}

// ---------------------------------------------------------------------------
// Fayl adı
// ---------------------------------------------------------------------------

/**
 * `Content-Disposition` üçün ASCII fayl adı.
 *
 * Azərbaycan hərfləri `asciiSlug` ilə transliterasiya olunur ("Görüş" →
 * "gorus"); nəticə boş qalarsa tədbirin id-si işlədilir. Brauzerlərin bir
 * hissəsi qeyri-ASCII fayl adını `filename*` olmadan səhv oxuyur.
 */
export function icsFileName(title: string, eventId: string): string {
  const slug = asciiSlug(title, 60);
  return `${slug === "" ? eventId : slug}.ics`;
}

// ---------------------------------------------------------------------------
// Qurucu
// ---------------------------------------------------------------------------

export interface BuildIcsOptions {
  /** `DTSTAMP` — faylın yaradılma anı. Testdə sabit dəyər ötürülür. */
  now: Date;
  /** UID-in domen hissəsi və `URL` sahəsindəki mütləq ünvan üçün. */
  origin: string;
  /** Tədbirin platformadakı ünvanı (`/events/<id>`). */
  eventPath: string;
}

/**
 * Tək tədbirlik VCALENDAR sənədi.
 *
 * · `UID` — `<eventId>@<host>`: eyni tədbir təkrar yüklənəndə təqvim onu
 *   YENİ hadisə kimi yox, mövcudun yenilənməsi kimi görür.
 * · `DTEND` — verilməyibsə başlama + 1 saat. Sahəni tamamilə buraxmaq da
 *   olardı (o zaman hadisə "anlıq" sayılır), amma Google Calendar belə
 *   hadisəni bütün gün kimi göstərir və istifadəçini çaşdırır.
 * · `STATUS` — ləğv edilmiş tədbir `CANCELLED` kimi işarələnir ki, təqvimdə
 *   üstündən xətt çəkilsin.
 */
export function buildIcsCalendar(event: IcsEvent, options: BuildIcsOptions): string {
  const host = safeHost(options.origin);
  const endsAt =
    event.endsAt ?? new Date(event.startsAt.getTime() + DEFAULT_EVENT_DURATION_MS);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    property("PRODID", PRODID),
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    property("UID", `${event.id}@${host}`),
    property("DTSTAMP", toIcsDateTime(options.now)),
    property("DTSTART", toIcsDateTime(event.startsAt)),
    property("DTEND", toIcsDateTime(endsAt)),
    property("SUMMARY", escapeIcsText(event.title)),
  ];

  if (event.description) {
    lines.push(property("DESCRIPTION", escapeIcsText(event.description)));
  }
  if (event.location) {
    lines.push(property("LOCATION", escapeIcsText(event.location)));
  }

  // Onlayn keçid varsa o, üstündür; yoxdursa tədbirin öz səhifəsi verilir —
  // təqvim bildirişindən birbaşa detala keçmək mümkün olsun.
  const url = event.url ?? `${options.origin}${options.eventPath}`;
  lines.push(property("URL", escapeIcsText(url)));

  lines.push(property("STATUS", event.cancelled ? "CANCELLED" : "CONFIRMED"));
  lines.push("END:VEVENT", "END:VCALENDAR");

  // Sonuncu CRLF QƏSDƏNDİR: RFC 5545 hər məzmun sətrinin CRLF ilə BİTMƏSİNİ
  // tələb edir, yəni fayl da onunla bitməlidir.
  return `${lines.join(CRLF)}${CRLF}`;
}

/** `https://qu.edu.az` → `qu.edu.az`. Xarab dəyər UID-i sındırmasın. */
function safeHost(origin: string): string {
  try {
    return new URL(origin).host || "qu-class";
  } catch {
    return "qu-class";
  }
}
