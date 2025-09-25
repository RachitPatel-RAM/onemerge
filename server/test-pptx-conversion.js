const path = require('path');
const fs = require('fs');
const { PresentationMerger } = require('./dist/services/mergers/PresentationMerger');

async function testPPTXConversion() {
  console.log('Testing enhanced PowerPoint conversion...');
  
  try {
    // Create a test presentation merger
    const presentationMerger = new PresentationMerger();
    
    // Test with a sample PPTX file if it exists
    const testFiles = [
      './uploads/9aba2678-2191-49b3-b83e-3311cc7b76d0-22082025103240AM.pptx',
      './uploads/9be70152-b006-4ebc-9c11-b19658f1a50c-22082025103240AM.pptx'
    ];
    
    let testFile = null;
    for (const file of testFiles) {
      if (fs.existsSync(file)) {
        testFile = file;
        break;
      }
    }
    
    if (!testFile) {
      console.log('No test PPTX files found in uploads directory');
      console.log('Please upload a PPTX file to test the conversion');
      return;
    }
    
    console.log(`Testing with file: ${testFile}`);
    
    // Test the conversion
    const outputPath = await presentationMerger.convertToPDF(testFile);
    
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`✅ Conversion successful!`);
      console.log(`Output file: ${outputPath}`);
      console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Try to read the PDF to verify it's valid
      try {
        const { PDFDocument } = require('pdf-lib');
        const pdfBytes = fs.readFileSync(outputPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pageCount = pdfDoc.getPageCount();
        console.log(`Pages in PDF: ${pageCount}`);
        
        if (pageCount > 0) {
          console.log('✅ PDF is valid and contains pages');
        } else {
          console.log('⚠️ PDF is empty (no pages)');
        }
      } catch (pdfError) {
        console.log('❌ PDF validation failed:', pdfError.message);
      }
    } else {
      console.log('❌ Conversion failed - output file not created');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testPPTXConversion().then(() => {
  console.log('Test completed');
}).catch(error => {
  console.error('Test error:', error);
});
