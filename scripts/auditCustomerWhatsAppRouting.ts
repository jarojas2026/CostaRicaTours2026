import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['src'];
const BUSINESS_WHATSAPP = 'wa.me/50687959148';

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [full] : [];
  });
}

const files = ROOTS.flatMap(walk);
const violations: string[] = [];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes(BUSINESS_WHATSAPP)) continue;
  const hasGlobalGatewayMarker = source.includes('data-human-handoff') || source.includes('requestCustomerIntake') || file.endsWith('App.tsx');
  if (!hasGlobalGatewayMarker && source.includes('href') && source.includes(BUSINESS_WHATSAPP)) {
    violations.push(file);
  }
}

if (violations.length) {
  console.error('Customer WhatsApp routing audit failed:', violations.join('\n'));
  process.exit(1);
}

console.log(`Customer WhatsApp routing audit passed: ${files.length} source files scanned.`);
