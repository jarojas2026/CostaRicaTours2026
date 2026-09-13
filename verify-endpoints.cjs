const fs = require('fs');

const blueprint = fs.readFileSync('src/data/n8nWorkflowsBlueprint.ts', 'utf8');
const server = fs.readFileSync('server.ts', 'utf8');
const studio = fs.readFileSync('src/components/N8NWorkflowStudio.tsx', 'utf8');

const webhookRegex = /\/webhook\/[a-zA-Z0-9_-]+/g;

const getMatches = (text) => {
  const matches = new Set();
  let match;
  while ((match = webhookRegex.exec(text)) !== null) {
    matches.add(match[0]);
  }
  return Array.from(matches);
};

const blueprintHooks = getMatches(blueprint);
const studioHooks = getMatches(studio);

const allRequired = new Set([...blueprintHooks, ...studioHooks]);
const serverHooks = new Set(getMatches(server));

const missing = [];
allRequired.forEach(hook => {
  if (!serverHooks.has(hook)) {
    missing.push(hook);
  }
});

console.log("Missing Webhooks in server.ts:");
missing.forEach(m => console.log(m));
