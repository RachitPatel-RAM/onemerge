const fs = require('fs');
const path = require('path');
const { DocumentMerger } = require('./dist/services/mergers/DocumentMerger');
const { ImageMerger } = require('./dist/services/mergers/ImageMerger');
const { PresentationMerger } = require('./dist/services/mergers/PresentationMerger');
const { TextMerger } = require('./dist/services/mergers/TextMerger');
const { PDFMerger } = require('./dist/services/mergers/PDFMerger');

async function testConversions() {
  console.log('🧪 Testing Enhanced Conversion System with Error Handling\n');
  
  const uploadsDir = './uploads';
  const outputDir = './test-output';
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Get test files
  const files = fs.readdirSync(uploadsDir);
  console.log(`Found ${files.length} test files:\n`);
  
  for (const file of files) {
    const filePath = path.join(uploadsDir, file);
    const ext = path.extname(file).toLowerCase();
    
    console.log(`📄 Testing: ${file} (${ext})`);
    
    try {
      let merger;
      let outputPath;
      
      switch (ext) {
        case '.pdf':
          console.log('  → Testing PDFMerger...');
          merger = new PDFMerger();
          await merger.initialize();
          await merger.addFile(filePath);
          outputPath = path.join(outputDir, `test-pdf-${Date.now()}.pdf`);
          await merger.save(outputPath);
          break;
          
        case '.docx':
          console.log('  → Testing DocumentMerger with Mammoth.js...');
          merger = new DocumentMerger();
          outputPath = await merger.convertToPDF(filePath);
          break;
          
        case '.pptx':
          console.log('  → Testing PresentationMerger...');
          merger = new PresentationMerger();
          outputPath = await merger.convertToPDF(filePath);
          break;
          
        case '.png':
        case '.jpg':
        case '.jpeg':
          console.log('  → Testing ImageMerger...');
          merger = new ImageMerger();
          outputPath = await merger.convertToPDF(filePath);
          break;
          
        case '.txt':
          console.log('  → Testing TextMerger...');
          merger = new TextMerger();
          outputPath = await merger.convertToPDF(filePath);
          break;
          
        default:
          console.log(`  ⚠️  Unsupported file type: ${ext}`);
          continue;
      }
      
      // Validate output
      if (outputPath && fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        console.log(`  ✅ Success: Generated ${stats.size} bytes`);
        console.log(`     Output: ${outputPath}`);
      } else {
        console.log(`  ❌ Failed: No output file generated`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('🎉 Conversion testing completed!');
}

// Test error handling with invalid files
async function testErrorHandling() {
  console.log('\n🔧 Testing Error Handling\n');
  
  const testCases = [
    { name: 'Non-existent file', path: './non-existent.docx', merger: 'DocumentMerger' },
    { name: 'Empty file path', path: '', merger: 'DocumentMerger' },
    { name: 'Wrong extension', path: './package.json', merger: 'DocumentMerger' }
  ];
  
  for (const testCase of testCases) {
    console.log(`🧪 Testing: ${testCase.name}`);
    
    try {
      let merger;
      
      switch (testCase.merger) {
        case 'DocumentMerger':
          merger = new DocumentMerger();
          await merger.convertToPDF(testCase.path);
          break;
      }
      
      console.log(`  ❌ Expected error but conversion succeeded`);
    } catch (error) {
      console.log(`  ✅ Correctly caught error: ${error.message}`);
    }
    
    console.log('');
  }
}

// Run tests
async function runTests() {
  try {
    await testConversions();
    await testErrorHandling();
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}

runTests();