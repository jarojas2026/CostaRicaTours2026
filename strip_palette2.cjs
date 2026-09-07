const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

const lines = code.split('\n');
const newLines = [];
let skip = false;
let skipCount = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const applyDevPalette =')) {
    skip = true;
  }
  
  if (skip && lines[i].includes('}')) {
    skipCount++;
    if (skipCount === 2) {
       skip = false;
       continue;
    }
  }

  // Find the button rendering DEV_PALETTES
  if (!skip && lines[i].includes('onClick={() => setIsPaletteMenuOpen(!isPaletteMenuOpen)}')) {
    // Delete previous 2 lines and start skipping
    newLines.pop();
    newLines.pop();
    skip = true;
  }
  
  if (skip && lines[i].includes('</AnimatePresence>')) {
     // Check if it's the palette one
     if (lines[i-1] && lines[i-1].includes('</motion.div>')) {
         // let's just use manual string replacement to remove the palette menu block.
     }
  }
  
  if (!skip) {
    newLines.push(lines[i]);
  }
}

fs.writeFileSync('src/components/Header.tsx', newLines.join('\n'));
