# -------------------------------
# 1. Dependencies stage
# -------------------------------
FROM node:18-alpine AS deps
WORKDIR /app

# Add libc6-compat for better compatibility
RUN apk add --no-cache libc6-compat

# Copy root manifests
COPY package*.json turbo.json tsconfig.json ./

# Copy workspace manifests (so npm install can resolve deps)
COPY packages ./packages
COPY apps ./apps

# Install all deps including dev (for build step)
RUN npm install --workspaces

# -------------------------------
# 2. Build stage
# -------------------------------
FROM node:18-alpine AS build
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build only the moosematrix app
RUN npx turbo run build --filter=moosematrix...

# -------------------------------
# 3. Runtime stage
# -------------------------------
FROM node:18-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=3000

# Copy only built output + runtime deps
COPY --from=build /app/apps/moosematrix/.next ./apps/moosematrix/.next
COPY --from=build /app/apps/moosematrix/public ./apps/moosematrix/public
COPY --from=build /app/apps/moosematrix/package.json ./apps/moosematrix/
COPY --from=build /app/packages ./packages
COPY --from=deps /app/node_modules ./node_modules

# Expose the app port
EXPOSE 3000

# Use dumb-init for clean signal handling
CMD ["dumb-init", "npm", "start", "--workspace", "apps/moosematrix"]
