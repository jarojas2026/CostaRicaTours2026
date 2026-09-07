const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// There's a second block of DEV_PALETTES rendering (likely for mobile or it was just in two places)
// Let's wipe anything between `{/* Development Palette Selector (Mobile) */}` and the next section, if it exists
// But we also need to just remove the specific lines causing errors.

code = code.replace(/setIsPaletteMenuOpen\(false\);/g, '');
code = code.replace(/setIsPaletteMenuOpen\(!isPaletteMenuOpen\);/g, '');

const startMobilePalette = code.indexOf('{/* Development Palette Selector');
if (startMobilePalette !== -1) {
    // wait, I deleted the first one. Let's just find where DEV_PALETTES is used and remove that entire parent block
    const lines = code.split('\n');
    let skip = false;
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
       if (lines[i].includes('{/* Development Palette Selector')) {
          skip = true;
       }
       
       if (skip && (lines[i].includes('{/* Auth Menu') || lines[i].includes('{/* Contact Mobile') || lines[i].includes('</div>'))) {
          // just be careful not to delete too much
       }
    }
}
