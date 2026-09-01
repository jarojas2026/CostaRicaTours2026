const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

const regexDropdowns = /        <div className="flex items-center gap-2 sm:gap-3 ml-4">\n\s*\{\/\* Multi-Currency Dropdown \*\/\}[\s\S]*?\{\/\* Multi-Language Selector Dropdown \*\/\}[\s\S]*?<\/div>\n\s*<\/div>/;

const match = content.match(regexDropdowns);
if (match) {
  content = content.replace(match[0], '');
  
  // Extract just the inner dropdowns, stripping the outer wrapper
  let innerDropdowns = match[0].replace('        <div className="flex items-center gap-2 sm:gap-3 ml-4">\n', '');
  innerDropdowns = innerDropdowns.replace(/        <\/div>\n\s*$/, '');
  
  content = content.replace(
    '        {/* Action buttons */}\n        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">\n          {user ? (',
    `        {/* Action buttons */}\n        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">\n${innerDropdowns}          {user ? (`
  );
  
  fs.writeFileSync('src/components/Header.tsx', content);
  console.log('Safe move done!');
} else {
  console.log('Match failed');
}
