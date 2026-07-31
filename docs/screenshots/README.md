# Ekran görüntüləri — Blok 13B

Bu qovluq `npm run shots` ilə YENİDƏN YARADILIR — fayllar əl ilə
redaktə edilmir. Skript: [`scripts/screenshots.ts`](../../scripts/screenshots.ts).

| Ölçü | Dəyər |
| --- | --- |
| Pəncərə | 1440×900 (KUDS §9 «Desktop») |
| Kadr | pəncərə · `deviceScaleFactor: 1` |
| Sabit an | `2026-07-31T10:00:00.000Z` (server + brauzer) |
| Animasiya | `prefers-reduced-motion: reduce` + `animations: "disabled"` |
| Kuki banneri | bağlı (`qu_cookie_consent=all`) |
| Ekran sayı | 17 |

⚠️ Örtük şəkilləri seed-də `picsum.photos/seed/<açar>` ünvanındadır — açara
görə sabit şəkil qaytarır, amma şəbəkə tələb edir. Oflayn icrada tədbir və
cohort kartları şəkilsiz çəkilir.

## Şəxsi məlumat yoxlaması

**Tapıntı yoxdur** ✅ — nə bazada, nə də 17 ekranın görünən mətnində
real şəxsə aid dəyər var. Bütün adlar seed-in ad hovuzlarından
(`MALE_FIRST_NAMES` / `FEMALE_FIRST_NAMES` / `LAST_NAME_STEMS`)
qurulub, e-poçtlar `@qu.edu.az` və `@mail.az` domenlərindədir,
telefonlar `+994 5x xxx xx xx` şablonundandır — hamısı uydurmadır.

## Qalereya

| Açar | Ekran | Modul | Yol | Görüntü |
| --- | --- | --- | --- | --- |
| `01-welcome` | Açılış səhifəsi | M1 | `/` | ![Açılış səhifəsi](01-welcome.png) |
| `02-faq` | Tez-tez verilən suallar | M2 | `/faq` | ![Tez-tez verilən suallar](02-faq.png) |
| `03-khankendi` | Xankəndi bələdçisi | M3 | `/khankendi` | ![Xankəndi bələdçisi](03-khankendi.png) |
| `04-login` | Giriş | — | `/login` | ![Giriş](04-login.png) |
| `05-feed` | Sinif lenti | M5 | `/class/informasiya-tehlukesizliyi-2027/feed` | ![Sinif lenti](05-feed.png) |
| `06-directory` | Sinif kataloqu | M6 | `/class/informasiya-tehlukesizliyi-2027/directory` | ![Sinif kataloqu](06-directory.png) |
| `07-class-story` | Mənim sinif hekayəm | M7 | `/me` | ![Mənim sinif hekayəm](07-class-story.png) |
| `08-timeline` | Sinif xronologiyası | M8 | `/class/informasiya-tehlukesizliyi-2027/timeline` | ![Sinif xronologiyası](08-timeline.png) |
| `09-achievements` | Sinif nailiyyətləri | M10 | `/class/informasiya-tehlukesizliyi-2027/achievements` | ![Sinif nailiyyətləri](09-achievements.png) |
| `10-memories` | Xatirələr | M9 | `/class/maliyye-2022/memories` | ![Xatirələr](10-memories.png) |
| `11-events` | Tədbirlər | M12 | `/class/informasiya-tehlukesizliyi-2027/events` | ![Tədbirlər](11-events.png) |
| `12-map` | İndi haradayıq? | M11 | `/class/maliyye-2022/map` | ![İndi haradayıq?](12-map.png) |
| `13-notifications` | Bildiriş mərkəzi | M15 | `/notifications` | ![Bildiriş mərkəzi](13-notifications.png) |
| `14-privacy` | Məxfilik idarəetməsi | M14 | `/me/privacy` | ![Məxfilik idarəetməsi](14-privacy.png) |
| `15-admin-dashboard` | İdarə paneli | M17 | `/admin` | ![İdarə paneli](15-admin-dashboard.png) |
| `16-admin-moderation` | Şikayət moderasiyası | M17 | `/admin/moderation` | ![Şikayət moderasiyası](16-admin-moderation.png) |
| `17-kuds` | KUDS stil bələdçisi | KUDS v1.0 | `/kuds` | ![KUDS stil bələdçisi](17-kuds.png) |
