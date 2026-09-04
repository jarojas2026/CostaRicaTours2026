const fs = require('fs');
let env = fs.readFileSync('.env.example', 'utf8');

// Ensure they exist
if (!env.includes('PAYPAL_CLIENT_ID')) env += '\nPAYPAL_CLIENT_ID=';
if (!env.includes('PAYPAL_SECRET')) env += '\nPAYPAL_SECRET=';
if (!env.includes('PAYPAL_MODE')) env += '\nPAYPAL_MODE=sandbox';
if (!env.includes('STRIPE_SECRET_KEY')) env += '\nSTRIPE_SECRET_KEY=';

// Remove the '-e ' typo if it exists
env = env.replace('-e # Google Maps Configuration', '# Google Maps Configuration');

fs.writeFileSync('.env.example', env);
console.log(".env.example updated");
