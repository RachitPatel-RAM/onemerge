import { parentPort, workerData } from 'worker_threads';
import path from 'path';
import fs from 'fs';
import { DocumentMerger } from '../services/mergers/DocumentMerger';
import { ImageMerger } from '../services/mergers/ImageMerger';
import { TextMerger } from '../services/mergers/TextMerger';
import { SpreadsheetMerger } from '../services/mergers/SpreadsheetMerger';
import { PresentationMerger } from '../services/mergers/PresentationMerger';

interface ConversionTask {
  filePath: string;
  fileType: string;
  originalName: string;
  outputDir: string;
  taskId: string;
}

interface ConversionResult {
  taskId: string;
  outputPath: string;
  success: boolean;
  error?: string;
  processingTime: number;
  fileSize: number;
}

class ConversionWorker {
  private documentMerger: DocumentMerger;
  private imageMerger: ImageMerger;
  private textMerger: TextMerger;
  private spreadsheetMerger: SpreadsheetMerger;
  private presentationMerger: PresentationMerger;

  constructor() {
    this.documentMerger = new DocumentMerger();
    this.imageMerger = new ImageMerger();
    this.textMerger = new TextMerger();
    this.spreadsheetMerger = new SpreadsheetMerger();
    this.presentationMerger = new PresentationMerger();
  }

  async processConversion(task: ConversionTask): Promise<ConversionResult> {
    const startTime = Date.now();
    
    try {
      console.log(`[ConversionWorker] Processing ${task.fileType} file: ${task.originalName}`);
      
      let outputPath: string;
      
      switch (task.fileType.toLowerCase()) {
        case 'docx':
        case 'doc':
          outputPath = await this.documentMerger.convertToPDF(task.filePath);
          break;
          
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'bmp':
        case 'tiff':
          outputPath = await this.imageMerger.convertToPDF(task.filePath);
          break;
          
        case 'txt':
        case 'rtf':
          outputPath = await this.textMerger.convertToPDF(task.filePath);
          break;
          
        case 'xlsx':
        case 'xls':
        case 'csv':
          outputPath = await this.spreadsheetMerger.convertToPDF(task.filePath);
          break;
          
        case 'pptx':
        case 'ppt':
          outputPath = await this.presentationMerger.convertToPDF(task.filePath);
          break;
          
        case 'pdf':
          // PDF files don't need conversion
          outputPath = task.filePath;
          break;
          
        default:
          throw new Error(`Unsupported file type: ${task.fileType}`);
      }

      const stats = fs.statSync(outputPath);
      const processingTime = Date.now() - startTime;

      console.log(`[ConversionWorker] Successfully converted ${task.originalName} in ${processingTime}ms`);

      return {
        taskId: task.taskId,
        outputPath,
        success: true,
        processingTime,
        fileSize: stats.size
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`[ConversionWorker] Failed to convert ${task.originalName}:`, error);

      return {
        taskId: task.taskId,
        outputPath: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        fileSize: 0
      };
    }
  }
}

// Worker message handling
if (parentPort) {
  const worker = new ConversionWorker();

  parentPort.on('message', async (task: ConversionTask) => {
    try {
      const result = await worker.processConversion(task);
      parentPort!.postMessage(result);
    } catch (error) {
      parentPort!.postMessage({
        taskId: task.taskId,
        outputPath: '',
        success: false,
        error: error instanceof Error ? error.message : 'Worker error',
        processingTime: 0,
        fileSize: 0
      });
    }
  });

  parentPort.on('error', (error) => {
    console.error('[ConversionWorker] Worker error:', error);
  });

  console.log('[ConversionWorker] Worker initialized and ready');
} else {
  console.error('[ConversionWorker] No parent port available');
}