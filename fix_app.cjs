const fs = require('fs');

let code = fs.readFileSync('src/components/HeroSection.tsx', 'utf8');
code = code.replace(/<span className="text-xl sm:text-2xl font-black text-orange-400">\{formatCurrency\(parseInt\(slide\.price\) \|\| 0, currency\)\}<\/span>/g, '<span className="text-xl sm:text-2xl font-black text-orange-400">{formatCurrency(parseInt(slide.price) || 0, currency)}</span>');
// Ah wait, `currency` is not defined in HeroSection scope because it wasn't added to props properly? Let's check.
