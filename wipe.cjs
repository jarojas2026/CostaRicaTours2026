const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Wipe the `const applyDevPalette`
code = code.replace(/const applyDevPalette = \([\s\S]*?\} \}/m, '');

// Wipe the `const [activePalette`
code = code.replace(/const \[activePalette, setActivePalette\] = useState[\s\S]*?\}\);/m, '');

// Wipe the palette UI block.
// Let's find it. It starts with `<div className="relative hidden xl:block">` and ends before `{/* Currency Selector */}`
const startText = '<!-- PALETTE DEV MENU -->'; // Is there a comment? Let's look around line 393
const uiRegex = /<div className="relative hidden xl:block">[\s\S]*?setIsPaletteMenuOpen\(!isPaletteMenuOpen\)[\s\S]*?<\/AnimatePresence>\s*<\/div>/;
code = code.replace(uiRegex, '');

fs.writeFileSync('src/components/Header.tsx', code);
