import HeroSection from "@/components/hero-section";
import FileTypeGrid from "@/components/file-grid-section";
import FeaturesSection from "@/components/features-section";
import HowItWorksSection from "@/components/how-it-works-section";
import FooterSection from "@/components/footer-section";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <FileTypeGrid />
      <FeaturesSection />
      <HowItWorksSection />
      <FooterSection />
    </div>
  );
};

export default Index;
