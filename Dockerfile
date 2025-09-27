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

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Verify mammoth installation
RUN node -e "console.log('Checking mammoth...'); try { require('mammoth'); console.log('mammoth OK'); } catch(e) { console.error('mammoth ERROR:', e.message); process.exit(1); }"

# Expose port
EXPOSE 10000

# Start the server
CMD ["npm", "start"]