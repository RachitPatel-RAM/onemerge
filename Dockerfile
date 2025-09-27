# Build stage
FROM node:22-slim AS builder

# Set working directory
WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY server .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:22-slim AS production

# Install LibreOffice and fonts
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-core \
    libreoffice-common \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    fonts-dejavu \
    && rm -rf /var/lib/apt/lists/* \
    && libreoffice --version

# Set working directory
WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install production dependencies fresh to ensure clean state
RUN npm ci --only=production --verbose

# Verify mammoth is installed
RUN ls -la node_modules/ | grep mammoth || echo "mammoth not found in node_modules"
RUN test -d node_modules/mammoth && echo "mammoth directory exists" || echo "mammoth directory missing"
RUN node -e "try { require('mammoth'); console.log('mammoth module loads successfully'); } catch(e) { console.error('mammoth load failed:', e.message); process.exit(1); }"

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 10000

# Start the server
CMD ["npm", "start"]