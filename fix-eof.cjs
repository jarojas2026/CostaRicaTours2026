const fs = require('fs');
let content = fs.readFileSync('src/data/n8nWorkflowsBlueprint.ts', 'utf8');
content = content.replace(/\s*\}\s*\}\s*\}\s*\}\s*\];/g, '\n      }\n    }\n  }\n];');
fs.writeFileSync('src/data/n8nWorkflowsBlueprint.ts', content);
