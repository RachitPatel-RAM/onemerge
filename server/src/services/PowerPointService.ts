import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { PDFDocument, rgb } from 'pdf-lib';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SlideImage {
  buffer: Buffer;
  width: number;
  height: number;
  slideNumber: number;
}

export interface ConversionOptions {
  outputFormat: 'pdf' | 'images';
  imageFormat: 'png' | 'jpeg';
  quality: number; // 1-100 for JPEG, ignored for PNG
  dpi: number; // Resolution for conversion
}

export class PowerPointService {
  private tempDir: string;

  constructor() {
    this.tempDir = process.env.TEMP_DIR || './temp';
    this.ensureTempDir();
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Convert PowerPoint file to high-resolution images
   */
  async convertToImages(
    filePath: string,
    options: ConversionOptions = {
      outputFormat: 'images',
      imageFormat: 'png',
      quality: 95,
      dpi: 300
    }
  ): Promise<SlideImage[]> {
    try {
      const fileExtension = path.extname(filePath).toLowerCase();
      
      if (!['.ppt', '.pptx'].includes(fileExtension)) {
        throw new Error('Unsupported file format. Only .ppt and .pptx files are supported.');
      }

      // Create temporary directory for this conversion
      const conversionId = Date.now().toString();
      const tempConversionDir = path.join(this.tempDir, `ppt_conversion_${conversionId}`);
      fs.mkdirSync(tempConversionDir, { recursive: true });

      try {
        // Convert PowerPoint to images using LibreOffice
        const slideImages = await this.convertWithLibreOffice(filePath, tempConversionDir, options);
        
        return slideImages;
      } finally {
        // Clean up temporary files
        this.cleanupTempDir(tempConversionDir);
      }
    } catch (error) {
      console.error('Error converting PowerPoint to images:', error);
      throw new Error(`Failed to convert PowerPoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert PowerPoint slides to PDF
   */
  async convertToPDF(
    filePath: string,
    outputPath: string,
    options: ConversionOptions = {
      outputFormat: 'pdf',
      imageFormat: 'png',
      quality: 95,
      dpi: 300
    }
  ): Promise<string> {
    try {
      // First convert to images
      const slideImages = await this.convertToImages(filePath, options);
      
      // Create PDF from images
      const pdfPath = await this.createPDFFromImages(slideImages, outputPath);
      
      return pdfPath;
    } catch (error) {
      console.error('Error converting PowerPoint to PDF:', error);
      throw new Error(`Failed to convert PowerPoint to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert PowerPoint using enhanced LibreOffice headless mode
   */
  private async convertWithLibreOffice(
    inputPath: string,
    outputDir: string,
    options: ConversionOptions
  ): Promise<SlideImage[]> {
    try {
      // Use the enhanced PresentationMerger for better conversion
      const { PresentationMerger } = require('./mergers/PresentationMerger');
      const presentationMerger = new PresentationMerger();
      
      // Convert PowerPoint to PDF using the enhanced merger
      const pdfPath = await presentationMerger.convertToPDF(inputPath);
      
      if (!fs.existsSync(pdfPath)) {
        throw new Error('Enhanced PowerPoint conversion failed - PDF not created');
      }

      // Convert PDF pages to images using ImageMagick or similar
      const slideImages = await this.convertPDFToImages(pdfPath, outputDir, options);
      
      return slideImages;
    } catch (error) {
      // Fallback: Try alternative conversion method
      console.warn('Enhanced LibreOffice conversion failed, trying alternative method:', error);
      return await this.convertWithAlternativeMethod(inputPath, outputDir, options);
    }
  }

  /**
   * Alternative conversion method (fallback)
   */
  private async convertWithAlternativeMethod(
    inputPath: string,
    outputDir: string,
    options: ConversionOptions
  ): Promise<SlideImage[]> {
    try {
      console.log('Using enhanced PPTX parsing as fallback conversion method');
      
      // Use the enhanced PresentationMerger for PPTX parsing
      const { PresentationMerger } = require('./mergers/PresentationMerger');
      const presentationMerger = new PresentationMerger();
      
      // Convert PowerPoint to PDF using enhanced parsing
      const pdfPath = await presentationMerger.convertToPDF(inputPath);
      
      if (!fs.existsSync(pdfPath)) {
        throw new Error('Enhanced PPTX parsing conversion failed - PDF not created');
      }

      // Convert PDF pages to images
      const slideImages = await this.convertPDFToImages(pdfPath, outputDir, options);
      
      console.log(`Alternative conversion successful: ${slideImages.length} slides processed`);
      return slideImages;
    } catch (error) {
      console.error('Alternative conversion method failed:', error);
      throw new Error(`PowerPoint conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert PDF pages to high-resolution images
   */
  private async convertPDFToImages(
    pdfPath: string,
    outputDir: string,
    options: ConversionOptions
  ): Promise<SlideImage[]> {
    try {
      const imageFormat = options.imageFormat;
      const dpi = options.dpi;
      
      // Use ImageMagick to convert PDF to images
      const outputPattern = path.join(outputDir, `slide-%03d.${imageFormat}`);
      const magickCmd = `magick -density ${dpi} "${pdfPath}" -quality ${options.quality} "${outputPattern}"`;
      
      await execAsync(magickCmd);
      
      // Read generated images
      const slideImages: SlideImage[] = [];
      const files = fs.readdirSync(outputDir)
        .filter(file => file.startsWith('slide-') && file.endsWith(`.${imageFormat}`))
        .sort();

      for (let i = 0; i < files.length; i++) {
        const imagePath = path.join(outputDir, files[i]);
        const imageBuffer = fs.readFileSync(imagePath);
        
        // Get image dimensions
        const metadata = await sharp(imageBuffer).metadata();
        
        slideImages.push({
          buffer: imageBuffer,
          width: metadata.width || 1920,
          height: metadata.height || 1080,
          slideNumber: i + 1
        });
      }

      return slideImages;
    } catch (error) {
      console.error('Error converting PDF to images:', error);
      throw new Error('Failed to convert PDF to images. Please ensure ImageMagick is installed.');
    }
  }

  /**
   * Create PDF from slide images
   */
  private async createPDFFromImages(slideImages: SlideImage[], outputPath: string): Promise<string> {
    try {
      const pdfDoc = await PDFDocument.create();
      
      for (const slide of slideImages) {
        // Embed image in PDF
        let image;
        const imageFormat = this.detectImageFormat(slide.buffer);
        
        if (imageFormat === 'png') {
          image = await pdfDoc.embedPng(new Uint8Array(slide.buffer));
        } else if (imageFormat === 'jpeg') {
          image = await pdfDoc.embedJpg(new Uint8Array(slide.buffer));
        } else {
          throw new Error(`Unsupported image format: ${imageFormat}`);
        }
        
        // Create page with slide dimensions
        const page = pdfDoc.addPage([slide.width, slide.height]);
        
        // Draw image to fill the entire page
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: slide.width,
          height: slide.height,
        });
      }
      
      // Save PDF
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, pdfBytes);
      
      return outputPath;
    } catch (error) {
      console.error('Error creating PDF from images:', error);
      throw new Error(`Failed to create PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect image format from buffer
   */
  private detectImageFormat(buffer: Buffer): 'png' | 'jpeg' {
    // Convert Buffer to Uint8Array for proper type compatibility
    const uint8Array = new Uint8Array(buffer);
    
    // Check PNG signature
    if (uint8Array.length >= 8 && 
        uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && 
        uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
      return 'png';
    }
    
    // Check JPEG signature
    if (uint8Array.length >= 2 && 
        uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
      return 'jpeg';
    }
    
    // Default to PNG
    return 'png';
  }

  /**
   * Clean up temporary directory
   */
  private cleanupTempDir(dirPath: string): void {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Failed to cleanup temporary directory:', error);
    }
  }

  /**
   * Get supported file formats
   */
  static getSupportedFormats(): string[] {
    return ['.ppt', '.pptx'];
  }

  /**
   * Validate PowerPoint file
   */
  static isValidPowerPointFile(filePath: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    return this.getSupportedFormats().includes(extension);
  }
}