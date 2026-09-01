const fs = require('fs');

let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

content = content.replace(
  /<div>\s*<span className="text-lg sm:text-xl font-black tracking-tighter uppercase block leading-none text-white">/g,
  '<div className="whitespace-nowrap">\n            <span className="text-lg sm:text-xl font-black tracking-tighter uppercase block leading-none text-white">'
);

fs.writeFileSync('src/components/Header.tsx', content);
console.log("patched header layout 2");
