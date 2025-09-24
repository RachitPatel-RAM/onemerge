const BRAND_SUFFIX = "OneMerge-MaJeTechnologies";
const DEFAULT_BASE_NAME = "MergedDocument";

const sanitizeSegment = (value: string): string => {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
};

export const getBrandedDocumentBase = (input?: string): string => {
  const base = sanitizeSegment(input ?? "");
  const effectiveBase = base.length > 0 ? base : DEFAULT_BASE_NAME;
  return `${effectiveBase}-${BRAND_SUFFIX}`;
};

/**
 * Extracts the dynamic name portion from a filename and returns it in branded format
 * Example: "lets-OneMerge-MaJeTechnologies-2025-09-24T20-04-46-691Z-d02696a3" 
 * Returns: "lets-OneMerge-MaJeTechnologies"
 */
export const extractBrandedName = (filename: string): string => {
  // Remove file extension if present
  const nameWithoutExtension = filename.replace(/\.[^.]*$/, '');
  
  // Look for the brand suffix in the filename
  const brandSuffixIndex = nameWithoutExtension.indexOf(`-${BRAND_SUFFIX}`);
  
  if (brandSuffixIndex === -1) {
    // If brand suffix not found, return the original name with brand suffix
    return getBrandedDocumentBase(nameWithoutExtension);
  }
  
  // Extract everything up to and including the brand suffix
  const endIndex = brandSuffixIndex + `-${BRAND_SUFFIX}`.length;
  const extractedPortion = nameWithoutExtension.substring(0, endIndex);
  
  return extractedPortion;
};

export const BRANDING_SUFFIX = BRAND_SUFFIX;
