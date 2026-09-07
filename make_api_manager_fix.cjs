const fs = require('fs');
let code = fs.readFileSync('src/lib/apiManager.ts', 'utf8');
code = code.replace(/const ENV = 'development'; \/\/ 'development' | 'production' | 'staging'/g, "const ENV = (import.meta.env && import.meta.env.MODE) || 'development';");
fs.writeFileSync('src/lib/apiManager.ts', code);
