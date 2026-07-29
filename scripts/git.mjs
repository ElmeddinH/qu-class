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
//
// ⚠️ `http` modulu import EDİLMİR — push/clone bizə lazım deyil, paketin
// şəbəkə hissəsini yükləmək artıq ölçü/asılılıqdır.
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

  if (fileSet.size === 0) {
    throw new Error("Stage ediləcək fayl tapılmadı (hamısı .gitignore ilə xaric olundu?).");
  }

  for (const file of fileSet) {
    await git.add({ fs, dir: REPO_ROOT, filepath: file });
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

  console.log(`✓ ${oid.slice(0, 7)}  ${flags.message}  (${fileSet.size} fayl)`);
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
    default:
      console.error("İstifadə: node scripts/git.mjs <init|commit|log> ...");
      process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exitCode = 1;
});
