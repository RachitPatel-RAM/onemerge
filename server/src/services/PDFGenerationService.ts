import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, PageSizes } from 'pdf-lib';
import sharp from 'sharp';

export interface PDFOptions {
  pageSize?: 'A4' | 'Letter' | 'Legal' | 'Custom';
  customWidth?: number;
  customHeight?: number;
  margin?: number;
  quality?: number;
  maintainAspectRatio?: boolean;
  backgroundColor?: string;
}

export interface ImageInput {
  buffer: Buffer;
  width?: number;
  height?: number;
  name?: string;
}

export class PDFGenerationService {
  private outputDir: string;

  constructor() {
    this.outputDir = process.env.OUTPUT_DIR || './output';
    this.ensureOutputDir();
  }

  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Create PDF from multiple images (slides)
   */
  async createPDFFromImages(
    images: ImageInput[],
    outputFileName: string,
    options: PDFOptions = {}
  ): Promise<string> {
    try {
      const pdfDoc = await PDFDocument.create();
      
      // Set default options
      const opts = {
        pageSize: 'Custom' as const,
        margin: 0,
        quality: 95,
        maintainAspectRatio: true,
        backgroundColor: '#ffffff',
        ...options
      };

      for (let i = 0; i < images.length; i++) {
        const imageInput = images[i];
        await this.addImageToPDF(pdfDoc, imageInput, opts, i + 1);
      }

      // Save PDF
      const outputPath = path.join(this.outputDir, outputFileName);
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, pdfBytes);

      return outputPath;
    } catch (error) {
      console.error('Error creating PDF from images:', error);
      throw new Error(`Failed to create PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a single image to PDF document
   */
  private async addImageToPDF(
    pdfDoc: PDFDocument,
    imageInput: ImageInput,
    options: PDFOptions & { pageSize: string },
    slideNumber: number
  ): Promise<void> {
    try {
      // Get image metadata
      const metadata = await sharp(imageInput.buffer).metadata();
      const imageWidth = imageInput.width || metadata.width || 1920;
      const imageHeight = imageInput.height || metadata.height || 1080;

      // Determine page dimensions
      let pageWidth: number;
      let pageHeight: number;

      if (options.pageSize === 'Custom') {
        pageWidth = options.customWidth || imageWidth;
        pageHeight = options.customHeight || imageHeight;
      } else {
        const pageSize = this.getPageSize(options.pageSize);
        pageWidth = pageSize.width;
        pageHeight = pageSize.height;
      }

      // Create page
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      // Set background color if specified
      if (options.backgroundColor && options.backgroundColor !== '#ffffff') {
        const bgColor = this.hexToRgb(options.backgroundColor);
        page.drawRectangle({
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
          color: rgb(bgColor.r / 255, bgColor.g / 255, bgColor.b / 255),
        });
      }

      // Embed image
      let embeddedImage;
      const imageFormat = this.detectImageFormat(imageInput.buffer);

      if (imageFormat === 'png') {
        embeddedImage = await pdfDoc.embedPng(new Uint8Array(imageInput.buffer.buffer, imageInput.buffer.byteOffset, imageInput.buffer.byteLength));
      } else if (imageFormat === 'jpeg') {
        embeddedImage = await pdfDoc.embedJpg(new Uint8Array(imageInput.buffer.buffer, imageInput.buffer.byteOffset, imageInput.buffer.byteLength));
      } else {
        // Convert to PNG if unsupported format
        const pngBuffer = await sharp(imageInput.buffer).png().toBuffer();
        embeddedImage = await pdfDoc.embedPng(new Uint8Array(pngBuffer.buffer, pngBuffer.byteOffset, pngBuffer.byteLength));
      }

      // Calculate image placement
      const margin = options.margin || 0;
      const availableWidth = pageWidth - (margin * 2);
      const availableHeight = pageHeight - (margin * 2);

      let drawWidth = availableWidth;
      let drawHeight = availableHeight;
      let x = margin;
      let y = margin;

      if (options.maintainAspectRatio) {
        // Calculate scaling to maintain aspect ratio
        const scaleX = availableWidth / imageWidth;
        const scaleY = availableHeight / imageHeight;
        const scale = Math.min(scaleX, scaleY);

        drawWidth = imageWidth * scale;
        drawHeight = imageHeight * scale;

        // Center the image
        x = (pageWidth - drawWidth) / 2;
        y = (pageHeight - drawHeight) / 2;
      }

      // Draw image
      page.drawImage(embeddedImage, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });

      // Add slide number if multiple slides
      if (slideNumber > 0) {
        page.drawText(`Slide ${slideNumber}`, {
          x: pageWidth - 100,
          y: 20,
          size: 10,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

    } catch (error) {
      console.error(`Error adding image ${slideNumber} to PDF:`, error);
      throw error;
    }
  }

  /**
   * Create PDF from PowerPoint slides with enhanced options
   */
  async createPDFFromSlides(
    slideImages: Array<{ buffer: Buffer; width: number; height: number; slideNumber: number }>,
    outputFileName: string,
    options: PDFOptions = {}
  ): Promise<string> {
    try {
      const images: ImageInput[] = slideImages.map(slide => ({
        buffer: slide.buffer,
        width: slide.width,
        height: slide.height,
        name: `Slide ${slide.slideNumber}`
      }));

      return await this.createPDFFromImages(images, outputFileName, {
        pageSize: 'Custom',
        maintainAspectRatio: true,
        ...options
      });
    } catch (error) {
      console.error('Error creating PDF from slides:', error);
      throw error;
    }
  }

  /**
   * Merge multiple PDFs into one
   */
  async mergePDFs(pdfPaths: string[], outputFileName: string): Promise<string> {
    try {
      const mergedPdf = await PDFDocument.create();

      for (const pdfPath of pdfPaths) {
        const pdfBytes = fs.readFileSync(pdfPath);
        const pdf = await PDFDocument.load(new Uint8Array(pdfBytes.buffer, pdfBytes.byteOffset, pdfBytes.byteLength));
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const outputPath = path.join(this.outputDir, outputFileName);
      const pdfBytes = await mergedPdf.save();
      fs.writeFileSync(outputPath, pdfBytes);

      return outputPath;
    } catch (error) {
      console.error('Error merging PDFs:', error);
      throw new Error(`Failed to merge PDFs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get page size dimensions
   */
  private getPageSize(pageSize: string): { width: number; height: number } {
    switch (pageSize) {
      case 'A4':
        return { width: 595.28, height: 841.89 }; // A4 in points
      case 'Letter':
        return { width: 612, height: 792 }; // US Letter in points
      case 'Legal':
        return { width: 612, height: 1008 }; // US Legal in points
      default:
        return { width: 612, height: 792 }; // Default to Letter
    }
  }

  /**
   * Detect image format from buffer
   */
  private detectImageFormat(buffer: Buffer): 'png' | 'jpeg' | 'unknown' {
    // Convert Buffer to Uint8Array for proper type compatibility
    const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    
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
    
    return 'unknown';
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  /**
   * Optimize image for PDF embedding
   */
  async optimizeImageForPDF(
    buffer: Buffer,
    options: { quality?: number; maxWidth?: number; maxHeight?: number } = {}
  ): Promise<Buffer> {
    try {
      let sharpInstance = sharp(buffer);

      // Resize if dimensions are specified
      if (options.maxWidth || options.maxHeight) {
        sharpInstance = sharpInstance.resize(options.maxWidth, options.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Convert to appropriate format with quality settings
      const metadata = await sharp(buffer).metadata();
      
      if (metadata.hasAlpha) {
        // Use PNG for images with transparency
        return await sharpInstance.png({ quality: options.quality || 95 }).toBuffer();
      } else {
        // Use JPEG for images without transparency
        return await sharpInstance.jpeg({ quality: options.quality || 95 }).toBuffer();
      }
    } catch (error) {
      console.error('Error optimizing image:', error);
      return buffer; // Return original if optimization fails
    }
  }

  /**
   * Get PDF metadata
   */
  async getPDFInfo(filePath: string): Promise<{
    pageCount: number;
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
  }> {
    try {
      const pdfBytes = fs.readFileSync(filePath);
      const pdf = await PDFDocument.load(new Uint8Array(pdfBytes.buffer, pdfBytes.byteOffset, pdfBytes.byteLength));
      
      return {
        pageCount: pdf.getPageCount(),
        title: pdf.getTitle(),
        author: pdf.getAuthor(),
        subject: pdf.getSubject(),
        creator: pdf.getCreator(),
      };
    } catch (error) {
      console.error('Error getting PDF info:', error);
      throw new Error(`Failed to read PDF info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}