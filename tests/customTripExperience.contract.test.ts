import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

test('custom trip funnel requests a structured multi-day itinerary instead of a fake instant package quote', () => {
  const funnel = read('src/components/CustomFunnelModal.tsx');
  assert.match(funnel, /requestKind: 'custom_multi_day_itinerary'/);
  assert.match(funnel, /journeyRequest:/);
  assert.match(funnel, /Crear itinerario con IA/);
  assert.doesNotMatch(funnel, /Estimado Total Paquete Completo/);
  assert.doesNotMatch(funnel, /10% Descuento Grupo Aplicado/);
  assert.doesNotMatch(funnel, /Incluye IVA \(13%\)/);
  assert.doesNotMatch(funnel, /\$\$\{totalUSD\}/);
});

test('customer intake routes structured custom trips through the existing Journey Orchestrator', () => {
  const intake = read('backend/customerIntakeGateway.ts');
  assert.match(intake, /buildTripJourney/);
  assert.match(intake, /buildStructuredJourneyAssistant/);
  assert.match(intake, /journey_orchestrator/);
  assert.match(intake, /Planificación multidía estructurada/);
  assert.doesNotMatch(intake, /multi\.\?destino\|personalizado/);
  assert.match(intake, /pendiente de cotización verificada/);
});

test('customer-facing intake renders markdown rather than raw formatting tokens', () => {
  const app = read('src/App.tsx');
  assert.match(app, /import ReactMarkdown from 'react-markdown'/);
  assert.match(app, /<ReactMarkdown/);
});
