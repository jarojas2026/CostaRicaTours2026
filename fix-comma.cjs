const fs = require('fs');
let content = fs.readFileSync('src/data/n8nWorkflowsBlueprint.ts', 'utf8');

// Match `]] \s* "[ERROR HANDLER]` and fix it to `]] } },\n        "[ERROR HANDLER]`
// Or `]] } \s* "[ERROR HANDLER]` -> `]] } },\n`
// Actually, let's just make a very permissive regex:
content = content.replace(/\]\]\s*(?:\}\s*)?"\[ERROR HANDLER\] Catch Workflow Exceptions":/g, ']] } },\n        "[ERROR HANDLER] Catch Workflow Exceptions":');
fs.writeFileSync('src/data/n8nWorkflowsBlueprint.ts', content);
