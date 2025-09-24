import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class SpreadsheetMerger {
  private workbook: XLSX.WorkBook;
  private sheetCounter: number = 1;

  constructor() {
    this.workbook = XLSX.utils.book_new();
  }

  async addExcelFile(filePath: string): Promise<void> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const sourceWorkbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const filename = path.basename(filePath, path.extname(filePath));

      // Add each sheet from the source workbook
      sourceWorkbook.SheetNames.forEach((sheetName: string, index: number) => {
        const worksheet = sourceWorkbook.Sheets[sheetName];
        const newSheetName = `${filename}_${sheetName}`;
        
        // Ensure unique sheet name
        let finalSheetName = newSheetName;
        let counter = 1;
        while (this.workbook.SheetNames.includes(finalSheetName)) {
          finalSheetName = `${newSheetName}_${counter}`;
          counter++;
        }

        XLSX.utils.book_append_sheet(this.workbook, worksheet, finalSheetName);
      });
    } catch (error) {
      throw new Error(`Failed to add Excel file: ${error}`);
    }
  }

  async addCSVFile(filePath: string): Promise<void> {
    try {
      const csvContent = fs.readFileSync(filePath, 'utf-8');
      const worksheet = XLSX.utils.aoa_to_sheet(
        csvContent.split('\n').map(row => row.split(','))
      );
      
      const filename = path.basename(filePath, path.extname(filePath));
      const sheetName = `CSV_${filename}`;
      
      // Ensure unique sheet name
      let finalSheetName = sheetName;
      let counter = 1;
      while (this.workbook.SheetNames.includes(finalSheetName)) {
        finalSheetName = `${sheetName}_${counter}`;
        counter++;
      }

      XLSX.utils.book_append_sheet(this.workbook, worksheet, finalSheetName);
    } catch (error) {
      throw new Error(`Failed to add CSV file: ${error}`);
    }
  }

  async save(outputPath: string): Promise<void> {
    try {
      XLSX.writeFile(this.workbook, outputPath);
    } catch (error) {
      throw new Error(`Failed to save merged spreadsheet: ${error}`);
    }
  }

  async convertToPDF(filePath: string): Promise<string> {
    const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
    const tempDir = process.env.TEMP_DIR || './temp';
    const tempPdfPath = path.join(tempDir, `${uuidv4()}.pdf`);

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 8;
      const lineHeight = fontSize * 1.4;
      const margin = 30;
      const pageWidth = 842; // A4 landscape
      const pageHeight = 595;

      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) continue;

        let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        let currentY = pageHeight - margin;

        // Add sheet title
        currentPage.drawText(`Sheet: ${sheetName}`, {
          x: margin,
          y: currentY,
          size: fontSize + 2,
          font,
          color: rgb(0, 0, 0),
        });
        currentY -= lineHeight * 2;

        // Calculate column widths
        const maxCols = Math.max(...jsonData.map((row: any) => row.length));
        const colWidth = Math.min(100, (pageWidth - (margin * 2)) / maxCols);

        // Process rows
        for (const row of jsonData as any[][]) {
          if (currentY < margin + lineHeight) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            currentY = pageHeight - margin;
          }

          row.forEach((cell, colIndex) => {
            if (colIndex * colWidth + margin < pageWidth - margin) {
              const cellValue = (cell || '').toString();
              const truncatedValue = cellValue.length > 15 ? cellValue.substring(0, 12) + '...' : cellValue;
              
              currentPage.drawText(truncatedValue, {
                x: margin + (colIndex * colWidth),
                y: currentY,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
              });
            }
          });
          currentY -= lineHeight;
        }

        // Add page break between sheets
        currentY -= lineHeight;
      }

      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(tempPdfPath, pdfBytes);
      
      return tempPdfPath;
    } catch (error) {
      throw new Error(`Failed to convert spreadsheet to PDF: ${error}`);
    }
  }
}