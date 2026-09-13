const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Add import
const importCron = "import { initializeAutomationEngine } from './backend/cronEngine';\n";
content = content.replace("import { google } from 'googleapis';", importCron + "import { google } from 'googleapis';");

// Add initialization
content = content.replace("console.log(`⚡ Backend n8n listo con triggers salientes y webhooks entrantes.`);", "console.log(`⚡ Backend n8n listo con triggers salientes y webhooks entrantes.`);\n    initializeAutomationEngine();");

fs.writeFileSync('server.ts', content);
