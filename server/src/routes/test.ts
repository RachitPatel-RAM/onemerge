import { Router, Request, Response, NextFunction } from 'express';
import { ConversionTestService, TestSuiteResult } from '../services/ConversionTestService';
import { PerformanceTestSuite } from '../tests/PerformanceTestSuite';
import { createError } from '../middleware/errorHandler';
import { LibreOfficeVerificationService } from '../services/LibreOfficeVerificationService';

const router = Router();
const testService = new ConversionTestService();
const performanceTestSuite = new PerformanceTestSuite();

/**
 * GET /api/test/conversion-suite
 * Run comprehensive conversion test suite
 */
router.get('/conversion-suite', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[TestRoute] Starting comprehensive conversion test suite...');
    
    const startTime = Date.now();
    const suiteResult: TestSuiteResult = await testService.runAllTests();
    const executionTime = Date.now() - startTime;

    console.log(`[TestRoute] Test suite completed in ${executionTime}ms`);
    console.log(`[TestRoute] Results: ${suiteResult.passedTests}/${suiteResult.totalTests} tests passed`);

    res.json({
      success: true,
      executionTime,
      results: suiteResult,
      summary: {
        totalTests: suiteResult.totalTests,
        passedTests: suiteResult.passedTests,
        failedTests: suiteResult.failedTests,
        overallScore: suiteResult.overallScore,
        qualityDistribution: {
          high: suiteResult.summary.highQualityConversions,
          medium: suiteResult.summary.mediumQualityConversions,
          low: suiteResult.summary.lowQualityConversions
        },
        performance: {
          averageIntegrityScore: suiteResult.summary.averageIntegrityScore,
          averageExecutionTime: suiteResult.summary.averageExecutionTime
        }
      }
    });

  } catch (error) {
    console.error('[TestRoute] Test suite execution failed:', error);
    next(createError(`Test suite execution failed: ${error instanceof Error ? error.message : String(error)}`, 500));
  }
});

/**
 * GET /api/test/conversion-report
 * Generate and return a detailed test report
 */
router.get('/conversion-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[TestRoute] Generating conversion test report...');
    
    const suiteResult: TestSuiteResult = await testService.runAllTests();
    const report = await testService.generateTestReport(suiteResult);

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename="conversion-test-report.md"');
    res.send(report);

  } catch (error) {
    console.error('[TestRoute] Test report generation failed:', error);
    next(createError(`Test report generation failed: ${error instanceof Error ? error.message : String(error)}`, 500));
  }
});

/**
 * GET /api/test/system-health
 * Check system health and conversion capabilities
 */
router.get('/system-health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      },
      services: {
        mergeService: 'operational',
        validationService: 'operational',
        testService: 'operational'
      },
      supportedFormats: {
        input: ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'csv', 'jpg', 'png'],
        output: ['pdf', 'docx', 'zip']
      },
      capabilities: {
        highFidelityConversion: true,
        performanceOptimization: true,
        dataIntegrityValidation: true,
        comprehensiveErrorChecking: true,
        metadataPreservation: false // Will be implemented next
      }
    };

    res.json({
      success: true,
      health: healthCheck
    });

  } catch (error) {
    console.error('[TestRoute] System health check failed:', error);
    next(createError(`System health check failed: ${error instanceof Error ? error.message : String(error)}`, 500));
  }
});

/**
 * GET /api/test/supported-combinations
 * Get all supported input/output file type combinations and their expected quality
 */
router.get('/supported-combinations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const combinations = testService.getSupportedCombinations();
    
    res.json({
      success: true,
      data: {
        combinations,
        totalCombinations: combinations.length,
        inputFormats: [...new Set(combinations.map(c => c.inputFormat))],
        outputFormats: [...new Set(combinations.map(c => c.outputFormat))],
        qualityLevels: [...new Set(combinations.map(c => c.expectedQuality))]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(createError(`Failed to get supported combinations: ${error instanceof Error ? error.message : String(error)}`, 500));
  }
});

/**
 * POST /api/test/performance-benchmark
 * Run comprehensive performance benchmarks and return detailed results
 */
router.post('/performance-benchmark', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[TestRoutes] Starting performance benchmark suite...');
    
    const report = await performanceTestSuite.runAllTests();
    
    res.json({
      success: true,
      data: {
        benchmarkReport: report,
        summary: {
          totalTests: report.overallMetrics.totalTestsRun,
          successRate: `${report.overallMetrics.successRate.toFixed(2)}%`,
          averageProcessingTime: `${report.overallMetrics.averageProcessingTime.toFixed(2)}ms`,
          averageMemoryUsage: `${report.overallMetrics.averageMemoryUsage.toFixed(2)}MB`,
          averageThroughput: `${report.overallMetrics.averageThroughput.toFixed(2)} files/sec`,
          performanceImprovement: `${report.overallMetrics.performanceImprovement.toFixed(2)}%`,
          recommendations: report.recommendations
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(createError(`Performance benchmark failed: ${error instanceof Error ? error.message : String(error)}`, 500));
  }
});

/**
 * POST /api/test/performance-export
 * Export performance benchmark report to file
 */
router.post('/performance-export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { outputPath } = req.body;
    
    console.log('[TestRoutes] Running performance tests and exporting report...');
    
    const report = await performanceTestSuite.runAllTests();
    const reportPath = await performanceTestSuite.exportReport(report, outputPath);
    
    res.json({
      success: true,
      data: {
        reportPath,
        summary: {
          totalTests: report.overallMetrics.totalTestsRun,
          successRate: `${report.overallMetrics.successRate.toFixed(2)}%`,
          performanceImprovement: `${report.overallMetrics.performanceImprovement.toFixed(2)}%`
        }
      },
      message: `Performance report exported to ${reportPath}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(createError(`Failed to export performance report: ${error instanceof Error ? error.message : String(error)}`, 500));
  }
});

/**
 * GET /api/test/libreoffice
 * Test LibreOffice installation and functionality
 */
router.get('/libreoffice', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[TestRoute] Testing LibreOffice installation...');
    
    const libreOfficeService = LibreOfficeVerificationService.getInstance();
    const status = await libreOfficeService.verifyLibreOfficeInstallation();
    const statusReport = await libreOfficeService.getStatusReport();
    
    res.json({
      success: status.isInstalled && status.canConvert,
      status: {
        installed: status.isInstalled,
        path: status.path,
        version: status.version,
        canConvert: status.canConvert,
        error: status.error
      },
      report: statusReport,
      recommendations: status.isInstalled && status.canConvert 
        ? ['LibreOffice is working correctly', 'PowerPoint conversion should work']
        : [
            'Install LibreOffice on the server',
            'Ensure LibreOffice is in the system PATH',
            'Check environment variables (LIBREOFFICE_PATH)',
            'Verify LibreOffice has proper permissions'
          ],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[TestRoute] LibreOffice test failed:', error);
    next(createError(`LibreOffice test failed: ${error instanceof Error ? error.message : String(error)}`, 500));
  }
});

/**
 * GET /api/test/system
 * System diagnostics endpoint
 */
router.get('/system', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV,
      workingDirectory: process.cwd(),
      environmentVariables: {
        LIBREOFFICE_PATH: process.env.LIBREOFFICE_PATH,
        PATH: process.env.PATH?.split(':').slice(0, 10), // First 10 PATH entries
        HOME: process.env.HOME,
        TMPDIR: process.env.TMPDIR
      }
    };

    // Check if we're on Linux and can run system commands
    if (process.platform === 'linux') {
      try {
        // Check LibreOffice packages
        try {
          const { stdout: dpkgResult } = await execAsync('dpkg -l | grep -i libreoffice', { timeout: 10000 });
          diagnostics.libreofficePackages = dpkgResult.trim().split('\n').filter((line: string) => line.trim());
        } catch (error) {
          diagnostics.libreofficePackages = 'Error checking packages: ' + (error as Error).message;
        }

        // Check for LibreOffice files
        try {
          const { stdout: findResult } = await execAsync('find /usr -name "*libreoffice*" -type f 2>/dev/null | head -20', { timeout: 15000 });
          diagnostics.libreofficeFiles = findResult.trim().split('\n').filter((line: string) => line.trim());
        } catch (error) {
          diagnostics.libreofficeFiles = 'Error finding files: ' + (error as Error).message;
        }

        // Check common binary locations
        const commonPaths = [
          '/usr/bin/libreoffice',
          '/usr/bin/soffice',
          '/usr/local/bin/libreoffice',
          '/opt/libreoffice/program/soffice',
          '/snap/bin/libreoffice',
          '/usr/lib/libreoffice/program/soffice'
        ];

        diagnostics.pathChecks = {};
        const fs = require('fs');
        for (const path of commonPaths) {
          try {
            const exists = fs.existsSync(path);
            diagnostics.pathChecks[path] = {
              exists,
              stats: exists ? fs.statSync(path) : null
            };
          } catch (error) {
            diagnostics.pathChecks[path] = { error: (error as Error).message };
          }
        }

        // Try to run which command
        try {
          const { stdout: whichResult } = await execAsync('which libreoffice soffice 2>/dev/null || echo "not found"', { timeout: 5000 });
          diagnostics.whichCommands = whichResult.trim();
        } catch (error) {
          diagnostics.whichCommands = 'Error: ' + (error as Error).message;
        }

        // Check system info
        try {
          const { stdout: unameResult } = await execAsync('uname -a', { timeout: 5000 });
          diagnostics.systemInfo = unameResult.trim();
        } catch (error) {
          diagnostics.systemInfo = 'Error: ' + (error as Error).message;
        }

        // Check available space
        try {
          const { stdout: dfResult } = await execAsync('df -h /', { timeout: 5000 });
          diagnostics.diskSpace = dfResult.trim();
        } catch (error) {
          diagnostics.diskSpace = 'Error: ' + (error as Error).message;
        }
      } catch (error) {
        diagnostics.systemCommandsError = (error as Error).message;
      }
    }

    res.json({
      success: true,
      diagnostics
    });
  } catch (error) {
    console.error('[TestRoute] System diagnostics failed:', error);
    next(createError(`System diagnostics failed: ${error instanceof Error ? error.message : String(error)}`, 500));
  }
});

/**
 * DELETE /api/test/cleanup
 * Clean up test files and temporary data
 */
router.delete('/cleanup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await performanceTestSuite.cleanup();
    
    res.json({
      success: true,
      message: 'Test files and temporary data cleaned up successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(createError(`Cleanup failed: ${error instanceof Error ? error.message : String(error)}`, 500));
  }
});

export default router;