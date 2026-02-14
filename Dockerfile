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

# Build-time constant injected by GitHub Actions
ARG MOOSE_BUILD_YEAR
ENV MOOSE_BUILD_YEAR=$MOOSE_BUILD_YEAR

# (Optional but good) disable Next telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Run build only for the MooseMatrix app
RUN npx turbo run build --filter=moosematrix...


# -------------------------------
# 3. Production runtime
# -------------------------------
FROM node:20-alpine AS runner
WORKDIR /app/apps/moosematrix

RUN apk add --no-cache dumb-init curl

ENV NODE_ENV=production
ENV PORT=3000

# IMPORTANT:
# Re-declare ARG in the final stage if you want it available at runtime,
# then set it as ENV so process.env.MOOSE_BUILD_YEAR works in server code.
ARG MOOSE_BUILD_YEAR
ENV MOOSE_BUILD_YEAR=$MOOSE_BUILD_YEAR

# (Optional but good) disable Next telemetry at runtime too
ENV NEXT_TELEMETRY_DISABLED=1

# Copy MooseMatrix build output
COPY --from=build /app/apps/moosematrix ./
COPY --from=build /app/tsconfig.json /app/tsconfig.json

# Copy shared packages (if needed by runtime)
COPY --from=build /app/packages /app/packages

# Install only production dependencies for this app
RUN npm install --omit=dev

# Drop privileges for runtime
RUN chown -R node:node /app
USER node

# Expose Next.js server port
EXPOSE 3000

# Healthcheck endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

# Use custom server
CMD ["dumb-init", "node", "server.js"]
