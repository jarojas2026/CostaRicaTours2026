import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('customer-facing generative counter prompt never invents support identity or cancellation promises', () => {
  const source = readFileSync('backend/aiAssistantService.ts', 'utf8');
  const start = source.indexOf('const counterSystemInstruction =');
  const end = source.indexOf("const aiResponse = await guardedGeminiGenerate('counter_desk'", start);
  assert.ok(start > -1 && end > start);
  const promptSource = source.slice(start, end);
  assert.doesNotMatch(promptSource, /Sofía|info@costaricatours\.es|Alsama Tours|100% de reembolso garantizado|\$260 USD|\$170 USD/);
  assert.match(promptSource, /Nunca inventes cupos/);
  assert.match(promptSource, /No prometas porcentajes fijos/);
  assert.match(promptSource, /El 911 es exclusivamente para emergencias/);
});

test('conversation history no longer impersonates a named agent', () => {
  const source = readFileSync('backend/aiAssistantService.ts', 'utf8');
  assert.match(source, /h\.role === 'user' \? 'Viajero' : 'Asistente'/);
});

test('sin marca vieja (Sofía / costaricatours.es) en código de cliente y backend fuera de archivos calientes', async () => {
  const { readdirSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');
  // src/App.tsx es archivo caliente de otro carril: se limpia en su propia PR.
  const skip = new Set(['src/App.tsx', 'src/i18n/detect.ts']);
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx|html)$/.test(f) ? [p] : [];
  });
  const offenders = [...walk('src'), ...walk('backend'), 'public/counter-widget.html']
    .filter((p) => !skip.has(p.replace(/\\/g, '/')))
    .filter((p) => /Sof[ií]a|ソフィア|costaricatours\.es/.test(readFileSync(p, 'utf8')));
  assert.deepEqual(offenders, []);
});
