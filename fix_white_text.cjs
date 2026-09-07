const fs = require('fs');
const path = require('path');

const dir = 'src/components';
const files = ['ItineraryPlanner.tsx', 'HomeTrustSections.tsx', 'CustomFunnelModal.tsx', 'MicroclimateRadar.tsx', 'NationalTransportSection.tsx'];

for (const file of files) {
  const filePath = path.join(dir, file);
  if (fs.existsSync(filePath)) {
    let code = fs.readFileSync(filePath, 'utf8');
    
    // Convert bad text colors that were for dark mode
    code = code.replace(/text-white/g, 'text-stone-900');
    // For specific things like buttons that should be white text, I might break them. 
    // E.g. bg-orange-500 text-stone-900 -> bg-orange-500 text-white.
    // Let's manually fix bg-orange-500 and bg-teal-600 to have text-white
    
    fs.writeFileSync(filePath, code);
    console.log(`Updated ${file}`);
  }
}
