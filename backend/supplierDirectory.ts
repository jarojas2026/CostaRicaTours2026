/**
 * Directorio de proveedores (prospección) — lado servidor.
 *
 * - parseCsv: lector CSV RFC 4180 mínimo (comillas, comas y saltos de línea dentro de comillas), sin dependencias.
 * - planSupplierDirectoryImport: valida/normaliza filas y arma el plan de upsert (nunca borra).
 * - applySupplierDirectoryPlan: escribe con set(merge) en `supplier_directory`; solo lo llama el script con --apply.
 * - convertDirectoryEntryToPendingOperator: función PURA que arma un registro PENDIENTE para `operators`
 *   con la misma forma que usa commerceAdminRouter (name/email/phone/website/activeTours/verified/active/status),
 *   pero con verified=false, active=false y SIN commissionRate. Así agentQuote, providerPayoutService y
 *   operationalProviderRegistryService lo ignoran hasta que el dueño lo verifique y fije la comisión a mano
 *   (POST /api/admin/commerce/provider con evidencia y attested=true).
 * - listSupplierDirectory: lectura acotada para el panel admin (solo lectura).
 *
 * Sin emails, sin APIs externas, sin pagos. Colección solo de servidor (deny catch-all en firestore.rules).
 */
import {
  SUPPLIER_DIRECTORY_COLLECTION, SUPPLIER_DIRECTORY_CSV_COLUMNS, foldKey, isSupplierContactState, isSupplierType,
  normalizeProvince, validateSupplierDirectoryRow,
  type CrProvince, type SupplierContactState, type SupplierDirectoryCsvRow, type SupplierDirectoryEntry, type SupplierType,
} from '../shared/supplierDirectory';

/** Parser CSV mínimo: separador coma, comillas dobles con "" como escape, CRLF/LF, BOM opcional. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === '') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(cell => cell.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some(cell => cell.trim() !== '')) rows.push(row);
  return rows;
}

/** Convierte el CSV en filas por nombre de columna. Error si falta alguna columna obligatoria del encabezado. */
export function csvToSupplierRows(text: string): { rows: SupplierDirectoryCsvRow[]; missingColumns: string[] } {
  const [header = [], ...body] = parseCsv(text);
  const names = header.map(h => h.trim().toLowerCase());
  const missingColumns = SUPPLIER_DIRECTORY_CSV_COLUMNS.filter(c => !names.includes(c));
  const rows = body.map(cells => {
    const out: Record<string, string> = {};
    names.forEach((name, idx) => { if ((SUPPLIER_DIRECTORY_CSV_COLUMNS as readonly string[]).includes(name)) out[name] = cells[idx] ?? ''; });
    return out as SupplierDirectoryCsvRow;
  });
  return { rows, missingColumns };
}

export interface SupplierImportPlanItem {
  line: number;
  entry: SupplierDirectoryEntry;
  /** El CSV traía estado_contacto explícito; si viene vacío se conserva el estado ya guardado. */
  explicitState: boolean;
  warnings: string[];
}

export interface SupplierImportPlan {
  valid: SupplierImportPlanItem[];
  rejected: { line: number; errors: string[] }[];
  duplicates: { line: number; id: string }[];
  summary: {
    rows: number;
    valid: number;
    rejected: number;
    duplicates: number;
    withWarnings: number;
    byProvincia: Record<string, number>;
    byTipo: Record<string, number>;
    byEstado: Record<string, number>;
  };
}

/** Valida todas las filas. Un id repetido conserva la primera aparición (línea 2 = primera fila de datos). */
export function planSupplierDirectoryImport(rows: SupplierDirectoryCsvRow[]): SupplierImportPlan {
  const valid: SupplierImportPlanItem[] = [];
  const rejected: SupplierImportPlan['rejected'] = [];
  const duplicates: SupplierImportPlan['duplicates'] = [];
  const seen = new Set<string>();
  rows.forEach((row, idx) => {
    const line = idx + 2;
    const result = validateSupplierDirectoryRow(row);
    if (!result.ok) { rejected.push({ line, errors: result.errors }); return; }
    if (seen.has(result.entry.id)) { duplicates.push({ line, id: result.entry.id }); return; }
    seen.add(result.entry.id);
    valid.push({ line, entry: result.entry, explicitState: String(row.estado_contacto ?? '').trim() !== '', warnings: result.warnings });
  });
  const count = (key: (e: SupplierDirectoryEntry) => string) =>
    valid.reduce<Record<string, number>>((acc, { entry }) => { const k = key(entry); acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  return {
    valid, rejected, duplicates,
    summary: {
      rows: rows.length,
      valid: valid.length,
      rejected: rejected.length,
      duplicates: duplicates.length,
      withWarnings: valid.filter(v => v.warnings.length).length,
      byProvincia: count(e => e.provincia),
      byTipo: count(e => e.tipo),
      byEstado: count(e => e.estado_contacto),
    },
  };
}

/** Documento a escribir: nunca pisa operator_id ni un estado ya guardado si el CSV no trae estado explícito. */
export function supplierDirectoryUpsertDoc(item: SupplierImportPlanItem, existing: Record<string, any> | null, nowIso: string) {
  const { operator_id: _ignored, estado_contacto, ...rest } = item.entry;
  const doc: Record<string, unknown> = { ...rest, updatedAt: nowIso, importedAt: nowIso };
  if (!existing) {
    doc.estado_contacto = estado_contacto;
    doc.operator_id = null;
    doc.createdAt = nowIso;
  } else if (item.explicitState || !isSupplierContactState(existing.estado_contacto)) {
    doc.estado_contacto = estado_contacto;
  }
  return doc;
}

type DirectoryDb = {
  collection(name: string): {
    doc(id: string): { get(): Promise<{ exists: boolean; data(): any }>; set(data: any, opts: { merge: true }): Promise<unknown> };
  };
};

/** Upsert con merge, uno por uno (sin batch de borrado; este módulo no borra nada). */
export async function applySupplierDirectoryPlan(db: DirectoryDb, plan: SupplierImportPlan, now: () => Date = () => new Date()) {
  let created = 0;
  let updated = 0;
  const col = db.collection(SUPPLIER_DIRECTORY_COLLECTION);
  for (const item of plan.valid) {
    const ref = col.doc(item.entry.id);
    const snap = await ref.get();
    const existing = snap.exists ? (snap.data() || {}) : null;
    await ref.set(supplierDirectoryUpsertDoc(item, existing, now().toISOString()), { merge: true });
    if (existing) updated++; else created++;
  }
  return { created, updated };
}

export class SupplierConversionError extends Error {
  constructor(public code: 'not_approved' | 'already_converted' | 'invalid_entry', message: string) {
    super(message);
    this.name = 'SupplierConversionError';
  }
}

/**
 * Convierte un registro APROBADO del directorio en un operador PENDIENTE (forma de `operators`).
 * Pura: no escribe. Quien la use debe crear el documento con create() (nunca sobrescribir un operador
 * existente) y guardar `directoryPatch` en `supplier_directory/{id}`.
 * La verificación (verified/active) y commissionRate quedan para el dueño, a mano.
 */
export function convertDirectoryEntryToPendingOperator(
  entry: SupplierDirectoryEntry,
  options: { now?: Date; operatorId?: string } = {},
) {
  if (!entry || typeof entry.id !== 'string' || !entry.nombre) throw new SupplierConversionError('invalid_entry', 'Registro del directorio inválido.');
  if (entry.estado_contacto !== 'aprobado') throw new SupplierConversionError('not_approved', 'Solo un registro con estado_contacto "aprobado" se convierte en operador pendiente.');
  if (entry.operator_id) throw new SupplierConversionError('already_converted', `Ya está enlazado al operador ${entry.operator_id}.`);
  const operatorId = options.operatorId ?? `dir-${entry.id}`.slice(0, 160);
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(operatorId)) throw new SupplierConversionError('invalid_entry', 'Identificador de operador inválido.');
  const nowIso = (options.now ?? new Date()).toISOString();
  const website = entry.contacto.web && entry.contacto.web.startsWith('https://') ? new URL(entry.contacto.web).origin : null;
  const operator = {
    name: entry.nombre,
    email: entry.contacto.email,
    phone: entry.contacto.telefono,
    whatsapp: entry.contacto.whatsapp,
    website,
    region: entry.region_turistica_ict,
    location: [entry.distrito, entry.canton, entry.provincia].filter(Boolean).join(', '),
    category: entry.tipo,
    activeTours: [] as string[],
    // Pendiente: nadie lo trata como operador real hasta la verificación manual del dueño.
    verified: false,
    active: false,
    status: 'pendiente_verificacion',
    // commissionRate se omite a propósito: isValidCommissionRate(undefined) === false → sin liquidación.
    ictDeclaratoria: entry.declaratoria_ict,
    cst: entry.cst,
    source: 'supplier_directory',
    supplierDirectoryId: entry.id,
    sourceUrl: entry.fuente_url,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  return { operatorId, operator, directoryPatch: { operator_id: operatorId, updatedAt: nowIso } };
}

export interface SupplierDirectoryFilters { provincia?: string; tipo?: string; estado?: string; limit?: number }

export type ParsedSupplierDirectoryFilters =
  | { ok: true; filters: { provincia?: CrProvince; tipo?: SupplierType; estado?: SupplierContactState; limit: number } }
  | { ok: false; error: string };

export function parseSupplierDirectoryFilters(query: Record<string, unknown>): ParsedSupplierDirectoryFilters {
  const filters: { provincia?: CrProvince; tipo?: SupplierType; estado?: SupplierContactState; limit: number } = {
    limit: Math.max(1, Math.min(500, Number(query.limit) || 100)),
  };
  if (query.provincia) {
    const provincia = normalizeProvince(query.provincia);
    if (!provincia) return { ok: false, error: 'provincia_invalida' };
    filters.provincia = provincia;
  }
  if (query.tipo) {
    const tipo = foldKey(query.tipo).replace(/[\s-]+/g, '_');
    if (!isSupplierType(tipo)) return { ok: false, error: 'tipo_invalido' };
    filters.tipo = tipo;
  }
  if (query.estado) {
    const estado = foldKey(query.estado).replace(/[\s-]+/g, '_');
    if (!isSupplierContactState(estado)) return { ok: false, error: 'estado_invalido' };
    filters.estado = estado;
  }
  return { ok: true, filters };
}

type QueryLike = { where(f: string, op: '==', v: unknown): QueryLike; limit(n: number): QueryLike; get(): Promise<{ docs: { id: string; data(): any }[] }> };

/** Solo lectura, acotada. Devuelve [] sin Firestore. */
export async function listSupplierDirectory(
  db: { collection(name: string): QueryLike } | null,
  filters: { provincia?: CrProvince; tipo?: SupplierType; estado?: SupplierContactState; limit: number },
) {
  if (!db) return { available: false as const, entries: [] as Record<string, unknown>[] };
  let query: QueryLike = db.collection(SUPPLIER_DIRECTORY_COLLECTION);
  if (filters.provincia) query = query.where('provincia', '==', filters.provincia);
  if (filters.tipo) query = query.where('tipo', '==', filters.tipo);
  if (filters.estado) query = query.where('estado_contacto', '==', filters.estado);
  const snap = await query.limit(filters.limit).get();
  return { available: true as const, entries: snap.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) })) };
}
