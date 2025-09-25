import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

export class PDFMerger {
  private pdfDoc: PDFDocument | null = null;
  private readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks for large files
  private readonly LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB threshold

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
      
      // Check file size to determine processing method
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      
      let pdfUint8Array: Uint8Array;
      
      if (fileSize > this.LARGE_FILE_THRESHOLD) {
        // Use streaming for large files to reduce memory usage
        pdfUint8Array = await this.readFileInChunks(filePath);
      } else {
        // Use direct read for smaller files (faster)
        const pdfBuffer = fs.readFileSync(filePath);
        pdfUint8Array = new Uint8Array(pdfBuffer);
      }
      
      // Load the PDF using the Uint8Array
      const pdf = await PDFDocument.load(pdfUint8Array);
      const pages = await pdfDoc.copyPages(pdf, pdf.getPageIndices());
      
      pages.forEach(page => {
        pdfDoc.addPage(page);
      });

      // Force garbage collection for large files
      if (fileSize > this.LARGE_FILE_THRESHOLD && global.gc) {
        global.gc();
      }
      
    } catch (error) {
      throw new Error(`Failed to add PDF file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async readFileInChunks(filePath: string): Promise<Uint8Array> {
    const chunks: Buffer[] = [];
    const readStream = createReadStream(filePath, { highWaterMark: this.CHUNK_SIZE });
    
    return new Promise((resolve, reject) => {
      readStream.on('data', (chunk: string | Buffer) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      
      readStream.on('end', () => {
        const totalBuffer = Buffer.concat(chunks);
        const uint8Array = new Uint8Array(totalBuffer);
        resolve(uint8Array);
      });
      
      readStream.on('error', reject);
    });
  }

  async save(outputPath: string): Promise<void> {
    try {
      const pdfDoc = await this.ensureInitialized();
      
      const pdfBytes = await pdfDoc.save();
      
      // Use streaming for large output files
      if (pdfBytes.length > this.LARGE_FILE_THRESHOLD) {
        await this.writeFileInChunks(outputPath, pdfBytes);
      } else {
        fs.writeFileSync(outputPath, pdfBytes);
      }
      
    } catch (error) {
      throw new Error(`Failed to save merged PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async writeFileInChunks(outputPath: string, data: Uint8Array): Promise<void> {
    const writeStream = createWriteStream(outputPath);
    
    return new Promise((resolve, reject) => {
      let offset = 0;
      
      const writeChunk = () => {
        if (offset >= data.length) {
          writeStream.end();
          return;
        }
        
        const chunkEnd = Math.min(offset + this.CHUNK_SIZE, data.length);
        const chunk = data.slice(offset, chunkEnd);
        
        writeStream.write(Buffer.from(chunk), (error) => {
          if (error) {
            reject(error);
            return;
          }
          
          offset = chunkEnd;
          setImmediate(writeChunk); // Use setImmediate to prevent blocking
        });
      };
      
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);
      
      writeChunk();
    });
  }
}