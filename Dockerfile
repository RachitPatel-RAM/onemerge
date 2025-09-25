# Use Node.js base image
FROM node:22-slim

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

# Copy server package files
COPY server/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY server .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 10000

# Start the server
CMD ["npm", "start"]