import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Import libreoffice-convert as fallback
let libreOfficeConvert: any;
try {
  libreOfficeConvert = require('libreoffice-convert');
} catch (error) {
  console.warn('libreoffice-convert package not available');
}

export class PresentationMerger {
  private presentations: { filePath: string; filename: string }[] = [];
  private libreOfficePath = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';

  async addPresentationFile(filePath: string): Promise<void> {
    try {
      const filename = path.basename(filePath);
      this.presentations.push({ filePath, filename });
    } catch (error) {
      throw new Error(`Failed to add presentation file: ${error}`);
    }
  }

  async save(outputPath: string): Promise<void> {
    // For now, this is a placeholder implementation
    // Full PPTX merging would require a library like node-pptx or similar
    try {
      const summaryContent = this.presentations.map((pres, index) => 
        `Presentation ${index + 1}: ${pres.filename}`
      ).join('\n');
      
      fs.writeFileSync(outputPath.replace('.pptx', '.txt'), 
        `Merged Presentations Summary:\n\n${summaryContent}\n\nNote: Full PPTX merging requires additional implementation.`
      );
    } catch (error) {
      throw new Error(`Failed to save merged presentation: ${error}`);
    }
  }

  async convertToPDF(filePath: string): Promise<string> {
    const tempDir = process.env.TEMP_DIR || './temp';
    const tempPdfPath = path.join(tempDir, `${uuidv4()}.pdf`);

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Strategy 1: Try LibreOffice command line (best quality)
    try {
      return await this.convertWithLibreOfficeCommand(filePath, tempDir, tempPdfPath);
    } catch (error) {
      console.warn(`LibreOffice command failed: ${error.message}`);
    }

    // Strategy 2: Try libreoffice-convert package (cloud-friendly)
    try {
      return await this.convertWithLibreOfficePackage(filePath, tempPdfPath);
    } catch (error) {
      console.warn(`LibreOffice package failed: ${error.message}`);
    }

    // Strategy 3: Try online conversion service (mobile-friendly)
    try {
      return await this.convertWithOnlineService(filePath, tempPdfPath);
    } catch (error) {
      console.warn(`Online conversion failed: ${error.message}`);
    }

    // Strategy 4: Create informative placeholder PDF
    return await this.createPlaceholderPDF(filePath, tempPdfPath);
  }

  private async convertWithLibreOfficeCommand(filePath: string, tempDir: string, tempPdfPath: string): Promise<string> {
    const command = `"${this.libreOfficePath}" --headless --convert-to pdf --outdir "${tempDir}" "${filePath}"`;
    
    console.log(`Converting PowerPoint with LibreOffice command: ${command}`);
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(`LibreOffice stderr: ${stderr}`);
    }
    
    const inputBaseName = path.basename(filePath, path.extname(filePath));
    const libreOfficePdfPath = path.join(tempDir, `${inputBaseName}.pdf`);
    
    if (!fs.existsSync(libreOfficePdfPath)) {
      throw new Error(`LibreOffice failed to create PDF: ${libreOfficePdfPath}`);
    }
    
    if (libreOfficePdfPath !== tempPdfPath) {
      fs.renameSync(libreOfficePdfPath, tempPdfPath);
    }
    
    console.log(`✅ PowerPoint converted with LibreOffice command: ${tempPdfPath}`);
    return tempPdfPath;
  }

  private async convertWithLibreOfficePackage(filePath: string, tempPdfPath: string): Promise<string> {
    if (!libreOfficeConvert) {
      throw new Error('libreoffice-convert package not available');
    }

    console.log(`Converting PowerPoint with libreoffice-convert package`);
    
    const inputBuffer = fs.readFileSync(filePath);
    
    return new Promise((resolve, reject) => {
      libreOfficeConvert.convert(inputBuffer, '.pdf', undefined, (err: any, done: Buffer) => {
        if (err) {
          reject(new Error(`libreoffice-convert error: ${err.message}`));
          return;
        }
        
        try {
          fs.writeFileSync(tempPdfPath, done);
          console.log(`✅ PowerPoint converted with libreoffice-convert: ${tempPdfPath}`);
          resolve(tempPdfPath);
        } catch (writeError) {
          reject(new Error(`Failed to write converted PDF: ${writeError}`));
        }
      });
    });
  }

  private async convertWithOnlineService(filePath: string, tempPdfPath: string): Promise<string> {
    // This is a placeholder for online conversion services
    // In production, you could integrate with services like:
    // - CloudConvert API
    // - Zamzar API
    // - ConvertAPI
    // - Adobe PDF Services API
    
    console.log(`Online conversion service not implemented yet`);
    throw new Error('Online conversion service not available');
  }

  private async createPlaceholderPDF(filePath: string, tempPdfPath: string): Promise<string> {
    console.log(`Creating placeholder PDF for: ${path.basename(filePath)}`);
    
    const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
    
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      
      // Title
      page.drawText('PowerPoint File Included', {
        x: 50,
        y: height - 100,
        size: 24,
        font: boldFont,
        color: rgb(0.2, 0.4, 0.8),
      });
      
      // Filename
      page.drawText(`📄 ${path.basename(filePath)}`, {
        x: 50,
        y: height - 150,
        size: 16,
        font,
        color: rgb(0, 0, 0),
      });
      
      // Mobile compatibility message
      page.drawText('📱 Mobile-Friendly Notice:', {
        x: 50,
        y: height - 200,
        size: 14,
        font: boldFont,
        color: rgb(0.8, 0.4, 0),
      });
      
      page.drawText('This PowerPoint file is included in your merged document.', {
        x: 50,
        y: height - 230,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('For full visual content, please:', {
        x: 50,
        y: height - 250,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('• Download the original PowerPoint file separately', {
        x: 70,
        y: height - 280,
        size: 11,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      
      page.drawText('• Use a desktop computer with LibreOffice for full conversion', {
        x: 70,
        y: height - 300,
        size: 11,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      
      page.drawText('• Try our web-based converter (coming soon)', {
        x: 70,
        y: height - 320,
        size: 11,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      
      // Technical info
      page.drawText('Technical Details:', {
        x: 50,
        y: height - 370,
        size: 12,
        font: boldFont,
        color: rgb(0.5, 0.5, 0.5),
      });
      
      page.drawText('PowerPoint conversion requires specialized software that may not be', {
        x: 50,
        y: height - 390,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      
      page.drawText('available on all mobile devices or cloud platforms.', {
        x: 50,
        y: height - 405,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(tempPdfPath, pdfBytes);
      
      console.log(`✅ Created mobile-friendly placeholder PDF: ${tempPdfPath}`);
      return tempPdfPath;
      
    } catch (error) {
      throw new Error(`Failed to create placeholder PDF: ${error}`);
    }
  }
}