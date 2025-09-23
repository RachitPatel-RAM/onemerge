import { Button } from "@/components/ui/button";
import heroWaves from "@/assets/hero-waves.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with waves */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
        style={{ backgroundImage: `url(${heroWaves})` }}
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 gradient-hero opacity-60" />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="animate-fade-in-up">
          <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black tracking-tight mb-6">
            <span className="block text-foreground">Merge Anything.</span>
            <span className="block text-foreground">Export Everything.</span>
          </h1>
          
          <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
            Combine DOCX, PDF, TXT, PPTX, Images & more into one universal file — powered by AI.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="bg-primary text-primary-foreground hover:bg-hover hover:text-hover-foreground px-8 py-4 text-lg font-semibold rounded-xl shadow-glow transition-all duration-300 animate-glow"
            >
              Merge Now
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300"
            >
              Try Demo
            </Button>
          </div>
        </div>
        
        {/* Floating elements for visual interest */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-primary rounded-full animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-primary rounded-full animate-float" style={{ animationDelay: '2.5s' }} />
      </div>
    </section>
  );
};

export default HeroSection;