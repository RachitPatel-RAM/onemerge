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

# Clear npm cache and install production dependencies with verbose output
RUN npm cache clean --force && \
    npm ci --omit=dev --verbose

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Verify mammoth is installed and list all dependencies
RUN echo "=== Checking mammoth installation ===" && \
    npm list mammoth && \
    echo "=== All installed packages ===" && \
    npm list --depth=0 && \
    echo "=== Checking mammoth module directory ===" && \
    ls -la node_modules/mammoth/ && \
    echo "=== Testing mammoth import ===" && \
    node -e "console.log('Testing mammoth import...'); try { require('mammoth'); console.log('Mammoth import successful'); } catch(e) { console.error('Mammoth import failed:', e.message); process.exit(1); }" || \
    (echo "=== Mammoth not found, installing manually ===" && \
     npm install mammoth@^1.11.0 && \
     echo "=== Verifying manual installation ===" && \
     node -e "console.log('Testing manual mammoth import...'); try { require('mammoth'); console.log('Manual mammoth import successful'); } catch(e) { console.error('Manual mammoth import failed:', e.message); process.exit(1); }")

# Expose port
EXPOSE 10000

# Start the server
CMD ["npm", "start"]