# -------------------------------
# 1. Base deps (install all deps for workspaces)
# -------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

# Copy root configs
COPY package*.json turbo.json tsconfig.json ./

# Copy workspaces
COPY apps ./apps
COPY packages ./packages

# Install all dependencies (including workspaces)
RUN npm install --workspaces

# -------------------------------
# 2. Build the app
# -------------------------------
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app ./

# Run build only for the moosematrix app
RUN npx turbo run build --filter=moosematrix...

# -------------------------------
# 3. Production runtime
# -------------------------------
FROM node:20-alpine AS runner
WORKDIR /app/apps/moosematrix

RUN apk add --no-cache dumb-init curl

ENV NODE_ENV=production
ENV PORT=3000

# Copy built app and only what's needed at runtime
COPY --from=build /app/apps/moosematrix/.next ./.next
COPY --from=build /app/apps/moosematrix/public ./public
COPY --from=build /app/apps/moosematrix/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages /app/packages

# Copy your custom server
COPY apps/moosematrix/server.js ./server.js

# Expose Next.js server port
EXPOSE 3000

# --- NEW: Healthcheck for /api/healthz ---
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

# Use custom server instead of plain next start
CMD ["dumb-init", "node", "server.js"]

