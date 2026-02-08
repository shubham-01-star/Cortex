# High-Speed Professional Dockerfile for Next.js with Prisma
# Optimized for caching, security, and build performance

# Step 1: Base image
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Step 2: Dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
# Use BuildKit cache for faster npm installs
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts

# Step 3: Builder
# Speed Optimization: Extend 'deps' to avoid copying node_modules
FROM deps AS builder
WORKDIR /app
COPY . .

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED 1

# Professional build args: Pulled from build context (docker-compose)
ARG DATABASE_URL
ARG BETTER_AUTH_URL
ARG NEXT_PUBLIC_USE_MOCK=true
ARG NEXT_PUBLIC_TAMBO_API_KEY

# Set env vars for build process (required for Next.js static optimization)
ENV DATABASE_URL=$DATABASE_URL
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL
ENV NEXT_PUBLIC_USE_MOCK=$NEXT_PUBLIC_USE_MOCK
ENV NEXT_PUBLIC_TAMBO_API_KEY=$NEXT_PUBLIC_TAMBO_API_KEY

# Generate Prisma client
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# Step 4: Production Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Security: Create and use a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy essential build artifacts
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma and setup scripts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts/entrypoint.sh ./scripts/entrypoint.sh

# Pre-install Prisma CLI in runner for reliable migrations
RUN npm install -g prisma@6.19.2

RUN chmod +x ./scripts/entrypoint.sh

USER nextjs

EXPOSE 3099
ENV PORT 3099
ENV HOSTNAME "0.0.0.0"

ENTRYPOINT ["./scripts/entrypoint.sh"]