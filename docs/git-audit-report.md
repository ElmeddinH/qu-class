# Git tarixçəsi — sızma auditi

`npm run git:audit` (`scripts/git-audit.mjs`) tərəfindən yaradılır. Şəbəkəsiz, yalnız oxu. Tapılan hər dəyər **maskalanır** (ilk 4 simvol + `****`) — hesabatın özü sızma mənbəyinə çevrilməməlidir.

Son işlədilmə: `2026-07-30T19:21:33.910Z`

## Xülasə

| Ölçü | Dəyər |
| --- | --- |
| Gəzilən commit | 27 (HEAD-dən kökə, `depth: Infinity`) |
| Tarixçədəki unikal yol | 547 |
| Tarixçədəki unikal blob | 694 |
| İndeksdə izlənən fayl | 544 |
| 🔴 Bloklayan tapıntı | 0 |
| ⚠️ Xəbərdarlıq | 0 |

## Tapıntılar

**Tapıntı yoxdur.** Qadağan yol siyahısının heç bir maddəsi tarixçənin heç bir nöqtəsində görünmür, məzmun skanı sirr tapmadı, ölçü limitləri aşılmayıb.

## Ölçü — ən böyük 10 blob

GitHub həddləri: **50 MB** xəbərdarlıq · **100 MB** hard blok.

| # | Ölçü | Yol |
| --- | --- | --- |
| 1 | 421.8 KB | `package-lock.json` |
| 2 | 419.7 KB | `package-lock.json` |
| 3 | 90.7 KB | `prisma/seed-data/content.ts` |
| 4 | 86.3 KB | `STATE.md` |
| 5 | 81.2 KB | `prisma/seed-data/content.ts` |
| 6 | 77.2 KB | `prisma/seed-data/content.ts` |
| 7 | 67.8 KB | `prisma/seed.ts` |
| 8 | 66.3 KB | `STATE.md` |
| 9 | 65.8 KB | `prisma/seed.ts` |
| 10 | 61.7 KB | `prisma/seed.ts` |

## `.gitignore` uyğunluğu

İzlənən fayllardan heç biri `.gitignore` qaydasına düşmür.

Tərsinə təsdiq (bunlar İZLƏNMƏLİDİR):

- `prisma/migrations/` — 4 fayl izlənir ✅
- `.env.example` — izlənir ✅

## Müəllif auditi

| Rol | Ad | E-poçt | Commit sayı |
| --- | --- | --- | --- |
| author | Elmeddin Heydarov | `heydarovelmeddin2@gmail.com` | 27 |
| committer | Elmeddin Heydarov | `heydarovelmeddin2@gmail.com` | 27 |

⚠️ **T33** — GitHub commit-i töhfə qrafikinə yalnız e-poçt hesaba bağlı olduqda yazır. Uyğunsuzluq push-DAN ƏVVƏL düzəldilməlidir: sonrakı düzəliş bütün commit SHA-larını dəyişir.

## Push tələləri (reyestr)

- **T33 — müəllif e-poçtu töhfə qrafikini müəyyən edir.** Placeholder (`user@example.com`, boş, `noreply`) qalarsa commit-lər hesaba bağlanmır. Düzəliş yalnız push-dan ƏVVƏL ucuzdur.
- **T34 — uzaq repo BOŞ yaradılmalıdır.** README / `.gitignore` / lisenziya SEÇİLMƏDƏN. Əks halda uzaqda bizim tarixçədə olmayan commit yaranır və push `non-fast-forward` ilə rədd olunur; `--force` isə həmin commit-i silir.
- **T35 — PAT icazələri.** classic → `repo` scope; fine-grained → məhz bu repo seçilmiş + `Contents: Read and write`. **401 = icazə / bitmə tarixi problemi**, kod problemi deyil.
- **T36 — 403 `push protection`.** GitHub tarixçədə REAL sirr aşkarlayıb. Bypass linkinə basma — bu audit-ə qayıt, sirri tarixçədən çıxar və dəyəri ROTASİYA ET (push cəhdi zamanı token artıq şəbəkəyə çıxıb sayılır).

