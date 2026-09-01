const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

const regexDropdowns = /        <div className="flex items-center gap-2 sm:gap-3 ml-4">[\s\S]*?{([^]*?)}[\s\S]*?{([^]*?)}[\s\S]*?<\/div>\s*<\/div>/;

const match = content.match(/        <div className="flex items-center gap-2 sm:gap-3 ml-4">\s*\{\/\* Multi-Currency Dropdown \*\/\}[\s\S]*?\{\/\* Multi-Language Selector Dropdown \*\/\}[\s\S]*?<\/div>\s*<\/div>/);

if (match) {
  const dropdowns = match[0];
  content = content.replace(dropdowns, '');
  
  // Extract just the inner dropdowns without the outer wrapper if we want, or put the whole wrapper in Action buttons.
  // Actually, let's just insert the dropdowns.
  const innerDropdowns = dropdowns.replace(/        <div className="flex items-center gap-2 sm:gap-3 ml-4">\n/, '').replace(/        <\/div>\n$/, '');
  
  content = content.replace(
    '{/* Action buttons */}\n        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">',
    `{/* Action buttons */}\n        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">\n${innerDropdowns}`
  );
  
  fs.writeFileSync('src/components/Header.tsx', content);
  console.log('Dropdowns moved!');
} else {
  console.log('Could not match dropdowns');
}
