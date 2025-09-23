import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, File, X, Download, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

const Dashboard = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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

  const startMerging = async () => {
    if (uploadedFiles.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    // Simulate processing
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setProgress(i);
    }
    
    // Update file statuses
    setUploadedFiles(prev => 
      prev.map(f => ({ ...f, status: 'completed' as const }))
    );
    
    setIsProcessing(false);
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold">File Merging Dashboard</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upload Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
                  <p className="text-muted-foreground">
                    Supports PDF, DOCX, TXT, PPTX, Images, XLSX, CSV
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
                  <div className="mt-6 space-y-3">
                    <h3 className="font-medium">Uploaded Files ({uploadedFiles.length})</h3>
                    {uploadedFiles.map((uploadedFile) => (
                      <div
                        key={uploadedFile.id}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20"
                      >
                        {getFileIcon(uploadedFile.file.name)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{uploadedFile.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(uploadedFile.file.size)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            uploadedFile.status === 'completed'
                              ? 'default'
                              : uploadedFile.status === 'error'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {uploadedFile.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadedFile.id)}
                          disabled={isProcessing}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Processing Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Merge Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Output Format</label>
                  <select className="w-full mt-1 p-2 border rounded-md bg-background">
                    <option value="pdf">PDF</option>
                    <option value="docx">DOCX</option>
                    <option value="txt">TXT</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Merge Order</label>
                  <select className="w-full mt-1 p-2 border rounded-md bg-background">
                    <option value="upload">Upload Order</option>
                    <option value="name">Alphabetical</option>
                    <option value="size">File Size</option>
                  </select>
                </div>

                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}

                <Button
                  onClick={startMerging}
                  disabled={uploadedFiles.length === 0 || isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? 'Merging Files...' : 'Start Merging'}
                </Button>

                {progress === 100 && !isProcessing && (
                  <Button
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Merged File
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;