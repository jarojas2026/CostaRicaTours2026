const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');
// Check if formatCurrency is properly exported
if (appCode.includes('const formatCurrency = ')) {
  appCode = appCode.replace(/const formatCurrency = /g, 'export const formatCurrency = ');
  fs.writeFileSync('src/App.tsx', appCode);
}
