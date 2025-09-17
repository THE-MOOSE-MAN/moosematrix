# -------------------------------
# 1. Base deps (install all deps for workspaces)
# -------------------------------
FROM node:18-alpine AS deps
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
FROM node:18-alpine AS build
WORKDIR /app

COPY --from=deps /app ./

# Run build only for the moosematrix app
RUN npx turbo run build --filter=moosematrix...

# -------------------------------
# 3. Production runtime
# -------------------------------
FROM node:18-alpine AS runner
WORKDIR /app/apps/moosematrix

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=3000

# Copy built app and only what's needed at runtime
COPY --from=build /app/apps/moosematrix/.next ./.next
COPY --from=build /app/apps/moosematrix/public ./public
COPY --from=build /app/apps/moosematrix/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages /app/packages

# Install production-only deps for this app
RUN npm install --omit=dev

EXPOSE 3000

# Start inside apps/moosematrix
CMD ["dumb-init", "npm", "start"]
