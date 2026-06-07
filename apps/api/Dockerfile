# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

# Copy root workspace configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# Build db package and api
RUN pnpm --filter @retentiq/db build
RUN pnpm --filter @retentiq/api build

# Prune dev dependencies
RUN CI=true pnpm prune --prod

# Stage 2: Runtime stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy production assets from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

USER node

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r => r.status === 200 ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "apps/api/dist/server.js"]
