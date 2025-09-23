const FooterSection = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h3 className="text-3xl font-bold mb-4">File Merger AI</h3>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed text-lg">
            The fastest, most secure way to merge any file types into universal formats. 
            Powered by advanced AI technology for seamless file processing.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-primary-foreground/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-primary-foreground/60 text-sm">
            © 2024 File Merger AI. All rights reserved.
          </p>
          
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-primary-foreground/60 hover:text-primary-foreground text-sm transition-colors duration-300">
              Status
            </a>
            <a href="#" className="text-primary-foreground/60 hover:text-primary-foreground text-sm transition-colors duration-300">
              Support
            </a>
            <a href="#" className="text-primary-foreground/60 hover:text-primary-foreground text-sm transition-colors duration-300">
              Changelog
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;