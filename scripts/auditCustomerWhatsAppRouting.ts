import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['src'];
const BUSINESS_WHATSAPP = 'wa.me/50687959148';
const WA_PATTERN = /https?:\/\/wa\.me\/([^?\s"'`}]+)/gi;

// Admin-only operational surfaces may expose explicit human/provider controls.
// This audit protects customer-facing routing and must not confuse the
// provider/admin control plane with a public traveler handoff.
const ADMIN_ONLY_FILES = new Set([
  path.normalize('src/components/ProviderCommunicationHub.tsx')
]);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [full] : [];
  });
}

const files = ROOTS.flatMap(walk);
const customerFiles = files.filter(file => !ADMIN_ONLY_FILES.has(path.normalize(file)));
const violations: string[] = [];

for (const file of customerFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const matches = [...source.matchAll(WA_PATTERN)];
  for (const match of matches) {
    if (match[0].toLowerCase().includes(BUSINESS_WHATSAPP)) continue;
    violations.push(`${file}: non-business WhatsApp destination ${match[0]}`);
  }

  // A customer-facing JS action must not jump straight to WhatsApp. Anchors
  // to the official business endpoint may remain as explicit human handoff,
  // but programmatic navigation bypasses the AI intake/orchestration layer.
  if (/window\.(open|location)[^\n]*wa\.me/i.test(source)) {
    violations.push(`${file}: direct JavaScript WhatsApp navigation`);
  }
}

if (violations.length) {
  console.error('Customer WhatsApp routing audit failed:', violations.join('\n'));
  process.exit(1);
}

console.log(`Customer WhatsApp routing audit passed: ${customerFiles.length} customer-facing source files scanned (${files.length - customerFiles.length} admin-only excluded).`);
