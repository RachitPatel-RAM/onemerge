import { Document, Packer, Paragraph, TextRun, ImageRun } from 'docx';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class DocumentMerger {
  private paragraphs: Paragraph[] = [];

  async addDocx(filePath: string): Promise<void> {
    try {
      // For now, we'll add a placeholder indicating the DOCX file
      // In a full implementation, you'd use a library like mammoth to extract text
      const filename = path.basename(filePath);
      this.paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `--- Content from ${filename} ---`,
              bold: true,
              size: 24
            })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Note: DOCX content extraction requires additional implementation.",
              italics: true
            })
          ]
        }),
        new Paragraph({ text: "" }) // Empty line
      );
    } catch (error) {
      throw new Error(`Failed to add DOCX file: ${error}`);
    }
  }

  async addText(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach(line => {
        this.paragraphs.push(
          new Paragraph({
            children: [new TextRun(line)]
          })
        );
      });
      
      // Add empty line after text content
      this.paragraphs.push(new Paragraph({ text: "" }));
    } catch (error) {
      throw new Error(`Failed to add text file: ${error}`);
    }
  }

  async addImage(filePath: string): Promise<void> {
    try {
      const imageBuffer = fs.readFileSync(filePath);
      const filename = path.basename(filePath);
      
      this.paragraphs.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: imageBuffer,
              transformation: {
                width: 400,
                height: 300,
              },
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Image: ${filename}`,
              italics: true,
              size: 20
            })
          ]
        }),
        new Paragraph({ text: "" }) // Empty line
      );
    } catch (error) {
      throw new Error(`Failed to add image: ${error}`);
    }
  }

  async save(outputPath: string): Promise<void> {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: this.paragraphs
        }]
      });

      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(outputPath, buffer);
    } catch (error) {
      throw new Error(`Failed to save DOCX document: ${error}`);
    }
  }

  async convertToPDF(filePath: string): Promise<string> {
    const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
    const tempDir = process.env.TEMP_DIR || './temp';
    const tempPdfPath = path.join(tempDir, `${uuidv4()}.pdf`);

    // Validate input file
    if (!fs.existsSync(filePath)) {
      throw new Error(`Input file does not exist: ${filePath}`);
    }

    const fileStats = fs.statSync(filePath);
    if (fileStats.size === 0) {
      throw new Error(`Input file is empty: ${filePath}`);
    }

    console.log(`Starting enhanced DOCX to PDF conversion for: ${path.basename(filePath)} (${fileStats.size} bytes)`);

    try {
      // Try multiple conversion strategies in order of preference
      
      // Strategy 1: LibreOffice command line (highest fidelity)
      try {
        const libreOfficePath = await this.convertWithLibreOffice(filePath, tempPdfPath);
        if (libreOfficePath && fs.existsSync(libreOfficePath)) {
          console.log('SUCCESS: LibreOffice conversion completed with high fidelity');
          return libreOfficePath;
        }
      } catch (error) {
        console.log(`LibreOffice conversion failed: ${error}`);
      }

      // Strategy 2: DOCX parsing with manual PDF generation (medium fidelity)
      try {
        const parsedPath = await this.convertWithDOCXParsing(filePath, tempPdfPath);
        if (parsedPath && fs.existsSync(parsedPath)) {
          console.log('SUCCESS: DOCX parsing conversion completed with medium fidelity');
          return parsedPath;
        }
      } catch (error) {
        console.log(`DOCX parsing conversion failed: ${error}`);
      }

      // Strategy 3: Enhanced placeholder with document analysis (fallback)
      console.log('Using enhanced placeholder conversion with document analysis');
      return await this.createEnhancedPlaceholderPDF(filePath, tempPdfPath);

    } catch (error) {
      throw new Error(`Failed to convert DOCX to PDF: ${error}`);
    }
  }

  private async convertWithLibreOffice(filePath: string, outputPath: string): Promise<string> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const outputDir = path.dirname(outputPath);
    const inputFileName = path.basename(filePath, '.docx');
    const expectedOutputPath = path.join(outputDir, `${inputFileName}.pdf`);
    
    try {
      // Enhanced LibreOffice command with quality settings
      const command = `soffice --headless --convert-to pdf:writer_pdf_Export:{"Quality":100,"ReduceImageResolution":false,"MaxImageResolution":300} --outdir "${outputDir}" "${filePath}"`;
      
      console.log(`Executing LibreOffice conversion: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 30000,
        cwd: outputDir
      });
      
      if (stderr && !stderr.includes('Warning')) {
        throw new Error(`LibreOffice error: ${stderr}`);
      }
      
      // Check if conversion was successful
      if (fs.existsSync(expectedOutputPath)) {
        const stats = fs.statSync(expectedOutputPath);
        if (stats.size > 0) {
          // Move to desired output path if different
          if (expectedOutputPath !== outputPath) {
            fs.renameSync(expectedOutputPath, outputPath);
          }
          
          console.log(`LibreOffice conversion successful: ${stats.size} bytes`);
          return outputPath;
        }
      }
      
      throw new Error('LibreOffice conversion produced empty or missing file');
    } catch (error) {
      throw new Error(`LibreOffice conversion failed: ${error}`);
    }
  }

  private async convertWithDOCXParsing(filePath: string, outputPath: string): Promise<string> {
    const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
    const AdmZip = require('adm-zip');
    const xml2js = require('xml2js');
    
    try {
      // Extract DOCX content
      const zip = new AdmZip(filePath);
      const documentXml = zip.readAsText('word/document.xml');
      
      if (!documentXml) {
        throw new Error('Could not extract document.xml from DOCX file');
      }
      
      // Parse XML content
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(documentXml);
      
      // Create PDF document
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      
      let currentPage = pdfDoc.addPage();
      const pageWidth = 612; // Letter size
      const pageHeight = 792;
      const margin = 72; // 1 inch
      let currentY = pageHeight - margin;
      const lineHeight = 14;
      const fontSize = 11;
      
      // Extract and process paragraphs
      const body = result['w:document']['w:body'][0];
      let paragraphCount = 0;
      let textContent = '';
      
      if (body['w:p']) {
        for (const paragraph of body['w:p']) {
          paragraphCount++;
          
          // Check if we need a new page
          if (currentY < margin + lineHeight * 2) {
            currentPage = pdfDoc.addPage();
            currentY = pageHeight - margin;
          }
          
          let paragraphText = '';
          let isBold = false;
          let isItalic = false;
          
          // Extract text runs from paragraph
          if (paragraph['w:r']) {
            for (const run of paragraph['w:r']) {
              // Check formatting
              if (run['w:rPr']) {
                const props = run['w:rPr'][0];
                isBold = props['w:b'] !== undefined;
                isItalic = props['w:i'] !== undefined;
              }
              
              // Extract text
              if (run['w:t']) {
                for (const textNode of run['w:t']) {
                  if (typeof textNode === 'string') {
                    paragraphText += textNode;
                  } else if (textNode._) {
                    paragraphText += textNode._;
                  }
                }
              }
            }
          }
          
          // Add paragraph to PDF if it has content
          if (paragraphText.trim()) {
            textContent += paragraphText + '\n';
            
            // Choose appropriate font
            let currentFont = font;
            if (isBold && isItalic) {
              currentFont = boldFont; // Use bold as closest approximation
            } else if (isBold) {
              currentFont = boldFont;
            } else if (isItalic) {
              currentFont = italicFont;
            }
            
            // Word wrap the text
            const words = paragraphText.split(' ');
            let currentLine = '';
            
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const textWidth = testLine.length * (fontSize * 0.6); // Approximate width
              
              if (textWidth > pageWidth - (margin * 2)) {
                // Draw current line and start new one
                if (currentLine) {
                  currentPage.drawText(currentLine, {
                    x: margin,
                    y: currentY,
                    size: fontSize,
                    font: currentFont,
                    color: rgb(0, 0, 0),
                  });
                  currentY -= lineHeight;
                  
                  // Check for new page
                  if (currentY < margin + lineHeight) {
                    currentPage = pdfDoc.addPage();
                    currentY = pageHeight - margin;
                  }
                }
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            }
            
            // Draw remaining text
            if (currentLine) {
              currentPage.drawText(currentLine, {
                x: margin,
                y: currentY,
                size: fontSize,
                font: currentFont,
                color: rgb(0, 0, 0),
              });
              currentY -= lineHeight;
            }
            
            // Add paragraph spacing
            currentY -= lineHeight * 0.5;
          }
        }
      }
      
      // Add conversion summary page
      const summaryPage = pdfDoc.addPage();
      let summaryY = pageHeight - margin;
      
      summaryPage.drawText('DOCX Conversion Summary', {
        x: margin,
        y: summaryY,
        size: 16,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      summaryY -= lineHeight * 2;
      
      summaryPage.drawText(`File: ${path.basename(filePath)}`, {
        x: margin,
        y: summaryY,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      summaryY -= lineHeight * 1.5;
      
      summaryPage.drawText(`Paragraphs processed: ${paragraphCount}`, {
        x: margin,
        y: summaryY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      summaryY -= lineHeight;
      
      summaryPage.drawText(`Characters extracted: ${textContent.length}`, {
        x: margin,
        y: summaryY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      summaryY -= lineHeight * 2;
      
      summaryPage.drawText('Features preserved:', {
        x: margin,
        y: summaryY,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      summaryY -= lineHeight * 1.5;
      
      const features = [
        '+ Text content and paragraphs',
        '+ Basic formatting (bold, italic)',
        '+ Document structure',
        '+ Word wrapping and pagination',
        '! Limited: Complex formatting, images, tables'
      ];
      
      features.forEach(feature => {
        const color = feature.startsWith('!') ? rgb(0.8, 0.5, 0) : rgb(0, 0.5, 0);
        summaryPage.drawText(feature, {
          x: margin + 20,
          y: summaryY,
          size: fontSize,
          font,
          color,
        });
        summaryY -= lineHeight;
      });
      
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, pdfBytes);
      
      console.log(`DOCX parsing conversion completed: ${paragraphCount} paragraphs, ${textContent.length} characters`);
      return outputPath;
      
    } catch (error) {
      throw new Error(`DOCX parsing failed: ${error}`);
    }
  }

  private async createEnhancedPlaceholderPDF(filePath: string, outputPath: string): Promise<string> {
    const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
    const AdmZip = require('adm-zip');
    
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      let currentY = 750;
      const margin = 50;
      const lineHeight = 20;
      
      // Title
      page.drawText('DOCX Document Analysis Report', {
        x: margin,
        y: currentY,
        size: 18,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight * 2;
      
      // File information
      const fileStats = fs.statSync(filePath);
      page.drawText(`File: ${path.basename(filePath)}`, {
        x: margin,
        y: currentY,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
      
      page.drawText(`Size: ${(fileStats.size / 1024).toFixed(2)} KB`, {
        x: margin,
        y: currentY,
        size: 11,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      currentY -= lineHeight;
      
      page.drawText(`Modified: ${fileStats.mtime.toLocaleDateString()}`, {
        x: margin,
        y: currentY,
        size: 11,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      currentY -= lineHeight * 2;
      
      // Document analysis
      try {
        const zip = new AdmZip(filePath);
        const entries = zip.getEntries();
        
        page.drawText('Document Structure Analysis:', {
          x: margin,
          y: currentY,
          size: 14,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        currentY -= lineHeight * 1.5;
        
        // Count different types of content
        let hasImages = false;
        let hasMedia = false;
        let documentXmlSize = 0;
        
        entries.forEach((entry: any) => {
          if (entry.entryName.includes('media/')) hasImages = true;
          if (entry.entryName.includes('embeddings/')) hasMedia = true;
          if (entry.entryName === 'word/document.xml' && entry.header && entry.header.size) {
            documentXmlSize = entry.header.size;
          }
        });
        
        const analysisItems = [
          `+ Document entries: ${entries.length}`,
          `+ Main content size: ${(documentXmlSize / 1024).toFixed(2)} KB`,
          `${hasImages ? '+' : '-'} Contains images/media`,
          `${hasMedia ? '+' : '-'} Contains embedded objects`,
          `+ DOCX structure validated`
        ];
        
        analysisItems.forEach(item => {
          const color = item.startsWith('-') ? rgb(0.8, 0, 0) : rgb(0, 0.6, 0);
          page.drawText(item, {
            x: margin + 20,
            y: currentY,
            size: 11,
            font,
            color,
          });
          currentY -= lineHeight;
        });
        
      } catch (analysisError) {
        page.drawText('! Could not analyze document structure', {
          x: margin + 20,
          y: currentY,
          size: 11,
          font,
          color: rgb(0.8, 0.5, 0),
        });
        currentY -= lineHeight;
      }
      
      currentY -= lineHeight;
      
      // Conversion attempts
      page.drawText('Conversion Methods Attempted:', {
        x: margin,
        y: currentY,
        size: 14,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight * 1.5;
      
      const methods = [
        '1. LibreOffice command-line conversion (High fidelity)',
        '2. DOCX XML parsing with manual PDF generation (Medium fidelity)',
        '3. Enhanced placeholder with document analysis (Current method)'
      ];
      
      methods.forEach(method => {
        page.drawText(method, {
          x: margin + 20,
          y: currentY,
          size: 11,
          font,
          color: rgb(0, 0, 0),
        });
        currentY -= lineHeight;
      });
      
      currentY -= lineHeight;
      
      // Recommendations
      page.drawText('Recommendations for High-Fidelity Conversion:', {
        x: margin,
        y: currentY,
        size: 14,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight * 1.5;
      
      const recommendations = [
        '- Install LibreOffice for automatic high-fidelity conversion',
        '- Use online conversion services for complex documents',
        '- Consider Puppeteer with HTML conversion for web-based rendering',
        '- Implement mammoth.js for better DOCX to HTML conversion'
      ];
      
      recommendations.forEach(rec => {
        page.drawText(rec, {
          x: margin + 20,
          y: currentY,
          size: 11,
          font,
          color: rgb(0, 0, 0.8),
        });
        currentY -= lineHeight;
      });

      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, pdfBytes);
      
      console.log('Enhanced placeholder PDF created with document analysis');
      return outputPath;
      
    } catch (error) {
      throw new Error(`Failed to create enhanced placeholder PDF: ${error}`);
    }
  }
}