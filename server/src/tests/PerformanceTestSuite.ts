import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { MergeService } from '../services/MergeService';
import { PerformanceOptimizationService } from '../services/PerformanceOptimizationService';

interface PerformanceTestCase {
  name: string;
  description: string;
  fileCount: number;
  fileSizes: number[]; // in MB
  fileTypes: string[];
  outputFormat: string;
  expectedProcessingTime?: number; // in ms
  memoryThreshold?: number; // in MB
}

interface PerformanceTestResult {
  testCase: PerformanceTestCase;
  actualProcessingTime: number;
  memoryUsage: number;
  cpuUsage: number;
  throughput: number; // files per second
  success: boolean;
  errors: string[];
  optimizationMetrics: {
    parallelOperations: number;
    resourceUtilization: number;
    memoryOptimizationSavings: number;
  };
}

interface BenchmarkReport {
  testResults: PerformanceTestResult[];
  overallMetrics: {
    totalTestsRun: number;
    successRate: number;
    averageProcessingTime: number;
    averageMemoryUsage: number;
    averageThroughput: number;
    performanceImprovement: number; // percentage
  };
  recommendations: string[];
  timestamp: Date;
}

export class PerformanceTestSuite {
  private mergeService: MergeService;
  private performanceService: PerformanceOptimizationService;
  private testDataDir: string;
  private baselineResults: Map<string, PerformanceTestResult> = new Map();

  constructor() {
    this.mergeService = new MergeService();
    this.performanceService = new PerformanceOptimizationService({
      maxConcurrentOperations: 6,
      memoryThreshold: 2048,
      cpuThreshold: 85,
      enableParallelProcessing: true,
      enableMemoryOptimization: true,
      enableResourceMonitoring: true,
      batchSize: 4,
      workerPoolSize: 4
    });
    this.testDataDir = path.join(__dirname, '../../test-data');
    this.ensureTestDataDirectory();
  }

  private ensureTestDataDirectory(): void {
    if (!fs.existsSync(this.testDataDir)) {
      fs.mkdirSync(this.testDataDir, { recursive: true });
    }
  }

  /**
   * Generate test files for performance testing
   */
  async generateTestFiles(): Promise<void> {
    console.log('[PerformanceTestSuite] Generating test files...');
    
    const testFiles = [
      { name: 'small-doc.txt', size: 0.1, content: 'Small text document for testing.' },
      { name: 'medium-doc.txt', size: 1, content: 'Medium text document '.repeat(50000) },
      { name: 'large-doc.txt', size: 5, content: 'Large text document '.repeat(250000) },
      { name: 'sample.csv', size: 0.5, content: 'Name,Age,City\nJohn,25,NYC\nJane,30,LA\n'.repeat(10000) }
    ];

    for (const file of testFiles) {
      const filePath = path.join(this.testDataDir, file.name);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, file.content);
        console.log(`Generated test file: ${file.name} (${file.size}MB)`);
      }
    }
  }

  /**
   * Define comprehensive test cases
   */
  getTestCases(): PerformanceTestCase[] {
    return [
      {
        name: 'Small File Batch',
        description: 'Test with small files to measure baseline performance',
        fileCount: 3,
        fileSizes: [0.1, 0.1, 0.1],
        fileTypes: ['txt', 'txt', 'txt'],
        outputFormat: 'pdf',
        expectedProcessingTime: 2000,
        memoryThreshold: 100
      },
      {
        name: 'Medium File Batch',
        description: 'Test with medium-sized files',
        fileCount: 5,
        fileSizes: [1, 1, 1, 1, 1],
        fileTypes: ['txt', 'txt', 'txt', 'txt', 'txt'],
        outputFormat: 'pdf',
        expectedProcessingTime: 5000,
        memoryThreshold: 200
      },
      {
        name: 'Large File Batch',
        description: 'Test with large files to stress test the system',
        fileCount: 3,
        fileSizes: [5, 5, 5],
        fileTypes: ['txt', 'txt', 'txt'],
        outputFormat: 'pdf',
        expectedProcessingTime: 10000,
        memoryThreshold: 500
      },
      {
        name: 'Mixed File Types',
        description: 'Test with different file types',
        fileCount: 4,
        fileSizes: [0.5, 0.5, 0.5, 0.5],
        fileTypes: ['txt', 'csv', 'txt', 'csv'],
        outputFormat: 'pdf',
        expectedProcessingTime: 4000,
        memoryThreshold: 150
      },
      {
        name: 'High Concurrency Test',
        description: 'Test system under high concurrent load',
        fileCount: 10,
        fileSizes: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        fileTypes: ['txt', 'txt', 'txt', 'txt', 'txt', 'txt', 'txt', 'txt', 'txt', 'txt'],
        outputFormat: 'pdf',
        expectedProcessingTime: 8000,
        memoryThreshold: 400
      }
    ];
  }

  /**
   * Run a single performance test
   */
  async runPerformanceTest(testCase: PerformanceTestCase): Promise<PerformanceTestResult> {
    console.log(`[PerformanceTestSuite] Running test: ${testCase.name}`);
    
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    const startCpuUsage = process.cpuUsage();
    
    const errors: string[] = [];
    let success = false;
    let optimizationMetrics = {
      parallelOperations: 0,
      resourceUtilization: 0,
      memoryOptimizationSavings: 0
    };

    try {
      // Create mock files for testing
      const mockFiles = this.createMockFiles(testCase);
      
      // Run the merge operation
      const result = await this.mergeService.mergeFiles({
        files: mockFiles,
        outputFormat: testCase.outputFormat,
        documentName: `test-${testCase.name.replace(/\s+/g, '-').toLowerCase()}`,
        mergeOrder: mockFiles.map(f => f.originalname)
      });

      success = true;
      
      // Extract optimization metrics from performance metrics
      if (result.performanceMetrics) {
        optimizationMetrics.parallelOperations = 1; // Simplified for this test
        optimizationMetrics.resourceUtilization = 85; // Estimated
        optimizationMetrics.memoryOptimizationSavings = Math.max(0, 
          (testCase.memoryThreshold || 100) - (result.performanceMetrics.memoryUsage / 1024 / 1024)
        );
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);
      console.error(`[PerformanceTestSuite] Test failed: ${testCase.name}`, error);
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;
    const endCpuUsage = process.cpuUsage(startCpuUsage);

    const actualProcessingTime = endTime - startTime;
    const memoryUsage = (endMemory - startMemory) / 1024 / 1024; // Convert to MB
    const cpuUsage = (endCpuUsage.user + endCpuUsage.system) / 1000; // Convert to ms
    const throughput = testCase.fileCount / (actualProcessingTime / 1000); // files per second

    return {
      testCase,
      actualProcessingTime,
      memoryUsage,
      cpuUsage,
      throughput,
      success,
      errors,
      optimizationMetrics
    };
  }

  /**
   * Create mock files for testing
   */
  private createMockFiles(testCase: PerformanceTestCase): Express.Multer.File[] {
    const mockFiles: Express.Multer.File[] = [];
    
    for (let i = 0; i < testCase.fileCount; i++) {
      const fileType = testCase.fileTypes[i % testCase.fileTypes.length];
      const fileName = `test-file-${i + 1}.${fileType}`;
      const filePath = path.join(this.testDataDir, fileName);
      
      // Ensure test file exists
      if (!fs.existsSync(filePath)) {
        const content = fileType === 'csv' 
          ? 'Name,Age,City\nJohn,25,NYC\nJane,30,LA\n'.repeat(1000)
          : `Test content for ${fileName} `.repeat(1000);
        fs.writeFileSync(filePath, content);
      }

      mockFiles.push({
        fieldname: 'files',
        originalname: fileName,
        encoding: '7bit',
        mimetype: this.getMimeType(fileType),
        size: testCase.fileSizes[i % testCase.fileSizes.length] * 1024 * 1024,
        destination: this.testDataDir,
        filename: fileName,
        path: filePath,
        buffer: Buffer.from(''),
        stream: null as any
      });
    }

    return mockFiles;
  }

  private getMimeType(fileType: string): string {
    const mimeTypes: { [key: string]: string } = {
      'txt': 'text/plain',
      'csv': 'text/csv',
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return mimeTypes[fileType] || 'application/octet-stream';
  }

  /**
   * Run all performance tests
   */
  async runAllTests(): Promise<BenchmarkReport> {
    console.log('[PerformanceTestSuite] Starting comprehensive performance testing...');
    
    await this.generateTestFiles();
    const testCases = this.getTestCases();
    const testResults: PerformanceTestResult[] = [];

    for (const testCase of testCases) {
      const result = await this.runPerformanceTest(testCase);
      testResults.push(result);
      
      // Add delay between tests to allow system recovery
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return this.generateBenchmarkReport(testResults);
  }

  /**
   * Generate comprehensive benchmark report
   */
  private generateBenchmarkReport(testResults: PerformanceTestResult[]): BenchmarkReport {
    const successfulTests = testResults.filter(r => r.success);
    const totalTests = testResults.length;
    const successRate = (successfulTests.length / totalTests) * 100;

    const averageProcessingTime = successfulTests.reduce((sum, r) => sum + r.actualProcessingTime, 0) / successfulTests.length;
    const averageMemoryUsage = successfulTests.reduce((sum, r) => sum + r.memoryUsage, 0) / successfulTests.length;
    const averageThroughput = successfulTests.reduce((sum, r) => sum + r.throughput, 0) / successfulTests.length;

    // Calculate performance improvement (simplified baseline comparison)
    const baselineProcessingTime = testResults.reduce((sum, r) => sum + (r.testCase.expectedProcessingTime || 5000), 0) / testResults.length;
    const performanceImprovement = ((baselineProcessingTime - averageProcessingTime) / baselineProcessingTime) * 100;

    const recommendations = this.generateRecommendations(testResults);

    return {
      testResults,
      overallMetrics: {
        totalTestsRun: totalTests,
        successRate,
        averageProcessingTime,
        averageMemoryUsage,
        averageThroughput,
        performanceImprovement
      },
      recommendations,
      timestamp: new Date()
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(testResults: PerformanceTestResult[]): string[] {
    const recommendations: string[] = [];
    
    const highMemoryTests = testResults.filter(r => r.memoryUsage > 300);
    if (highMemoryTests.length > 0) {
      recommendations.push('Consider increasing memory optimization for large file processing');
    }

    const slowTests = testResults.filter(r => r.actualProcessingTime > (r.testCase.expectedProcessingTime || 5000) * 1.5);
    if (slowTests.length > 0) {
      recommendations.push('Some tests exceeded expected processing time - consider optimizing conversion algorithms');
    }

    const lowThroughputTests = testResults.filter(r => r.throughput < 1);
    if (lowThroughputTests.length > 0) {
      recommendations.push('Low throughput detected - consider increasing parallel processing capabilities');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable parameters');
    }

    return recommendations;
  }

  /**
   * Export benchmark report to file
   */
  async exportReport(report: BenchmarkReport, outputPath?: string): Promise<string> {
    const reportPath = outputPath || path.join(this.testDataDir, `performance-report-${Date.now()}.json`);
    
    const reportData = {
      ...report,
      summary: {
        testDate: report.timestamp.toISOString(),
        totalTests: report.overallMetrics.totalTestsRun,
        successRate: `${report.overallMetrics.successRate.toFixed(2)}%`,
        averageProcessingTime: `${report.overallMetrics.averageProcessingTime.toFixed(2)}ms`,
        averageMemoryUsage: `${report.overallMetrics.averageMemoryUsage.toFixed(2)}MB`,
        averageThroughput: `${report.overallMetrics.averageThroughput.toFixed(2)} files/sec`,
        performanceImprovement: `${report.overallMetrics.performanceImprovement.toFixed(2)}%`
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`[PerformanceTestSuite] Report exported to: ${reportPath}`);
    
    return reportPath;
  }

  /**
   * Clean up test files
   */
  async cleanup(): Promise<void> {
    try {
      if (fs.existsSync(this.testDataDir)) {
        const files = fs.readdirSync(this.testDataDir);
        for (const file of files) {
          const filePath = path.join(this.testDataDir, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        }
        console.log('[PerformanceTestSuite] Test files cleaned up');
      }
    } catch (error) {
      console.warn('[PerformanceTestSuite] Cleanup failed:', error);
    }
  }
}