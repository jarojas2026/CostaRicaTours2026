const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// We need to remove the duplicate Currency and Language selectors blocks in the header right actions.
// Let's find the exact block or rewrite that section cleanly.

// Let's inspect where the first block ends and second begins.
// The block structure is:
// 1. Currency selector
// 2. Language selector
// 3. (Duplicate) Currency selector
// 4. (Duplicate) Language selector

// Let's use a script to clean up duplicate sibling blocks inside `div className="flex items-center gap-1.5 sm:gap-2 shrink-0"`

// Let's check how many times "Seleccionar Moneda / Currency" appears
const matches = code.match(/Seleccionar Moneda \/ Currency/g);
console.log('Matches found:', matches ? matches.length : 0);

