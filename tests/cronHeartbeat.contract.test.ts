import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  CRON_JOBS, HEARTBEAT_THROTTLE_MS, __resetCronHeartbeatsForTests, cronJobHealth, getCronHeartbeatEvidence,
  runTrackedCronJob, sanitizeHeartbeatError, withDistributedAutomationLock,
} from '../backend/cronEngine';
import { logAutomationExecution } from '../backend/nativeAutomationEngine';

const engine = readFileSync('backend/cronEngine.ts', 'utf8');

test('todos los jobs de initializeAutomationEngine pasan por scheduleTracked y están en CRON_JOBS', () => {
  const body = engine.slice(engine.indexOf('export function initializeAutomationEngine'));
  assert.doesNotMatch(body, /cron\.schedule\(/, 'ningún cron sin heartbeat');
  const scheduled = [...body.matchAll(/scheduleTracked\('([^']+)', '([^']+)'/g)].map(m => [m[1], m[2]]);
  assert.equal(scheduled.length, CRON_JOBS.length);
  for (const [id, expr] of scheduled) assert.equal(CRON_JOBS.find(j => j.id === id)?.schedule, expr, id);
});

test('estado real: éxito, aviso vía logAutomationExecution, error lanzado y saneado', async () => {
  __resetCronHeartbeatsForTests();
  let t = 1_000_000;
  const clock = () => (t += 50);
  const ok = await runTrackedCronJob('daily-report-8pm', async () => undefined, clock);
  assert.equal(ok!.lastStatus, 'success');
  assert.equal(ok!.lastDurationMs, 50);
  const warn = await runTrackedCronJob('weather-watch-4h', async () => { logAutomationExecution('CRON_CLIMA_4H', 0, 'warning', 'parcial'); }, clock);
  assert.equal(warn!.lastStatus, 'warning');
  const err = await runTrackedCronJob('vip-loyalty-10am', async () => { throw new Error('fallo para ana@example.com +506 8888 7777'); }, clock);
  assert.equal(err!.lastStatus, 'error');
  assert.doesNotMatch(err!.lastError!, /ana@example|8888/);
  const logged = await runTrackedCronJob('presale-recovery-1h', async () => { logAutomationExecution('CRON_RECUPERACION_PREVENTA_1H', 0, 'error', 'Fallo: x'); }, clock);
  assert.equal(logged!.lastStatus, 'error', 'los crons que capturan su error lo informan vía logAutomationExecution');
});

test('lock ocupado → skipped (no éxito inventado)', async () => {
  __resetCronHeartbeatsForTests();
  // Sin Firestore el lock ejecuta directamente; simulamos el aviso del lock ocupado.
  const { noteAutomationOutcome } = await import('../backend/nativeAutomationEngine');
  const hb = await runTrackedCronJob('daily-report-8pm', async () => { noteAutomationOutcome('skipped', 'lock'); return null; });
  assert.equal(hb!.lastStatus, 'skipped');
  assert.equal(typeof withDistributedAutomationLock, 'function');
});

test('cuota $0: jobs de cada minuto escriben máx. cada 15 min salvo cambio de estado', async () => {
  __resetCronHeartbeatsForTests();
  let t = 10_000_000;
  const clock = () => t;
  assert.ok(await runTrackedCronJob('provider-inbox-1m', async () => undefined, clock), 'primera escritura');
  t += 60_000;
  assert.equal(await runTrackedCronJob('provider-inbox-1m', async () => undefined, clock), null, 'throttled');
  t += 60_000;
  assert.ok(await runTrackedCronJob('provider-inbox-1m', async () => { throw new Error('x'); }, clock), 'cambio de estado se escribe');
  t += 60_000;
  assert.equal(await runTrackedCronJob('provider-inbox-1m', async () => { throw new Error('x'); }, clock), null);
  t += HEARTBEAT_THROTTLE_MS;
  assert.ok(await runTrackedCronJob('provider-inbox-1m', async () => { throw new Error('x'); }, clock), 'heartbeat tras 15 min');
  t += 60_000;
  assert.ok(await runTrackedCronJob('daily-report-8pm', async () => undefined, clock));
  assert.ok(await runTrackedCronJob('daily-report-8pm', async () => undefined, clock), 'baja frecuencia siempre escribe');
});

test('salud: atrasado / fallido / sin señal y alertas en el snapshot', async () => {
  const daily = CRON_JOBS.find(j => j.id === 'daily-report-8pm')!;
  const minute = CRON_JOBS.find(j => j.id === 'provider-inbox-1m')!;
  const now = Date.parse('2026-10-20T18:00:00.000Z');
  assert.equal(cronJobHealth(daily, null, now), 'no_signal');
  assert.equal(cronJobHealth(daily, { lastStatus: 'success', lastFinishedAt: new Date(now - 23 * 3600_000).toISOString() }, now), 'ok');
  assert.equal(cronJobHealth(daily, { lastStatus: 'success', lastFinishedAt: new Date(now - 31 * 3600_000).toISOString() }, now), 'overdue');
  assert.equal(cronJobHealth(minute, { lastStatus: 'success', lastFinishedAt: new Date(now - 16 * 60_000).toISOString() }, now), 'ok', 'margen cubre el throttle');
  assert.equal(cronJobHealth(minute, { lastStatus: 'success', lastFinishedAt: new Date(now - 30 * 60_000).toISOString() }, now), 'overdue');
  assert.equal(cronJobHealth(minute, { lastStatus: 'error', lastFinishedAt: new Date(now - 60_000).toISOString() }, now), 'failed');

  __resetCronHeartbeatsForTests();
  let empty = await getCronHeartbeatEvidence(new Date(now));
  assert.equal(empty.state, 'unavailable');
  assert.equal(empty.value!.counts.noSignal, CRON_JOBS.length);
  let t = now - 40 * 60_000;
  await runTrackedCronJob('provider-inbox-1m', async () => undefined, () => t);
  t = now - 60_000;
  await runTrackedCronJob('vip-loyalty-10am', async () => { throw new Error('boom'); }, () => t);
  const ev = await getCronHeartbeatEvidence(new Date(now));
  assert.equal(ev.state, 'partial');
  assert.deepEqual(ev.value!.alerts.map(a => [a.jobId, a.kind]).sort(), [['provider-inbox-1m', 'atrasado'], ['vip-loyalty-10am', 'fallido']]);
  assert.equal(sanitizeHeartbeatError('token ' + 'a'.repeat(40)), 'token [token]');
});
