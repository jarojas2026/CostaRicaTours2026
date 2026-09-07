const fs = require('fs');
let code = fs.readFileSync('src/lib/apiManager.ts', 'utf8');
code = code.replace(/const ENV = \(import\.meta\.env && import\.meta\.env\.MODE\) \|\| 'development';/g, "const ENV = 'development';");
fs.writeFileSync('src/lib/apiManager.ts', code);
