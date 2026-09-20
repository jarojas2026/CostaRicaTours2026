import fs from 'node:fs';
import path from 'node:path';

const roots = ['backend', 'server.ts', 'src/App.tsx', 'src/components', 'src/pages', 'mcp.json', 'n8n-mcp-config.json'];
const banned = [
  /ADMIN_MOCK_TOKEN/i,
  /mock_paypal_id/i,
  /GEMINI_API_KEY\s*\|\|\s*['"]mock/i,
  /cliente@example\.com/i,
  /gabw33d@gmail\.com/i,
  /david\.morales@/i,
  /\+506\s*0000-0000/i,
  /Bearer\s+eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/i,
  /N8N_MCP_TOKEN\s*[:=]\s*['\"]eyJ/i,
  /\bViviana\b/i
];
const ignored = new Set(['node_modules', '.git', 'dist', 'build']);
const selfPath = path.normalize('scripts/securityFixtureAudit.mjs');

function walk(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target, { withFileTypes: true })
    .filter(entry => !ignored.has(entry.name))
    .flatMap(entry => walk(path.join(target, entry.name)));
}

const files = roots.flatMap(root => fs.existsSync(root) ? walk(root) : []);
const findings = [];
for (const file of files) {
  if (path.normalize(file) === selfPath) continue;
  if (!/\.(ts|tsx|js|mjs|json|yml|yaml|env)$/.test(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const pattern of banned) {
    if (pattern.test(content)) findings.push({ file, pattern: pattern.source });
  }
}
if (findings.length) {
  console.error('Security fixture audit failed:', JSON.stringify(findings, null, 2));
  process.exit(1);
}
console.log('Security fixture audit passed.');
