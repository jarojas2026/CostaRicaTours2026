import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  CR_CANTONS_BY_PROVINCE, CR_PROVINCES, ICT_TOURISM_REGIONS, SUPPLIER_CONTACT_STATES, SUPPLIER_DIRECTORY_COLLECTION,
  normalizeCanton, normalizeCrPhone, normalizeIctRegion, normalizeProvince, validateSupplierDirectoryRow,
  type SupplierDirectoryEntry,
} from '../shared/supplierDirectory';
import {
  SupplierConversionError, applySupplierDirectoryPlan, convertDirectoryEntryToPendingOperator, csvToSupplierRows,
  listSupplierDirectory, parseCsv, parseSupplierDirectoryFilters, planSupplierDirectoryImport, supplierDirectoryUpsertDoc,
} from '../backend/supplierDirectory';
import { main as importMain } from '../scripts/importSupplierDirectory';
import { calculateContractualSettlementUSD, isValidCommissionRate } from '../backend/providerPayoutPolicy';
import { assessCommercialReadiness } from '../backend/commerceReadinessPolicy';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
const HEADER = 'id,nombre,razon_social,tipo,provincia,canton,distrito,region_turistica_ict,lat,lng,productos_tours,telefono,email,web,whatsapp,declaratoria_ict,cst,fuente_url,fecha_extraccion,estado_contacto';
const ROW_OK = 'cataratas-nauyaca,"Cataratas Nauyaca, S.A.",Nauyaca SA,operador_tours,san jose,Perez Zeledon,Barú,Pacífico Sur,9.2833,-83.8667,Caminata;Cabalgata,2787-0542,INFO@EXAMPLE.CR,https://nauyaca.example,8888-0000,sí,CST 3,https://www.ict.go.cr/fuente,2026-10-20,';
const NOW = new Date('2026-10-27T23:50:00Z');

function entry(overrides: Partial<SupplierDirectoryEntry> = {}): SupplierDirectoryEntry {
  const r = validateSupplierDirectoryRow(csvToSupplierRows(`${HEADER}\n${ROW_OK}`).rows[0]);
  assert.ok(r.ok);
  return { ...r.entry, ...overrides };
}

test('geografía oficial: 7 provincias, 84 cantones, 10 unidades ICT', () => {
  assert.equal(CR_PROVINCES.length, 7);
  assert.equal(Object.values(CR_CANTONS_BY_PROVINCE).reduce((n, l) => n + l.length, 0), 84);
  assert.equal(ICT_TOURISM_REGIONS.length, 10);
  assert.equal(normalizeProvince('LIMON'), 'Limón');
  assert.equal(normalizeCanton('Puntarenas', 'Aguirre'), 'Quepos');
  assert.equal(normalizeCanton('Alajuela', 'Valverde Vega'), 'Sarchí');
  assert.equal(normalizeCanton('Cartago', 'Central'), 'Cartago');
  assert.equal(normalizeCanton('Limón', 'Quepos'), null, 'cantón de otra provincia');
  assert.equal(normalizeIctRegion('pacifico central'), 'Pacífico Medio');
  assert.equal(normalizeCrPhone('2787-0542'), '+50627870542');
  assert.equal(normalizeCrPhone('+1 (305) 555-0100'), '+13055550100');
  assert.equal(normalizeCrPhone('123'), null);
});

test('CSV: comillas, comas internas, CRLF y BOM', () => {
  const rows = parseCsv('\uFEFFa,b\r\n"x, y","he said ""hola"""\r\n\r\n"multi\nline",z');
  assert.deepEqual(rows, [['a', 'b'], ['x, y', 'he said "hola"'], ['multi\nline', 'z']]);
  assert.deepEqual(csvToSupplierRows('id,nombre\n1,a').missingColumns.includes('provincia'), true);
});

test('validación normaliza nombres oficiales, contacto y estado por defecto', () => {
  const e = entry();
  assert.equal(e.nombre, 'Cataratas Nauyaca, S.A.');
  assert.equal(e.provincia, 'San José');
  assert.equal(e.canton, 'Pérez Zeledón');
  assert.equal(e.region_turistica_ict, 'Pacífico Sur');
  assert.deepEqual(e.productos, ['Caminata', 'Cabalgata']);
  assert.equal(e.contacto.email, 'info@example.cr');
  assert.equal(e.contacto.telefono, '+50627870542');
  assert.equal(e.contacto.whatsapp, '+50688880000');
  assert.equal(e.declaratoria_ict, true);
  assert.equal(e.estado_contacto, 'sin_contactar');
  assert.equal(e.operator_id, null);
  assert.ok(SUPPLIER_CONTACT_STATES.includes(e.estado_contacto));
});

test('filas inválidas se rechazan; duplicados conservan la primera; avisos no bloquean', () => {
  const csv = [
    HEADER,
    ROW_OK,
    ROW_OK.replace('Cataratas Nauyaca', 'Duplicado'),
    ',Sin fuente,,operador_tours,San José,Dota,,,,,,,,,,,,,,',
    'x,Provincia mala,,hospedaje,Narnia,Dota,,,,,,,,,,,,https://a.example,,',
    'y,Estado malo,,hospedaje,Heredia,Barva,,,,,,,,,,,,https://a.example,,pagado',
    'z,Con avisos,,hospedaje,Heredia,Barva,,Región Inventada,50,-84,,abc,mal@,,,,,https://a.example,20-10-2026,contactado',
  ].join('\n');
  const plan = planSupplierDirectoryImport(csvToSupplierRows(csv).rows);
  assert.equal(plan.summary.rows, 6);
  assert.equal(plan.summary.valid, 2);
  assert.equal(plan.summary.duplicates, 1);
  assert.equal(plan.summary.rejected, 3);
  const z = plan.valid.find(v => v.entry.id === 'z')!;
  assert.equal(z.entry.lat, null);
  assert.equal(z.entry.region_turistica_ict, null);
  assert.equal(z.entry.contacto.email, null);
  assert.equal(z.entry.estado_contacto, 'contactado');
  assert.ok(z.warnings.length >= 4);
  assert.deepEqual(plan.summary.byProvincia, { 'San José': 1, Heredia: 1 });
});

test('script: DRY-RUN por defecto no toca Firestore; --apply hace upsert sin borrar', async () => {
  const writes: { id: string; data: any }[] = [];
  const store = new Map<string, any>([['cataratas-nauyaca', { estado_contacto: 'negociando', operator_id: 'op-1' }]]);
  const db = {
    collection(name: string) {
      assert.equal(name, SUPPLIER_DIRECTORY_COLLECTION);
      return {
        doc: (id: string) => ({
          get: async () => ({ exists: store.has(id), data: () => store.get(id) }),
          set: async (data: any, opts: any) => { assert.deepEqual(opts, { merge: true }); writes.push({ id, data }); },
          delete: async () => { throw new Error('never delete'); },
        }),
      };
    },
  };
  const csv = `${HEADER}\n${ROW_OK}\n${ROW_OK.replace('cataratas-nauyaca', 'nuevo-x')}`;
  const logs: string[] = [];
  let dbRequested = false;
  const code = await importMain(['--file', 'x.csv'], { readFile: () => csv, getDb: async () => { dbRequested = true; return db; }, log: s => logs.push(s) });
  assert.equal(code, 0);
  assert.equal(dbRequested, false);
  assert.equal(writes.length, 0);
  assert.match(logs.join('\n'), /DRY-RUN/);

  const code2 = await importMain(['--file=x.csv', '--apply'], { readFile: () => csv, getDb: async () => db, log: s => logs.push(s) });
  assert.equal(code2, 0);
  assert.equal(writes.length, 2);
  const existing = writes.find(w => w.id === 'cataratas-nauyaca')!.data;
  assert.equal('estado_contacto' in existing, false, 'CSV sin estado conserva el estado guardado');
  assert.equal('operator_id' in existing, false, 'nunca pisa operator_id');
  const created = writes.find(w => w.id === 'nuevo-x')!.data;
  assert.equal(created.estado_contacto, 'sin_contactar');
  assert.equal(created.operator_id, null);
  assert.match(logs.at(-1)!, /1 nuevos, 1 actualizados \(0 borrados\)/);
});

test('upsert: estado explícito en el CSV sí se aplica', () => {
  const plan = planSupplierDirectoryImport(csvToSupplierRows(`${HEADER}\n${ROW_OK}aprobado`).rows);
  const doc = supplierDirectoryUpsertDoc(plan.valid[0], { estado_contacto: 'negociando', operator_id: 'op-1' }, NOW.toISOString());
  assert.equal(doc.estado_contacto, 'aprobado');
  assert.equal('operator_id' in doc, false);
});

test('conversión: solo aprobado → operador PENDIENTE, sin comisión, invisible para la operación', async () => {
  assert.throws(() => convertDirectoryEntryToPendingOperator(entry()), (e: any) => e instanceof SupplierConversionError && e.code === 'not_approved');
  assert.throws(() => convertDirectoryEntryToPendingOperator(entry({ estado_contacto: 'aprobado', operator_id: 'op-9' })), (e: any) => e.code === 'already_converted');

  const { operatorId, operator, directoryPatch } = convertDirectoryEntryToPendingOperator(entry({ estado_contacto: 'aprobado' }), { now: NOW });
  assert.equal(operatorId, 'dir-cataratas-nauyaca');
  assert.equal(operator.verified, false);
  assert.equal(operator.active, false);
  assert.equal(operator.status, 'pendiente_verificacion');
  assert.equal('commissionRate' in operator, false);
  assert.deepEqual(operator.activeTours, []);
  assert.equal(operator.phone, '+50627870542');
  assert.equal(operator.website, 'https://nauyaca.example');
  assert.equal(operator.supplierDirectoryId, 'cataratas-nauyaca');
  assert.deepEqual(directoryPatch, { operator_id: operatorId, updatedAt: NOW.toISOString() });

  // Mismos criterios que agentQuote.contractualCommissionRate / providerPayoutService:
  assert.equal(isValidCommissionRate((operator as any).commissionRate), false);
  assert.equal(calculateContractualSettlementUSD(100, (operator as any).commissionRate), null);
  const readiness = assessCommercialReadiness({ products: [], providers: [{ id: operatorId, ...operator }], slots: [], todayCR: '2026-10-27', sampleLimit: 500 } as any);
  assert.ok(readiness.blockers.includes('verify_real_provider'), 'un pendiente no cuenta como proveedor verificado');
});

test('filtros del listado admin y lectura acotada', async () => {
  assert.deepEqual(parseSupplierDirectoryFilters({ provincia: 'limon', tipo: 'Operador Tours', estado: 'aprobado', limit: '9999' }),
    { ok: true, filters: { provincia: 'Limón', tipo: 'operador_tours', estado: 'aprobado', limit: 500 } });
  assert.deepEqual(parseSupplierDirectoryFilters({ provincia: 'Narnia' }), { ok: false, error: 'provincia_invalida' });
  assert.deepEqual(parseSupplierDirectoryFilters({ estado: 'pagado' }), { ok: false, error: 'estado_invalido' });

  assert.deepEqual(await listSupplierDirectory(null, { limit: 10 }), { available: false, entries: [] });
  const calls: string[] = [];
  const q: any = {
    where(f: string, _op: string, v: unknown) { calls.push(`${f}=${v}`); return q; },
    limit(n: number) { calls.push(`limit=${n}`); return q; },
    get: async () => ({ docs: [{ id: 'a', data: () => ({ nombre: 'A' }) }] }),
  };
  const out = await listSupplierDirectory({ collection: (n: string) => { assert.equal(n, 'supplier_directory'); return q; } }, { provincia: 'Limón', estado: 'aprobado', limit: 5 });
  assert.deepEqual(out.entries, [{ id: 'a', nombre: 'A' }]);
  assert.deepEqual(calls, ['provincia=Limón', 'estado_contacto=aprobado', 'limit=5']);
});

test('aislamiento: colección solo de servidor, ruta admin, sin borrar ni enviar nada', () => {
  const rules = read('firestore.rules');
  assert.match(rules, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/);
  assert.equal(rules.includes('supplier_directory'), false, 'sin regla propia: la cubre el deny catch-all');
  assert.match(read('backend/routes/supplierDirectory.ts'), /\.get\('\/api\/admin\/supplier-directory',\s*requireAdmin,/);
  for (const file of ['backend/supplierDirectory.ts', 'shared/supplierDirectory.ts', 'scripts/importSupplierDirectory.ts', 'backend/routes/supplierDirectory.ts']) {
    const src = read(file);
    assert.doesNotMatch(src, /\.delete\(|FieldValue\.delete|sendEmail|nodemailer|fetch\(|resend|sendgrid/i, `${file} no borra ni contacta a nadie`);
  }
  assert.doesNotMatch(read('backend/routes/supplierDirectory.ts'), /\.(post|put|patch|delete)\(/, 'solo lectura');
  // No entra al bundle público.
  const srcFiles = fs.readdirSync(path.join(process.cwd(), 'src'), { recursive: true }) as string[];
  for (const f of srcFiles.filter(f => /\.(ts|tsx)$/.test(f))) {
    assert.doesNotMatch(read(path.join('src', f)), /supplierDirectory/, `src/${f} no importa el directorio`);
  }
});
