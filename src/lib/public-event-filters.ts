// ============================================================================
// src/lib/public-event-filters.ts
// `/events` (ictimai tədbir siyahısı) filtri — SAF modul.
//
// 🔴 NİYƏ `lib/event-filters.ts` İŞLƏDİLMİR: o modul SİNİF tədbir səhifəsinin
// altı filtri üçündür (scope · category · faculty · club · online · upcoming) və
// hər biri sinif kontekstində mənalıdır. İctimai siyahıda fakültə / klub /
// scope filtri ziyarətçiyə heç nə demir (o, universitetin daxili strukturunu
// bilmir) və boş nəticələr yaradır. Burada TƏK ölçü var: vaxt.
//
// ⚠️ DEFAULT `upcoming`-dir və bu, filtrin OLMAMASINDAN fərqlidir: ziyarətçi
// «qarşıdan gələn tədbirlər» gözləyir, arxiv isə açıq seçimdir. `?when=past`
// linki paylaşıla bilir.
// ============================================================================

export const PUBLIC_EVENT_PARAMS = {
  when: "when",
} as const;

export const PUBLIC_EVENT_WHEN_VALUES = ["upcoming", "past"] as const;
export type PublicEventWhen = (typeof PUBLIC_EVENT_WHEN_VALUES)[number];

export const DEFAULT_PUBLIC_EVENT_WHEN: PublicEventWhen = "upcoming";

export interface PublicEventFilterState {
  when: PublicEventWhen;
}

export type PublicEventSearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function firstText(input: PublicEventSearchParamsInput, param: string): string | null {
  const raw = input instanceof URLSearchParams ? input.get(param) : input[param];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return value === undefined || value === "" ? null : value;
}

/** ⚠️ Naməlum dəyər 404 VERMİR — defolt (`upcoming`) tətbiq olunur. */
export function parsePublicEventParams(
  input: PublicEventSearchParamsInput,
): PublicEventFilterState {
  const when = firstText(input, PUBLIC_EVENT_PARAMS.when);

  return {
    when: (PUBLIC_EVENT_WHEN_VALUES as readonly string[]).includes(when ?? "")
      ? (when as PublicEventWhen)
      : DEFAULT_PUBLIC_EVENT_WHEN,
  };
}

export function serializePublicEventParams(
  filters: PublicEventFilterState,
): URLSearchParams {
  const params = new URLSearchParams();
  // Defolt dəyər URL-ə yazılmır — link təmiz qalır və `/events` ilə
  // `/events?when=upcoming` EYNİ səhifədir (kanonik ünvan birincisidir).
  if (filters.when !== DEFAULT_PUBLIC_EVENT_WHEN) {
    params.set(PUBLIC_EVENT_PARAMS.when, filters.when);
  }
  return params;
}

export const PUBLIC_EVENTS_PATH = "/events";

export function publicEventsHref(
  filters: PublicEventFilterState = { when: DEFAULT_PUBLIC_EVENT_WHEN },
): string {
  const query = serializePublicEventParams(filters).toString();
  return query === "" ? PUBLIC_EVENTS_PATH : `${PUBLIC_EVENTS_PATH}?${query}`;
}

/** `listEvents` filtrinin `upcoming` sahəsi — `true` gələcək, `false` keçmiş. */
export function upcomingFlagOf(filters: PublicEventFilterState): boolean {
  return filters.when === "upcoming";
}
