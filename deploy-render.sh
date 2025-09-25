#!/bin/bash

# Render Deployment Script for MERFILE with LibreOffice
echo "🚀 Starting Render deployment with LibreOffice support..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Build the project
echo "📦 Building the project..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Build completed successfully!"

# Display deployment instructions
echo ""
echo "🎯 Render Deployment Instructions:"
echo "=================================="
echo ""
echo "1. Push your changes to your Git repository:"
echo "   git add ."
echo "   git commit -m 'Add LibreOffice support for PowerPoint conversion'"
echo "   git push origin main"
echo ""
echo "2. In your Render dashboard:"
echo "   - Go to your web service"
echo "   - Click 'Manual Deploy' → 'Deploy latest commit'"
echo "   - Or it will auto-deploy if you have auto-deploy enabled"
echo ""
echo "3. The deployment will now include:"
echo "   ✅ LibreOffice for PowerPoint conversion"
echo "   ✅ ImageMagick for image processing"
echo "   ✅ Ghostscript for PDF processing"
echo "   ✅ Enhanced fonts for better text rendering"
echo ""
echo "4. After deployment, test with a PowerPoint file to verify:"
echo "   - Upload a .pptx file"
echo "   - Check that it converts with proper slide structure"
echo "   - Verify images and graphics are preserved"
echo ""
echo "📋 Environment Variables (if needed):"
echo "   LIBREOFFICE_PATH=/usr/bin/libreoffice"
echo "   MAGICK_PATH=/usr/bin/convert"
echo ""
echo "🔧 Troubleshooting:"
echo "   - If deployment fails, check the build logs in Render"
echo "   - Ensure all dependencies are properly installed"
echo "   - Check that the Dockerfile is correctly configured"
echo ""
echo "✨ Your PowerPoint conversion should now work properly!"
