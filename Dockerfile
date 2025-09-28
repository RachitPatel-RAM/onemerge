# =========================
# Build stage
# =========================
FROM node:22-slim AS builder

WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY server ./
RUN npm run build

# =========================
# Production stage
# =========================
FROM node:22-slim AS production

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

# Copy only production node_modules (from builder)
COPY --from=builder /app/node_modules ./node_modules

# Copy package files
COPY server/package*.json ./

# Copy built application
COPY --from=builder /app/dist ./dist

EXPOSE 10000
CMD ["npm", "start"]
