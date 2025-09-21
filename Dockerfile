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

# --- Custom entrypoint to rewrite /health -> /api/health ---
# We'll create a tiny Node server that proxies /health to Next.js /api/health
RUN echo 'import { createProxyMiddleware } from "http-proxy-middleware";\n\
import express from "express";\n\
import next from "next";\n\
\n\
const port = process.env.PORT || 3000;\n\
const dev = process.env.NODE_ENV !== "production";\n\
const app = next({ dev, dir: "." });\n\
const handle = app.getRequestHandler();\n\
\n\
app.prepare().then(() => {\n\
  const server = express();\n\
\n\
  // Rewrite /health to /api/health\n\
  server.get("/health", (req, res) => {\n\
    req.url = "/api/health";\n\
    handle(req, res);\n\
  });\n\
\n\
  // Default handler\n\
  server.all("*", (req, res) => handle(req, res));\n\
\n\
  server.listen(port, () => {\n\
    console.log(`🚀 MooseMatrix running on http://localhost:${port}`);\n\
  });\n\
});' > server.js

# Add required deps for express
RUN npm install express http-proxy-middleware

EXPOSE 3000

# Use custom server instead of plain next start
CMD ["dumb-init", "node", "server.js"]
