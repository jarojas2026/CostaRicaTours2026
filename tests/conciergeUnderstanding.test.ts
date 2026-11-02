import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { TOURS } from '../src/data/toursData';
import { understandConciergeMessage, deterministicConciergeReply, detectLanguage, matchTour } from '../backend/conciergeUnderstanding';
import { serverInquiryHandoff } from '../src/utils/tripRequestParser';

const now = new Date('2026-10-14T12:00:00Z');

test('Pacuare rafting: activity, catalog tour, people, month and reference quote (ES)', () => {
  const u = understandConciergeMessage('Quiero rafting Pacuare 2 personas diciembre ¿cuánto cuesta?', TOURS, { now });
  assert.equal(u.isConcreteInquiry, true);
  assert.equal(u.understood.language, 'es');
  assert.equal(u.understood.activity, 'rafting');
  assert.equal(u.understood.tourId, 'pacuare-rafting');
  assert.equal(u.understood.people, 2);
  assert.equal(u.understood.month, 12);
  assert.equal(u.understood.region, 'pacuare');
  assert.ok(u.quote);
  assert.equal(u.quote.kind, 'reference');
  assert.equal(u.quote.subjectToConfirmation, true);
  assert.equal(u.quote.operatorConfirmed, false);
  assert.equal(u.quote.totalUSD, 220);
  assert.equal(u.quote.line, 'US$110 × 2 personas = US$220 (referencia, sujeto a confirmación)');
});

test('English request with exact date, adults + children and a total budget', () => {
  const u = understandConciergeMessage('I want Pacuare rafting for 2 adults and 1 child on December 15, budget $400 total', TOURS, { now, requestedLanguage: 'es' });
  assert.equal(u.understood.language, 'en');
  assert.equal(u.understood.people, 3);
  assert.equal(u.understood.adults, 2);
  assert.equal(u.understood.children, 1);
  assert.equal(u.understood.date, '2026-12-15');
  assert.deepEqual(u.understood.budget, { amount: 400, currency: 'USD', per: 'total' });
  assert.equal(u.quote?.totalUSD, 330);
  assert.equal(u.quote?.withinBudget, true);
  assert.match(u.quote!.line, /reference, subject to confirmation/);
});

test('past day/month rolls to next year; dd/mm and region via place', () => {
  const u = understandConciergeMessage('ballenas en Uvita para 4 personas el 20/01, presupuesto 300 dolares', TOURS, { now });
  assert.equal(u.understood.activity, 'whale_watching');
  assert.equal(u.understood.region, 'osa');
  assert.equal(u.understood.date, '2027-01-20');
  assert.match(String(u.understood.tourId), /whale|ballena/);
  assert.equal(u.quote?.withinBudget, false);
  assert.match(deterministicConciergeReply(u) || '', /supera el presupuesto/);
});

test('never guesses a tour: ambiguous region without activity keeps only the region', () => {
  const u = understandConciergeMessage('tour de mar en Guanacaste para 2', TOURS, { now });
  assert.equal(u.understood.region, 'guanacaste');
  assert.equal(u.understood.tourId, undefined);
  assert.equal(u.understood.month, undefined, '"de mar" is not March');
  assert.equal(u.quote, undefined);
  assert.ok(u.inquiryHandoff, 'still a concrete inquiry with a WhatsApp hand-off');
  assert.equal(matchTour('rafting', undefined, TOURS), undefined, 'two rafting tours: no guess without a place');
});

test('small talk is not an inquiry and has no hand-off', () => {
  const u = understandConciergeMessage('Hola, ¿qué tal?', TOURS, { now });
  assert.equal(u.isConcreteInquiry, false);
  assert.equal(u.inquiryHandoff, undefined);
  assert.equal(deterministicConciergeReply(u), undefined);
  assert.equal(detectLanguage('How much is it for two people?'), 'en');
});

test('hand-off goes to the official WhatsApp with full prefilled context and no confirmation claims', () => {
  const u = understandConciergeMessage('rafting Pacuare 2 personas 15 de diciembre presupuesto US$300', TOURS, { now });
  const h = u.inquiryHandoff!;
  assert.equal(h.source, 'server');
  assert.ok(h.whatsappUrl.startsWith('https://wa.me/50687959148?text='));
  const msg = decodeURIComponent(h.whatsappUrl.split('text=')[1]);
  for (const part of [/Pacuare/, /Personas: 2/, /2026-12-15/, /US\$220/, /Presupuesto: US\$300/]) assert.match(msg, part);
  assert.match(h.operatorNote, /todavía no está confirmado/);
  const reply = deterministicConciergeReply(u) || '';
  assert.doesNotMatch(reply, /confirmad[ao] (tu|la) reserva|reserva confirmada|booking confirmed/i);
});

test('frontend accepts only a well-formed server hand-off to the official number', () => {
  const u = understandConciergeMessage('rafting Pacuare 2 personas diciembre', TOURS, { now });
  const accepted = serverInquiryHandoff({ ...u });
  assert.ok(accepted);
  assert.equal(accepted.tourId, 'pacuare-rafting');
  assert.equal(serverInquiryHandoff({ inquiryHandoff: { ...u.inquiryHandoff, whatsappUrl: 'https://wa.me/1555?text=x' } }), undefined);
  assert.equal(serverInquiryHandoff({ inquiryHandoff: { ...u.inquiryHandoff, referenceLine: 'US$220 final' } }), undefined);
  assert.equal(serverInquiryHandoff({ reply: 'hola' }), undefined);
});

test('two-day trip returns two distinct catalogue experiences and preserves people and month in Spanish', () => {
  const regionalTours = [
    { id: 'uvita-whale-watching', title: { es: 'Avistamiento de ballenas', en: 'Whale watching' }, category: 'wildlife', region: 'osa', priceUSD: 85 },
    { id: 'marino-ballena-kayak', title: { es: 'Kayak Marino Ballena', en: 'Marino Ballena Kayak' }, category: 'kayak', region: 'osa', priceUSD: 60 },
    { id: 'nauyaca-waterfall', title: { es: 'Catarata Nauyaca', en: 'Nauyaca Waterfall' }, category: 'nature', region: 'osa', priceUSD: 35 },
  ];
  const u = understandConciergeMessage('Quiero conocer Uvita 2 días para 4 personas en marzo', regionalTours, { now, requestedLanguage: 'en' });
  assert.equal(u.understood.language, 'es');
  assert.equal(u.understood.days, 2);
  assert.equal(u.understood.people, 4);
  assert.equal(u.understood.month, 3);
  assert.equal(u.suggestions?.length, 2);
  const reply = deterministicConciergeReply(u) || '';
  assert.match(reply, /Día 1:/);
  assert.match(reply, /Día 2:/);
  assert.match(reply, /4 personas/);
  assert.match(reply, /marzo/);
});

test('two-day English request responds in English and does not invent missing catalogue experiences', () => {
  const oneRegionalTour = [
    { id: 'uvita-whale-watching', title: { es: 'Avistamiento de ballenas', en: 'Whale watching' }, category: 'wildlife', region: 'osa', priceUSD: 85 },
  ];
  const u = understandConciergeMessage('I want to visit Uvita for 2 days with 4 people in March', oneRegionalTour, { now, requestedLanguage: 'es' });
  assert.equal(u.understood.language, 'en');
  assert.equal(u.understood.days, 2);
  assert.equal(u.understood.people, 4);
  assert.equal(u.understood.month, 3);
  assert.equal(u.suggestions?.length, 1);
  const reply = deterministicConciergeReply(u) || '';
  assert.match(reply, /Day 1:/);
  assert.match(reply, /will not invent the remaining 1/);
  assert.match(reply, /4 people/);
  assert.match(reply, /March/);
});

test('concierge API returns catalogue day suggestions and same-language reply for multi-day requests', async () => {
  const saved = { gemini: process.env.GEMINI_API_KEY, google: process.env.GOOGLE_API_KEY };
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  const { createApp } = await import('../backend/app');
  const server = createApp().listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/api/gemini/concierge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Quiero conocer Uvita 2 días para 4 personas en marzo', language: 'en' }),
    });
    const body: any = await res.json();
    assert.equal(body.understood?.language, 'es');
    assert.equal(body.understood?.days, 2);
    assert.equal(body.understood?.people, 4);
    assert.equal(body.understood?.month, 3);
    assert.equal(body.suggestions?.length, 2);
    assert.match(body.reply, /Día 1:/);
    assert.match(body.reply, /Día 2:/);
    assert.match(body.reply, /4 personas/);
    assert.match(body.reply, /marzo/);
  } finally {
    server.close();
    if (saved.gemini !== undefined) process.env.GEMINI_API_KEY = saved.gemini;
    if (saved.google !== undefined) process.env.GOOGLE_API_KEY = saved.google;
  }
});

test('POST /api/gemini/concierge returns structured understanding even without an AI key', async () => {
  const saved = { gemini: process.env.GEMINI_API_KEY, google: process.env.GOOGLE_API_KEY };
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  const { createApp } = await import('../backend/app');
  const server = createApp().listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/api/gemini/concierge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Quiero rafting Pacuare 2 personas diciembre ¿cuánto cuesta?', language: 'es' }),
    });
    const body: any = await res.json();
    assert.equal(body.understood?.tourId, 'pacuare-rafting');
    assert.equal(body.understood?.people, 2);
    assert.equal(body.quote?.totalUSD, 220);
    assert.equal(body.quote?.subjectToConfirmation, true);
    assert.ok(String(body.inquiryHandoff?.whatsappUrl).startsWith('https://wa.me/50687959148?text='));
    assert.ok(typeof body.reply === 'string' && body.reply.length > 0);
  } finally {
    server.close();
    if (saved.gemini !== undefined) process.env.GEMINI_API_KEY = saved.gemini;
    if (saved.google !== undefined) process.env.GOOGLE_API_KEY = saved.google;
  }
});

test('requests above 14 days distinguish display cap from catalogue availability', () => {
  const u = understandConciergeMessage('I want a 20 days trip in Osa for 2 people', TOURS, { now, requestedLanguage: 'es' });
  assert.equal(u.understood.language, 'en');
  assert.equal(u.understood.days, 20);
  const reply = deterministicConciergeReply(u) || '';
  assert.match(reply, /displays up to 14 experiences; this is a presentation limit/i);
  assert.doesNotMatch(reply, /catalogue only identifies 14|catalogue only offers 14/i);
});
