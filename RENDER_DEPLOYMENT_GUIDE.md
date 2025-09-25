# Render Deployment Guide with LibreOffice Support

## Problem Solved
Your PowerPoint conversion was failing because LibreOffice wasn't installed on the Render server. This guide will help you deploy your application with LibreOffice support.

## What's Been Updated

### 1. Dockerfile Updates (Enhanced for Render)
- ✅ **Switched to Debian base image** (node:18-bullseye) for better LibreOffice support
- ✅ **Complete LibreOffice suite installation** (writer, calc, impress)
- ✅ **Enhanced font support** (DejaVu, Liberation, OpenSans, Noto)
- ✅ **ImageMagick and Ghostscript** for image/PDF processing
- ✅ **Headless operation configuration** with proper temp directories
- ✅ **Environment variables** for LibreOffice paths and temp directories

### 2. Enhanced PPTX Parsing
- ✅ Improved image extraction from PPTX files
- ✅ Better format detection for images
- ✅ Enhanced error handling and fallback mechanisms
- ✅ More robust text extraction patterns

### 3. Environment Configuration
- ✅ Updated render.yaml with LibreOffice environment variables
- ✅ Configured proper temp directories
- ✅ Set up file paths for uploads and outputs

## Deployment Steps

### Step 1: Commit Your Changes
```bash
git add .
git commit -m "Add LibreOffice support for PowerPoint conversion"
git push origin main
```

### Step 2: Deploy to Render

#### Option A: Auto-Deploy (Recommended)
If you have auto-deploy enabled, Render will automatically deploy your changes.

#### Option B: Manual Deploy
1. Go to your Render dashboard
2. Navigate to your web service
3. Click "Manual Deploy" → "Deploy latest commit"

### Step 3: Monitor Deployment
1. Check the build logs in Render dashboard
2. Look for LibreOffice installation messages
3. Verify that all dependencies are installed correctly

### Step 4: Test the Conversion
1. Upload a PowerPoint file (.pptx)
2. Check that it converts with proper slide structure
3. Verify images and graphics are preserved

## Expected Results After Deployment

### Before (Current Issue):
```
PowerPoint Conversion Report
File: 95700fe7-3119-4f47-94e7-2f399b310d36-04082025101319AM.pptx
Size: 6.87 MB
Slides detected: 156
Contains text: Yes
Contains images: Yes
Conversion Status:
High-fidelity conversion failed - all methods attempted
```

### After (With LibreOffice):
- ✅ **LibreOffice conversion succeeds** - High-quality PDF with original formatting
- ✅ **Slide-by-slide structure preserved** - Each slide becomes a separate page
- ✅ **Images and graphics embedded** - All visual elements maintained
- ✅ **Proper text formatting** - Fonts, sizes, and layouts preserved
- ✅ **No more fallback messages** - Direct conversion without errors

## Troubleshooting

### If Deployment Fails:
1. **Check build logs** in Render dashboard
2. **Verify Dockerfile syntax** - Ensure all commands are correct
3. **Check package.json** - Ensure all dependencies are listed
4. **Review environment variables** - Make sure paths are correct

### If LibreOffice Still Not Found:
1. **Check environment variables** in Render dashboard
2. **Verify LIBREOFFICE_PATH** is set to `/usr/bin/libreoffice`
3. **Check build logs** for LibreOffice installation messages

### If Conversion Still Fails:
1. **Check server logs** for detailed error messages
2. **Test with a simple PPTX file** first
3. **Verify file permissions** for temp directories

## Environment Variables Set

The following environment variables are now configured in render.yaml:

```yaml
- key: LIBREOFFICE_PATH
  value: /usr/bin/libreoffice
- key: MAGICK_PATH
  value: /usr/bin/convert
- key: TEMP_DIR
  value: /tmp
- key: UPLOAD_DIR
  value: /tmp/uploads
- key: OUTPUT_DIR
  value: /tmp/output
- key: HOME
  value: /tmp
- key: TMPDIR
  value: /tmp
- key: DISPLAY
  value: ":99"
```

## Dependencies Installed

The Dockerfile now installs (on Debian base):
- `libreoffice` - Core LibreOffice suite
- `libreoffice-writer` - Word processing component
- `libreoffice-calc` - Spreadsheet component  
- `libreoffice-impress` - Presentation component
- `imagemagick` - For image processing
- `ghostscript` - For PDF processing
- `fontconfig` - For font management
- `fonts-dejavu` - DejaVu fonts
- `fonts-liberation` - Liberation fonts
- `fonts-opensans` - OpenSans fonts
- `fonts-noto` - Noto fonts for better Unicode support
- `curl` & `wget` - For downloading additional resources

## Testing Your Deployment

### 1. Upload Test
Upload a PowerPoint file with:
- Multiple slides
- Images and graphics
- Different text formats
- Charts or diagrams

### 2. Expected Output
You should see:
- Proper slide-by-slide conversion
- Images embedded in the PDF
- Text formatting preserved
- No error messages about conversion failure

### 3. Performance
- Conversion should complete within 30-60 seconds for most files
- Large files (100+ slides) may take 2-3 minutes
- Memory usage should be reasonable

## Support

If you encounter issues:
1. Check the server logs in Render dashboard
2. Verify all environment variables are set correctly
3. Test with a simple PowerPoint file first
4. Check that LibreOffice is properly installed by looking at build logs

## Success Indicators

You'll know the deployment is successful when:
- ✅ Build completes without errors
- ✅ LibreOffice installation messages appear in build logs
- ✅ PowerPoint files convert to proper PDFs with slide structure
- ✅ Images and graphics are preserved in the output
- ✅ No more "conversion failed" error messages

Your PowerPoint conversion should now work perfectly with full slide structure and graphics preservation!
