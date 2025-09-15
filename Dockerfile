# ---- Base image ----
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# ---- Dependencies layer (better caching) ----
COPY package*.json ./
RUN npm install --production

# ---- Build layer ----
COPY . .
RUN npm run build

# ---- Run layer ----
# Create a non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Make sure app files belong to that user
RUN chown -R appuser:appgroup /app

# Switch to the new user
USER appuser

# Expose port 3000 (Next.js default)
EXPOSE 3000

# Start Next.js server
CMD ["npm", "start"]
# ---- Base image ----
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# ---- Dependencies layer (better caching) ----
COPY package*.json ./
RUN npm install

# ---- Build layer ----
COPY . .
RUN npm run build

# ---- Run layer ----
# Create a non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Make sure app files belong to that user
RUN chown -R appuser:appgroup /app

# Switch to the new user
USER appuser

# Expose port 3000 (Next.js default)
EXPOSE 3000

# Start Next.js server
CMD ["npm", "start"]
