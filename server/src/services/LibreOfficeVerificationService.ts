import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface LibreOfficeStatus {
  isInstalled: boolean;
  path: string | null;
  version: string | null;
  canConvert: boolean;
  error: string | null;
}

export class LibreOfficeVerificationService {
  private static instance: LibreOfficeVerificationService;
  private status: LibreOfficeStatus | null = null;

  static getInstance(): LibreOfficeVerificationService {
    if (!LibreOfficeVerificationService.instance) {
      LibreOfficeVerificationService.instance = new LibreOfficeVerificationService();
    }
    return LibreOfficeVerificationService.instance;
  }

  async verifyLibreOfficeInstallation(): Promise<LibreOfficeStatus> {
    console.log('🔍 Verifying LibreOffice installation...');
    
    const status: LibreOfficeStatus = {
      isInstalled: false,
      path: null,
      version: null,
      canConvert: false,
      error: null
    };

    try {
      // Try to find LibreOffice
      const libreOfficePath = await this.findLibreOfficePath();
      
      if (!libreOfficePath) {
        status.error = 'LibreOffice not found in any expected location';
        console.error('❌ LibreOffice not found');
        this.status = status;
        return status;
      }

      status.path = libreOfficePath;
      status.isInstalled = true;
      console.log(`✅ LibreOffice found at: ${libreOfficePath}`);

      // Get version
      try {
        const versionResult = await this.getLibreOfficeVersion(libreOfficePath);
        status.version = versionResult;
        console.log(`📋 LibreOffice version: ${versionResult}`);
      } catch (error) {
        console.warn('⚠️ Could not get LibreOffice version:', error);
      }

      // Test conversion capability
      try {
        const canConvert = await this.testConversionCapability(libreOfficePath);
        status.canConvert = canConvert;
        
        if (canConvert) {
          console.log('✅ LibreOffice conversion test successful');
        } else {
          console.error('❌ LibreOffice conversion test failed');
          status.error = 'LibreOffice found but conversion test failed';
        }
      } catch (error) {
        console.error('❌ LibreOffice conversion test error:', error);
        status.error = `Conversion test failed: ${error instanceof Error ? error.message : String(error)}`;
      }

    } catch (error) {
      status.error = `LibreOffice verification failed: ${error instanceof Error ? error.message : String(error)}`;
      console.error('❌ LibreOffice verification failed:', error);
    }

    this.status = status;
    return status;
  }

  private async findLibreOfficePath(): Promise<string | null> {
    const possiblePaths = [
      process.env.LIBREOFFICE_PATH || '/usr/bin/libreoffice', // Environment variable first
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
      '/usr/bin/libreoffice',
      '/usr/local/bin/libreoffice',
      '/opt/libreoffice/program/soffice',
      '/usr/bin/soffice',
      '/snap/bin/libreoffice', // Snap installation
      '/usr/lib/libreoffice/program/soffice', // Alternative Debian location
      'soffice', // Try system PATH
      'libreoffice' // Alternative command
    ];

    console.log('🔍 Searching for LibreOffice in the following paths:');
    
    for (const testPath of possiblePaths) {
      console.log(`   Testing: ${testPath}`);
      
      try {
        if (testPath.includes('\\') || testPath.includes('/')) {
          // Absolute path - check if file exists
          const exists = fs.existsSync(testPath);
          console.log(`     File exists: ${exists}`);
          
          if (exists) {
            // Test if it's executable
            try {
              // For Windows, try both --version and --headless --version
              let versionCommand = `"${testPath}" --version`;
              if (process.platform === 'win32') {
                versionCommand = `"${testPath}" --headless --version`;
              }
              
              const { stdout } = await execAsync(versionCommand, { timeout: 15000 });
              console.log(`     ✅ Executable and working: ${testPath}`);
              console.log(`     Version output: ${stdout.trim()}`);
              return testPath;
            } catch (error) {
              // On Windows, try without --headless if the first attempt failed
              if (process.platform === 'win32') {
                try {
                  const { stdout } = await execAsync(`"${testPath}" --version`, { timeout: 15000 });
                  console.log(`     ✅ Executable and working (fallback): ${testPath}`);
                  console.log(`     Version output: ${stdout.trim()}`);
                  return testPath;
                } catch (fallbackError) {
                  // On Windows, if version check fails but file exists, assume it's working
                  console.warn(`     ⚠️ Version check failed but file exists, assuming working: ${testPath}`);
                  return testPath;
                }
              } else {
                console.warn(`     ❌ Path exists but not executable: ${testPath}`, error);
                continue;
              }
            }
          }
        } else {
          // Command in PATH - test if it works
          try {
            const { stdout } = await execAsync(`${testPath} --version`, { timeout: 30000 });
            console.log(`     ✅ Found in PATH: ${testPath}`);
            console.log(`     Version output: ${stdout.trim()}`);
            return testPath;
          } catch (error) {
            console.log(`     ❌ Not found in PATH: ${testPath}`);
          }
        }
      } catch (error) {
        console.log(`     ❌ Error testing ${testPath}:`, error);
        continue;
      }
    }

    // Additional debugging - try to find any libreoffice-related files (OS-aware)
    console.log('🔍 Searching for any LibreOffice-related files...');
    try {
      const isWindows = process.platform === 'win32';
      
      if (isWindows) {
        // Windows: Search in Program Files directories
        const searchPaths = [
          'C:\\Program Files\\LibreOffice',
          'C:\\Program Files (x86)\\LibreOffice'
        ];
        
        for (const searchPath of searchPaths) {
          if (fs.existsSync(searchPath)) {
            console.log(`Found LibreOffice directory: ${searchPath}`);
            try {
              const files = fs.readdirSync(searchPath);
              console.log(`Contents: ${files.join(', ')}`);
            } catch (error) {
              console.log(`Could not list contents of ${searchPath}`);
            }
          }
        }
      } else {
        // Linux/Unix: Use find command
        const { stdout: findResult } = await execAsync('find /usr -name "*libreoffice*" -type f 2>/dev/null | head -10', { timeout: 15000 });
        if (findResult.trim()) {
          console.log('Found LibreOffice-related files:');
          console.log(findResult);
        } else {
          console.log('No LibreOffice-related files found in /usr');
        }
      }
    } catch (error) {
      console.log('Could not search for LibreOffice files:', error);
    }

    // Check if LibreOffice package is installed (Linux only)
    if (process.platform !== 'win32') {
      try {
        const { stdout: dpkgResult } = await execAsync('dpkg -l | grep libreoffice', { timeout: 10000 });
        if (dpkgResult.trim()) {
          console.log('LibreOffice packages found:');
          console.log(dpkgResult);
        } else {
          console.log('No LibreOffice packages found via dpkg');
        }
      } catch (error) {
        console.log('Could not check dpkg for LibreOffice packages:', error);
      }
    }

    return null;
  }

  private async getLibreOfficeVersion(libreOfficePath: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`"${libreOfficePath}" --version`, { timeout: 10000 });
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to get LibreOffice version: ${error}`);
    }
  }

  private async testConversionCapability(libreOfficePath: string): Promise<boolean> {
    const tempDir = process.env.TEMP_DIR || './temp';
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create a simple test document
    const testDocPath = path.join(tempDir, 'libreoffice-test.txt');
    const testContent = 'LibreOffice Test Document\nThis is a test for PowerPoint conversion capability.';
    
    try {
      fs.writeFileSync(testDocPath, testContent);

      // Try to convert the test document to PDF
      const command = `"${libreOfficePath}" --headless --invisible --nodefault --nolockcheck --nologo --norestore --convert-to pdf --outdir "${tempDir}" "${testDocPath}"`;
      
      await execAsync(command, { timeout: 30000 });

      // Check if PDF was created
      const testPdfPath = path.join(tempDir, 'libreoffice-test.pdf');
      const pdfExists = fs.existsSync(testPdfPath);

      // Cleanup test files
      try {
        if (fs.existsSync(testDocPath)) fs.unlinkSync(testDocPath);
        if (fs.existsSync(testPdfPath)) fs.unlinkSync(testPdfPath);
      } catch (cleanupError) {
        console.warn('Warning: Could not cleanup test files:', cleanupError);
      }

      return pdfExists;
    } catch (error) {
      // Cleanup test files on error
      try {
        if (fs.existsSync(testDocPath)) fs.unlinkSync(testDocPath);
      } catch (cleanupError) {
        console.warn('Warning: Could not cleanup test files after error:', cleanupError);
      }
      
      throw error;
    }
  }

  getStatus(): LibreOfficeStatus | null {
    return this.status;
  }

  async getStatusReport(): Promise<string> {
    if (!this.status) {
      await this.verifyLibreOfficeInstallation();
    }

    const status = this.status!;
    
    let report = '📋 LibreOffice Status Report:\n';
    report += `   Installed: ${status.isInstalled ? '✅ Yes' : '❌ No'}\n`;
    
    if (status.path) {
      report += `   Path: ${status.path}\n`;
    }
    
    if (status.version) {
      report += `   Version: ${status.version}\n`;
    }
    
    report += `   Can Convert: ${status.canConvert ? '✅ Yes' : '❌ No'}\n`;
    
    if (status.error) {
      report += `   Error: ${status.error}\n`;
    }

    return report;
  }
}