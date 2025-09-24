import { getBrandedDocumentBase } from "@/lib/branding";

const API_BASE_URL = 'http://localhost:3001/api';

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
      const response = await fetch(`${API_BASE_URL}/merge/supported-formats`);
      
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
      const response = await fetch(`${API_BASE_URL}/health`);
      
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
}