const fs = require('fs');
let code = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');

// Replace leftover ternary logic and theme references
code = code.replace(/\$\{theme === 'teal' \? 'text-orange-500' : 'text-orange-500'\}/g, 'text-orange-500');
code = code.replace(/\$\{isOnline \? \(theme === 'teal' \? 'text-amber-100' : 'text-stone-900'\) : 'text-rose-200 font-semibold'\}/g, '\\${isOnline ? "text-amber-100" : "text-rose-200 font-semibold"}');
code = code.replace(/\$\{theme === 'teal' \? 'group-hover:text-orange-500' : 'group-hover:text-orange-500'\}/g, 'group-hover:text-orange-500');

// Replace the leftover map for THEMES that causes an error
const leftoverMap = /\{Object\.entries\(THEMES\)\.map\(\(\[key, t\]\) => \([\s\S]*?<\/button>\s*\)\)\}/m;
code = code.replace(leftoverMap, '');

fs.writeFileSync('src/components/FloatingWhatsApp.tsx', code);
