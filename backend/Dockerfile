FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies with npm ci (faster and more reliable than npm install)
# Use BuildKit cache mount for node_modules (requires DOCKER_BUILDKIT=1)
# Syntax: --mount=type=cache,target=/root/.npm
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production=false

# Copy source code
COPY . .

# Copy and set permissions for entrypoint script
# Copy to /entrypoint.sh (outside /app) to avoid being overridden by volume mount
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Build application (will be overridden by volume mount in dev, but needed for production)
RUN npm run build || true

# Expose port
EXPOSE 3000

# Use ENTRYPOINT to ensure shell script runs correctly
# Use /entrypoint.sh (outside /app) to avoid being overridden by volume mount
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]

