# -------------------------------
# 1. Base deps (all deps incl dev)
# -------------------------------
FROM node:18-alpine AS deps
WORKDIR /app

# Install libc6-compat for some npm packages
RUN apk add --no-cache libc6-compat

# Copy root configs
COPY package*.json turbo.json tsconfig.json ./

# Copy workspaces
COPY packages ./packages
COPY apps ./apps

# Install all deps (workspaces handled automatically)
RUN npm install --workspaces

# -------------------------------
# 2. Build the app
# -------------------------------
FROM node:18-alpine AS build
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build with Turbo (only the moosematrix app)
RUN npx turbo run build --filter=moosematrix...

# -------------------------------
# 3. Production runtime
# -------------------------------
FROM node:18-alpine AS runner
WORKDIR /app

# Add runtime dependencies
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=3000

# Copy only the built app + prod node_modules
COPY --from=build /app/apps/moosematrix/.next ./apps/moosematrix/.next
COPY --from=build /app/apps/moosematrix/package.json ./apps/moosematrix/package.json
COPY --from=build /app/packages ./packages
COPY --from=deps /app/node_modules ./node_modules

# Ensure next binary exists for runtime
RUN npm install --omit=dev --workspace=apps/moosematrix

# Expose port
EXPOSE 3000

# Start the app
CMD ["dumb-init", "npx", "next", "start", "-p", "3000", "apps/moosematrix"]
