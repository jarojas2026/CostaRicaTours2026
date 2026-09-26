import crypto from 'crypto';
/**
 * 📦 Servicio de Reservas y Disponibilidad en Firestore para Costa Rica Tours
 * Gestiona persistencia, control de cupos atómico (evitando race conditions),
 * verificación de pagos del lado del servidor y resolución dinámica de operadores.
 */

import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import {
  getFirestore,
  FieldValue,
  Timestamp,
  type Firestore,
  type CollectionReference
} from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';
import Stripe from 'stripe';
import { TOURS } from '../src/data/toursData';
import { getIdempotentResult, idempotencyDocId, normalizeIdempotencyKey, requestFingerprint } from './idempotencyService';
import { assertBookingTransition, normalizeBookingLifecycle } from './bookingStateMachine';
import {
  executeProviderRealtimeCoordination,
  executeCustomerBookingConfirmation
} from './nativeWorkflows';
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

/**
 * Inicializa y devuelve la instancia de Firestore Admin
 */
export function getFirestoreDb(): Firestore | null {
  if (dbInstance) return dbInstance;

  try {
    const adminAny = admin as any;
    if (!adminAny.apps || adminAny.apps.length === 0) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        adminAny.initializeApp({
          credential: adminAny.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
      } else {
        adminAny.initializeApp();
      }
    }

    try {
      dbInstance = getFirestore(adminAny.app(), FIRESTORE_DATABASE_ID);
    } catch {
      dbInstance = getFirestore(adminAny.app());
    }

    return dbInstance;
  } catch (error) {
    console.warn('⚠️ Firestore Admin no disponible. Operando con caché en memoria segura.');
    return null;
  }
}

/**
 * Obtiene la referencia a la colección de reservas
 */
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

/**
 * Normaliza cualquier formato de fecha o Timestamp de Firestore a objeto Date
 */
export function normalizeTimestampToDate(timestampVal: any): Date {
  if (!timestampVal) return new Date();
  if (typeof timestampVal.toDate === 'function') {
    return timestampVal.toDate();
  }
  if (typeof timestampVal._seconds === 'number') {
    return new Date(timestampVal._seconds * 1000);
  }
  if (typeof timestampVal.seconds === 'number') {
    return new Date(timestampVal.seconds * 1000);
  }
  const parsed = new Date(timestampVal);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Genera la clave determinística para el slot de disponibilidad
 */
export function getSlotKey(tourId: string, date: string, time: string): string {
  const cleanTime = (time || '08:00 AM').replace(/[^a-zA-Z0-9]/g, '_');
  return `${tourId}_${date}_${cleanTime}`;
}

/**
 * Inicialización de clientes de pago y Gemini
 */
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

/**
 * 5. OBTENCIÓN DINÁMICA DE OPERADORES DESDE FIRESTORE
 * Consulta la colección 'operators' (o 'proveedores') en Firestore sin hardcoding.
 */
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

  if (!db) return defaultFallback;

  try {
    // 1. Buscar en colección 'operators'
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

    // 2. Buscar en colección 'proveedores'
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

  // No se fabrican proveedores operativos si Firestore no contiene el registro verificado.


  return defaultFallback;
}

/**
 * 1. CONTROL DE DISPONIBILIDAD Y CUPOS EN TIEMPO REAL
 * Compara las reservas existentes para (tourId, date, time) contra el maxGroupSize del tour.
 */
export async function checkTourAvailability(
  tourId: string,
  date: string,
  time?: string,
  requestedSeats = 1
): Promise<{ available: boolean; remainingSeats: number; maxCapacity: number; reason?: string }> {
  const tour = TOURS.find((t) => t.id === tourId);
  const maxCapacity = tour?.maxGroupSize || 15;
  const bookingTime = time || '08:00 AM';
  const slotKey = getSlotKey(tourId, date, bookingTime);

  const db = getFirestoreDb();
  let alreadyBooked = 0;

  if (db) {
    try {
      // 1. Revisar colección de slots atómicos
      const slotDoc = await db.collection('availability_slots').doc(slotKey).get();
      if (slotDoc.exists) {
        alreadyBooked = Number(slotDoc.data()?.bookedSeats) || 0;
      } else {
        // Fallback de lectura agregada de bookings
        const snapshot = await db.collection('bookings')
          .where('tourId', '==', tourId)
          .where('date', '==', date)
          .where('time', '==', bookingTime)
          .get();

        snapshot.forEach((doc) => {
          const b = doc.data();
          if (b.status !== 'cancelada' && b.status !== 'cancelled') {
            alreadyBooked += (Number(b.adults) || 0) + (Number(b.children) || 0);
          }
        });
      }
    } catch (err) {
      console.warn('Error al verificar cupos en Firestore:', err);
      alreadyBooked = inMemorySlots.get(slotKey) || 0;
    }
  } else {
    if (process.env.NODE_ENV === 'production') {
      return {
        available: false,
        remainingSeats: 0,
        maxCapacity,
        reason: 'availability_store_unavailable: no se puede prometer disponibilidad sin la fuente transaccional de verdad.'
      };
    }
    alreadyBooked = inMemorySlots.get(slotKey) || 0;
  }

  const remainingSeats = Math.max(0, maxCapacity - alreadyBooked);
  const available = remainingSeats >= requestedSeats;

  return {
    available,
    remainingSeats,
    maxCapacity,
    reason: available
      ? undefined
      : `No queda cupo suficiente. Cupos disponibles: ${remainingSeats}, solicitados: ${requestedSeats}.`
  };
}

/**
 * 2. VERIFICACIÓN DE PAGO DEL LADO DEL SERVIDOR
 * Valida de manera segura contra las APIs de PayPal o Stripe antes de confirmar.
 */
export async function verifyPaymentServerSide(
  paymentMethod: string,
  details: { paypalOrderId?: string; stripeSessionId?: string }
): Promise<{ verified: boolean; status: 'confirmada' | 'pendiente_pago'; paymentStatus: 'completed' | 'pending'; meta?: any }> {
  // Verificación con PayPal Orders API
  if (paymentMethod === 'paypal' && details.paypalOrderId) {
    try {
      const paypalClientId = process.env.PAYPAL_CLIENT_ID;
      const paypalSecret = process.env.PAYPAL_SECRET;
      const paypalMode = process.env.PAYPAL_MODE || 'sandbox';
      const baseUrl =
        paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

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
              status: 'confirmada',
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

  // Verificación con Stripe Checkout Sessions API
  if ((paymentMethod === 'credit_card' || paymentMethod === 'stripe') && details.stripeSessionId) {
    try {
      const stripe = getStripe();
      if (stripe) {
        const session = await stripe.checkout.sessions.retrieve(details.stripeSessionId);
        if (session.payment_status === 'paid') {
          return {
            verified: true,
            status: 'confirmada',
            paymentStatus: 'completed',
            meta: { stripePaymentIntent: session.payment_intent }
          };
        }
      }
    } catch (err) {
      console.error('Error verificando sesión de Stripe:', err);
    }
  }

  return {
    verified: false,
    status: 'pendiente_pago',
    paymentStatus: 'pending'
  };
}

/**
 * Genera insights operativos mediante IA para el operador local
 */
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

    if (response.text) {
      return JSON.parse(response.text);
    }
  } catch (err) {
    console.error('Error generando insights con Gemini:', err);
  }
  return null;
}

/**
 * 3. PERSISTENCIA ATÓMICA CON CONTROL DE CONCURRENCIA (RACE CONDITION FIX)
 * Ejecuta una transacción atómica `db.runTransaction()` en Firestore Admin,
 * actualizando el contador en `availability_slots` y guardando la reserva en `bookings`.
 */
async function getConfiguredTourProviderId(tourId: string, requestedProviderId?: unknown): Promise<string | null> {
  const explicit = String(requestedProviderId || '').trim();
  if (explicit) return explicit;

  const tour = TOURS.find((item) => item.id === tourId);
  const catalogProviderId = String((tour as any)?.providerId || '').trim();
  if (catalogProviderId) return catalogProviderId;

  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const assignment = await db.collection('tour_provider_assignments').doc(tourId).get();
    if (!assignment.exists) return null;
    const data = assignment.data() || {};
    if (data.active === false) return null;
    const providerId = String(data.providerId || '').trim();
    return providerId || null;
  } catch (error) {
    console.warn(`No se pudo resolver el proveedor configurado para el tour ${tourId}:`, error);
    return null;
  }
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

  const bookingId = String(data.bookingId || `CR-PV-${crypto.randomUUID()}`).trim();
  const bookingTime = data.time || '08:00 AM';
  const numAdults = Number(data.adults) || 1;
  const numChildren = Number(data.children) || 0;
  const totalPassengers = numAdults + numChildren;
  const tourId = data.tourId || 'tour-custom';
  const tourDate = data.date;

  const tourInfo = TOURS.find((t) => t.id === tourId);
  const maxCapacity = tourInfo?.maxGroupSize || 15;
  const slotKey = getSlotKey(tourId, tourDate, bookingTime);

  // 1. Resolver el proveedor operativo desde solicitud, catálogo o asignación persistida.
  const providerId = await getConfiguredTourProviderId(tourId, data.providerId);
  if (!providerId) {
    throw new Error(`PROVIDER_REQUIRED: el tour ${tourId} no tiene un proveedor operativo configurado.`);
  }
  const providerInfo = await getOperatorById(providerId);
  if (!providerInfo.active || providerInfo.verified !== true) {
    throw new Error(`PROVIDER_NOT_OPERATIONAL: el proveedor ${providerId} no está activo y verificado en la fuente operativa.`);
  }

  // 2. Validar pago del lado del servidor de forma estricta (NUNCA adoptar estado del cliente)
  let paymentResult: {
    verified: boolean;
    status: 'confirmada' | 'pendiente_pago';
    paymentStatus: 'completed' | 'pending';
    meta?: any;
  } = {
    verified: false,
    status: 'pendiente_pago',
    paymentStatus: 'pending',
    meta: undefined
  };

  if (data.paypalOrderId || data.stripeSessionId) {
    paymentResult = await verifyPaymentServerSide(data.paymentMethod || 'credit_card', {
      paypalOrderId: data.paypalOrderId,
      stripeSessionId: data.stripeSessionId
    });
  } else if (data.sinpeReference) {
    // Si viene referencia SINPE, queda pendiente de verificación manual por operador
    paymentResult = {
      verified: false,
      status: 'pendiente_pago',
      paymentStatus: 'pending',
      meta: { sinpeReference: data.sinpeReference, verificationMethod: 'sinpe_movil_manual' }
    };
  }

  // 3. Generar insights operativos con IA
  const agentInsights = await generateOperationalInsights({
    ...data,
    time: bookingTime,
    adults: numAdults,
    children: numChildren
  });

  const catalogTotalUSD = tourInfo && typeof tourInfo.priceUSD === 'number'
    ? Number((tourInfo.priceUSD * numAdults + tourInfo.priceUSD * 0.7 * numChildren).toFixed(2))
    : null;
  const calculatedUSD = catalogTotalUSD !== null
    ? catalogTotalUSD
    : Number(data.totalUSD || (data.currency === 'CRC' ? Number(data.totalAmount || 0) / getUsdToCrcRate() : data.totalAmount) || 0);
  if (!Number.isFinite(calculatedUSD) || calculatedUSD <= 0) {
    throw new Error('PRICE_REQUIRED: no existe un total autoritativo válido para esta reserva.');
  }

  const customerObj = data.customer || {
    name: data.customerName || 'Cliente',
    email: data.customerEmail || '',
    phone: data.customerPhone || '',
    country: data.customerCountry || 'CR'
  };

  const db = getFirestoreDb();

  // Objeto de reserva estandarizado con Timestamp nativo en Firestore
  const newBookingPayload = {
    bookingId,
    tourId,
    tourName: data.tourName || tourInfo?.title?.es || 'Tour en Costa Rica',
    providerId,
    date: tourDate,
    time: bookingTime,
    adults: numAdults,
    children: numChildren,
    pickupHotel: data.pickupHotel || 'Recepción del Hotel',
    specialRequests: data.specialRequests || '',
    totalUSD: calculatedUSD,
    totalCRC: Math.round(calculatedUSD * getUsdToCrcRate()),
    totalAmount: data.currency === 'CRC' ? Math.round(calculatedUSD * getUsdToCrcRate()) : calculatedUSD,
    currency: data.currency || 'USD',
    paymentMethod: data.paymentMethod || 'credit_card',
    paymentStatus: paymentResult.paymentStatus,
    status: paymentResult.status,
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

  // =========================================================================
  // TRANSACCIÓN ATÓMICA DE FIRESTORE (Previene Race Conditions y Sobre-Reserva)
  // =========================================================================
  if (db) {
    try {
      await db.runTransaction(async (transaction) => {
        const slotRef = db.collection('availability_slots').doc(slotKey);
        const bookingRef = db.collection('bookings').doc(bookingId);
        const idempotencyRef = idempotencyKey ? db.collection('idempotency_keys').doc(idempotencyDocId(idempotencyKey)) : null;

        // 1. Idempotencia + lectura transaccional del cupo
        if (idempotencyRef) {
          const idemDoc = await transaction.get(idempotencyRef);
          if (idemDoc.exists) {
            const existing = idemDoc.data() || {};
            if (existing.fingerprint && existing.fingerprint !== fingerprint) throw new Error('IDEMPOTENCY_CONFLICT');
            throw new Error('IDEMPOTENT_REPLAY');
          }
        }
        const slotDoc = await transaction.get(slotRef);
        const currentBooked = slotDoc.exists ? (Number(slotDoc.data()?.bookedSeats) || 0) : 0;

        if (currentBooked + totalPassengers > maxCapacity) {
          const availableLeft = Math.max(0, maxCapacity - currentBooked);
          throw new Error(`NO_AVAILABILITY: Solicitados ${totalPassengers} cupos pero solo quedan ${availableLeft} disponibles.`);
        }

        // 2. Escritura atómica del nuevo cupo en availability_slots
        transaction.set(
          slotRef,
          {
            tourId,
            date: tourDate,
            time: bookingTime,
            bookedSeats: currentBooked + totalPassengers,
            maxCapacity,
            updatedAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        );

        // 3. Escritura atómica de la reserva con Timestamp nativo
        transaction.set(bookingRef, {
          ...newBookingPayload,
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
    // En producción, una reserva no puede confirmarse/persistirse sólo en memoria:
    // Firestore es la fuente transaccional de verdad para cupos y reservas.
    if (process.env.NODE_ENV === 'production') {
      return {
        conflict: true,
        error: 'persistence_unavailable',
        message: 'El sistema de reservas no tiene acceso a Firestore; no se aceptó la reserva para evitar pérdida o sobreventa.'
      };
    }
    // Modo de reserva en memoria sólo para desarrollo/sin credenciales de Firebase Admin.
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

  // Guardar copia normalizada en memoria para respuestas JSON del cliente
  const responseBooking = {
    ...newBookingPayload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  inMemoryBookings.set(bookingId, responseBooking);

  // 4. Automatización de antifraude inmediata
  const isSuspicious = (responseBooking.totalUSD > 1500) || (responseBooking.customerEmail && /@(tempmail|mailinator|throwaway)\./i.test(responseBooking.customerEmail));
  const fraudRiskScore = isSuspicious ? 65 : 5;
  console.log(`🛡️ [AUTOMATIZACIÓN NATIVA] Antifraude evaluado: Score ${fraudRiskScore}/100 para ${bookingId}`);

  // 5. Despacho NATIVO MASIVO y AISLADO para cada reserva individual
  // Encola la tarea en el motor de alto rendimiento para monitoreo de SLA segundo a segundo
  massiveEngine.enqueue(
    'INDIVIDUAL_BOOKING_AUTONOMOUS_DISPATCH',
    { booking: responseBooking },
    'BOOKING_LIFECYCLE'
  ).catch((err) => {
    console.error(`❌ [MASSIVE-ENGINE] Fallo en despacho asíncrono para ${bookingId}:`, err);
  });

  // automatización nativa fue reemplazado por completo por backend/nativeWorkflows.ts (7
  // workflows migrados a código propio, sin dependencias externas de pago).
  // La automatización y notificaciones se ejecutan directamente en el
  // motor nativo. Ver docs/estado-real-del-sistema.md para el detalle.

  return { conflict: false, booking: responseBooking };
}

/**
 * Persiste reservas de servicios especiales (vuelos/hospitality/transportes)
 * que no forman parte del catálogo de tours. El cálculo del precio y la
 * validación del servicio viven en server.ts; esta función centraliza la
 * escritura y mantiene el mismo modelo de bookings.
 */
export async function createSpecialServiceBooking(data: any) {
  const bookingId = String(data.bookingId || `CRT-SVC-${crypto.randomUUID()}`).trim();
  const totalUSD = Number(data.totalUSD);
  const adults = Math.max(1, Number(data.adults) || 1);
  const children = Math.max(0, Number(data.children) || 0);
  const date = String(data.date || '').trim();
  const customer = data.customer || {};
  if (!bookingId || !date || !Number.isFinite(totalUSD) || totalUSD <= 0) throw new Error('SPECIAL_BOOKING_INVALID: faltan datos o totalUSD válido.');
  if (!String(customer.email || '').includes('@')) throw new Error('CUSTOMER_EMAIL_REQUIRED: correo válido obligatorio.');
  const db = getFirestoreDb();
  if (!db && process.env.NODE_ENV === 'production') throw new Error('PERSISTENCE_REQUIRED: Firestore no disponible.');
  const payload = {
    bookingId,
    bookingDomain: 'service',
    serviceType: String(data.serviceType || 'special'),
    serviceId: String(data.serviceId || '').trim(),
    tourId: String(data.tourId || data.serviceId || bookingId),
    tourName: String(data.tourName || 'Servicio Costa Rica Tours'),
    date,
    checkOutDate: data.checkOutDate || undefined,
    time: String(data.time || '08:00 AM'),
    adults,
    children,
    pickupHotel: String(data.pickupHotel || ''),
    specialRequests: String(data.specialRequests || '').slice(0, 4000),
    totalUSD,
    totalCRC: Math.round(totalUSD * getUsdToCrcRate()),
    totalAmount: totalUSD,
    currency: 'USD',
    paymentMethod: String(data.paymentMethod || 'credit_card'),
    paymentStatus: 'pending',
    status: 'pendiente_pago',
    customerName: String(customer.fullName || customer.name || '').trim(),
    customerEmail: String(customer.email || '').trim().toLowerCase(),
    customerPhone: String(customer.phone || '').trim(),
    customer,
    flightDetails: data.flightDetails || undefined,
    serviceDetails: data.serviceDetails || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (db) {
    const ref = db.collection('bookings').doc(bookingId);
    const existing = await ref.get();
    if (existing.exists) return { conflict: false, idempotent: true, booking: { id: ref.id, ...existing.data() } };
    await ref.create({ ...payload, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  }
  inMemoryBookings.set(bookingId, payload);
  return { conflict: false, booking: payload };
}
/**
 * Lee todas las reservas desde Firestore (o caché en memoria)
 * Normalizando Timestamps de Firestore a formato serializable.
 */
export async function getBookingById(bookingId: string): Promise<any | null> {
  const cached = inMemoryBookings.get(bookingId);
  if (cached) return cached;
  const col = getBookingsCollection();
  if (!col) return null;
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

/**
 * Recupera sólo reservas que todavía pueden requerir una transición autónoma.
 * Conserva getAllBookings() para backoffice y compatibilidad histórica.
 */
export async function getExpiredSoftHolds(limit = 250): Promise<any[]> {
  const col = getBookingsCollection();
  const safeLimit = Math.max(1, Math.min(500, limit));
  if (!col) return [];
  const now = new Date().toISOString();
  try {
    const snapshot = await col
      .where('holdExpiresAt', '<=', now)
      .orderBy('holdExpiresAt', 'asc')
      .limit(safeLimit)
      .get();
    return snapshot.docs
      .map((doc: any) => ({ id: doc.id, ...doc.data(), createdAt: normalizeTimestampToDate(doc.data()?.createdAt).toISOString(), updatedAt: normalizeTimestampToDate(doc.data()?.updatedAt).toISOString() }))
      .filter((b: any) => (b.status === 'hold' || b.status === 'pendiente_pago' || b.holdActive === true) && b.holdActive !== false);
  } catch (error) {
    console.warn('Error consultando soft holds expirados:', error);
    return [];
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
    const lifecycleResults = results.filter((booking) => booking.bookingDomain !== 'service');
    lifecycleResults.forEach((booking) => inMemoryBookings.set(booking.bookingId || booking.id, booking));
    return lifecycleResults;
  } catch (error) {
    console.warn('Error consultando reservas pendientes del lifecycle:', error);
    return [];
  }
}

/** Recupera sólo reservas con seguimiento de proveedor pendiente. */
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

/**
 * Actualiza una reserva en Firestore por su ID con Timestamp nativo
 * Si el estado cambia a cancelada/cancelled, libera de forma transaccional los cupos en availability_slots.
 */
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
      if (doc.exists) {
        existing = { ...doc.data(), ...existing };
      }
    } catch (err) {
      console.warn('Error buscando doc en Firestore:', err);
    }
  }

  if (!existing) {
    return { success: false, error: `Reserva con ID ${bookingId} no encontrada.` };
  }

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

  const isCancelling = (newStatus === 'cancelada' || newStatus === 'cancelled') &&
                       (previousStatus !== 'cancelada' && previousStatus !== 'cancelled');

  const updatedBooking = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  let availabilityReleasedByTransaction = false;

  // Persistir primero. La liberación de cupos ocurre dentro de la misma transacción
  // que cambia el estado para que una cancelación duplicada sea inocua.
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
            const passengers = (Number(current.adults) || Number(existing.adults) || 1) + (Number(current.children) || Number(existing.children) || 0);
            if (tourId && tourDate) {
              const slotRef = db.collection('availability_slots').doc(getSlotKey(tourId, tourDate, bookingTime));
              const slotDoc = await transaction.get(slotRef);
              if (slotDoc.exists) {
                const booked = Number(slotDoc.data()?.bookedSeats) || 0;
                transaction.update(slotRef, { bookedSeats: Math.max(0, booked - passengers), updatedAt: FieldValue.serverTimestamp() });
              }
              transaction.set(bookingRef, { ...updates, availabilityReleased: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
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

/**
 * 📊 Calcula métricas semanales de Tasa de Conversión y volumen de reservas desde Firestore
 */
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
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const col = getBookingsCollection();
  let recentBookings: any[] = [];
  if (col) {
    try {
      const snapshot = await col.orderBy('createdAt', 'desc').limit(1000).get();
      recentBookings = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data(), createdAt: normalizeTimestampToDate(doc.data()?.createdAt).toISOString() }))
        .filter((b: any) => new Date(b.createdAt).getTime() >= sevenDaysAgo.getTime());
    } catch (error) {
      console.warn('No se pudo leer el índice reciente de reservas para métricas:', error);
      recentBookings = [];
    }
  } else if (process.env.NODE_ENV !== 'production') {
    recentBookings = Array.from(inMemoryBookings.values()).filter((b: any) => new Date(String(b.createdAt || '')).getTime() >= sevenDaysAgo.getTime());
  }

  const totalBookings = recentBookings.length;
  const confirmed = recentBookings.filter(
    (b) => b.status === 'confirmada' || b.paymentStatus === 'completed'
  );
  const pending = recentBookings.filter(
    (b) => b.status === 'pendiente_pago' || b.paymentStatus === 'pending'
  );
  const cancelled = recentBookings.filter(
    (b) => b.status === 'cancelada' || b.status === 'cancelled'
  );

  // Métrica comercial real: contamos conversaciones registradas por el Agent Mesh.
  // Si Firestore no está disponible, no inventamos inquiries; devolvemos 0.
  let totalInquiries = 0;
  const metricsDb = getFirestoreDb();
  if (metricsDb) {
    try {
      const eventSnapshot = await metricsDb.collection('agent_events').orderBy('createdAt', 'desc').limit(1000).get();
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
    if (!tourStats[tName]) {
      tourStats[tName] = { count: 0, revenueUSD: 0 };
    }
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

/**
 * Busca una reserva en tiempo real por código de confirmación, ID o email
 */
export async function findBookingByCodeOrEmail(identifier: string): Promise<any | null> {
  const clean = String(identifier || '').trim().toLowerCase();
  if (!clean) return null;
  const col = getBookingsCollection();
  if (!col) {
    return Array.from(inMemoryBookings.values()).find((b: any) => String(b.bookingId || b.id || '').toLowerCase() === clean || String(b.customer?.email || b.customerEmail || '').toLowerCase() === clean || String(b.flightDetails?.pnrLocator || '').toLowerCase() === clean) || null;
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
      const found = recent.docs.find((doc) => String(doc.data()?.customer?.name || doc.data()?.customer?.fullName || doc.data()?.customerName || '').toLowerCase().includes(clean));
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

/**
 * Registra una acción o incidente operativo para el reporte diario de operaciones
 */
export function recordDailyOpsLog(item: Omit<DailyOpsLogItem, 'id' | 'timestamp'>): DailyOpsLogItem {
  const logItem: DailyOpsLogItem = {
    id: `OPS-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    ...item
  };
  dailyOpsLogs.unshift(logItem);
  if (dailyOpsLogs.length > 200) dailyOpsLogs.pop();
  return logItem;
}

/**
 * Retorna los logs operativos recientes
 */
export function getDailyOpsLogs(): DailyOpsLogItem[] {
  return dailyOpsLogs;
}
