// ============================================================================
// scripts/free-port.mjs
// `npm run dev`-dən ƏVVƏL (predev) işləyir: 3000 portunu tutan KÖHNƏ dev
// serverini dayandırır.
//
// Niyə lazımdır:
//   `next dev -p 3000` port AÇIQ şəkildə verildiyi üçün başqa porta KEÇMİR —
//   `EADDRINUSE` ilə dərhal sınır. VS Code F5-də bu o deməkdir ki, preLaunchTask
//   heç vaxt "Ready in ..." yazmır → VS Code sonsuz gözləyir → F5 basılır,
//   heç nə olmur. Belə "zombi" server debug sessiyası düzgün bağlanmayanda,
//   yaxud terminal `next dev`-in valideynini öldürüb uşaq prosesini saxlayanda
//   qalır (uşaq `next-server` adlanır, `next dev` deyil — pkill-dən yayınır).
//
// ⚠️ TƏHLÜKƏSİZLİK: yalnız komanda sətrində `next` keçən prosesləri öldürür.
// Portu başqa proqram tutubsa TOXUNMUR — sadəcə xəbərdarlıq yazır, çünki onu
// öldürmək istifadəçinin başqa işini itirə bilər.
//
// Heç bir halda sıfırdan fərqli kodla çıxmır: `predev` sınsa `npm run dev` də
// başlamazdı.
// ============================================================================

import { execFileSync } from "node:child_process";

const port = Number.parseInt(process.argv[2] ?? "3000", 10);

function run(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    // Alət yoxdur, yaxud nəticə boşdur (lsof/fuser bu halda 1 qaytarır).
    return null;
  }
}

/**
 * Portu dinləyən PID-lər.
 *
 * ⚠️ Üç alət ardıcıl sınanır, çünki heç biri hər mühitdə işləmir:
 * bəzi sandbox/konteynerlərdə `lsof` şəbəkə soketlərini ümumiyyətlə görmür
 * (boş nəticə qaytarır), `ss` isə işləyir. Yalnız birinə güvənsək skript
 * səssizcə heç nə etməz — məhz düzəltdiyimiz problem geri qayıdar.
 */
function pidsOnPort() {
  const found = new Set();

  // 1) ss — Linux-da ən etibarlısı: users:(("next-server (v1",pid=28449,fd=22))
  const ss = run("ss", ["-ltnpH", `sport = :${port}`]);
  if (ss) {
    for (const match of ss.matchAll(/pid=(\d+)/g)) found.add(Number(match[1]));
  }

  // 2) lsof — macOS və bir çox Linux quraşdırmasında
  if (found.size === 0) {
    const lsof = run("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"]);
    if (lsof) {
      for (const line of lsof.split("\n")) {
        const pid = Number(line.trim());
        if (Number.isInteger(pid) && pid > 0) found.add(pid);
      }
    }
  }

  // 3) fuser — çıxış formatı: "3000/tcp:            28449"
  if (found.size === 0) {
    const fuser = run("fuser", [`${port}/tcp`]);
    if (fuser) {
      for (const match of fuser.matchAll(/(\d+)/g)) {
        const pid = Number(match[1]);
        // "3000/tcp" hissəsindəki port nömrəsini PID kimi saymamaq üçün
        if (pid !== port) found.add(pid);
      }
    }
  }

  return [...found];
}

/** PID-in tam komanda sətri (tapılmasa boş sətir). */
function commandOf(pid) {
  return run("ps", ["-p", String(pid), "-o", "args="])?.trim() ?? "";
}

const pids = pidsOnPort();

for (const pid of pids) {
  const command = commandOf(pid);

  if (command && !/next/i.test(command)) {
    console.warn(
      `⚠ Port ${port} başqa proqram tərəfindən tutulub (PID ${pid}: ${command}).\n` +
        `  Toxunulmadı — onu özün dayandır, sonra yenidən cəhd et.`,
    );
    continue;
  }

  try {
    process.kill(pid, "SIGTERM");
    console.log(`✓ Port ${port} azad edildi — köhnə dev server dayandırıldı (PID ${pid}).`);
  } catch {
    // Proses artıq ölüb və ya icazə yoxdur — dev serveri bloklamağa dəyməz.
  }
}

// SIGTERM-dən sonra soketin bağlanmasını gözlə, yoxsa `next dev` dərhal
// başlayıb yenə EADDRINUSE alar.
const deadline = Date.now() + 5000;
while (pidsOnPort().length > 0 && Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 100));
}

if (pidsOnPort().length > 0) {
  console.warn(`⚠ Port ${port} hələ də məşğuldur — \`next dev\` sınacaq.`);
}
