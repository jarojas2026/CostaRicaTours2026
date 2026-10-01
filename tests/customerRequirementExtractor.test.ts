import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCustomerTravelRequirements } from '../backend/customerRequirementExtractor';

test('extracts confirmed lodging requirements from a customer message', () => {
  const result = extractCustomerTravelRequirements('Somos 2 adultos, 1 niña de 2.5 años. Sería del 25-28 de noviembre de 2026. Presupuesto de $200 por noche con desayuno incluido y parqueo. Hospedaje en Puerto Viejo de Limón.');
  assert.equal(result.adults, 2);
  assert.equal(result.children, 1);
  assert.deepEqual(result.childAges, [2.5]);
  assert.equal(result.checkIn, '2026-11-25');
  assert.equal(result.checkOut, '2026-11-28');
  assert.equal(result.nightlyBudgetUsd, 200);
  assert.equal(result.breakfast, true);
  assert.equal(result.parking, true);
  assert.match(result.destination || '', /Puerto Viejo/i);
});
