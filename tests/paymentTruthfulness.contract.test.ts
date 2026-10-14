import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { paypalOrderMatchesBooking, stripeSessionMatchesBooking } from '../backend/bookingService';
import { executeNotificarProveedor, executePostTourNPS, executeSyncCalendar, executeSolicitudSoporte, executeGenericAutomation } from '../backend/nativeAutomationEngine';
import { readServerSource } from '../scripts/lib/serverSource';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const expected = { bookingId: 'CR-PV-1111', totalUSD: 150 };

test('Stripe sessions are accepted only for the same booking, amount and currency', () => {
  const paid = { payment_status: 'paid', currency: 'usd', amount_total: 15000, metadata: { bookingId: 'CR-PV-1111' } };
  assert.equal(stripeSessionMatchesBooking(paid, expected), true);
  assert.equal(stripeSessionMatchesBooking({ ...paid, metadata: { bookingId: 'CR-PV-2222' } }, expected), false, 'other booking');
  assert.equal(stripeSessionMatchesBooking({ ...paid, amount_total: 100 }, expected), false, 'cheaper amount');
  assert.equal(stripeSessionMatchesBooking({ ...paid, currency: 'eur' }, expected), false, 'other currency');
  assert.equal(stripeSessionMatchesBooking({ ...paid, payment_status: 'unpaid' }, expected), false, 'unpaid');
  assert.equal(stripeSessionMatchesBooking({ ...paid, metadata: {}, client_reference_id: 'CR-PV-1111' }, expected), true, 'client_reference_id fallback');
});

test('PayPal orders are accepted only with matching custom_id, amount and USD', () => {
  const order = { status: 'COMPLETED', purchase_units: [{ custom_id: 'CR-PV-1111', amount: { currency_code: 'USD', value: '150.00' } }] };
  assert.equal(paypalOrderMatchesBooking(order, expected), true);
  assert.equal(paypalOrderMatchesBooking({ ...order, purchase_units: [{ ...order.purchase_units[0], custom_id: 'CR-PV-2222' }] }, expected), false);
  assert.equal(paypalOrderMatchesBooking({ ...order, purchase_units: [{ ...order.purchase_units[0], amount: { currency_code: 'USD', value: '1.00' } }] }, expected), false);
  assert.equal(paypalOrderMatchesBooking({ ...order, purchase_units: [{ ...order.purchase_units[0], amount: { currency_code: 'CRC', value: '150.00' } }] }, expected), false);
  assert.equal(paypalOrderMatchesBooking({ ...order, status: 'APPROVED' }, expected), false);
});

test('confirmation endpoint reports confirmed only after a successful update and never invents vouchers or notifications', () => {
  const engine = read('backend/nativeAutomationEngine.ts');
  const block = engine.slice(engine.indexOf('export async function executeConfirmacionReserva'), engine.indexOf('export async function executeSolicitudItinerario'));
  assert.match(block, /verifyPaymentServerSide\(paymentMethod, paymentDetails, \{/);
  assert.match(block, /if \(!update\.success\)/);
  assert.doesNotMatch(block, /100% CONFIRMADA/);
  assert.doesNotMatch(block, /costaricatours\.cr\/vouchers/);
  assert.doesNotMatch(block, /whatsapp_business_api/);
  assert.match(block, /voucherEmitido: false/);
});

test('unimplemented automations answer pending_manual instead of fake success', async () => {
  for (const result of [
    await executeNotificarProveedor({ bookingId: 'X' }),
    await executeSyncCalendar({ bookingId: 'X' }),
    await executePostTourNPS({ bookingId: 'X' }),
    await executeSolicitudSoporte({ motivo: 'ayuda' }),
    await executeGenericAutomation('ALERTA_EMERGENCIA_SOS', {}),
  ] as any[]) {
    assert.equal(result.exito, false);
    assert.equal(result.estado, 'pending_manual');
    assert.equal(result.implementado, false);
    assert.equal('promoCode' in result, false);
  }
  const engine = read('backend/nativeAutomationEngine.ts');
  assert.doesNotMatch(engine, /Carlos Montero/);
  assert.doesNotMatch(engine, /PURAVIDA15-\$\{Math/);
  assert.doesNotMatch(engine, /Placa: SJ-8924/);
  assert.doesNotMatch(read('backend/nativeWorkflows.ts'), /PURAVIDA15-\$\{bookingId/);
});

test('legacy catch-alls and agent tools do not invent results', () => {
  const server = readServerSource();
  assert.match(server, /app\.post\('\/api\/workflows\/:action'[\s\S]{0,80}res\.status\(501\)/);
  assert.match(server, /app\.post\('\/api\/gemini\/:action'[\s\S]{0,80}res\.status\(501\)/);
  assert.doesNotMatch(server, /\['07:00', '08:30', '13:30'\]/);
  assert.match(server, /slots_status: 'pending_provider_confirmation'/);
  assert.match(server, /departure_time_not_in_catalog/);
  assert.match(server, /BOOKING_PATCH_ALLOWED_FIELDS/);
  const patchBlock = server.slice(server.indexOf('const BOOKING_PATCH_ALLOWED_FIELDS'), server.indexOf("app.patch('/api/bookings/:id'"));
  for (const forbidden of ['paymentStatus', 'totalUSD', 'providerConfirmedAt', 'providerStatus', 'customerEmail']) {
    assert.doesNotMatch(patchBlock, new RegExp(`'${forbidden}'`), forbidden);
  }
});

test('in-chat booking never shows a confirmation the server did not return', () => {
  const assistant = read('src/components/AIAssistant.tsx');
  const block = assistant.slice(assistant.indexOf('const handleConfirmInChatBooking'), assistant.indexOf('const handleQuickActionClick'));
  assert.match(block, /res\.ok/);
  assert.match(block, /Solicitud recibida, pendiente de confirmación/);
  assert.doesNotMatch(block, /status: .*'confirmada'/);
  assert.doesNotMatch(block, /Reserva Confirmada/);
  assert.doesNotMatch(block, /bookingId: genId/);
  const counter = read('backend/aiAssistantService.ts');
  assert.doesNotMatch(counter, /RESERVA EJECUTADA Y CONFIRMADA/);
  assert.doesNotMatch(counter, /Voucher Digital QR\*\*: Generado y despachado/);
});

test('Alsama Tours is presented as a reference provider, never as official/verified', () => {
  const files = ['backend/aiAssistantService.ts', 'backend/claudeService.ts', 'backend/nativeWorkflows.ts', 'backend/nativeAutomationEngine.ts', 'src/components/NationalTransportSection.tsx', 'src/components/ItineraryPlanner.tsx', 'metadata.json'];
  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /Proveedor Oficial Verificado/i, file);
    assert.doesNotMatch(source, /Tarifa Oficial/, file);
    assert.doesNotMatch(source, /Official Rate/, file);
    assert.doesNotMatch(source, /garantía de tarifa oficial/i, file);
    assert.doesNotMatch(source, /Garantía Oficial Alsama/i, file);
    assert.doesNotMatch(source, /Traslados Privados Oficiales/i, file);
  }
  assert.doesNotMatch(read('metadata.json'), /24\/7/);
  assert.match(read('backend/aiAssistantService.ts'), /tarifa de referencia, sujeta a confirmación/);
});
