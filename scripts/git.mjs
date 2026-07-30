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

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import git from "isomorphic-git";
import ignoreLib from "ignore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const DEFAULT_AUTHOR = {
  name: "Elmeddin Heydarov",
  email: "heydarovelmeddin2@gmail.com",
};

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
 */
async function cmdPush(flags) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN mühit dəyişəni boşdur. İstifadə:\n" +
        "  GITHUB_TOKEN=ghp_xxx node scripts/git.mjs push --url https://github.com/user/repo.git",
    );
  }

  const remotes = await git.listRemotes({ fs, dir: REPO_ROOT });
  const existing = remotes.find((r) => r.remote === "origin");

  let url = flags.url ?? existing?.url;
  if (!url) throw new Error("Remote ünvanı yoxdur — `--url https://github.com/user/repo.git` ver.");

  if (!existing) {
    await git.addRemote({ fs, dir: REPO_ROOT, remote: "origin", url });
  } else if (flags.url && flags.url !== existing.url) {
    await git.deleteRemote({ fs, dir: REPO_ROOT, remote: "origin" });
    await git.addRemote({ fs, dir: REPO_ROOT, remote: "origin", url: flags.url });
    url = flags.url;
  }

  // Şəbəkə hissəsi yalnız BURADA yüklənir (bax faylın başlığı).
  // ⚠️ Yol UZANTISIZ olmalıdır: paketin `exports` xəritəsində açar məhz
  // `./http/node`-dur, `./http/node/index.js` isə TƏYİN OLUNMAYIB və Node
  // `ERR_PACKAGE_PATH_NOT_EXPORTED` verir (fayl diskdə mövcud olsa belə).
  const { default: http } = await import("isomorphic-git/http/node");

  const branch = (await git.currentBranch({ fs, dir: REPO_ROOT })) ?? "main";
  const commits = await git.log({ fs, dir: REPO_ROOT, depth: 500 });

  console.log(`→ ${url}  (${branch}, ${commits.length} commit)`);

  const result = await git.push({
    fs,
    http,
    dir: REPO_ROOT,
    remote: "origin",
    ref: branch,
    force: Boolean(flags.force),
    // GitHub PAT: istifadəçi adı kimi token kifayətdir, parol boş qalır.
    onAuth: () => ({ username: token }),
    onMessage: (message) => process.stdout.write(`  ${message}`),
  });

  if (result.ok === false || result.error) {
    throw new Error(`push rədd edildi: ${result.error ?? "naməlum səbəb"}`);
  }

  console.log(`✓ göndərildi → ${url.replace(/\.git$/, "")}`);
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
  console.error(`✗ ${error.message}`);
  process.exitCode = 1;
});
