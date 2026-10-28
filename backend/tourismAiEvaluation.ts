import { assessTourismEvidence, TOURISM_AI_GUARDRAILS } from './tourismAiQualityPolicy';
import { screenActivitySuitability, validateTripPlan } from './tourismIntelligenceEngine';

export type TourismAiEvaluationCase = {
  id: string;
  passed: boolean;
  detail: string;
};

export type TourismAiEvaluationReport = {
  mode: 'offline-deterministic';
  externalModelCalls: 0;
  externalNetworkCalls: 0;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  cases: TourismAiEvaluationCase[];
  guardrailsCount: number;
};

/**
 * Deterministic, offline regression suite for safety-critical tourism claims.
 * It intentionally does not instantiate an AI provider, read environment secrets,
 * access Firestore, or perform booking/payment actions.
 */
export function runTourismAiOfflineEvaluation(now = 1_000_000): TourismAiEvaluationReport {
  const cases: TourismAiEvaluationCase[] = [];
  const check = (id: string, condition: boolean, detail: string) => {
    cases.push({ id, passed: Boolean(condition), detail });
  };

  const missingAvailability = assessTourismEvidence({
    kind: 'availability', verified: true, source: 'booking-service', now
  });
  check(
    'availability_missing_timestamp_is_unknown',
    missingAvailability.status === 'unknown' && missingAvailability.requiresLiveVerification,
    'No se confirma disponibilidad si falta la marca temporal.'
  );

  const stalePayment = assessTourismEvidence({
    kind: 'payment', verified: true, source: 'payment-service', observedAt: now - 60_001, now
  });
  check(
    'stale_payment_is_rejected',
    stalePayment.status === 'stale' && stalePayment.requiresLiveVerification,
    'La evidencia de pago vencida no se acepta como confirmación.'
  );

  const futureWeather = assessTourismEvidence({
    kind: 'weather', verified: true, source: 'weather-service', observedAt: now + 1, now
  });
  check(
    'future_weather_timestamp_is_unknown',
    futureWeather.status === 'unknown',
    'Una observación futura o inválida no se considera verificada.'
  );

  const unavailablePlan = validateTripPlan({
    days: 4,
    regions: ['Arenal', 'Monteverde'],
    availability: [{ tourId: 'tour-demo', status: 'unavailable' }]
  });
  check(
    'unavailable_tour_blocks_plan',
    !unavailablePlan.valid && unavailablePlan.blockingIssues.length > 0,
    'Un tour no disponible bloquea la validación del plan.'
  );

  const overloadedPlan = validateTripPlan({
    days: 3,
    regions: ['Arenal', 'Monteverde', 'Guanacaste']
  });
  check(
    'overloaded_route_warns',
    overloadedPlan.warnings.length > 0,
    'Una ruta demasiado cargada genera una advertencia logística.'
  );

  const medicalReview = screenActivitySuitability({
    activity: 'rafting',
    medicalConstraint: 'needs review'
  });
  check(
    'medical_constraint_requires_human_review',
    medicalReview.suitable === null && medicalReview.requiresOperatorVerification,
    'El sistema no diagnostica aptitud y solicita revisión.'
  );

  check(
    'guardrails_cover_transactional_truth',
    TOURISM_AI_GUARDRAILS.some(rule => /No inventar precios, cupos, reservas, pagos/.test(rule)),
    'Las reglas explícitas prohíben inventar afirmaciones comerciales transaccionales.'
  );

  const passed = cases.filter(item => item.passed).length;
  return {
    mode: 'offline-deterministic',
    externalModelCalls: 0,
    externalNetworkCalls: 0,
    total: cases.length,
    passed,
    failed: cases.length - passed,
    passRate: cases.length ? Math.round((passed / cases.length) * 10_000) / 100 : 100,
    cases,
    guardrailsCount: TOURISM_AI_GUARDRAILS.length
  };
}
