# Multi-stage build for production deployment
FROM node:18-alpine AS frontend-build

# Build frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Backend stage
FROM node:18-alpine AS backend

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

# Expose port
EXPOSE 10000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=10000

# Start the server
CMD ["npm", "start"]