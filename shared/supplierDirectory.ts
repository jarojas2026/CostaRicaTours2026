/**
 * Directorio de proveedores (prospección) — esquema compartido, geografía oficial y validación.
 *
 * QUÉ ES: una lista interna de negocios turísticos de Costa Rica a contactar (fuente pública,
 * importada por CSV con scripts/importSupplierDirectory.ts). Vive en la colección Firestore
 * `supplier_directory`, solo de servidor (la cubre el `deny` catch-all de firestore.rules).
 *
 * QUÉ NO ES: no es un operador verificado, ni un aliado con contrato, ni una oferta vendible.
 * Los operadores reales siguen en `operators` / `proveedores` (agentQuote.contractualCommissionRate,
 * providerPayoutService, operationalProviderRegistryService). Un registro del directorio solo
 * pasa a `operators` como PENDIENTE (verified=false, active=false, sin commissionRate) mediante
 * backend/supplierDirectory.ts → convertDirectoryEntryToPendingOperator; la verificación y la
 * comisión las fija el dueño a mano (POST /api/admin/commerce/provider, con evidencia).
 *
 * Módulo puro: sin Firestore, sin red, sin dependencias. No importar desde src/ (contiene
 * contactos de terceros cuando se usa con datos reales).
 */

export const SUPPLIER_DIRECTORY_COLLECTION = 'supplier_directory' as const;

export const SUPPLIER_CONTACT_STATES = ['sin_contactar', 'contactado', 'negociando', 'aprobado', 'rechazado'] as const;
export type SupplierContactState = (typeof SUPPLIER_CONTACT_STATES)[number];

export const SUPPLIER_TYPES = [
  'operador_tours', 'agencia_viajes', 'hospedaje', 'transporte', 'restaurante',
  'actividad_aventura', 'guia', 'atraccion', 'otro',
] as const;
export type SupplierType = (typeof SUPPLIER_TYPES)[number];

/**
 * Unidades de Planeamiento Turístico del ICT (Plan Nacional de Desarrollo Turístico; diez unidades).
 * Fuente: https://ict.go.cr/en/documents/plan-nacional-y-planes-generales/planes-generales-por-unidad-de-planeamiento.html
 */
export const ICT_TOURISM_REGIONS = [
  'Caribe Norte', 'Caribe Sur', 'Guanacaste Norte', 'Guanacaste Sur', 'Llanuras del Norte',
  'Monteverde', 'Pacífico Medio', 'Pacífico Sur', 'Puntarenas e Islas del Golfo', 'Valle Central',
] as const;
export type IctTourismRegion = (typeof ICT_TOURISM_REGIONS)[number];

/** Alias frecuentes → nombre oficial de la unidad (comparación sin tildes ni mayúsculas). */
const ICT_REGION_ALIASES: Record<string, IctTourismRegion> = {
  'pacifico central': 'Pacífico Medio',
  'puntarenas': 'Puntarenas e Islas del Golfo',
  'puntarenas e islas': 'Puntarenas e Islas del Golfo',
};

/**
 * Provincias y sus 84 cantones con el nombre oficial vigente (incluye Río Cuarto, Monteverde y
 * Puerto Jiménez). Los distritos no se validan contra lista (más de 480): solo se normalizan.
 */
export const CR_CANTONS_BY_PROVINCE = {
  'San José': ['San José', 'Escazú', 'Desamparados', 'Puriscal', 'Tarrazú', 'Aserrí', 'Mora', 'Goicoechea', 'Santa Ana', 'Alajuelita', 'Vázquez de Coronado', 'Acosta', 'Tibás', 'Moravia', 'Montes de Oca', 'Turrubares', 'Dota', 'Curridabat', 'Pérez Zeledón', 'León Cortés Castro'],
  'Alajuela': ['Alajuela', 'San Ramón', 'Grecia', 'San Mateo', 'Atenas', 'Naranjo', 'Palmares', 'Poás', 'Orotina', 'San Carlos', 'Zarcero', 'Sarchí', 'Upala', 'Los Chiles', 'Guatuso', 'Río Cuarto'],
  'Cartago': ['Cartago', 'Paraíso', 'La Unión', 'Jiménez', 'Turrialba', 'Alvarado', 'Oreamuno', 'El Guarco'],
  'Heredia': ['Heredia', 'Barva', 'Santo Domingo', 'Santa Bárbara', 'San Rafael', 'San Isidro', 'Belén', 'Flores', 'San Pablo', 'Sarapiquí'],
  'Guanacaste': ['Liberia', 'Nicoya', 'Santa Cruz', 'Bagaces', 'Carrillo', 'Cañas', 'Abangares', 'Tilarán', 'Nandayure', 'La Cruz', 'Hojancha'],
  'Puntarenas': ['Puntarenas', 'Esparza', 'Buenos Aires', 'Montes de Oro', 'Osa', 'Quepos', 'Golfito', 'Coto Brus', 'Parrita', 'Corredores', 'Garabito', 'Monteverde', 'Puerto Jiménez'],
  'Limón': ['Limón', 'Pococí', 'Siquirres', 'Talamanca', 'Matina', 'Guácimo'],
} as const;
export type CrProvince = keyof typeof CR_CANTONS_BY_PROVINCE;
export const CR_PROVINCES = Object.keys(CR_CANTONS_BY_PROVINCE) as CrProvince[];

/** Nombres anteriores o abreviados → nombre oficial del cantón. */
const CANTON_ALIASES: Record<string, string> = {
  'aguirre': 'Quepos',
  'valverde vega': 'Sarchí',
  'coronado': 'Vázquez de Coronado',
  'leon cortes': 'León Cortés Castro',
  'perez zeledon (san isidro del general)': 'Pérez Zeledón',
};

export interface SupplierDirectoryContact {
  telefono: string | null;
  email: string | null;
  web: string | null;
  whatsapp: string | null;
}

/** Documento de `supplier_directory/{id}`. */
export interface SupplierDirectoryEntry {
  id: string;
  nombre: string;
  razon_social: string | null;
  tipo: SupplierType;
  provincia: CrProvince;
  canton: string;
  distrito: string | null;
  region_turistica_ict: IctTourismRegion | null;
  lat: number | null;
  lng: number | null;
  productos: string[];
  contacto: SupplierDirectoryContact;
  declaratoria_ict: boolean | null;
  cst: string | null;
  fuente_url: string;
  fecha_extraccion: string | null;
  estado_contacto: SupplierContactState;
  /** id en `operators` cuando el registro se convirtió en operador pendiente. */
  operator_id: string | null;
}

export const SUPPLIER_DIRECTORY_CSV_COLUMNS = [
  'id', 'nombre', 'razon_social', 'tipo', 'provincia', 'canton', 'distrito', 'region_turistica_ict',
  'lat', 'lng', 'productos_tours', 'telefono', 'email', 'web', 'whatsapp', 'declaratoria_ict', 'cst',
  'fuente_url', 'fecha_extraccion', 'estado_contacto',
] as const;
export type SupplierDirectoryCsvRow = Partial<Record<(typeof SUPPLIER_DIRECTORY_CSV_COLUMNS)[number], string>>;

export const isSupplierContactState = (v: unknown): v is SupplierContactState =>
  typeof v === 'string' && (SUPPLIER_CONTACT_STATES as readonly string[]).includes(v);
export const isSupplierType = (v: unknown): v is SupplierType =>
  typeof v === 'string' && (SUPPLIER_TYPES as readonly string[]).includes(v);

/** Clave de comparación: sin tildes, minúsculas, espacios colapsados. */
export function foldKey(value: unknown): string {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const clean = (value: unknown, max = 300) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const optional = (value: unknown, max = 300) => clean(value, max) || null;

export function normalizeProvince(value: unknown): CrProvince | null {
  const key = foldKey(value).replace(/^provincia de /, '');
  return CR_PROVINCES.find(p => foldKey(p) === key) ?? null;
}

export function normalizeCanton(province: CrProvince, value: unknown): string | null {
  const key = foldKey(value).replace(/^canton (de )?/, '');
  const list = CR_CANTONS_BY_PROVINCE[province] as readonly string[];
  const aliased = CANTON_ALIASES[key];
  if (aliased && list.includes(aliased)) return aliased;
  if (key === 'central') return list[0];
  return list.find(c => foldKey(c) === key) ?? null;
}

export function normalizeIctRegion(value: unknown): IctTourismRegion | null {
  const key = foldKey(value);
  if (!key) return null;
  return ICT_TOURISM_REGIONS.find(r => foldKey(r) === key) ?? ICT_REGION_ALIASES[key] ?? null;
}

function normalizeType(value: unknown): SupplierType | null {
  const key = foldKey(value).replace(/[\s-]+/g, '_');
  if (!key) return 'otro';
  return isSupplierType(key) ? key : null;
}

function normalizeState(value: unknown): SupplierContactState | null {
  const key = foldKey(value).replace(/[\s-]+/g, '_');
  if (!key) return 'sin_contactar';
  return isSupplierContactState(key) ? key : null;
}

function normalizeBool(value: unknown): boolean | null | 'invalid' {
  const key = foldKey(value);
  if (!key) return null;
  if (['si', 'sí', 'true', '1', 'yes', 'x'].includes(key)) return true;
  if (['no', 'false', '0'].includes(key)) return false;
  return 'invalid';
}

function normalizeUrl(value: unknown): string | null | 'invalid' {
  const raw = clean(value, 800);
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) return 'invalid';
    return url.toString();
  } catch {
    return 'invalid';
  }
}

/** Teléfono a E.164 (+506XXXXXXXX para números nacionales de 8 dígitos); null si no se puede. */
export function normalizeCrPhone(value: unknown): string | null {
  const raw = clean(value, 60);
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, '');
  const bare = digits.replace(/^\+/, '');
  if (/^\d{8}$/.test(bare)) return `+506${bare}`;
  if (/^506\d{8}$/.test(bare)) return `+${bare}`;
  if (digits.startsWith('+') && /^\+[1-9]\d{7,14}$/.test(digits)) return digits;
  return null;
}

function normalizeCoord(value: unknown, min: number, max: number): number | null | 'invalid' {
  const raw = clean(value, 40).replace(',', '.');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= min && n <= max ? Number(n.toFixed(6)) : 'invalid';
}

function normalizeId(value: unknown, nombre: string, canton: string): string | null {
  const raw = clean(value, 120) || `${nombre}-${canton}`;
  const slug = foldKey(raw).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
  return /^[a-z0-9][a-z0-9-]{0,99}$/.test(slug) ? slug : null;
}

export type SupplierDirectoryValidation =
  | { ok: true; entry: SupplierDirectoryEntry; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] };

/**
 * Valida y normaliza una fila CSV. Errores = la fila no se importa; avisos = se importa con el
 * campo en null (p. ej. teléfono no convertible a E.164).
 */
export function validateSupplierDirectoryRow(row: SupplierDirectoryCsvRow): SupplierDirectoryValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nombre = clean(row.nombre, 200);
  if (nombre.length < 2) errors.push('nombre requerido');

  const provincia = normalizeProvince(row.provincia);
  if (!provincia) errors.push(`provincia inválida: "${clean(row.provincia, 60)}"`);
  const canton = provincia ? normalizeCanton(provincia, row.canton) : null;
  if (provincia && !canton) errors.push(`cantón inválido para ${provincia}: "${clean(row.canton, 60)}"`);

  const tipo = normalizeType(row.tipo);
  if (!tipo) errors.push(`tipo inválido: "${clean(row.tipo, 60)}" (use ${SUPPLIER_TYPES.join(', ')})`);
  const estado = normalizeState(row.estado_contacto);
  if (!estado) errors.push(`estado_contacto inválido: "${clean(row.estado_contacto, 40)}" (use ${SUPPLIER_CONTACT_STATES.join(', ')})`);

  const regionRaw = clean(row.region_turistica_ict, 80);
  const region = normalizeIctRegion(regionRaw);
  if (regionRaw && !region) warnings.push(`region_turistica_ict desconocida: "${regionRaw}" (queda en blanco)`);

  const lat = normalizeCoord(row.lat, 5, 12);
  const lng = normalizeCoord(row.lng, -88, -82);
  if (lat === 'invalid' || lng === 'invalid' || (lat === null) !== (lng === null)) {
    warnings.push('coordenadas fuera de Costa Rica o incompletas (quedan en blanco)');
  }
  const coordsOk = typeof lat === 'number' && typeof lng === 'number';

  const fuente = normalizeUrl(row.fuente_url);
  if (fuente === null || fuente === 'invalid') errors.push('fuente_url requerida (http/https)');

  const web = normalizeUrl(row.web);
  if (web === 'invalid') warnings.push('web inválida (queda en blanco)');

  const emailRaw = clean(row.email, 254).toLowerCase();
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw : null;
  if (emailRaw && !email) warnings.push('email inválido (queda en blanco)');

  const telefono = normalizeCrPhone(row.telefono);
  if (clean(row.telefono) && !telefono) warnings.push('teléfono no convertible a E.164 (queda en blanco)');
  const whatsapp = normalizeCrPhone(row.whatsapp);
  if (clean(row.whatsapp) && !whatsapp) warnings.push('whatsapp no convertible a E.164 (queda en blanco)');

  const declaratoria = normalizeBool(row.declaratoria_ict);
  if (declaratoria === 'invalid') warnings.push('declaratoria_ict no es sí/no (queda en blanco)');

  const fechaRaw = clean(row.fecha_extraccion, 20);
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaRaw) && !Number.isNaN(Date.parse(`${fechaRaw}T00:00:00Z`)) ? fechaRaw : null;
  if (fechaRaw && !fecha) warnings.push('fecha_extraccion no es YYYY-MM-DD (queda en blanco)');

  const id = normalizeId(row.id, nombre, canton || '');
  if (!id) errors.push('id inválido');

  const productos = String(row.productos_tours ?? '')
    .split(/[;|]/).map(p => clean(p, 160)).filter(Boolean).slice(0, 40);

  if (errors.length) return { ok: false, errors, warnings };
  return {
    ok: true,
    warnings,
    entry: {
      id: id!,
      nombre,
      razon_social: optional(row.razon_social, 200),
      tipo: tipo!,
      provincia: provincia!,
      canton: canton!,
      distrito: optional(row.distrito, 80),
      region_turistica_ict: region,
      lat: coordsOk ? (lat as number) : null,
      lng: coordsOk ? (lng as number) : null,
      productos,
      contacto: { telefono, email, web: web === 'invalid' ? null : web, whatsapp },
      declaratoria_ict: declaratoria === 'invalid' ? null : declaratoria,
      cst: optional(row.cst, 80),
      fuente_url: fuente as string,
      fecha_extraccion: fecha,
      estado_contacto: estado!,
      operator_id: null,
    },
  };
}
