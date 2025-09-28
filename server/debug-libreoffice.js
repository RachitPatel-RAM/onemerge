const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

async function debugLibreOfficeConversion() {
  const execAsync = promisify(exec);
  
  // Use the same paths as DocumentMerger
  const filePath = path.resolve('test-data/persistent-test.docx');
  const outputPath = path.resolve('temp/debug-output.pdf');
  const outputDir = path.dirname(outputPath);
  const inputFileName = path.basename(filePath, '.docx');
  const expectedOutputPath = path.join(outputDir, `${inputFileName}.pdf`);
  
  console.log('=== Debug LibreOffice Conversion ===');
  console.log('filePath:', filePath);
  console.log('outputPath:', outputPath);
  console.log('outputDir:', outputDir);
  console.log('inputFileName:', inputFileName);
  console.log('expectedOutputPath:', expectedOutputPath);
  
  // Check if input file exists
  console.log('\n=== Input File Check ===');
  console.log('Input file exists:', fs.existsSync(filePath));
  if (fs.existsSync(filePath)) {
    console.log('Input file size:', fs.statSync(filePath).size, 'bytes');
  }
  
  // Clean up any existing output file
  if (fs.existsSync(expectedOutputPath)) {
    fs.unlinkSync(expectedOutputPath);
    console.log('Removed existing output file');
  }
  
  try {
    const libreOfficePath = "C:\\Program Files\\LibreOffice\\program\\soffice.exe";
    const command = `"${libreOfficePath}" --invisible --convert-to pdf --outdir "${outputDir}" "${filePath}"`;
    
    console.log('\n=== Command Execution ===');
    console.log('Command:', command);
    console.log('CWD:', outputDir);
    
    const { stdout, stderr } = await execAsync(command, {
      timeout: 30000,
      cwd: outputDir
    });
    
    console.log('\n=== Command Results ===');
    console.log('stdout:', stdout || '(empty)');
    console.log('stderr:', stderr || '(empty)');
    
    console.log('\n=== Output File Check ===');
    console.log('Expected output path exists:', fs.existsSync(expectedOutputPath));
    
    if (fs.existsSync(expectedOutputPath)) {
      const stats = fs.statSync(expectedOutputPath);
      console.log('Output file size:', stats.size, 'bytes');
      
      if (stats.size > 0) {
        console.log('✅ Conversion successful!');
        
        // Try to rename if needed
        if (expectedOutputPath !== outputPath) {
          console.log('Renaming from:', expectedOutputPath);
          console.log('Renaming to:', outputPath);
          fs.renameSync(expectedOutputPath, outputPath);
          console.log('✅ File renamed successfully');
        }
      } else {
        console.log('❌ Output file is empty');
      }
    } else {
      console.log('❌ Output file does not exist');
      
      // Check what files are in the output directory
      console.log('\n=== Output Directory Contents ===');
      const files = fs.readdirSync(outputDir);
      files.forEach(file => {
        const filePath = path.join(outputDir, file);
        const stats = fs.statSync(filePath);
        console.log(`  ${file} (${stats.size} bytes)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Command failed:', error.message);
  }
}

debugLibreOfficeConversion().catch(console.error);