# Multi-stage build for production deployment
FROM node:18-alpine AS frontend-build

# Build frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Backend stage
FROM node:18-bullseye AS backend

# Update package list and install system dependencies
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    libreoffice-common \
    imagemagick \
    ghostscript \
    fontconfig \
    fonts-dejavu \
    fonts-liberation \
    fonts-opensans \
    fonts-noto \
    curl \
    wget \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Verify LibreOffice installation
RUN echo "🔍 Verifying LibreOffice installation..." && \
    echo "📍 Checking LibreOffice binary locations:" && \
    ls -la /usr/bin/libreoffice* || echo "No libreoffice binaries in /usr/bin/" && \
    ls -la /usr/bin/soffice* || echo "No soffice binaries in /usr/bin/" && \
    echo "📍 Checking LibreOffice directories:" && \
    ls -la /usr/lib/libreoffice/ || echo "No LibreOffice directory in /usr/lib/" && \
    echo "📍 Testing LibreOffice commands:" && \
    which libreoffice && \
    which soffice && \
    echo "📍 Testing LibreOffice version:" && \
    libreoffice --version && \
    echo "📍 Testing soffice version:" && \
    soffice --version && \
    echo "✅ LibreOffice verification complete"

# Configure LibreOffice for headless operation
RUN mkdir -p /tmp/.config/libreoffice \
    && chmod 777 /tmp/.config/libreoffice

WORKDIR /app

# Copy server files
COPY server/package*.json ./
RUN npm ci --only=production

# Copy server source and build
COPY server/ ./
RUN npm run build

# Copy frontend build to serve static files
COPY --from=frontend-build /app/dist ./public

# Create necessary directories
RUN mkdir -p uploads output temp

# Set LibreOffice environment variables
ENV LIBREOFFICE_PATH=/usr/bin/libreoffice
ENV MAGICK_PATH=/usr/bin/convert
ENV HOME=/tmp
ENV TMPDIR=/tmp

# Expose port
EXPOSE 10000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=10000

# Start the server
CMD ["npm", "start"]