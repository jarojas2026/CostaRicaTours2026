const fs = require('fs');
let code = fs.readFileSync('src/components/HeroSection.tsx', 'utf8');

code = code.replace(/export const HeroSection: React\.FC<HeroSectionProps> = \(\{/g, 'export const HeroSection: React.FC<HeroSectionProps> = ({\n  currency,');

fs.writeFileSync('src/components/HeroSection.tsx', code);
