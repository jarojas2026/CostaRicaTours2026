const fs = require('fs');
let content = fs.readFileSync('src/data/n8nWorkflowsBlueprint.ts', 'utf8');

// Fix the corrupted lines
content = content.replace(/\]\] \} \},/g, ']] },');
content = content.replace(/\]\] \}\} ,/g, ']] },');
content = content.replace(/\s*\}\s*\}\s*\}\s*\},/g, '\n      }\n    }\n  },');

fs.writeFileSync('src/data/n8nWorkflowsBlueprint.ts', content);
