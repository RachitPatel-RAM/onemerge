import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Upload, File, X, Download, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MergeAnimation from "@/components/merge-animation";
import { ApiService } from "@/services/api";

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

const Dashboard = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showMergeAnimation, setShowMergeAnimation] = useState(false);
  const [outputFormat, setOutputFormat] = useState('pdf');
  const [documentName, setDocumentName] = useState('');
  const [mergeOrder, setMergeOrder] = useState('upload');
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Scroll to main content when component mounts
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending'
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDownload = async () => {
    if (!downloadUrl) return;
    
    try {
      // Extract filename from download URL
      const filename = downloadUrl.split('/').pop() || 'merged-document';
      await ApiService.downloadFile(filename);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download file. Please try again.');
    }
  };

  const startMerging = async () => {
    if (uploadedFiles.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    setShowMergeAnimation(true);
    setError('');
    setDownloadUrl('');
    
    // Update file statuses to processing
    setUploadedFiles(files => 
      files.map(file => ({ ...file, status: 'processing' as const }))
    );

    try {
      // Prepare files and merge order
      const files = uploadedFiles.map(uf => uf.file);
      const orderArray = mergeOrder === 'alphabetical' 
        ? uploadedFiles.map(uf => uf.file.name).sort()
        : uploadedFiles.map(uf => uf.file.name);

      // Start progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 90));
      }, 300);

      // Call the API
      const result = await ApiService.mergeFiles(
        files,
        outputFormat,
        documentName || 'merged-document',
        orderArray
      );

      // Complete progress
      clearInterval(progressInterval);
      setProgress(100);

      // Update file statuses to completed
      setUploadedFiles(files => 
        files.map(file => ({ ...file, status: 'completed' as const }))
      );

      // Set download URL
      setDownloadUrl(result.downloadUrl);

      // Hide animation after completion
      setTimeout(() => setShowMergeAnimation(false), 2000);

    } catch (err) {
      console.error('Merge failed:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during merging');
      
      // Update file statuses to error
      setUploadedFiles(files => 
        files.map(file => ({ ...file, status: 'error' as const }))
      );
      
      setShowMergeAnimation(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const iconClass = "w-8 h-8";
    
    switch (extension) {
      case 'pdf':
        return <div className={`${iconClass} bg-red-100 text-red-600 rounded flex items-center justify-center text-xs font-bold`}>PDF</div>;
      case 'docx':
      case 'doc':
        return <div className={`${iconClass} bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs font-bold`}>DOC</div>;
      case 'xlsx':
      case 'xls':
        return <div className={`${iconClass} bg-green-100 text-green-600 rounded flex items-center justify-center text-xs font-bold`}>XLS</div>;
      case 'pptx':
      case 'ppt':
        return <div className={`${iconClass} bg-orange-100 text-orange-600 rounded flex items-center justify-center text-xs font-bold`}>PPT</div>;
      case 'txt':
        return <div className={`${iconClass} bg-gray-100 text-gray-600 rounded flex items-center justify-center text-xs font-bold`}>TXT</div>;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <div className={`${iconClass} bg-purple-100 text-purple-600 rounded flex items-center justify-center text-xs font-bold`}>IMG</div>;
      default:
        return <File className={iconClass} />;
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
    <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center sm:text-left">
            File Merging Dashboard
          </h1>
        </div>

        <div ref={mainContentRef} className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Upload Area */}
          <div className="xl:col-span-2">
            <Card className="h-fit">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                  Upload Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 sm:p-6 lg:p-8 text-center cursor-pointer hover:border-primary/50 transition-colors active:scale-[0.98] touch-manipulation"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                  <p className="text-base sm:text-lg font-medium mb-2">
                    <span className="hidden sm:inline">Drop files here or click to browse</span>
                    <span className="sm:hidden">Tap to select files</span>
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    <span className="hidden sm:inline">Supports PDF, DOCX, TXT, PPTX, Images, XLSX, CSV</span>
                    <span className="sm:hidden">PDF, DOCX, TXT, PPTX, Images, XLSX, CSV</span>
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,.pptx,.jpg,.jpeg,.png,.xlsx,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* File List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                    <h3 className="font-medium text-sm sm:text-base">
                      Uploaded Files ({uploadedFiles.length})
                    </h3>
                    <div className="max-h-64 sm:max-h-80 overflow-y-auto space-y-2 sm:space-y-3">
                      {uploadedFiles.map((uploadedFile) => (
                        <div
                          key={uploadedFile.id}
                          className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex-shrink-0">
                            {getFileIcon(uploadedFile.file.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm sm:text-base">
                              {uploadedFile.file.name}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {formatFileSize(uploadedFile.file.size)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            <Badge
                              variant={
                                uploadedFile.status === 'completed'
                                  ? 'default'
                                  : uploadedFile.status === 'error'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                              className="text-xs px-1.5 py-0.5 sm:px-2 sm:py-1"
                            >
                              <span className="hidden sm:inline">{uploadedFile.status}</span>
                              <span className="sm:hidden">
                                {uploadedFile.status === 'completed' ? '✓' : 
                                 uploadedFile.status === 'error' ? '✗' : '○'}
                              </span>
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(uploadedFile.id)}
                              disabled={isProcessing}
                              className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                            >
                              <X className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Processing Panel */}
          <div className="xl:col-span-1">
            <Card className="sticky top-4">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">Merge Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-5">
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Document Name (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter document name..."
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">
                    Output Format
                  </label>
                  <select 
                    className="w-full p-2 sm:p-3 border rounded-md bg-background text-sm sm:text-base focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                  >
                    <option value="pdf">PDF</option>
                    <option value="docx">DOCX</option>
                    <option value="txt">TXT</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">
                    Merge Order
                  </label>
                  <select 
                    className="w-full p-2 sm:p-3 border rounded-md bg-background text-sm sm:text-base focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    value={mergeOrder}
                    onChange={(e) => setMergeOrder(e.target.value)}
                  >
                    <option value="upload">Upload Order</option>
                    <option value="name">Alphabetical</option>
                    <option value="size">File Size</option>
                  </select>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {isProcessing && (
                  <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Processing...</span>
                      <span className="font-mono">{progress}%</span>
                    </div>
                    <Progress value={progress} className="w-full h-2" />
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <Button
                    onClick={startMerging}
                    disabled={uploadedFiles.length === 0 || isProcessing}
                    className="w-full touch-manipulation"
                    size="lg"
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Merging Files...
                      </span>
                    ) : (
                      'Start Merging'
                    )}
                  </Button>

                  {downloadUrl && !isProcessing && (
                    <Button
                      onClick={handleDownload}
                      variant="outline"
                      className="w-full touch-manipulation"
                      size="lg"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Merged File
                    </Button>
                  )}
                </div>

                {/* File Count Summary */}
                <div className="pt-3 border-t">
                  <div className="text-center text-sm text-muted-foreground">
                    {uploadedFiles.length === 0 ? (
                      "No files uploaded"
                    ) : (
                      <>
                        <span className="font-medium text-foreground">
                          {uploadedFiles.length}
                        </span>
                        {" "}file{uploadedFiles.length !== 1 ? 's' : ''} ready to merge
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Merge Animation Overlay */}
        {showMergeAnimation && (
          <MergeAnimation 
            files={uploadedFiles.map(f => ({
              id: f.id,
              name: f.file.name,
              type: f.file.type,
              size: f.file.size
            }))}
            isActive={showMergeAnimation}
            onComplete={() => setShowMergeAnimation(false)}
            outputFormat={outputFormat}
            documentName={documentName || 'merged-document'}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;