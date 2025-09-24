#!/bin/bash

# OneMerge Deployment Script for Render

echo "🚀 Starting OneMerge deployment process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Build frontend
echo "🏗️ Building frontend..."
npm run build

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd server
npm install

# Build backend
echo "🏗️ Building backend..."
npm run build

echo "✅ Build completed successfully!"
echo "📁 Frontend build: ./dist"
echo "📁 Backend build: ./server/dist"

# Go back to root
cd ..

echo "🎉 Deployment preparation complete!"
echo ""
echo "Next steps for Render deployment:"
echo "1. Push your code to GitHub"
echo "2. Connect your GitHub repo to Render"
echo "3. Use the render.yaml configuration for automatic deployment"
echo "4. Or deploy manually using the build commands above"