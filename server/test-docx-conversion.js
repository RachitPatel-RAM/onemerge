const fs = require('fs');
const path = require('path');

// Import the DocumentMerger
const { DocumentMerger } = require('./dist/services/mergers/DocumentMerger');

async function createSimpleDocx() {
  // Create a minimal DOCX file structure
  const AdmZip = require('adm-zip');
  
  const zip = new AdmZip();
  
  // Add required DOCX structure
  zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`));

  zip.addFile('_rels/.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`));

  const currentTime = new Date().toISOString();
  zip.addFile('word/document.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Test Document for LibreOffice Conversion</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>This is a test document to verify DOCX to PDF conversion.</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Key Points:</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>- LibreOffice should convert this to PDF</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>- This tests the --invisible flag functionality</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>- Generated at: ${currentTime}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`));

  return zip;
}

async function testDocxConversion() {
  console.log('🧪 Testing DOCX Conversion with LibreOffice');
  console.log('='.repeat(50));

  const testDir = './test-data';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // Create a simple DOCX file
  const testDocxPath = path.join(testDir, 'test-document.docx');
  
  try {
    const docxZip = await createSimpleDocx();
    docxZip.writeZip(testDocxPath);
    console.log(`✅ Created test DOCX file: ${testDocxPath}`);
    
    const stats = fs.statSync(testDocxPath);
    console.log(`📊 DOCX file size: ${stats.size} bytes`);

    // Test DocumentMerger conversion
    const documentMerger = new DocumentMerger();

    console.log('\n📄 Testing DocumentMerger convertToPDF with real DOCX file...');
    
    try {
      const result = await documentMerger.convertToPDF(testDocxPath);
      console.log(`✅ Conversion successful: ${result}`);
      
      if (fs.existsSync(result)) {
        const pdfStats = fs.statSync(result);
        console.log(`📊 Generated PDF size: ${pdfStats.size} bytes`);
        
        // Verify PDF content
        try {
          const { PDFDocument } = require('pdf-lib');
          const pdfBytes = fs.readFileSync(result);
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const pageCount = pdfDoc.getPageCount();
          console.log(`📄 PDF pages: ${pageCount}`);
        } catch (pdfError) {
          console.warn(`⚠️ Could not verify PDF content: ${pdfError.message}`);
        }
      } else {
        console.error('❌ PDF file was not created');
      }
    } catch (error) {
      console.error(`❌ Conversion failed: ${error.message}`);
      console.error('Full error:', error);
    }

    // Test error handling scenarios
    console.log('\n🧪 Testing error handling scenarios...');
    
    // Test with non-existent DOCX file
    try {
      await documentMerger.convertToPDF('./non-existent.docx');
      console.log(`❌ Should have failed for non-existent file`);
    } catch (error) {
      console.log(`✅ Correctly caught error for non-existent file: ${error.message}`);
    }

    // Test with empty file path
    try {
      await documentMerger.convertToPDF('');
      console.log(`❌ Should have failed for empty path`);
    } catch (error) {
      console.log(`✅ Correctly caught error for empty path: ${error.message}`);
    }

    // Test with wrong extension
    try {
      await documentMerger.convertToPDF('./package.json');
      console.log(`❌ Should have failed for wrong extension`);
    } catch (error) {
      console.log(`✅ Correctly caught error for wrong extension: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Test setup failed:', error);
  }

  // Cleanup
  try {
    if (fs.existsSync(testDocxPath)) {
      fs.unlinkSync(testDocxPath);
      console.log('\n🧹 Cleaned up test files');
    }
  } catch (cleanupError) {
    console.warn('Warning: Could not cleanup test files:', cleanupError);
  }

  console.log('\n🎉 DOCX conversion testing completed!');
}

// Run the test
testDocxConversion().catch(console.error);