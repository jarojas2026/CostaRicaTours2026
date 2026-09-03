const fs = require('fs');

// 1. Update index.html fonts
let indexHtml = fs.readFileSync('index.html', 'utf8');
indexHtml = indexHtml.replace(
  /<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Outfit.*?rel="stylesheet" \/>/,
  '<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=Work+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />'
);
fs.writeFileSync('index.html', indexHtml);

// 2. Update index.css
let css = fs.readFileSync('src/index.css', 'utf8');
css = css.replace(/--font-heading: 'Outfit', sans-serif;/g, "--font-heading: 'Fraunces', serif;");
css = css.replace(/--font-body: 'Plus Jakarta Sans', sans-serif;/g, "--font-body: 'Work Sans', sans-serif;");
css = css.replace(/--verde-selva: #1E7B4A;/g, "--verde-selva: #1E4D2B; /* Dosel — verde profundo de selva */");
css = css.replace(/--azul-oceano: #0B668F;/g, "--azul-oceano: #0F8B8D; /* Caribe — turquesa de costa caribeña */");
css = css.replace(/--naranja-atardecer: #E67E22;/g, "--naranja-atardecer: #E8A33D; /* Guanacaste — dorado de atardecer, uso exclusivo para CTAs */\n    --basalto: #2B2622; /* Roca volcánica — solo para secciones hero oscuras */");
css = css.replace(/--gris-oscuro: #2C3330;/g, "--gris-oscuro: #1A1815; /* Texto — casi negro cálido, nunca negro puro */");
css = css.replace(/--gris-claro: #F4F7F5;/g, "--gris-claro: #EDE6D9; /* Arena tostada — fondo cálido, no blanco/gris frío */");

css = css.replace(/color: #2C3330;/g, "color: #1A1815;");
css = css.replace(/font-family: 'Plus Jakarta Sans', sans-serif;/g, "font-family: 'Work Sans', sans-serif;");
css = css.replace(/font-family: 'Outfit', sans-serif;/g, "font-family: 'Fraunces', serif;");

css = css.replace(/border: 1px solid rgba\(30, 123, 74, 0\.15\);/g, "border: 1px solid rgba(30, 77, 43, 0.15);");
css = css.replace(/box-shadow: 0 8px 32px 0 rgba\(30, 123, 74, 0\.08\);/g, "box-shadow: 0 8px 32px 0 rgba(30, 77, 43, 0.08);");

css = css.replace(/background: #F4F7F5;/g, "background: #EDE6D9;");
css = css.replace(/border: 1px solid rgba\(11, 102, 143, 0\.15\);/g, "border: 1px solid rgba(15, 139, 141, 0.15);");

css = css.replace(/rgba\(230, 126, 34, 0\.4\)/g, "rgba(232, 163, 61, 0.4)");
css = css.replace(/rgba\(30, 123, 74, 0\.3\)/g, "rgba(30, 77, 43, 0.3)");

fs.writeFileSync('src/index.css', css);

