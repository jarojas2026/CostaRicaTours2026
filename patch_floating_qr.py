import re

with open('src/components/FloatingWhatsApp.tsx', 'r') as f:
    content = f.read()

# Add imports for TOURS and Tour
content = content.replace("import { Language } from '../types';", "import { Language, Tour } from '../types';\nimport { TOURS } from '../data/toursData';")

# Add onSelectTour to props
content = content.replace(
    "onOpenAIAssistant?: () => void;\n}",
    "onOpenAIAssistant?: () => void;\n  onSelectTour?: (tour: Tour) => void;\n}"
)

# Update the component signature
content = content.replace(
    "export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({ language, initialMessage, onOpenAIAssistant }) => {",
    "export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({ language, initialMessage, onOpenAIAssistant, onSelectTour }) => {"
)

# Update the scanResult useEffect
old_scan_effect = """  useEffect(() => {
    if (scanResult) {
      setRecentScans(prev => {
        const newScans = [scanResult, ...prev.filter(s => s !== scanResult)].slice(0, 3);
        return newScans;
      });

      const timer = setTimeout(() => {
        try {
          const url = new URL(scanResult);
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            // Optional: check if it's a valid tour URL. For now, any valid http(s) URL works.
            window.location.href = url.href;
          }
        } catch (e) {
          // Not a valid URL, ignore
        }
      }, 2000); // 2 second debounce/delay to allow user to see success UI

      return () => clearTimeout(timer);
    }
  }, [scanResult]);"""

new_scan_effect = """  useEffect(() => {
    if (scanResult) {
      setRecentScans(prev => {
        const newScans = [scanResult, ...prev.filter(s => s !== scanResult)].slice(0, 3);
        return newScans;
      });

      const timer = setTimeout(() => {
        let possibleTourId = scanResult;
        
        try {
           const url = new URL(scanResult);
           const parts = url.pathname.split('/').filter(Boolean);
           if (parts.length > 0) {
               possibleTourId = parts[parts.length - 1];
           }
        } catch(e) {}
        
        const foundTour = TOURS.find(t => t.id === possibleTourId || scanResult.includes(t.id));
        
        if (foundTour && onSelectTour) {
           onSelectTour(foundTour);
           setIsOpen(false);
           setIsScanning(false);
           setScanResult(null);
        } else {
           try {
             const url = new URL(scanResult);
             if (url.protocol === 'http:' || url.protocol === 'https:') {
               window.location.href = url.href;
             }
           } catch (e) {}
        }
      }, 2000); // 2 second debounce/delay to allow user to see success UI

      return () => clearTimeout(timer);
    }
  }, [scanResult, onSelectTour]);"""

content = content.replace(old_scan_effect, new_scan_effect)

# Also update the recent scans onClick
old_recent_scan_click = """                        onClick={() => {
                          try {
                            const url = new URL(scan);
                            if (url.protocol === 'http:' || url.protocol === 'https:') {
                              window.location.href = url.href;
                            }
                          } catch (e) {
                            // ignore
                          }
                        }}"""

new_recent_scan_click = """                        onClick={() => {
                          let possibleId = scan;
                          try {
                            const url = new URL(scan);
                            const parts = url.pathname.split('/').filter(Boolean);
                            if (parts.length > 0) {
                              possibleId = parts[parts.length - 1];
                            }
                          } catch(e) {}
                          
                          const found = TOURS.find(t => t.id === possibleId || scan.includes(t.id));
                          if (found && onSelectTour) {
                             onSelectTour(found);
                             setIsOpen(false);
                             setIsScanning(false);
                          } else {
                            try {
                              const url = new URL(scan);
                              if (url.protocol === 'http:' || url.protocol === 'https:') {
                                window.location.href = url.href;
                              }
                            } catch (e) {}
                          }
                        }}"""

content = content.replace(old_recent_scan_click, new_recent_scan_click)

with open('src/components/FloatingWhatsApp.tsx', 'w') as f:
    f.write(content)
