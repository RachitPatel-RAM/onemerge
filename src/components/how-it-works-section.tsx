import { Upload, Settings, Download } from "lucide-react";

const HowItWorksSection = () => {
  const steps = [
    {
      step: "01",
      icon: Upload,
      title: "Upload Files",
      description: "Drag and drop your files or click to browse. Support for DOCX, PDF, TXT, PPTX, Images, and more.",
      color: "text-blue-500"
    },
    {
      step: "02",
      icon: Settings,
      title: "Select Output Type",
      description: "Choose your preferred output format. Our AI will intelligently merge and optimize your files.",
      color: "text-purple-500"
    },
    {
      step: "03",
      icon: Download,
      title: "Download Merged File",
      description: "Get your perfectly merged file in seconds. Preview before download to ensure it meets your needs.",
      color: "text-green-500"
    }
  ];

  return (
    <section className="py-24 bg-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-bold text-foreground mb-6">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Simple, fast, and intuitive. Get your merged files in three easy steps.
          </p>
        </div>

        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-border transform -translate-y-1/2 z-0" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className="text-center group"
                >
                  {/* Step number and icon */}
                  <div className="relative inline-flex flex-col items-center mb-6">
                    <div className="bg-background border-4 border-border rounded-full w-20 h-20 flex items-center justify-center mb-4 group-hover:border-primary transition-colors duration-300">
                      <Icon className={`w-8 h-8 ${step.color} group-hover:scale-110 transition-transform duration-300`} />
                    </div>
                    <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                      {step.step}
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors duration-300">
                    {step.title}
                  </h3>
                  
                  <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center mt-16">
          <button className="bg-primary text-primary-foreground hover:bg-hover hover:text-hover-foreground px-8 py-4 rounded-xl font-semibold text-lg shadow-glow transition-all duration-300 animate-glow">
            Start Merging Files
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;