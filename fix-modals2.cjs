const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'components');
const files = fs.readdirSync(componentsDir).filter(f => f.includes('Modal') && f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Handle dynamic classNames: className={`...`}
  // Warning: regex with backticks and interpolation can be messy, let's just do a simple replacement if we find className={`
  content = content.replace(/(<button\b[^>]*?className=\{`)([^`]*?)(`\}[^>]*?>)/gi, (match, prefix, classes, suffix) => {
    let newClasses = classes;
    if (!newClasses.includes('min-h-[44px]') && !newClasses.includes('min-h-11')) {
      newClasses = `min-h-[44px] min-w-[44px] ${newClasses}`;
    }
    return `${prefix}${newClasses}${suffix}`;
  });

  // Check inputs as well? 
  content = content.replace(/(<(?:input|select)\b[^>]*?className=\{`)([^`]*?)(`\}[^>]*?>)/gi, (match, prefix, classes, suffix) => {
    let newClasses = classes;
    if (!newClasses.includes('min-h-[44px]') && !newClasses.includes('min-h-11') && !newClasses.includes('h-11') && !newClasses.includes('h-12')) {
      newClasses = `min-h-[44px] ${newClasses}`;
    }
    return `${prefix}${newClasses}${suffix}`;
  });

  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Done processing dynamic modals');
