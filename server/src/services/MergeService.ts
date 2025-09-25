import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { createError } from '../middleware/errorHandler';
import { PDFMerger } from './mergers/PDFMerger';
import { DocumentMerger } from './mergers/DocumentMerger';
import { ImageMerger } from './mergers/ImageMerger';
import { SpreadsheetMerger } from './mergers/SpreadsheetMerger';
import { PresentationMerger } from './mergers/PresentationMerger';
import { TextMerger } from './mergers/TextMerger';

export interface MergeOptions {
  files: Express.Multer.File[];
  outputFormat: string;
  documentName: string;
  mergeOrder?: string[];
}

export interface MergeResult {
  filename: string;
  fileSize: number;
  processedFiles: number;
}

export class MergeService {
  private outputDir: string;

  constructor() {
    this.outputDir = process.env.OUTPUT_DIR || './output';
    this.ensureOutputDirectory();
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async mergeFiles(options: MergeOptions): Promise<MergeResult> {
    const { files, outputFormat, documentName, mergeOrder } = options;

    // Sort files according to merge order if provided
    const sortedFiles = this.sortFilesByOrder(files, mergeOrder);

    // Group files by type
    const fileGroups = this.groupFilesByType(sortedFiles);

    // Validate compatibility
    this.validateFileCompatibility(fileGroups, outputFormat);

    // Generate output filename
    const outputFilename = this.generateOutputFilename(documentName, outputFormat);
    const outputPath = path.join(this.outputDir, outputFilename);

    let result: MergeResult;

    try {
      switch (outputFormat.toLowerCase()) {
        case 'pdf':
          result = await this.mergeToPDF(fileGroups, outputPath);
          break;
        case 'docx':
          result = await this.mergeToDocx(fileGroups, outputPath);
          break;
        case 'zip':
          result = await this.mergeToZip(fileGroups, outputPath);
          break;
        default:
          throw createError(`Unsupported output format: ${outputFormat}`, 400);
      }

      // Clean up uploaded files
      this.cleanupUploadedFiles(files);

      return {
        ...result,
        filename: outputFilename,
        processedFiles: files.length
      };

    } catch (error) {
      // Clean up on error
      this.cleanupUploadedFiles(files);
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      throw error;
    }
  }

  private sortFilesByOrder(files: Express.Multer.File[], mergeOrder?: string[]): Express.Multer.File[] {
    if (!mergeOrder || mergeOrder.length === 0) {
      return files;
    }

    const sortedFiles: Express.Multer.File[] = [];
    const fileMap = new Map<string, Express.Multer.File>();

    // Create a map of original filenames to file objects
    files.forEach(file => {
      fileMap.set(file.originalname, file);
    });

    // Add files in the specified order
    mergeOrder.forEach(filename => {
      const file = fileMap.get(filename);
      if (file) {
        sortedFiles.push(file);
        fileMap.delete(filename);
      }
    });

    // Add any remaining files
    fileMap.forEach(file => {
      sortedFiles.push(file);
    });

    return sortedFiles;
  }

  private groupFilesByType(files: Express.Multer.File[]): Map<string, Express.Multer.File[]> {
    const groups = new Map<string, Express.Multer.File[]>();

    files.forEach(file => {
      const extension = path.extname(file.originalname).toLowerCase().substring(1);
      if (!groups.has(extension)) {
        groups.set(extension, []);
      }
      groups.get(extension)!.push(file);
    });

    return groups;
  }

  private validateFileCompatibility(fileGroups: Map<string, Express.Multer.File[]>, outputFormat: string): void {
    const supportedInputs = Array.from(fileGroups.keys());
    const unsupportedTypes = supportedInputs.filter(type => 
      !['pdf', 'docx', 'txt', 'pptx', 'xlsx', 'csv', 'jpg', 'jpeg', 'png'].includes(type)
    );

    if (unsupportedTypes.length > 0) {
      throw createError(`Unsupported file types: ${unsupportedTypes.join(', ')}`, 400);
    }

    // Validate output format compatibility
    if (!['pdf', 'docx', 'zip'].includes(outputFormat.toLowerCase())) {
      throw createError(`Unsupported output format: ${outputFormat}`, 400);
    }
  }

  private generateOutputFilename(documentName: string, outputFormat: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueId = uuidv4().substring(0, 8);
    return `${documentName}-${timestamp}-${uniqueId}.${outputFormat.toLowerCase()}`;
  }

  private async mergeToPDF(fileGroups: Map<string, Express.Multer.File[]>, outputPath: string): Promise<MergeResult> {
    const pdfMerger = new PDFMerger();
    const documentMerger = new DocumentMerger();
    const imageMerger = new ImageMerger();
    const textMerger = new TextMerger();
    const spreadsheetMerger = new SpreadsheetMerger();
    const presentationMerger = new PresentationMerger();

    const tempPdfPaths: string[] = [];
    const conversionPromises: Promise<string>[] = [];

    try {
      // Create conversion promises for parallel processing
      for (const [type, files] of fileGroups) {
        for (const file of files) {
          const conversionPromise = this.convertFileToPDF(
            file, 
            type, 
            documentMerger, 
            imageMerger, 
            textMerger, 
            spreadsheetMerger, 
            presentationMerger
          );
          conversionPromises.push(conversionPromise);
        }
      }

      // Process all conversions in parallel with controlled concurrency
      const batchSize = Math.min(4, conversionPromises.length); // Limit concurrent operations
      const convertedPdfPaths: string[] = [];
      const originalFilePaths = new Set<string>();

      // Track original PDF file paths
      for (const [type, files] of fileGroups) {
        if (type === 'pdf') {
          files.forEach(file => originalFilePaths.add(file.path));
        }
      }

      for (let i = 0; i < conversionPromises.length; i += batchSize) {
        const batch = conversionPromises.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch);
        convertedPdfPaths.push(...batchResults);
        
        // Track temp files for cleanup (exclude original PDFs)
        batchResults.forEach(path => {
          if (!originalFilePaths.has(path)) {
            tempPdfPaths.push(path);
          }
        });
      }

      // Add all converted PDFs to merger in order
      for (const pdfPath of convertedPdfPaths) {
        await pdfMerger.addFile(pdfPath);
      }

      await pdfMerger.save(outputPath);

      const stats = fs.statSync(outputPath);
      return {
        filename: path.basename(outputPath),
        fileSize: stats.size,
        processedFiles: 0
      };

    } finally {
      // Clean up temporary PDF files
      tempPdfPaths.forEach(tempPath => {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      });
    }
  }

  private async convertFileToPDF(
    file: Express.Multer.File,
    type: string,
    documentMerger: DocumentMerger,
    imageMerger: ImageMerger,
    textMerger: TextMerger,
    spreadsheetMerger: SpreadsheetMerger,
    presentationMerger: PresentationMerger
  ): Promise<string> {
    switch (type) {
      case 'pdf':
        return file.path;
      case 'docx':
        return await documentMerger.convertToPDF(file.path);
      case 'txt':
        return await textMerger.convertToPDF(file.path);
      case 'jpg':
      case 'jpeg':
      case 'png':
        return await imageMerger.convertToPDF(file.path);
      case 'xlsx':
        return await spreadsheetMerger.convertToPDF(file.path);
      case 'pptx':
        return await presentationMerger.convertToPDF(file.path);
      case 'csv':
        return await textMerger.convertCSVToPDF(file.path);
      default:
        throw createError(`Cannot convert ${type} to PDF`, 400);
    }
  }

  private async mergeToDocx(fileGroups: Map<string, Express.Multer.File[]>, outputPath: string): Promise<MergeResult> {
    const documentMerger = new DocumentMerger();
    const textMerger = new TextMerger();
    const imageMerger = new ImageMerger();

    for (const [type, files] of fileGroups) {
      for (const file of files) {
        switch (type) {
          case 'docx':
            await documentMerger.addDocx(file.path);
            break;
          case 'txt':
            await documentMerger.addText(file.path);
            break;
          case 'jpg':
          case 'jpeg':
          case 'png':
            await documentMerger.addImage(file.path);
            break;
          default:
            throw createError(`Cannot merge ${type} into DOCX`, 400);
        }
      }
    }

    await documentMerger.save(outputPath);

    const stats = fs.statSync(outputPath);
    return {
      filename: path.basename(outputPath),
      fileSize: stats.size,
      processedFiles: 0
    };
  }

  private async mergeToZip(fileGroups: Map<string, Express.Multer.File[]>, outputPath: string): Promise<MergeResult> {
    const archiver = require('archiver');
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        const stats = fs.statSync(outputPath);
        resolve({
          filename: path.basename(outputPath),
          fileSize: stats.size,
          processedFiles: 0
        });
      });

      archive.on('error', (err: Error) => {
        reject(err);
      });

      archive.pipe(output);

      // Add all files to the archive
      for (const [type, files] of fileGroups) {
        files.forEach((file, index) => {
          const filename = `${type}_${index + 1}_${file.originalname}`;
          archive.file(file.path, { name: filename });
        });
      }

      archive.finalize();
    });
  }

  private cleanupUploadedFiles(files: Express.Multer.File[]): void {
    files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
  }
}