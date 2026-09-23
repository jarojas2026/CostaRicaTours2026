export const TOURISM_INTELLIGENCE_RULES = [
  'Priorizar la conectividad lógica entre regiones y evitar rutas redundantes.',
  'Verificar restricciones de edad, condición física y requisitos del operador antes de recomendar aventura.',
  'Separar conocimiento estable de condiciones vivas: clima, disponibilidad, horarios y cierres requieren verificación.',
  'Nunca convertir una estimación heurística en una promesa de disponibilidad, precio o seguridad.',
  'Optimizar conjuntamente duración, aeropuerto, ritmo, intereses, presupuesto y carga de traslados.'
];

export function buildIntelligenceInsights(query: string): string[] {
  const normalized = String(query || '').trim();
  return [
    normalized ? `Consulta analizada: "${normalized}".` : 'Consulta turística pendiente de preferencias.',
    'La disponibilidad y las condiciones operativas deben verificarse antes de confirmar.',
    'El itinerario puede adaptarse cuando cambien fecha, clima, disponibilidad o preferencias.'
  ];
}

export function assessTripFit(params: { query?: string; days?: number; airport?: string; profile?: any; intensity?: string; regions?: string[] }) {
  const days = Math.max(1, Math.min(Number(params.days) || 7, 21));
  const regions = (params.regions || []).filter(Boolean);
  const profile = String(params.profile || '').toLowerCase();
  const intensity = String(params.intensity || '').toLowerCase();
  const query = String(params.query || '').toLowerCase();

  const signals = [
    regions.length > 0,
    days >= Math.max(2, regions.length * 2),
    Boolean(params.airport),
    Boolean(profile),
    Boolean(query)
  ];
  const completeness = Math.round((signals.filter(Boolean).length / signals.length) * 100);
  const paceWarning = regions.length > Math.ceil(days / 2);
  const score = Math.max(0, Math.min(100, completeness - (paceWarning ? 15 : 0)));

  return {
    fitScore: score,
    confidence: score >= 80 ? 'high' : score >= 55 ? 'medium' : 'low',
    summary: paceWarning
      ? 'El plan tiene muchas regiones para el tiempo disponible; conviene reducir traslados.'
      : 'La compatibilidad es una estimación basada en las restricciones proporcionadas, no una garantía.',
    recommendations: [
      ...(regions.length ? [`Priorizar ${regions.slice(0, 4).join(', ')} y validar tiempos reales de traslado.`] : ['Definir regiones o intereses para mejorar el ajuste.']),
      ...(profile ? [`Mantener un ritmo compatible con el perfil "${profile}".`] : []),
      ...(intensity ? [`Contrastar la intensidad "${intensity}" con los requisitos de cada actividad.`] : [])
    ],
    estimatedBudgetUSD: undefined,
    basis: { days, regions, profile: profile || undefined, airport: params.airport || undefined }
  };
}

export function buildPackingList(params: { activities?: string[]; regions?: string[]; profile?: any }) {
  const activities = (params.activities || []).map(String).join(' ').toLowerCase();
  const regions = (params.regions || []).map(String).join(' ').toLowerCase();
  return {
    essentials: ['Protector solar', 'Repelente de insectos', 'Impermeable ligero', 'Botella reutilizable'],
    clothing: ['Ropa de secado rápido', 'Camisetas transpirables', 'Calzado cerrado cómodo'],
    gear: [
      ...(activities.match(/playa|beach|snorkel/) ? ['Traje de baño', 'Bolsa impermeable'] : []),
      ...(activities.match(/sender|hiking|canopy|rafting/) ? ['Calzado de senderismo', 'Mochila pequeña'] : []),
      ...(regions.match(/monteverde|arenal|osa|caribe/) ? ['Capa ligera para lluvia/cambios de temperatura'] : [])
    ]
  };
}

export function screenActivitySuitability(params: { activity?: string; age?: number; canSwim?: boolean; mobility?: string; fearOfHeights?: boolean; medicalConstraint?: string }) {
  const activity = String(params.activity || '').toLowerCase();
  const hasMedicalConstraint = Boolean(String(params.medicalConstraint || '').trim());
  const requiresSwimming = /rafting|snorkel|kayak|buceo|diving/.test(activity);
  const heightExposure = /canopy|zipline|tirolesa|puente colgante/.test(activity);
  const age = params.age;

  const issues: string[] = [];
  if (hasMedicalConstraint) issues.push('requiere revisión humana/médica antes de reservar');
  if (age !== undefined && (!Number.isFinite(age) || age < 0)) issues.push('edad no válida');
  if (requiresSwimming && params.canSwim === false) issues.push('la actividad puede requerir capacidad de natación');
  if (heightExposure && params.fearOfHeights) issues.push('exposición a altura');
  if (issues.length) {
    return { suitable: null, riskLevel: 'needs_review', notes: issues.join('; '), requiresOperatorVerification: true };
  }
  return {
    suitable: null,
    riskLevel: 'unknown',
    notes: 'No se puede declarar aptitud médica desde el sistema; confirmar requisitos del operador y circunstancias del viajero.',
    requiresOperatorVerification: true
  };
}

export function buildRouteStrategy(params: { regions?: string[]; days?: number; arrivalAirport?: string; departureAirport?: string }) {
  const regions = (params.regions || []).filter(Boolean);
  const days = Math.max(1, Math.min(Number(params.days) || 7, 21));
  const paceWarning = regions.length > Math.ceil(days / 2);
  return {
    route: regions.length ? regions : ['Por definir'],
    logistics: paceWarning
      ? 'La ruta puede generar demasiados traslados para la duración indicada.'
      : 'Ruta preliminar; validar tiempos y condiciones reales antes de confirmar traslados.',
    estimatedTransitHours: undefined,
    transferBurden: paceWarning ? 'alto' : regions.length > 2 ? 'medio' : 'bajo',
    airport: { arrival: params.arrivalAirport || 'SJO', departure: params.departureAirport || undefined }
  };
}

export function getDestinationIntelligence(regionId: string) {
  const id = String(regionId || '').toLowerCase();
  const seasonal = id.includes('guanacaste')
    ? 'Normalmente más seco entre diciembre y abril; lluvia más frecuente en la temporada verde.'
    : id.includes('caribe')
      ? 'El Caribe tiene patrones de lluvia distintos al Pacífico; revisar condiciones de la fecha.'
      : 'El clima varía por altitud y microclima; verificar condiciones actuales y pronóstico.';
  return {
    regionId,
    climate: 'Costa Rica presenta microclimas por región y elevación.',
    bestSeason: seasonal,
    highlights: ['Biodiversidad', 'Naturaleza', 'Experiencias locales'],
    liveVerificationRequired: true
  };
}
