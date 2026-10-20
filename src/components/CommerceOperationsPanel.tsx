import React, { useEffect, useRef, useState } from 'react';
import { auth } from '../firebase';
import type { Language } from '../types';

type Product = { id: string; title?: { es?: string; en?: string }; catalogStatus?: string };
type Provider = { id: string; name: string; website?: string; active: boolean; verified: boolean };
type SalesReadiness = {
  state: 'sample_needs_external_verification';
  source: 'firestore_bounded_sample';
  observedAt: string;
  coverage: { limitPerCollection: number; productsSampled: number; providersSampled: number; slotsSampled: number; truncatedOrUnknown: boolean; totalsCertified: false };
  counts: { verifiedActiveProvidersSample: number; providerProfilesWithRateAndEmailSample: number; offerCandidatesSample: number; datedSlotCandidatesSample: number };
  configuration: { emailTransportConfigured: boolean; paymentCredentialsConfigured: boolean; leadAutoFollowUpEnabled: boolean };
  blockers: string[];
};
const READINESS_ACTIONS: Record<string, { es: string; en: string }> = {
  verify_real_provider: { es: 'Registrar y verificar un proveedor real.', en: 'Register and verify a real supplier.' },
  complete_provider_rate_and_email: { es: 'Verificar acuerdo y registrar comisión y correo operativo de proveedores.', en: 'Verify agreement and record provider commission rate and operational email.' },
  publish_contractual_offer: { es: 'Publicar al menos una oferta con tarifa y horarios verificados.', en: 'Publish at least one offer with verified price and departure times.' },
  publish_future_inventory: { es: 'Registrar cupos futuros reales para las ofertas publicadas.', en: 'Register real future capacity for published offers.' },
  configure_real_email_transport: { es: 'Configurar SMTP, Resend o SendGrid y probar entrega real.', en: 'Configure SMTP, Resend or SendGrid and test actual delivery.' },
  configure_payment_gateway: { es: 'Configurar pasarela de pago y verificar webhooks en sandbox.', en: 'Configure payment gateway and verify webhooks in sandbox.' },
  review_followup_policy_and_consent: { es: 'Revisar consentimiento y habilitación controlada del seguimiento de prospectos.', en: 'Review consent and controlled lead follow-up enablement.' },
};
type Readiness = {
  products: Product[]; providers: Provider[]; truncated: boolean;
  salesReadiness?: SalesReadiness;
  payments: { paypalCredentialsConfigured: boolean; paypalMode: string; stripeCredentialsConfigured: boolean };
  voice: { ready: boolean; missing: string[]; humanTransferConfigured: boolean };
};
const inputStyle = 'mt-1 w-full rounded-xl border border-white/20 bg-stone-950 p-3 text-white';

export function CommerceOperationsPanel({ language }: { language: Language }) {
  const es = language === 'es';
  const [data, setData] = useState<Readiness | null>(null);
  const [operation, setOperation] = useState('provider');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const submitting = useRef(false);

  async function request(path = '', body?: Record<string, unknown>, signal?: AbortSignal) {
    const user = auth.currentUser;
    if (!user) throw new Error(es ? 'Inicia sesión como administrador.' : 'Sign in as an administrator.');
    const token = await user.getIdToken();
    const response = await fetch('/api/admin/commerce' + path, {
      method: body ? 'POST' : 'GET', signal,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || (es ? 'No se pudo completar la operación.' : 'Could not complete this operation.'));
    return result;
  }
  useEffect(() => {
    const controller = new AbortController();
    request('', undefined, controller.signal).then(setData).catch(e => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => controller.abort();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true); setError(''); setMessage('');
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      await request('/' + operation, { ...values, attested: values.attested === 'on' });
      setMessage(es ? 'Guardado con registro de auditoría. Esto no confirma ninguna reserva ni activa cobros o llamadas.' : 'Saved with an audit record. This does not confirm a booking or activate charges or calls.');
      try { setData(await request()); }
      catch { setError(es ? 'Los cambios se guardaron, pero no se pudo actualizar la lista. Recarga la página.' : 'Changes were saved, but the list could not refresh. Reload the page.'); }
    } catch (e: any) { setError(e.message); }
    finally { submitting.current = false; setBusy(false); }
  }
  function field(name: string, label: string, type = 'text', props: React.InputHTMLAttributes<HTMLInputElement> = {}) {
    return <label className="block text-sm text-stone-300">{label}<input className={inputStyle} required name={name} type={type} {...props}/></label>;
  }
  return <section className="rounded-3xl border border-emerald-500/30 bg-[#061d14] p-6 space-y-4">
    <h2 className="text-2xl font-bold text-white">{es ? 'Preparar la tienda para ventas reales' : 'Prepare the store for real sales'}</h2>
    <p className="text-sm text-stone-300">{es ? '1. Verifica al proveedor. 2. Publica tarifas y condiciones. 3. Abre cupos por fecha. Las solicitudes a medida siguen siendo cotizaciones hasta acordar su oferta.' : '1. Verify the provider. 2. Publish rates and terms. 3. Open dated inventory. Custom requests remain quotations until an offer is agreed.'}</p>
    {data && <div className="grid gap-3 sm:grid-cols-3 text-sm text-amber-200">
      <p>PayPal: {data.payments.paypalCredentialsConfigured ? data.payments.paypalMode : (es ? 'credenciales pendientes' : 'credentials pending')}</p>
      <p>Stripe: {data.payments.stripeCredentialsConfigured ? (es ? 'credenciales presentes; probar cobro' : 'credentials present; payment test needed') : (es ? 'pendiente' : 'pending')}</p>
      <p>{es ? 'Voz: ' : 'Voice: '}{data.voice.ready ? (es ? 'configuración presente; falta prueba de llamada' : 'configuration present; call test needed') : (es ? 'configuración incompleta' : 'configuration incomplete')}</p>
    </div>}
    {data?.salesReadiness && <section aria-label={es ? 'Diagnóstico comercial' : 'Sales readiness'} className="rounded-2xl border border-amber-400/25 bg-black/20 p-4 space-y-3">
      <h3 className="text-lg font-bold text-white">{es ? 'Preflight comercial: datos verificados, no ventas simuladas' : 'Sales preflight: verified data, not simulated sales'}</h3>
      <p className="text-xs text-stone-300">{es
        ? 'Muestras de Firestore (hasta 500 registros por colección). Un cupo publicado no significa disponibilidad confirmada por el proveedor.'
        : 'Firestore samples (up to 500 records per collection). Published capacity is not supplier-confirmed availability.'}</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([
          [es ? 'Proveedores activos verificados' : 'Verified active providers', data.salesReadiness.counts.verifiedActiveProvidersSample],
          [es ? 'Proveedores con tasa y correo' : 'Providers with rate and email', data.salesReadiness.counts.providerProfilesWithRateAndEmailSample],
          [es ? 'Ofertas candidatas' : 'Candidate offers', data.salesReadiness.counts.offerCandidatesSample],
          [es ? 'Cupos futuros candidatos' : 'Candidate future slots', data.salesReadiness.counts.datedSlotCandidatesSample],
        ] as Array<[string, number]>).map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 p-3">
          <p className="text-2xl font-black text-white tabular-nums">{value}</p>
          <p className="text-xs text-stone-300">{label}</p>
        </div>)}
      </div>
      <h4 className="font-semibold text-amber-200">{es ? 'Próximas acciones verificables' : 'Verifiable next actions'}</h4>
      {data.salesReadiness.blockers.length
        ? <ul className="space-y-1 text-sm text-stone-200">{data.salesReadiness.blockers.map(code =>
          <li key={code}>• {READINESS_ACTIONS[code]?.[es ? 'es' : 'en'] || code}</li>)}</ul>
        : <p className="text-sm text-stone-200">{es ? 'No hay bloqueos de configuración en la muestra. Falta probar una reserva completa en sandbox y la aceptación del proveedor.' : 'No sampled configuration blockers. A complete sandbox booking and provider acceptance still need verification.'}</p>}
      {data.salesReadiness.coverage.truncatedOrUnknown && <p className="text-xs text-amber-200">{es ? 'Cobertura limitada: al menos una consulta llegó al límite de 500. Los contadores no son totales globales.' : 'Limited coverage: at least one query hit the 500 limit. Counts are not global totals.'}</p>}
      <p className="text-xs text-stone-400">{es ? 'Actualizado' : 'Updated'}: {new Date(data.salesReadiness.observedAt).toLocaleString(es ? 'es-CR' : 'en-US')}</p>
    </section>}
    {data?.voice.missing?.length ? <p className="text-xs text-stone-400">{es ? 'Voz pendiente: ' : 'Voice pending: '}{data.voice.missing.join(', ')}</p> : null}
    {data?.truncated && <p className="text-amber-300">{es ? 'Vista limitada a 500 registros; no representa todo el catálogo.' : 'View limited to 500 records; not the full catalog.'}</p>}
    <div className="flex flex-wrap gap-2">{['provider', 'product', 'offer', 'slot'].map((value, i) => <button key={value} type="button" disabled={busy} aria-pressed={operation === value} onClick={() => { setOperation(value); setMessage(''); }} className={'rounded-xl px-4 py-2 ' + (operation === value ? 'bg-amber-400 text-black' : 'bg-white/10 text-white')}>{(es ? ['Proveedor', 'Nueva experiencia', 'Oferta', 'Cupos'] : ['Provider', 'New experience', 'Offer', 'Inventory'])[i]}</button>)}</div>
    <form key={operation} onSubmit={submit} className="space-y-4">
      <fieldset disabled={busy || !data} className="grid gap-4 sm:grid-cols-2 disabled:opacity-60">
        {operation === 'provider' ? <>
          {field('providerId', es ? 'Código único del proveedor (letras, números, guiones)' : 'Unique provider ID (letters, numbers, hyphens)', 'text', { pattern: '[a-zA-Z0-9_-]+', maxLength: 160 })}
          {field('name', es ? 'Nombre comercial real' : 'Real business name', 'text', { minLength: 3, maxLength: 200 })}
          {field('email', es ? 'Correo operativo para confirmaciones' : 'Operations email for confirmations', 'email')}
          {field('phone', es ? 'Teléfono con código de país' : 'Phone with country code', 'tel', { placeholder: '+506…' })}
          {field('website', es ? 'Web oficial HTTPS' : 'Official HTTPS website', 'url', { placeholder: 'https://…' })}
          {field('commissionPercent', es ? 'Comisión acordada (%)' : 'Agreed commission (%)', 'number', { min: 0, max: 100, step: 0.01 })}
          <p className="sm:col-span-2 text-xs text-stone-400">{es ? 'Los datos de contacto de proveedores viven solo en el servidor (archivo interno). Confirme acuerdo, tarifas y comisión con el proveedor; una web pública no prueba disponibilidad.' : 'Provider contact data lives only on the server (internal file). Confirm agreement, rates and commission with the provider; a public website does not prove availability.'}</p>
        </> : operation === 'product' ? <>
          {field('productId', es ? 'Código único de servicio' : 'Unique service code', 'text', { pattern: '[a-zA-Z0-9_-]+', maxLength: 160 })}
          <label className="text-sm text-stone-300">{es ? 'Proveedor verificado' : 'Verified provider'}<select className={inputStyle} name="providerId" required defaultValue=""><option value="">{es ? 'Selecciona' : 'Select'}</option>{data?.providers.filter(p => p.active && p.verified).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          {field('titleEs', es ? 'Nombre en español' : 'Name in Spanish', 'text', { minLength: 3, maxLength: 160 })}
          {field('titleEn', es ? 'Nombre en inglés' : 'Name in English', 'text', { minLength: 3, maxLength: 160 })}
          {field('descriptionEs', es ? 'Descripción real acordada en español' : 'Agreed Spanish description', 'text', { minLength: 3, maxLength: 2400 })}
          {field('descriptionEn', es ? 'Descripción real acordada en inglés' : 'Agreed English description', 'text', { minLength: 3, maxLength: 2400 })}
          <label className="text-sm text-stone-300">{es ? 'Categoría' : 'Category'}<select className={inputStyle} name="category" required defaultValue=""><option value="">{es ? 'Selecciona' : 'Select'}</option>{['volcanoes','wildlife','canopy','beaches','rafting','culture','multiday','combos','adventure','nature','hiking','waterfalls','rural','gastronomy','surf','snorkeling','diving','whale_watching','kayak','fishing','family','services'].map(v=><option key={v} value={v}>{v === 'services' ? (es ? 'Transporte y servicios' : 'Transport & services') : v}</option>)}</select></label>
          <label className="text-sm text-stone-300">{es ? 'Región' : 'Region'}<select className={inputStyle} name="region" required defaultValue=""><option value="">{es ? 'Selecciona' : 'Select'}</option>{['arenal','monteverde','manuel_antonio','guanacaste','tortuguero','pacuare','san_jose','caribe','caribe_sur','osa','uvita','cahuita','jaco','cartago','turrialba','corcovado','golfo_dulce','central_pacific','sarapiqui','los_santos','golfito'].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
          {field('placeName', es ? 'Zona o encuentro verificado' : 'Verified service area or meeting point', 'text', { minLength: 3, maxLength: 160 })}
          {field('lat', es ? 'Latitud del punto de referencia' : 'Reference latitude', 'number', { min: 8, max: 12, step: 'any' })}
          {field('lng', es ? 'Longitud del punto de referencia' : 'Reference longitude', 'number', { min: -86, max: -82, step: 'any' })}
          {field('image', es ? 'Imagen HTTPS de la experiencia' : 'HTTPS experience image', 'url')}
          {field('sourceUrl', es ? 'Enlace de referencia del proveedor' : 'Provider reference link', 'url')}
        </> : <>
          <label className="text-sm text-stone-300">{es ? 'Experiencia del catálogo' : 'Catalog experience'}<select className={inputStyle} name="tourId" required defaultValue=""><option value="">{es ? 'Selecciona' : 'Select'}</option>{data?.products.map(product => <option value={product.id} key={product.id}>{product.title?.[es ? 'es' : 'en'] || product.title?.es || product.id} · {product.catalogStatus}</option>)}</select></label>
          {operation === 'offer' ? <>
            <label className="text-sm text-stone-300">{es ? 'Proveedor verificado' : 'Verified provider'}<select className={inputStyle} name="providerId" required defaultValue=""><option value="">{es ? 'Selecciona' : 'Select'}</option>{data?.providers.filter(p => p.active && p.verified).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            {field('priceUSD', es ? 'Tarifa final por adulto USD' : 'Final adult rate USD', 'number', { min: 0.01, max: 100000, step: 0.01 })}
            {field('childPriceUSD', es ? 'Tarifa final por niño USD' : 'Final child rate USD', 'number', { min: 0, max: 100000, step: 0.01 })}
            {field('departureTimes', es ? 'Horarios separados por coma, hora de Costa Rica' : 'Comma-separated departures, Costa Rica time')}
            {field('cancellationPolicy', es ? 'Condiciones de cancelación acordadas (ES/EN)' : 'Agreed cancellation terms (ES/EN)', 'text', { minLength: 10, maxLength: 1500 })}
          </> : <>
            {field('date', es ? 'Fecha de servicio' : 'Service date', 'date')}
            {field('time', es ? 'Horario exacto publicado en la oferta' : 'Exact departure time from the offer')}
            {field('maxCapacity', es ? 'Cupo total acordado (incluye plazas ya reservadas)' : 'Agreed total capacity (includes already booked seats)', 'number', { min: 1, max: 10000, step: 1 })}
          </>}
        </>}
        {field('evidence', es ? 'Referencia del acuerdo verificado (sin claves ni tarjetas)' : 'Verified agreement reference (no passwords or card details)', 'text', { minLength: 10, maxLength: 1000 })}
        <label className="flex items-center gap-3 text-sm text-stone-300"><input type="checkbox" name="attested" required/>{es ? 'Verifiqué estos datos con el proveedor y autorizo publicarlos.' : 'I verified these details with the provider and authorize publication.'}</label>
        <button className="rounded-xl bg-amber-400 px-4 py-3 font-bold text-black" type="submit">{busy ? (es ? 'Guardando…' : 'Saving…') : (es ? 'Guardar datos verificados' : 'Save verified details')}</button>
      </fieldset>
    </form>
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    {message && <p role="status" className="text-emerald-300">{message}</p>}
  </section>;
}
