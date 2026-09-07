const fs = require('fs');
let code = fs.readFileSync('src/components/HeroSection.tsx', 'utf8');

// Fix `slide.image referenced in slide.image didn't resolve at build time`
code = code.replace(/style=\{\{ backgroundImage: \`url\(\$\{slide\.image\}\)\` \}\}/g, 'style={{ backgroundImage: `url(${slide.image})` }}');

fs.writeFileSync('src/components/HeroSection.tsx', code);
