/**
 * Device Detection Utilities
 * Helps determine device capabilities for PowerPoint conversion
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  platform: string;
  supportsLibreOffice: boolean;
  recommendedConversionStrategy: 'libreoffice' | 'package' | 'online' | 'placeholder';
}

export function detectDevice(userAgent?: string): DeviceInfo {
  const ua = userAgent || '';
  
  // Mobile detection patterns
  const mobilePatterns = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
    /Mobile/i
  ];
  
  // Tablet detection patterns
  const tabletPatterns = [
    /iPad/i,
    /Android(?=.*Tablet)/i,
    /Tablet/i
  ];
  
  const isMobile = mobilePatterns.some(pattern => pattern.test(ua));
  const isTablet = tabletPatterns.some(pattern => pattern.test(ua));
  const isDesktop = !isMobile && !isTablet;
  
  // Platform detection
  let platform = 'unknown';
  if (/Windows/i.test(ua)) platform = 'windows';
  else if (/Mac/i.test(ua)) platform = 'mac';
  else if (/Linux/i.test(ua)) platform = 'linux';
  else if (/Android/i.test(ua)) platform = 'android';
  else if (/iOS|iPhone|iPad/i.test(ua)) platform = 'ios';
  
  // LibreOffice support assessment
  const supportsLibreOffice = isDesktop && (platform === 'windows' || platform === 'mac' || platform === 'linux');
  
  // Recommended conversion strategy
  let recommendedConversionStrategy: DeviceInfo['recommendedConversionStrategy'];
  if (supportsLibreOffice) {
    recommendedConversionStrategy = 'libreoffice';
  } else if (isDesktop) {
    recommendedConversionStrategy = 'package';
  } else if (isMobile || isTablet) {
    recommendedConversionStrategy = 'placeholder'; // Could be 'online' when implemented
  } else {
    recommendedConversionStrategy = 'placeholder';
  }
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    platform,
    supportsLibreOffice,
    recommendedConversionStrategy
  };
}

export function getConversionMessage(deviceInfo: DeviceInfo): string {
  if (deviceInfo.supportsLibreOffice) {
    return 'Full PowerPoint conversion available with LibreOffice';
  } else if (deviceInfo.isDesktop) {
    return 'Limited PowerPoint conversion available - consider installing LibreOffice for best results';
  } else if (deviceInfo.isMobile || deviceInfo.isTablet) {
    return 'Mobile device detected - PowerPoint files will be included as placeholders. Download original files for full content.';
  } else {
    return 'PowerPoint conversion may be limited on this platform';
  }
}