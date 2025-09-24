import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, FileText, Download, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiService, PowerPointConversionResponse } from "@/services/api";

interface PowerPointConverterProps {
  onConversionComplete?: (result: PowerPointConversionResponse) => void;
}

const PowerPointConverter = ({ onConversionComplete }: PowerPointConverterProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [conversionResult, setConversionResult] = useState<PowerPointConversionResponse | null>(null);
  const [error, setError] = useState<string>('');
  
  // Conversion options
  const [outputFormat, setOutputFormat] = useState<'pdf' | 'images'>('pdf');
  const [documentName, setDocumentName] = useState('');
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high');
  const [includeNotes, setIncludeNotes] = useState(false);
  const [imageFormat, setImageFormat] = useState<'png' | 'jpg'>('png');
  const [imageWidth, setImageWidth] = useState<number>(1920);
  const [imageHeight, setImageHeight] = useState<number>(1080);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if it's a PowerPoint file
      const validExtensions = ['.ppt', '.pptx'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        setError('Please select a valid PowerPoint file (.ppt or .pptx)');
        return;
      }
      
      setSelectedFile(file);
      setError('');
      setConversionResult(null);
      
      // Auto-generate document name from file name
      if (!documentName) {
        const nameWithoutExtension = file.name.substring(0, file.name.lastIndexOf('.'));
        setDocumentName(nameWithoutExtension);
      }
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setConversionResult(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startConversion = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    setProgress(0);
    setError('');
    setConversionResult(null);

    try {
      // Start progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      let result: PowerPointConversionResponse;

      if (outputFormat === 'pdf') {
        result = await ApiService.convertPowerPointToPDF(selectedFile, {
          documentName: documentName || 'converted-presentation',
          quality,
          includeNotes
        });
      } else {
        result = await ApiService.convertPowerPointToImages(selectedFile, {
          format: imageFormat,
          quality,
          width: imageWidth,
          height: imageHeight
        });
      }

      // Complete progress
      clearInterval(progressInterval);
      setProgress(100);
      
      setConversionResult(result);
      onConversionComplete?.(result);

    } catch (err) {
      console.error('Conversion failed:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during conversion');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!conversionResult) return;
    
    try {
      const filename = conversionResult.filename;
      await ApiService.downloadFile(filename);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download file. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            PowerPoint to PDF/Images Converter
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedFile ? (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">Upload PowerPoint File</p>
              <p className="text-gray-500 mb-4">
                Click to browse or drag and drop your .ppt or .pptx file here
              </p>
              <Button variant="outline">
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected File Display */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded flex items-center justify-center text-sm font-bold">
                    PPT
                  </div>
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Options */}
      {selectedFile && (
        <Card>
          <CardHeader>
            <CardTitle>Conversion Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Output Format */}
            <div className="space-y-2">
              <Label>Output Format</Label>
              <Select value={outputFormat} onValueChange={(value: 'pdf' | 'images') => setOutputFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Document</SelectItem>
                  <SelectItem value="images">Individual Images</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Document Name */}
            <div className="space-y-2">
              <Label htmlFor="documentName">Document Name</Label>
              <Input
                id="documentName"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Enter document name"
              />
            </div>

            {/* Quality */}
            <div className="space-y-2">
              <Label>Quality</Label>
              <Select value={quality} onValueChange={(value: 'high' | 'medium' | 'low') => setQuality(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Quality</SelectItem>
                  <SelectItem value="medium">Medium Quality</SelectItem>
                  <SelectItem value="low">Low Quality (Smaller File)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* PDF-specific options */}
            {outputFormat === 'pdf' && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="includeNotes"
                  checked={includeNotes}
                  onCheckedChange={setIncludeNotes}
                />
                <Label htmlFor="includeNotes">Include speaker notes</Label>
              </div>
            )}

            {/* Image-specific options */}
            {outputFormat === 'images' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Image Format</Label>
                  <Select value={imageFormat} onValueChange={(value: 'png' | 'jpg') => setImageFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png">PNG (Lossless)</SelectItem>
                      <SelectItem value="jpg">JPEG (Smaller Size)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="imageWidth">Width (px)</Label>
                    <Input
                      id="imageWidth"
                      type="number"
                      value={imageWidth}
                      onChange={(e) => setImageWidth(parseInt(e.target.value) || 1920)}
                      min="100"
                      max="4000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imageHeight">Height (px)</Label>
                    <Input
                      id="imageHeight"
                      type="number"
                      value={imageHeight}
                      onChange={(e) => setImageHeight(parseInt(e.target.value) || 1080)}
                      min="100"
                      max="4000"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Progress */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Converting PowerPoint...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversion Result */}
      {conversionResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Conversion Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-green-800">{conversionResult.filename}</p>
                  <div className="flex gap-4 text-sm text-green-600 mt-1">
                    <span>Size: {formatFileSize(conversionResult.fileSize)}</span>
                    <span>Slides: {conversionResult.slideCount}</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {conversionResult.format.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <Button onClick={handleDownload} className="bg-green-600 hover:bg-green-700">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Convert Button */}
      {selectedFile && !isProcessing && !conversionResult && (
        <div className="flex justify-center">
          <Button
            onClick={startConversion}
            size="lg"
            className="px-8"
            disabled={!selectedFile}
          >
            Convert to {outputFormat === 'pdf' ? 'PDF' : 'Images'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PowerPointConverter;