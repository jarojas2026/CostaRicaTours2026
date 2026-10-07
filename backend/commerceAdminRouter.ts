import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { FieldValue } from 'firebase-admin/firestore';
import { requireOperator } from './authMiddleware';
import { getFirestoreDb, getSlotKey } from './bookingService';
import { resolveCommerceTour } from './commerceCatalog';
import { assertServiceDate, reservationQuote } from './commercePolicy';
import { TOURS } from '../src/data/toursData';
import { voiceAgentDeskConfig } from './voiceAgentDeskService';

export const commerceAdminRouter = Router();
commerceAdminRouter.use(requireOperator);
commerceAdminRouter.use((req, res, next) => {
  if ((req as any).adminAccess?.role !== 'admin') return res.status(403).json({ error: 'Se requiere una cuenta administradora; una clave de operador no permite publicar ofertas.' });
  next();
});
commerceAdminRouter.use(rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }));

function text(value: unknown, max = 200) { return String(value ?? '').trim().slice(0, max); }
function id(value: unknown) {
  const valueId = text(value, 160);
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(valueId)) throw new Error('Identificador inválido.');
  return valueId;
}

commerceAdminRouter.get('/', async (_req, res) => {
  const db = getFirestoreDb();
  if (!db) return res.status(503).json({ error: 'Catálogo no disponible.' });
  try {
    const [products, providers] = await Promise.all([
      db.collection('tours').limit(500).get(), db.collection('operators').limit(500).get()
    ]);
    const catalog = new Map<string, any>(TOURS.map(tour => [tour.id, { id: tour.id, title: tour.title, catalogStatus: 'discovery' }]));
    products.docs.forEach(doc => {
      const product = doc.data();
      const key = product.id || doc.id;
      catalog.set(key, { id: key, title: product.title, catalogStatus: product.catalogStatus, providerId: product.providerId, priceUSD: product.priceUSD, departureTimes: product.departureTimes });
    });
    res.json({
      products: [...catalog.values()],
      providers: providers.docs.map(doc => ({ id: doc.id, name: doc.data().name, website: doc.data().website, active: doc.data().active, verified: doc.data().verified })),
      payments: { paypalCredentialsConfigured: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET), paypalMode: process.env.PAYPAL_MODE || 'sandbox', stripeCredentialsConfigured: Boolean(process.env.STRIPE_SECRET_KEY) },
      voice: voiceAgentDeskConfig(),
      truncated: products.size === 500 || providers.size === 500
    });
  } catch {
    res.status(503).json({ error: 'No se pudo consultar el catálogo operativo.' });
  }
});

// Every write records the administrator's attestation in a private audit record.
// The public tours collection must never contain contracts or provider contacts.
commerceAdminRouter.post('/:operation', async (req, res) => {
  const db = getFirestoreDb();
  if (!db) return res.status(503).json({ error: 'No se guardaron cambios: Firestore no está disponible.' });
  const operation = req.params.operation;
  if (!['provider', 'product', 'offer', 'slot'].includes(operation)) return res.status(404).json({ error: 'Operación desconocida.' });
  try {
    const body = req.body || {};
    const evidence = text(body.evidence, 1000);
    if (body.attested !== true || evidence.length < 10) throw new Error('Confirme que verificó los datos con el proveedor e indique la referencia del acuerdo.');
    const auditRef = db.collection('commerce_audit').doc();
    const audit = { operation, evidence, actor: (req as any).user.uid, createdAt: FieldValue.serverTimestamp() };
    if (operation === 'provider') {
      const providerId = id(body.providerId);
      const name = text(body.name);
      const email = text(body.email, 254);
      const phone = text(body.phone, 20);
      const website = text(body.website, 500);
      const site = new URL(website);
      if (site.protocol !== 'https:' || site.username || site.password) throw new Error('La web oficial debe usar HTTPS.');
      const commissionRate = Number(body.commissionPercent) / 100;
      if (body.commissionPercent == null || body.commissionPercent === '' || !Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 1) throw new Error('Indique la comisión pactada, entre 0 y 100%.');
      if (name.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Indique nombre comercial, correo y teléfono internacional válidos.');
      const batch = db.batch();
      batch.set(db.collection('operators').doc(providerId), { name, email, phone, website: site.origin, commissionRate, activeTours: [], verified: true, active: true, status: 'active', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      batch.create(auditRef, { ...audit, providerId });
      await batch.commit();
      return res.json({ success: true, providerId });
    }
    if (operation === 'product') {
      const productId = id(body.productId);
      const providerId = id(body.providerId);
      const titleEs = text(body.titleEs, 160), titleEn = text(body.titleEn, 160);
      const descriptionEs = text(body.descriptionEs, 2400), descriptionEn = text(body.descriptionEn, 2400);
      const placeName = text(body.placeName, 160);
      const sourceUrl = text(body.sourceUrl, 800);
      const category = text(body.category, 40), region = text(body.region, 40);
      const lat = Number(body.lat), lng = Number(body.lng);
      const categories = ['volcanoes','wildlife','canopy','beaches','rafting','culture','multiday','combos','adventure','nature','hiking','waterfalls','rural','gastronomy','surf','snorkeling','diving','whale_watching','kayak','fishing','family','services'];
      const regions = ['arenal','monteverde','manuel_antonio','guanacaste','tortuguero','pacuare','san_jose','sjo','caribe','caribe_sur','osa','marino_ballena','perez_zeledon','dominical','uvita','puerto_viejo','cahuita','jaco','cartago','turrialba','corcovado','golfo_dulce','central_pacific','sarapiqui','los_santos','golfito'];
      if ([titleEs, titleEn, descriptionEs, descriptionEn, placeName].some(value => value.length < 3)) throw new Error('Complete nombres, descripciones en ambos idiomas y zona del servicio.');
      if (!categories.includes(category) || !regions.includes(region)) throw new Error('Seleccione una categoría y región disponibles.');
      if (!Number.isFinite(lat) || lat < 8 || lat > 12 || !Number.isFinite(lng) || lng < -86 || lng > -82) throw new Error('Indique coordenadas válidas de Costa Rica.');
      const image = new URL(text(body.image, 800));
      if (image.protocol !== 'https:' || image.username || image.password) throw new Error('La imagen del proveedor debe usar HTTPS.');
      const reference = new URL(sourceUrl);
      if (reference.protocol !== 'https:' || reference.username || reference.password) throw new Error('El enlace de referencia del proveedor debe usar HTTPS.');
      const productRef = db.collection('tours').doc(productId);
      await db.runTransaction(async tx => {
        const provider = await tx.get(db.collection('operators').doc(providerId));
        const existingProduct = await tx.get(productRef);
        if (!provider.exists || provider.data()?.active !== true || provider.data()?.verified !== true) throw new Error('Incorpore y verifique al proveedor primero.');
        if (existingProduct.exists) throw new Error('Ese código de servicio ya existe.');
        tx.create(productRef, {
          id: productId, slug: productId, title: { es: titleEs, en: titleEn },
          subtitle: { es: '', en: '' }, description: { es: descriptionEs, en: descriptionEn },
          category, region, image: image.toString(), gallery: [image.toString()],
          priceUSD: 0, childPriceUSD: 0, durationHours: 0,
          duration: 'Duración por confirmar', durationLabel: { es: 'Por confirmar con el proveedor', en: 'To be confirmed with provider' },
          difficulty: 'por_confirmar', difficultyLabel: { es: 'Por confirmar', en: 'To be confirmed' },
          rating: 0, reviewsCount: 0, reviewsVerified: false, ecoCert: false,
          highlights: { es: [], en: [] }, inclusions: { es: [], en: [] }, exclusions: { es: [], en: [] }, whatToBring: { es: [], en: [] },
          pickupHotels: [], departureTimes: [], location: { lat, lng, placeName },
          providerId, operatorId: providerId, operatorName: provider.data()?.name || '',
          catalogStatus: 'inquiry', isDemoData: false, inquirySourceUrl: sourceUrl,
          updatedAt: FieldValue.serverTimestamp()
        });
        tx.create(auditRef, { ...audit, productId, providerId, sourceUrl });
      });
      return res.json({ success: true, productId, catalogStatus: 'inquiry' });
    }
    const tourId = id(body.tourId);
    const existing: any = await resolveCommerceTour(db, tourId);
    const base = existing || TOURS.find(tour => tour.id === tourId);
    if (!base) throw new Error('Seleccione una ficha existente del catálogo.');
    const productRef = db.collection('tours').doc(existing?.catalogDocumentId || tourId);
    if (operation === 'offer') {
      const providerId = id(body.providerId);
      const cancellationPolicy = text(body.cancellationPolicy, 1500);
      const departures = [...new Set(String(body.departureTimes || '').split(',').map(item => item.trim()).filter(Boolean))];
      if (!departures.length || departures.length > 24 || departures.some(item => item.length > 30) || cancellationPolicy.length < 10) throw new Error('Indique horarios y condiciones de cancelación acordados.');
      if (body.childPriceUSD == null || body.childPriceUSD === '') throw new Error('Indique la tarifa infantil acordada, incluso si es cero.');
      const patch = { id: tourId, providerId, operatorId: providerId, priceUSD: Number(body.priceUSD), childPriceUSD: Number(body.childPriceUSD), departureTimes: departures, cancellationPolicy, catalogStatus: 'bookable', isDemoData: false };
      reservationQuote(patch, 1, 1);
      await db.runTransaction(async tx => {
        const provider = await tx.get(db.collection('operators').doc(providerId));
        const current = await tx.get(productRef);
        if (!provider.exists || provider.data()?.active !== true || provider.data()?.verified !== true) throw new Error('Primero incorpore y verifique al proveedor.');
        if (current.exists && current.data()?.providerId && current.data()?.providerId !== providerId) throw new Error('Cambiar el proveedor de una oferta publicada requiere revisión de reservas existentes.');
        const cleanBase = { ...base };
        delete cleanBase.catalogDocumentId;
        // Never promote discovery ratings/certifications to verified claims.
        tx.set(productRef, { ...cleanBase, ...(current.data() || {}), ...patch, ecoCert: false, bestseller: false, reviewsVerified: false, updatedAt: FieldValue.serverTimestamp() });
        tx.create(auditRef, { ...audit, tourId, providerId, priceUSD: patch.priceUSD, childPriceUSD: patch.childPriceUSD });
      });
      return res.json({ success: true, tourId });
    }
    const date = text(body.date, 10);
    const time = text(body.time, 30);
    assertServiceDate(date);
    const maxCapacity = Number(body.maxCapacity);
    if (!Number.isSafeInteger(maxCapacity) || maxCapacity < 1 || maxCapacity > 10000) throw new Error('El cupo debe ser un entero entre 1 y 10000.');
    const slotRef = db.collection('availability_slots').doc(getSlotKey(tourId, date, time));
    await db.runTransaction(async tx => {
      const product = await tx.get(productRef);
      const slot = await tx.get(slotRef);
      const data = product.data();
      if (data?.catalogStatus !== 'bookable' || !data.departureTimes?.includes(time)) throw new Error('Publique primero la oferta y ese horario.');
      if (slot.exists && !Number.isSafeInteger(slot.data()?.bookedSeats)) throw new Error('El cupo histórico no tiene contador íntegro; concilie las reservas antes de editarlo.');
      const bookedSeats = Number(slot.data()?.bookedSeats ?? 0);
      if (!Number.isSafeInteger(bookedSeats) || bookedSeats < 0 || bookedSeats > maxCapacity) throw new Error('El cupo no puede ser menor que las plazas ya reservadas.');
      // Updating capacity must never reset already reserved seats.
      tx.set(slotRef, { tourId, providerId: data.providerId, date, time, maxCapacity, bookedSeats, active: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      tx.create(auditRef, { ...audit, tourId, date, time, maxCapacity });
    });
    res.json({ success: true, tourId, date, time });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'No se guardaron los cambios.' });
  }
});
