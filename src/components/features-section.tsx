import { Zap, Palette, Shield, Globe } from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: Zap,
      title: "Fast & Universal",
      description: "Lightning-fast processing that handles any file type combination with intelligent AI algorithms.",
      gradient: "from-yellow-400 to-orange-500"
    },
    {
      icon: Palette,
      title: "Preserves Layouts & Styles",
      description: "Maintains original formatting, fonts, and visual elements across all merged documents.",
      gradient: "from-purple-400 to-pink-500"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your files are processed locally with no-save mode. Complete privacy and security guaranteed.",
      gradient: "from-blue-400 to-indigo-500"
    },
    {
      icon: Globe,
      title: "Works Across Devices",
      description: "Web-based solution that works seamlessly on desktop, tablet, and mobile devices.",
      gradient: "from-green-400 to-teal-500"
    }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-bold text-foreground mb-6">
            Why Choose File Merger AI?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built for professionals who need reliable, fast, and secure file merging capabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative"
              >
                <div className="bg-card rounded-2xl p-8 shadow-card hover:shadow-glow transition-all duration-300 border border-border h-full">
                  {/* Icon with gradient background */}
                  <div className="relative mb-6">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Hover effect border */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-primary/20 transition-colors duration-300 pointer-events-none" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;