const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

// Switch body backgrounds
css = css.replace(/--app-stone-950: #1B4965;/g, "--app-stone-950: #FFFFFF;");
css = css.replace(/--app-stone-900: #22577A;/g, "--app-stone-900: #F8FAFC;");
css = css.replace(/--app-stone-850: #2C688F;/g, "--app-stone-850: #F1F5F9;");
css = css.replace(/--app-stone-800: #387CA8;/g, "--app-stone-800: #E2E8F0;");
css = css.replace(/--app-stone-700: #4B94C2;/g, "--app-stone-700: #CBD5E1;");

css = css.replace(/color: #F8FAFC;/g, "color: #1E293B;");

// Now we need to flip the text colors by overriding them in @theme
// In Tailwind v4, we can define `--color-stone-200: #1e293b;` in @theme to map it to dark slate.
const themeInjections = `
  --color-stone-100: #0f172a;
  --color-stone-200: #1e293b;
  --color-stone-300: #334155;
  --color-stone-400: #475569;
  --color-neutral-100: #0f172a;
  --color-neutral-200: #1e293b;
  --color-neutral-300: #334155;
  --color-neutral-400: #475569;
  
  --color-white: #ffffff; /* keep real white */
`;

css = css.replace(/@theme \{/, "@theme {" + themeInjections);

fs.writeFileSync('src/index.css', css);
console.log("Light theme applied via CSS variables!");
