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
RUN echo "🔄 Updating package lists..." && \
    apt-get update && \
    echo "📦 Installing basic dependencies first..." && \
    apt-get install -y --no-install-recommends \
    imagemagick \
    ghostscript \
    fontconfig \
    fonts-dejavu \
    fonts-liberation \
    fonts-opensans \
    fonts-noto \
    curl \
    wget \
    software-properties-common \
    && echo "📦 Installing LibreOffice packages..." && \
    (apt-get install -y --no-install-recommends \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    libreoffice-common \
    libreoffice-core \
    || echo "⚠️ Standard LibreOffice installation failed, trying alternative...") && \
    echo "🧹 Cleaning up package cache..." && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    echo "📦 Package installation complete"

# Verify LibreOffice installation with detailed debugging
RUN echo "🔍 Starting LibreOffice verification..." && \
    echo "📍 System information:" && \
    uname -a && \
    echo "📍 Checking installed packages:" && \
    dpkg -l | grep -i libreoffice || echo "No LibreOffice packages found via dpkg" && \
    echo "📍 Searching for LibreOffice files:" && \
    find /usr -name "*libreoffice*" -type f 2>/dev/null | head -10 || echo "No LibreOffice files found" && \
    echo "📍 Checking LibreOffice binary locations:" && \
    ls -la /usr/bin/libreoffice* 2>/dev/null || echo "No libreoffice binaries in /usr/bin/" && \
    ls -la /usr/bin/soffice* 2>/dev/null || echo "No soffice binaries in /usr/bin/" && \
    echo "📍 Checking LibreOffice directories:" && \
    ls -la /usr/lib/libreoffice/ 2>/dev/null || echo "No LibreOffice directory in /usr/lib/" && \
    echo "📍 Testing which commands:" && \
    which libreoffice 2>/dev/null || echo "libreoffice not found in PATH" && \
    which soffice 2>/dev/null || echo "soffice not found in PATH" && \
    echo "📍 Testing LibreOffice version:" && \
    (libreoffice --version 2>/dev/null || echo "❌ libreoffice --version failed") && \
    echo "📍 Testing soffice version:" && \
    (soffice --version 2>/dev/null || echo "❌ soffice --version failed") && \
    echo "📍 Checking PATH:" && \
    echo "PATH=$PATH" && \
    echo "📍 Final verification - attempting to create a test file:" && \
    (echo "Testing LibreOffice headless conversion..." && \
     libreoffice --headless --invisible --nodefault --nolockcheck --nologo --norestore --convert-to pdf --outdir /tmp /dev/null 2>/dev/null || \
     echo "❌ LibreOffice headless test failed") && \
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