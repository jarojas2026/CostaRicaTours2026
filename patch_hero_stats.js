const fs = require('fs');
let c = fs.readFileSync('src/components/HeroSection.tsx', 'utf8');

c = c.replace(/\{\/\* Quick Metrics \*\/\}[\s\S]*?\{\/\* Search and Filters Bar \*\/\}/, '{/* Search and Filters Bar */}');

fs.writeFileSync('src/components/HeroSection.tsx', c);
