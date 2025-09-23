import { useState } from "react";
import { FileText, FileImage, FileSpreadsheet, Presentation, ArrowRight } from "lucide-react";

const FileTypeGrid = () => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const fileConversions = [
    {
      inputs: [
        { type: "DOCX", icon: FileText, color: "text-blue-600" },
        { type: "PDF", icon: FileText, color: "text-red-600" },
        { type: "TXT", icon: FileText, color: "text-gray-600" }
      ],
      output: { type: "PDF", icon: FileText, color: "text-red-600" }
    },
    {
      inputs: [
        { type: "PPTX", icon: Presentation, color: "text-orange-600" },
        { type: "DOCX", icon: FileText, color: "text-blue-600" },
        { type: "PDF", icon: FileText, color: "text-red-600" }
      ],
      output: { type: "PDF", icon: FileText, color: "text-red-600" }
    },
    {
      inputs: [
        { type: "XLSX", icon: FileSpreadsheet, color: "text-green-600" },
        { type: "CSV", icon: FileSpreadsheet, color: "text-green-500" },
        { type: "DOCX", icon: FileText, color: "text-blue-600" }
      ],
      output: { type: "DOCX/PDF", icon: FileText, color: "text-purple-600" }
    },
    {
      inputs: [
        { type: "JPG", icon: FileImage, color: "text-pink-600" },
        { type: "PNG", icon: FileImage, color: "text-indigo-600" },
        { type: "PDF", icon: FileText, color: "text-red-600" }
      ],
      output: { type: "PDF", icon: FileText, color: "text-red-600" }
    }
  ];

  return (
    <section className="py-24 bg-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-bold text-foreground mb-6">
            Universal File Conversion
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Mix and match any file types. Our AI intelligently merges them into your preferred format.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {fileConversions.map((conversion, index) => (
            <div
              key={index}
              className="group relative"
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="bg-card rounded-2xl p-6 shadow-card hover:shadow-glow transition-all duration-300 border border-border">
                {/* Input files */}
                <div className="flex justify-center gap-2 mb-6">
                  {conversion.inputs.map((input, inputIndex) => {
                    const Icon = input.icon;
                    return (
                      <div
                        key={inputIndex}
                        className={`p-3 bg-secondary rounded-lg transition-all duration-300 ${
                          hoveredCard === index 
                            ? 'transform scale-110 animate-glow' 
                            : 'transform scale-100'
                        }`}
                        style={{ 
                          animationDelay: hoveredCard === index ? `${inputIndex * 0.1}s` : '0s'
                        }}
                      >
                        <Icon className={`w-6 h-6 ${input.color}`} />
                        <span className="text-xs font-medium text-muted-foreground block text-center mt-1">
                          {input.type}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Arrow */}
                <div className="flex justify-center mb-6">
                  <ArrowRight 
                    className={`w-8 h-8 text-muted-foreground transition-all duration-300 ${
                      hoveredCard === index 
                        ? 'text-primary transform translate-x-2' 
                        : ''
                    }`} 
                  />
                </div>

                {/* Output file */}
                <div className="flex justify-center">
                  <div 
                    className={`p-4 bg-primary text-primary-foreground rounded-xl transition-all duration-500 ${
                      hoveredCard === index 
                        ? 'animate-glow transform scale-110' 
                        : 'transform scale-100'
                    }`}
                  >
                    <conversion.output.icon className="w-8 h-8 mx-auto mb-2" />
                    <span className="text-sm font-semibold block text-center">
                      {conversion.output.type}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FileTypeGrid;