import assert from 'node:assert/strict';
import test from 'node:test';
import { runCli } from '../scripts/internal/seed-internal-to-firestore';

test('seed CLI: cierra Firestore y sale con 0 tras el resumen', async () => {
  const calls: string[] = [];
  const code = await runCli(async () => { calls.push('run'); }, {
    getDb: async () => ({ terminate: async () => { calls.push('terminate'); } }),
    exit: (c) => calls.push(`exit:${c}`),
  });
  assert.equal(code, 0);
  assert.deepEqual(calls, ['run', 'terminate', 'exit:0']);
});

test('seed CLI: ante error sale con 1 y aun así cierra Firestore', async () => {
  const calls: string[] = [];
  const code = await runCli(async () => { throw new Error('sin ADC'); }, {
    getDb: async () => ({ terminate: async () => { calls.push('terminate'); } }),
    exit: (c) => calls.push(`exit:${c}`),
    log: () => {},
  });
  assert.equal(code, 1);
  assert.deepEqual(calls, ['terminate', 'exit:1']);
});

test('seed CLI: si terminate() se cuelga, sale igual tras el tope', async () => {
  const calls: string[] = [];
  const code = await runCli(async () => {}, {
    getDb: async () => ({ terminate: () => new Promise(() => {}) }),
    exit: (c) => calls.push(`exit:${c}`),
    terminateTimeoutMs: 20,
  });
  assert.equal(code, 0);
  assert.deepEqual(calls, ['exit:0']);
});
