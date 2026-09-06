const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(/admin\.credential\.cert/g, '((admin as any).credential.cert)');
fs.writeFileSync('server.ts', server);
console.log("Fixed credential type error");
