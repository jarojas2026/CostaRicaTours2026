// ⚠️ DATOS DE DEMOSTRACIÓN — estos contadores NO reflejan actividad real todavía. Ver 2026-09-14 para la decisión pendiente sobre este módulo.
/**
 * ⚠️ AVISO DE AUDITORÍA (2026-09-14)
 * =========================================================================
 * Este módulo contiene estructuras demostrativas preliminares para métricas y
 * contadores autónomos proyectados (asignación de choferes, emisión de incentivos NPS, etc.).
 * 
 * Estado actual: MÓDULO DEMO / PLACEHOLDER NO CONECTADO A DATOS REALES DE PRODUCCIÓN.
 * Pendiente de decisión de negocio:
 *   1. Eliminar por completo si la analítica se alimenta exclusivamente de Firestore.
 *   2. Conectar a colecciones reales de Firestore (ej: historial de asignación de choferes).
 *   3. Mantener etiquetado explícitamente como 'Vista previa / Demo' en el panel de control.
 * =========================================================================
 */

export interface AutonomousEngineStats {
  totalAutomatedActions: number;
  driversAutoAssigned: number;
  npsBoosterCodesIssued: number;
  activeAutomatedRules: number;
  averageResponseTimeMs: number;
  isDemoData: true;
}

export const DEMO_AUTONOMOUS_STATS: AutonomousEngineStats = {
  totalAutomatedActions: 0,
  driversAutoAssigned: 0,
  npsBoosterCodesIssued: 0,
  activeAutomatedRules: 24,
  averageResponseTimeMs: 0,
  isDemoData: true
};

export function getAutonomousDemoStats(): AutonomousEngineStats {
  return DEMO_AUTONOMOUS_STATS;
}
