const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Wipe the `const applyDevPalette`
code = code.replace(/const applyDevPalette = \([\s\S]*?\} \}/m, '');

// Wipe the `const [activePalette`
code = code.replace(/const \[activePalette, setActivePalette\] = useState[\s\S]*?\}\);/m, '');

// Wipe DEV_PALETTES
code = code.replace(/const DEV_PALETTES = \[[\s\S]*?\];/m, '');

// Wipe the button logic block entirely
const startText = '{/* Development Palette Selector */}';
const endText = '{/* Currency Selector */}';
const startIdx = code.indexOf(startText);
const endIdx = code.indexOf(endText);

if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + code.substring(endIdx);
}

fs.writeFileSync('src/components/Header.tsx', code);
