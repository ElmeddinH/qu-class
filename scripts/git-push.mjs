#!/usr/bin/env node
// ============================================================================
// scripts/git-push.mjs — lokal tarixçəni GitHub-a göndərir
//
// 🔴 SIRA POZULMUR: AUDİT → PUSH. Skript başlamazdan əvvəl `git-audit.mjs`-i
// AYRI PROSES kimi işlədir və tapıntı varsa şəbəkəyə ÇIXMADAN dayanır.
// Səbəb: push GERİ QAYTARILA BİLMƏZ. GitHub silinmiş obyektləri bir müddət
// saxlayır, fork/keş isə əbədi qala bilər — «sonra force-push edərəm» BƏRPA
// DEYİL. Sızmış sirr push olunubsa yeganə düzgün cavab dəyəri ROTASİYA
// ETMƏKDİR.
//
// 🔴 TOKEN YALNIZ MÜHİT DƏYİŞƏNİNDƏN (`GITHUB_TOKEN`) oxunur. Fayla yazılmır,
// konsola çap edilmir, `.env`-ə əlavə edilmir, default dəyəri yoxdur və
// REMOTE URL-İNƏ QOYULMUR. Sonuncu ən vacib maddədir: `https://<token>@github
// .com/...` şəklində yazılsa token `.git/config`-də AÇIQ MƏTNLƏ qalar və
// repo qovluğunu görən hər kəs (backup, sync, ekran paylaşımı) onu oxuyar.
// Autentifikasiya yalnız `onAuth` callback-i ilə, yaddaşda baş verir.
//
// İstifadə (token bash tarixçəsinə düşmür — `read -rs`):
//   read -rsp "PAT: " GITHUB_TOKEN && export GITHUB_TOKEN \
//     GITHUB_REPO=owner/qu-class && npm run git:push; unset GITHUB_TOKEN
// ============================================================================

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import git from "isomorphic-git";

import { REPO_ROOT, repo } from "./git-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIT_SCRIPT = path.join(__dirname, "git-audit.mjs");

// GitHub sahib adı: hərf/rəqəm + defis, ≤39 simvol. Repo adı: hərf/rəqəm . _ -
const REPO_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/;

/**
 * Çap ediləcək İSTƏNİLƏN mətndən tokeni silir.
 *
 * ⚠️ Xəta mesajları kitabxananın içindən gəlir — nə yazacaqlarına biz nəzarət
 * etmirik. Bir gün URL və ya başlıq mesaja düşsə token loga axar; bu funksiya
 * həmin ehtimalı bağlayır.
 */
function redact(text, token) {
  const value = String(text ?? "");
  return token ? value.split(token).join("****") : value;
}

/** Audit təmiz deyilsə şəbəkəyə ÇIXMADAN dayanır. */
function runAuditGate() {
  console.log("── Audit (push-dan əvvəl məcburi) ──────────────────────────");
  const result = spawnSync(process.execPath, [AUDIT_SCRIPT], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });

  if (result.error) {
    throw new Error(`Audit işə salına bilmədi: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      "Audit tapıntı verdi (və ya uğursuz oldu) — PUSH DAYANDIRILDI.\n" +
        "  Tarixçəni təmizlə, `npm run git:audit` sıfır tapıntı göstərsin, sonra təkrar cəhd et.",
    );
  }
  console.log("────────────────────────────────────────────────────────────\n");
}

async function main() {
  // ── 1) Giriş dəyərləri ─────────────────────────────────────────────────────
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error(
      "✗ GITHUB_TOKEN mühit dəyişəni boşdur.\n\n" +
        "  Token ƏMR SƏTRİNDƏ verilmir (`ps` çıxışında və bash tarixçəsində qalar).\n" +
        "  Düzgün forma — token yalnız həmin prosesin mühitinə düşür:\n\n" +
        '    read -rsp "PAT: " GITHUB_TOKEN && export GITHUB_TOKEN \\\n' +
        "      GITHUB_REPO=owner/qu-class && npm run git:push; unset GITHUB_TOKEN\n\n" +
        "  PAT icazələri (T35): classic → `repo` scope; fine-grained → məhz bu repo\n" +
        "  seçilmiş + Contents: Read and write.",
    );
    process.exit(1);
  }

  const repoSlug = process.env.GITHUB_REPO;
  if (!repoSlug || !REPO_PATTERN.test(repoSlug)) {
    console.error(
      `✗ GITHUB_REPO "owner/name" formatında olmalıdır (alınan: ${repoSlug ?? "(boş)"}).\n` +
        "  Nümunə: GITHUB_REPO=elmeddin/qu-class  — sonunda `.git` YAZMA, URL də verilmir.",
    );
    process.exit(1);
  }

  // ── 2) Audit qapısı ────────────────────────────────────────────────────────
  runAuditGate();

  // ── 3) Branch — GitHub default-u `main` ────────────────────────────────────
  // Uzaqda `master` qalsa GitHub default branch-ı BOŞ görünür və klonlayan
  // adam boş səhifə ilə qarşılaşır. Adı yerində düzəldirik.
  let branch = await git.currentBranch({ ...repo, fullname: false });
  if (!branch) throw new Error("HEAD heç bir branch-ə bağlı deyil (detached HEAD?).");

  if (branch === "master") {
    await git.renameBranch({ ...repo, ref: "main", oldref: "master" });
    branch = "main";
    console.log("• branch adı dəyişdirildi: master → main");
  }
  if (branch !== "main") {
    throw new Error(
      `Cari branch "${branch}" — gözlənilən "main". Push əl ilə yoxlanmalıdır.`,
    );
  }

  // ── 4) Remote — URL-də TOKEN YOXDUR ────────────────────────────────────────
  const url = `https://github.com/${repoSlug}.git`;
  await git.addRemote({ ...repo, remote: "origin", url, force: true });

  const commits = await git.log({ ...repo, depth: Infinity });
  const localOid = await git.resolveRef({ ...repo, ref: "main" });

  console.log(`→ ${url}`);
  console.log(`  branch: ${branch}   commit: ${commits.length}   lokal HEAD: ${localOid.slice(0, 7)}`);
  console.log("");

  // ⚠️ Yol UZANTISIZ olmalıdır. Paketin `exports` xəritəsində açar məhz
  // `./http/node`-dur; `./http/node/index.js` TƏYİN OLUNMAYIB və Node
  // `ERR_PACKAGE_PATH_NOT_EXPORTED` verir (fayl diskdə mövcud olsa belə).
  // Bu, bir dəfə düzəldilib — bax commit e6251de.
  const { default: http } = await import("isomorphic-git/http/node");

  // ⚠️ `onAuthFailure` OLMADAN isomorphic-git eyni etimadnamə ilə TƏKRAR-TƏKRAR
  // cəhd edir (sonsuz döngə). `cancel: true` ilk 401-də dayandırır.
  const auth = {
    onAuth: () => ({ username: "x-access-token", password: process.env.GITHUB_TOKEN }),
    onAuthFailure: () => ({ cancel: true }),
  };

  // ── 5) Push — `force` HEÇ VAXT true deyil ──────────────────────────────────
  let lastPhase = "";
  const result = await git.push({
    ...repo,
    http,
    remote: "origin",
    ref: "main",
    remoteRef: "main",
    force: false,
    ...auth,
    onProgress: ({ phase, loaded, total }) => {
      if (phase === lastPhase) return;
      lastPhase = phase;
      console.log(`  ${phase}${total ? ` (${loaded}/${total})` : ""}`);
    },
    onMessage: (message) => process.stdout.write(`  ${redact(message, token)}`),
  });

  if (result?.ok === false || result?.error) {
    throw new Error(`push rədd edildi: ${redact(result.error ?? "naməlum səbəb", token)}`);
  }

  // ── 6) TƏSDİQ — uzaq ref-i OXUYUB müqayisə et ──────────────────────────────
  // «Xəta atılmadı» kifayət deyil: uzaqda nəyin yazıldığını uzaqdan soruşuruq.
  const serverRefs = await git.listServerRefs({
    http,
    url,
    prefix: "refs/heads/",
    ...auth,
  });

  const remoteMain = serverRefs.find((ref) => ref.ref === "refs/heads/main");
  if (!remoteMain) {
    throw new Error(
      `Uzaqda "refs/heads/main" tapılmadı. Görünən ref-lər: ${
        serverRefs.map((r) => r.ref).join(", ") || "(heç biri)"
      }`,
    );
  }
  if (remoteMain.oid !== localOid) {
    throw new Error(
      `TƏSDİQ UĞURSUZ — uzaq main ${remoteMain.oid.slice(0, 7)}, lokal main ${localOid.slice(0, 7)}.`,
    );
  }

  console.log("");
  console.log("┌─ PUSH TAMAMLANDI ──────────────────────────────────────────");
  console.log(`│ repo        https://github.com/${repoSlug}`);
  console.log(`│ branch      ${branch}`);
  console.log(`│ commit      ${commits.length}`);
  console.log(`│ uzaq HEAD   ${remoteMain.oid}`);
  console.log(`│ təsdiq      uzaq main == lokal main ✓ (listServerRefs)`);
  console.log("└────────────────────────────────────────────────────────────");
}

const AUTH_HINT =
  "\n  T35 — bu, İCAZƏ problemidir, kod problemi deyil:\n" +
  "    · PAT-ın bitmə tarixi keçib, yaxud səhv/natamam kopyalanıb;\n" +
  "    · classic PAT-da `repo` scope işarələnməyib;\n" +
  "    · fine-grained PAT-da MƏHZ bu repo seçilməyib və ya\n" +
  "      Contents icazəsi «Read and write» deyil.";

const PROTECTION_HINT =
  "\n  T36 — GitHub `push protection`: tarixçədə REAL sirr aşkarlanıb.\n" +
  "  🔴 BYPASS LİNKİNƏ BASMA. `npm run git:audit` işlət, sirri tarixçədən çıxar\n" +
  "  və dəyəri ROTASİYA ET — cəhd zamanı o dəyər artıq şəbəkəyə çıxdı.";

main().catch((error) => {
  const token = process.env.GITHUB_TOKEN;
  // ⚠️ Xəta OBYEKTİ bütöv çap edilmir — `data` sahəsində sorğu başlıqları
  // (yəni `Authorization`) və ya xam cavab gövdəsi ola bilər.
  console.error(`\n✗ ${error.name}: ${redact(error.message, token)}`);

  const status = error?.data?.statusCode;

  if (error.name === "UserCanceledError") {
    // ⚠️ TƏRCÜMƏ ŞƏRTDİR. `onAuthFailure: () => ({ cancel: true })` təkrar 401-də
    // `UserCanceledError("The operation was canceled.")` atır — yəni əsl səbəb
    // (token qəbul edilmədi) mesajda HEÇ GÖRÜNMÜR. Bu callback olmasa isə
    // kitabxana eyni etimadnamə ilə sonsuz döngəyə düşür; yəni düzgün seçim
    // «cancel + izahlı mesaj»dır.
    console.error(
      "\n  Mənası: GitHub etimadnaməni RƏDD ETDİ (401 iki dəfə) və təkrar\n" +
        "  cəhd `onAuthFailure` ilə dayandırıldı — token yanlış və ya icazəsizdir." +
        AUTH_HINT,
    );
  } else if (status === 401) {
    console.error(AUTH_HINT);
  } else if (status === 403) {
    console.error(`${PROTECTION_HINT}\n  403 həm də «token bu repoya yaza bilmir» ola bilər — bax T35.`);
  } else if (status === 404) {
    console.error(
      "\n  404 — repo yoxdur, YAXUD token onu görmür. GITHUB_REPO dəyərini və\n" +
        "  PAT-ın repo seçimini yoxla (private repo üçün token icazəsi vacibdir).",
    );
  } else if (error.name === "GitPushError") {
    // Ref-ə görə səbəblər `data.result.refs`-dədir — HTTP statusu 200 olur.
    const refs = error?.data?.result?.refs ?? {};
    for (const [ref, info] of Object.entries(refs)) {
      if (!info?.ok) console.error(`  ${ref}: ${redact(info?.error ?? "naməlum", token)}`);
    }
    const detail = redact(error.message, token);
    if (/GH0\d{2}|push protection|secret scanning|rule violation/i.test(detail)) {
      console.error(PROTECTION_HINT);
    } else {
      console.error(
        "\n  T34 — uzaq repo BOŞ yaradılmalı idi (README / .gitignore / lisenziya\n" +
          "  SEÇİLMƏDƏN). Uzaqda bizim tarixçədə olmayan commit var, ona görə push\n" +
          "  `non-fast-forward` sayılır.\n" +
          "  🔴 `--force` İŞLƏTMƏ — o commit-i həmişəlik silər. Boş repo yarat və təkrar cəhd et.",
      );
    }
  }

  process.exitCode = 1;
});
