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

# Update package list and install system dependencies with comprehensive debugging
RUN echo "🔄 Starting package installation process..." && \
    echo "📍 System info before installation:" && \
    cat /etc/os-release && \
    echo "📍 Available disk space:" && \
    df -h && \
    echo "🔄 Updating package lists..." && \
    apt-get update -y && \
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
    snapd \
    && echo "✅ Basic dependencies installed successfully" && \
    echo "📦 Installing LibreOffice packages (Method 1: APT)..." && \
    (apt-get install -y --no-install-recommends \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    libreoffice-common \
    libreoffice-core \
    && echo "✅ LibreOffice installed via APT" \
    || (echo "❌ APT installation failed, trying Snap..." && \
        snap install libreoffice && \
        echo "✅ LibreOffice installed via Snap" \
        || (echo "❌ Snap installation failed, trying direct download..." && \
            cd /tmp && \
            wget -O libreoffice.deb "https://download.libreoffice.org/libreoffice/old/7.6.7/deb/x86_64/LibreOffice_7.6.7_Linux_x86-64_deb.tar.gz" && \
            tar -xzf libreoffice.deb && \
            cd LibreOffice_*/DEBS && \
            dpkg -i *.deb && \
            apt-get install -f -y && \
            echo "✅ LibreOffice installed via direct download" \
            || echo "❌ All LibreOffice installation methods failed"))) && \
    echo "🧹 Cleaning up package cache..." && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/libreoffice* && \
    echo "📦 Package installation complete"

# Verify LibreOffice installation with detailed debugging and mandatory success check
RUN echo "🔍 Starting comprehensive LibreOffice verification..." && \
    echo "📍 System information:" && \
    uname -a && \
    echo "📍 Checking installed packages:" && \
    (dpkg -l | grep -i libreoffice && echo "✅ LibreOffice packages found via dpkg") || echo "⚠️ No LibreOffice packages found via dpkg" && \
    echo "📍 Searching for LibreOffice files in multiple locations:" && \
    (find /usr -name "*libreoffice*" -type f 2>/dev/null | head -10 && echo "✅ LibreOffice files found in /usr") || echo "⚠️ No LibreOffice files found in /usr" && \
    (find /opt -name "*libreoffice*" -type f 2>/dev/null | head -10 && echo "✅ LibreOffice files found in /opt") || echo "⚠️ No LibreOffice files found in /opt" && \
    (find /snap -name "*libreoffice*" -type f 2>/dev/null | head -10 && echo "✅ LibreOffice files found in /snap") || echo "⚠️ No LibreOffice files found in /snap" && \
    echo "📍 Checking LibreOffice binary locations:" && \
    (ls -la /usr/bin/libreoffice* 2>/dev/null && echo "✅ LibreOffice binaries found in /usr/bin/") || echo "⚠️ No libreoffice binaries in /usr/bin/" && \
    (ls -la /usr/bin/soffice* 2>/dev/null && echo "✅ soffice binaries found in /usr/bin/") || echo "⚠️ No soffice binaries in /usr/bin/" && \
    (ls -la /snap/bin/libreoffice* 2>/dev/null && echo "✅ LibreOffice binaries found in /snap/bin/") || echo "⚠️ No libreoffice binaries in /snap/bin/" && \
    echo "📍 Checking LibreOffice directories:" && \
    (ls -la /usr/lib/libreoffice/ 2>/dev/null && echo "✅ LibreOffice directory found in /usr/lib/") || echo "⚠️ No LibreOffice directory in /usr/lib/" && \
    (ls -la /opt/libreoffice*/ 2>/dev/null && echo "✅ LibreOffice directory found in /opt/") || echo "⚠️ No LibreOffice directory in /opt/" && \
    echo "📍 Testing which commands:" && \
    LIBREOFFICE_PATH=$(which libreoffice 2>/dev/null || which soffice 2>/dev/null || find /usr /opt /snap -name "libreoffice" -type f 2>/dev/null | head -1 || find /usr /opt /snap -name "soffice" -type f 2>/dev/null | head -1) && \
    echo "📍 Found LibreOffice at: $LIBREOFFICE_PATH" && \
    if [ -n "$LIBREOFFICE_PATH" ] && [ -x "$LIBREOFFICE_PATH" ]; then \
        echo "✅ LibreOffice executable found and is executable" && \
        echo "📍 Testing LibreOffice version:" && \
        $LIBREOFFICE_PATH --version && \
        echo "📍 Testing headless mode:" && \
        echo "test content" > /tmp/test.txt && \
        $LIBREOFFICE_PATH --headless --invisible --nodefault --nolockcheck --nologo --norestore --convert-to pdf --outdir /tmp /tmp/test.txt && \
        ls -la /tmp/test.pdf && \
        echo "✅ LibreOffice headless conversion test PASSED" && \
        rm -f /tmp/test.txt /tmp/test.pdf; \
    else \
        echo "❌ CRITICAL ERROR: LibreOffice installation FAILED" && \
        echo "❌ No working LibreOffice executable found" && \
        echo "❌ Build will fail to ensure LibreOffice is properly installed" && \
        exit 1; \
    fi && \
    echo "🎉 LibreOffice verification completed successfully!"

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