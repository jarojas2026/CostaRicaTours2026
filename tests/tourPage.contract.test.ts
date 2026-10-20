import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { TOURS } from '../src/data/toursData';
import { OPERATOR_TOURS } from '../src/data/operatorTours';
import { resolveTour, tourAllowsPayment, tourReferencePrice, tourReviewDate, TOUR_COMMERCIAL_STATUS } from '../src/utils/tourResolver';
import { buildTourQuoteLeadPayload, isLikelyBotSubmission, parseTourQuoteLeadPayload, TOUR_QUOTE_SOURCE } from '../shared/tourQuoteRequest';
import { buildLeadRecord, buildTourPageLeadInput } from '../backend/leadPipeline';
import { buildSitemapXml } from '../scripts/generateSitemap';

const operatorTour = OPERATOR_TOURS.find(t => t.priceUSD > 0)!;
const curatedTour = TOURS.find(t => t.catalogStatus !== 'inquiry')!;

test('resolver finds curated and operator tours by id or slug', () => {
  assert.equal(resolveTour(operatorTour.id, TOURS)?.kind, 'operator');
  assert.equal(resolveTour(operatorTour.id, TOURS)?.tour, operatorTour);
  assert.equal(resolveTour(curatedTour.id, TOURS)?.kind, 'curated');
  if (curatedTour.slug && curatedTour.slug !== curatedTour.id) assert.equal(resolveTour(curatedTour.slug, TOURS)?.tour.id, curatedTour.id);
  assert.equal(resolveTour(encodeURIComponent(operatorTour.id), TOURS)?.tour.id, operatorTour.id);
});

test('resolver returns null (in-app 404) for unknown or malformed ids', () => {
  for (const id of [undefined, '', 'no-existe-xyz', '../etc/passwd', '%E0%A4%A', '<script>']) {
    assert.equal(resolveTour(id, TOURS), null, String(id));
  }
});

test('every catalog tour resolves to itself', () => {
  const ids = new Set(TOURS.map(t => t.id));
  assert.ok(ids.size >= 590, `catalog has ${ids.size} tours`);
  for (const tour of TOURS) assert.equal(resolveTour(tour.id, TOURS)?.tour.id, tour.id);
});

test('operator tours: labelled reference price, review date, no operator source, inquiry status, no payment', () => {
  const price = tourReferencePrice(operatorTour);
  assert.equal(price.amountUSD, operatorTour.priceUSD);
  assert.equal(price.label.es, 'Precio de referencia, sujeto a confirmación');
  assert.equal(tourReviewDate(operatorTour), operatorTour.priceCheckedAt);
  assert.equal(operatorTour.sourceUrl, undefined);
  assert.equal(operatorTour.operatorName, undefined);
  assert.equal(TOUR_COMMERCIAL_STATUS.es, 'Consultar disponibilidad');
  for (const tour of OPERATOR_TOURS) {
    assert.equal(tourAllowsPayment(tour), false, tour.id);
    assert.equal(tour.rating, 0);
    assert.equal(tour.reviewsCount, 0);
  }
  const unpriced = OPERATOR_TOURS.find(t => !(t.priceUSD > 0));
  if (unpriced) assert.deepEqual(tourReferencePrice(unpriced), { label: { es: 'Consultar precio', en: 'Ask for price' } });
});

const form = {
  tourId: operatorTour.id, name: '  Ana Pérez ', email: 'ANA@Example.com', approxDate: 'marzo 2027',
  people: '3', message: 'Somos 3 adultos', consent: true, language: 'es' as const,
};

test('lead payload requires Ley 8968 consent and carries tourId + source tour_page', () => {
  assert.deepEqual(buildTourQuoteLeadPayload({ ...form, consent: false }), { ok: false, error: 'consent_required' });
  const built = buildTourQuoteLeadPayload(form);
  assert.ok(built.ok);
  assert.deepEqual(built.payload, {
    source: 'tour_page', tourId: operatorTour.id, language: 'es', consent: true,
    customer: { name: 'Ana Pérez', email: 'ana@example.com' },
    request: { people: 3, approxDate: 'marzo 2027' },
    message: 'Somos 3 adultos',
  });
  assert.equal(TOUR_QUOTE_SOURCE, 'tour_page');
});

test('lead payload rejects bad input', () => {
  assert.deepEqual(buildTourQuoteLeadPayload({ ...form, email: 'nope' }), { ok: false, error: 'email_invalid' });
  assert.deepEqual(buildTourQuoteLeadPayload({ ...form, name: ' ' }), { ok: false, error: 'name_required' });
  assert.deepEqual(buildTourQuoteLeadPayload({ ...form, people: 0 }), { ok: false, error: 'people_invalid' });
  assert.deepEqual(buildTourQuoteLeadPayload({ ...form, tourId: '../x' }), { ok: false, error: 'tour_required' });
});

test('server re-validates: consent must be literally true and source tour_page', () => {
  const { payload } = buildTourQuoteLeadPayload(form) as any;
  assert.ok(parseTourQuoteLeadPayload(payload).ok);
  assert.deepEqual(parseTourQuoteLeadPayload({ ...payload, consent: 'true' }), { ok: false, error: 'consent_required' });
  assert.deepEqual(parseTourQuoteLeadPayload({ ...payload, consent: undefined }), { ok: false, error: 'consent_required' });
  assert.deepEqual(parseTourQuoteLeadPayload({ ...payload, source: 'contact_form' }), { ok: false, error: 'source_invalid' });
  assert.deepEqual(parseTourQuoteLeadPayload(null), { ok: false, error: 'source_invalid' });
});

test('tour_page lead stores consent, contact, tourId and a labelled reference quote', () => {
  const { payload } = buildTourQuoteLeadPayload(form) as any;
  const lead = buildLeadRecord(buildTourPageLeadInput(payload, operatorTour), new Date('2026-10-16T12:00:00Z'));
  assert.equal(lead.firstSource, 'tour_page');
  assert.equal(lead.status, 'nuevo');
  assert.equal(lead.consent.dataProcessing, true);
  assert.equal(lead.consent.law, 'Ley 8968');
  assert.deepEqual(lead.contact, { name: 'Ana Pérez', email: 'ana@example.com' });
  assert.equal(lead.request.tourId, operatorTour.id);
  assert.equal(lead.request.people, 3);
  assert.match(lead.messageSnippet || '', /Fecha aproximada: marzo 2027/);
  assert.equal(lead.referenceQuote?.unitPriceUSD, operatorTour.priceUSD);
  assert.equal(lead.referenceQuote?.subjectToConfirmation, true);
  assert.equal(lead.quoteRequestDrafts.every(d => d.status === 'borrador_no_enviado'), true);
});

test('quote form posts to the leads endpoint, links /privacy and shows the pending message', () => {
  const src = fs.readFileSync('src/components/TourQuoteRequestForm.tsx', 'utf8');
  assert.match(src, /TOUR_QUOTE_ENDPOINT/);
  assert.match(src, /to="\/privacy"/);
  assert.match(src, /Solicitud recibida\. Te enviaremos la cotización/);
  assert.doesNotMatch(src, /stripe|paypal|checkout/i);
  const route = fs.readFileSync('backend/routes/leads.ts', 'utf8');
  assert.match(route, /leadsRouter\.post\('\/api\/leads\/quote-request', quoteBurstLimiter, quoteDailyLimiter/);
});

test('public/sitemap.xml is generated and lists every /tour/:id', () => {
  const committed = fs.readFileSync('public/sitemap.xml', 'utf8');
  assert.equal(committed, buildSitemapXml(TOURS), 'run: npm run sitemap');
  for (const tour of TOURS) assert.ok(committed.includes(`/tour/${tour.id}</loc>`), tour.id);
  assert.match(fs.readFileSync('public/robots.txt', 'utf8'), /^Sitemap: https:\/\/costaricatours2026\.vercel\.app\/sitemap\.xml$/m);
});

test('antiabuso: trampa llena o envío demasiado rápido se descarta; humano normal pasa', () => {
  assert.equal(isLikelyBotSubmission({ website: 'http://spam.example' }), true);
  assert.equal(isLikelyBotSubmission({ website: '', elapsedMs: 800 }), true);
  assert.equal(isLikelyBotSubmission({ website: '', elapsedMs: 9000 }), false);
  assert.equal(isLikelyBotSubmission({}), false);
});
