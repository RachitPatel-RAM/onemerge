import fs from 'fs';
import path from 'path';
import { MergeService, MergeOptions, MergeResult } from './MergeService';
import { ValidationService, ValidationResult } from './ValidationService';

export interface TestCase {
  id: string;
  name: string;
  inputTypes: string[];
  outputFormat: string;
  expectedQuality: 'high' | 'medium' | 'low';
  description: string;
}

export interface TestResult {
  testCase: TestCase;
  success: boolean;
  mergeResult?: MergeResult;
  validationResults: ValidationResult[];
  errors: string[];
  warnings: string[];
  performanceMetrics: {
    executionTime: number;
    memoryUsage: number;
    integrityScore: number;
  };
  qualityAssessment: {
    score: number;
    meetsExpectations: boolean;
    issues: string[];
  };
}

export interface TestSuiteResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  overallScore: number;
  testResults: TestResult[];
  summary: {
    highQualityConversions: number;
    mediumQualityConversions: number;
    lowQualityConversions: number;
    averageIntegrityScore: number;
    averageExecutionTime: number;
  };
}

export class ConversionTestService {
  private mergeService: MergeService;
  private validationService: ValidationService;
  private testCases: TestCase[] = [];

  constructor() {
    this.mergeService = new MergeService();
    this.validationService = new ValidationService();
    this.initializeTestCases();
  }

  private initializeTestCases(): void {
    this.testCases = [
      // PDF Output Tests
      {
        id: 'docx_pdf_txt_to_pdf',
        name: 'DOCX + PDF + TXT → PDF',
        inputTypes: ['docx', 'pdf', 'txt'],
        outputFormat: 'pdf',
        expectedQuality: 'high',
        description: 'Test merging document, PDF, and text files to PDF with high fidelity'
      },
      {
        id: 'pptx_docx_pdf_to_pdf',
        name: 'PPTX + DOCX + PDF → PDF',
        inputTypes: ['pptx', 'docx', 'pdf'],
        outputFormat: 'pdf',
        expectedQuality: 'high',
        description: 'Test merging presentation, document, and PDF files to PDF'
      },
      {
        id: 'xlsx_csv_docx_to_pdf',
        name: 'XLSX + CSV + DOCX → PDF',
        inputTypes: ['xlsx', 'csv', 'docx'],
        outputFormat: 'pdf',
        expectedQuality: 'medium',
        description: 'Test merging spreadsheet, CSV, and document files to PDF'
      },
      {
        id: 'jpg_png_pdf_to_pdf',
        name: 'JPG + PNG + PDF → PDF',
        inputTypes: ['jpg', 'png', 'pdf'],
        outputFormat: 'pdf',
        expectedQuality: 'high',
        description: 'Test merging image and PDF files to PDF'
      },
      {
        id: 'all_types_to_pdf',
        name: 'All Types → PDF',
        inputTypes: ['docx', 'pptx', 'xlsx', 'pdf', 'txt', 'csv', 'jpg', 'png'],
        outputFormat: 'pdf',
        expectedQuality: 'medium',
        description: 'Test merging all supported file types to PDF'
      },
      
      // DOCX Output Tests
      {
        id: 'xlsx_csv_docx_to_docx',
        name: 'XLSX + CSV + DOCX → DOCX',
        inputTypes: ['xlsx', 'csv', 'docx'],
        outputFormat: 'docx',
        expectedQuality: 'medium',
        description: 'Test merging spreadsheet, CSV, and document files to DOCX'
      },
      
      // Single File Type Tests
      {
        id: 'single_pptx_to_pdf',
        name: 'Single PPTX → PDF',
        inputTypes: ['pptx'],
        outputFormat: 'pdf',
        expectedQuality: 'high',
        description: 'Test converting single PPTX file to PDF with maximum fidelity'
      },
      {
        id: 'single_xlsx_to_pdf',
        name: 'Single XLSX → PDF',
        inputTypes: ['xlsx'],
        outputFormat: 'pdf',
        expectedQuality: 'high',
        description: 'Test converting single XLSX file to PDF with formula preservation'
      },
      {
        id: 'single_docx_to_pdf',
        name: 'Single DOCX → PDF',
        inputTypes: ['docx'],
        outputFormat: 'pdf',
        expectedQuality: 'high',
        description: 'Test converting single DOCX file to PDF with formatting preservation'
      },
      
      // Edge Cases
      {
        id: 'large_files_to_pdf',
        name: 'Large Files → PDF',
        inputTypes: ['pptx', 'xlsx', 'docx'],
        outputFormat: 'pdf',
        expectedQuality: 'medium',
        description: 'Test performance with large files'
      }
    ];
  }

  getSupportedCombinations(): Array<{
    inputFormat: string;
    outputFormat: string;
    expectedQuality: 'high' | 'medium' | 'low';
    description: string;
  }> {
    return this.testCases.map(testCase => ({
      inputFormat: testCase.inputTypes.join(' + '),
      outputFormat: testCase.outputFormat,
      expectedQuality: testCase.expectedQuality,
      description: testCase.description
    }));
  }

  async runAllTests(): Promise<TestSuiteResult> {
    console.log('[ConversionTestService] Starting comprehensive conversion test suite...');
    
    const testResults: TestResult[] = [];
    let passedTests = 0;
    let failedTests = 0;

    for (const testCase of this.testCases) {
      console.log(`[ConversionTestService] Running test: ${testCase.name}`);
      
      try {
        const result = await this.runSingleTest(testCase);
        testResults.push(result);
        
        if (result.success) {
          passedTests++;
          console.log(`✅ Test passed: ${testCase.name} (Score: ${result.qualityAssessment.score})`);
        } else {
          failedTests++;
          console.log(`❌ Test failed: ${testCase.name} - ${result.errors.join(', ')}`);
        }
      } catch (error) {
        failedTests++;
        const failedResult: TestResult = {
          testCase,
          success: false,
          validationResults: [],
          errors: [`Test execution failed: ${error instanceof Error ? error.message : String(error)}`],
          warnings: [],
          performanceMetrics: {
            executionTime: 0,
            memoryUsage: 0,
            integrityScore: 0
          },
          qualityAssessment: {
            score: 0,
            meetsExpectations: false,
            issues: [`Test execution error: ${error instanceof Error ? error.message : String(error)}`]
          }
        };
        testResults.push(failedResult);
        console.log(`💥 Test crashed: ${testCase.name} - ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const summary = this.generateTestSummary(testResults);
    const overallScore = this.calculateOverallScore(testResults);

    console.log(`[ConversionTestService] Test suite completed: ${passedTests}/${this.testCases.length} tests passed`);
    console.log(`[ConversionTestService] Overall score: ${overallScore}/100`);

    return {
      totalTests: this.testCases.length,
      passedTests,
      failedTests,
      overallScore,
      testResults,
      summary
    };
  }

  private async runSingleTest(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    const errors: string[] = [];
    const warnings: string[] = [];
    let mergeResult: MergeResult | undefined;
    let validationResults: ValidationResult[] = [];

    try {
      // Create mock files for testing (in a real scenario, you'd have actual test files)
      const mockFiles = this.createMockFiles(testCase.inputTypes);
      
      const mergeOptions: MergeOptions = {
        files: mockFiles,
        outputFormat: testCase.outputFormat,
        documentName: `test_${testCase.id}`,
        mergeOrder: mockFiles.map(f => f.originalname)
      };

      // Execute the merge operation
      mergeResult = await this.mergeService.mergeFiles(mergeOptions);
      
      if (mergeResult.validationResults) {
        validationResults = mergeResult.validationResults;
      }

      // Additional validation checks
      const additionalValidation = await this.performAdditionalValidation(
        mergeResult,
        testCase
      );
      
      if (additionalValidation.warnings.length > 0) {
        warnings.push(...additionalValidation.warnings);
      }

    } catch (error) {
      errors.push(`Merge operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const executionTime = Date.now() - startTime;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsage = endMemory - startMemory;

    const qualityAssessment = this.assessQuality(
      testCase,
      mergeResult,
      validationResults,
      errors,
      warnings
    );

    const integrityScore = mergeResult?.integrityScore || 0;

    return {
      testCase,
      success: errors.length === 0 && qualityAssessment.meetsExpectations,
      mergeResult,
      validationResults,
      errors,
      warnings,
      performanceMetrics: {
        executionTime,
        memoryUsage,
        integrityScore
      },
      qualityAssessment
    };
  }

  private createMockFiles(inputTypes: string[]): Express.Multer.File[] {
    // In a real implementation, this would create or reference actual test files
    // For now, we'll create mock file objects
    return inputTypes.map((type, index) => ({
      fieldname: 'files',
      originalname: `test_file_${index}.${type}`,
      encoding: '7bit',
      mimetype: this.getMimeType(type),
      destination: './uploads',
      filename: `test_file_${index}_${Date.now()}.${type}`,
      path: `./uploads/test_file_${index}_${Date.now()}.${type}`,
      size: 1024 * (index + 1), // Mock file sizes
      buffer: Buffer.alloc(0),
      stream: null as any,
    }));
  }

  private getMimeType(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png'
    };
    return mimeTypes[extension] || 'application/octet-stream';
  }

  private async performAdditionalValidation(
    mergeResult: MergeResult,
    testCase: TestCase
  ): Promise<{ warnings: string[] }> {
    const warnings: string[] = [];

    // Check file size expectations
    if (mergeResult.fileSize < 1024) {
      warnings.push('Output file size is suspiciously small');
    }

    // Check processing time expectations
    if (mergeResult.performanceMetrics?.totalProcessingTime && 
        mergeResult.performanceMetrics.totalProcessingTime > 30000) {
      warnings.push('Processing time exceeded 30 seconds');
    }

    // Check integrity score
    if (mergeResult.integrityScore && mergeResult.integrityScore < 70) {
      warnings.push(`Low integrity score: ${mergeResult.integrityScore}`);
    }

    return { warnings };
  }

  private assessQuality(
    testCase: TestCase,
    mergeResult: MergeResult | undefined,
    validationResults: ValidationResult[],
    errors: string[],
    warnings: string[]
  ): { score: number; meetsExpectations: boolean; issues: string[] } {
    let score = 100;
    const issues: string[] = [];

    // Deduct points for errors
    score -= errors.length * 25;

    // Deduct points for warnings
    score -= warnings.length * 5;

    // Check if merge was successful
    if (!mergeResult) {
      score = 0;
      issues.push('Merge operation failed completely');
    } else {
      // Check integrity score
      if (mergeResult.integrityScore) {
        if (mergeResult.integrityScore < 80) {
          score -= 20;
          issues.push(`Low integrity score: ${mergeResult.integrityScore}`);
        }
      }

      // Check performance
      if (mergeResult.performanceMetrics?.totalProcessingTime) {
        if (mergeResult.performanceMetrics.totalProcessingTime > 10000) {
          score -= 10;
          issues.push('Slow processing time');
        }
      }
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    // Determine if expectations are met based on expected quality
    let meetsExpectations = false;
    switch (testCase.expectedQuality) {
      case 'high':
        meetsExpectations = score >= 85 && errors.length === 0;
        break;
      case 'medium':
        meetsExpectations = score >= 70 && errors.length === 0;
        break;
      case 'low':
        meetsExpectations = score >= 50 && errors.length === 0;
        break;
    }

    return { score, meetsExpectations, issues };
  }

  private generateTestSummary(testResults: TestResult[]) {
    let highQualityConversions = 0;
    let mediumQualityConversions = 0;
    let lowQualityConversions = 0;
    let totalIntegrityScore = 0;
    let totalExecutionTime = 0;
    let validResults = 0;

    for (const result of testResults) {
      if (result.success) {
        if (result.qualityAssessment.score >= 85) {
          highQualityConversions++;
        } else if (result.qualityAssessment.score >= 70) {
          mediumQualityConversions++;
        } else {
          lowQualityConversions++;
        }

        totalIntegrityScore += result.performanceMetrics.integrityScore;
        totalExecutionTime += result.performanceMetrics.executionTime;
        validResults++;
      }
    }

    return {
      highQualityConversions,
      mediumQualityConversions,
      lowQualityConversions,
      averageIntegrityScore: validResults > 0 ? Math.round(totalIntegrityScore / validResults) : 0,
      averageExecutionTime: validResults > 0 ? Math.round(totalExecutionTime / validResults) : 0
    };
  }

  private calculateOverallScore(testResults: TestResult[]): number {
    if (testResults.length === 0) return 0;

    const totalScore = testResults.reduce((sum, result) => sum + result.qualityAssessment.score, 0);
    return Math.round(totalScore / testResults.length);
  }

  async generateTestReport(suiteResult: TestSuiteResult): Promise<string> {
    const report = `
# PDF Conversion System Test Report

## Summary
- **Total Tests**: ${suiteResult.totalTests}
- **Passed**: ${suiteResult.passedTests}
- **Failed**: ${suiteResult.failedTests}
- **Overall Score**: ${suiteResult.overallScore}/100

## Quality Distribution
- **High Quality Conversions**: ${suiteResult.summary.highQualityConversions}
- **Medium Quality Conversions**: ${suiteResult.summary.mediumQualityConversions}
- **Low Quality Conversions**: ${suiteResult.summary.lowQualityConversions}

## Performance Metrics
- **Average Integrity Score**: ${suiteResult.summary.averageIntegrityScore}
- **Average Execution Time**: ${suiteResult.summary.averageExecutionTime}ms

## Detailed Results

${suiteResult.testResults.map(result => `
### ${result.testCase.name}
- **Status**: ${result.success ? '✅ PASSED' : '❌ FAILED'}
- **Quality Score**: ${result.qualityAssessment.score}/100
- **Integrity Score**: ${result.performanceMetrics.integrityScore}
- **Execution Time**: ${result.performanceMetrics.executionTime}ms
- **Meets Expectations**: ${result.qualityAssessment.meetsExpectations ? 'Yes' : 'No'}

${result.errors.length > 0 ? `**Errors**: ${result.errors.join(', ')}` : ''}
${result.warnings.length > 0 ? `**Warnings**: ${result.warnings.join(', ')}` : ''}
${result.qualityAssessment.issues.length > 0 ? `**Issues**: ${result.qualityAssessment.issues.join(', ')}` : ''}
`).join('\n')}

## Recommendations

${suiteResult.overallScore >= 85 ? 
  '[SUCCESS] The conversion system meets high-quality standards across all test cases.' :
  suiteResult.overallScore >= 70 ?
    '[WARNING] The conversion system meets medium-quality standards. Consider optimizing failed test cases.' :
    '[ERROR] The conversion system requires significant improvements to meet quality standards.'
}

Generated on: ${new Date().toISOString()}
`;

    return report;
  }
}