import fs from 'node:fs';
import path from 'node:path';

const roots = ['backend', 'server.ts', 'src', 'scripts'];
const banned = [
  /ADMIN_MOCK_TOKEN/i,
  /mock_paypal_id/i,
  /GEMINI_API_KEY\s*\|\|\s*['"]mock/i,
  /cliente@example\.com/i,
  /gabw33d@gmail\.com/i,
  /operaciones@costaricatours\.es/i,
  /david\.morales@/i,
  /\+506\s*0000-0000/i,
  /\bViviana\b/i
];
const ignored = new Set(['node_modules', '.git', 'dist', 'build']);

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
