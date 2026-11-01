/**
 * Importa el directorio de proveedores (prospección) desde un CSV a Firestore `supplier_directory`.
 * SEGURO POR DISEÑO:
 * - DRY-RUN por defecto: valida, normaliza e imprime el resumen; no escribe nada.
 * - Solo escribe con --apply (set con merge = upsert). Nunca borra documentos.
 * - Un CSV sin estado_contacto conserva el estado ya guardado; nunca pisa operator_id.
 * - No envía correos, no llama APIs externas, no crea operadores (eso es manual:
 *   backend/supplierDirectory.ts → convertDirectoryEntryToPendingOperator + verificación del dueño).
 *
 * Columnas: id,nombre,razon_social,tipo,provincia,canton,distrito,region_turistica_ict,lat,lng,
 *           productos_tours,telefono,email,web,whatsapp,declaratoria_ict,cst,fuente_url,
 *           fecha_extraccion,estado_contacto
 * (productos_tours separados por ";" o "|"; declaratoria_ict sí/no; fecha YYYY-MM-DD).
 *
 * Uso (solo el dueño):
 *   npx tsx scripts/importSupplierDirectory.ts --file ruta/directorio.csv            # dry-run
 *   npx tsx scripts/importSupplierDirectory.ts --file ruta/directorio.csv --apply    # escribe (ADC de Firebase)
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { applySupplierDirectoryPlan, csvToSupplierRows, planSupplierDirectoryImport, type SupplierImportPlan } from '../backend/supplierDirectory';

export function argValue(argv: string[], name: string): string {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === name) return argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : '';
    if (a.startsWith(`${name}=`)) return a.slice(name.length + 1);
  }
  return '';
}

export function formatSummary(plan: SupplierImportPlan, apply: boolean): string {
  const s = plan.summary;
  const lines = [
    `Modo: ${apply ? 'APPLY (escribe en supplier_directory, upsert sin borrar)' : 'DRY-RUN (no escribe nada)'}`,
    `Filas: ${s.rows} · válidas: ${s.valid} · rechazadas: ${s.rejected} · duplicadas: ${s.duplicates} · con avisos: ${s.withWarnings}`,
    `Por provincia: ${JSON.stringify(s.byProvincia)}`,
    `Por tipo: ${JSON.stringify(s.byTipo)}`,
    `Por estado: ${JSON.stringify(s.byEstado)}`,
  ];
  for (const r of plan.rejected.slice(0, 50)) lines.push(`  ✗ línea ${r.line}: ${r.errors.join('; ')}`);
  for (const d of plan.duplicates.slice(0, 50)) lines.push(`  ↺ línea ${d.line}: id duplicado "${d.id}" (se conserva la primera)`);
  for (const v of plan.valid.filter(x => x.warnings.length).slice(0, 50)) lines.push(`  ! línea ${v.line} (${v.entry.id}): ${v.warnings.join('; ')}`);
  return lines.join('\n');
}

export async function main(argv: string[], deps: { readFile?: (p: string) => string; getDb?: () => Promise<any>; log?: (s: string) => void } = {}) {
  const log = deps.log ?? console.log;
  const file = argValue(argv, '--file');
  const apply = argv.includes('--apply');
  if (!file) { log('Falta --file <ruta.csv>'); return 2; }
  const text = (deps.readFile ?? (p => fs.readFileSync(p, 'utf8')))(file);
  const { rows, missingColumns } = csvToSupplierRows(text);
  if (missingColumns.length) { log(`Encabezado incompleto, faltan columnas: ${missingColumns.join(', ')}`); return 2; }
  const plan = planSupplierDirectoryImport(rows);
  log(formatSummary(plan, apply));
  if (!apply) { log('Dry-run: nada escrito. Repetir con --apply para guardar.'); return 0; }
  const db = deps.getDb ? await deps.getDb() : (await import('../backend/bookingService')).getFirestoreDb();
  if (!db) { log('Firestore no disponible: nada escrito.'); return 1; }
  const result = await applySupplierDirectoryPlan(db, plan);
  log(`Escrito: ${result.created} nuevos, ${result.updated} actualizados (0 borrados).`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(err => { console.error(err?.message || err); process.exitCode = 1; });
}
