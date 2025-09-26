# -------------------------------
# 1. Install deps for all workspaces
# -------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Copy root configs
COPY package*.json turbo.json tsconfig.json ./

# Copy workspaces (only lock + config for install step)
COPY apps/moosematrix/package*.json ./apps/moosematrix/
COPY packages ./packages

# Install all deps (root + workspaces)
RUN npm install --workspaces

# -------------------------------
# 2. Build Moosematrix app only
# -------------------------------
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app ./
COPY apps ./apps
RUN npx turbo run build --filter=moosematrix...

# -------------------------------
# 3. Runtime
# -------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init curl

ENV NODE_ENV=production
ENV PORT=3000

# Copy only what Moosematrix app needs
COPY --from=build /app/apps/moosematrix/.next ./apps/moosematrix/.next
COPY --from=build /app/apps/moosematrix/public ./apps/moosematrix/public
COPY --from=build /app/apps/moosematrix/package.json ./apps/moosematrix/package.json
COPY --from=build /app/apps/moosematrix/next.config.mjs ./apps/moosematrix/next.config.mjs
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages

# If using a custom server
COPY apps/moosematrix/server.js ./apps/moosematrix/server.js

WORKDIR /app/apps/moosematrix

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

CMD ["dumb-init", "node", "server.js"]
