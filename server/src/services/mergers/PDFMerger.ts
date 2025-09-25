import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

export class PDFMerger {
  private pdfDoc: PDFDocument | null = null;

  async initialize(): Promise<void> {
    this.pdfDoc = await PDFDocument.create();
  }

  private async ensureInitialized(): Promise<PDFDocument> {
    if (!this.pdfDoc) {
      await this.initialize();
    }
    if (!this.pdfDoc) {
      throw new Error('Failed to initialize PDF document');
    }
    return this.pdfDoc;
  }

  async addFile(filePath: string): Promise<void> {
    try {
      const pdfDoc = await this.ensureInitialized();
      
      // Read the PDF file as a Buffer and convert to Uint8Array for pdf-lib
      const pdfBuffer = fs.readFileSync(filePath);
      const pdfUint8Array = new Uint8Array(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength);
      
      // Load the PDF using the Uint8Array
      const pdf = await PDFDocument.load(pdfUint8Array);
      const pages = await pdfDoc.copyPages(pdf, pdf.getPageIndices());
      
      pages.forEach(page => {
        pdfDoc.addPage(page);
      });
    } catch (error) {
      throw new Error(`Failed to add PDF file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async save(outputPath: string): Promise<void> {
    try {
      const pdfDoc = await this.ensureInitialized();
      
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, pdfBytes);
    } catch (error) {
      throw new Error(`Failed to save merged PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}