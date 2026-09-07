const fs = require('fs');
const path = require('path');

const dir = 'src/components';
const files = ['FormsManagerModal.tsx', 'HomeQuickNav.tsx', 'InteractiveMap.tsx'];

for (const file of files) {
  const filePath = path.join(dir, file);
  if (fs.existsSync(filePath)) {
    let code = fs.readFileSync(filePath, 'utf8');
    
    // Background replacements
    code = code.replace(/bg-neutral-900/g, 'bg-white');
    code = code.replace(/from-stone-900\/90 to-stone-950\/90/g, 'bg-white');
    code = code.replace(/from-stone-900\/95 to-teal-950\/90/g, 'bg-white');
    code = code.replace(/from-stone-950\/90 to-teal-950\/90/g, 'bg-white');
    code = code.replace(/bg-gradient-to-r from-stone-950\/90 via-stone-900\/50 to-stone-950\/90/g, 'bg-stone-50');
    code = code.replace(/bg-gradient-to-b from-stone-900 via-stone-850 to-stone-950/g, 'bg-slate-100');
    
    // Also change text colors in these specific files, since we removed the dark backgrounds
    code = code.replace(/text-white/g, 'text-stone-900');
    code = code.replace(/text-stone-300/g, 'text-stone-600');
    code = code.replace(/text-stone-400/g, 'text-stone-500');

    fs.writeFileSync(filePath, code);
    console.log(`Updated ${file}`);
  }
}
