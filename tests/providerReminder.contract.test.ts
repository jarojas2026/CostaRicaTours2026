import assert from 'node:assert/strict';
import test from 'node:test';
import { decideReminder, buildReminderEmail, REMINDER_INTERVAL_MS, MAX_PROVIDER_REMINDERS } from '../backend/providerReminderService.ts';

const now = Date.parse('2026-10-18T12:00:00Z');
const past = new Date(now - 60_000).toISOString();
const future = new Date(now + 60_000).toISOString();

test('solo recuerda órdenes despachadas con SLA vencido', () => {
  assert.equal(decideReminder({ id: 'a', status: 'dispatched', slaDeadline: past }, now), 'remind');
  assert.equal(decideReminder({ id: 'b', status: 'dispatched', slaDeadline: future }, now), 'skip');
  assert.equal(decideReminder({ id: 'c', status: 'confirmed', slaDeadline: past }, now), 'skip');
  assert.equal(decideReminder({ id: 'd', status: 'dispatched' }, now), 'skip');
});

test('respeta la ventana de 6 horas entre recordatorios', () => {
  const recent = new Date(now - REMINDER_INTERVAL_MS + 1000).toISOString();
  const old = new Date(now - REMINDER_INTERVAL_MS - 1000).toISOString();
  assert.equal(decideReminder({ id: 'a', status: 'dispatched', slaDeadline: past, reminderCount: 1, lastReminderAt: recent }, now), 'skip');
  assert.equal(decideReminder({ id: 'a', status: 'dispatched', slaDeadline: past, reminderCount: 1, lastReminderAt: old }, now), 'remind');
});

test('escala una sola vez al agotar los recordatorios', () => {
  const old = new Date(now - REMINDER_INTERVAL_MS - 1000).toISOString();
  const base = { id: 'a', status: 'dispatched', slaDeadline: past, reminderCount: MAX_PROVIDER_REMINDERS, lastReminderAt: old };
  assert.equal(decideReminder(base, now), 'escalate');
  assert.equal(decideReminder({ ...base, reminderEscalatedAt: past }, now), 'skip');
});

test('el correo escapa HTML y no incluye datos de contacto del cliente', () => {
  const { subject, html } = buildReminderEmail({ id: 'OS-1', tourName: '<b>x</b>', date: '2026-10-20', customer: { phone: '+50688888888', email: 'c@x.com' } }, 1);
  assert.match(subject, /OS-1/);
  assert.ok(!html.includes('<b>x</b>'));
  assert.ok(!html.includes('+50688888888') && !html.includes('c@x.com'));
});
