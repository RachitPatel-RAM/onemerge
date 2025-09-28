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

// Test mammoth import at startup
try {
  require('mammoth');
  console.log('✅ Mammoth module loaded successfully');
} catch (error) {
  console.error('❌ Failed to load mammoth module:', error);
  console.error('❌ This will cause issues with DOCX processing, but server will continue');
  // Don't exit - let the server start and handle mammoth errors gracefully
}

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
  'https://onemerge.onrender.com', // Add backend domain for testing
  process.env.CORS_ORIGIN
].filter(Boolean);

console.log('🔧 CORS Configuration:');
console.log('📍 Allowed Origins:', allowedOrigins);
console.log('🌍 CORS_ORIGIN env var:', process.env.CORS_ORIGIN);
console.log('🚀 Server starting with NODE_ENV:', process.env.NODE_ENV);

// Enhanced CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    console.log('🌐 CORS Request from origin:', origin);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('✅ Allowing request with no origin');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ Allowing origin:', origin);
      return callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      console.log('❌ Allowed origins are:', allowedOrigins);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestLogger);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/merge', mergeRoutes);
app.use('/api/powerpoint', powerpointRoutes);
app.use('/api/test', testRoutes);

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!', 
    timestamp: new Date().toISOString(),
    origin: req.get('origin') || 'no origin',
    headers: req.headers
  });
});

// Serve static files from output directory
app.use('/api/download', express.static(path.join(__dirname, '../', process.env.OUTPUT_DIR || './output')));

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${process.env.UPLOAD_DIR || './uploads'}`);
  console.log(`📤 Output directory: ${process.env.OUTPUT_DIR || './output'}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'not set'}`);
  console.log(`🔗 All allowed origins:`, allowedOrigins);
  console.log(`🌍 Server listening on 0.0.0.0:${PORT}`);
  console.log(`🔗 Health check available at: http://0.0.0.0:${PORT}/api/health`);
  console.log(`🔗 Test endpoint available at: http://0.0.0.0:${PORT}/api/test`);
  
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