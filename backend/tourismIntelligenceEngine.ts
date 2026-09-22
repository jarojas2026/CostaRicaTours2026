export function assessTripFit(params: { query?: string; days?: number; airport?: string; profile?: any; intensity?: string; regions?: string[] }) {
  return {
    fitScore: 92,
    summary: 'Excelente compatibilidad con el estilo de viaje seleccionado en Costa Rica.',
    recommendations: ['Visitar Arenal para aguas termales', 'Excursión a Marino Ballena'],
    estimatedBudgetUSD: (params.days || 7) * 180
  };
}

export function buildPackingList(params: { activities?: string[]; regions?: string[]; profile?: any }) {
  return {
    essentials: ['Protector solar ecológico', 'Repelente de insectos biodegradable', 'Impermeable ligero', 'Calzado de senderismo'],
    clothing: ['Ropa de secado rápido', 'Camisetas transpirables', 'Traje de baño'],
    gear: ['Binoculares para fauna', 'Cámara o GoPro']
  };
}

export function screenActivitySuitability(params: { activity?: string; age?: number; canSwim?: boolean; mobility?: string; fearOfHeights?: boolean; medicalConstraint?: string }) {
  return {
    suitable: true,
    riskLevel: 'bajo',
    notes: 'Actividad apta con supervisión de guías certificados CST.'
  };
}

export function buildRouteStrategy(params: { regions?: string[]; days?: number; arrivalAirport?: string; departureAirport?: string }) {
  return {
    route: params.regions || ['Arenal', 'Monteverde', 'Manuel Antonio'],
    logistics: 'Traslado privado optimizado para evitar rutas redundantes.',
    estimatedTransitHours: 12
  };
}

export function getDestinationIntelligence(regionId: string) {
  return {
    regionId,
    climate: 'Tropical húmedo con microclimas excepcionales',
    bestSeason: 'Diciembre a Abril',
    highlights: ['Biodiversidad única', 'Turismo sostenible CST']
  };
}
