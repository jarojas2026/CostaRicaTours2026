import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { NATIONAL_POI_GROUPS } from '../src/data/nationalPoiLayers.ts';
import { BUSINESS_POI_LAYERS, isPublicEmergencyPoi } from '../src/data/publicContactPolicy.ts';
import { buildNationalPoiPopupHtml } from '../src/components/nationalPoiPopup.ts';

// Decisión del dueño (2026-10-19): el sitio público no muestra teléfono, WhatsApp, correo,
// web ni dirección exacta de negocios/proveedores. Excepción: emergencias públicas.

const ROOT = process.cwd();
const CONTACT_KEYS = ['telefono', 'phone', 'tel', 'whatsapp', 'email', 'correo', 'web', 'website', 'url', 'reserva', 'booking', 'contacto', 'contact'];
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const URL_RE = /(https?:\/\/|www\.)/i;
const PHONE = /(\+?506[\s.-]?)?\b[2-8]\d{3}[\s.-]?\d{4}\b/g;
const YEAR_RANGE = /^(1[89]\d\d|20\d\d)[\s-](1[89]\d\d|20\d\d)$/;
const hasPhone = (text: string) => [...text.matchAll(PHONE)].some((m) => !YEAR_RANGE.test(m[0].trim()));

for (const group of NATIONAL_POI_GROUPS) {
  test(`public map layer ${group.id} carries no business contact data`, () => {
    const fc = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', group.file), 'utf8'));
    for (const f of fc.features) {
      const p = f.properties || {};
      if (isPublicEmergencyPoi(p.grupo, p.tipo)) continue;
      for (const key of Object.keys(p)) {
        assert.ok(!CONTACT_KEYS.includes(key.toLowerCase()), `${p.id}: campo de contacto "${key}" en datos públicos`);
      }
      if (BUSINESS_POI_LAYERS.has(group.id)) assert.equal(p.direccion, undefined, `${p.id}: dirección exacta de negocio en datos públicos`);
      const text = JSON.stringify(p);
      assert.doesNotMatch(text, EMAIL, `${p.id}: correo en datos públicos`);
      assert.doesNotMatch(text, URL_RE, `${p.id}: web en datos públicos`);
      assert.ok(!hasPhone(text), `${p.id}: teléfono en datos públicos`);
    }
  });
}

const businessSample = {
  id: 'n1', grupo: 'hospedaje', tipo: 'hotel', nombre: 'Hotel Ejemplo',
  telefono: '+506 2239-7364', web: 'https://hotel-ejemplo.cr', email: 'info@hotel-ejemplo.cr',
  whatsapp: '+506 8888-1234', reserva: 'https://reservas.example.com', direccion: 'Calle 5, Avenida 2',
} as any;

for (const language of ['es', 'en'] as const) {
  test(`business popup (${language}) renders no tel:, mailto:, phone, website or exact address`, () => {
    const html = buildNationalPoiPopupHtml(businessSample, 9.9, -84.1, language);
    assert.doesNotMatch(html, /tel:|mailto:|wa\.me|whatsapp/i);
    assert.doesNotMatch(html, /2239-7364|8888-1234|hotel-ejemplo\.cr|reservas\.example\.com|Calle 5/);
    assert.match(html, /data-public-request-cta="1"/);
    assert.match(html, language === 'es' ? /Solicitar \/ consultar con nosotros/ : /Request \/ ask us/);
  });
}

test('SINAC park popup has no external booking link and offers the request CTA', () => {
  const html = buildNationalPoiPopupHtml({ id: 'p1', grupo: 'parques_sinac', tipo: 'Parque Nacional', nombre: 'PN', telefono: '2482-1226', reserva: 'https://serviciosenlinea.sinac.go.cr/' } as any, 10, -84, 'es');
  assert.doesNotMatch(html, /tel:|sinac\.go\.cr|2482-1226/);
  assert.match(html, /data-public-request-cta="1"/);
});

test('public emergency services keep their official phone', () => {
  for (const sample of [
    { id: 'e1', grupo: 'emergencia', tipo: 'Bomberos', nombre: 'Bomberos', telefono: '911' },
    { id: 'h1', grupo: 'salud', tipo: 'Hospital', nombre: 'Hospital', telefono: '2242-6161' },
    { id: 'c1', grupo: 'ccss', tipo: 'EBAIS (sede de EBAIS)', nombre: 'EBAIS', telefono: '2222-2222' },
  ]) {
    assert.match(buildNationalPoiPopupHtml(sample as any, 9.9, -84.1, 'es'), /href="tel:/);
  }
  // Una farmacia o clínica privada no es excepción.
  assert.doesNotMatch(buildNationalPoiPopupHtml({ id: 'f1', grupo: 'salud', tipo: 'Farmacia', nombre: 'Farmacia', telefono: '2222-3333' } as any, 9.9, -84.1, 'es'), /tel:|2222-3333/);
});

test('public map/transport sources ship no business phone, website or outbound booking link', () => {
  const files = ['src/data/mapServicesData.ts', 'src/components/LocalBusesModal.tsx', 'src/components/InteractiveMap.tsx', 'src/components/NationalPoiLayer.tsx', 'src/components/nationalPoiPopup.ts'];
  for (const file of files) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.doesNotMatch(src, /\bphone:\s*'/, `${file}: teléfono de negocio en el bundle`);
    assert.doesNotMatch(src, /sinacBookingUrl|serviciosenlinea\.sinac|cloudforestmonteverde\.com/, `${file}: enlace de reserva externo`);
    assert.doesNotMatch(src, /p\.web\b|p\.reserva\b|route\.phone/, `${file}: render de contacto de negocio`);
  }
});
