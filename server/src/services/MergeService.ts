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
import { ValidationService, ValidationResult, ConversionValidation } from './ValidationService';
import { PerformanceOptimizationService, PerformanceResult } from './PerformanceOptimizationService';
import { MetadataService, DocumentMetadata, MetadataExtractionResult } from './MetadataService';

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
  validationResults?: ValidationResult[];
  performanceMetrics?: {
    totalProcessingTime: number;
    conversionTime: number;
    validationTime: number;
    memoryUsage: number;
  };
  integrityScore?: number;
  metadata?: {
    extractedMetadata: MetadataExtractionResult[];
    mergedMetadata: DocumentMetadata;
    metadataSummary: string;
  };
}

export class MergeService {
  private outputDir: string;
  private validationService: ValidationService;
  private performanceService: PerformanceOptimizationService;
  private metadataService: MetadataService;

  constructor() {
    this.outputDir = process.env.OUTPUT_DIR || './output';
    this.validationService = new ValidationService();
    this.performanceService = new PerformanceOptimizationService({
      maxConcurrentOperations: 6,
      memoryThreshold: 2048, // 2GB
      cpuThreshold: 85,
      enableParallelProcessing: true,
      enableMemoryOptimization: true,
      enableResourceMonitoring: true,
      batchSize: 4,
      workerPoolSize: 4
    });
    this.metadataService = new MetadataService();
    this.ensureOutputDirectory();
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async mergeFiles(options: MergeOptions): Promise<MergeResult> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    const { files, outputFormat, documentName, mergeOrder } = options;

    console.log(`[MergeService] Starting merge operation for ${files.length} files to ${outputFormat}`);

    // Validate all input files first
    const inputValidationResults: ValidationResult[] = [];
    for (const file of files) {
      try {
        const validation = await this.validationService.validateInputFile(file.path);
        inputValidationResults.push(validation);
        
        if (!validation.isValid) {
          throw createError(`Input validation failed for ${file.originalname}: ${validation.errors.join(', ')}`, 400);
        }
      } catch (error) {
        console.error(`[MergeService] Input validation error for ${file.originalname}:`, error);
        throw createError(`Failed to validate input file ${file.originalname}: ${error instanceof Error ? error.message : String(error)}`, 400);
      }
    }

    // Sort files according to merge order if provided
    const sortedFiles = this.sortFilesByOrder(files, mergeOrder);

    // Group files by type
    const fileGroups = this.groupFilesByType(sortedFiles);

    // Validate compatibility
    this.validateFileCompatibility(fileGroups, outputFormat);

    // Extract metadata from all input files
    console.log(`[MergeService] Extracting metadata from ${files.length} files`);
    const extractedMetadata: MetadataExtractionResult[] = [];
    
    for (const file of files) {
      try {
        const metadata = await this.metadataService.extractMetadata(file.path);
        extractedMetadata.push(metadata);
      } catch (error) {
        console.warn(`[MergeService] Failed to extract metadata from ${file.originalname}:`, error);
        // Continue with empty metadata for this file
        extractedMetadata.push({
          fileType: path.extname(file.originalname).slice(1),
          fileSize: file.size || 0,
          extractionTime: 0,
          success: false,
          metadata: {
            title: file.originalname,
            author: '',
            subject: '',
            keywords: '',
            creator: '',
            producer: '',
            creationDate: new Date(),
            modificationDate: new Date(),
            pages: 0,
            words: 0,
            language: '',
            customProperties: {}
          },
          errors: [error instanceof Error ? error.message : String(error)]
        });
      }
    }

    // Merge metadata from all sources
    const mergedMetadata = this.metadataService.mergeMetadata(extractedMetadata.map(em => em.metadata));
    const metadataSummary = this.metadataService.generateMetadataSummary(mergedMetadata);

    // Generate output filename
    const outputFilename = this.generateOutputFilename(documentName, outputFormat);
    const outputPath = path.join(this.outputDir, outputFilename);

    let result: MergeResult;
    const conversionStartTime = Date.now();

    try {
      switch (outputFormat.toLowerCase()) {
        case 'pdf':
          result = await this.mergeToPDF(fileGroups, outputPath, mergedMetadata);
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

      const conversionTime = Date.now() - conversionStartTime;
      const validationStartTime = Date.now();

      // Validate output file
      let outputValidation: ValidationResult;
      let conversionValidations: ConversionValidation[] = [];
      
      try {
        outputValidation = await this.validationService.validateOutputFile(outputPath, outputFormat);
        
        if (!outputValidation.isValid) {
          console.warn(`[MergeService] Output validation warnings for ${outputFilename}:`, outputValidation.warnings);
        }

        // Perform comprehensive conversion validation for each input file
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const inputValidation = inputValidationResults[i];
          
          try {
            const conversionValidation = await this.validationService.validateConversion(
              file.path,
              outputPath,
              conversionStartTime,
              Date.now()
            );
            conversionValidations.push(conversionValidation);
          } catch (validationError) {
            console.warn(`[MergeService] Conversion validation failed for ${file.originalname}:`, validationError);
            // Continue with other validations even if one fails
          }
        }
      } catch (validationError) {
        console.error(`[MergeService] Output validation error:`, validationError);
        // Don't fail the entire operation for validation errors, but log them
      }

      const validationTime = Date.now() - validationStartTime;
      const totalTime = Date.now() - startTime;
      const endMemory = process.memoryUsage().heapUsed;

      // Calculate integrity score based on validation results
      const allValidations = [
        ...inputValidationResults, 
        ...conversionValidations.flatMap(cv => [cv.inputValidation, cv.outputValidation, cv.integrityCheck])
      ];
      const integrityScore = this.calculateIntegrityScore(allValidations);

      // Clean up uploaded files
      this.cleanupUploadedFiles(files);

      console.log(`[MergeService] Merge operation completed successfully in ${totalTime}ms`);

      return {
        ...result,
        filename: outputFilename,
        processedFiles: files.length,
        validationResults: allValidations,
        performanceMetrics: {
          totalProcessingTime: totalTime,
          conversionTime,
          validationTime,
          memoryUsage: endMemory - startMemory
        },
        integrityScore,
        metadata: {
          extractedMetadata,
          mergedMetadata,
          metadataSummary
        }
      };

    } catch (error) {
      console.error(`[MergeService] Merge operation failed:`, error);
      
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

  private async mergeToPDF(fileGroups: Map<string, Express.Multer.File[]>, outputPath: string, mergedMetadata?: DocumentMetadata): Promise<MergeResult> {
    const pdfMerger = new PDFMerger();
    const documentMerger = new DocumentMerger();
    const imageMerger = new ImageMerger();
    const textMerger = new TextMerger();
    const spreadsheetMerger = new SpreadsheetMerger();
    const presentationMerger = new PresentationMerger();

    const tempPdfPaths: string[] = [];
    const originalFilePaths = new Set<string>();

    try {
      // Track original PDF file paths
      for (const [type, files] of fileGroups) {
        if (type === 'pdf') {
          files.forEach(file => originalFilePaths.add(file.path));
        }
      }

      // Create conversion operations for optimized parallel processing
      const conversionOperations: Array<() => Promise<string>> = [];
      
      for (const [type, files] of fileGroups) {
        for (const file of files) {
          const operation = () => this.convertFileToPDF(
            file, 
            type, 
            documentMerger, 
            imageMerger, 
            textMerger, 
            spreadsheetMerger, 
            presentationMerger
          );
          conversionOperations.push(operation);
        }
      }

      console.log(`[MergeService] Processing ${conversionOperations.length} file conversions with performance optimization`);

      // Use PerformanceOptimizationService for optimized parallel processing
      const performanceResult: PerformanceResult<string[]> = await this.performanceService.executeOptimized(
        conversionOperations,
        'pdf-conversion'
      );

      const convertedPdfPaths = performanceResult.result;

      // Track temp files for cleanup (exclude original PDFs)
      convertedPdfPaths.forEach(path => {
        if (!originalFilePaths.has(path)) {
          tempPdfPaths.push(path);
        }
      });

      console.log(`[MergeService] Conversion completed in ${performanceResult.metrics.processingTime}ms with ${performanceResult.metrics.parallelOperations} parallel operations`);

      // Add all converted PDFs to merger in order
      for (const pdfPath of convertedPdfPaths) {
        await pdfMerger.addFile(pdfPath);
      }

      await pdfMerger.save(outputPath);

      // Apply merged metadata to the output PDF
      if (mergedMetadata) {
        try {
          await this.metadataService.applyMetadataToPDF(outputPath, mergedMetadata);
          console.log(`[MergeService] Applied metadata to output PDF: ${outputPath}`);
        } catch (error) {
          console.warn(`[MergeService] Failed to apply metadata to PDF:`, error);
          // Continue without failing the entire operation
        }
      }

      const stats = fs.statSync(outputPath);
      return {
        filename: path.basename(outputPath),
        fileSize: stats.size,
        processedFiles: convertedPdfPaths.length,
        performanceMetrics: {
          totalProcessingTime: performanceResult.metrics.processingTime,
          conversionTime: performanceResult.metrics.processingTime,
          validationTime: 0,
          memoryUsage: performanceResult.metrics.memoryUsed
        }
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
    const startTime = Date.now();
    console.log(`[MergeService] Converting ${file.originalname} (${type}) to PDF`);

    try {
      let convertedPath: string;

      switch (type) {
        case 'pdf':
          convertedPath = file.path;
          break;
        case 'docx':
          convertedPath = await documentMerger.convertToPDF(file.path);
          break;
        case 'txt':
          convertedPath = await textMerger.convertToPDF(file.path);
          break;
        case 'jpg':
        case 'jpeg':
        case 'png':
          convertedPath = await imageMerger.convertToPDF(file.path);
          break;
        case 'xlsx':
          convertedPath = await spreadsheetMerger.convertToPDF(file.path);
          break;
        case 'pptx':
          convertedPath = await presentationMerger.convertToPDF(file.path);
          break;
        case 'csv':
          convertedPath = await textMerger.convertCSVToPDF(file.path);
          break;
        default:
          throw createError(`Cannot convert ${type} to PDF`, 400);
      }

      // Validate the converted PDF
      if (convertedPath !== file.path) { // Only validate if conversion occurred
        try {
          const validation = await this.validationService.validateOutputFile(convertedPath, 'pdf');
          if (!validation.isValid) {
            console.warn(`[MergeService] Converted PDF validation warnings for ${file.originalname}:`, validation.warnings);
          }
        } catch (validationError) {
          console.warn(`[MergeService] Could not validate converted PDF for ${file.originalname}:`, validationError);
        }
      }

      const conversionTime = Date.now() - startTime;
      console.log(`[MergeService] Successfully converted ${file.originalname} to PDF in ${conversionTime}ms`);

      return convertedPath;

    } catch (error) {
      const conversionTime = Date.now() - startTime;
      console.error(`[MergeService] Failed to convert ${file.originalname} (${type}) to PDF after ${conversionTime}ms:`, error);
      throw createError(`Failed to convert ${file.originalname} to PDF: ${error instanceof Error ? error.message : String(error)}`, 500);
    }
  }

  private calculateIntegrityScore(validationResults: ValidationResult[]): number {
    if (validationResults.length === 0) return 0;

    let totalScore = 0;
    let validResults = 0;

    for (const result of validationResults) {
      if (result.isValid) {
        // Base score for valid files
        let score = 100;
        
        // Deduct points for warnings
        score -= result.warnings.length * 5;
        
        // Bonus for successful validation
        if (result.isValid) {
          score += 10;
        }
        
        // Ensure score doesn't go below 0
        score = Math.max(0, score);
        
        totalScore += score;
        validResults++;
      }
    }

    return validResults > 0 ? Math.round(totalScore / validResults) : 0;
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

  /**
   * Convert files using worker pool for CPU-intensive operations
   */
  private async convertFilesWithWorkerPool(fileGroups: Map<string, Express.Multer.File[]>): Promise<string[]> {
    const workerScript = path.join(__dirname, '../workers/conversionWorker.js');
    const tasks: any[] = [];
    
    // Prepare tasks for worker pool
    for (const [type, files] of fileGroups) {
      for (const file of files) {
        tasks.push({
          filePath: file.path,
          fileType: type,
          originalName: file.originalname,
          outputDir: this.outputDir,
          taskId: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      }
    }

    console.log(`[MergeService] Processing ${tasks.length} files using worker pool`);

    try {
      const results = await this.performanceService.createWorkerPool<any>(
        workerScript,
        tasks,
        { outputDir: this.outputDir }
      );

      // Extract successful conversion paths
      const convertedPaths: string[] = [];
      const failedConversions: string[] = [];

      results.forEach((result: any) => {
        if (result.success) {
          convertedPaths.push(result.outputPath);
          console.log(`[MergeService] Worker conversion successful: ${result.taskId} (${result.processingTime}ms)`);
        } else {
          failedConversions.push(result.taskId);
          console.error(`[MergeService] Worker conversion failed: ${result.taskId} - ${result.error}`);
        }
      });

      if (failedConversions.length > 0) {
        console.warn(`[MergeService] ${failedConversions.length} conversions failed in worker pool`);
      }

      return convertedPaths;

    } catch (error) {
      console.error('[MergeService] Worker pool conversion failed:', error);
      throw new Error(`Worker pool conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get performance metrics and system status
   */
  async getPerformanceMetrics() {
    const resourceMetrics = await this.performanceService.getResourceMetrics();
    const performanceStats = this.performanceService.getPerformanceStats();
    
    return {
      resourceMetrics,
      performanceStats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Update performance configuration
   */
  updatePerformanceConfig(config: any) {
    this.performanceService.updateConfig(config);
    console.log('[MergeService] Performance configuration updated');
  }

  private cleanupUploadedFiles(files: Express.Multer.File[]): void {
    files.forEach(file => {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (error) {
        console.error(`Failed to cleanup file ${file.path}:`, error);
      }
    });
  }
}