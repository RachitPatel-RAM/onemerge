import fs from 'fs';
import path from 'path';
import { PDFDocument, PDFName, PDFString, PDFDict } from 'pdf-lib';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  language?: string;
  description?: string;
  category?: string;
  company?: string;
  manager?: string;
  version?: string;
  revision?: string;
  lastModifiedBy?: string;
  application?: string;
  template?: string;
  totalEditingTime?: number;
  pages?: number;
  words?: number;
  characters?: number;
  lines?: number;
  paragraphs?: number;
  slides?: number;
  notes?: number;
  hiddenSlides?: number;
  sheets?: number;
  cells?: number;
  formulas?: number;
  customProperties?: Record<string, any>;
}

export interface MetadataExtractionResult {
  metadata: DocumentMetadata;
  fileType: string;
  fileSize: number;
  extractionTime: number;
  success: boolean;
  errors?: string[];
}

export class MetadataService {
  
  /**
   * Extract metadata from any supported file type
   */
  async extractMetadata(filePath: string): Promise<MetadataExtractionResult> {
    const startTime = Date.now();
    const fileExtension = path.extname(filePath).toLowerCase();
    const stats = fs.statSync(filePath);
    
    console.log(`[MetadataService] Extracting metadata from ${fileExtension} file: ${path.basename(filePath)}`);

    try {
      let metadata: DocumentMetadata = {};
      let errors: string[] = [];

      // Basic file system metadata
      metadata.creationDate = stats.birthtime;
      metadata.modificationDate = stats.mtime;

      switch (fileExtension) {
        case '.pdf':
          metadata = { ...metadata, ...(await this.extractPDFMetadata(filePath)) };
          break;
        case '.docx':
        case '.doc':
          const docResult = await this.extractDocumentMetadata(filePath);
          metadata = { ...metadata, ...docResult.metadata };
          errors = docResult.errors || [];
          break;
        case '.xlsx':
        case '.xls':
          const xlsResult = await this.extractSpreadsheetMetadata(filePath);
          metadata = { ...metadata, ...xlsResult.metadata };
          errors = xlsResult.errors || [];
          break;
        case '.pptx':
        case '.ppt':
          const pptResult = await this.extractPresentationMetadata(filePath);
          metadata = { ...metadata, ...pptResult.metadata };
          errors = pptResult.errors || [];
          break;
        case '.txt':
        case '.rtf':
          metadata = { ...metadata, ...(await this.extractTextMetadata(filePath)) };
          break;
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.gif':
        case '.bmp':
        case '.tiff':
          metadata = { ...metadata, ...(await this.extractImageMetadata(filePath)) };
          break;
        default:
          errors.push(`Unsupported file type for metadata extraction: ${fileExtension}`);
      }

      const extractionTime = Date.now() - startTime;
      console.log(`[MetadataService] Metadata extraction completed in ${extractionTime}ms`);

      return {
        metadata,
        fileType: fileExtension,
        fileSize: stats.size,
        extractionTime,
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      const extractionTime = Date.now() - startTime;
      console.error(`[MetadataService] Failed to extract metadata:`, error);

      return {
        metadata: {
          creationDate: stats.birthtime,
          modificationDate: stats.mtime
        },
        fileType: fileExtension,
        fileSize: stats.size,
        extractionTime,
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Extract metadata from PDF files
   */
  private async extractPDFMetadata(filePath: string): Promise<DocumentMetadata> {
    try {
      const pdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      const metadata: DocumentMetadata = {};
      
      // Extract basic PDF metadata
      metadata.title = pdfDoc.getTitle();
      metadata.author = pdfDoc.getAuthor();
      metadata.subject = pdfDoc.getSubject();
      metadata.keywords = pdfDoc.getKeywords();
      metadata.creator = pdfDoc.getCreator();
      metadata.producer = pdfDoc.getProducer();
      metadata.creationDate = pdfDoc.getCreationDate();
      metadata.modificationDate = pdfDoc.getModificationDate();
      metadata.pages = pdfDoc.getPageCount();

      return metadata;
    } catch (error) {
      console.error('[MetadataService] PDF metadata extraction failed:', error);
      return {};
    }
  }

  /**
   * Extract metadata from DOCX/DOC files
   */
  private async extractDocumentMetadata(filePath: string): Promise<{ metadata: DocumentMetadata; errors?: string[] }> {
    const metadata: DocumentMetadata = {};
    const errors: string[] = [];

    try {
      if (path.extname(filePath).toLowerCase() === '.docx') {
        const zip = new AdmZip(filePath);
        
        // Extract core properties
        const corePropsEntry = zip.getEntry('docProps/core.xml');
        if (corePropsEntry) {
          const corePropsXml = corePropsEntry.getData().toString('utf8');
          const coreProps = await parseXML(corePropsXml);
          
          if (coreProps && typeof coreProps === 'object' && 'cp:coreProperties' in coreProps) {
            const props = (coreProps as any)['cp:coreProperties'];
            metadata.title = this.extractXMLValue(props['dc:title']);
            metadata.author = this.extractXMLValue(props['dc:creator']);
            metadata.subject = this.extractXMLValue(props['dc:subject']);
            metadata.description = this.extractXMLValue(props['dc:description']);
            metadata.keywords = this.extractXMLValue(props['cp:keywords']);
            metadata.category = this.extractXMLValue(props['cp:category']);
            metadata.lastModifiedBy = this.extractXMLValue(props['cp:lastModifiedBy']);
            metadata.revision = this.extractXMLValue(props['cp:revision']);
            
            if (props['dcterms:created']) {
              const createdValue = this.extractXMLValue(props['dcterms:created']);
              if (createdValue) {
                metadata.creationDate = new Date(createdValue);
              }
            }
            if (props['dcterms:modified']) {
              const modifiedValue = this.extractXMLValue(props['dcterms:modified']);
              if (modifiedValue) {
                metadata.modificationDate = new Date(modifiedValue);
              }
            }
          }
        }

        // Extract app properties
        const appPropsEntry = zip.getEntry('docProps/app.xml');
        if (appPropsEntry) {
          const appPropsXml = appPropsEntry.getData().toString('utf8');
          const appProps = await parseXML(appPropsXml);
          
          if (appProps && typeof appProps === 'object' && 'Properties' in appProps) {
            const props = appProps['Properties'];
            if (typeof props === 'object' && props) {
            metadata.application = this.extractXMLValue((props as any)['Application']);
            metadata.template = this.extractXMLValue((props as any)['Template']);
            metadata.company = this.extractXMLValue((props as any)['Company']);
            metadata.manager = this.extractXMLValue((props as any)['Manager']);
            metadata.version = this.extractXMLValue((props as any)['AppVersion']);
            metadata.pages = parseInt(this.extractXMLValue((props as any)['Pages']) || '0') || undefined;
            metadata.words = parseInt(this.extractXMLValue((props as any)['Words']) || '0') || undefined;
            metadata.characters = parseInt(this.extractXMLValue((props as any)['Characters']) || '0') || undefined;
            metadata.lines = parseInt(this.extractXMLValue((props as any)['Lines']) || '0') || undefined;
            metadata.paragraphs = parseInt(this.extractXMLValue((props as any)['Paragraphs']) || '0') || undefined;
            
            const editingTime = this.extractXMLValue((props as any)['TotalTime']);
            if (editingTime) {
              metadata.totalEditingTime = parseInt(editingTime);
            }
            }
          }
        }

        // Extract custom properties
        const customPropsEntry = zip.getEntry('docProps/custom.xml');
        if (customPropsEntry) {
          const customPropsXml = customPropsEntry.getData().toString('utf8');
          const customProps = await parseXML(customPropsXml);
          
          if (customProps && typeof customProps === 'object' && 'Properties' in customProps) {
            const props = (customProps as any)['Properties'];
            if (props && typeof props === 'object' && 'property' in props) {
              metadata.customProperties = {};
              const properties = Array.isArray(props['property']) 
                ? props['property'] 
                : [props['property']];
              
            properties.forEach((prop: any) => {
              if (prop.$ && prop.$.name) {
                const value = prop['vt:lpwstr'] || prop['vt:i4'] || prop['vt:bool'] || prop['vt:filetime'];
                if (value && value[0]) {
                  metadata.customProperties![prop.$.name] = value[0];
                }
              }
            });
            }
          }
        }
      }

      return { metadata, errors: errors.length > 0 ? errors : undefined };
    } catch (error) {
      errors.push(`Document metadata extraction failed: ${error instanceof Error ? error.message : String(error)}`);
      return { metadata, errors };
    }
  }

  /**
   * Extract metadata from XLSX/XLS files
   */
  private async extractSpreadsheetMetadata(filePath: string): Promise<{ metadata: DocumentMetadata; errors?: string[] }> {
    const metadata: DocumentMetadata = {};
    const errors: string[] = [];

    try {
      const workbook = XLSX.readFile(filePath, { bookProps: true, cellDates: true });
      
      if (workbook.Props) {
        const props = workbook.Props;
        metadata.title = props.Title;
        metadata.author = props.Author;
        metadata.subject = props.Subject;
        metadata.keywords = props.Keywords;
        metadata.description = props.Comments;
        metadata.category = props.Category;
        metadata.company = props.Company;
        metadata.manager = props.Manager;
        metadata.lastModifiedBy = props.LastAuthor;
        metadata.application = props.Application;
        metadata.version = props.AppVersion;
        
        if (props.CreatedDate) {
          metadata.creationDate = new Date(props.CreatedDate);
        }
        if (props.ModifiedDate) {
          metadata.modificationDate = new Date(props.ModifiedDate);
        }
      }

      // Count sheets and analyze content
      metadata.sheets = workbook.SheetNames.length;
      let totalCells = 0;
      let totalFormulas = 0;

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        const cellCount = (range.e.r - range.s.r + 1) * (range.e.c - range.s.c + 1);
        totalCells += cellCount;

        // Count formulas
        Object.keys(worksheet).forEach(cellAddress => {
          if (cellAddress[0] !== '!' && worksheet[cellAddress].f) {
            totalFormulas++;
          }
        });
      });

      metadata.cells = totalCells;
      metadata.formulas = totalFormulas;

      return { metadata, errors: errors.length > 0 ? errors : undefined };
    } catch (error) {
      errors.push(`Spreadsheet metadata extraction failed: ${error instanceof Error ? error.message : String(error)}`);
      return { metadata, errors };
    }
  }

  /**
   * Extract metadata from PPTX/PPT files
   */
  private async extractPresentationMetadata(filePath: string): Promise<{ metadata: DocumentMetadata; errors?: string[] }> {
    const metadata: DocumentMetadata = {};
    const errors: string[] = [];

    try {
      if (path.extname(filePath).toLowerCase() === '.pptx') {
        const zip = new AdmZip(filePath);
        
        // Extract core properties (similar to DOCX)
        const corePropsEntry = zip.getEntry('docProps/core.xml');
        if (corePropsEntry) {
          const corePropsXml = corePropsEntry.getData().toString('utf8');
          const coreProps = await parseXML(corePropsXml);
          
          if (coreProps && typeof coreProps === 'object' && 'cp:coreProperties' in coreProps) {
            const props = (coreProps as any)['cp:coreProperties'];
            if (props && typeof props === 'object') {
              metadata.title = this.extractXMLValue(props['dc:title']);
              metadata.author = this.extractXMLValue(props['dc:creator']);
              metadata.subject = this.extractXMLValue(props['dc:subject']);
              metadata.description = this.extractXMLValue(props['dc:description']);
              metadata.keywords = this.extractXMLValue(props['cp:keywords']);
              metadata.category = this.extractXMLValue(props['cp:category']);
              metadata.lastModifiedBy = this.extractXMLValue(props['cp:lastModifiedBy']);
            }
          }
        }

        // Extract app properties
        const appPropsEntry = zip.getEntry('docProps/app.xml');
        if (appPropsEntry) {
          const appPropsXml = appPropsEntry.getData().toString('utf8');
          const appProps = await parseXML(appPropsXml);
          
          if (appProps && typeof appProps === 'object' && 'Properties' in appProps) {
            const props = (appProps as any)['Properties'];
            if (props && typeof props === 'object') {
              metadata.application = this.extractXMLValue(props['Application']);
              metadata.company = this.extractXMLValue(props['Company']);
              metadata.version = this.extractXMLValue(props['AppVersion']);
              metadata.slides = parseInt(this.extractXMLValue(props['Slides']) || '0') || undefined;
              metadata.notes = parseInt(this.extractXMLValue(props['Notes']) || '0') || undefined;
              metadata.hiddenSlides = parseInt(this.extractXMLValue(props['HiddenSlides']) || '0') || undefined;
            }
          }
        }

        // Count slides by examining presentation structure
        const presentationEntry = zip.getEntry('ppt/presentation.xml');
        if (presentationEntry) {
          const presentationXml = presentationEntry.getData().toString('utf8');
          const presentation = await parseXML(presentationXml);
          
          if (presentation && typeof presentation === 'object' && 'p:presentation' in presentation) {
            const pres = (presentation as any)['p:presentation'];
            if (pres && typeof pres === 'object' && 'p:sldIdLst' in pres) {
              const slideList = pres['p:sldIdLst'][0];
              if (slideList && slideList['p:sldId']) {
                metadata.slides = Array.isArray(slideList['p:sldId']) 
                ? slideList['p:sldId'].length 
                : 1;
              }
            }
          }
        }
      }

      return { metadata, errors: errors.length > 0 ? errors : undefined };
    } catch (error) {
      errors.push(`Presentation metadata extraction failed: ${error instanceof Error ? error.message : String(error)}`);
      return { metadata, errors };
    }
  }

  /**
   * Extract metadata from text files
   */
  private async extractTextMetadata(filePath: string): Promise<DocumentMetadata> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').length;
      const words = content.split(/\s+/).filter(word => word.length > 0).length;
      const characters = content.length;
      const paragraphs = content.split(/\n\s*\n/).filter(para => para.trim().length > 0).length;

      return {
        lines,
        words,
        characters,
        paragraphs
      };
    } catch (error) {
      console.error('[MetadataService] Text metadata extraction failed:', error);
      return {};
    }
  }

  /**
   * Extract metadata from image files
   */
  private async extractImageMetadata(filePath: string): Promise<DocumentMetadata> {
    try {
      // For now, return basic file info
      // In the future, could use libraries like exif-parser for EXIF data
      return {
        description: `Image file: ${path.basename(filePath)}`
      };
    } catch (error) {
      console.error('[MetadataService] Image metadata extraction failed:', error);
      return {};
    }
  }

  /**
   * Apply metadata to PDF output
   */
  async applyMetadataToPDF(pdfPath: string, metadata: DocumentMetadata): Promise<void> {
    try {
      const pdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // Apply metadata to PDF
      if (metadata.title) pdfDoc.setTitle(metadata.title);
      if (metadata.author) pdfDoc.setAuthor(metadata.author);
      if (metadata.subject) pdfDoc.setSubject(metadata.subject);
      if (metadata.keywords) pdfDoc.setKeywords(metadata.keywords.split(',').map(k => k.trim()));
      if (metadata.creator) pdfDoc.setCreator(metadata.creator);
      if (metadata.producer) pdfDoc.setProducer(metadata.producer);
      if (metadata.creationDate) pdfDoc.setCreationDate(metadata.creationDate);
      if (metadata.modificationDate) pdfDoc.setModificationDate(metadata.modificationDate);

      // Save the updated PDF
      const updatedPdfBytes = await pdfDoc.save();
      fs.writeFileSync(pdfPath, updatedPdfBytes);

      console.log(`[MetadataService] Applied metadata to PDF: ${path.basename(pdfPath)}`);
    } catch (error) {
      console.error('[MetadataService] Failed to apply metadata to PDF:', error);
      throw error;
    }
  }

  /**
   * Merge metadata from multiple sources
   */
  mergeMetadata(metadataArray: DocumentMetadata[]): DocumentMetadata {
    const merged: DocumentMetadata = {};
    
    metadataArray.forEach(metadata => {
      // Merge non-null values, with later values taking precedence
      Object.keys(metadata).forEach(key => {
        const value = metadata[key as keyof DocumentMetadata];
        if (value !== undefined && value !== null && value !== '') {
          if (key === 'customProperties' && merged.customProperties && typeof value === 'object' && value !== null) {
            merged.customProperties = { ...merged.customProperties, ...value as Record<string, any> };
          } else {
            (merged as any)[key] = value;
          }
        }
      });
    });

    return merged;
  }

  /**
   * Generate metadata summary for reporting
   */
  generateMetadataSummary(metadata: DocumentMetadata): string {
    const summary: string[] = [];
    
    if (metadata.title) summary.push(`Title: ${metadata.title}`);
    if (metadata.author) summary.push(`Author: ${metadata.author}`);
    if (metadata.subject) summary.push(`Subject: ${metadata.subject}`);
    if (metadata.pages) summary.push(`Pages: ${metadata.pages}`);
    if (metadata.words) summary.push(`Words: ${metadata.words}`);
    if (metadata.slides) summary.push(`Slides: ${metadata.slides}`);
    if (metadata.sheets) summary.push(`Sheets: ${metadata.sheets}`);
    if (metadata.creationDate) summary.push(`Created: ${metadata.creationDate.toLocaleDateString()}`);
    if (metadata.modificationDate) summary.push(`Modified: ${metadata.modificationDate.toLocaleDateString()}`);
    
    return summary.join('\n');
  }

  /**
   * Helper method to extract XML values
   */
  private extractXMLValue(xmlNode: any): string | undefined {
    if (!xmlNode) return undefined;
    if (Array.isArray(xmlNode) && xmlNode.length > 0) {
      return xmlNode[0];
    }
    if (typeof xmlNode === 'string') {
      return xmlNode;
    }
    return undefined;
  }
}