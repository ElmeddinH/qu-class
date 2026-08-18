#!/usr/bin/env node
// ============================================================================
// scripts/git.mjs
// Sistemdə `git` binarı YOXDUR (bax CLAUDE.md — bu, Blok 7B-nin qeydli
// istisnasıdır). `isomorphic-git` saf JavaScript-dir və standart `.git`
// qovluğu yazır — nəticə real `git log` / `git clone` ilə TAM UYĞUNDUR,
// yalnız yaratma vasitəsi fərqlidir.
//
// Əmrlər:
//   node scripts/git.mjs init
//   node scripts/git.mjs commit -m "mesaj" -d "2026-07-26T10:00:00" [-- yol1 yol2 ...]
//   node scripts/git.mjs log
//   node scripts/git.mjs push --url https://github.com/<user>/<repo>.git
//
// 🔴 TOKEN ƏMR SƏTRİNDƏ VERİLMİR — `GITHUB_TOKEN` MÜHİT DƏYİŞƏNİNDƏN oxunur.
// Səbəb: əmr sətri `ps` çıxışında və bash tarixçəsində qalır, yəni token
// maşındakı hər prosesə görünərdi. `GITHUB_TOKEN=... node scripts/git.mjs push`
// şəklində verilən dəyər isə yalnız həmin prosesin mühitindədir.
//
// ⚠️ `isomorphic-git/http/node` YALNIZ `push` əmrində, TƏNBƏL (`await import`)
// yüklənir: `init`/`commit`/`log` şəbəkəyə çıxmır və onların yolunda bu modul
// ümumiyyətlə qiymətləndirilmir.
// ⚠️ `author.timestamp` SANİYƏLƏ verilir. Vermə sən (ISO sətri) — `-d`
// bayrağı ilə açıq tarix göndərilməsə bütün commit-lər "indi" anına düşər və
// tarixçə "bir dəqiqədə N commit" kimi görünər (iş axınını əks etdirmir).
// ============================================================================

import fsp from "node:fs/promises";
import path from "node:path";

import git from "isomorphic-git";
import ignoreLib from "ignore";

// `fs` / `REPO_ROOT` / `DEFAULT_AUTHOR` ORTAQ konfiqdən gəlir — `git-audit.mjs`
// və `git-push.mjs` eyni dəyərləri işlədir (bax `scripts/git-config.mjs`).
import { fs, REPO_ROOT, DEFAULT_AUTHOR } from "./git-config.mjs";

function parseFlags(argv) {
  const flags = {};
  const positional = [];
  let sawSeparator = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--") {
      sawSeparator = true;
      continue;
    }
    if (sawSeparator) {
      positional.push(arg);
      continue;
    }

    if (arg === "-m" || arg === "--message") {
      flags.message = argv[++i];
    } else if (arg === "-d" || arg === "--date") {
      flags.date = argv[++i];
    } else if (arg === "--author-name") {
      flags.authorName = argv[++i];
    } else if (arg === "--author-email") {
      flags.authorEmail = argv[++i];
    } else if (arg === "--url") {
      flags.url = argv[++i];
    } else if (arg === "--force") {
      flags.force = true;
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

/**
 * Tokeni tapır: `GITHUB_TOKEN` → `GH_TOKEN` → `.env.local`.
 *
 * 🔴 `.env.local` `.gitignore`-dakı `.env*` qaydası ilə örtülür (`!.env.example`
 * istisnadır) — yəni token repoya düşmür. Fayl YALNIZ oxunur, ora heç nə yazılmır.
 */
async function loadToken() {
  const fromEnv = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (fromEnv) return fromEnv.trim();

  const content = await fsp
    .readFile(path.join(REPO_ROOT, ".env.local"), "utf8")
    .catch((error) => {
      if (error.code === "ENOENT") return "";
      throw error;
    });

  for (const line of content.split("\n")) {
    const match = /^\s*(?:export\s+)?(GITHUB_TOKEN|GH_TOKEN)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;

    // Dırnaqlar və sətir sonu şərhi təmizlənir.
    const value = match[2].trim().replace(/^(['"])(.*)\1$/, "$2").trim();
    if (value) return value;
  }

  return "";
}

/** `.env.local`-dan (və ya mühitdən) remote ünvanı — token URL-ə HEÇ VAXT qoşulmur. */
async function loadRemoteUrlFromEnv() {
  if (process.env.GIT_REMOTE_URL) return process.env.GIT_REMOTE_URL.trim();

  const content = await fsp
    .readFile(path.join(REPO_ROOT, ".env.local"), "utf8")
    .catch(() => "");

  const match = /^\s*(?:export\s+)?GIT_REMOTE_URL\s*=\s*(.*)$/m.exec(content);
  if (!match) return "";

  return match[1].trim().replace(/^(['"])(.*)\1$/, "$2").trim();
}

/**
 * 🔴 TƏLƏ A — token log-a düşməməlidir.
 *
 * isomorphic-git xətaları BƏZƏN tam URL-i qaytarır və `https://tok@host` forması
 * tokeni ekrana çıxarardı. İki qat təmizlik: (1) URL-dəki etimadnamə hissəsi,
 * (2) tokenin özü — çünki o, URL-dən kənarda da (məs. başlıqda) görünə bilər.
 */
function redact(message, token) {
  const value = String(message ?? "").replace(/(https:\/\/)[^@\s/]+@/g, "$1***@");
  return token ? value.split(token).join("***") : value;
}

/** `.gitignore`-i oxuyub `ignore()` matcher qurur. `.git`-in özü HƏMİŞƏ xaric. */
async function loadIgnoreMatcher() {
  const matcher = ignoreLib();
  matcher.add(".git");

  const gitignorePath = path.join(REPO_ROOT, ".gitignore");
  try {
    const content = await fsp.readFile(gitignorePath, "utf8");
    matcher.add(content);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  return matcher;
}

/** Verilmiş yol (fayl və ya qovluq) altındakı BÜTÜN qeyri-ignore faylları toplayır. */
async function collectFiles(target, matcher) {
  const absolute = path.resolve(REPO_ROOT, target);
  const relative = path.relative(REPO_ROOT, absolute).split(path.sep).join("/");

  if (relative === "" || relative.startsWith("..")) {
    throw new Error(`Repo kökündən kənar yol: ${target}`);
  }
  if (matcher.ignores(relative)) return [];

  const stat = await fsp.stat(absolute).catch(() => null);
  if (!stat) {
    console.warn(`⚠️  Yol tapılmadı, keçilir: ${target}`);
    return [];
  }

  if (stat.isFile()) return [relative];

  const entries = await fsp.readdir(absolute, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const childRel = `${relative}/${entry.name}`;
    if (matcher.ignores(childRel)) continue;

    if (entry.isDirectory()) {
      results.push(...(await collectFiles(childRel, matcher)));
    } else if (entry.isFile()) {
      results.push(childRel);
    }
  }

  return results;
}

/**
 * İndeksdə OLAN, amma diskdə ARTIQ OLMAYAN yolları tapır (silinmiş / KÖÇÜRÜLMÜŞ
 * fayllar).
 *
 * 🔴 NİYƏ LAZIMDIR: `git.add` yalnız MÖVCUD faylı yazır. Blok 10A-da
 * `features/events/manage/PrintButton.tsx` → `components/shared/PrintButton.tsx`
 * köçürüldü; köhnə yol indeksdə qaldığı üçün repo diskdə olmayan faylı
 * saxlayırdı (`git status` = «deleted», işçi ağac TƏMİZ DEYİL). `git.remove`
 * onu indeksdən çıxarır.
 *
 * Yalnız `--`-dan sonra verilən yolların ALTINDAKI sətirlərə baxılır — commit
 * əhatəsi genişlənmir.
 */
async function collectDeleted(targets) {
  const scopes = targets.map((target) =>
    path.relative(REPO_ROOT, path.resolve(REPO_ROOT, target)).split(path.sep).join("/"),
  );

  const tracked = await git.listFiles({ fs, dir: REPO_ROOT });
  const deleted = [];

  for (const file of tracked) {
    const inScope = scopes.some((scope) => file === scope || file.startsWith(`${scope}/`));
    if (!inScope) continue;

    if (!fs.existsSync(path.join(REPO_ROOT, file))) deleted.push(file);
  }

  return deleted;
}

async function cmdInit() {
  const gitDir = path.join(REPO_ROOT, ".git");
  if (fs.existsSync(gitDir)) {
    console.log(".git artıq mövcuddur — toxunulmadı.");
    return;
  }

  await git.init({ fs, dir: REPO_ROOT, defaultBranch: "main" });
  console.log(`Repo yaradıldı: ${REPO_ROOT}`);
}

async function cmdCommit(flags, positional) {
  if (!flags.message) throw new Error("`-m \"mesaj\"` tələb olunur.");
  if (positional.length === 0) {
    throw new Error("Ən azı bir fayl/qovluq yolu tələb olunur (`-- yol1 yol2 ...`).");
  }

  const matcher = await loadIgnoreMatcher();
  const fileSet = new Set();

  for (const target of positional) {
    const files = await collectFiles(target, matcher);
    for (const file of files) fileSet.add(file);
  }

  // Silinmiş / köçürülmüş fayllar — bax `collectDeleted`.
  const deleted = await collectDeleted(positional);

  if (fileSet.size === 0 && deleted.length === 0) {
    throw new Error("Stage ediləcək fayl tapılmadı (hamısı .gitignore ilə xaric olundu?).");
  }

  for (const file of fileSet) {
    await git.add({ fs, dir: REPO_ROOT, filepath: file });
  }

  for (const file of deleted) {
    await git.remove({ fs, dir: REPO_ROOT, filepath: file });
    console.log(`− ${file}`);
  }

  const timestamp = flags.date
    ? Math.floor(new Date(flags.date).getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  if (flags.date && Number.isNaN(timestamp)) {
    throw new Error(`Xarab tarix: ${flags.date}`);
  }

  const author = {
    name: flags.authorName ?? DEFAULT_AUTHOR.name,
    email: flags.authorEmail ?? DEFAULT_AUTHOR.email,
    timestamp,
    timezoneOffset: 0,
  };

  const oid = await git.commit({
    fs,
    dir: REPO_ROOT,
    message: flags.message,
    author,
  });

  console.log(
    `✓ ${oid.slice(0, 7)}  ${flags.message}  ` +
      `(${fileSet.size} fayl${deleted.length > 0 ? `, ${deleted.length} silinmiş` : ""})`,
  );
}

async function cmdLog() {
  const commits = await git.log({ fs, dir: REPO_ROOT, depth: 200 });

  for (const entry of commits.reverse()) {
    const date = new Date(entry.commit.author.timestamp * 1000).toISOString();
    const firstLine = entry.commit.message.split("\n")[0];
    console.log(`${entry.oid.slice(0, 7)}  ${date}  ${firstLine}`);
  }

  console.log(`\n${commits.length} commit.`);
}

/**
 * `push` — commit-ləri uzaq repoya göndərir.
 *
 * Remote `.git/config`-də saxlanılır (`--url` bir dəfə verilir, sonrakı
 * çağırışlarda lazım deyil) — nəticə real `git remote add origin` ilə eynidir.
 *
 * ⚠️ SADƏ variantdır: audit qapısı və push-dan sonrakı təsdiq YOXDUR.
 * Əsl push üçün `npm run git:push` (`scripts/git-push.mjs`) işlət.
 */
async function cmdPush(flags) {
  const token = await loadToken();
  if (!token) {
    // 🔴 Uydurma yoxdur: token yoxdursa BİR sətir göstəriş verilir və dayanılır.
    throw new Error(
      "GITHUB_TOKEN=... və GIT_REMOTE_URL=https://github.com/<user>/<repo>.git " +
        "dəyərlərini .env.local-a əlavə edin, sonra `node scripts/git.mjs push`",
    );
  }

  const remotes = await git.listRemotes({ fs, dir: REPO_ROOT });
  const existing = remotes.find((r) => r.remote === "origin");

  let url = flags.url ?? existing?.url ?? (await loadRemoteUrlFromEnv());
  if (!url) {
    throw new Error(
      "GITHUB_TOKEN=... və GIT_REMOTE_URL=https://github.com/<user>/<repo>.git " +
        "dəyərlərini .env.local-a əlavə edin, sonra `node scripts/git.mjs push`",
    );
  }

  // 🔴 TƏLƏ B — `.git/config` gitignore-da DEYİL, yəni ora yazılan token repoya
  // düşərdi. Remote ünvanı həmişə etimadnaməsiz saxlanılır; token yalnız
  // runtime-da `onAuth` ilə verilir.
  const sanitized = url.replace(/^(https:\/\/)[^@\s/]+@/, "$1");
  if (sanitized !== url) {
    console.warn("⚠️  Remote URL-dəki etimadnamə çıxarıldı — `.git/config`-ə tokensiz yazılır.");
    url = sanitized;
  }

  if (!existing) {
    await git.addRemote({ fs, dir: REPO_ROOT, remote: "origin", url });
  } else if (url !== existing.url) {
    await git.deleteRemote({ fs, dir: REPO_ROOT, remote: "origin" });
    await git.addRemote({ fs, dir: REPO_ROOT, remote: "origin", url });
  }

  // Şəbəkə hissəsi yalnız BURADA yüklənir (bax faylın başlığı).
  // ⚠️ Yol UZANTISIZ olmalıdır: paketin `exports` xəritəsində açar məhz
  // `./http/node`-dur, `./http/node/index.js` isə TƏYİN OLUNMAYIB və Node
  // `ERR_PACKAGE_PATH_NOT_EXPORTED` verir (fayl diskdə mövcud olsa belə).
  const { default: http } = await import("isomorphic-git/http/node");

  const branch = (await git.currentBranch({ fs, dir: REPO_ROOT })) ?? "main";
  const commits = await git.log({ fs, dir: REPO_ROOT, depth: 500 });

  console.log(`→ ${url}  (${branch}, ${commits.length} commit)`);

  // GitHub PAT üçün iki qəbul olunan Basic-auth forması. Sıra ilə sınanır:
  // birincisi 401 versə, ikincisi ilə TƏKRAR cəhd olunur.
  const authVariants = [
    { label: "x-access-token", onAuth: () => ({ username: "x-access-token", password: token }) },
    { label: "token:x-oauth-basic", onAuth: () => ({ username: token, password: "x-oauth-basic" }) },
  ];

  let result;
  let lastError;

  for (const variant of authVariants) {
    try {
      result = await git.push({
        fs,
        http,
        dir: REPO_ROOT,
        remote: "origin",
        ref: branch,
        // 🔴 force HEÇ VAXT avtomatik deyil — yalnız açıq `--force` bayrağı ilə.
        force: Boolean(flags.force),
        ...variant,
        // ⚠️ `onAuthFailure` OLMADAN isomorphic-git eyni etimadnamə ilə sonsuz
        // təkrar edir — 401-də dərhal dayandırılır ki, növbəti varianta keçək.
        onAuthFailure: () => ({ cancel: true }),
        onMessage: (message) => process.stdout.write(`  ${redact(message, token)}`),
      });
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      console.warn(`  ⚠️  auth forması «${variant.label}» alınmadı, növbəti sınanır.`);
    }
  }

  if (lastError) {
    throw new Error(`autentifikasiya alınmadı: ${redact(lastError.message, token)}`);
  }

  // ⚠️ Rədd edilmiş push-da HTTP statusu 200 OLUR — səbəb `result.refs`
  // altındadır. Yalnız üst səviyyəyə baxsaq, uğursuz push «uğurlu» görünərdi.
  const rejected = Object.entries(result.refs ?? {}).filter(([, info]) => info?.ok === false);

  if (result.ok === false || result.error || rejected.length > 0) {
    const reason =
      result.error ?? rejected.map(([ref, info]) => `${ref}: ${info.error}`).join("; ");
    // 🔴 force ETMİRİK — səbəb yazılır, qərar istifadəçinindir.
    throw new Error(
      `push rədd edildi: ${redact(reason || "naməlum səbəb", token)}\n` +
        "  (force push edilmədi — tarixçə qorunur)",
    );
  }

  console.log(`✓ göndərildi → ${redact(url.replace(/\.git$/, ""), token)}  (${branch})`);
}

async function main() {
  const [, , command, ...rest] = process.argv;
  const { flags, positional } = parseFlags(rest);

  switch (command) {
    case "init":
      await cmdInit();
      break;
    case "commit":
      await cmdCommit(flags, positional);
      break;
    case "log":
      await cmdLog();
      break;
    case "push":
      await cmdPush(flags);
      break;
    default:
      console.error("İstifadə: node scripts/git.mjs <init|commit|log|push> ...");
      process.exitCode = 1;
  }
}

main().catch((error) => {
  // 🔴 TƏLƏ A — son müdafiə xətti: buraya çatan İSTƏNİLƏN mesaj (stack izi
  // daxil) tokendən və URL etimadnaməsindən təmizlənir.
  console.error(`✗ ${redact(error.message, process.env.GITHUB_TOKEN || process.env.GH_TOKEN)}`);
  process.exitCode = 1;
});
