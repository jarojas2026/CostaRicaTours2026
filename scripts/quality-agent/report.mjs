// Abre o actualiza un único issue con los fallos del QualityAgent (#393). Nunca hace merges.
import { readFileSync, existsSync } from 'node:fs';

const TITLE = '[QualityAgent] Fallos en producción';
const LABEL = 'quality-agent';
const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_SERVER_URL = 'https://github.com' } = process.env;
const api = (path, init = {}) => fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${path}`, {
  ...init, headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
}).then(async r => { if (!r.ok) throw new Error(`${r.status} ${await r.text()}`); return r.json(); });

const failures = [];
const file = 'scripts/quality-agent/quality-agent-results.json';
if (!existsSync(file)) failures.push({ title: 'El QualityAgent no produjo resultados', severity: 'alta', error: 'sin archivo de resultados' });
else {
  const walk = suite => {
    for (const s of suite.suites || []) walk(s);
    for (const spec of suite.specs || []) {
      if (spec.ok) continue;
      const t = spec.tests?.[0];
      const severity = t?.annotations?.find(a => a.type === 'severity')?.description || 'media';
      const err = t?.results?.at(-1)?.error?.message || '';
      failures.push({ title: spec.title, severity, error: err.replace(/\u001b\[[0-9;]*m/g, '').split('\n').slice(0, 4).join(' ').slice(0, 400) });
    }
  };
  walk(JSON.parse(readFileSync(file, 'utf8')));
}

const open = (await api(`/issues?state=open&labels=${LABEL}&per_page=10`)).find(i => i.title === TITLE);
const runUrl = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
const today = new Date().toISOString().slice(0, 10);
if (!failures.length) {
  if (open) await api(`/issues/${open.number}/comments`, { method: 'POST', body: JSON.stringify({ body: `✅ ${today}: todas las verificaciones pasaron. [Ejecución](${runUrl})` }) });
  console.log('QualityAgent: sin fallos');
  process.exit(0);
}
const top = failures.some(f => f.severity === 'alta') ? 'alta' : 'media';
const priority = top === 'alta' ? 'prioridad:P1' : 'prioridad:P2';
const body = [`**Severidad máxima: ${top}** · ${today} · [Ejecución](${runUrl})`, '', '| Severidad | Verificación | Detalle |', '|---|---|---|',
  ...failures.map(f => `| ${f.severity} | ${f.title.replace(/\|/g, '/')} | ${f.error.replace(/\|/g, '/')} |`), '',
  '_Generado por el QualityAgent diario. No hace cambios ni merges automáticos._'].join('\n');
if (open) {
  await api(`/issues/${open.number}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
  await api(`/issues/${open.number}/labels`, { method: 'POST', body: JSON.stringify({ labels: [priority] }) });
  console.log(`QualityAgent: issue #${open.number} actualizado`);
} else {
  const created = await api('/issues', { method: 'POST', body: JSON.stringify({ title: TITLE, body, labels: [LABEL, priority, 'agente:libre'] }) });
  console.log(`QualityAgent: issue #${created.number} abierto`);
}
