import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createError } from '../middleware/errorHandler';
import { MergeService } from '../services/MergeService';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req: any, file: Express.Multer.File, cb: any) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req: any, file: Express.Multer.File, cb: any) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 150 * 1024 * 1024, // 150MB
    files: 10 // Maximum 10 files
  }
});

// POST /api/merge/files
router.post('/files', upload.array('files', 10), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { outputFormat, documentName, mergeOrder } = req.body;

    if (!files || files.length === 0) {
      throw createError('No files uploaded', 400);
    }

    if (!outputFormat) {
      throw createError('Output format is required', 400);
    }

    const mergeService = new MergeService();
    const result = await mergeService.mergeFiles({
      files,
      outputFormat,
      documentName: documentName || 'merged-document',
      mergeOrder: mergeOrder ? JSON.parse(mergeOrder) : undefined
    });

    res.json({
      success: true,
      message: 'Files merged successfully',
      downloadUrl: `/api/download/${result.filename}`,
      filename: result.filename,
      fileSize: result.fileSize,
      processedFiles: result.processedFiles
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/merge/supported-formats
router.get('/supported-formats', (req: Request, res: Response) => {
  res.json({
    inputFormats: [
      { extension: 'pdf', mimeType: 'application/pdf', description: 'PDF Document' },
      { extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', description: 'Word Document' },
      { extension: 'pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', description: 'PowerPoint Presentation' },
      { extension: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', description: 'Excel Spreadsheet' },
      { extension: 'txt', mimeType: 'text/plain', description: 'Text File' },
      { extension: 'csv', mimeType: 'text/csv', description: 'CSV File' },
      { extension: 'jpg', mimeType: 'image/jpeg', description: 'JPEG Image' },
      { extension: 'png', mimeType: 'image/png', description: 'PNG Image' }
    ],
    outputFormats: [
      { extension: 'pdf', description: 'PDF Document' },
      { extension: 'docx', description: 'Word Document' },
      { extension: 'zip', description: 'ZIP Archive' }
    ]
  });
});

// GET /api/merge/status/:jobId
router.get('/status/:jobId', (req: Request, res: Response) => {
  // For future implementation of async processing
  res.json({
    jobId: req.params.jobId,
    status: 'completed',
    progress: 100
  });
});

export default router;