# syntax=docker/dockerfile:1

# Pin to an exact Node/Alpine build for reproducible builds — bump deliberately.
ARG NODE_VERSION=20.20.2-alpine3.23
FROM node:${NODE_VERSION} AS base
# tini reaps zombie processes and forwards signals correctly so `docker stop` / SIGTERM shut the server down gracefully.
RUN apk add --no-cache tini

# ---- deps: install dependencies only (cached separately from source) ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# ---- builder: build the Next.js app ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time — set per environment.
ARG BACKEND_URL=http://localhost:5080
ARG NEXT_PUBLIC_API_BASE=/api
ARG NEXT_PUBLIC_GA_ID=
ENV BACKEND_URL=$BACKEND_URL \
    NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE \
    NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN npm run build

# ---- runner: minimal production image ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    API_BASE_SERVER=http://localhost:5080/api

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Standalone output includes only the files needed to run `next start` in production.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Next writes its fetch/data cache here at runtime even without ISR pages.
RUN mkdir -p .next/cache && chown nextjs:nodejs .next/cache

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/ > /dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
