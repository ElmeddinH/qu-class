// ============================================================================
// scripts/git-config.mjs
// `git.mjs`, `git-audit.mjs` və `git-push.mjs` üçün ORTAQ konfiq.
//
// Niyə ayrı fayl: hər üç skript eyni `fs` / `dir` / `author` dəyərləri ilə
// işləməlidir. `git.mjs`-in özünü import etmək OLMAZ — o, modul səviyyəsində
// `main()` çağırır, yəni import etmək onu İŞƏ SALARDI (və "İstifadə: ..."
// mesajı ilə exit code 1 qoyardı).
// ============================================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export { fs };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Repo kökü — `scripts/`-in bir üstü. */
export const REPO_ROOT = path.resolve(__dirname, "..");

/**
 * Commit müəllifi.
 *
 * ⚠️ T33 — e-poçt GitHub hesabına bağlı OLMALIDIR, əks halda commit-lər töhfə
 * qrafikinə düşmür və Holberton yoxlamasında tarixçə "başqasının işi" görünür.
 * Dəyişdirilməsi push-DAN ƏVVƏL edilməlidir (sonra hər SHA dəyişir).
 */
export const DEFAULT_AUTHOR = {
  name: "Elmeddin Heydarov",
  email: "heydarovelmeddin2@gmail.com",
};

/** isomorphic-git çağırışlarına birbaşa spread edilir: `{ ...repo, ... }`. */
export const repo = { fs, dir: REPO_ROOT };
