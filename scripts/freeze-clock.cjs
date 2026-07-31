// ============================================================================
// scripts/freeze-clock.cjs — SERVER saatını sabit ana bağlayan preload modulu.
//
//   NODE_OPTIONS="--require ./scripts/freeze-clock.cjs" npm start
//
// NİYƏ LAZIMDIR
// Ekran görüntüləri determinist olmalıdır (Blok 13B DoD). Seed datası sabit
// `NOW = 2026-07-29T09:00:00Z` anına nisbətən qurulur, amma UI-dakı NİSBİ
// tarixlər (`relativeTime` → "2 gün əvvəl") `Date` ilə hesablanır. Yəni skripti
// sabah işlətsən eyni paylaşım "3 gün əvvəl" yazır və hər PNG dəyişir —
// diff-də 17 fayl "dəyişib" görünür, halbuki kodda heç nə dəyişməyib.
//
// Nisbi tarixlərin bir hissəsi SERVER komponentində render olunur
// (`FeedPreview`, `NotificationItem`), bir hissəsi client-də (`PostCard`).
// Brauzer tərəfi Playwright-ın `clock` API-si ilə bağlanır; serverin qarşılığı
// məhz bu fayldır.
//
// 🔴 SAAT DONDURULMUR, SÜRÜŞDÜRÜLÜR — və bu, qəsdli seçimdir.
// `Date.now()`-u sabit rəqəm qaytarmağa məcbur etsək zamanın AXMASINA güvənən
// hər kod pozulur: timeout hesablaması (`start + 5000 > Date.now()` heç vaxt
// doğru olmur), rate limiter-in pəncərəsi, Next.js-in daxili keş yaşı. Nəticə
// asma və ya sonsuz döngədir. Ona görə sabit fərq (`OFFSET`) hesablanır və
// zaman NORMAL sürətlə axır, sadəcə BAŞQA nöqtədən. Prosesin ömrü boyu fərq
// dəyişmir, ekran görüntüsü isə bir neçə dəqiqə ərzində çəkilir — yəni nisbi
// etiketlər hər icrada eynidir.
//
// ⚠️ YALNIZ ÖLÇMƏ/SƏNƏD ÜÇÜNDÜR. İstehsal serverində işlədilmir: baza real
// vaxtla yazılır, saat sürüşdürülmüş proses isə gələcək/keçmiş tarixli sətir
// yarada bilər.
// ============================================================================

const FIXED_NOW = process.env.FIXED_NOW ?? "2026-07-31T10:00:00.000Z";

const target = new Date(FIXED_NOW).getTime();
if (Number.isNaN(target)) {
  throw new Error(`freeze-clock: FIXED_NOW xarab tarixdir: ${FIXED_NOW}`);
}

const RealDate = Date;
const realNow = RealDate.now;
// Prosesin start anı ilə hədəf an arasındakı sabit fərq. Bir dəfə hesablanır.
const OFFSET = target - realNow();

/**
 * ⚠️ `class ShiftedDate extends Date` YAZILA BİLMƏZDİ.
 * `Date` konstruktoru `new.target` ilə çağırılanda daxili [[DateValue]] slotunu
 * ÖZÜ qurur; alt sinifdə arqumentsiz `super()` yenə REAL saatı yazır və biz
 * onu sonradan dəyişə bilmirik (`this.setTime()` isə `instanceof` yoxlamasını
 * saxlasa da `Date.prototype.toString`-in nəticəsini artıq gec düzəldir).
 * Proxy `construct` tələsi isə arqumentləri GÖRÜR: arqumentsiz çağırışa sabit
 * dəyər ötürülür, qalan bütün formalar (`new Date(iso)`, `new Date(ms)`,
 * `new Date(y, m, d)`) toxunulmadan ötürülür.
 */
const ShiftedDate = new Proxy(RealDate, {
  construct(TargetDate, args, newTarget) {
    if (args.length === 0) {
      return Reflect.construct(TargetDate, [realNow() + OFFSET], newTarget);
    }
    return Reflect.construct(TargetDate, args, newTarget);
  },
  apply(TargetDate, thisArg, args) {
    // `Date()` — `new` olmadan çağırış həmişə SƏTİR qaytarır.
    return new ShiftedDate(...args).toString();
  },
  get(TargetDate, property, receiver) {
    if (property === "now") return () => realNow() + OFFSET;
    return Reflect.get(TargetDate, property, receiver);
  },
});

globalThis.Date = ShiftedDate;

// ⚠️ `performance.now()` TOXUNULMUR — o, monoton saatdır və epoxadan asılı
// deyil; ölçmə/timeout kodu ondan istifadə edirsə onsuz da doğru işləyir.

if (!process.env.FIXED_NOW_QUIET) {
  process.stdout.write(
    `[freeze-clock] server saatı ${new ShiftedDate().toISOString()} anına bağlandı ` +
      `(fərq ${Math.round(OFFSET / 1000)} s)\n`,
  );
}
