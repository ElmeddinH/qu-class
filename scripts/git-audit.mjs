#!/usr/bin/env node
// ============================================================================
// scripts/git-audit.mjs — push-dan ƏVVƏLKİ sızma auditi
//
// 🔴 ŞƏBƏKƏSİZ və YALNIZ OXU. Bu skript heç nə yazmır (yeganə istisna:
// `docs/git-audit-report.md` hesabatı) və `.git` obyektlərinə toxunmur.
//
// NİYƏ İŞÇİ AĞACA BAXMAQ KİFAYƏT DEYİL: `.gitignore` yalnız GƏLƏCƏK commit-ləri
// süzür — bir dəfə commit olunmuş `.env` və ya `dev.db` tarixçədə ƏBƏDİ qalır
// və `git clone` edən hər kəs onu `git log -p` ilə görür. Ona görə burada
// BÜTÜN commit-lərin ağacı gəzilir, yalnız HEAD deyil.
//
// NİYƏ PUSH-DAN ƏVVƏL: push GERİ QAYTARILA BİLMƏZ. GitHub silinmiş obyektləri
// bir müddət saxlayır, fork/keş isə əbədi qala bilər — yəni «sonra force-push
// edərəm» BƏRPA DEYİL. Sızmış sirr push olunubsa yeganə düzgün cavab dəyəri
// ROTASİYA ETMƏKDİR.
//
// İstifadə:  npm run git:audit
// Çıxış kodu: tapıntı varsa 1 (yəni `npm run git:audit && npm run git:push`
//             zənciri sızma halında öz-özünə dayanır).
// ============================================================================

import fsp from "node:fs/promises";
import path from "node:path";

import git from "isomorphic-git";

// `repo` = `{ fs, dir }` — isomorphic-git çağırışlarına spread edilir.
import { REPO_ROOT, repo } from "./git-config.mjs";

const REPORT_REL = "docs/git-audit-report.md";
const MB = 1024 * 1024;
const SIZE_WARN = 50 * MB; // GitHub xəbərdarlıq həddi
const SIZE_BLOCK = 100 * MB; // GitHub HARD limiti — push tamamilə rədd olunur
const SCAN_MAX = 1 * MB; // bundan böyük blob məzmun skanına girmir

// ─────────────────────────────────────────────────────────────────────────────
// 1) QADAĞAN YOLLAR — tarixçənin İSTƏNİLƏN nöqtəsində olmamalıdır
// ─────────────────────────────────────────────────────────────────────────────
const FORBIDDEN_PATHS = [
  {
    label: "mühit faylı (.env)",
    // `.env`, `.env.local`, `.env.production`… — YALNIZ `.env.example` icazəlidir.
    test: (p) => /(?:^|\/)\.env(?:$|\.)/.test(p) && !/(?:^|\/)\.env\.example$/.test(p),
  },
  {
    label: "SQLite bazası",
    test: (p) => /\.(?:db|db-journal)$/.test(p) || /\.sqlite[^/]*$/.test(p),
  },
  { label: "istifadəçi yükləmələri", test: (p) => p.startsWith("public/uploads/") },
  { label: "törəmə Swagger aktivi", test: (p) => p.startsWith("public/swagger/") },
  {
    label: "test artefaktı",
    test: (p) =>
      p.startsWith("test-results/") ||
      p.startsWith("playwright-report/") ||
      p.startsWith("blob-report/"),
  },
  { label: "Next.js build çıxışı", test: (p) => p === ".next" || p.startsWith(".next/") },
  {
    label: "asılılıq qovluğu",
    test: (p) => p === "node_modules" || p.startsWith("node_modules/") || p.includes("/node_modules/"),
  },
  { label: "TypeScript build keşi", test: (p) => p.endsWith(".tsbuildinfo") },
  {
    label: "sertifikat / xüsusi açar",
    test: (p) => /\.(?:pem|key|p12|pfx)$/.test(p) || /(?:^|\/)id_rsa/.test(p),
  },
  { label: "macOS metadatası", test: (p) => /(?:^|\/)\.DS_Store$/.test(p) },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2) MƏZMUN QAYDALARI
//
// ⚠️ GitHub token prefiksləri PARÇALANMIŞ şəkildə qurulur (`${GH}p_`), çünki
// DoD yoxlaması bütün repoda `grep -rn "gh"+"p_"` axtarır — skriptin ÖZÜ bu
// grep-ə düşməməlidir, əks halda audit alətinin mövcudluğu «sızma» kimi
// görünərdi.
// ⚠️ Ad=dəyər qaydalarında ayırıcı `\s*=\s*` şəklindədir. Səbəb: belə yazılanda
// REGEXP ÖZ MƏNBƏYİNƏ UYĞUN GƏLMİR — əks halda bu fayl commit olunandan sonra
// növbəti audit özünü «tapıntı» kimi göstərərdi (öz-özünü təsdiqləyən sızma).
// ─────────────────────────────────────────────────────────────────────────────
const GH = "gh";

/**
 * `AD = dəyər` qaydası.
 *
 * ⚠️ Dırnaqlı dəyər BÜTÖV tutulur (`"..."` içindəki boşluqlarla birlikdə).
 * Sadəcə `[^\s]+` yazmaq YANLIŞ NƏTİCƏ verir: `AUTH_SECRET="<npx auth secret
 * ilə yarat>"` sətrindən yalnız `<npx` qopardılır, ağ siyahıdakı `<...>`
 * placeholder şablonuna uyğun gəlmir və sənəddəki nümunə «sızma» kimi
 * bildirilir (ilk işlətmədə məhz belə oldu).
 */
const named = (name) =>
  new RegExp(`\\b${name}\\s*=\\s*(?:"([^"\\n]*)"|'([^'\\n]*)'|([^\\s"'#]+))`, "g");

/** Dırnaqlı / dırnaqsız qruplardan hansı doldusa onu götürür. */
const pickNamed = (m) => m[1] ?? m[2] ?? m[3] ?? "";
const pickToken = (m) => m[1] ?? m[0];

const CONTENT_RULES = [
  { label: "Auth.js sirri", re: named("AUTH_SECRET"), pick: pickNamed },
  { label: "NextAuth sirri", re: named("NEXTAUTH_SECRET"), pick: pickNamed },
  { label: "verilənlər bazası bağlantısı", re: named("DATABASE_URL"), pick: pickNamed },
  {
    label: "GitHub klassik PAT",
    re: new RegExp(`(${GH}p_[A-Za-z0-9]{36})`, "g"),
  },
  {
    label: "GitHub fine-grained PAT",
    re: new RegExp(`(${GH}ithub_pat_[A-Za-z0-9_]{22,})`, "g"),
  },
  {
    label: "GitHub OAuth / server tokeni",
    re: new RegExp(`(${GH}[os]_[A-Za-z0-9]{20,})`, "g"),
  },
  { label: "AWS giriş açarı", re: /(AKIA[0-9A-Z]{16})/g },
  { label: "xüsusi açar bloku", re: /(-----BEGIN [A-Z ]*PRIVATE KEY-----)/g },
  { label: "OpenAI üslublu açar", re: /(sk-[A-Za-z0-9]{20,})/g },
  { label: "Bearer tokeni", re: /(Bearer [A-Za-z0-9._-]{20,})/g },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3) AĞ SİYAHI — bunlar sızma DEYİL (qəsdən, sənədləşdirilmiş demo dəyərləri)
// ─────────────────────────────────────────────────────────────────────────────
const ALLOWLIST = [
  { re: /^\$2[aby]\$\d{2}\$QUCLASSseedSalt/, why: "seed sabit salt — qəsdən, yalnız demo" },
  { re: /^Test1234!$/, why: "sənədləşdirilmiş demo parolu" },
  { re: /^file:/, why: "lokal SQLite yolu — sirr deyil" },
  { re: /^\s*$/, why: "boş dəyər" },
  {
    re: /^(?:change[-_]?me|changeme|xxx+|placeholder|secret|example|your[-_].*|\.{3,})$/i,
    why: "placeholder",
  },
  { re: /^<.*>$/, why: "bucaqlı mötərizədə nümunə dəyəri" },
  {
    // `AUTH_SECRET="'$(openssl rand -base64 32)'"` — sənəddəki QURAŞDIRMA əmri.
    // Dəyər sabit deyil, işlədildikdə generasiya olunur.
    re: /^['"`]?(?:\$\(|\$\{|`)/,
    why: "shell əmr / dəyişən əvəzləməsi — sabit dəyər deyil",
  },
  { re: /dəyişdirin|change-me|npx auth secret|<token>|YOUR_/i, why: "placeholder mətni" },
  {
    // `postgresql://user:pass@host:5432/db` — sənəddəki NÜMUNƏ bağlantı sətri.
    // İstifadəçi adı / parol yeri açıq-aşkar doldurulmalı boşluqdur.
    re: /^\w+:\/\/(?:user|username|<[^>]*>|\$\{[^}]*\})(?::(?:pass|password|secret|<[^>]*>|\$\{[^}]*\}))?@/i,
    why: "sənəddəki nümunə bağlantı sətri (user:pass@host)",
  },
];

function allowlistReason(value) {
  for (const entry of ALLOWLIST) {
    if (entry.re.test(value)) return entry.why;
  }
  return null;
}

/** Tapılan dəyər hesabatda TAM ÇAP EDİLMİR — ilk 4 simvol + ****. */
function mask(value) {
  const text = String(value);
  return `${text.slice(0, 4)}****`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(2)} MB`;
}

const BINARY_EXT =
  /\.(?:png|jpe?g|gif|webp|avif|ico|bmp|tiff?|woff2?|ttf|otf|eot|pdf|zip|gz|tgz|bz2|xz|7z|rar|mp3|mp4|mov|avi|webm|wasm|node|so|dylib|dll|exe|db|sqlite3?|class|jar)$/i;

/** Mətn blobu sayılırmı: uzantı binar deyil, ölçü limitdə, NUL baytı yoxdur. */
function isScannableText(filepath, buffer) {
  if (buffer.byteLength > SCAN_MAX) return false;
  if (BINARY_EXT.test(filepath)) return false;
  const probe = buffer.subarray(0, Math.min(buffer.byteLength, 8000));
  return !probe.includes(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// TARİXÇƏNİN TAM GƏZİLMƏSİ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hər commit-in TAM ağacını gəzir və blob-ları toplayır.
 *
 * ⚠️ `git.walk` map-ində `null` QAYTARMA — o, alt qovluğa enməyi DAYANDIRIR
 * (bax `_walk`: `if (parent !== null) { iterate(...) }`). Qovluqlar üçün
 * `undefined` qaytarılır ki, gəzinti davam etsin.
 */
async function collectHistory(commits, cache) {
  const pathCommits = new Map(); // yol → commit oid dəsti
  const blobs = new Map(); // blob oid → { size, paths:Set }

  for (const entry of commits) {
    const files = await git.walk({
      ...repo,
      cache,
      trees: [git.TREE({ ref: entry.oid })],
      map: async (filepath, [node]) => {
        if (!node || filepath === ".") return undefined;
        const type = await node.type();
        if (type !== "blob") return undefined; // qovluq → alt ağaca en
        return { filepath, oid: await node.oid() };
      },
    });

    for (const file of files) {
      if (!pathCommits.has(file.filepath)) pathCommits.set(file.filepath, new Set());
      pathCommits.get(file.filepath).add(entry.oid);

      if (!blobs.has(file.oid)) blobs.set(file.oid, { size: 0, paths: new Set() });
      blobs.get(file.oid).paths.add(file.filepath);
    }
  }

  // Blob məzmunu YALNIZ BİR DƏFƏ oxunur (eyni oid onlarla commit-də təkrarlanır).
  for (const [oid, info] of blobs) {
    const { blob } = await git.readBlob({ ...repo, cache, oid });
    info.size = blob.byteLength;
    info.buffer = Buffer.from(blob.buffer, blob.byteOffset, blob.byteLength);
  }

  return { pathCommits, blobs };
}

function shortOids(set) {
  const list = [...set].map((oid) => oid.slice(0, 7));
  if (list.length <= 3) return list.join(", ");
  return `${list.slice(0, 3).join(", ")} … (+${list.length - 3})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HESABAT
// ─────────────────────────────────────────────────────────────────────────────
function renderReport(data) {
  const {
    commits,
    findings,
    largest,
    authors,
    committers,
    trackedCount,
    ignoredButTracked,
    migrationFiles,
    envExampleTracked,
    blobCount,
    pathCount,
    generatedAt,
  } = data;

  const blocking = findings.filter((f) => f.severity === "BLOCK");
  const warnings = findings.filter((f) => f.severity === "WARN");

  const lines = [];
  lines.push("# Git tarixçəsi — sızma auditi");
  lines.push("");
  lines.push(
    "`npm run git:audit` (`scripts/git-audit.mjs`) tərəfindən yaradılır. " +
      "Şəbəkəsiz, yalnız oxu. Tapılan hər dəyər **maskalanır** (ilk 4 simvol + `****`) — " +
      "hesabatın özü sızma mənbəyinə çevrilməməlidir.",
  );
  lines.push("");
  lines.push(`Son işlədilmə: \`${generatedAt}\``);
  lines.push("");

  lines.push("## Xülasə");
  lines.push("");
  lines.push("| Ölçü | Dəyər |");
  lines.push("| --- | --- |");
  lines.push(`| Gəzilən commit | ${commits.length} (HEAD-dən kökə, \`depth: Infinity\`) |`);
  lines.push(`| Tarixçədəki unikal yol | ${pathCount} |`);
  lines.push(`| Tarixçədəki unikal blob | ${blobCount} |`);
  lines.push(`| İndeksdə izlənən fayl | ${trackedCount} |`);
  lines.push(`| 🔴 Bloklayan tapıntı | ${blocking.length} |`);
  lines.push(`| ⚠️ Xəbərdarlıq | ${warnings.length} |`);
  lines.push("");

  lines.push("## Tapıntılar");
  lines.push("");
  if (findings.length === 0) {
    lines.push(
      "**Tapıntı yoxdur.** Qadağan yol siyahısının heç bir maddəsi tarixçənin " +
        "heç bir nöqtəsində görünmür, məzmun skanı sirr tapmadı, ölçü limitləri aşılmayıb.",
    );
  } else {
    lines.push("| Səviyyə | Növ | Yol | Commit | Detal |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const f of findings) {
      const badge = f.severity === "BLOCK" ? "🔴 BLOK" : "⚠️ XƏBƏRDARLIQ";
      lines.push(
        `| ${badge} | ${f.kind} | \`${f.filepath}\` | ${f.commits ?? "—"} | ${f.detail} |`,
      );
    }
  }
  lines.push("");

  lines.push("## Ölçü — ən böyük 10 blob");
  lines.push("");
  lines.push(`GitHub həddləri: **${SIZE_WARN / MB} MB** xəbərdarlıq · **${SIZE_BLOCK / MB} MB** hard blok.`);
  lines.push("");
  lines.push("| # | Ölçü | Yol |");
  lines.push("| --- | --- | --- |");
  largest.forEach((item, index) => {
    lines.push(`| ${index + 1} | ${formatBytes(item.size)} | \`${item.path}\` |`);
  });
  lines.push("");

  lines.push("## `.gitignore` uyğunluğu");
  lines.push("");
  if (ignoredButTracked.length === 0) {
    lines.push("İzlənən fayllardan heç biri `.gitignore` qaydasına düşmür.");
  } else {
    lines.push("İzlənən, amma ignore edilməli fayllar:");
    lines.push("");
    for (const file of ignoredButTracked) lines.push(`- \`${file}\``);
  }
  lines.push("");
  lines.push("Tərsinə təsdiq (bunlar İZLƏNMƏLİDİR):");
  lines.push("");
  lines.push(
    `- \`prisma/migrations/\` — ${migrationFiles.length} fayl izlənir ` +
      `${migrationFiles.length > 0 ? "✅" : "🔴 YOXDUR"}`,
  );
  lines.push(`- \`.env.example\` — ${envExampleTracked ? "izlənir ✅" : "🔴 izlənmir"}`);
  lines.push("");

  lines.push("## Müəllif auditi");
  lines.push("");
  lines.push("| Rol | Ad | E-poçt | Commit sayı |");
  lines.push("| --- | --- | --- | --- |");
  for (const a of authors) {
    lines.push(`| author | ${a.name} | \`${a.email}\` | ${a.count} |`);
  }
  for (const c of committers) {
    lines.push(`| committer | ${c.name} | \`${c.email}\` | ${c.count} |`);
  }
  lines.push("");
  lines.push(
    "⚠️ **T33** — GitHub commit-i töhfə qrafikinə yalnız e-poçt hesaba bağlı " +
      "olduqda yazır. Uyğunsuzluq push-DAN ƏVVƏL düzəldilməlidir: sonrakı düzəliş " +
      "bütün commit SHA-larını dəyişir.",
  );
  lines.push("");

  lines.push("## Push tələləri (reyestr)");
  lines.push("");
  lines.push(
    "- **T33 — müəllif e-poçtu töhfə qrafikini müəyyən edir.** Placeholder " +
      "(`user@example.com`, boş, `noreply`) qalarsa commit-lər hesaba bağlanmır. " +
      "Düzəliş yalnız push-dan ƏVVƏL ucuzdur.",
  );
  lines.push(
    "- **T34 — uzaq repo BOŞ yaradılmalıdır.** README / `.gitignore` / lisenziya " +
      "SEÇİLMƏDƏN. Əks halda uzaqda bizim tarixçədə olmayan commit yaranır və push " +
      "`non-fast-forward` ilə rədd olunur; `--force` isə həmin commit-i silir.",
  );
  lines.push(
    "- **T35 — PAT icazələri.** classic → `repo` scope; fine-grained → məhz bu repo " +
      "seçilmiş + `Contents: Read and write`. **401 = icazə / bitmə tarixi problemi**, " +
      "kod problemi deyil.",
  );
  lines.push(
    "- **T36 — 403 `push protection`.** GitHub tarixçədə REAL sirr aşkarlayıb. " +
      "Bypass linkinə basma — bu audit-ə qayıt, sirri tarixçədən çıxar və dəyəri " +
      "ROTASİYA ET (push cəhdi zamanı token artıq şəbəkəyə çıxıb sayılır).",
  );
  lines.push("");

  return `${lines.join("\n")}\n`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ÖZ-ÖZÜNÜ YOXLAMA — `npm run git:audit -- --self-test`
//
// 🔴 NİYƏ LAZIMDIR: «0 tapıntı» iki fərqli şeyi bildirə bilər — tarixçə
// təmizdir, YAXUD skaner sınıqdır. İkincisi daha təhlükəlidir, çünki yaşıl
// nəticə verir. Buradakı SÜNİ dəyərlər hər qaydanın həqiqətən işə düşdüyünü və
// ağ siyahının ONLARI udmadığını sübut edir.
//
// Fikstürlərdəki «tokenlər» uydurmadır (yalnız formata uyğundur) və GitHub
// prefiksləri yenə parçalanmış şəkildə qurulur — bax `GH`.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Fikstür hissələrini birləşdirir.
 *
 * 🔴 NİYƏ PARÇALANIR: bu fayl commit olunan kimi auditin ÖZÜ onu tarixçədə
 * skan edir. «Tapılmalı» nümunələr bütöv yazılsaydı, növbəti audit öz test
 * datasını sirr sayıb 7 saxta tapıntı verərdi (və əsl tapıntı onların içində
 * itərdi). Parçalanmış halda şablon MƏNBƏ MƏTNİNƏ uyğun gəlmir, işlədildikdə
 * yaranan sətir isə tam uyğundur — yəni yoxlama həqiqi qalır.
 */
const split = (...parts) => parts.join("");

const SELF_TEST_CONTENT = [
  // [mətn, gözlənilir tapılsın?] — «tokenlər» uydurmadır, yalnız formata uyğundur
  [split('AUTH_SECRET', '="Kq8vN2pLxR7wZ4mT6yB1cV3nH5jF9dG0sA2eU4iO6kM="'), true],
  [split('NEXTAUTH_SECRET', "=aGVsbG90aGVyZXRoaXNpc2Fmb3J0eWNoYXJz"), true],
  [split('DATABASE_URL', '="postgresql://quclass:Tr0ub4dor@db.internal:5432/prod"'), true],
  [`token: "${GH}p_0123456789abcdefghijABCDEFGHIJ012345"`, true],
  [`token: "${GH}ithub_pat_11ABCDEFG0abcdefghij_KLMNOPQRSTUVWX"`, true],
  [`token: "${GH}o_0123456789abcdefghijABCDEFGHIJ"`, true],
  [split("aws: AKIA", "IOSFODNN7EXAMPLE"), true],
  [split("-----BEGIN RSA ", "PRIVATE KEY-----"), true],
  [split('key = "sk-', 'abcdefghij0123456789ABCDEFGHIJ"'), true],
  [split("Authorization: Bearer ", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"), true],

  // Ağ siyahı — bunlar tapıntı OLMAMALIDIR
  [`AUTH_SECRET="<npx auth secret ilə yarat>"`, false],
  [`AUTH_SECRET="dəyişdirin — \`npx auth secret\` ilə yaradın"`, false],
  [`echo 'AUTH_SECRET="'$(openssl rand -base64 32)'"' >> .env`, false],
  [`DATABASE_URL="file:./dev.db"`, false],
  [`//   DATABASE_URL="postgresql://user:pass@host:5432/quclass"`, false],
  [`AUTH_SECRET=""`, false],
  [`const SEED_BCRYPT_SALT = "$2a$10$QUCLASSseedSalt1234567";`, false],
  [`parol: Test1234!`, false],
];

const SELF_TEST_PATHS = [
  [".env", true],
  [".env.local", true],
  [".env.production", true],
  ["prisma/dev.db", true],
  ["prisma/dev.db-journal", true],
  ["data/app.sqlite3", true],
  ["public/uploads/avatar.png", true],
  ["public/swagger/swagger-ui.css", true],
  ["test-results/report.json", true],
  ["playwright-report/index.html", true],
  [".next/build-manifest.json", true],
  ["node_modules/react/index.js", true],
  ["tsconfig.tsbuildinfo", true],
  ["certs/server.pem", true],
  ["secrets/id_rsa", true],
  [".DS_Store", true],
  // İcazəli
  [".env.example", false],
  ["src/app/page.tsx", false],
  ["prisma/migrations/20260729_init/migration.sql", false],
  ["docs/git-audit-report.md", false],
];

function selfTest() {
  let failed = 0;

  const check = (label, ok, detail) => {
    if (!ok) failed += 1;
    console.log(`${ok ? "  ✓" : "  ✗"} ${label}${detail ? `  — ${detail}` : ""}`);
  };

  console.log("Məzmun qaydaları:");
  for (const [text, shouldFire] of SELF_TEST_CONTENT) {
    let fired = null;
    for (const rule of CONTENT_RULES) {
      rule.re.lastIndex = 0;
      const match = rule.re.exec(text);
      if (!match) continue;
      const value = (rule.pick ?? pickToken)(match);
      if (allowlistReason(value)) continue;
      fired = `${rule.label} → ${mask(value)}`;
      break;
    }
    const preview = text.length > 46 ? `${text.slice(0, 46)}…` : text;
    check(
      `${shouldFire ? "tapılmalı" : "buraxılmalı"}: ${preview}`,
      Boolean(fired) === shouldFire,
      fired ?? "tapıntı yoxdur",
    );
  }

  console.log("Qadağan yollar:");
  for (const [filepath, shouldFire] of SELF_TEST_PATHS) {
    const rule = FORBIDDEN_PATHS.find((r) => r.test(filepath));
    check(
      `${shouldFire ? "qadağan" : "icazəli"}: ${filepath}`,
      Boolean(rule) === shouldFire,
      rule?.label ?? "uyğunluq yoxdur",
    );
  }

  console.log("");
  if (failed > 0) {
    console.log(`✗ ÖZ-YOXLAMA UĞURSUZ — ${failed} qayda gözlənildiyi kimi işləmir.`);
    console.log("  Skaner etibarsızdır: «0 tapıntı» nəticəsinə GÜVƏNMƏ.");
    process.exitCode = 1;
    return;
  }
  console.log(
    `✓ Öz-yoxlama təmiz — ${SELF_TEST_CONTENT.length} məzmun + ${SELF_TEST_PATHS.length} yol fikstürü.`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    return;
  }

  const started = Date.now();
  const cache = {};

  // 1) TAM tarixçə — `depth: Infinity`, yəni kəsilmə yoxdur.
  const commits = await git.log({ ...repo, depth: Infinity });
  if (commits.length === 0) throw new Error("Tarixçə boşdur — commit yoxdur.");

  console.log(`Tarixçə: ${commits.length} commit (${commits.at(-1).oid.slice(0, 7)} … ${commits[0].oid.slice(0, 7)})`);

  const { pathCommits, blobs } = await collectHistory(commits, cache);
  console.log(`Ağac gəzintisi: ${pathCommits.size} unikal yol, ${blobs.size} unikal blob.`);

  const findings = [];

  // 2) Qadağan yollar — tarixçənin İSTƏNİLƏN nöqtəsində
  for (const [filepath, commitSet] of pathCommits) {
    for (const rule of FORBIDDEN_PATHS) {
      if (!rule.test(filepath)) continue;
      findings.push({
        severity: "BLOCK",
        kind: "qadağan yol",
        filepath,
        commits: shortOids(commitSet),
        detail: `${rule.label} — ${commitSet.size} commit-də mövcuddur`,
      });
      break;
    }
  }

  // 3) Məzmun skanı — yalnız <1MB mətn blobları
  for (const [oid, info] of blobs) {
    const representative = [...info.paths][0];
    if (!isScannableText(representative, info.buffer)) continue;

    const text = info.buffer.toString("utf8");
    for (const rule of CONTENT_RULES) {
      rule.re.lastIndex = 0;
      let match;
      while ((match = rule.re.exec(text)) !== null) {
        const value = (rule.pick ?? pickToken)(match);
        const reason = allowlistReason(value);
        if (reason) continue;

        const paths = [...info.paths];
        const commitSet = new Set();
        for (const p of paths) {
          for (const c of pathCommits.get(p) ?? []) commitSet.add(c);
        }

        findings.push({
          severity: "BLOCK",
          kind: "sirr (məzmun)",
          filepath: paths.join(", "),
          commits: shortOids(commitSet),
          detail: `${rule.label} — dəyər \`${mask(value)}\` (blob ${oid.slice(0, 7)})`,
        });
        break; // hər blob üçün qaydaya bir tapıntı kifayətdir
      }
    }
  }

  // 4) Ölçü
  const largest = [...blobs.entries()]
    .map(([, info]) => ({ size: info.size, path: [...info.paths][0] }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  for (const [, info] of blobs) {
    if (info.size <= SIZE_WARN) continue;
    const filepath = [...info.paths][0];
    findings.push({
      severity: info.size > SIZE_BLOCK ? "BLOCK" : "WARN",
      kind: "ölçü",
      filepath,
      commits: "—",
      detail:
        info.size > SIZE_BLOCK
          ? `${formatBytes(info.size)} — GitHub hard limitini (${SIZE_BLOCK / MB} MB) AŞIR, push rədd olunacaq`
          : `${formatBytes(info.size)} — GitHub xəbərdarlıq həddindən (${SIZE_WARN / MB} MB) böyük`,
    });
  }

  // 5) `.gitignore` uyğunluğu (indeks ↔ ignore qaydaları)
  const tracked = await git.listFiles({ ...repo });
  const ignoredButTracked = [];
  for (const filepath of tracked) {
    const ignored = await git.isIgnored({ ...repo, filepath });
    if (ignored) ignoredButTracked.push(filepath);
  }
  for (const filepath of ignoredButTracked) {
    findings.push({
      severity: "WARN",
      kind: "ignore uyğunsuzluğu",
      filepath,
      commits: "—",
      detail: "indeksdə izlənir, amma `.gitignore` qaydasına düşür",
    });
  }

  // Tərsinə: bunlar İZLƏNMƏLİDİR
  const migrationFiles = tracked.filter((f) => f.startsWith("prisma/migrations/"));
  const envExampleTracked = tracked.includes(".env.example");
  if (migrationFiles.length === 0) {
    findings.push({
      severity: "BLOCK",
      kind: "çatışmayan fayl",
      filepath: "prisma/migrations/",
      commits: "—",
      detail: "izlənmir — klon edən şəxs bazanı qura bilməz",
    });
  }
  if (!envExampleTracked) {
    findings.push({
      severity: "BLOCK",
      kind: "çatışmayan fayl",
      filepath: ".env.example",
      commits: "—",
      detail: "izlənmir — hansı mühit dəyişənlərinin lazım olduğu sənədsiz qalır",
    });
  }

  // 6) Müəllif auditi
  const authorMap = new Map();
  const committerMap = new Map();
  const tally = (map, ident) => {
    const key = `${ident.name} ${ident.email}`;
    if (!map.has(key)) map.set(key, { name: ident.name, email: ident.email, count: 0 });
    map.get(key).count += 1;
  };
  for (const entry of commits) {
    tally(authorMap, entry.commit.author);
    tally(committerMap, entry.commit.committer);
  }
  const authors = [...authorMap.values()].sort((a, b) => b.count - a.count);
  const committers = [...committerMap.values()].sort((a, b) => b.count - a.count);

  const PLACEHOLDER_IDENT =
    /^$|example\.com|localhost|noreply|user@|test@|your[-_.]|change[-_]?me|unknown/i;

  for (const ident of [...authors, ...committers]) {
    if (!ident.email || PLACEHOLDER_IDENT.test(ident.email) || !ident.name) {
      findings.push({
        severity: "BLOCK",
        kind: "müəllif kimliyi",
        filepath: "(commit metadatası)",
        commits: `${ident.count} commit`,
        detail: `placeholder / boş kimlik: \`${ident.name || "(ad yoxdur)"}\` <\`${ident.email || "(e-poçt yoxdur)"}\`> — T33`,
      });
    }
  }
  if (authorMap.size > 1) {
    findings.push({
      severity: "WARN",
      kind: "müəllif kimliyi",
      filepath: "(commit metadatası)",
      commits: `${commits.length} commit`,
      detail: `${authorMap.size} fərqli author kimliyi — töhfə qrafiki bölünür (T33)`,
    });
  }

  // ── Hesabat ────────────────────────────────────────────────────────────────
  const generatedAt = new Date(started).toISOString();
  const report = renderReport({
    commits,
    findings,
    largest,
    authors,
    committers,
    trackedCount: tracked.length,
    ignoredButTracked,
    migrationFiles,
    envExampleTracked,
    blobCount: blobs.size,
    pathCount: pathCommits.size,
    generatedAt,
  });

  await fsp.mkdir(path.join(REPO_ROOT, "docs"), { recursive: true });
  await fsp.writeFile(path.join(REPO_ROOT, REPORT_REL), report, "utf8");

  // ── Konsol xülasəsi ────────────────────────────────────────────────────────
  const blocking = findings.filter((f) => f.severity === "BLOCK");
  const warnings = findings.filter((f) => f.severity === "WARN");

  console.log("");
  console.log("┌─ AUDİT XÜLASƏSİ ────────────────────────────────────────────");
  console.log(`│ commit           ${commits.length}`);
  console.log(`│ unikal yol       ${pathCommits.size}`);
  console.log(`│ unikal blob      ${blobs.size}`);
  console.log(`│ izlənən fayl     ${tracked.length}`);
  console.log(`│ ən böyük blob    ${formatBytes(largest[0]?.size ?? 0)}  ${largest[0]?.path ?? "—"}`);
  console.log(`│ migrations       ${migrationFiles.length} fayl ${migrationFiles.length ? "✓" : "✗"}`);
  console.log(`│ .env.example     ${envExampleTracked ? "izlənir ✓" : "izlənmir ✗"}`);
  console.log(`│ müəllif kimliyi  ${authors.map((a) => `${a.name} <${a.email}> ×${a.count}`).join(" | ")}`);
  console.log(`│ 🔴 blok          ${blocking.length}`);
  console.log(`│ ⚠️  xəbərdarlıq   ${warnings.length}`);
  console.log("└─────────────────────────────────────────────────────────────");

  if (findings.length > 0) {
    console.log("");
    for (const f of findings) {
      const badge = f.severity === "BLOCK" ? "🔴" : "⚠️ ";
      console.log(`${badge} [${f.kind}] ${f.filepath}\n     ${f.detail}\n     commit: ${f.commits}`);
    }
  }

  console.log("");
  console.log(`Hesabat: ${REPORT_REL}  (${Date.now() - started} ms)`);

  if (findings.length > 0) {
    console.log("");
    console.log("🔴 TAPINTI VAR — PUSH ETMƏ. Əvvəlcə tarixçəni təmizlə, sonra auditi təkrar işlət.");
    process.exitCode = 1;
  } else {
    console.log("✓ Tapıntı yoxdur — tarixçə push üçün təmizdir.");
  }
}

main().catch((error) => {
  console.error(`✗ ${error.name}: ${error.message}`);
  process.exitCode = 1;
});
