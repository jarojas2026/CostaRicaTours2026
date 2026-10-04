import assert from 'node:assert/strict';
import test from 'node:test';
import { installViteChunkRecovery, type ChunkRecoveryEnvironment } from '../src/utils/viteChunkRecovery';

function createHarness(options: { failStorage?: boolean } = {}) {
  const values = new Map<string, string>();
  let handler: EventListener | undefined;
  let reloads = 0;
  const environment: ChunkRecoveryEnvironment = {
    addEventListener: (_type, listener) => { handler = listener; },
    location: { pathname: '/trip', reload: () => { reloads += 1; } },
    sessionStorage: {
      getItem: key => {
        if (options.failStorage) throw new Error('storage unavailable');
        return values.get(key) ?? null;
      },
      setItem: (key, value) => {
        if (options.failStorage) throw new Error('storage unavailable');
        values.set(key, value);
      }
    }
  };
  installViteChunkRecovery(environment);

  return {
    fire: (assetUrl: string) => {
      const event = new Event('vite:preloadError', { cancelable: true }) as Event & { payload?: unknown };
      event.payload = new Error(`Failed to fetch dynamically imported module: ${assetUrl}`);
      handler?.(event);
      return event;
    },
    get reloads() { return reloads; }
  };
}

test('a stale Vite chunk gets one automatic reload', () => {
  const harness = createHarness();

  const firstAttempt = harness.fire('https://example.test/assets/TravelerOSPage-oldhash.js');

  assert.equal(firstAttempt.defaultPrevented, true);
  assert.equal(harness.reloads, 1);
});

test('the same missing chunk does not cause an automatic reload loop', () => {
  const harness = createHarness();
  harness.fire('https://example.test/assets/TravelerOSPage-oldhash.js');

  const repeatedAttempt = harness.fire('https://example.test/assets/TravelerOSPage-oldhash.js');

  assert.equal(repeatedAttempt.defaultPrevented, false);
  assert.equal(harness.reloads, 1);
});

test('a different versioned chunk can receive its own recovery attempt', () => {
  const harness = createHarness();
  harness.fire('https://example.test/assets/TravelerOSPage-oldhash.js');

  const newChunkAttempt = harness.fire('https://example.test/assets/TravelerOSPage-newhash.js');

  assert.equal(newChunkAttempt.defaultPrevented, true);
  assert.equal(harness.reloads, 2);
});

test('unavailable session storage falls back to the error boundary instead of reloading repeatedly', () => {
  const harness = createHarness({ failStorage: true });

  const event = harness.fire('https://example.test/assets/TravelerOSPage-oldhash.js');

  assert.equal(event.defaultPrevented, false);
  assert.equal(harness.reloads, 0);
});
