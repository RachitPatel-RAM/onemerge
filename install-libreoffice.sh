#!/bin/bash

# LibreOffice Installation Script for Render Node.js Environment
echo "🔧 Installing LibreOffice for PowerPoint conversion..."

# Update package list
apt-get update

# Install LibreOffice and dependencies
apt-get install -y \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    imagemagick \
    ghostscript \
    fontconfig \
    fonts-dejavu \
    fonts-liberation \
    fonts-opensans

# Create symbolic links for easier access
ln -sf /usr/bin/libreoffice /usr/bin/soffice
ln -sf /usr/bin/convert /usr/bin/magick

# Set environment variables
export LIBREOFFICE_PATH=/usr/bin/libreoffice
export MAGICK_PATH=/usr/bin/convert

echo "✅ LibreOffice installation completed!"
echo "📍 LibreOffice path: $LIBREOFFICE_PATH"
echo "📍 ImageMagick path: $MAGICK_PATH"

# Test LibreOffice installation
if command -v libreoffice &> /dev/null; then
    echo "✅ LibreOffice is available"
    libreoffice --version
else
    echo "❌ LibreOffice installation failed"
    exit 1
fi
