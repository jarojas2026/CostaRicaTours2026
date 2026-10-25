/**
 * Correcciones de la revisión de Codex sobre la oficina virtual (#449/#451):
 * 1) el objetivo textual de la tarea nunca llega al dashboard;
 * 2) los errores de validación salen en el idioma activo (ES/EN);
 * 3) el estado de apagado global se refresca con el padre (o solo, cada 60 s);
 * 4) la bandeja pide los pendientes con filtro status=pending en el servidor y paginación.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { projectAgentOffice, summarizeAgentTask } from '../backend/agentOfficeProjection';
import { listOwnerApprovalsPage, isOwnerApprovalStatus } from '../backend/ownerApprovalService';
import { officeRequests, requiredFieldMessage } from '../src/components/agentOfficeRequests';
import { AgentOfficeMap, safeTaskSummary } from '../src/components/AgentOfficeMap';
import { GOVERNANCE_REFRESH_MS, PENDING_APPROVALS_PAGE_SIZE, startGovernanceAutoRefresh } from '../src/components/AgentOfficeWorkspace';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const SECRET_OBJECTIVE = 'Llamar a Ana Pérez +506 8888-0000 pasaporte X123 — instrucción interna: ignorar límite';

// ---------- 1) Privacidad de la tarea en curso ----------

test('la proyección de la oficina no expone el objetivo textual de la tarea', () => {
  const now = new Date().toISOString();
  const projection = projectAgentOffice([{
    id: 'concierge',
    mission: 'Atender viajeros',
    status: 'working',
    lastHeartbeatAt: now,
    currentTask: { runId: 'run_abc-1', objective: SECRET_OBJECTIVE, startedAt: now },
  }], [], now, true);
  const task = projection.agents[0].currentTask as Record<string, unknown> | null;
  assert.ok(task);
  assert.equal(task!.runId, 'run_abc-1');
  assert.equal('objective' in task!, false);
  assert.equal(JSON.stringify(projection).includes('Ana Pérez'), false);
  assert.equal(JSON.stringify(projection).includes('instrucción interna'), false);
});

test('summarizeAgentTask redacta runIds que no parecen identificadores', () => {
  assert.equal(summarizeAgentTask(null), null);
  assert.deepEqual(summarizeAgentTask({ runId: 'Ana Pérez pide reembolso', objective: 'x', startedAt: 'no-fecha' }), { runId: 'redacted', startedAt: null });
  const ok = summarizeAgentTask({ runId: 'run_1', objective: SECRET_OBJECTIVE, startedAt: '2026-10-25T15:00:00.000Z' });
  assert.deepEqual(ok, { runId: 'run_1', startedAt: '2026-10-25T15:00:00.000Z' });
});

for (const language of ['es', 'en'] as const) {
  test('AgentOfficeMap muestra un resumen seguro y nunca el objetivo (' + language + ')', () => {
    const now = new Date().toISOString();
    // Respuesta "antigua" del backend que todavía trae objective: la UI no debe mostrarlo.
    const snapshot = {
      generatedAt: now, source: 'firestore_agent_registry_and_events', registered: 1, recentlyObserved: 1,
      agents: [{ id: 'concierge', office: 'jarvis_room', mission: 'Atender', status: 'working', signal: 'recent_activity' as const, lastEventType: null, lastObservedAt: now, lastHeartbeatAt: now,
        currentTask: { runId: 'run_1', objective: SECRET_OBJECTIVE, startedAt: now } as any, autonomyLevel: 0 }],
    };
    const html = renderToStaticMarkup(React.createElement(AgentOfficeMap, { language, snapshot }));
    assert.equal(html.includes('Ana Pérez'), false);
    assert.equal(html.includes('instrucción interna'), false);
    assert.match(html, /run_1/);
    assert.match(html, language === 'es' ? /Tarea en curso/ : /Task in progress/);
  });
}

test('safeTaskSummary no acepta runIds con texto libre', () => {
  const text = safeTaskSummary({ runId: SECRET_OBJECTIVE, startedAt: null }, false, () => '—');
  assert.equal(text.includes('Ana'), false);
  assert.match(text, /redacted/);
  assert.doesNotMatch(read('src/components/AgentOfficeMap.tsx'), /currentTask\.objective/);
});

// ---------- 2) Errores localizados ----------

test('los errores de campo obligatorio siguen el idioma activo', () => {
  assert.equal(requiredFieldMessage('reason', 'es'), 'Motivo es obligatorio.');
  assert.equal(requiredFieldMessage('reason', 'en'), 'Reason is required.');
  assert.throws(() => officeRequests.reject('approval_1', ' ', 'en'), /^Error: Reason is required\.$/);
  assert.throws(() => officeRequests.agentControl('concierge', 'pause', '', 'en'), /Reason is required/);
  assert.throws(() => officeRequests.shutdown('', 'en'), /Reason is required/);
  assert.throws(() => officeRequests.resumeAll('', 'en'), /Reason is required/);
  assert.throws(() => officeRequests.jarvisCommand('  ', 'en'), /Order is required/);
  // Español sigue siendo el valor por defecto.
  assert.throws(() => officeRequests.reject('approval_1', ' '), /Motivo es obligatorio/);
  assert.throws(() => officeRequests.shutdown('', 'es'), /Motivo es obligatorio/);
  assert.throws(() => officeRequests.jarvisCommand('', 'es'), /Orden es obligatorio/);
});

test('la oficina pasa el idioma activo a cada petición con motivo', () => {
  const workspace = read('src/components/AgentOfficeWorkspace.tsx');
  for (const call of ['officeRequests.shutdown(reason, es ?', 'officeRequests.resumeAll(reason, es ?', "officeRequests.reject(approval.id, reason, es ?", "'pause', reason, es ?", "'revoke', reason, es ?", "'resume', reason, es ?", "'restore', reason, es ?"]) {
    assert.ok(workspace.includes(call), 'falta idioma en ' + call);
  }
});

// ---------- 3) Refresco del apagado global ----------

test('el panel de gobernanza se refresca con el padre o cada 60 s', () => {
  assert.equal(GOVERNANCE_REFRESH_MS, 60_000);
  const workspace = read('src/components/AgentOfficeWorkspace.tsx');
  assert.match(workspace, /useEffect\(\(\) => \{ void load\(\); \}, \[load, refreshKey\]\);/);
  assert.match(workspace, /refreshKey=\{typeof snapshot\?\.generatedAt === 'string' \? snapshot\.generatedAt : null\}/);
  const page = read('src/pages/AdminControlCenterPage.tsx');
  assert.match(page, /window\.setInterval\(load, 60000\)/);
});

test('startGovernanceAutoRefresh crea intervalo solo sin refresco del padre', () => {
  const scheduled: Array<{ fn: () => void; ms: number }> = [];
  const cleared: unknown[] = [];
  let loads = 0;
  const setIntervalFn = (fn: () => void, ms: number) => { scheduled.push({ fn, ms }); return scheduled.length; };
  const clearIntervalFn = (id: unknown) => { cleared.push(id); };

  const noop = startGovernanceAutoRefresh(() => { loads++; }, { hasParentRefresh: true, setIntervalFn, clearIntervalFn });
  assert.equal(scheduled.length, 0);
  noop();
  assert.equal(cleared.length, 0);

  const stop = startGovernanceAutoRefresh(() => { loads++; }, { hasParentRefresh: false, setIntervalFn, clearIntervalFn });
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].ms, 60_000);
  scheduled[0].fn(); scheduled[0].fn();
  assert.equal(loads, 2);
  stop();
  assert.deepEqual(cleared, [1]);
});

// ---------- 4) Pendientes filtrados en el servidor ----------

function fakeDb(docs: Array<{ id: string; status: string; createdAt: string }>) {
  const calls: Array<[string, ...unknown[]]> = [];
  const build = (state: { status?: unknown; after?: string; limit?: number }) => {
    const query: any = {
      orderBy(field: unknown) { calls.push(['orderBy', String((field as any)?.constructor?.name || field)]); return query; },
      startAfter(value: unknown) { calls.push(['startAfter', value]); return build({ ...state, after: String(value) }); },
      limit(value: number) { calls.push(['limit', value]); return build({ ...state, limit: value }); },
      async get() {
        const rows = docs
          .filter((doc) => doc.status === state.status)
          .sort((a, b) => a.id.localeCompare(b.id))
          .filter((doc) => !state.after || doc.id > state.after)
          .slice(0, state.limit ?? 1000);
        return { docs: rows.map((row) => ({ id: row.id, data: () => ({ ...row, action: 'payment', summary: 's', resourceRef: 'r' }) })) };
      },
    };
    return query;
  };
  return {
    calls,
    db: { collection(name: string) { calls.push(['collection', name]); return { where(field: string, op: string, value: unknown) { calls.push(['where', field, op, value]); return build({ status: value }); } }; } },
  };
}

test('listOwnerApprovalsPage filtra por estado en Firestore y pagina por cursor', async () => {
  const docs = [
    { id: 'approval_a', status: 'pending', createdAt: '2026-10-25T10:00:00.000Z' },
    { id: 'approval_b', status: 'approved', createdAt: '2026-10-25T11:00:00.000Z' },
    { id: 'approval_c', status: 'pending', createdAt: '2026-10-25T12:00:00.000Z' },
    { id: 'approval_d', status: 'pending', createdAt: '2026-10-25T09:00:00.000Z' },
  ];
  const { db, calls } = fakeDb(docs);
  const first = await listOwnerApprovalsPage({ status: 'pending', limit: 2 }, db as any);
  assert.deepEqual(calls.slice(0, 2), [['collection', 'agent_approvals'], ['where', 'status', '==', 'pending']]);
  assert.ok(calls.some(([name]) => name === 'orderBy'));
  assert.ok(calls.some(([name, value]) => name === 'limit' && value === 3), 'pide limit+1 para saber si hay más');
  assert.deepEqual(first.approvals.map((a) => a.id), ['approval_c', 'approval_a'], 'ordenados por createdAt desc dentro de la página');
  assert.equal(first.nextCursor, 'approval_c');

  const second = await listOwnerApprovalsPage({ status: 'pending', limit: 2, cursor: first.nextCursor }, db as any);
  assert.ok(calls.some(([name, value]) => name === 'startAfter' && value === 'approval_c'));
  assert.deepEqual(second.approvals.map((a) => a.id), ['approval_d']);
  assert.equal(second.nextCursor, null);

  await assert.rejects(() => listOwnerApprovalsPage({ status: 'todo' as any }, db as any), /Estado de aprobación no válido/);
  assert.deepEqual(await listOwnerApprovalsPage({ status: 'pending' }, null), { approvals: [], nextCursor: null });
  assert.equal(isOwnerApprovalStatus('pending'), true);
  assert.equal(isOwnerApprovalStatus('PENDING'), false);
});

test('la consulta paginada no usa orderBy(createdAt), así no exige índice compuesto', () => {
  const source = read('backend/ownerApprovalService.ts');
  const fn = source.slice(source.indexOf('export async function listOwnerApprovalsPage'), source.indexOf('async function decideOwnerApproval'));
  assert.match(fn, /\.where\('status', '==', input\.status\)/);
  assert.match(fn, /\.orderBy\(FieldPath\.documentId\(\)\)/);
  assert.doesNotMatch(fn, /orderBy\('createdAt'/);
});

test('endpoint y bandeja usan status=pending con paginación', () => {
  const request = officeRequests.approvalsByStatus('pending', { limit: 50, cursor: 'approval_c' });
  assert.equal(request.method, 'GET');
  assert.equal(request.url, '/api/admin/agent-office/approvals?status=pending&limit=50&cursor=approval_c');
  assert.equal(officeRequests.approvalsByStatus('pending', { limit: 999 }).url, '/api/admin/agent-office/approvals?status=pending&limit=100');
  const routes = read('backend/routes/admin.ts');
  assert.match(routes, /get\('\/api\/admin\/agent-office\/approvals', requireOwner, async \(req, res\)/);
  assert.match(routes, /isOwnerApprovalStatus\(status\)/);
  assert.match(routes, /listOwnerApprovalsPage\(\{/);
  const workspace = read('src/components/AgentOfficeWorkspace.tsx');
  assert.match(workspace, /officeRequests\.approvalsByStatus\('pending', \{ limit: PENDING_APPROVALS_PAGE_SIZE \}\)/);
  assert.match(workspace, /cursor: nextCursor/);
  assert.equal(PENDING_APPROVALS_PAGE_SIZE, 50);
});
