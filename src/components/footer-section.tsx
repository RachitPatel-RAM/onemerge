import { useState, useEffect, useRef } from 'react';

const FooterSection = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h3 className="text-3xl font-bold mb-4">One Merge</h3>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed text-lg">
            The fastest, most secure way to merge any file types into universal formats. 
            Professional file conversion and merging solution for all your document needs.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-primary-foreground/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-white text-sm flex items-center gap-2">
            Developed by{' '}
            <a 
              href="https://www.linkedin.com/in/rachitpatell/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-yellow-400 hover:text-yellow-300 transition-colors duration-300 underline"
            >
              Rachit
            </a>
          </p>
          
          <div className="flex items-center mt-4 md:mt-0 relative">
            <span className="text-primary-foreground/60 text-sm mr-3">Powered by</span>
            <div className="relative" ref={dropdownRef}>
              <img 
                src="/logo.png" 
                alt="MaJe Technologies" 
                className="h-8 w-auto cursor-pointer hover:opacity-80 transition-opacity duration-300"
                onClick={() => setShowDropdown(!showDropdown)}
              />
              
              {showDropdown && (
                <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[140px] z-10">
                  <a 
                    href="https://www.instagram.com/majetechnologies?igsh=NHJjcGswejNkOHQ=" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                    onClick={() => setShowDropdown(false)}
                  >
                    Instagram
                  </a>
                  <a 
                    href="https://www.linkedin.com/company/maje-technologies/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                    onClick={() => setShowDropdown(false)}
                  >
                    LinkedIn
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;