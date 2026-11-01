import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildOutreachMessages, buildOutreachSuggestions, generateOutreachDraft, isAcceptableDraft, parseOutreachFilters,
  rankSuppliers, scoreSupplier, templateOutreachDraft, type DraftChat,
} from '../backend/supplierOutreachAssistant';

const base = (over: Record<string, any> = {}): any => ({
  id: 'p1', nombre: 'Aventuras Demo', razon_social: 'Demo SA', tipo: 'operador_tours', provincia: 'San José', canton: 'Pérez Zeledón',
  distrito: null, region_turistica_ict: 'Pacífico Sur', lat: null, lng: null, productos: ['Caminata', 'Cabalgata'],
  contacto: { telefono: '+50622220000', email: 'info@demo.example', web: 'https://demo.example', whatsapp: '+50688880000' },
  declaratoria_ict: true, cst: 'CST 3', fuente_url: 'https://www.ict.go.cr/x', fecha_extraccion: null, estado_contacto: 'sin_contactar', operator_id: null,
  ...over,
});
const F = (over: Record<string, unknown> = {}) => { const p = parseOutreachFilters(over); assert.ok(p.ok); return (p as any).filters; };

test('filtros: provincia/tipo/prioridad/canal validados y límites acotados', () => {
  assert.deepEqual(parseOutreachFilters({ provincia: 'Narnia' }), { ok: false, error: 'provincia_invalida' });
  assert.deepEqual(parseOutreachFilters({ tipo: 'nave' }), { ok: false, error: 'tipo_invalido' });
  assert.deepEqual(parseOutreachFilters({ prioridad: 'urgente' }), { ok: false, error: 'prioridad_invalida' });
  assert.deepEqual(parseOutreachFilters({ canal: 'sms' }), { ok: false, error: 'canal_invalido' });
  const f = F({ provincia: 'limon', tipo: 'Operador Tours', prioridad: 'ALTA', limit: 999, drafts: 99 });
  assert.equal(f.provincia, 'Limón'); assert.equal(f.tipo, 'operador_tours'); assert.equal(f.prioridad, 'alta');
  assert.equal(f.limit, 25); assert.equal(f.drafts, 5);
});

test('puntaje: ICT + CST + sin contactar = alta; excluye aprobados, rechazados, convertidos y sin canal', () => {
  const s = scoreSupplier(base())!;
  assert.equal(s.prioridad, 'alta');
  assert.ok(s.razones.some(r => /ICT/.test(r)));
  assert.equal(scoreSupplier(base({ estado_contacto: 'aprobado' })), null);
  assert.equal(scoreSupplier(base({ estado_contacto: 'rechazado' })), null);
  assert.equal(scoreSupplier(base({ operator_id: 'op-1' })), null);
  assert.equal(scoreSupplier(base({ contacto: { telefono: null, email: null, web: null, whatsapp: null } })), null);
  // Nunca expone valores de contacto, solo si existen.
  assert.doesNotMatch(JSON.stringify(s), /info@demo|\+5068888|demo\.example|Demo SA/);
});

test('ranking ordena por puntaje y aplica filtros', () => {
  const entries = [
    base({ id: 'a', nombre: 'A', declaratoria_ict: false, cst: null, estado_contacto: 'contactado', productos: [] }),
    base({ id: 'b', nombre: 'B' }),
    base({ id: 'c', nombre: 'C', provincia: 'Limón' }),
    base({ id: 'd', nombre: 'D', contacto: { telefono: null, email: 'x@y.example', web: null, whatsapp: null } }),
  ];
  assert.deepEqual(rankSuppliers(entries as any, F({ provincia: 'San José' })).map(s => s.id), ['b', 'd', 'a']);
  assert.deepEqual(rankSuppliers(entries as any, F({ prioridad: 'baja' })).map(s => s.id), ['a']);
  assert.deepEqual(rankSuppliers(entries as any, F({ canal: 'email', provincia: 'San José', prioridad: 'alta' })).map(s => s.id).sort(), ['b', 'd']);
});

test('plantilla en español pide tarifas netas con margen mínimo del 20 % y no lleva contactos', () => {
  const s = scoreSupplier(base())!;
  const wa = templateOutreachDraft(s, 'whatsapp');
  const em = templateOutreachDraft(s, 'email');
  for (const d of [wa, em]) {
    assert.match(d.mensaje, /tarifas netas para agencia/);
    assert.match(d.mensaje, /20 %/);
    assert.ok(isAcceptableDraft(d.mensaje));
  }
  assert.equal(wa.asunto, null);
  assert.match(String(em.asunto), /tarifas netas/);
});

test('al modelo solo salen campos comerciales (sin teléfono, correo, web ni razón social)', () => {
  const msgs = buildOutreachMessages(scoreSupplier(base())!, 'whatsapp');
  const all = JSON.stringify(msgs);
  assert.doesNotMatch(all, /info@demo|\+5068888|\+5062222|demo\.example|Demo SA/);
  assert.match(all, /margen mínimo del 20 %/);
});

test('usa el borrador de Groq si es aceptable; si falla, omite el 20 % o trae contactos, usa la plantilla', async () => {
  const s = scoreSupplier(base())!;
  const good: DraftChat = async () => ({ text: 'Asunto: Tarifas netas\n\nHola, equipo de Aventuras Demo. Somos Costa Rica Tours y queremos sus tarifas netas para agencia; trabajamos con un margen mínimo del 20 % sobre el precio público. ¿Nos comparten condiciones? [Tu nombre] — Costa Rica Tours', model: 'openai/gpt-oss-120b' });
  const d1 = await generateOutreachDraft(s, 'email', good);
  assert.equal(d1.generadoPor, 'groq'); assert.equal(d1.asunto, 'Tarifas netas'); assert.equal(d1.modelo, 'openai/gpt-oss-120b');
  const noMargin: DraftChat = async () => ({ text: 'Hola, equipo. Queremos trabajar con ustedes y conocer sus precios para agencia cuanto antes. Saludos cordiales.' });
  assert.equal((await generateOutreachDraft(s, 'whatsapp', noMargin)).generadoPor, 'plantilla');
  const withPhone: DraftChat = async () => ({ text: 'Hola, pedimos tarifas netas con margen mínimo del 20 % sobre el precio público. Llámenos al +506 8888 0000 por favor, gracias.' });
  assert.equal((await generateOutreachDraft(s, 'whatsapp', withPhone)).generadoPor, 'plantilla');
  const boom: DraftChat = async () => { throw new Error('429'); };
  assert.equal((await generateOutreachDraft(s, 'whatsapp', boom)).generadoPor, 'plantilla');
  assert.equal((await generateOutreachDraft(s, 'whatsapp', async () => null)).generadoPor, 'plantilla');
});

test('sugerencias: borradores solo para los primeros N y nunca envía ni escribe', async () => {
  let calls = 0;
  const chat: DraftChat = async () => { calls++; return null; };
  const entries = ['a', 'b', 'c', 'd'].map(id => base({ id, nombre: id.toUpperCase() }));
  const out = await buildOutreachSuggestions(entries as any, F({ drafts: 2 }), chat);
  assert.equal(out.length, 4);
  assert.equal(out.filter(s => s.borrador).length, 2);
  assert.equal(calls, 2);
  const src = readFileSync('backend/supplierOutreachAssistant.ts', 'utf8');
  assert.doesNotMatch(src, /\.(set|update|add|delete)\(|sendMail|sendWhatsApp|notificationService|nodemailer/);
});

test('la ruta es solo admin, de solo lectura y responde sent:false / writes:false', () => {
  const route = readFileSync('backend/routes/supplierOutreach.ts', 'utf8');
  assert.match(route, /post\('\/api\/admin\/supplier-directory\/outreach-suggestions', requireAdmin,/);
  assert.match(route, /sent: false/);
  assert.match(route, /writes: false/);
  assert.doesNotMatch(route, /\.(set|update|add|delete)\(/);
  assert.match(readFileSync('backend/routes/index.ts', 'utf8'), /supplierOutreachRouter,/);
});
