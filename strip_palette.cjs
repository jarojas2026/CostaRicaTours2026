const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Remove DEV_PALETTES entirely and related state
code = code.replace(/const \[isPaletteMenuOpen, setIsPaletteMenuOpen\] = useState\(false\);/, '');
code = code.replace(/const DEV_PALETTES = \[[\s\S]*?\];/m, '');
code = code.replace(/const \[activePalette, setActivePalette\] = useState[\s\S]*?\}\);/m, '');
code = code.replace(/const applyDevPalette = \([\s\S]*?\} \}/m, '');
code = code.replace(/useEffect\(\(\) => \{\s*const saved = localStorage\.getItem[\s\S]*?\}\, \[\]\);/m, '');

// Now remove the palette menu UI from the TSX return
const paletteButtonRegex = /\{!\!DEV_PALETTES[\s\S]*?\{isPaletteMenuOpen && \([\s\S]*?<\/motion\.div>\s*\)\}\s*<\/div>/m;
code = code.replace(paletteButtonRegex, '');
// Wait, regex might fail to match correctly due to nested braces. 

fs.writeFileSync('src/components/Header.tsx', code);
