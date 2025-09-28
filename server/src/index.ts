import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { RequestHandler } from 'express';
import compression = require('compression');
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import mergeRoutes from './routes/merge';
import healthRoutes from './routes/health';
import powerpointRoutes from './routes/powerpoint';
import testRoutes from './routes/test';
import { LibreOfficeVerificationService } from './services/LibreOfficeVerificationService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Create necessary directories
const createDirectories = () => {
  const dirs = [
    process.env.UPLOAD_DIR || './uploads',
    process.env.OUTPUT_DIR || './output',
    process.env.TEMP_DIR || './temp'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createDirectories();

// Middleware
app.use(helmet());
app.use(compression());

// CORS configuration with multiple origins support
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5173',
  'https://onemerge-frontend.onrender.com',
  'https://onemergee.onrender.com',
  process.env.CORS_ORIGIN
].filter(Boolean);

console.log('🔧 CORS Configuration:');
console.log('📍 Allowed Origins:', allowedOrigins);
console.log('🌍 CORS_ORIGIN env var:', process.env.CORS_ORIGIN);
console.log('🚀 Server starting with NODE_ENV:', process.env.NODE_ENV);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestLogger);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/merge', mergeRoutes);
app.use('/api/powerpoint', powerpointRoutes);
app.use('/api/test', testRoutes);

// Serve static files from output directory
app.use('/api/download', express.static(path.join(__dirname, '../', process.env.OUTPUT_DIR || './output')));

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${process.env.UPLOAD_DIR || './uploads'}`);
  console.log(`📤 Output directory: ${process.env.OUTPUT_DIR || './output'}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'not set'}`);
  console.log(`🔗 All allowed origins:`, allowedOrigins);
  
  // Verify LibreOffice installation
  try {
    const libreOfficeService = LibreOfficeVerificationService.getInstance();
    const status = await libreOfficeService.verifyLibreOfficeInstallation();
    
    if (status.isInstalled && status.canConvert) {
      console.log('✅ LibreOffice is properly installed and functional');
    } else {
      console.warn('⚠️ LibreOffice installation issues detected:');
      console.warn(await libreOfficeService.getStatusReport());
    }
  } catch (error) {
    console.error('❌ Failed to verify LibreOffice installation:', error);
  }
});

export default app;