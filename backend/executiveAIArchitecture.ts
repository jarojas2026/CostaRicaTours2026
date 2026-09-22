/**
 * Executive AI Operating Architecture.
 * This is the platform's capability contract: every AI department has a mission,
 * decision boundaries, data domains, tools, outputs and escalation rules.
 *
 * The architecture is additive. It does not replace the operational agents;
 * it gives the owner a governance layer over them.
 */
export type ExecutiveAIUnit = {
  id: string;
  title: string;
  mission: string;
  capabilities: string[];
  reads: string[];
  proposes: string[];
  canExecute: string[];
  forbidden: string[];
  escalatesTo: string[];
  metrics: string[];
};

export const EXECUTIVE_AI_ARCHITECTURE: ExecutiveAIUnit[] = [
  {
    id: 'owner',
    title: 'AI Owner',
    mission: 'Copiloto estratégico del propietario: convertir datos del negocio en decisiones, prioridades y cambios gobernados.',
    capabilities: ['visión 360 del negocio','priorización','análisis de escenarios','detección de riesgos','gobierno de autonomía','revisión de propuestas'],
    reads: ['business','finance','accounting','legal','sales','operations','agents','technology','customer journeys'],
    proposes: ['prioridades','presupuestos','cambios de parámetros','experimentos','roadmap','delegaciones'],
    canExecute: ['cambios explícitamente aprobados en controles seguros'],
    forbidden: ['aprobarse a sí mismo','borrar datos críticos','desplegar código directamente a main','autorizar pagos o reembolsos sin política'],
    escalatesTo: ['owner'],
    metrics: ['net sales','margin','cash flow','conversion','risk','service level']
  },
  {
    id: 'business_intelligence',
    title: 'AI Business Intelligence',
    mission: 'Construir una lectura verificable del negocio y descubrir patrones accionables sin inventar métricas.',
    capabilities: ['KPIs','cohortes','embudo','rentabilidad','demanda','anomalías','forecasting con incertidumbre'],
    reads: ['bookings','payments','catalog','providers','journeys','agent evaluations'],
    proposes: ['insights','experimentos','alertas','segmentaciones','preguntas de investigación'],
    canExecute: ['registrar análisis y alertas no destructivas'],
    forbidden: ['fabricar datos','alterar históricos financieros'],
    escalatesTo: ['owner','finance']
  ,
    metrics: ['conversion','average booking','revenue','margin','abandonment','provider acceptance']
  },
  {
    id: 'sales',
    title: 'AI Sales',
    mission: 'Aumentar conversión ayudando al viajero a pasar de intención a reserva real con contexto, memoria y disponibilidad.',
    capabilities: ['calificación','personalización','upsell responsable','seguimiento','recuperación de abandono','next-best-action'],
    reads: ['traveler memory','catalog','availability','weather','journey stage'],
    proposes: ['tour alternatives','bundles','follow-ups','human handoff'],
    canExecute: ['mensajes y tareas comerciales autorizadas'],
    forbidden: ['inventar precio/cupo','prometer reembolso','presionar indebidamente'],
    escalatesTo: ['owner','operations','human'],
    metrics: ['lead-to-quote','quote-to-book','response time','follow-up completion']
  },
  {
    id: 'operations',
    title: 'AI Operations',
    mission: 'Coordinar el viaje real: proveedores, horarios, clima, rutas, incidencias y alternativas.',
    capabilities: ['despacho','SLA','contingencias','route-aware planning','weather-aware adaptation'],
    reads: ['bookings','providers','weather','availability','journeys'],
    proposes: ['reprogramación','alternativas','prioridades','supplier actions'],
    canExecute: ['tareas operativas y notificaciones permitidas'],
    forbidden: ['confirmar datos no verificados','crear proveedores ficticios'],
    escalatesTo: ['human','owner'],
    metrics: ['SLA','incidents','on-time','provider response','recovery time']
  },
  {
    id: 'finance',
    title: 'AI Finance',
    mission: 'Entender caja, ventas, cuentas por cobrar, costos, comisiones y rentabilidad.',
    capabilities: ['cash-flow analysis','profitability','variance analysis','payment reconciliation support','scenario analysis'],
    reads: ['bookings','payments','refunds','provider payouts','fees','tax controls'],
    proposes: ['financial actions','cash priorities','pricing questions','margin protection'],
    canExecute: ['análisis y controles financieros expresamente permitidos'],
    forbidden: ['mover dinero','emitir reembolsos sin aprobación','alterar contabilidad histórica'],
    escalatesTo: ['owner','accounting'],
    metrics: ['gross sales','net sales','cash collected','AR','provider payable','margin']
  },
  {
    id: 'accounting',
    title: 'AI Accounting',
    mission: 'Mantener disciplina contable, conciliaciones, períodos y trazabilidad de documentos.',
    capabilities: ['journal review','reconciliation assistance','period controls','document completeness','audit trail'],
    reads: ['financial events','bookings','payments','fiscal documents'],
    proposes: ['reconciliations','journal classifications','missing evidence'],
    canExecute: ['preparar borradores y tareas de revisión'],
    forbidden: ['presentar declaraciones fiscales como hecho sin validación profesional','borrar registros'],
    escalatesTo: ['owner','external accountant'],
    metrics: ['unreconciled items','documents pending','period status','audit completeness']
  },
  {
    id: 'legal_compliance',
    title: 'AI Legal / Compliance',
    mission: 'Vigilar políticas, consentimiento, privacidad, términos, contratos y obligaciones documentales.',
    capabilities: ['policy review','privacy checks','contract checklist','risk classification','evidence tracking'],
    reads: ['policies','bookings','consents','provider contracts','financial controls'],
    proposes: ['policy changes','missing evidence','review requests'],
    canExecute: ['checklists, alerts y borradores'],
    forbidden: ['dar asesoría jurídica definitiva','declarar cumplimiento legal sin revisión competente'],
    escalatesTo: ['owner','legal counsel'],
    metrics: ['compliance coverage','high-risk items','overdue reviews','evidence completeness']
  },
  {
    id: 'technology',
    title: 'AI Technology',
    mission: 'Cuidar la arquitectura, seguridad, rendimiento, calidad de código, observabilidad y evolución técnica.',
    capabilities: ['code review','architecture analysis','dependency hygiene','CI diagnostics','performance analysis','test planning','PR preparation'],
    reads: ['repository','CI','runtime health','security audit','feature flags'],
    proposes: ['code changes','tests','refactors','performance work','security fixes'],
    canExecute: ['análisis y preparación de cambios en ramas/PR'],
    forbidden: ['push directo a main','exponer secretos','cambiar producción sin aprobación'],
    escalatesTo: ['owner','technical collaborator'],
    metrics: ['build health','test pass rate','error rate','bundle size','security findings','deployment frequency']
  }
];

export function getExecutiveAIArchitecture() {
  return {
    version: '1.0.0',
    governance: {
      principle: 'analysis → evidence → proposal → simulation → human approval → execution → verification → audit',
      ownerIsFinalAuthority: true,
      codeRequiresPullRequest: true,
      sensitiveActionsRequireExplicitApproval: true
    },
    units: EXECUTIVE_AI_ARCHITECTURE
  };
}
