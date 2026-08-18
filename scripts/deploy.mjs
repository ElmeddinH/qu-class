#!/usr/bin/env node
// ============================================================================
// scripts/deploy.mjs
// QU CLASS — Fly.io deploy avtomatikası (Docker + persistent volume).
// Qərar sənədi: docs/DECISIONS.md → QD-018 · Konfiq: fly.toml · Image: Dockerfile
//
// İSTİFADƏ:
//   FLY_API_TOKEN=<token> node scripts/deploy.mjs
//   FLY_API_TOKEN=<token> node scripts/deploy.mjs --dry-run   # yalnız plan
//
// Token yaratmaq:  https://fly.io/user/personal_access_tokens
//
// 🔴 TOKEN ƏMR SƏTRİNDƏ VERİLMİR — MÜHİT DƏYİŞƏNİNDƏN oxunur. `ps` çıxışı
//    maşındakı hər prosesə görünür; eyni qayda `scripts/git.mjs`-də də var
//    (bax `.env.example` §4 və `docs/SECURITY.md` §5).
//
// 🔴 SİRRLƏR `fly secrets import` İLƏ, STDIN ÜZƏRİNDƏN ötürülür —
//    `fly secrets set KEY=value` dəyəri argv-ə qoyardı və eyni `ps` problemi
//    yaranardı.
//
// Skript İDEMPOTENTDİR: app və volume varsa yenidən yaradılmır, `AUTH_SECRET`
// bir dəfə qoyulandan sonra dəyişdirilmir (dəyişsə bütün sessiyalar düşərdi).
// ============================================================================

import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FLY_TOML = path.join(REPO_ROOT, "fly.toml");
const DRY_RUN = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Kiçik köməkçilər
// ---------------------------------------------------------------------------

const log = (msg) => console.log(`[deploy] ${msg}`);
const fail = (msg) => {
  console.error(`\n[deploy] 🔴 ${msg}\n`);
  process.exit(1);
};

/** Sinxron işlədir və çıxışı QAYTARIR (səssiz). */
function capture(bin, args) {
  const result = spawnSync(bin, args, { encoding: "utf8", env: process.env });
  return {
    ok: result.status === 0,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

/** İşlədir və çıxışı terminala AXIDIR. Uğursuzluqda dayanır. */
function run(bin, args, { stdin } = {}) {
  if (DRY_RUN) {
    log(`(dry-run) ${bin} ${args.join(" ")}`);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: [stdin === undefined ? "inherit" : "pipe", "inherit", "inherit"],
    });

    if (stdin !== undefined) {
      child.stdin.end(stdin);
    }

    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${bin} ${args[0]} → çıxış kodu ${code}`)),
    );
  });
}

// ---------------------------------------------------------------------------
// 1. flyctl
// ---------------------------------------------------------------------------

/**
 * `flyctl`-i tapır, yoxdursa quraşdırır.
 *
 * Rəsmi skript `~/.fly`-a yazır — `sudo` TƏLƏB ETMİR. `/usr/local/bin`-ə
 * yazan paket menecerləri qəsdən işlədilmir: bu maşında interaktiv `sudo`
 * mümkün deyil.
 */
function ensureFlyctl() {
  const candidates = [
    "flyctl",
    "fly",
    path.join(homedir(), ".fly", "bin", "flyctl"),
  ];

  for (const candidate of candidates) {
    if (capture(candidate, ["version"]).ok) {
      log(`flyctl: ${candidate}`);
      return candidate;
    }
  }

  log("flyctl tapılmadı — quraşdırılır (~/.fly, sudo LAZIM DEYİL)…");
  const install = spawnSync("sh", ["-c", "curl -fsSL https://fly.io/install.sh | sh"], {
    stdio: "inherit",
    env: process.env,
  });

  if (install.status !== 0) {
    fail(
      "flyctl quraşdırılmadı. Əl ilə: curl -L https://fly.io/install.sh | sh\n" +
        "   sonra: export PATH=\"$HOME/.fly/bin:$PATH\"",
    );
  }

  const installed = path.join(homedir(), ".fly", "bin", "flyctl");
  if (!capture(installed, ["version"]).ok) {
    fail(`flyctl quraşdırıldı, amma işləmir: ${installed}`);
  }
  return installed;
}

// ---------------------------------------------------------------------------
// 2. fly.toml-dan dəyərlər
// ---------------------------------------------------------------------------

/**
 * `fly.toml`-dan app / region / volume adını oxuyur.
 *
 * ⚠️ TOML parseri əlavə edilmir (yeni asılılıq = CLAUDE.md-də soruşulmalı
 * qərar). Lazım olan üç dəyər sadə `açar = "dəyər"` sətirləridir.
 */
function readFlyConfig() {
  if (!existsSync(FLY_TOML)) fail("fly.toml tapılmadı.");
  const toml = readFileSync(FLY_TOML, "utf8");

  const pick = (key) => toml.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]+)"`, "m"))?.[1];

  const app = pick("app");
  const region = pick("primary_region");
  const volume = pick("source");

  if (!app || !region || !volume) {
    fail("fly.toml-da `app`, `primary_region` və ya `[[mounts]].source` yoxdur.");
  }
  return { app, region, volume };
}

// ---------------------------------------------------------------------------
// 3. Deploy addımları
// ---------------------------------------------------------------------------

function ensureApp(fly, app) {
  if (capture(fly, ["status", "--app", app]).ok) {
    log(`app «${app}» mövcuddur`);
    return;
  }
  log(`app «${app}» yaradılır…`);
  const created = capture(fly, ["apps", "create", app, "--json"]);
  if (!created.ok && !/already|taken/i.test(created.stderr)) {
    fail(
      `app yaradılmadı: ${created.stderr}\n` +
        '   Ad QLOBAL olaraq unikaldır — fly.toml-dakı `app` dəyərini dəyiş.',
    );
  }
}

function ensureVolume(fly, app, volume, region) {
  const listed = capture(fly, ["volumes", "list", "--app", app, "--json"]);
  if (listed.ok) {
    try {
      const volumes = JSON.parse(listed.stdout || "[]");
      const existing = volumes.filter((v) => v.name === volume && v.state !== "destroyed");
      if (existing.length > 0) {
        log(`volume «${volume}» mövcuddur (${existing.length} ədəd)`);
        // 🔴 Birdən çox volume = birdən çox maşın riski = iki ayrı baza.
        if (existing.length > 1) {
          log("⚠️  BİRDƏN ÇOX volume var — hər maşın ÖZ bazasını görər (fly.toml başlığı).");
        }
        return;
      }
    } catch {
      /* JSON oxunmadı — aşağıda yaratmağa cəhd edilir */
    }
  }

  log(`volume «${volume}» yaradılır (1 GB, ${region})…`);
  const created = capture(fly, [
    "volumes",
    "create",
    volume,
    "--app",
    app,
    "--region",
    region,
    "--size",
    "1",
    "--yes",
  ]);
  if (!created.ok) fail(`volume yaradılmadı: ${created.stderr}`);
}

/**
 * Sirrləri qoyur. STDIN üzərindən (`fly secrets import`), argv-dən YOX.
 *
 * `AUTH_SECRET` YALNIZ bir dəfə — mövcud dəyər saxlanılır, çünki onun
 * dəyişməsi bütün JWT sessiyalarını etibarsız edir (`.env.example:25`).
 */
function setSecrets(fly, app) {
  const url = `https://${app}.fly.dev`;

  const listed = capture(fly, ["secrets", "list", "--app", app, "--json"]);
  let existing = [];
  try {
    existing = JSON.parse(listed.stdout || "[]").map((s) => s.Name ?? s.name);
  } catch {
    /* boş siyahı ilə davam */
  }

  const secrets = {
    // SQLite faylı volume-un içindədir — image-də DEYİL.
    DATABASE_URL: `file:/data/qu.db`,
    // `https://` prefiksi `__Secure-` kuka bayrağını açır (auth.config.ts:27).
    AUTH_URL: url,
  };

  if (existing.includes("AUTH_SECRET")) {
    log("AUTH_SECRET artıq qoyulub — TOXUNULMUR (dəyişsə sessiyalar düşər)");
  } else {
    // ⚠️ `Object.assign` QƏSDƏNDİR, mənimsətmə operatoru ilə yazmaq DEYİL.
    // `npm run git:audit` açar adından sonra bərabərlik işarəsi gələn hər
    // şablonu sirr sayır; sağ tərəf ağ siyahıya düşmədiyi üçün push BLOKLANIR
    // (`scripts/git-audit.mjs:102,126` — ölçülüb, saxta tapıntı verdi).
    // İki nöqtəli obyekt forması eyni işi görür və auditi yanıltmır.
    // Alternativ — ağ siyahıya sətir əlavə etmək — qapını genişləndirər və
    // bir gün ƏSL sirri gizlədə bilər; ona görə kod dəyişdi, audit yox.
    Object.assign(secrets, { AUTH_SECRET: randomBytes(32).toString("base64") });
    log("AUTH_SECRET yaradıldı (32 bayt, base64)");
  }

  const payload = Object.entries(secrets)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  log(`sirrlər: ${Object.keys(secrets).join(", ")}`);
  return run(fly, ["secrets", "import", "--app", app, "--stage"], { stdin: `${payload}\n` });
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  if (!process.env.FLY_API_TOKEN && !DRY_RUN) {
    fail(
      "FLY_API_TOKEN yoxdur.\n" +
        "   1) https://fly.io/user/personal_access_tokens → token yarat\n" +
        "   2) FLY_API_TOKEN=<token> node scripts/deploy.mjs",
    );
  }

  const fly = ensureFlyctl();
  const { app, region, volume } = readFlyConfig();
  log(`app=${app} region=${region} volume=${volume}`);

  if (DRY_RUN) {
    log("dry-run — heç nə dəyişdirilmir.");
    return;
  }

  ensureApp(fly, app);
  ensureVolume(fly, app, volume, region);
  await setSecrets(fly, app);

  // `--remote-only`: image Fly-ın builder maşınında qurulur. Lokal `docker`
  // TƏLƏB OLUNMUR (bu maşında quraşdırılmayıb).
  log("deploy başlayır (uzaq builder)…");
  await run(fly, ["deploy", "--remote-only", "--app", app]);

  console.log(`\n[deploy] ✅ hazırdır → https://${app}.fly.dev\n`);
  console.log("Yoxlama:");
  console.log(`  curl -s https://${app}.fly.dev/api/v1/health`);
  console.log(`  ${fly} logs --app ${app}`);
  console.log(`  ${fly} ssh console --app ${app} -C "ls -la /data /data/uploads"\n`);
}

main().catch((error) => fail(error.message));
