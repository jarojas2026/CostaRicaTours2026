import rawData from './operatorProspects.json';

/**
 * Prospectos de operadores turísticos por región (investigación pública, oct. 2026).
 *
 * IMPORTANTE: son prospectos, no operadores verificados ni aliados con contrato.
 * No deben mostrarse al cliente como "verificados" ni usarse para confirmar reservas
 * hasta que `partnershipStatus` sea `acuerdo_firmado` y `verification` sea `verificado_ict`.
 * Fuente editable: operators/*.csv del proyecto → `python3 export_repo_json.py data/operators/operatorProspects.json`.
 * Vive fuera de src/ a propósito: contiene contactos de terceros y no debe entrar al bundle público.
 */

export type B2bProgram = 'publicado' | 'contactar' | 'no_visible';
export type OperatorVerification = 'prospecto_no_verificado' | 'verificado_ict';
export type PartnershipStatus = 'sin_contacto' | 'contactado' | 'en_negociacion' | 'acuerdo_firmado' | 'descartado';

export interface OperatorProspect {
  id: string;
  name: string;
  region: string;
  mainTours: string[];
  website: string | null;
  email: string | null;
  phoneWhatsapp: string | null;
  samplePrice: string | null;
  b2bProgram: B2bProgram;
  b2bNotes: string | null;
  ictStatus: string | null;
  sources: string[];
  notes: string | null;
  verification: OperatorVerification;
  partnershipStatus: PartnershipStatus;
}

export interface CatalogOperatorMatch {
  catalogTour: string;
  suggestedOperators: string;
  region: string;
}

export interface OperatorProspectsDataset {
  generatedAt: string;
  disclaimer: { es: string; en: string };
  operators: OperatorProspect[];
  catalogMatches: CatalogOperatorMatch[];
}

const B2B: readonly B2bProgram[] = ['publicado', 'contactar', 'no_visible'];
const VERIFICATION: readonly OperatorVerification[] = ['prospecto_no_verificado', 'verificado_ict'];
const PARTNERSHIP: readonly PartnershipStatus[] = ['sin_contacto', 'contactado', 'en_negociacion', 'acuerdo_firmado', 'descartado'];

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isOptStr = (v: unknown): boolean => v === null || isStr(v);
const isHttps = (v: unknown): boolean => isStr(v) && /^https?:\/\//.test(v);

/** Valida en tiempo de ejecución el dataset y devuelve la lista de errores (vacía si es válido). */
export function validateOperatorProspects(data: unknown): string[] {
  const errors: string[] = [];
  const d = data as Partial<OperatorProspectsDataset> | null;
  if (!d || !Array.isArray(d.operators) || !Array.isArray(d.catalogMatches)) return ['dataset: estructura inválida'];
  if (!isStr(d.disclaimer?.es) || !isStr(d.disclaimer?.en)) errors.push('dataset: falta disclaimer es/en');
  const ids = new Set<string>();
  d.operators.forEach((o, i) => {
    const at = `operators[${i}] (${o?.id ?? '?'})`;
    if (!isStr(o?.id) || !/^[a-z0-9-]+$/.test(o.id)) errors.push(`${at}: id inválido`);
    if (ids.has(o?.id)) errors.push(`${at}: id duplicado`);
    ids.add(o?.id);
    if (!isStr(o?.name) || !isStr(o?.region)) errors.push(`${at}: nombre/región requeridos`);
    if (!Array.isArray(o?.mainTours) || o.mainTours.length === 0) errors.push(`${at}: mainTours vacío`);
    if (o?.website !== null && !isHttps(o?.website)) errors.push(`${at}: website inválido`);
    (['email', 'phoneWhatsapp', 'samplePrice', 'b2bNotes', 'ictStatus', 'notes'] as const).forEach((k) => {
      if (!isOptStr(o?.[k])) errors.push(`${at}: ${k} inválido`);
    });
    if (!B2B.includes(o?.b2bProgram)) errors.push(`${at}: b2bProgram inválido`);
    if (!VERIFICATION.includes(o?.verification)) errors.push(`${at}: verification inválido`);
    if (!PARTNERSHIP.includes(o?.partnershipStatus)) errors.push(`${at}: partnershipStatus inválido`);
    if (!Array.isArray(o?.sources) || o.sources.length === 0 || !o.sources.every(isHttps)) errors.push(`${at}: requiere fuentes http(s)`);
  });
  d.catalogMatches.forEach((m, i) => {
    if (!isStr(m?.catalogTour) || !isStr(m?.suggestedOperators) || !isStr(m?.region)) errors.push(`catalogMatches[${i}]: incompleto`);
  });
  return errors;
}

const validationErrors = validateOperatorProspects(rawData);
if (validationErrors.length > 0) {
  throw new Error(`operatorProspects.json inválido: ${validationErrors.slice(0, 5).join('; ')}`);
}

export const OPERATOR_PROSPECTS = rawData as OperatorProspectsDataset;

export const getOperatorsByRegion = (region: string): OperatorProspect[] =>
  OPERATOR_PROSPECTS.operators.filter((o) => o.region === region);

export const getOperatorsWithB2bProgram = (): OperatorProspect[] =>
  OPERATOR_PROSPECTS.operators.filter((o) => o.b2bProgram === 'publicado');

/** Solo operadores aptos para vender: verificados y con acuerdo firmado. Hoy devuelve una lista vacía. */
export const getSellableOperators = (): OperatorProspect[] =>
  OPERATOR_PROSPECTS.operators.filter((o) => o.verification === 'verificado_ict' && o.partnershipStatus === 'acuerdo_firmado');
