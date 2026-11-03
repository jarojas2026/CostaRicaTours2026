import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const assistant = readFileSync('src/components/AIAssistant.tsx', 'utf8');

test('AI service failure gives an honest bilingual unavailable message without a retry loop', () => {
  const sendHandler = assistant.slice(
    assistant.indexOf('const handleSendMessage = async'),
    assistant.indexOf('const currentQuestions =')
  );
  const catchBlock = sendHandler.slice(sendHandler.lastIndexOf('} catch (error) {'));
  assert.match(catchBlock, /Nuestro asistente no está disponible en este momento/);
  assert.match(catchBlock, /Our assistant is unavailable right now/);
  assert.match(catchBlock, /serviceUnavailable: true/);
  assert.match(catchBlock, /setFallbackContactMessage\(query\.trim\(\)\)/);
  assert.doesNotMatch(catchBlock, /intenta preguntarme nuevamente|Please ask me again|inquiryHandoff/);
});

test('unavailable AI state offers WhatsApp and a short customer inquiry form', () => {
  assert.match(assistant, /data-service-unavailable="true"/);
  assert.match(assistant, /data-customer-intake-fallback="true"/);
  assert.match(assistant, /autoComplete="name"/);
  assert.match(assistant, /type="email"/);
  assert.match(assistant, /autoComplete="email"/);
  assert.match(assistant, /<textarea[\s\S]*?required/);
  assert.match(assistant, /directWhatsAppUrl\(/);
  assert.match(assistant, /Escribir por WhatsApp/);
  assert.match(assistant, /Contact us on WhatsApp/);
});

test('fallback form reuses the existing customer-intake workflow and does not claim a booking', () => {
  assert.match(assistant, /requestCustomerIntake\(\{[\s\S]*?source: 'ai-assistant-unavailable'/);
  assert.match(assistant, /customer: \{ name, email \}/);
  assert.match(assistant, /onResult: \(result\) => setFallbackContactStatus\(result\.ok \? 'sent' : 'failed'\)/);
  assert.match(assistant, /no crea una reserva ni confirma disponibilidad/);
  assert.match(assistant, /does not create a booking or confirm availability/);
});
