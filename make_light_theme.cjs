const fs = require('fs');
const path = require('path');

const dir = 'src/components';
const files = fs.readdirSync(dir);

let replacementsCount = 0;

for (const file of files) {
  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    const filePath = path.join(dir, file);
    let code = fs.readFileSync(filePath, 'utf8');
    const origCode = code;

    // Solid dark cards to clean white/light cards
    code = code.replace(/bg-gradient-to-b from-stone-900 to-stone-950/g, 'bg-white');
    code = code.replace(/bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950/g, 'bg-stone-50');
    code = code.replace(/bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900/g, 'bg-white');
    code = code.replace(/bg-gradient-to-br from-stone-900 to-stone-950/g, 'bg-white');
    code = code.replace(/bg-gradient-to-r from-stone-950 to-neutral-900/g, 'bg-white');
    code = code.replace(/bg-gradient-to-br from-neutral-900 to-stone-950/g, 'bg-white');
    code = code.replace(/bg-gradient-to-r from-stone-900 to-\[#071A0F\]/g, 'bg-white');
    
    // Some single background classes used for solid panels
    code = code.replace(/bg-neutral-950/g, 'bg-white');
    code = code.replace(/bg-stone-900/g, 'bg-white');
    code = code.replace(/bg-stone-950/g, 'bg-white');

    // Replace text colors that were intended for dark backgrounds
    // E.g., text-stone-200 -> text-stone-600
    // text-stone-300 -> text-stone-700
    // text-stone-400 -> text-stone-500
    
    if (code !== origCode) {
      fs.writeFileSync(filePath, code);
      console.log(`Updated ${file}`);
      replacementsCount++;
    }
  }
}

console.log(`Replaced in ${replacementsCount} files.`);
