# ── Stage 1: install dependencies ────────────────────────────────────────────
# Named "deps" so cloudbuild.yaml can cache this layer independently.
# When only app code changes (not package.json), this entire stage is reused
# from cache, skipping the ~2 min npm ci step.
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --prefer-offline

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Reuse installed node_modules from the deps stage.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# prisma generate only reads schema.prisma to emit TS types — it never connects.
# We pass DATABASE_URL inline so it's not baked into the image layer.
RUN DATABASE_URL="mongodb://localhost:27017/dummy" npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Next/Prisma SSG must not require a real DB during image build (CI / Cloud Build).
ENV DATABASE_URL="mongodb://127.0.0.1:27017/docker-build-placeholder"

# AdSense public IDs (safe to bake; override via --build-arg on deploy).
ARG NEXT_PUBLIC_ADSENSE_ENABLED=1
ARG NEXT_PUBLIC_ADSENSE_PUBLISHER_NUMERIC_ID=6574958062528034
ARG NEXT_PUBLIC_ADSENSE_HOME_FOOTER_SLOT=5342241888
ENV NEXT_PUBLIC_ADSENSE_ENABLED=$NEXT_PUBLIC_ADSENSE_ENABLED
ENV NEXT_PUBLIC_ADSENSE_PUBLISHER_NUMERIC_ID=$NEXT_PUBLIC_ADSENSE_PUBLISHER_NUMERIC_ID
ENV NEXT_PUBLIC_ADSENSE_HOME_FOOTER_SLOT=$NEXT_PUBLIC_ADSENSE_HOME_FOOTER_SLOT

RUN npm run build

# ── Stage 3: run (minimal image) ─────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs entry-cloud-run.cjs /app/entry-cloud-run.cjs

USER nextjs

EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

CMD ["node", "/app/entry-cloud-run.cjs"]
