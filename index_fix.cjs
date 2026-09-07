const fs = require('fs');

let cssCode = fs.readFileSync('src/index.css', 'utf8');

// Replace the fallback colors in the :root section
cssCode = cssCode.replace(/--app-stone-950: #FFFFFF;/g, '--app-stone-950: #1D3557;');
cssCode = cssCode.replace(/--app-stone-900: #F8FAFC;/g, '--app-stone-900: #25446E;');
cssCode = cssCode.replace(/--app-stone-850: #F1F5F9;/g, '--app-stone-850: #2E5487;');
cssCode = cssCode.replace(/--app-stone-800: #E2E8F0;/g, '--app-stone-800: #3965A1;');
cssCode = cssCode.replace(/--app-stone-700: #CBD5E1;/g, '--app-stone-700: #4E7BB8;');

// Also make sure they are applied to body
cssCode = cssCode.replace(/background-color: var\(--app-stone-950, #1D3557\);/g, 'background-color: var(--app-stone-950);');
cssCode = cssCode.replace(/color: #1E293B;/g, 'color: #F8FAFC;'); // Costa rica body text should be white on dark bg?
// Actually if the body bg is dark (#1D3557), text must be light!

fs.writeFileSync('src/index.css', cssCode);
