// Example usage of the extractBrandedName function
import { extractBrandedName, getBrandedDocumentBase } from './branding';

// Example: Extract branded name from a generated filename
const exampleFilename = "lets-OneMerge-MaJeTechnologies-2025-09-24T20-04-46-691Z-d02696a3.pdf";
const extractedName = extractBrandedName(exampleFilename);

console.log("Original filename:", exampleFilename);
console.log("Extracted branded name:", extractedName);
// Output: "lets-OneMerge-MaJeTechnologies"

// You can also use it with filenames without extensions
const filenameWithoutExt = "myDocument-OneMerge-MaJeTechnologies-2025-01-15T10-30-45-123Z-abc12345";
const extractedName2 = extractBrandedName(filenameWithoutExt);

console.log("Filename without extension:", filenameWithoutExt);
console.log("Extracted branded name:", extractedName2);
// Output: "myDocument-OneMerge-MaJeTechnologies"

// If the filename doesn't contain the brand suffix, it will add it
const unbrandedFilename = "regularDocument.pdf";
const brandedResult = extractBrandedName(unbrandedFilename);

console.log("Unbranded filename:", unbrandedFilename);
console.log("Result with branding:", brandedResult);
// Output: "regularDocument-OneMerge-MaJeTechnologies"

export { extractBrandedName, getBrandedDocumentBase };