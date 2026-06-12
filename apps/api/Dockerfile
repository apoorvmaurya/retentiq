# Stage 1: Build stage
FROM node:26-alpine AS builder
WORKDIR /app

ENV CI=true
ENV PNPM_UPDATE_NOTIFIER=false

RUN npm install -g pnpm

# Copy root workspace configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Copy package.json of all workspace packages to leverage Docker caching and prevent settings.injectWorkspacePackages mismatch
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages ./packages
COPY apps/api ./apps/api

# Build shared, db, and api packages
RUN pnpm --filter @retentiq/shared build
RUN pnpm --filter @retentiq/db build
RUN pnpm --filter @retentiq/api build

# Deploy the api package with production dependencies to a self-contained directory
RUN pnpm --filter @retentiq/api --prod deploy /app/pruned

# Stage 2: Runtime stage
FROM node:26-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy the self-contained pruned application
COPY --from=builder /app/pruned ./

USER node

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3001) + '/health').then(r => r.status === 200 ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "dist/server.js"]
