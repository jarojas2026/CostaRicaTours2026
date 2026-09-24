import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['src'];
const BUSINESS_WHATSAPP = 'wa.me/50687959148';
const WA_PATTERN = /https?:\/\/wa\.me\/([^?\s"'`}]+)/gi;

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
  const matches = [...source.matchAll(WA_PATTERN)];
  for (const match of matches) {
    if (match[0].toLowerCase().includes(BUSINESS_WHATSAPP)) continue;
    violations.push(`${file}: non-business WhatsApp destination ${match[0]}`);
  }
  if (/window\.(open|location)[^\n]*wa\.me/i.test(source)) {
    violations.push(`${file}: direct JavaScript WhatsApp navigation`);
  }
}

if (violations.length) {
  console.error('Customer WhatsApp routing audit failed:', violations.join('\n'));
  process.exit(1);
}

console.log(`Customer WhatsApp routing audit passed: ${files.length} source files scanned.`);
