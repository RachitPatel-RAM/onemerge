const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

async function createTestDocx() {
  const testDir = './test-data';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const zip = new AdmZip();
  
  // Add [Content_Types].xml
  zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`));

  // Add _rels/.rels
  zip.addFile('_rels/.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`));

  // Add word/document.xml
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
        <w:t>- Generated at: ${new Date().toISOString()}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`));

  const testDocxPath = path.join(testDir, 'debug-test.docx');
  zip.writeZip(testDocxPath);
  
  console.log(`✅ Created test DOCX file: ${testDocxPath}`);
  const stats = fs.statSync(testDocxPath);
  console.log(`📊 DOCX file size: ${stats.size} bytes`);
  
  return testDocxPath;
}

createTestDocx().catch(console.error);