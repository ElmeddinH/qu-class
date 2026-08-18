#!/bin/sh
# ============================================================================
# QU CLASS — konteyner start ardıcıllığı
# Bax: `Dockerfile`, `fly.toml`, `docs/DECISIONS.md` → QD-018
#
#   1. `/data/uploads` + `public/uploads` simvolik keçidi   (TƏLƏ D)
#   2. `prisma migrate deploy`                              (`migrate dev` YOX)
#   3. ŞƏRTİ demo datası — yalnız `User` cədvəli BOŞDURSA   (TƏLƏ E)
#   4. Hüquqları endir və `node server.js`-i PID 1 kimi işə sal
#
# `set -eu`: hər hansı addım sınsa konteyner DAYANIR. Səssiz davam etmək
# «tətbiq qalxdı, amma baza miqrasiya olunmayıb» vəziyyəti yaradardı — bu,
# ilk sorğuda anlaşılmaz 500 kimi görünür.
# ============================================================================
set -eu

# İkisi də üstələnə bilir ki, skript konteynerdən KƏNARDA da sınana bilsin
# (Docker olmayan maşında quru məşq üçün). İstehsalda `fly.toml` → `[env]`
# `DATA_DIR=/data` verir, `APP_DIR` isə image-in sabit quruluşudur.
APP_DIR="${APP_DIR:-/app}"
DATA_DIR="${DATA_DIR:-/data}"
UPLOADS_TARGET="${DATA_DIR}/uploads"
UPLOADS_LINK="${APP_DIR}/public/uploads"
SCHEMA="${APP_DIR}/prisma/schema.prisma"
SEED_TEMPLATE="${APP_DIR}/prisma/seed-template.db"
PRISMA_CLI="${APP_DIR}/migrator/node_modules/prisma/build/index.js"
RUN_USER="nextjs"
RUN_GROUP="nodejs"

log() { echo "[entrypoint] $*"; }

# `DATABASE_URL` normalda `fly secrets set` ilə gəlir. Default qoyulur ki,
# `docker run -v qu-data:/data ...` ilə lokal sınaq da işləsin — amma dəyər
# uydurulanda BUNU AÇIQ YAZ, yoxsa yanlış baza səssizcə işlədilə bilər.
if [ -z "${DATABASE_URL:-}" ]; then
  DATABASE_URL="file:${DATA_DIR}/qu.db"
  export DATABASE_URL
  log "⚠️  DATABASE_URL təyin edilməyib — default: ${DATABASE_URL}"
fi

# ---------------------------------------------------------------------------
# 1. Yüklənən fayllar — 🔴 TƏLƏ D
# ---------------------------------------------------------------------------
# `public/uploads` IMAGE-İN İÇİNDƏDİR, yəni hər deploy-da yeni image ilə
# birlikdə SIFIRLANIR. Volume isə deploy-lar arasında yaşayır. `storage.ts`
# `process.cwd()/public/uploads`-a yazır və O FAYLA TOXUNULMUR (CLAUDE.md
# qaydası: fayl sistemi girişi tək moduldadır) — ona görə kod yolunu deyil,
# YOLUN ARXASINDAKI DİSKİ dəyişirik: qovluq simvolik keçidlə əvəz olunur.
log "uploads: ${UPLOADS_LINK} → ${UPLOADS_TARGET}"
mkdir -p "${UPLOADS_TARGET}"

if [ -L "${UPLOADS_LINK}" ]; then
  # Keçid artıq var (restart) — hədəfi yoxla, səhvdirsə yenidən qur.
  if [ "$(readlink "${UPLOADS_LINK}")" != "${UPLOADS_TARGET}" ]; then
    rm -f "${UPLOADS_LINK}"
    ln -s "${UPLOADS_TARGET}" "${UPLOADS_LINK}"
  fi
elif [ -d "${UPLOADS_LINK}" ]; then
  # İlk start: image-dəki qovluq keçidlə əvəz olunur.
  # ⚠️ Əvvəlcə MƏZMUN köçürülür. Hazırda `.dockerignore` `public/uploads`-ı
  # image-dən kəsir, yəni qovluq boşdur — amma bir gün ora demo aktivi
  # qoyulsa `rm -rf` onları səssizcə udardı.
  if [ -n "$(ls -A "${UPLOADS_LINK}" 2> /dev/null)" ]; then
    log "image-dəki uploads məzmunu volume-a köçürülür"
    cp -rn "${UPLOADS_LINK}/." "${UPLOADS_TARGET}/" 2> /dev/null || true
  fi
  rm -rf "${UPLOADS_LINK}"
  ln -s "${UPLOADS_TARGET}" "${UPLOADS_LINK}"
else
  rm -f "${UPLOADS_LINK}"
  ln -s "${UPLOADS_TARGET}" "${UPLOADS_LINK}"
fi

# ---------------------------------------------------------------------------
# 2. Miqrasiyalar — 🔴 `migrate dev` DEYİL
# ---------------------------------------------------------------------------
# `migrate deploy` yalnız TƏTBİQ OLUNMAMIŞ miqrasiyaları işlədir, interaktiv
# sual vermir və bazanı HEÇ VAXT sıfırlamır. `migrate dev` isə drift görəndə
# «reset?» soruşur; TTY olmayan konteynerdə bu ya sınır, ya da (köhnə
# versiyalarda) bazanı silir.
#
# CLI `npx` ilə DEYİL, image-in içindəki nüsxə ilə çağırılır — `npx` paketi
# tapmasa registry-dən endirməyə çalışardı və start şəbəkədən asılı olardı.
log "prisma migrate deploy"
node "${PRISMA_CLI}" migrate deploy --schema "${SCHEMA}"

# ---------------------------------------------------------------------------
# 3. Demo datası — 🔴 TƏLƏ E
# ---------------------------------------------------------------------------
# Yoxlama SAYĞACLADIR, fayl mövcudluğu ilə deyil: `/data/qu.db` faylı 2-ci
# addımdan sonra HƏMİŞƏ mövcuddur (miqrasiya onu yaradır), yəni fayl testi
# ilk deploy-dan sonra heç vaxt seed etməzdi.
#
# `prisma/seed.ts` BURADA İŞLƏMİR — o, `tsx` (dev-asılılıq), bütün `src/lib`
# qrafı və `tsconfig` alias-larını tələb edir. Onun əvəzinə build anında
# hazırlanmış şablon baza (`Dockerfile` → builder) yerinə qoyulur. Seed
# deterministik olduğu üçün nəticə eynidir (`prisma/seed.ts:107` sabit `NOW`,
# `:470` sabit bcrypt duzu).
count_users() {
  cd "${APP_DIR}"
  node -e '
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient({ log: [] });
    prisma.user
      .count()
      .then((n) => process.stdout.write(String(n)))
      .catch(() => process.stdout.write("ERR"))
      .finally(() => prisma.$disconnect());
  '
}

# `|| echo ERR` MƏCBURİDİR: `set -e` altında sıfırdan fərqli çıxış kodu bütün
# skripti dayandırardı və konteyner «Prisma klienti yüklənmədi» əvəzinə səssiz
# çıxış kodu ilə ölərdi. Səhv halda seed ATLANIR — data risk altına salınmır.
USER_COUNT="$(count_users || echo ERR)"
log "User cədvəli: ${USER_COUNT} sətir"

if [ "${USER_COUNT}" = "0" ]; then
  if [ -f "${SEED_TEMPLATE}" ]; then
    log "baza boşdur → demo şablonu yerinə qoyulur"
    DB_PATH="${DATA_DIR}/qu.db"
    # WAL/SHM yoldaşları qalsa yeni faylla uyğunsuz olardı.
    rm -f "${DB_PATH}-wal" "${DB_PATH}-shm" "${DB_PATH}-journal"
    cp "${SEED_TEMPLATE}" "${DB_PATH}"
  else
    log "⚠️  seed şablonu tapılmadı (${SEED_TEMPLATE}) — baza BOŞ qalır"
  fi
elif [ "${USER_COUNT}" = "ERR" ]; then
  log "⚠️  User sayı oxunmadı — seed ATLANIR (mövcud data risk altına salınmır)"
else
  log "baza doludur → seed ATLANIR (istifadəçi datası qorunur)"
fi

# ---------------------------------------------------------------------------
# 4. Hüquqlar və işə salma
# ---------------------------------------------------------------------------
# Fly volume-u `root:root` mount edir, tətbiq isə root olmayan istifadəçi kimi
# işləyir → sahiblik hər startda düzəldilir (əməliyyat ucuzdur: bir neçə fayl).
chown -R "${RUN_USER}:${RUN_GROUP}" "${DATA_DIR}" 2>/dev/null || \
  log "⚠️  ${DATA_DIR} chown olunmadı — root kimi davam edilir"

cd "${APP_DIR}"

# `setpriv` `exec` edir (fork ETMİR), yəni `node` PID 1 olur və Fly-ın
# göndərdiyi SIGTERM/SIGINT birbaşa ona çatır. `su`/`gosu` ilə əvəz etmək
# ARAYA proses qoyardı və graceful shutdown itərdi.
if command -v setpriv > /dev/null 2>&1 && id "${RUN_USER}" > /dev/null 2>&1; then
  log "start: $* (istifadəçi: ${RUN_USER})"
  exec setpriv --reuid="${RUN_USER}" --regid="${RUN_GROUP}" --init-groups --inh-caps=-all "$@"
fi

# Bura yalnız image gözlənilmədən dəyişəndə düşülür (`setpriv` və ya `nextjs`
# istifadəçisi yoxdur). Səbəbi AÇIQ yazılır — «niyə root?» sualı log-dan
# cavablanmalıdır, təxminlə yox.
if ! command -v setpriv > /dev/null 2>&1; then
  log "⚠️  setpriv tapılmadı (util-linux?) — root kimi başlanır: $*"
else
  log "⚠️  «${RUN_USER}» istifadəçisi yoxdur — root kimi başlanır: $*"
fi
exec "$@"
