import crypto from 'crypto';
/**
 * 📦 Servicio de Reservas y Disponibilidad en Firestore para Costa Rica Tours
 * Gestiona persistencia, control de cupos atómico (evitando race conditions),
 * verificación de pagos del lado del servidor y resolución dinámica de operadores.
 */

import fs from 'fs';
import path from 'path';
import { getFirebaseAdminApp } from './firebaseAdminRuntime';
import {
  getFirestore,
  FieldValue,
  type Firestore,
  type CollectionReference
} from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';
import Stripe from 'stripe';
import { resolveCommerceTour } from './commerceCatalog';
import { assertServiceDate, reservationQuote, slotAvailability } from './commercePolicy';
import { getIdempotentResult, idempotencyDocId, normalizeIdempotencyKey, requestFingerprint } from './idempotencyService';
import { assertBookingTransition, normalizeBookingLifecycle } from './bookingStateMachine';
import { massiveEngine } from './massiveProcessingEngine';

function resolveFirestoreDatabaseId(): string {
  if (process.env.FIRESTORE_DATABASE_ID) {
    return process.env.FIRESTORE_DATABASE_ID;
  }
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.firestoreDatabaseId) return config.firestoreDatabaseId;
    }
  } catch {}
  return '(default)';
}

const FIRESTORE_DATABASE_ID = resolveFirestoreDatabaseId();

export function getUsdToCrcRate(): number {
  const rate = Number(process.env.USD_TO_CRC_RATE);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('USD_TO_CRC_RATE no configurado. No se puede calcular un importe CRC de forma segura.');
  }
  return rate;
}

export function getUsdToCrcRateOptional(): number {
  const rate = Number(process.env.USD_TO_CRC_RATE);
  return Number.isFinite(rate) && rate > 0 ? rate : 0;
}

let dbInstance: Firestore | null = null;
const inMemoryBookings: Map<string, any> = new Map();
const inMemorySlots: Map<string, number> = new Map();

/** Inicializa y devuelve la instancia de Firestore Admin. */
export function getFirestoreDb(): Firestore | null {
  // Explicit contract-test isolation only; production still uses ADC normally.
  if (process.env.NODE_ENV === 'test' && process.env.FIRESTORE_CONTRACT_TEST_OFFLINE === 'true') return null;
  if (dbInstance) return dbInstance;

  try {
    const app = getFirebaseAdminApp();
    dbInstance = getFirestore(app, FIRESTORE_DATABASE_ID);
    return dbInstance;
  } catch (error: any) {
    console.warn('⚠️ Firestore Admin no disponible.', {
      name: error?.name || null,
      code: error?.code || null,
      message: error?.message || String(error)
    });
    return null;
  }
}

/** Obtiene la referencia a la colección de reservas. */
export function getBookingsCollection(): CollectionReference | null {
  const db = getFirestoreDb();
  if (!db) return null;
  try {
    return db.collection('bookings');
  } catch (err) {
    console.warn('Error accediendo a colección bookings:', err);
    return null;
  }
}

export function normalizeTimestampToDate(timestampVal: any): Date {
  if (!timestampVal) return new Date();
  if (typeof timestampVal.toDate === 'function') return timestampVal.toDate();
  if (typeof timestampVal._seconds === 'number') return new Date(timestampVal._seconds * 1000);
  if (typeof timestampVal.seconds === 'number') return new Date(timestampVal.seconds * 1000);
  const parsed = new Date(timestampVal);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function hasProviderConfirmationEvidence(existing: any, updates: any): boolean {
  const statuses = [
    updates?.providerStatus,
    updates?.serviceOrderStatus,
    existing?.providerStatus,
    existing?.serviceOrderStatus
  ].map((value) => String(value || '').trim().toLowerCase());
  return statuses.some((value) => value === 'confirmed' || value === 'confirmada');
}

export function getSlotKey(tourId: string, date: string, time: string): string {
  const cleanTime = (time || '08:00 AM').replace(/[^a-zA-Z0-9]/g, '_');
  return `${tourId}_${date}_${cleanTime}`;
}

let stripeClient: Stripe | null = null;
export function getStripe(): Stripe | null {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

/** Obtiene operadores desde Firestore; nunca fabrica uno operativo. */
export async function getOperatorById(providerId: string): Promise<{
  id: string;
  name: string;
  paypalEmail: string;
  commissionRate: number;
  phone?: string;
  website?: string;
  verified: boolean;
  certificacion?: string;
  active: boolean;
}> {
  const db = getFirestoreDb();
  const defaultFallback = {
    id: providerId || 'provider-unconfigured',
    name: 'Operador no configurado',
    paypalEmail: process.env.PROVIDER_DEV_EMAIL || '',
    commissionRate: 0,
    phone: process.env.PROVIDER_DEV_PHONE || '',
    website: process.env.PROVIDER_WEBSITE || '',
    verified: false,
    certificacion: undefined,
    active: false
  };

  if (!db || !providerId) return defaultFallback;

  try {
    const opDoc = await db.collection('operators').doc(providerId).get();
    if (opDoc.exists) {
      const data = opDoc.data() || {};
      return {
        id: opDoc.id,
        name: data.name || data.nombre || 'Operador Verificado',
        paypalEmail: data.paypalEmail || data.email || defaultFallback.paypalEmail,
        commissionRate: typeof data.commissionRate === 'number' ? data.commissionRate : 0.15,
        phone: data.phone || data.telefono || defaultFallback.phone,
        website: data.website || defaultFallback.website,
        verified: data.verified === true,
        certificacion: data.certificacion,
        active: data.verified === true && data.active === true && data.status !== 'inactivo'
      };
    }

    const provDoc = await db.collection('proveedores').doc(providerId).get();
    if (provDoc.exists) {
      const data = provDoc.data() || {};
      return {
        id: provDoc.id,
        name: data.nombre || data.name || 'Proveedor Turístico',
        paypalEmail: data.paypalEmail || data.email || defaultFallback.paypalEmail,
        commissionRate: typeof data.comision === 'number' ? data.comision : (data.commissionRate ?? 0.15),
        phone: data.telefono || data.phone || defaultFallback.phone,
        website: data.website || defaultFallback.website,
        verified: data.verificado === true,
        certificacion: data.certificacion,
        active: data.verificado === true && data.activo === true && data.status !== 'inactivo'
      };
    }
  } catch (err) {
    console.warn(`⚠️ Error consultando operador ${providerId} en Firestore:`, err);
  }

  return defaultFallback;
}

/**
 * Control de disponibilidad. En producción nunca se presenta memoria local como
 * disponibilidad real si Firestore no puede verificarse.
 */
export async function checkTourAvailability(
  tourId: string,
  date: string,
  time?: string,
  requestedSeats = 1
): Promise<{ available: boolean; remainingSeats: number; maxCapacity: number; reason?: string }> {
  try {
    assertServiceDate(date);
    const liveDb = getFirestoreDb();
    if (!liveDb) throw new Error('No puedo verificar disponibilidad en vivo porque el servicio de inventario no está accesible.');
    const product: any = await resolveCommerceTour(liveDb, tourId);
    if (!product || product.catalogStatus !== 'bookable') throw new Error('Experiencia pendiente de vincular con un proveedor.');
    const operator = await getOperatorById(product.providerId);
    if (!operator.active) throw new Error('El proveedor no está habilitado.');
    const departure = time || product.departureTimes?.[0] || '08:00 AM';
    const snap = await liveDb.collection('availability_slots').doc(getSlotKey(tourId, date, departure)).get();
    const capacity = slotAvailability(snap.data(), tourId, product.providerId, date, departure, requestedSeats);
    return { available: true, remainingSeats: capacity.remainingSeats, maxCapacity: capacity.maxCapacity };
  } catch (error: any) {
    return { available: false, remainingSeats: 0, maxCapacity: 0, reason: error.message || 'Disponibilidad no verificada.' };
  }
}

/**
 * Verificación de pago del servidor. Un pago verificado avanza a `paid`; la
 * confirmación final requiere evidencia operativa del proveedor.
 */
export async function verifyPaymentServerSide(
  paymentMethod: string,
  details: { paypalOrderId?: string; stripeSessionId?: string }
): Promise<{ verified: boolean; status: 'paid' | 'pendiente_pago'; paymentStatus: 'completed' | 'pending'; meta?: any }> {
  if (paymentMethod === 'paypal' && details.paypalOrderId) {
    try {
      const paypalClientId = process.env.PAYPAL_CLIENT_ID;
      const paypalSecret = process.env.PAYPAL_SECRET;
      const paypalMode = process.env.PAYPAL_MODE || 'sandbox';
      const baseUrl = paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

      if (paypalClientId && paypalSecret) {
        const authStr = Buffer.from(`${paypalClientId}:${paypalSecret}`).toString('base64');
        const authRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
          method: 'POST',
          body: 'grant_type=client_credentials',
          headers: {
            Authorization: `Basic ${authStr}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        const authData = await authRes.json();

        if (authData.access_token) {
          const orderRes = await fetch(`${baseUrl}/v2/checkout/orders/${details.paypalOrderId}`, {
            headers: { Authorization: `Bearer ${authData.access_token}` }
          });
          const orderData = await orderRes.json();
          if (orderData.status === 'COMPLETED') {
            return {
              verified: true,
              status: 'paid',
              paymentStatus: 'completed',
              meta: { paypalStatus: orderData.status, payer: orderData.payer }
            };
          }
        }
      } else {
        console.warn('⚠️ Credenciales de PayPal no configuradas en backend. Marcando como pendiente.');
      }
    } catch (err) {
      console.error('Error verificando orden de PayPal:', err);
    }
  }

  if ((paymentMethod === 'credit_card' || paymentMethod === 'stripe') && details.stripeSessionId) {
    try {
      const stripe = getStripe();
      if (stripe) {
        const session = await stripe.checkout.sessions.retrieve(details.stripeSessionId);
        if (session.payment_status === 'paid') {
          return {
            verified: true,
            status: 'paid',
            paymentStatus: 'completed',
            meta: { stripePaymentIntent: session.payment_intent }
          };
        }
      }
    } catch (err) {
      console.error('Error verificando sesión de Stripe:', err);
    }
  }

  return { verified: false, status: 'pendiente_pago', paymentStatus: 'pending' };
}

export async function generateOperationalInsights(booking: any) {
  const ai = getAI();
  if (!ai) return null;

  try {
    const prompt = `Analiza la siguiente reserva turística en Costa Rica y automatiza las tareas operativas requeridas:
    - Tour: ${booking.tourName}
    - Fecha y Hora: ${booking.date} ${booking.time}
    - Pasajeros: ${booking.adults} adultos, ${booking.children} niños
    - Hotel/Punto de recogida: ${booking.pickupHotel || 'No indicado'}
    - Notas especiales: ${booking.specialRequests || 'Ninguna'}
    
    Genera un JSON con automatedTags, riskAssessment e instrucciones paso a paso para el operador local.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'Eres el Agente Operativo Automático de Costa Rica Tours. Genera solo un JSON válido con campos: automatedTags (array de strings), riskAssessment (string), y operationalInstructions (array de strings).',
        responseMimeType: 'application/json'
      }
    });

    if (response.text) return JSON.parse(response.text);
  } catch (err) {
    console.error('Error generando insights con Gemini:', err);
  }
  return null;
}

export async function createBooking(data: any) {
  const idempotencyKey = normalizeIdempotencyKey(data.idempotencyKey);
  const fingerprint = idempotencyKey ? requestFingerprint(data) : null;
  if (idempotencyKey) {
    const previous = await getIdempotentResult(idempotencyKey);
    if (previous?.fingerprint && previous.fingerprint !== fingerprint) {
      return { conflict: true, error: 'idempotency_conflict', message: 'La misma Idempotency-Key fue usada con datos diferentes.' };
    }
    if (previous?.bookingId) {
      const existing = await getBookingById(previous.bookingId);
      return { conflict: false, idempotent: true, booking: existing || { bookingId: previous.bookingId } };
    }
  }

  // The old Counter Agent shortcut fabricated contact values and then announced
  // a confirmed booking without going through the canonical reservation tool,
  // payment verification and provider confirmation. Fail closed here so the
  // conversational layer falls back to a quote/collection step. Real agent
  // bookings must use the canonical create_reservation / booking lifecycle path.
  if (String(data.paymentMethod || '').toLowerCase() === 'agent_counter_booking') {
    throw new Error('Legacy Counter Agent direct booking is disabled. Use the canonical reservation workflow.');
  }

  const bookingId = `CR-PV-${crypto.randomUUID()}`;
  const bookingTime = data.time || '08:00 AM';
  const numAdults = Number(data.adults ?? 1);
  const numChildren = Number(data.children ?? 0);
  const totalPassengers = numAdults + numChildren;
  const tourId = data.tourId || 'tour-custom';
  const tourDate = String(data.date || '').trim();

  if (!tourDate) {
    return { conflict: true, error: 'fecha_requerida', message: 'La fecha del servicio es obligatoria para verificar disponibilidad.' };
  }

  const db = getFirestoreDb();
  let tourInfo: any;
  let quote: ReturnType<typeof reservationQuote>;
  try {
    assertServiceDate(tourDate);
    tourInfo = await resolveCommerceTour(db, tourId);
    quote = reservationQuote(tourInfo, numAdults, numChildren);
    if (data.totalUSD != null && (!Number.isFinite(Number(data.totalUSD)) || Math.abs(Number(data.totalUSD) - quote.totalUSD) > 0.01)) {
      throw new Error('La tarifa cambió. Actualice la ficha para revisar el importe antes de reservar.');
    }
    if (!tourInfo.departureTimes?.includes(bookingTime)) throw new Error('Horario no publicado por el proveedor.');
    if (data.paypalOrderId || data.stripeSessionId) throw new Error('Cree primero la reserva y complete después su pago vinculado.');
  } catch (error: any) {
    return { conflict: true, error: 'commerce_not_ready', message: error.message };
  }
  let maxCapacity = 0;
  const slotKey = getSlotKey(tourId, tourDate, bookingTime);
  const providerId = String(tourInfo?.providerId || '').trim();
  const providerInfo = await getOperatorById(providerId);
  if (!providerInfo.active || !providerInfo.verified) {
    return { conflict: true, error: 'provider_unverified', message: 'El proveedor todavía no está verificado y habilitado.' };
  }

  let paymentResult: {
    verified: boolean;
    status: 'paid' | 'pendiente_pago';
    paymentStatus: 'completed' | 'pending';
    meta?: any;
  } = {
    verified: false,
    status: 'pendiente_pago',
    paymentStatus: 'pending',
    meta: undefined
  };

  if (data.sinpeReference) {
    paymentResult = {
      verified: false,
      status: 'pendiente_pago',
      paymentStatus: 'pending',
      meta: { sinpeReference: data.sinpeReference, verificationMethod: 'sinpe_movil_manual' }
    };
  }

  const agentInsights = await generateOperationalInsights({
    ...data,
    time: bookingTime,
    adults: numAdults,
    children: numChildren
  });

  const calculatedUSD = quote.totalUSD;
  const crcRate = getUsdToCrcRateOptional();
  if (data.currency === 'CRC' && !crcRate) {
    return { conflict: true, error: 'exchange_rate_unavailable', message: 'La tarifa CRC no puede verificarse. Seleccione USD.' };
  }

  const customerInput = data.customer || {
    name: data.customerName || 'Cliente',
    email: data.customerEmail || '',
    phone: data.customerPhone || '',
    country: data.customerCountry || 'CR'
  };
  const customerName = String(customerInput.fullName || customerInput.name || data.customerName || '').trim();
  const customerObj = { ...customerInput, name: customerName, fullName: customerName };

  if (!db) {
    return {
      conflict: true,
      error: 'availability_unverified',
      message: 'No puedo verificar ni persistir la disponibilidad en este momento. La solicitud no fue confirmada.'
    };
  }

  const newBookingPayload = {
    bookingId,
    tourId,
    tourName: tourInfo?.title?.es || 'Tour en Costa Rica',
    priceSnapshot: { unitPriceUSD: quote.unitPriceUSD, childPriceUSD: quote.childPriceUSD, catalogDocumentId: tourInfo.catalogDocumentId },
    providerId,
    date: tourDate,
    time: bookingTime,
    adults: numAdults,
    children: numChildren,
    pickupHotel: String(data.pickupHotel || '').trim(),
    specialRequests: data.specialRequests || '',
    totalUSD: calculatedUSD,
    totalCRC: crcRate ? Math.round(calculatedUSD * crcRate) : null,
    totalAmount: data.currency === 'CRC' ? Math.round(calculatedUSD * crcRate) : calculatedUSD,
    currency: data.currency === 'CRC' ? 'CRC' : 'USD',
    paymentMethod: data.paymentMethod || 'credit_card',
    paymentStatus: paymentResult.paymentStatus,
    status: paymentResult.status,
    lifecycle: paymentResult.verified ? 'paid' : 'payment_pending',
    sinpeReference: data.sinpeReference || undefined,
    customerName: customerObj.name,
    customerEmail: customerObj.email,
    customerPhone: customerObj.phone,
    customer: customerObj,
    providerInfo,
    flightDetails: data.flightDetails || undefined,
    electronicInvoice: data.electronicInvoice || undefined,
    agentInsights: agentInsights || undefined
  };

  if (db) {
    try {
      await db.runTransaction(async (transaction) => {
        const slotRef = db.collection('availability_slots').doc(slotKey);
        const bookingRef = db.collection('bookings').doc(bookingId);
        const idempotencyRef = idempotencyKey ? db.collection('idempotency_keys').doc(idempotencyDocId(idempotencyKey)) : null;

        if (idempotencyRef) {
          const idemDoc = await transaction.get(idempotencyRef);
          if (idemDoc.exists) {
            const existing = idemDoc.data() || {};
            if (existing.fingerprint && existing.fingerprint !== fingerprint) throw new Error('IDEMPOTENCY_CONFLICT');
            throw new Error('IDEMPOTENT_REPLAY');
          }
        }

        const slotDoc = await transaction.get(slotRef);
        if (!slotDoc.exists) {
          const legacyBookings = await transaction.get(
            db.collection('bookings')
              .where('tourId', '==', tourId)
              .where('date', '==', tourDate)
              .where('time', '==', bookingTime)
              .limit(1)
          );
          if (!legacyBookings.empty) throw new Error('Debe conciliar las reservas existentes antes de abrir este cupo.');
        }
        const productDoc = await transaction.get(db.collection('tours').doc(tourInfo.catalogDocumentId));
        const product: any = productDoc.data();
        const currentQuote = reservationQuote(product, numAdults, numChildren);
        if (product.providerId !== providerId || currentQuote.totalUSD !== calculatedUSD || !product.departureTimes?.includes(bookingTime)) {
          throw new Error('La oferta cambió durante la solicitud. Revise la tarifa y vuelva a intentar.');
        }
        const opDoc = await transaction.get(db.collection('operators').doc(providerId));
        const provDoc = await transaction.get(db.collection('proveedores').doc(providerId));
        const op = opDoc.exists ? opDoc.data() : provDoc.data();
        const enabled = opDoc.exists ? op?.verified === true && op?.active === true : op?.verificado === true && op?.activo === true;
        if (!enabled || op?.status === 'inactivo') throw new Error('El proveedor ya no está habilitado.');
        const slot = slotAvailability(slotDoc.data(), tourId, providerId, tourDate, bookingTime, totalPassengers);
        const currentBooked = slot.bookedSeats;
        maxCapacity = slot.maxCapacity;
        if (currentBooked + totalPassengers > maxCapacity) {
          const availableLeft = Math.max(0, maxCapacity - currentBooked);
          throw new Error(`NO_AVAILABILITY: Solicitados ${totalPassengers} cupos pero solo quedan ${availableLeft} disponibles.`);
        }

        transaction.set(slotRef, {
          tourId,
          date: tourDate,
          time: bookingTime,
          bookedSeats: currentBooked + totalPassengers,
          maxCapacity,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        transaction.create(bookingRef, {
          ...JSON.parse(JSON.stringify(newBookingPayload)),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });

        if (idempotencyRef) {
          transaction.set(idempotencyRef, {
            fingerprint,
            bookingId,
            createdAt: FieldValue.serverTimestamp()
          }, { merge: true });
        }
      });

      console.log(`✅ [TRANSACCIÓN ATÓMICA ÉXITO] Reserva ${bookingId} creada. Slot ${slotKey} incrementado en ${totalPassengers}.`);
    } catch (err: any) {
      if (err.message === 'IDEMPOTENT_REPLAY' && idempotencyKey) {
        const previous = await getIdempotentResult(idempotencyKey);
        const replay = previous?.bookingId ? await getBookingById(previous.bookingId) : null;
        return { conflict: false, idempotent: true, booking: replay || (previous?.bookingId ? { bookingId: previous.bookingId } : undefined) };
      }
      if (err.message === 'IDEMPOTENCY_CONFLICT') {
        return { conflict: true, error: 'idempotency_conflict', message: 'La misma Idempotency-Key fue usada con datos diferentes.' };
      }
      if (err.message && err.message.startsWith('NO_AVAILABILITY:')) {
        return {
          conflict: true,
          error: 'sin_disponibilidad',
          message: err.message.replace('NO_AVAILABILITY:', '').trim(),
          capacidadMaxima: maxCapacity
        };
      }
      console.error('❌ Error en transacción Firestore:', err);
      return {
        conflict: true,
        error: 'error_transaccion',
        message: 'No se pudo completar la reserva por un error de concurrencia. Intente de nuevo.'
      };
    }
  } else {
    const currentMemoryBooked = inMemorySlots.get(slotKey) || 0;
    if (currentMemoryBooked + totalPassengers > maxCapacity) {
      return {
        conflict: true,
        error: 'sin_disponibilidad',
        message: `No queda cupo suficiente. Disponibles: ${maxCapacity - currentMemoryBooked}`,
        capacidadMaxima: maxCapacity
      };
    }
    inMemorySlots.set(slotKey, currentMemoryBooked + totalPassengers);
  }

  const responseBooking = {
    ...newBookingPayload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  inMemoryBookings.set(bookingId, responseBooking);

  const isSuspicious = (responseBooking.totalUSD > 1500) ||
    (responseBooking.customerEmail && /@(tempmail|mailinator|throwaway)\./i.test(responseBooking.customerEmail));
  const fraudRiskScore = isSuspicious ? 65 : 5;
  console.log(`🛡️ [AUTOMATIZACIÓN NATIVA] Antifraude evaluado: Score ${fraudRiskScore}/100 para ${bookingId}`);

  massiveEngine.enqueue(
    'INDIVIDUAL_BOOKING_AUTONOMOUS_DISPATCH',
    { booking: responseBooking },
    'BOOKING_LIFECYCLE'
  ).catch((err) => {
    console.error(`❌ [MASSIVE-ENGINE] Fallo en despacho asíncrono para ${bookingId}:`, err);
  });

  return { conflict: false, booking: responseBooking };
}

export async function getBookingById(bookingId: string): Promise<any | null> {
  const col = getBookingsCollection();
  if (!col) return process.env.NODE_ENV === 'test' ? inMemoryBookings.get(bookingId) || null : null;
  try {
    const doc = await col.doc(bookingId).get();
    if (!doc.exists) return null;
    const data = doc.data() || {};
    const booking: any = {
      id: doc.id,
      ...data,
      createdAt: normalizeTimestampToDate(data.createdAt).toISOString(),
      updatedAt: normalizeTimestampToDate(data.updatedAt).toISOString()
    };
    inMemoryBookings.set(booking.bookingId || booking.id, booking);
    return booking;
  } catch (error) {
    console.warn('Error recuperando reserva por ID:', error);
    return null;
  }
}

export async function getPendingReservationLifecycleBookings(limit = 100): Promise<any[]> {
  const col = getBookingsCollection();
  const safeLimit = Math.max(1, Math.min(250, limit));
  if (!col) return [];

  try {
    const snapshot = await col
      .where('status', 'in', ['pendiente_pago', 'payment_pending', 'pending', 'paid', 'provider_pending'])
      .orderBy('updatedAt', 'desc')
      .limit(safeLimit)
      .get();
    const results: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      results.push({
        id: doc.id,
        ...data,
        createdAt: normalizeTimestampToDate(data.createdAt).toISOString(),
        updatedAt: normalizeTimestampToDate(data.updatedAt).toISOString(),
        createdAtTimestamp: data.createdAt
      });
    });
    results.forEach((booking) => inMemoryBookings.set(booking.bookingId || booking.id, booking));
    return results;
  } catch (error) {
    console.warn('Error consultando reservas pendientes del lifecycle:', error);
    return [];
  }
}

export async function getPendingProviderSlaBookings(limit = 250): Promise<any[]> {
  const col = getBookingsCollection();
  const safeLimit = Math.max(1, Math.min(500, limit));
  if (!col) return [];
  try {
    const snapshot = await col.where('providerStatus', '==', 'pending').limit(safeLimit).get();
    const results: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      results.push({
        id: doc.id,
        ...data,
        createdAt: normalizeTimestampToDate(data.createdAt).toISOString(),
        updatedAt: normalizeTimestampToDate(data.updatedAt).toISOString(),
        dispatchedAt: Number(data.dispatchedAt || 0)
      });
    });
    return results.sort((a, b) => Number(a.dispatchedAt || 0) - Number(b.dispatchedAt || 0));
  } catch (error) {
    console.warn('Error consultando reservas con SLA de proveedor pendiente:', error);
    return [];
  }
}

export async function getAllBookings(): Promise<any[]> {
  const col = getBookingsCollection();
  if (col) {
    try {
      const snapshot = await col.orderBy('createdAt', 'desc').get();
      const results: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const createdDate = normalizeTimestampToDate(data.createdAt);
        const updatedDate = normalizeTimestampToDate(data.updatedAt);
        results.push({
          id: doc.id,
          ...data,
          createdAt: createdDate.toISOString(),
          updatedAt: updatedDate.toISOString(),
          createdAtTimestamp: data.createdAt
        });
      });

      if (results.length > 0) {
        results.forEach((b) => inMemoryBookings.set(b.bookingId || b.id, b));
        return results;
      }
    } catch (err) {
      console.warn('Error leyendo reservas de Firestore. Leyendo memoria:', err);
    }
  }

  return Array.from(inMemoryBookings.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateBookingStatus(
  bookingId: string,
  updates: Partial<any>
): Promise<{ success: boolean; booking?: any; error?: string }> {
  let existing = inMemoryBookings.get(bookingId);
  const db = getFirestoreDb();
  const col = getBookingsCollection();

  if (col) {
    try {
      const docRef = col.doc(bookingId);
      const doc = await docRef.get();
      existing = doc.exists ? doc.data() : undefined;
    } catch (err) {
      console.warn('Error buscando doc en Firestore:', err);
      return { success: false, error: 'No se pudo verificar el estado actual de la reserva.' };
    }
  }

  if (!existing) return { success: false, error: `Reserva con ID ${bookingId} no encontrada.` };

  const previousStatus = existing.status;
  const newStatus = updates.status;
  const fromLifecycle = normalizeBookingLifecycle(previousStatus, existing.paymentStatus);
  const toLifecycle = updates.status
    ? normalizeBookingLifecycle(updates.status)
    : normalizeBookingLifecycle(previousStatus, updates.paymentStatus);
  try {
    assertBookingTransition(fromLifecycle, toLifecycle);
  } catch (transitionErr: any) {
    return { success: false, error: transitionErr.message };
  }

  // Customer approval records commercial consent; it is never provider evidence.
  // This specifically contains the legacy /customer-confirm route while keeping
  // explicit operator/provider workflows available for supervised operations.
  if (toLifecycle === 'confirmed' && updates.customerConfirmedAt && !hasProviderConfirmationEvidence(existing, updates)) {
    return {
      success: false,
      error: 'La aprobación del cliente fue registrada, pero la reserva no puede confirmarse hasta recibir evidencia de confirmación del proveedor.'
    };
  }

  const isCancelling = (newStatus === 'cancelada' || newStatus === 'cancelled') &&
    (previousStatus !== 'cancelada' && previousStatus !== 'cancelled');
  const updatedBooking = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  let availabilityReleasedByTransaction = false;

  if (db && col) {
    try {
      if (isCancelling) {
        const bookingRef = col.doc(bookingId);
        availabilityReleasedByTransaction = await db.runTransaction(async (transaction) => {
          const bookingSnap = await transaction.get(bookingRef);
          if (!bookingSnap.exists) throw new Error('Reserva no encontrada durante la cancelación.');
          const current = bookingSnap.data() || {};
          const currentStatus = String(current.status || '').toLowerCase();
          const alreadyCancelled = currentStatus === 'cancelada' || currentStatus === 'cancelled';
          const alreadyReleased = current.availabilityReleased === true;
          if (!alreadyCancelled && !alreadyReleased) {
            const tourId = String(current.tourId || existing.tourId || '');
            const tourDate = String(current.date || existing.date || '');
            const bookingTime = String(current.time || existing.time || '08:00 AM');
            const passengers = (Number(current.adults) || Number(existing.adults) || 1) +
              (Number(current.children) || Number(existing.children) || 0);
            if (tourId && tourDate) {
              const slotRef = db.collection('availability_slots').doc(getSlotKey(tourId, tourDate, bookingTime));
              const slotDoc = await transaction.get(slotRef);
              if (slotDoc.exists) {
                const booked = Number(slotDoc.data()?.bookedSeats) || 0;
                transaction.update(slotRef, {
                  bookedSeats: Math.max(0, booked - passengers),
                  updatedAt: FieldValue.serverTimestamp()
                });
              }
              transaction.set(bookingRef, {
                ...updates,
                availabilityReleased: true,
                updatedAt: FieldValue.serverTimestamp()
              }, { merge: true });
              return true;
            }
          }
          transaction.set(bookingRef, { ...updates, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          return false;
        });
      } else {
        await col.doc(bookingId).set({ ...updates, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
    } catch (err: any) {
      console.error('Error actualizando en Firestore:', err);
      return { success: false, error: err.message };
    }
  } else if (isCancelling && existing.availabilityReleased !== true) {
    const tourId = existing.tourId;
    const tourDate = existing.date;
    const bookingTime = existing.time || '08:00 AM';
    const passengers = (Number(existing.adults) || 1) + (Number(existing.children) || 0);
    if (tourId && tourDate) {
      const slotKey = getSlotKey(tourId, tourDate, bookingTime);
      const currentMemory = inMemorySlots.get(slotKey) || 0;
      inMemorySlots.set(slotKey, Math.max(0, currentMemory - passengers));
    }
    updatedBooking.availabilityReleased = true;
  }

  if (availabilityReleasedByTransaction) {
    const slotKey = getSlotKey(String(existing.tourId || ''), String(existing.date || ''), String(existing.time || '08:00 AM'));
    const passengers = (Number(existing.adults) || 1) + (Number(existing.children) || 0);
    const currentMemory = inMemorySlots.get(slotKey) || 0;
    inMemorySlots.set(slotKey, Math.max(0, currentMemory - passengers));
    updatedBooking.availabilityReleased = true;
  }

  inMemoryBookings.set(bookingId, updatedBooking);
  return { success: true, booking: updatedBooking };
}

export async function getWeeklyConversionMetrics(): Promise<{
  period: { start: string; end: string; days: number };
  totalInquiries: number;
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  conversionRate: number;
  totalRevenueUSD: number;
  averageTicketUSD: number;
  topTours: Array<{ name: string; count: number; revenueUSD: number }>;
  paymentBreakdown: Record<string, number>;
}> {
  const allBookings = await getAllBookings();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentBookings = allBookings.filter((b) => {
    if (!b.createdAt) return true;
    const created = new Date(b.createdAt);
    return created >= sevenDaysAgo || allBookings.length < 15;
  });

  const totalBookings = recentBookings.length;
  const confirmed = recentBookings.filter((b) =>
    ['confirmada', 'confirmed'].includes(String(b.status || '').toLowerCase())
  );
  const pending = recentBookings.filter((b) =>
    ['pendiente_pago', 'payment_pending', 'pending', 'paid', 'provider_pending'].includes(String(b.status || '').toLowerCase())
  );
  const cancelled = recentBookings.filter(
    (b) => b.status === 'cancelada' || b.status === 'cancelled'
  );

  let totalInquiries = 0;
  const metricsDb = getFirestoreDb();
  if (metricsDb) {
    try {
      const eventSnapshot = await metricsDb.collection('agent_events').limit(500).get();
      totalInquiries = eventSnapshot.docs.filter(doc => {
        const data = doc.data() as any;
        const created = new Date(String(data.createdAt || '')).getTime();
        return data.type === 'conversation.turn.completed' && Number.isFinite(created) && created >= sevenDaysAgo.getTime();
      }).length;
    } catch (error) {
      console.warn('No se pudieron calcular inquiries reales desde agent_events:', error);
    }
  }
  const conversionRate = totalInquiries > 0
    ? Number(((confirmed.length / totalInquiries) * 100).toFixed(1))
    : 0;

  let totalRevenueUSD = 0;
  const tourStats: Record<string, { count: number; revenueUSD: number }> = {};
  const paymentBreakdown: Record<string, number> = {
    credit_card: 0,
    sinpe_movil: 0,
    paypal: 0
  };

  confirmed.forEach((b) => {
    const rev = Number(b.totalUSD) || Number(b.totalAmount) || 0;
    totalRevenueUSD += rev;

    const tName = b.tourName || 'Tour Costa Rica';
    if (!tourStats[tName]) tourStats[tName] = { count: 0, revenueUSD: 0 };
    tourStats[tName].count += 1;
    tourStats[tName].revenueUSD += rev;

    const method = b.paymentMethod || 'credit_card';
    paymentBreakdown[method] = (paymentBreakdown[method] || 0) + 1;
  });

  const averageTicketUSD = confirmed.length > 0
    ? Math.round(totalRevenueUSD / confirmed.length)
    : 0;

  const topTours = Object.entries(tourStats)
    .map(([name, stat]) => ({ name, count: stat.count, revenueUSD: stat.revenueUSD }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return {
    period: {
      start: sevenDaysAgo.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0],
      days: 7
    },
    totalInquiries: Math.round(totalInquiries),
    totalBookings,
    confirmedBookings: confirmed.length,
    pendingBookings: pending.length,
    cancelledBookings: cancelled.length,
    conversionRate,
    totalRevenueUSD,
    averageTicketUSD,
    topTours,
    paymentBreakdown
  };
}

/** Busca una reserva por código de confirmación, ID, email o PNR. */
export async function findBookingByCodeOrEmail(identifier: string): Promise<any | null> {
  const clean = String(identifier || '').trim().toLowerCase();
  if (!clean) return null;
  const col = getBookingsCollection();
  if (!col) {
    return Array.from(inMemoryBookings.values()).find((b: any) =>
      String(b.bookingId || b.id || '').toLowerCase() === clean ||
      String(b.customer?.email || b.customerEmail || '').toLowerCase() === clean ||
      String(b.flightDetails?.pnrLocator || '').toLowerCase() === clean
    ) || null;
  }
  try {
    const exactId = await col.doc(identifier.trim()).get();
    if (exactId.exists) return { id: exactId.id, ...exactId.data() };
    const [byId, byEmail, byNestedEmail, byPnr] = await Promise.all([
      col.where('bookingId', '==', identifier.trim()).limit(1).get(),
      col.where('customerEmail', '==', identifier.trim()).limit(5).get(),
      col.where('customer.email', '==', identifier.trim()).limit(5).get(),
      col.where('flightDetails.pnrLocator', '==', identifier.trim()).limit(5).get()
    ]);
    const docs = [...byId.docs, ...byEmail.docs, ...byNestedEmail.docs, ...byPnr.docs];
    if (docs.length) {
      const doc = docs[0];
      return { id: doc.id, ...doc.data() };
    }
    if (/\s/.test(clean)) {
      const recent = await col.orderBy('createdAt', 'desc').limit(100).get();
      const found = recent.docs.find((doc) =>
        String(doc.data()?.customer?.name || doc.data()?.customer?.fullName || doc.data()?.customerName || '')
          .toLowerCase().includes(clean)
      );
      if (found) return { id: found.id, ...found.data() };
    }
  } catch (error) {
    console.warn('Error ejecutando búsqueda indexada de reserva:', error);
  }
  return null;
}

export interface DailyOpsLogItem {
  id: string;
  timestamp: string;
  type: 'emergency' | 'weather_alert' | 'route_incident' | 'provider_issue' | 'operational_note';
  severity: 'baja' | 'media' | 'alta' | 'emergencia';
  details: string;
  actionTaken: string;
  assignedTo?: string;
  resolved: boolean;
}

const dailyOpsLogs: DailyOpsLogItem[] = [];

export function recordDailyOpsLog(item: Omit<DailyOpsLogItem, 'id' | 'timestamp'>): DailyOpsLogItem {
  const logItem: DailyOpsLogItem = {
    id: `OPS-${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    ...item
  };
  dailyOpsLogs.unshift(logItem);
  if (dailyOpsLogs.length > 200) dailyOpsLogs.pop();
  return logItem;
}

export function getDailyOpsLogs(): DailyOpsLogItem[] {
  return dailyOpsLogs;
}
