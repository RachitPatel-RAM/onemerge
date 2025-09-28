const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

// Ensure test-data directory exists
const testDataDir = path.join(__dirname, 'test-data');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

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

const outputPath = path.join(testDataDir, 'persistent-test.docx');
zip.writeZip(outputPath);

console.log(`Created test file: ${outputPath}`);
console.log(`File size: ${fs.statSync(outputPath).size} bytes`);

// Now test with LibreOffice directly
const { DocumentMerger } = require('./dist/services/mergers/DocumentMerger');

async function testConversion() {
  try {
    const merger = new DocumentMerger();
    console.log('\nTesting conversion...');
    const result = await merger.convertToPDF(outputPath);
    console.log('✅ Conversion successful:', result);
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
  }
}

testConversion();