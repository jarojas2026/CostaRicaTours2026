const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Remove import from the middle
content = content.replace("import Stripe from 'stripe';", "");

// Add to the top
const importStatement = 'import Stripe from "stripe";\n';
content = importStatement + content;

fs.writeFileSync('server.ts', content);
