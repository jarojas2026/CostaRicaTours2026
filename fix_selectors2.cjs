const fs = require('fs');
let code = fs.readFileSync('src/components/FloatingWhatsApp.tsx', 'utf8');

// The lines are definitely still there, let's just wipe out that whole block manually.
// It starts around 1543. Let's find the exact text.
const lines = code.split('\n');
const newLines = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{showThemeSelector && !isOpen && (')) {
    skip = true;
  }
  
  if (skip && lines[i].includes('</motion.div>')) {
    skip = false;
    continue;
  }
  
  if (lines[i].includes('{!isOpen && (')) {
     skip = true;
  }
  
  if (skip && lines[i].includes('</motion.button>')) {
     skip = false;
     continue;
  }
  
  if (!skip) {
    newLines.push(lines[i]);
  }
}

fs.writeFileSync('src/components/FloatingWhatsApp.tsx', newLines.join('\n'));
