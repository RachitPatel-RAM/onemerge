import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    fileSize: number;
    pageCount?: number;
    contentHash?: string;
    processingTime?: number;
  };
}

export interface ConversionValidation {
  inputValidation: ValidationResult;
  outputValidation: ValidationResult;
  integrityCheck: ValidationResult;
  performanceMetrics: {
    conversionTime: number;
    memoryUsage: number;
    cpuUsage?: number;
  };
}

export class ValidationService {
  private static readonly SUPPORTED_INPUT_TYPES = [
    '.pdf', '.docx', '.xlsx', '.pptx', '.txt', '.csv', '.jpg', '.jpeg', '.png'
  ];
  
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly MIN_FILE_SIZE = 1; // 1 byte

  /**
   * Validates input file before conversion
   */
  async validateInputFile(filePath: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: { fileSize: 0 }
    };

    try {
      // Check file existence
      if (!fs.existsSync(filePath)) {
        result.errors.push(`Input file does not exist: ${filePath}`);
        result.isValid = false;
        return result;
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      result.metadata.fileSize = stats.size;

      // Check file size
      if (stats.size < ValidationService.MIN_FILE_SIZE) {
        result.errors.push(`File is empty or too small: ${stats.size} bytes`);
        result.isValid = false;
      }

      if (stats.size > ValidationService.MAX_FILE_SIZE) {
        result.errors.push(`File is too large: ${(stats.size / 1024 / 1024).toFixed(2)} MB (max: 100 MB)`);
        result.isValid = false;
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (!ValidationService.SUPPORTED_INPUT_TYPES.includes(ext)) {
        result.errors.push(`Unsupported file type: ${ext}`);
        result.isValid = false;
      }

      // Check file permissions
      try {
        fs.accessSync(filePath, fs.constants.R_OK);
      } catch (error) {
        result.errors.push(`Cannot read file: ${error}`);
        result.isValid = false;
      }

      // File type specific validation
      await this.validateFileTypeSpecific(filePath, ext, result);

      // Generate content hash for integrity checking
      result.metadata.contentHash = await this.generateFileHash(filePath);

      console.log(`Input validation completed for ${path.basename(filePath)}: ${result.isValid ? 'VALID' : 'INVALID'}`);
      
    } catch (error) {
      result.errors.push(`Validation error: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validates output file after conversion
   */
  async validateOutputFile(filePath: string, expectedType: string = '.pdf'): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: { fileSize: 0 }
    };

    try {
      // Check file existence
      if (!fs.existsSync(filePath)) {
        result.errors.push(`Output file was not created: ${filePath}`);
        result.isValid = false;
        return result;
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      result.metadata.fileSize = stats.size;

      // Check file size
      if (stats.size < ValidationService.MIN_FILE_SIZE) {
        result.errors.push(`Output file is empty: ${stats.size} bytes`);
        result.isValid = false;
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== expectedType.toLowerCase()) {
        result.warnings.push(`Output file extension mismatch: expected ${expectedType}, got ${ext}`);
      }

      // PDF specific validation
      if (expectedType.toLowerCase() === '.pdf') {
        await this.validatePDFOutput(filePath, result);
      }

      console.log(`Output validation completed for ${path.basename(filePath)}: ${result.isValid ? 'VALID' : 'INVALID'}`);
      
    } catch (error) {
      result.errors.push(`Output validation error: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Performs comprehensive conversion validation
   */
  async validateConversion(
    inputPath: string,
    outputPath: string,
    conversionStartTime: number,
    conversionEndTime: number
  ): Promise<ConversionValidation> {
    const startValidationTime = Date.now();
    
    const inputValidation = await this.validateInputFile(inputPath);
    const outputValidation = await this.validateOutputFile(outputPath);
    
    // Integrity check
    const integrityCheck = await this.performIntegrityCheck(inputPath, outputPath);
    
    // Performance metrics
    const performanceMetrics = {
      conversionTime: conversionEndTime - conversionStartTime,
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: process.cpuUsage().user / 1000 // Convert to milliseconds
    };

    const validationTime = Date.now() - startValidationTime;
    console.log(`Complete conversion validation finished in ${validationTime}ms`);

    return {
      inputValidation,
      outputValidation,
      integrityCheck,
      performanceMetrics
    };
  }

  /**
   * Performs data integrity check between input and output
   */
  private async performIntegrityCheck(inputPath: string, outputPath: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: { fileSize: 0 }
    };

    try {
      const inputStats = fs.statSync(inputPath);
      const outputStats = fs.statSync(outputPath);
      
      result.metadata.fileSize = outputStats.size;

      // Basic size check - output should not be empty
      if (outputStats.size === 0) {
        result.errors.push('Output file is empty - conversion failed');
        result.isValid = false;
      }

      // Check if output is suspiciously small compared to input
      const sizeRatio = outputStats.size / inputStats.size;
      if (sizeRatio < 0.01 && inputStats.size > 1024) { // Less than 1% and input > 1KB
        result.warnings.push(`Output file is very small compared to input (${(sizeRatio * 100).toFixed(2)}% of original)`);
      }

      // PDF specific integrity checks
      const outputExt = path.extname(outputPath).toLowerCase();
      if (outputExt === '.pdf') {
        await this.validatePDFIntegrity(outputPath, result);
      }

      // Content validation based on file types
      await this.validateContentIntegrity(inputPath, outputPath, result);

    } catch (error) {
      result.errors.push(`Integrity check error: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * File type specific validation
   */
  private async validateFileTypeSpecific(filePath: string, ext: string, result: ValidationResult): Promise<void> {
    try {
      switch (ext) {
        case '.pdf':
          await this.validatePDFInput(filePath, result);
          break;
        case '.docx':
          await this.validateDOCXInput(filePath, result);
          break;
        case '.xlsx':
          await this.validateXLSXInput(filePath, result);
          break;
        case '.pptx':
          await this.validatePPTXInput(filePath, result);
          break;
        case '.jpg':
        case '.jpeg':
        case '.png':
          await this.validateImageInput(filePath, result);
          break;
        case '.txt':
        case '.csv':
          await this.validateTextInput(filePath, result);
          break;
      }
    } catch (error) {
      result.warnings.push(`File type validation warning: ${error}`);
    }
  }

  /**
   * PDF input validation
   */
  private async validatePDFInput(filePath: string, result: ValidationResult): Promise<void> {
    try {
      const pdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      result.metadata.pageCount = pdfDoc.getPageCount();
      
      if (result.metadata.pageCount === 0) {
        result.warnings.push('PDF has no pages');
      }
      
      // Check for encryption
      if (pdfDoc.isEncrypted) {
        result.warnings.push('PDF is encrypted - may affect processing');
      }
      
    } catch (error) {
      result.errors.push(`Invalid PDF file: ${error}`);
      result.isValid = false;
    }
  }

  /**
   * DOCX input validation
   */
  private async validateDOCXInput(filePath: string, result: ValidationResult): Promise<void> {
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(filePath);
      const entries = zip.getEntries();
      
      // Check for required DOCX structure
      const hasDocumentXml = entries.some((entry: any) => entry.entryName === 'word/document.xml');
      if (!hasDocumentXml) {
        result.errors.push('Invalid DOCX file: missing document.xml');
        result.isValid = false;
      }
      
      // Check for content
      const documentXml = zip.readAsText('word/document.xml');
      if (!documentXml || documentXml.length < 100) {
        result.warnings.push('DOCX appears to have minimal content');
      }
      
    } catch (error) {
      result.errors.push(`Invalid DOCX file: ${error}`);
      result.isValid = false;
    }
  }

  /**
   * XLSX input validation
   */
  private async validateXLSXInput(filePath: string, result: ValidationResult): Promise<void> {
    try {
      const XLSX = require('xlsx');
      const workbook = XLSX.readFile(filePath);
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        result.warnings.push('XLSX file has no sheets');
      }
      
      // Check for data in sheets
      let hasData = false;
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonData.length > 0) {
          hasData = true;
          break;
        }
      }
      
      if (!hasData) {
        result.warnings.push('XLSX file appears to have no data');
      }
      
    } catch (error) {
      result.errors.push(`Invalid XLSX file: ${error}`);
      result.isValid = false;
    }
  }

  /**
   * PPTX input validation
   */
  private async validatePPTXInput(filePath: string, result: ValidationResult): Promise<void> {
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(filePath);
      const entries = zip.getEntries();
      
      // Check for PPTX structure
      const hasPresentation = entries.some((entry: any) => entry.entryName === 'ppt/presentation.xml');
      if (!hasPresentation) {
        result.errors.push('Invalid PPTX file: missing presentation.xml');
        result.isValid = false;
      }
      
      // Count slides
      const slideEntries = entries.filter((entry: any) => entry.entryName.startsWith('ppt/slides/slide'));
      if (slideEntries.length === 0) {
        result.warnings.push('PPTX file has no slides');
      }
      
    } catch (error) {
      result.errors.push(`Invalid PPTX file: ${error}`);
      result.isValid = false;
    }
  }

  /**
   * Image input validation
   */
  private async validateImageInput(filePath: string, result: ValidationResult): Promise<void> {
    try {
      const sharp = require('sharp');
      const metadata = await sharp(filePath).metadata();
      
      if (!metadata.width || !metadata.height) {
        result.errors.push('Invalid image: no dimensions found');
        result.isValid = false;
      }
      
      if (metadata.width < 1 || metadata.height < 1) {
        result.errors.push(`Invalid image dimensions: ${metadata.width}x${metadata.height}`);
        result.isValid = false;
      }
      
    } catch (error) {
      result.errors.push(`Invalid image file: ${error}`);
      result.isValid = false;
    }
  }

  /**
   * Text input validation
   */
  private async validateTextInput(filePath: string, result: ValidationResult): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (content.length === 0) {
        result.warnings.push('Text file is empty');
      }
      
      // Check for binary content in text files
      const binaryPattern = /[\x00-\x08\x0E-\x1F\x7F]/;
      if (binaryPattern.test(content)) {
        result.warnings.push('Text file may contain binary data');
      }
      
    } catch (error) {
      result.errors.push(`Cannot read text file: ${error}`);
      result.isValid = false;
    }
  }

  /**
   * PDF output validation
   */
  private async validatePDFOutput(filePath: string, result: ValidationResult): Promise<void> {
    try {
      const pdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      result.metadata.pageCount = pdfDoc.getPageCount();
      
      if (result.metadata.pageCount === 0) {
        result.errors.push('Generated PDF has no pages');
        result.isValid = false;
      }
      
      // Check PDF structure
      const title = pdfDoc.getTitle();
      const author = pdfDoc.getAuthor();
      
      if (!title && !author) {
        result.warnings.push('PDF has no metadata (title/author)');
      }
      
    } catch (error) {
      result.errors.push(`Invalid generated PDF: ${error}`);
      result.isValid = false;
    }
  }

  /**
   * PDF integrity validation
   */
  private async validatePDFIntegrity(filePath: string, result: ValidationResult): Promise<void> {
    try {
      const pdfBytes = fs.readFileSync(filePath);
      
      // Check PDF header
      const header = pdfBytes.slice(0, 8).toString();
      if (!header.startsWith('%PDF-')) {
        result.errors.push('Invalid PDF header');
        result.isValid = false;
        return;
      }
      
      // Try to load and validate structure
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();
      
      if (pageCount > 0) {
        // Try to access first page to ensure structure is valid
        const firstPage = pdfDoc.getPage(0);
        const { width, height } = firstPage.getSize();
        
        if (width <= 0 || height <= 0) {
          result.warnings.push('PDF page has invalid dimensions');
        }
      }
      
    } catch (error) {
      result.errors.push(`PDF integrity check failed: ${error}`);
      result.isValid = false;
    }
  }

  /**
   * Content integrity validation
   */
  private async validateContentIntegrity(inputPath: string, outputPath: string, result: ValidationResult): Promise<void> {
    try {
      const inputExt = path.extname(inputPath).toLowerCase();
      const outputExt = path.extname(outputPath).toLowerCase();
      
      // For text-based conversions, check if content was preserved
      if (['.txt', '.csv'].includes(inputExt) && outputExt === '.pdf') {
        const inputContent = fs.readFileSync(inputPath, 'utf8');
        
        // Basic check - if input has content, output should not be minimal
        if (inputContent.length > 100) {
          const outputStats = fs.statSync(outputPath);
          if (outputStats.size < 1000) { // Less than 1KB for substantial text input
            result.warnings.push('Output PDF may be missing content from text input');
          }
        }
      }
      
      // For image conversions, check reasonable size relationship
      if (['.jpg', '.jpeg', '.png'].includes(inputExt) && outputExt === '.pdf') {
        const inputStats = fs.statSync(inputPath);
        const outputStats = fs.statSync(outputPath);
        
        // PDF should be larger than a minimal PDF but not excessively large
        if (outputStats.size < 1000) {
          result.warnings.push('PDF output may be missing image content');
        } else if (outputStats.size > inputStats.size * 10) {
          result.warnings.push('PDF output is much larger than expected');
        }
      }
      
    } catch (error) {
      result.warnings.push(`Content integrity check warning: ${error}`);
    }
  }

  /**
   * Generate file hash for integrity checking
   */
  private async generateFileHash(filePath: string): Promise<string> {
    try {
      const crypto = require('crypto');
      const fileBuffer = fs.readFileSync(filePath);
      const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
      return hash;
    } catch (error) {
      console.warn(`Could not generate hash for ${filePath}: ${error}`);
      return '';
    }
  }

  /**
   * Get validation summary
   */
  static getValidationSummary(validation: ConversionValidation): string {
    const { inputValidation, outputValidation, integrityCheck, performanceMetrics } = validation;
    
    const totalErrors = inputValidation.errors.length + outputValidation.errors.length + integrityCheck.errors.length;
    const totalWarnings = inputValidation.warnings.length + outputValidation.warnings.length + integrityCheck.warnings.length;
    
    const status = totalErrors === 0 ? 'SUCCESS' : 'FAILED';
    const conversionTimeMs = performanceMetrics.conversionTime;
    const memoryUsageMB = (performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2);
    
    return `Validation ${status}: ${totalErrors} errors, ${totalWarnings} warnings | ` +
           `Time: ${conversionTimeMs}ms | Memory: ${memoryUsageMB}MB`;
  }
}