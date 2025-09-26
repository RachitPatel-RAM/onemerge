import { getBrandedDocumentBase } from "@/lib/branding";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://onemerge.onrender.com/api';

export interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
}

export interface MergeResponse {
  success: boolean;
  message: string;
  downloadUrl: string;
  filename: string;
  fileSize: number;
  processedFiles: number;
}

export interface SupportedFormatsResponse {
  inputFormats: Array<{
    extension: string;
    mimeType: string;
    description: string;
  }>;
  outputFormats: Array<{
    extension: string;
    description: string;
  }>;
}

export interface PowerPointConversionResponse {
  success: boolean;
  message: string;
  downloadUrl: string;
  filename: string;
  fileSize: number;
  slideCount: number;
  format: 'pdf' | 'images';
}

export class ApiService {
  static async mergeFiles(
    files: File[],
    outputFormat: string,
    documentName: string,
    mergeOrder?: string[]
  ): Promise<MergeResponse> {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    formData.append('outputFormat', outputFormat);
    const brandedName = getBrandedDocumentBase(documentName);
    formData.append('documentName', brandedName);
    
    if (mergeOrder && mergeOrder.length > 0) {
      formData.append('mergeOrder', JSON.stringify(mergeOrder));
    }

    try {
      const response = await fetch(`${API_BASE_URL}/merge/files`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error merging files:', error);
      throw error;
    }
  }

  static async getSupportedFormats(): Promise<SupportedFormatsResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/merge/supported-formats`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching supported formats:', error);
      throw error;
    }
  }

  static async checkHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking health:', error);
      throw error;
    }
  }

  static getDownloadUrl(filename: string): string {
    return `${API_BASE_URL}/download/${filename}`;
  }

  static async downloadFile(filename: string): Promise<void> {
    try {
      const downloadUrl = this.getDownloadUrl(filename);
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  static async convertPowerPointToPDF(
    file: File,
    options?: {
      documentName?: string;
      quality?: 'high' | 'medium' | 'low';
      includeNotes?: boolean;
    }
  ): Promise<PowerPointConversionResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options?.documentName) {
      const brandedName = getBrandedDocumentBase(options.documentName);
      formData.append('documentName', brandedName);
    }
    
    if (options?.quality) {
      formData.append('quality', options.quality);
    }
    
    if (options?.includeNotes !== undefined) {
      formData.append('includeNotes', options.includeNotes.toString());
    }

    try {
      const response = await fetch(`${API_BASE_URL}/powerpoint/convert-to-pdf`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error converting PowerPoint to PDF:', error);
      throw error;
    }
  }

  static async convertPowerPointToImages(
    file: File,
    options?: {
      format?: 'png' | 'jpg';
      quality?: 'high' | 'medium' | 'low';
      width?: number;
      height?: number;
    }
  ): Promise<PowerPointConversionResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options?.format) {
      formData.append('format', options.format);
    }
    
    if (options?.quality) {
      formData.append('quality', options.quality);
    }
    
    if (options?.width) {
      formData.append('width', options.width.toString());
    }
    
    if (options?.height) {
      formData.append('height', options.height.toString());
    }

    try {
      const response = await fetch(`${API_BASE_URL}/powerpoint/convert-to-images`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error converting PowerPoint to images:', error);
      throw error;
    }
  }

  static async getPowerPointSupportedFormats(): Promise<{
    inputFormats: string[];
    outputFormats: string[];
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/powerpoint/supported-formats`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching PowerPoint supported formats:', error);
      throw error;
    }
  }
}