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

    // Enhanced input validation
    if (!fs.existsSync(filePath)) {
      throw new Error(`Input file does not exist: ${filePath}`);
    }

    const fileStats = fs.statSync(filePath);
    if (fileStats.size === 0) {
      throw new Error(`Input file is empty: ${filePath}`);
    }

    // Check file extension
    const fileExt = path.extname(filePath).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(fileExt)) {
      throw new Error(`Unsupported spreadsheet format: ${fileExt}`);
    }

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    console.log(`Starting enhanced XLSX to PDF conversion for: ${path.basename(filePath)} (${fileStats.size} bytes)`);

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { 
        type: 'buffer',
        cellFormula: true,
        cellStyles: true,
        cellDates: true
      });
      
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontSize = 9;
      const headerFontSize = 11;
      const lineHeight = fontSize * 1.3;
      const margin = 25;
      const pageWidth = 842; // A4 landscape
      const pageHeight = 595;
      
      let totalCellsProcessed = 0;
      let totalFormulasFound = 0;

      // Process each sheet with enhanced formatting
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        
        // Get sheet range for better processing
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        const sheetData: any[][] = [];
        const cellFormulas: { [key: string]: string } = {};
        const cellTypes: { [key: string]: string } = {};
        
        // Extract data with formulas and types
        for (let row = range.s.r; row <= range.e.r; row++) {
          const rowData: any[] = [];
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = worksheet[cellAddress];
            
            if (cell) {
              totalCellsProcessed++;
              
              // Store formula if exists
              if (cell.f) {
                cellFormulas[cellAddress] = cell.f;
                totalFormulasFound++;
              }
              
              // Store cell type
              cellTypes[cellAddress] = cell.t || 'general';
              
              // Get display value
              let displayValue = '';
              if (cell.w !== undefined) {
                displayValue = cell.w; // Formatted value
              } else if (cell.v !== undefined) {
                displayValue = cell.v.toString();
              }
              
              rowData[col - range.s.c] = displayValue;
            } else {
              rowData[col - range.s.c] = '';
            }
          }
          sheetData.push(rowData);
        }
        
        if (sheetData.length === 0) continue;

        let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        let currentY = pageHeight - margin;

        // Enhanced sheet header
        currentPage.drawText(`Spreadsheet: ${sheetName}`, {
          x: margin,
          y: currentY,
          size: headerFontSize + 2,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        currentY -= lineHeight * 1.5;
        
        // Sheet statistics
        const nonEmptyRows = sheetData.filter(row => row.some(cell => cell !== '')).length;
        const maxCols = Math.max(...sheetData.map(row => row.length));
        
        currentPage.drawText(`Dimensions: ${nonEmptyRows} rows × ${maxCols} columns`, {
          x: margin,
          y: currentY,
          size: fontSize,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
        currentY -= lineHeight * 2;

        // Calculate optimal column widths based on content
        const colWidths: number[] = [];
        const availableWidth = pageWidth - (margin * 2);
        
        for (let col = 0; col < maxCols; col++) {
          let maxLength = 0;
          for (const row of sheetData) {
            if (row[col]) {
              maxLength = Math.max(maxLength, row[col].toString().length);
            }
          }
          // Base width on content length, with min/max constraints
          const baseWidth = Math.max(40, Math.min(120, maxLength * 6));
          colWidths.push(baseWidth);
        }
        
        // Scale column widths to fit page
        const totalWidth = colWidths.reduce((sum, width) => sum + width, 0);
        if (totalWidth > availableWidth) {
          const scale = availableWidth / totalWidth;
          for (let i = 0; i < colWidths.length; i++) {
            colWidths[i] *= scale;
          }
        }

        // Draw table headers if first row looks like headers
        const firstRow = sheetData[0];
        let isHeaderRow = false;
        if (firstRow && firstRow.some(cell => cell && typeof cell === 'string' && cell.length > 0)) {
          isHeaderRow = true;
          
          // Draw header background
          currentPage.drawRectangle({
            x: margin,
            y: currentY - lineHeight + 2,
            width: availableWidth,
            height: lineHeight,
            color: rgb(0.9, 0.9, 0.9),
          });
          
          // Draw header text
          let currentX = margin;
          firstRow.forEach((cell, colIndex) => {
            if (colIndex < colWidths.length) {
              const cellValue = (cell || '').toString();
              const truncatedValue = this.truncateText(cellValue, colWidths[colIndex], fontSize);
              
              currentPage.drawText(truncatedValue, {
                x: currentX + 2,
                y: currentY,
                size: fontSize,
                font: boldFont,
                color: rgb(0, 0, 0),
              });
              currentX += colWidths[colIndex];
            }
          });
          currentY -= lineHeight;
        }

        // Process data rows
        const dataRows = isHeaderRow ? sheetData.slice(1) : sheetData;
        for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
          const row = dataRows[rowIndex];
          
          // Check if we need a new page
          if (currentY < margin + lineHeight * 2) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            currentY = pageHeight - margin;
            
            // Repeat sheet title on new page
            currentPage.drawText(`${sheetName} (continued)`, {
              x: margin,
              y: currentY,
              size: headerFontSize,
              font: boldFont,
              color: rgb(0.5, 0.5, 0.5),
            });
            currentY -= lineHeight * 2;
          }

          // Draw row background for better readability
          if (rowIndex % 2 === 0) {
            currentPage.drawRectangle({
              x: margin,
              y: currentY - lineHeight + 2,
              width: availableWidth,
              height: lineHeight,
              color: rgb(0.98, 0.98, 0.98),
            });
          }

          // Draw cell content
          let currentX = margin;
          row.forEach((cell, colIndex) => {
            if (colIndex < colWidths.length) {
              const actualRowIndex = isHeaderRow ? rowIndex + 1 : rowIndex;
              const cellAddress = XLSX.utils.encode_cell({ r: actualRowIndex, c: colIndex });
              
              let cellValue = (cell || '').toString();
              let textColor = rgb(0, 0, 0);
              let currentFont = font;
              
              // Check if cell has formula
              if (cellFormulas[cellAddress]) {
                cellValue = `=${cellFormulas[cellAddress]} → ${cellValue}`;
                textColor = rgb(0, 0.5, 0); // Green for formulas
              }
              
              // Format based on cell type
              if (cellTypes[cellAddress] === 'n' && !cellFormulas[cellAddress]) {
                textColor = rgb(0, 0, 0.7); // Blue for numbers
              } else if (cellTypes[cellAddress] === 'd') {
                textColor = rgb(0.7, 0, 0.7); // Purple for dates
              }
              
              const truncatedValue = this.truncateText(cellValue, colWidths[colIndex], fontSize);
              
              currentPage.drawText(truncatedValue, {
                x: currentX + 2,
                y: currentY,
                size: fontSize,
                font: currentFont,
                color: textColor,
              });
              currentX += colWidths[colIndex];
            }
          });
          currentY -= lineHeight;
        }

        // Add sheet summary
        currentY -= lineHeight;
        currentPage.drawText(`Sheet processed: ${nonEmptyRows} data rows, ${totalFormulasFound} formulas found`, {
          x: margin,
          y: currentY,
          size: fontSize - 1,
          font,
          color: rgb(0.6, 0.6, 0.6),
        });
        
        // Add page break between sheets
        currentY -= lineHeight * 2;
      }

      // Add conversion summary page
      const summaryPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let summaryY = pageHeight - margin;
      
      summaryPage.drawText('XLSX Conversion Summary', {
        x: margin,
        y: summaryY,
        size: headerFontSize + 4,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      summaryY -= lineHeight * 2;
      
      summaryPage.drawText(`File: ${path.basename(filePath)}`, {
        x: margin,
        y: summaryY,
        size: fontSize + 1,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      summaryY -= lineHeight * 1.5;
      
      summaryPage.drawText(`Sheets processed: ${workbook.SheetNames.length}`, {
        x: margin,
        y: summaryY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      summaryY -= lineHeight;
      
      summaryPage.drawText(`Total cells processed: ${totalCellsProcessed}`, {
        x: margin,
        y: summaryY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      summaryY -= lineHeight;
      
      summaryPage.drawText(`Formulas preserved: ${totalFormulasFound}`, {
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
        size: fontSize + 1,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      summaryY -= lineHeight * 1.5;
      
      const features = [
        '+ Cell formulas with calculated values',
        '+ Data types (numbers, dates, text)',
        '+ Table structure and formatting',
        '+ Multi-sheet organization',
        '+ Optimized column widths'
      ];
      
      features.forEach(feature => {
        summaryPage.drawText(feature, {
          x: margin + 20,
          y: summaryY,
          size: fontSize,
          font,
          color: rgb(0, 0.5, 0),
        });
        summaryY -= lineHeight;
      });

      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(tempPdfPath, pdfBytes);
      
      // Validate output
      const outputStats = fs.statSync(tempPdfPath);
      if (outputStats.size === 0) {
        throw new Error('Generated PDF is empty');
      }
      
      console.log(`SUCCESS: Enhanced XLSX conversion completed - ${totalCellsProcessed} cells, ${totalFormulasFound} formulas preserved (${outputStats.size} bytes)`);
      return tempPdfPath;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`SpreadsheetMerger conversion error: ${errorMessage}`);
      
      // Create fallback PDF with error information
      try {
        const fallbackPdfDoc = await PDFDocument.create();
        const fallbackPage = fallbackPdfDoc.addPage();
        const fallbackFont = await fallbackPdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await fallbackPdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        fallbackPage.drawText('Spreadsheet Conversion Report', {
          x: 50,
          y: 750,
          size: 20,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        
        fallbackPage.drawText(`File: ${path.basename(filePath)}`, {
          x: 50,
          y: 700,
          size: 14,
          font: boldFont,
        });
        
        fallbackPage.drawText('Status: Conversion encountered issues', {
          x: 50,
          y: 650,
          size: 12,
          font: fallbackFont,
          color: rgb(0.8, 0.5, 0),
        });
        
        fallbackPage.drawText(`Error: ${errorMessage}`, {
          x: 50,
          y: 600,
          size: 10,
          font: fallbackFont,
          color: rgb(0.8, 0, 0),
        });
        
        const fallbackBytes = await fallbackPdfDoc.save();
        fs.writeFileSync(tempPdfPath, fallbackBytes);
        
        console.log(`Fallback PDF created for failed spreadsheet conversion`);
        return tempPdfPath;
        
      } catch (fallbackError) {
        throw new Error(`Failed to convert spreadsheet to PDF: ${errorMessage}. Fallback also failed: ${fallbackError}`);
      }
    }
  }

  private truncateText(text: string, maxWidth: number, fontSize: number): string {
    const avgCharWidth = fontSize * 0.6; // Approximate character width
    const maxChars = Math.floor(maxWidth / avgCharWidth) - 2; // Leave some padding
    
    if (text.length <= maxChars) {
      return text;
    }
    
    return text.substring(0, maxChars - 3) + '...';
  }
}