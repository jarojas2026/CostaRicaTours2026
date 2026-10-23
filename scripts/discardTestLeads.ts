/**
 * Descartar leads de prueba (#331). SEGURO POR DISEÑO:
 * - Por defecto DRY-RUN: solo lista y cuenta, no modifica nada.
 * - Nunca borra: usa POST /api/admin/leads/triage {action:'descartar'} (reversible
 *   con {action:'restaurar'}), en lotes de ≤100 ids (límite del endpoint).
 * - Conservador: requiere ≥2 señales de prueba, o un email de prueba conocido.
 * - Los dudosos (1 señal) se imprimen para revisión humana y NO se descartan.
 * - Idempotente: los ya descartados (triage.state === 'descartado') se saltan.
 *
 * Autenticación real (backend/routes/leads.ts → requireOperator):
 *   cabecera X-Operator-Key = OPERATOR_API_KEY del servidor, o
 *   Authorization: Bearer <ID token de Firebase> de un owner/admin/operator.
 *
 * Uso (solo el dueño; acepta "--flag valor" y "--flag=valor"):
 *   # 1) Ver qué se descartaría:
 *   OPERATOR_API_KEY=... npx tsx scripts/discardTestLeads.ts --base-url https://costaricatours2026.vercel.app
 *   # 2) Si la lista es correcta, aplicar:
 *   OPERATOR_API_KEY=... npx tsx scripts/discardTestLeads.ts --base-url https://... --apply
 *   # Alternativa con sesión Firebase: --id-token <token> (o FIREBASE_ID_TOKEN)
 */
import { pathToFileURL } from 'node:url';

export function argValue(argv: string[], name: string): string {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === name) return argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : '';
    if (a.startsWith(`${name}=`)) return a.slice(name.length + 1);
  }
  return '';
}

const KNOWN_TEST_EMAILS = new Set(['test@example.com']);
const TEST_EMAIL_DOMAINS = ['example.com', 'test.com', 'example.org', 'example.test', 'localhost', 'invalid.com'];
const TEST_KEYWORDS = ['prueba', 'test', 'automatizad', 'e2e', 'playwright', 'sandbox', 'dummy', 'fake'];

/** Forma mínima de LeadRecord (backend/leadPipeline.ts) que usa el script. */
export interface LeadLike {
  id: string;
  contact?: { email?: string; name?: string } | null;
  messageSnippet?: string;
  sources?: string[];
  firstSource?: string;
  triage?: { state?: string };
}

export function testSignals(lead: LeadLike): { count: number; reasons: string[] } {
  const reasons = new Set<string>();
  const email = (lead.contact?.email || '').toLowerCase();
  const name = (lead.contact?.name || '').toLowerCase();
  const msg = (lead.messageSnippet || '').toLowerCase();
  if (KNOWN_TEST_EMAILS.has(email)) reasons.add(`email conocido ${email}`);
  const domain = email.split('@')[1] || '';
  if (TEST_EMAIL_DOMAINS.includes(domain)) reasons.add(`dominio de prueba @${domain}`);
  for (const kw of TEST_KEYWORDS) {
    if (name.includes(kw)) reasons.add(`nombre contiene "${kw}"`);
    if (msg.includes(kw)) reasons.add(`mensaje contiene "${kw}"`);
  }
  return { count: reasons.size, reasons: [...reasons] };
}

export function classifyLeads(leads: LeadLike[]) {
  const toDiscard: LeadLike[] = [];
  const borderline: LeadLike[] = [];
  for (const lead of leads) {
    if (lead.triage?.state === 'descartado') continue;
    const { count } = testSignals(lead);
    if (count >= 2 || KNOWN_TEST_EMAILS.has((lead.contact?.email || '').toLowerCase())) toDiscard.push(lead);
    else if (count === 1) borderline.push(lead);
  }
  return { toDiscard, borderline };
}

async function main(argv = process.argv.slice(2)) {
  const baseUrl = (process.env.BASE_URL || argValue(argv, '--base-url')).replace(/\/+$/, '');
  const operatorKey = process.env.OPERATOR_API_KEY || argValue(argv, '--operator-key');
  const idToken = process.env.FIREBASE_ID_TOKEN || argValue(argv, '--id-token');
  const apply = argv.includes('--apply');
  if (!baseUrl) throw new Error('Falta --base-url (ej. https://costaricatours2026.vercel.app)');
  if (!operatorKey && !idToken) throw new Error('Falta OPERATOR_API_KEY (o --id-token de un admin). Sin él no se puede ni listar.');
  const auth: Record<string, string> = operatorKey ? { 'X-Operator-Key': operatorKey } : { Authorization: `Bearer ${idToken}` };

  const res = await fetch(`${baseUrl}/api/admin/leads?limit=500`, { headers: auth });
  if (!res.ok) throw new Error(`No se pudo listar leads: HTTP ${res.status}.`);
  const data: any = await res.json();
  const leads: LeadLike[] = Array.isArray(data?.leads) ? data.leads : [];
  const { toDiscard, borderline } = classifyLeads(leads);

  console.log(`\n=== ${apply ? 'APLICAR' : 'DRY-RUN'}: ${toDiscard.length} de ${leads.length} leads candidatos a descarte ===`);
  for (const l of toDiscard.slice(0, 30)) console.log(`  ${l.id} | ${testSignals(l).reasons.join('; ')}`);
  if (toDiscard.length > 30) console.log(`  ... y ${toDiscard.length - 30} más.`);
  console.log(`\n=== ${borderline.length} dudosos (1 señal): NO se descartan, revisión humana ===`);
  for (const l of borderline.slice(0, 10)) console.log(`  ${l.id} | ${testSignals(l).reasons.join('; ')}`);
  if (!apply) { console.log('\nNo se modificó nada. Para aplicar el descarte reversible, añade --apply.'); return; }

  const ids = toDiscard.map(l => l.id);
  let updated = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const triage = await fetch(`${baseUrl}/api/admin/leads/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ action: 'descartar', ids: batch, note: 'limpieza leads de prueba #331' }),
    });
    if (!triage.ok) throw new Error(`Triage falló: HTTP ${triage.status}`);
    const result: any = await triage.json();
    updated += Array.isArray(result?.updated) ? result.updated.length : 0;
  }
  console.log(`\nDescartados (reversible): ${updated}. Restaurar: POST /api/admin/leads/triage {"action":"restaurar","ids":[...]}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
}
