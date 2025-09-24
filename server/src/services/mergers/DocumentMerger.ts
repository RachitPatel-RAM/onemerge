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
    // This is a placeholder implementation
    // In a real scenario, you'd use a library like puppeteer or LibreOffice
    const tempDir = process.env.TEMP_DIR || './temp';
    const tempPdfPath = path.join(tempDir, `${uuidv4()}.pdf`);
    
    // For now, create a simple PDF with text content
    const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
    
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const filename = path.basename(filePath);
      page.drawText(`Content from DOCX file: ${filename}`, {
        x: 50,
        y: 750,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('Note: Full DOCX to PDF conversion requires additional implementation.', {
        x: 50,
        y: 720,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });

      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(tempPdfPath, pdfBytes);
      
      return tempPdfPath;
    } catch (error) {
      throw new Error(`Failed to convert DOCX to PDF: ${error}`);
    }
  }
}