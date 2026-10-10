import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

test('custom trip funnel captures reservation-ready context instead of inventing an instant package quote', () => {
  const funnel = read('src/components/CustomFunnelModal.tsx');
  assert.match(funnel, /requestKind: 'custom_multi_day_itinerary'/);
  assert.match(funnel, /journeyRequest:/);
  assert.match(funnel, /startDate/);
  assert.match(funnel, /departureAirport/);
  assert.match(funnel, /pace/);
  assert.match(funnel, /budgetUSD/);
  assert.match(funnel, /specialRequests/);
  assert.match(funnel, /customerEmail/);
  assert.match(funnel, /requestQuote/);
  assert.match(funnel, /Crear plan y verificar para cotizar/);
  assert.doesNotMatch(funnel, /Estimado Total Paquete Completo/);
  assert.doesNotMatch(funnel, /10% Descuento Grupo Aplicado/);
  assert.doesNotMatch(funnel, /Incluye IVA \(13%\)/);
  assert.doesNotMatch(funnel, /Garantiza entradas/);
  assert.doesNotMatch(funnel, /paradas ilimitadas/);
  assert.doesNotMatch(funnel, /seguro full/);
  assert.doesNotMatch(funnel, /Sansa \/ VIP/);
  assert.doesNotMatch(funnel, /Drive CR/);
});

test('custom trip funnel uses stable destination ids and migrates legacy labels', () => {
  const funnel = read('src/components/CustomFunnelModal.tsx');
  assert.match(funnel, /const DESTINATION_OPTIONS/);
  assert.match(funnel, /normalizeSavedDestinations/);
  assert.match(funnel, /\['Arenal', 'Manuel Antonio'\]/);
  assert.match(funnel, /key=\{dest\.id\}/);
  assert.match(funnel, /toggleDestination\(dest\.id\)/);
});

test('customer intake routes structured custom trips through Journey Orchestrator and the existing verification workflow', () => {
  const intake = read('backend/customerIntakeGateway.ts');
  assert.match(intake, /buildTripJourney/);
  assert.match(intake, /executeBusinessGoal/);
  assert.match(intake, /buildStructuredJourneyAssistant/);
  assert.match(intake, /requestedGoal: 'itinerary_quote'/);
  assert.match(intake, /missingQuoteInputs/);
  assert.match(intake, /customerCommunicationState/);
  assert.match(intake, /journey_orchestrator/);
  assert.match(intake, /Planificación multidía estructurada/);
  assert.doesNotMatch(intake, /multi\.\?destino\|personalizado/);
  assert.match(intake, /no se inventó un total de paquete/);
});

test('journey planner builds professional day-by-day context and labels internal capacity truthfully', () => {
  const journey = read('backend/travelJourneyOrchestrator.ts');
  const verification = read('backend/journeyVerificationService.ts');
  assert.match(journey, /buildProfessionalDays/);
  assert.match(journey, /morning:/);
  assert.match(journey, /afternoon:/);
  assert.match(journey, /evening:/);
  assert.match(journey, /serviceStatus/);
  assert.match(journey, /internal_capacity_signal_not_provider_confirmation/);
  assert.match(journey, /estimateKind: 'catalog_reference_not_quote'/);
  assert.match(verification, /providerConfirmed: false/);
  assert.match(verification, /bookingService_internal_capacity/);
  assert.match(verification, /no equivale a confirmación de inventario del proveedor/);
});

test('journey agent tools accept the same rich traveler context as the custom-trip form', () => {
  const tools = read('backend/agentTools.ts');
  for (const field of ['adults', 'children', 'pace', 'budgetUSD', 'priorities', 'transportPreference', 'lodgingPreference', 'specialRequests']) {
    assert.match(tools, new RegExp(field));
  }
  assert.match(tools, /provider-confirmed inventory/);
});

test('customer-facing intake renders markdown and preserves the active journey reference', () => {
  const app = read('src/App.tsx');
  const intakeUtil = read('src/utils/customerIntake.ts');
  assert.match(app, /import ReactMarkdown from 'react-markdown'/);
  assert.match(app, /<ReactMarkdown/);
  assert.match(app, /crt_active_journey/);
  assert.match(intakeUtil, /journeyId\?: string/);
  assert.match(intakeUtil, /workflow\?: unknown/);
});
