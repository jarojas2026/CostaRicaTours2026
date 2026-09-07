const fs = require('fs');

const file = 'src/lib/apiManager.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const ENV = 'development';/g, "const ENV = import.meta.env?.MODE || 'development';");

fs.writeFileSync(file, code);
