import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('Anthropic Vertex client keeps OpenTelemetry tracing off by default (vertex-sdk >= 0.21)', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'backend/claudeService.ts'), 'utf8');
  const guard = src.indexOf("process.env.ANTHROPIC_OPEN_TELEMETRY = 'false'");
  const client = src.indexOf('new AnthropicVertex(');
  assert.ok(guard > 0, 'falta el default seguro ANTHROPIC_OPEN_TELEMETRY=false');
  assert.ok(guard < client, 'el default debe fijarse antes de crear el cliente');
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  // 0.21+ trae tracing OpenTelemetry nativo; el default seguro aplica a esas versiones.
  assert.match(pkg.dependencies['@anthropic-ai/vertex-sdk'], /^\^?0\.(2[1-9]|[3-9]\d)\./);
});
