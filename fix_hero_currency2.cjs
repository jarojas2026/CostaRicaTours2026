const fs = require('fs');
let code = fs.readFileSync('src/components/HeroSection.tsx', 'utf8');

// The price is currently a string like slide.price. Let's see how slide is defined.
// First, import formatCurrency and use currency from App context if available.
// Or wait, HeroSection might not receive `currency` as a prop.
if (!code.includes('formatCurrency')) {
   code = code.replace(/import \{ [\s\S]*? \} from 'lucide-react';/, "$&\nimport { formatCurrency } from '../App';");
}

code = code.replace(/\{slide.price\} USD/g, '{formatCurrency(parseInt(slide.price) || 0, currency)}');

// Add currency to props if needed
if (!code.includes('currency: Currency')) {
   code = code.replace(/interface HeroSectionProps \{/, "interface HeroSectionProps {\n  currency: Currency;");
   code = code.replace(/export const HeroSection: React\.FC<HeroSectionProps> = \(\{ language \) => \{/, "export const HeroSection: React.FC<HeroSectionProps> = ({ language, currency }) => {");
}

// 4. Preload first image / priority
// Replace `<img` in the slide with priority if we can. Actually they use `bg-[url(slide.image)]` likely.
code = code.replace(/<motion\.div\s*key=\{slide.id\}\s*className="absolute inset-0 bg-cover bg-center"/g, '<motion.div key={slide.id} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${slide.image})` }}');

fs.writeFileSync('src/components/HeroSection.tsx', code);
