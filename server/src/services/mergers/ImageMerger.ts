import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class ImageMerger {
  private images: { buffer: Buffer; width: number; height: number; filename: string }[] = [];

  async addImage(filePath: string): Promise<void> {
    try {
      const buffer = fs.readFileSync(filePath);
      const metadata = await sharp(buffer).metadata();
      const filename = path.basename(filePath);
      
      this.images.push({
        buffer,
        width: metadata.width || 0,
        height: metadata.height || 0,
        filename
      });
    } catch (error) {
      throw new Error(`Failed to add image: ${error}`);
    }
  }

  async mergeVertically(outputPath: string): Promise<void> {
    if (this.images.length === 0) {
      throw new Error('No images to merge');
    }

    try {
      // Calculate total height and max width
      const maxWidth = Math.max(...this.images.map(img => img.width));
      const totalHeight = this.images.reduce((sum, img) => sum + img.height, 0);

      // Create a blank canvas
      let canvas = sharp({
        create: {
          width: maxWidth,
          height: totalHeight,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      });

      // Prepare composite operations
      const composite: any[] = [];
      let currentTop = 0;

      for (const image of this.images) {
        // Resize image to fit max width while maintaining aspect ratio
        const resizedBuffer = await sharp(image.buffer)
          .resize(maxWidth, null, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .toBuffer();

        composite.push({
          input: resizedBuffer,
          top: currentTop,
          left: 0
        });

        const resizedMetadata = await sharp(resizedBuffer).metadata();
        currentTop += resizedMetadata.height || 0;
      }

      // Apply composite and save
      await canvas
        .composite(composite)
        .jpeg({ quality: 90 })
        .toFile(outputPath);

    } catch (error) {
      throw new Error(`Failed to merge images: ${error}`);
    }
  }

  async convertToPDF(filePath: string): Promise<string> {
    const { PDFDocument } = require('pdf-lib');
    const tempDir = process.env.TEMP_DIR || './temp';
    const tempPdfPath = path.join(tempDir, `${uuidv4()}.pdf`);

    // Input validation
    if (!filePath) {
      throw new Error('File path is required');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Image file not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error(`Image file is empty: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    const supportedFormats = ['.jpg', '.jpeg', '.png'];
    if (!supportedFormats.includes(ext)) {
      throw new Error(`Unsupported image format: ${ext}. Supported formats: ${supportedFormats.join(', ')}`);
    }

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    console.log(`Converting image to PDF: ${filePath}`);

    try {
      const imageBuffer = fs.readFileSync(filePath);
      
      // Validate image buffer
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Failed to read image file or file is empty');
      }

      const pdfDoc = await PDFDocument.create();
      
      // Determine image type and embed accordingly
      const ext = path.extname(filePath).toLowerCase();
      let image;
      
      if (ext === '.jpg' || ext === '.jpeg') {
        image = await pdfDoc.embedJpg(imageBuffer);
      } else if (ext === '.png') {
        image = await pdfDoc.embedPng(imageBuffer);
      } else {
        throw new Error(`Unsupported image format: ${ext}`);
      }

      const page = pdfDoc.addPage();
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      // Calculate scaling to fit image on page
      const imageAspectRatio = image.width / image.height;
      const pageAspectRatio = pageWidth / pageHeight;
      
      let scaledWidth, scaledHeight;
      
      if (imageAspectRatio > pageAspectRatio) {
        // Image is wider relative to page
        scaledWidth = pageWidth * 0.9; // 90% of page width
        scaledHeight = scaledWidth / imageAspectRatio;
      } else {
        // Image is taller relative to page
        scaledHeight = pageHeight * 0.9; // 90% of page height
        scaledWidth = scaledHeight * imageAspectRatio;
      }

      // Center the image on the page
      const x = (pageWidth - scaledWidth) / 2;
      const y = (pageHeight - scaledHeight) / 2;

      page.drawImage(image, {
        x,
        y,
        width: scaledWidth,
        height: scaledHeight,
      });

      const pdfBytes = await pdfDoc.save();
      
      if (!pdfBytes || pdfBytes.length === 0) {
        throw new Error('Generated PDF is empty');
      }

      fs.writeFileSync(tempPdfPath, pdfBytes);
      
      // Validate output file
      if (!fs.existsSync(tempPdfPath)) {
        throw new Error('Failed to create PDF file');
      }

      const outputStats = fs.statSync(tempPdfPath);
      if (outputStats.size === 0) {
        throw new Error('Generated PDF file is empty');
      }

      console.log(`Successfully converted image to PDF: ${tempPdfPath} (${outputStats.size} bytes)`);
      return tempPdfPath;
    } catch (error) {
      console.error(`Image to PDF conversion failed for ${filePath}:`, error);
      
      // Clean up any partial files
      if (fs.existsSync(tempPdfPath)) {
        try {
          fs.unlinkSync(tempPdfPath);
        } catch (cleanupError) {
          console.warn(`Failed to clean up partial PDF file: ${cleanupError}`);
        }
      }
      
      throw new Error(`Failed to convert image to PDF: ${error instanceof Error ? error.message : error}`);
    }
  }
}