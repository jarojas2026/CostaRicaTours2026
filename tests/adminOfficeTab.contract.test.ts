import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { officeRequests } from '../src/components/agentOfficeRequests';
import { AgentOfficeWorkspace } from '../src/components/AgentOfficeWorkspace';
import { buildAgentRegistrySeed } from '../backend/agentRegistryService';
import { projectAgentOffice } from '../backend/agentOfficeProjection';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const adminRoutes = read('backend/routes/admin.ts');
const app = read('src/App.tsx');
const page = read('src/pages/AdminControlCenterPage.tsx');
const workspace = read('src/components/AgentOfficeWorkspace.tsx');
const requests = read('src/components/agentOfficeRequests.ts');

const ALL_REQUESTS = [
  officeRequests.governance(),
  officeRequests.audit(),
  officeRequests.approvals(),
  officeRequests.approve('approval_1'),
  officeRequests.reject('approval_1', 'no'),
  officeRequests.agentControl('concierge', 'pause', 'r'),
  officeRequests.agentControl('concierge', 'resume', 'r'),
  officeRequests.agentControl('concierge', 'revoke', 'r'),
  officeRequests.agentControl('concierge', 'restore', 'r'),
  officeRequests.shutdown('r'),
  officeRequests.resumeAll('r'),
  officeRequests.jarvisCommand('Revisa leads', 'es'),
  officeRequests.jarvisPlans(),
  officeRequests.jarvisReconcile('jarvis_1'),
];

test('la pestaña Oficina solo usa endpoints existentes de agent-office y jarvis', () => {
  for (const request of ALL_REQUESTS) {
    assert.match(request.url, /^\/api\/admin\/(agent-office|jarvis)\//, request.url);
  }
  // Cada ruta usada existe en el backend y está protegida por owner/admin.
  const routePatterns: Array<[RegExp, RegExp]> = [
    [/^\/api\/admin\/agent-office\/governance$/, /get\('\/api\/admin\/agent-office\/governance', requireAdmin/],
    [/^\/api\/admin\/agent-office\/audit$/, /get\('\/api\/admin\/agent-office\/audit', requireOwner/],
    [/^\/api\/admin\/agent-office\/approvals$/, /get\('\/api\/admin\/agent-office\/approvals', requireOwner/],
    [/\/approvals\/[^/]+\/approve$/, /post\('\/api\/admin\/agent-office\/approvals\/:approvalId\/approve', requireOwner/],
    [/\/approvals\/[^/]+\/reject$/, /post\('\/api\/admin\/agent-office\/approvals\/:approvalId\/reject', requireOwner/],
    [/\/agents\/[^/]+\/(pause|resume|revoke|restore)$/, /post\(`\/api\/admin\/agent-office\/agents\/:agentId\/\$\{path\}`, requireOwner/],
    [/\/agent-office\/shutdown$/, /post\('\/api\/admin\/agent-office\/shutdown', requireOwner/],
    [/\/agent-office\/resume-all$/, /post\('\/api\/admin\/agent-office\/resume-all', requireOwner/],
    [/\/jarvis\/command$/, /post\('\/api\/admin\/jarvis\/command', requireOwner/],
    [/\/jarvis\/plans\?limit=\d+$/, /get\('\/api\/admin\/jarvis\/plans', requireOwner/],
    [/\/jarvis\/plans\/[^/]+\/reconcile$/, /post\('\/api\/admin\/jarvis\/plans\/:planId\/reconcile', requireOwner/],
  ];
  for (const request of ALL_REQUESTS) {
    const match = routePatterns.find(([urlPattern]) => urlPattern.test(request.url));
    assert.ok(match, `sin ruta conocida para ${request.url}`);
    assert.match(adminRoutes, match![1]);
  }
});

test('nada en la pestaña Oficina ejecuta pagos, cobros, reembolsos ni envíos', () => {
  for (const source of [workspace, requests]) {
    assert.doesNotMatch(source, /\/api\/(payments|stripe|checkout|leads\/[^'"`]*payment|email|whatsapp|notifications)/i);
    assert.doesNotMatch(source, /sendEmail|sendWhatsApp|createPaymentLink|stripe\./i);
    assert.doesNotMatch(source, /\/autonomy'/, 'esta fase no sube niveles de autonomía desde la UI');
  }
  assert.match(workspace, /Aprobar no ejecuta la acción/);
  assert.match(workspace, /Todavía no hay un proceso que ejecute las tareas/);
});

test('rechazar, pausar/revocar y apagado global exigen motivo', () => {
  assert.throws(() => officeRequests.reject('approval_1', '  '), /Motivo/);
  assert.throws(() => officeRequests.agentControl('concierge', 'revoke', ''), /Motivo/);
  assert.throws(() => officeRequests.shutdown(''), /Motivo/);
  assert.throws(() => officeRequests.jarvisCommand('   ', 'es'), /Orden/);
  assert.deepEqual(officeRequests.reject('approval_1', 'precio mal').body, { reason: 'precio mal' });
  assert.equal(officeRequests.approve('a/b').url, '/api/admin/agent-office/approvals/a%2Fb/approve');
});

test('la pestaña Oficina vive en /admin detrás de AdminRouteGuard', () => {
  assert.match(app, /<Route path="\/admin" element=\{<AdminRouteGuard[^]*?AdminControlCenterPage[^]*?<\/AdminRouteGuard>\} \/>/);
  assert.match(page, /\{ id: 'oficina', icon: Building2, es: 'Oficina', en: 'Office' \}/);
  assert.match(page, /case 'oficina': return <AgentOfficeWorkspace language=\{language\} snapshot=\{office\}/);
});

for (const language of ['es', 'en'] as const) {
  test('AgentOfficeWorkspace renderiza planta, bandeja, consola y gobernanza en ' + language, () => {
    const now = '2026-10-25T15:00:00.000Z';
    const snapshot = projectAgentOffice(buildAgentRegistrySeed(new Date(now)), [], now, true);
    const html = renderToStaticMarkup(React.createElement(AgentOfficeWorkspace, { language, snapshot, fetcher: async () => ({}) as any }));
    assert.match(html, language === 'es' ? /Bandeja de aprobaciones/ : /Approval inbox/);
    assert.match(html, language === 'es' ? /Consola de JARVIS/ : /JARVIS console/);
    assert.match(html, language === 'es' ? /Gobernanza de agentes/ : /Agent governance/);
    assert.match(html, language === 'es' ? /Apagado global/ : /Global shutdown/);
    assert.match(html, /data-office="jarvis_room"/);
    assert.match(html, /data-agent="finance_analyst"/);
  });
}
