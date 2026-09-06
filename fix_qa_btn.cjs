const fs = require('fs');
let code = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');
code = code.replace(
  "className={`text-xs font-bold px-3 py-1.5 rounded-full border border-stone-200 bg-white shadow-sm ${themeClasses.button} hover:text-white transition-colors duration-200 text-stone-700`}",
  "className={`text-xs font-bold px-4 py-2 rounded-full shadow-md ${themeClasses.button} text-white transition-all transform hover:scale-105 active:scale-95 duration-200 flex-1 text-center`}"
);
fs.writeFileSync('src/components/FloatingWhatsApp.tsx', code);
console.log('Fixed QA button classes');
