import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PowerPointService, ConversionOptions } from '../services/PowerPointService';
import { PDFGenerationService, PDFOptions } from '../services/PDFGenerationService';
import { LibreOfficeVerificationService } from '../services/LibreOfficeVerificationService';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '50000000'), // 50MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.ppt', '.pptx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only PowerPoint files (.ppt, .pptx) are allowed'));
    }
  }
});

/**
 * POST /api/powerpoint/convert-to-pdf
 * Convert PowerPoint file to PDF
 */
router.post('/convert-to-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const baseName = path.basename(originalName, path.extname(originalName));

    // Parse conversion options from request body
    const conversionOptions: ConversionOptions = {
      outputFormat: 'pdf',
      imageFormat: (req.body.imageFormat as 'png' | 'jpeg') || 'png',
      quality: parseInt(req.body.quality) || 95,
      dpi: parseInt(req.body.dpi) || 300
    };

    const pdfOptions: PDFOptions = {
      pageSize: req.body.pageSize || 'Custom',
      maintainAspectRatio: req.body.maintainAspectRatio !== 'false',
      backgroundColor: req.body.backgroundColor || '#ffffff',
      margin: parseInt(req.body.margin) || 0
    };

    // Initialize services
    const powerPointService = new PowerPointService();
    const pdfService = new PDFGenerationService();

    // Convert PowerPoint to images
    const slideImages = await powerPointService.convertToImages(filePath, conversionOptions);

    if (slideImages.length === 0) {
      throw new Error('No slides found in the PowerPoint file');
    }

    // Generate PDF filename
    const pdfFileName = `${baseName}_converted_${Date.now()}.pdf`;

    // Create PDF from slides
    const pdfPath = await pdfService.createPDFFromSlides(slideImages, pdfFileName, pdfOptions);

    // Get PDF info
    const pdfInfo = await pdfService.getPDFInfo(pdfPath);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Send response
    return res.json({
      success: true,
      message: 'PowerPoint converted to PDF successfully',
      data: {
        originalFileName: originalName,
        pdfFileName: pdfFileName,
        pdfPath: pdfPath,
        slideCount: slideImages.length,
        pdfInfo: pdfInfo,
        conversionOptions: conversionOptions,
        pdfOptions: pdfOptions
      }
    });

  } catch (error) {
    console.error('PowerPoint to PDF conversion error:', error);

    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Get LibreOffice diagnostics for better error reporting
    let libreOfficeDiagnostics = null;
    try {
      const verificationService = new LibreOfficeVerificationService();
      libreOfficeDiagnostics = await verificationService.verifyLibreOfficeInstallation();
    } catch (diagError) {
      console.error('Failed to get LibreOffice diagnostics:', diagError);
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const isLibreOfficeError = errorMessage.toLowerCase().includes('libreoffice') || 
                               errorMessage.toLowerCase().includes('conversion failed');

    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: 'Failed to convert PowerPoint to PDF',
      diagnostics: {
        libreOffice: libreOfficeDiagnostics,
        isLibreOfficeRelated: isLibreOfficeError,
        recommendations: isLibreOfficeError ? [
          'Verify LibreOffice is properly installed on the server',
          'Check server environment variables for LibreOffice path',
          'Ensure sufficient system resources are available',
          'Try using the /api/test/libreoffice endpoint to verify installation'
        ] : [
          'Check file format and integrity',
          'Verify file is not corrupted',
          'Ensure sufficient disk space is available'
        ]
      }
    });
  }
});

/**
 * POST /api/powerpoint/convert-to-images
 * Convert PowerPoint file to individual images
 */
router.post('/convert-to-images', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;

    // Parse conversion options
    const conversionOptions: ConversionOptions = {
      outputFormat: 'images',
      imageFormat: (req.body.imageFormat as 'png' | 'jpeg') || 'png',
      quality: parseInt(req.body.quality) || 95,
      dpi: parseInt(req.body.dpi) || 300
    };

    // Initialize service
    const powerPointService = new PowerPointService();

    // Convert PowerPoint to images
    const slideImages = await powerPointService.convertToImages(filePath, conversionOptions);

    if (slideImages.length === 0) {
      throw new Error('No slides found in the PowerPoint file');
    }

    // Save images to output directory
    const outputDir = process.env.OUTPUT_DIR || './output';
    const baseName = path.basename(originalName, path.extname(originalName));
    const imageFiles: string[] = [];

    for (let i = 0; i < slideImages.length; i++) {
      const slide = slideImages[i];
      const imageFileName = `${baseName}_slide_${slide.slideNumber.toString().padStart(3, '0')}.${conversionOptions.imageFormat}`;
      const imagePath = path.join(outputDir, imageFileName);
      
      fs.writeFileSync(imagePath, slide.buffer);
      imageFiles.push(imageFileName);
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Send response
    return res.json({
      success: true,
      message: 'PowerPoint converted to images successfully',
      data: {
        originalFileName: originalName,
        slideCount: slideImages.length,
        imageFiles: imageFiles,
        conversionOptions: conversionOptions,
        slides: slideImages.map(slide => ({
          slideNumber: slide.slideNumber,
          width: slide.width,
          height: slide.height,
          fileName: `${baseName}_slide_${slide.slideNumber.toString().padStart(3, '0')}.${conversionOptions.imageFormat}`
        }))
      }
    });

  } catch (error) {
    console.error('PowerPoint to images conversion error:', error);

    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Get LibreOffice diagnostics for better error reporting
    let libreOfficeDiagnostics = null;
    try {
      const verificationService = new LibreOfficeVerificationService();
      libreOfficeDiagnostics = await verificationService.verifyLibreOfficeInstallation();
    } catch (diagError) {
      console.error('Failed to get LibreOffice diagnostics:', diagError);
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const isLibreOfficeError = errorMessage.toLowerCase().includes('libreoffice') || 
                               errorMessage.toLowerCase().includes('conversion failed');

    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: 'Failed to convert PowerPoint to images',
      diagnostics: {
        libreOffice: libreOfficeDiagnostics,
        isLibreOfficeRelated: isLibreOfficeError,
        recommendations: isLibreOfficeError ? [
          'Verify LibreOffice is properly installed on the server',
          'Check server environment variables for LibreOffice path',
          'Ensure sufficient system resources are available',
          'Try using the /api/test/libreoffice endpoint to verify installation'
        ] : [
          'Check file format and integrity',
          'Verify file is not corrupted',
          'Ensure sufficient disk space is available'
        ]
      }
    });
  }
});

/**
 * GET /api/powerpoint/download/:filename
 * Download converted file
 */
router.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const outputDir = process.env.OUTPUT_DIR || './output';
    const filePath = path.join(outputDir, filename);

    // Security check: ensure file is in output directory
    const resolvedPath = path.resolve(filePath);
    const resolvedOutputDir = path.resolve(outputDir);
    
    if (!resolvedPath.startsWith(resolvedOutputDir)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Set appropriate headers
    const fileExtension = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (fileExtension === '.pdf') {
      contentType = 'application/pdf';
    } else if (fileExtension === '.png') {
      contentType = 'image/png';
    } else if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
      contentType = 'image/jpeg';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    return fileStream.pipe(res);

  } catch (error) {
    console.error('File download error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
});

/**
 * GET /api/powerpoint/supported-formats
 * Get supported file formats
 */
router.get('/supported-formats', (req, res) => {
  res.json({
    success: true,
    data: {
      inputFormats: PowerPointService.getSupportedFormats(),
      outputFormats: ['pdf', 'png', 'jpeg'],
      maxFileSize: process.env.MAX_FILE_SIZE || '50000000',
      supportedOptions: {
        imageFormats: ['png', 'jpeg'],
        dpiOptions: [150, 300, 600, 1200],
        qualityRange: { min: 1, max: 100 },
        pageSizes: ['A4', 'Letter', 'Legal', 'Custom']
      }
    }
  });
});

/**
 * DELETE /api/powerpoint/cleanup/:filename
 * Clean up temporary files
 */
router.delete('/cleanup/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const outputDir = process.env.OUTPUT_DIR || './output';
    const filePath = path.join(outputDir, filename);

    // Security check
    const resolvedPath = path.resolve(filePath);
    const resolvedOutputDir = path.resolve(outputDir);
    
    if (!resolvedPath.startsWith(resolvedOutputDir)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Delete file if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.json({
      success: true,
      message: 'File cleaned up successfully'
    });

  } catch (error) {
    console.error('File cleanup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cleanup file'
    });
  }
});

export default router;