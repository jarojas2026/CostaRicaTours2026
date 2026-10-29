#!/usr/bin/env node
/**
 * Evaluación offline del concierge con Groq simulado (sin red, sin Firestore, $0).
 * Uso: node --import tsx scripts/eval/concierge-eval.mjs [--verbose]
 * Sale con código 1 si algún escenario falla.
 */
const { runAllScenarios } = await import('./conciergeScenarios.ts');
const verbose = process.argv.includes('--verbose');
const { passed, total, results } = await runAllScenarios();
for (const r of results) {
  console.log(`${r.passed ? 'OK  ' : 'FAIL'} ${r.id}`);
  for (const f of r.failures) console.log(`     - ${f}`);
  if (verbose) for (const reply of r.replies) console.log(`     > ${reply.replace(/\n/g, ' | ')}`);
}
console.log(`\n${passed}/${total} escenarios en verde`);
process.exit(passed === total ? 0 : 1);
