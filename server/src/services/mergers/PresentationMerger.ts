import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';

export class PresentationMerger {
  private presentations: { filePath: string; filename: string }[] = [];

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

  private async extractPPTXContent(filePath: string): Promise<{ slides: string[], title: string }> {
    const AdmZip = require('adm-zip');
    
    try {
      const zip = new AdmZip(filePath);
      const zipEntries = zip.getEntries();
      
      let title = path.basename(filePath, '.pptx');
      const slides: string[] = [];
      
      // Extract slide content from XML files
      zipEntries.forEach((entry: any) => {
        if (entry.entryName.startsWith('ppt/slides/slide') && entry.entryName.endsWith('.xml')) {
          const slideXml = entry.getData().toString('utf8');
          const slideText = this.extractTextFromSlideXML(slideXml);
          if (slideText.trim()) {
            slides.push(slideText);
          }
        }
        
        // Try to get presentation title from core properties
        if (entry.entryName === 'docProps/core.xml') {
          const coreXml = entry.getData().toString('utf8');
          const titleMatch = coreXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1];
          }
        }
      });
      
      return { slides, title };
    } catch (error) {
      console.warn(`Failed to extract PPTX content from ${filePath}:`, error);
      return { 
        slides: [`Content from ${path.basename(filePath)}`], 
        title: path.basename(filePath, '.pptx') 
      };
    }
  }

  private extractTextFromSlideXML(xml: string): string {
    // Extract text content from PowerPoint slide XML
    const textElements: string[] = [];
    
    // Match text content within <a:t> tags
    const textMatches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
    if (textMatches) {
      textMatches.forEach(match => {
        const textContent = match.replace(/<a:t[^>]*>([^<]+)<\/a:t>/, '$1');
        if (textContent.trim()) {
          textElements.push(textContent.trim());
        }
      });
    }
    
    // Also try to match text in <t> tags (alternative format)
    const altTextMatches = xml.match(/<t[^>]*>([^<]+)<\/t>/g);
    if (altTextMatches) {
      altTextMatches.forEach(match => {
        const textContent = match.replace(/<t[^>]*>([^<]+)<\/t>/, '$1');
        if (textContent.trim()) {
          textElements.push(textContent.trim());
        }
      });
    }
    
    return this.sanitizeTextForPDF(textElements.join(' '));
  }

  private sanitizeTextForPDF(text: string): string {
    // Replace common Unicode characters that WinAnsi cannot encode
    const unicodeReplacements: { [key: string]: string } = {
      '\u2713': 'v',      // Check mark ✓
      '\u2717': 'x',      // X mark ✗
      '\u2022': '*',      // Bullet point •
      '\u2013': '-',      // En dash –
      '\u2014': '--',     // Em dash —
      '\u2018': "'",      // Left single quotation mark '
      '\u2019': "'",      // Right single quotation mark '
      '\u201C': '"',      // Left double quotation mark "
      '\u201D': '"',      // Right double quotation mark "
      '\u2026': '...',    // Horizontal ellipsis …
      '\u00A9': '(c)',    // Copyright symbol ©
      '\u00AE': '(R)',    // Registered trademark ®
      '\u2122': '(TM)',   // Trademark symbol ™
      '\u00B0': 'deg',    // Degree symbol °
      '\u00B1': '+/-',    // Plus-minus sign ±
      '\u00D7': 'x',      // Multiplication sign ×
      '\u00F7': '/',      // Division sign ÷
      '\u20AC': 'EUR',    // Euro sign €
      '\u00A3': 'GBP',    // Pound sign £
      '\u00A5': 'JPY',    // Yen sign ¥
      '\u00A7': 'S',      // Section sign §
      '\u00B6': 'P',      // Pilcrow sign ¶
      '\u2020': '+',      // Dagger †
      '\u2021': '++',     // Double dagger ‡
      '\u2030': 'o/oo',   // Per mille sign ‰
      '\u2039': '<',      // Single left-pointing angle quotation mark ‹
      '\u203A': '>',      // Single right-pointing angle quotation mark ›
      '\u00AB': '<<',     // Left-pointing double angle quotation mark «
      '\u00BB': '>>',     // Right-pointing double angle quotation mark »
    };

    let sanitizedText = text;
    
    // Replace known Unicode characters
    for (const [unicode, replacement] of Object.entries(unicodeReplacements)) {
      sanitizedText = sanitizedText.replace(new RegExp(unicode, 'g'), replacement);
    }
    
    // Remove any remaining characters that are not in the WinAnsi character set (0x20-0xFF)
    // Keep basic ASCII characters (0x20-0x7F) and extended ASCII (0x80-0xFF)
    sanitizedText = sanitizedText.replace(/[^\x20-\xFF]/g, '?');
    
    return sanitizedText;
  }

  async convertToPDF(filePath: string): Promise<string> {
    const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
    const tempDir = process.env.TEMP_DIR || './temp';
    const tempPdfPath = path.join(tempDir, `${uuidv4()}.pdf`);

    try {
      // Extract actual content from the PPTX file
      const { slides, title } = await this.extractPPTXContent(filePath);
      
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Create title page
      let page = pdfDoc.addPage();
      let { width, height } = page.getSize();
      let currentY = height - 80;
      
      // Draw title
      page.drawText(this.sanitizeTextForPDF(title), {
        x: 50,
        y: currentY,
        size: 20,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      
      currentY -= 40;
      page.drawText(`PowerPoint Presentation (${slides.length} slides)`, {
        x: 50,
        y: currentY,
        size: 14,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      
      currentY -= 60;
      
      // Process each slide
      slides.forEach((slideContent, index) => {
        // Check if we need a new page
        if (currentY < 150) {
          page = pdfDoc.addPage();
          currentY = height - 80;
        }
        
        // Draw slide header
        page.drawText(`Slide ${index + 1}`, {
          x: 50,
          y: currentY,
          size: 16,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        
        currentY -= 30;
        
        // Draw slide content with word wrapping
        const words = slideContent.split(' ');
        let currentLine = '';
        const maxWidth = width - 100;
        const lineHeight = 16;
        
        for (const word of words) {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const textWidth = font.widthOfTextAtSize(testLine, 12);
          
          if (textWidth > maxWidth && currentLine) {
            // Draw current line and start new one
            page.drawText(currentLine, {
              x: 70,
              y: currentY,
              size: 12,
              font,
              color: rgb(0, 0, 0),
            });
            
            currentY -= lineHeight;
            currentLine = word;
            
            // Check if we need a new page
            if (currentY < 100) {
              page = pdfDoc.addPage();
              currentY = height - 80;
            }
          } else {
            currentLine = testLine;
          }
        }
        
        // Draw the last line
        if (currentLine) {
          page.drawText(currentLine, {
            x: 70,
            y: currentY,
            size: 12,
            font,
            color: rgb(0, 0, 0),
          });
          currentY -= lineHeight;
        }
        
        currentY -= 20; // Extra space between slides
      });
      
      // If no content was extracted, show a message
      if (slides.length === 0) {
        if (currentY > height - 200) {
          currentY -= 40;
        }
        
        page.drawText('No text content could be extracted from this presentation.', {
          x: 50,
          y: currentY,
          size: 12,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
        
        currentY -= 20;
        page.drawText('The presentation may contain only images or complex formatting.', {
          x: 50,
          y: currentY,
          size: 12,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(tempPdfPath, pdfBytes);
      
      return tempPdfPath;
    } catch (error) {
      throw new Error(`Failed to convert presentation to PDF: ${error}`);
    }
  }
}