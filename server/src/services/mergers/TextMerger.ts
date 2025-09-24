import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import csv from 'csv-parser';

export class TextMerger {
  private content: string[] = [];

  async addTextFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const filename = path.basename(filePath);
      
      this.content.push(`--- Content from ${filename} ---`);
      this.content.push(content);
      this.content.push(''); // Empty line separator
    } catch (error) {
      throw new Error(`Failed to add text file: ${error}`);
    }
  }

  async addCSVFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const rows: any[] = [];
      const filename = path.basename(filePath);
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          rows.push(row);
        })
        .on('end', () => {
          try {
            this.content.push(`--- CSV Content from ${filename} ---`);
            
            if (rows.length > 0) {
              // Add headers
              const headers = Object.keys(rows[0]);
              this.content.push(headers.join('\t'));
              
              // Add data rows
              rows.forEach((row: any) => {
                const values = headers.map((header: string) => row[header] || '');
                this.content.push(values.join('\t'));
              });
            }
            
            this.content.push(''); // Empty line separator
            resolve();
          } catch (error: any) {
            reject(new Error(`Failed to process CSV file: ${error}`));
          }
        })
        .on('error', (error: any) => {
          reject(new Error(`Failed to read CSV file: ${error}`));
        });
    });
  }

  async save(outputPath: string): Promise<void> {
    try {
      const mergedContent = this.content.join('\n');
      fs.writeFileSync(outputPath, mergedContent, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save merged text: ${error}`);
    }
  }

  async convertToPDF(filePath: string): Promise<string> {
    const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
    const tempDir = process.env.TEMP_DIR || './temp';
    const tempPdfPath = path.join(tempDir, `${uuidv4()}.pdf`);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 12;
      const lineHeight = fontSize * 1.2;
      const margin = 50;
      const pageWidth = 595; // A4 width in points
      const pageHeight = 842; // A4 height in points
      const maxWidth = pageWidth - (margin * 2);
      const maxLinesPerPage = Math.floor((pageHeight - (margin * 2)) / lineHeight);

      let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let currentY = pageHeight - margin;
      let lineCount = 0;

      for (const line of lines) {
        // Check if we need a new page
        if (lineCount >= maxLinesPerPage) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
          lineCount = 0;
        }

        // Handle long lines by wrapping
        const words = line.split(' ');
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const textWidth = font.widthOfTextAtSize(testLine, fontSize);
          
          if (textWidth <= maxWidth) {
            currentLine = testLine;
          } else {
            // Draw current line and start new one
            if (currentLine) {
              currentPage.drawText(currentLine, {
                x: margin,
                y: currentY,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
              });
              currentY -= lineHeight;
              lineCount++;
              
              // Check if we need a new page
              if (lineCount >= maxLinesPerPage) {
                currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
                currentY = pageHeight - margin;
                lineCount = 0;
              }
            }
            currentLine = word;
          }
        }
        
        // Draw remaining text
        if (currentLine) {
          currentPage.drawText(currentLine, {
            x: margin,
            y: currentY,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          currentY -= lineHeight;
          lineCount++;
        }
      }

      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(tempPdfPath, pdfBytes);
      
      return tempPdfPath;
    } catch (error) {
      throw new Error(`Failed to convert text to PDF: ${error}`);
    }
  }

  async convertCSVToPDF(filePath: string): Promise<string> {
    const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
    const tempDir = process.env.TEMP_DIR || './temp';
    const tempPdfPath = path.join(tempDir, `${uuidv4()}.pdf`);

    return new Promise((resolve, reject) => {
      const rows: any[] = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          rows.push(row);
        })
        .on('end', async () => {
          try {
            const pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const fontSize = 10;
            const lineHeight = fontSize * 1.4;
            const margin = 30;
            const pageWidth = 842; // A4 landscape width
            const pageHeight = 595; // A4 landscape height

            let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            let currentY = pageHeight - margin;

            if (rows.length > 0) {
              const headers = Object.keys(rows[0]);
              const colWidth = (pageWidth - (margin * 2)) / headers.length;

              // Draw headers
              headers.forEach((header, index) => {
                currentPage.drawText(header, {
                  x: margin + (index * colWidth),
                  y: currentY,
                  size: fontSize,
                  font,
                  color: rgb(0, 0, 0),
                });
              });
              currentY -= lineHeight;

              // Draw data rows
              for (const row of rows) {
                if (currentY < margin + lineHeight) {
                  currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
                  currentY = pageHeight - margin;
                }

                headers.forEach((header, index) => {
                  const value = (row[header] || '').toString();
                  const truncatedValue = value.length > 20 ? value.substring(0, 17) + '...' : value;
                  
                  currentPage.drawText(truncatedValue, {
                    x: margin + (index * colWidth),
                    y: currentY,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0),
                  });
                });
                currentY -= lineHeight;
              }
            }

            const pdfBytes = await pdfDoc.save();
            fs.writeFileSync(tempPdfPath, pdfBytes);
            resolve(tempPdfPath);
          } catch (error) {
            reject(new Error(`Failed to convert CSV to PDF: ${error}`));
          }
        })
        .on('error', (error) => {
          reject(new Error(`Failed to read CSV file: ${error}`));
        });
    });
  }
}