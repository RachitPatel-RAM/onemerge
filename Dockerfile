# =========================
# Build stage
# =========================
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY server/package*.json ./
RUN npm ci

# Copy source code and build
COPY server ./
RUN npm run build


# =========================
# Production stage
# =========================
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

WORKDIR /app

# Copy only built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# ✅ Install only production deps (this ensures mammoth is present)
RUN npm ci --omit=dev

# ✅ Debug check to confirm mammoth exists at build time
RUN node -e "require('mammoth'); console.log('✅ Mammoth is installed and working');"

EXPOSE 10000
CMD ["npm", "start"]
