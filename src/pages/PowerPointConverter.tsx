import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import PowerPointConverter from "@/components/powerpoint-converter";
import { PowerPointConversionResponse } from "@/services/api";

const PowerPointConverterPage = () => {
  const navigate = useNavigate();

  const handleConversionComplete = (result: PowerPointConversionResponse) => {
    console.log('Conversion completed:', result);
    // You can add additional logic here, such as showing notifications
  };

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
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
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center sm:text-left">
              PowerPoint Converter
            </h1>
            <p className="text-gray-600 mt-1 text-center sm:text-left">
              Convert PowerPoint presentations to high-quality PDF or individual images
            </p>
          </div>
        </div>

        {/* Converter Component */}
        <PowerPointConverter onConversionComplete={handleConversionComplete} />

        {/* Information Section */}
        <div className="mt-12 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  1
                </div>
                <h3 className="font-medium mb-2">Upload PowerPoint</h3>
                <p className="text-sm text-gray-600">
                  Select your .ppt or .pptx file to convert
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  2
                </div>
                <h3 className="font-medium mb-2">Choose Options</h3>
                <p className="text-sm text-gray-600">
                  Select output format, quality, and other preferences
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  3
                </div>
                <h3 className="font-medium mb-2">Download Result</h3>
                <p className="text-sm text-gray-600">
                  Get your converted PDF or image files
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold mb-3">Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>High-resolution output</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Preserves all slide elements</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Multiple quality options</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>PDF or individual images</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Custom image dimensions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Include speaker notes (PDF)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PowerPointConverterPage;