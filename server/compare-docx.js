const AdmZip = require('adm-zip');

// Check our working file
try {
  console.log('=== Working DOCX file (debug-test.docx) ===');
  const workingZip = new AdmZip('test-data/debug-test.docx');
  const workingEntries = workingZip.getEntries();
  workingEntries.forEach(entry => {
    console.log('  -', entry.entryName, '(' + entry.header.size + ' bytes)');
  });
  
  // Check content of document.xml
  const docEntry = workingZip.getEntry('word/document.xml');
  if (docEntry) {
    console.log('\n=== Working document.xml FULL content ===');
    console.log(docEntry.getData().toString('utf8'));
  }
} catch (error) {
  console.error('Error reading working DOCX:', error.message);
}

console.log('\n' + '='.repeat(80) + '\n');

// Check the comparison file
try {
  console.log('=== Comparison DOCX file (comparison-test.docx) ===');
  const compZip = new AdmZip('test-data/comparison-test.docx');
  const compEntries = compZip.getEntries();
  compEntries.forEach(entry => {
    console.log('  -', entry.entryName, '(' + entry.header.size + ' bytes)');
  });
  
  // Check content of document.xml
  const docEntry = compZip.getEntry('word/document.xml');
  if (docEntry) {
    console.log('\n=== Comparison document.xml FULL content ===');
    console.log(docEntry.getData().toString('utf8'));
  }
} catch (error) {
  console.error('Error reading comparison DOCX:', error.message);
}