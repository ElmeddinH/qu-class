# ============================================================================
# QU CLASS — istehsal image-i (Fly.io + persistent volume)
# Qərar sənədi: `docs/DECISIONS.md` → QD-018
#
# Mərhələlər:  base → deps → builder → migrator → runner
#
# ƏSAS PRİNSİP: runtime image-də NƏ `src/`, NƏ dev-asılılıqlar, NƏ də TypeScript
# var. Next.js `output: "standalone"` (bax `next.config.ts`) tək `server.js` +
# yalnız izlənən (traced) modullar verir.
# ============================================================================

# 🔴 `-slim` = Debian bookworm + glibc + OpenSSL 3.0.
#    `-alpine` QƏSDƏN SEÇİLMƏYİB: `sharp` orada `libvips`-i musl üçün
#    yenidən qurmalı olur və `prisma`-nın musl engine-i ayrı binaryTarget
#    tələb edir. İki əlavə uğursuzluq nöqtəsi — 40 MB qazanca dəyməz.
#    ⚠️ Bu sətir dəyişsə `prisma/schema.prisma` → `binaryTargets` da dəyişməlidir.
ARG NODE_IMAGE=node:22-slim


# ---------------------------------------------------------------------------
# base — hər mərhələnin ortaq təməli
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base

# `openssl` Prisma query engine-in dinamik asılılığıdır. `node:22-slim`-də
# `libssl3` var, amma Prisma platformanı `openssl version` ilə aşkarlayır —
# paket olmadan `debian-openssl-1.1.x`-ə yanlış düşə bilər.
# `ca-certificates` HTTPS (npm registry, Fly şəbəkəsi) üçündür.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app


# ---------------------------------------------------------------------------
# deps — asılılıqlar (öz qatında ki, mənbə kodu dəyişəndə keş dağılmasın)
# ---------------------------------------------------------------------------
FROM base AS deps

# 🔴 `package-lock.json` MƏCBURİDİR — `npm ci` onsuz işləmir.
#    `.dockerignore` onu QƏSDƏN istisna etmir (orada izahı var).
COPY package.json package-lock.json ./

# Sxem BURADA da lazımdır: `@prisma/client`-in `postinstall` hook-u
# `prisma generate` çağırır və sxemi tapmasa xəbərdarlıq/xəta verir.
# ⚠️ Bu, keş sərhədini sxemə bağlayır — schema dəyişəndə `npm ci` yenidən
# işləyir. Sxem nadir dəyişir, uğursuz build isə bahadır.
COPY prisma/schema.prisma ./prisma/schema.prisma

# `npm ci` (≠ `npm install`) lock faylını HƏRFİ tətbiq edir və `node_modules`-u
# sıfırdan qurur → build təkrarlana bilən olur.
# Skriptlərə İCAZƏ VAR: `@prisma/client` və `sharp` postinstall-da platforma
# binarlarını hazırlayır; `--ignore-scripts` yazılsa runtime-da çökərdi.
RUN npm ci --no-audit --no-fund


# ---------------------------------------------------------------------------
# builder — Prisma klienti, Next build, Swagger aktivləri, demo baza şablonu
# ---------------------------------------------------------------------------
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 🔴 BUILD ANINDA BAZAYA TOXUNULMUR, amma `DATABASE_URL` yenə də lazımdır və
#    `prisma generate`-DƏN ƏVVƏL qoyulmalıdır:
#      · sxem `url = env("DATABASE_URL")` yazır — dəyişən yoxdursa Prisma
#        sxemi validasiya edərkən şikayət edir;
#      · `new PrismaClient()` datasource URL-ini KONSTRUKTORDA yoxlayır, yəni
#        `next build` route modullarını yükləyəndə boş dəyər çökmə verərdi.
#    ⚠️ Lokalda bu problem GÖRÜNMÜR — orada `.env` faylı var. Konteynerdə isə
#    `.dockerignore` `.env*`-i kəsir (sirrlər image qatına düşməsin deyə).
#    Dəyər müvəqqətidir: istehsalda `fly secrets` `file:/data/qu.db` verir.
ENV DATABASE_URL="file:/tmp/build-placeholder.db"

# Prisma klienti (`node_modules/.prisma/client`) — `binaryTargets` sayəsində
# `debian-openssl-3.0.x` engine-i də yığılır.
RUN npx prisma generate

# `npm run build` → `prebuild` hook-u AVTOMATİK işləyir:
#   • `npm run docs:assets`  → `scripts/copy-swagger.mjs` → `public/swagger/*`
#     (Swagger UI aktivləri; unudulsa `/docs` səhifəsi ağ açılır — CDN YOXDUR)
#   • `npm run docs:openapi` → `docs/openapi.json` snapshot-ı
# Yəni ayrıca `RUN npm run docs:assets` YAZMAQ LAZIM DEYİL — və yazılsaydı
# iki dəfə işləyərdi. Hook-un varlığı `package.json:13`-dədir.
RUN npm run build

# --- demo datası: image-ə BAZA ŞABLONU kimi yığılır -------------------------
# 🔴 NİYƏ RUNTIME-DA `prisma db seed` DEYİL: seed `tsx` (dev-asılılıq),
#    bütün `src/lib/*` qrafı və `tsconfig.json` yol alias-larını tələb edir.
#    Onları runtime image-ə salmaq standalone-un bütün mənasını itirərdi.
#    Seed BURADA — bir dəfə, build anında — işlədilir və nəticə hazır SQLite
#    faylı kimi daşınır.
#
# ✅ DETERMİNİZM QORUNUR — ÖLÇÜLÜB. `prisma/seed.ts:107` → `NOW` SABİT tarixdir
#    (`2026-07-29T09:00:00Z`), parol duzu isə `seed.ts:470`-də sabitdir.
#    İki müstəqil işlətmə eyni MƏZMUNU verdi: 125 istifadəçi · 300 paylaşım ·
#    25 tədbir, `User` sətirlərinin sha256-sı eyni (`c940475657c3bbc3`).
#    ⚠️ SQLite FAYLININ baytları fərqlənir (səhifə yerləşdirmə sırası) — yəni
#    `sha256sum` ilə müqayisə etmə, məzmunla müqayisə et.
ENV SEED_TEMPLATE=/app/prisma/seed-template.db
RUN DATABASE_URL="file:${SEED_TEMPLATE}" npx prisma migrate deploy \
  && DATABASE_URL="file:${SEED_TEMPLATE}" npx prisma db seed \
  && ls -la "${SEED_TEMPLATE}"


# ---------------------------------------------------------------------------
# migrator — TƏK məqsəd: runtime-da `prisma migrate deploy` işlətmək
# ---------------------------------------------------------------------------
# 🔴 NİYƏ AYRI MƏRHƏLƏ: Prisma CLI-nin asılılıq qrafı `@prisma/*` ilə
#    məhdudlaşmır — `@prisma/config` → `effect`, `c12`, `deepmerge-ts`,
#    `empathic` çəkir. Bir neçə qovluğu əl ilə seçib kopyalamaq (sınaqdan
#    keçirilib) `Cannot find module 'effect'` verir. Buna görə CLI TƏMİZ,
#    izolyasiya olunmuş qovluğa quraşdırılır.
#
# 🔴 NİYƏ `npx prisma` DEYİL: `npx` paketi TAPMASA registry-dən ENDİRİR.
#    Konteyner startında şəbəkəyə güvənmək — miqrasiya addımını internet
#    kəsilməsinə bağlamaq deməkdir. Binar image-in içində olmalıdır.
FROM base AS migrator

WORKDIR /migrator

# Versiya lock faylından oxunur → CLI ilə `@prisma/client` HEÇ VAXT ayrılmır.
# (`Dockerfile`-a versiya hardcode edilsəydi `package.json` yenilənəndə
#  səssizcə uyğunsuzluq yaranardı.)
COPY package-lock.json ./
RUN PRISMA_VERSION="$(node -p "require('./package-lock.json').packages['node_modules/prisma'].version")" \
  && echo "[migrator] prisma@${PRISMA_VERSION}" \
  && rm package-lock.json \
  && npm init -y > /dev/null \
  && npm install --no-audit --no-fund "prisma@${PRISMA_VERSION}"


# ---------------------------------------------------------------------------
# runner — canlıda işləyən image
# ---------------------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Root olmayan istifadəçi. `docker-entrypoint.sh` ROOT kimi başlayır (volume
# sahibliyini düzəltmək üçün), sonra `setpriv` ilə bu istifadəçiyə enir.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs --home /app nextjs

# --- 🔴 TƏLƏ A: standalone `public/` və `.next/static`-i KOPYALAMIR ---------
# Aşağıdakı üç `COPY` sətri olmadan səhifə 200 qaytarır, amma bütün CSS/JS
# 404 verir və sayt stilsiz açılır. Sıra vacibdir: `standalone` özü ilə
# `node_modules` gətirir, ona görə `.prisma` ondan SONRA yazılır.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# --- Prisma runtime -------------------------------------------------------
# `.prisma/client` generasiya olunmuş klient + query engine binarıdır.
# Next-in fayl izləyicisi (file tracing) onu bəzən `.node` uzantısına görə
# ATLAYIR — açıq kopyalama zəmanətdir.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# --- sharp (şəkil emalı) --------------------------------------------------
# `sharp` native `libvips` binarını `@img/sharp-linux-x64` optional paketində
# saxlayır. Tracing optional dependency-ləri etibarsız izləyir → açıq kopyala,
# yoxsa ilk şəkil yükləməsində `Could not load the "sharp" module`.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@img ./node_modules/@img

# --- miqrasiya üçün lazım olanlar -----------------------------------------
# Sxem + miqrasiya qovluğu + build anında seed edilmiş baza şablonu.
COPY --from=builder --chown=nextjs:nodejs /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma/migrations ./prisma/migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma/seed-template.db ./prisma/seed-template.db
COPY --from=migrator --chown=nextjs:nodejs /migrator/node_modules ./migrator/node_modules

COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000

# `/data` volume mount nöqtəsidir (bax `fly.toml`). Qovluq image-də mövcud
# olmalıdır ki, volume qoşulmayan lokal işlətmədə də entrypoint sınmasın.
VOLUME ["/data"]

# ⚠️ İstifadəçi BURADA dəyişdirilmir. Entrypoint root kimi başlayır (Fly
# volume-u root:root mount edir və `chown` lazımdır), işi bitirəndən sonra
# `setpriv` ilə `nextjs`-ə keçir və `node`-u PID 1 kimi `exec` edir.
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
