const fs = require('fs');
let code = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');

// Remove the theme state
code = code.replace(/const \[theme, setTheme\] = useState<string>\([^)]+\);/g, '');
code = code.replace(/const \[showThemeSelector, setShowThemeSelector\] = useState\(false\);/g, '');

// Remove the root.style.setProperty useEffect
const useeffectRegex = /useEffect\(\(\) => \{\s*const root = document\.documentElement;[\s\S]*?\}, \[theme\]\);/m;
code = code.replace(useeffectRegex, '');

// Hardcode themeClasses to emerald (the most professional/standard one for WhatsApp)
code = code.replace(/const themeClasses = THEMES\[theme\] \|\| THEMES\.emerald;/g, 'const themeClasses = THEMES.emerald;');

// Remove the theme selector UI
const themeSelectorRegex = /\{showThemeSelector && \([\s\S]*?<\/motion\.div>\s*\)\}/m;
code = code.replace(themeSelectorRegex, '');

// Remove the button that opens the theme selector
const themeSelectorButtonRegex = /\{!isOpen && \(\s*<motion\.button[\s\S]*?<\/motion\.button>\s*\)\}/m;
code = code.replace(themeSelectorButtonRegex, '');

// Remove the THEMES object entirely if not needed, or just let it be since we use THEMES.emerald. Let's keep THEMES for now but just use emerald.

fs.writeFileSync('src/components/FloatingWhatsApp.tsx', code);
console.log('Fixed FloatingWhatsApp');
