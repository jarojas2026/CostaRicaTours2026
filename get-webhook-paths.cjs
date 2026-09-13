const fs = require('fs');
const blueprint = fs.readFileSync('src/data/n8nWorkflowsBlueprint.ts', 'utf8');
const regex = /path:\s*['"]([^'"]+)['"]/g;
let match;
const paths = [];
while ((match = regex.exec(blueprint)) !== null) {
  paths.push(match[1]);
}
console.log(paths);
