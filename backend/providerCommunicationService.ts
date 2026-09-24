/**
 * 🇨🇷 SERVICIO MAESTRO DE COMUNICACIÓN CON PROVEEDORES & OPERADORES LOCALES 2026
 * =========================================================================
 * Gestiona el ciclo de vida completo de despacho, confirmación de cupos, 
 * hojas de ruta para choferes (Waze/Maps), protocolos de contingencia y 
 * liquidaciones automatizadas (SINPE Móvil / IBAN) con operadores en Costa Rica.
 * =========================================================================
 */

import { getAllBookings, updateBookingStatus } from './bookingService';
import { createAlert } from './alertService';
import { sendEmail } from './notificationService';

export const PROVIDER_DEV_EMAIL = process.env.PROVIDER_DEV_EMAIL || '';

function resolveConfiguredProviderEmail(provider: TourProvider): string {
  const raw = process.env.PROVIDER_EMAILS_JSON;
  if (raw) {
    try {
      const mapping = JSON.parse(raw) as Record<string, string>;
      const configured = mapping[provider.id];
      if (configured && /@/.test(configured)) return configured.trim();
    } catch {
      console.warn('⚠️ PROVIDER_EMAILS_JSON no es JSON válido.');
    }
  }
  return provider.email && /@/.test(provider.email) ? provider.email.trim() : '';
}

export interface TourProvider {
  id: string;
  name: string;
  category: 'adventure' | 'transport' | 'naturalist_guide' | 'lodging_thermal' | 'authority';
  region: string;
  contactName: string;
  phone: string;
  whatsapp: string;
  email: string;
  officialEmail?: string;
  verified?: boolean;
  cstLevel: number; // Certificación para la Sostenibilidad Turística (1 a 5)
  insPolicyNumber: string;
  ictLicense: string;
  activeTours: string[];
  slaTargetMinutes: number;
  averageResponseMinutes: number;
  acceptanceRate: number; // 0 - 100%
  status: 'active' | 'busy' | 'offline';
  payoutAccount: {
    type: 'sinpe_movil' | 'iban_colones' | 'iban_dolares';
    number: string;
    bank: string;
    holderName: string;
  };
}

export interface ServiceOrder {
  id: string;
  bookingId: string;
  tourId: string;
  tourName: string;
  providerId: string;
  providerName: string;
  date: string;
  time: string;
  adults: number;
  children: number;
  pickupLocation: string;
  wazeUrl: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    dietaryRestrictions?: string;
    specialNeeds?: string;
  };
  payoutAmountUSD: number;
  payoutAmountCRC: number;
  platformFeeUSD: number;
  status: 'dispatched' | 'confirmed' | 'in_progress' | 'completed' | 'reassigned' | 'rejected' | 'no_show';
  dispatchedAt: string;
  confirmedAt?: string;
  slaDeadline: string;
  notes?: string;
  failoverAttempts: number;
}

// Directorio histórico de referencia. NO es fuente de verdad operativa: los proveedores deben existir y estar verificados explícitamente en Firestore.
export const REGISTERED_PROVIDERS: TourProvider[] = [
  {
    id: 'prov_sarapiqui_rafting',
    name: 'Sarapiquí Outdoor Expeditions & Rafting S.A.',
    category: 'adventure',
    region: 'Sarapiquí / Arenal',
    contactName: 'Maynor Alvarado (Director de Operaciones)',
    phone: '+506 2766-4100',
    whatsapp: '+506 8795-9148',
    email: PROVIDER_DEV_EMAIL,
    officialEmail: 'operaciones@sarapiquirafting.cr',
    cstLevel: 5,
    insPolicyNumber: 'INS-RC-2026-88194',
    ictLicense: 'ICT-AV-0419',
    activeTours: ['sarapiqui-rafting-class-3', 'pacuare-river-rafting', 'arenal-volcano-hot-springs'],
    slaTargetMinutes: 20,
    averageResponseMinutes: 8,
    acceptanceRate: 98.6,
    status: 'active',
    payoutAccount: {
      type: 'sinpe_movil',
      number: '87959148',
      bank: '',
      holderName: ''
    }
  },
  {
    id: 'prov_monteverde_canopy',
    name: 'Monteverde Cloud Forest Adventures',
    category: 'adventure',
    region: 'Monteverde (Puntarenas)',
    contactName: 'Elena Brenes Chacón',
    phone: '+506 2645-5020',
    whatsapp: '',
    email: PROVIDER_DEV_EMAIL,
    officialEmail: 'reservas@monteverdeadventures.com',
    cstLevel: 4,
    insPolicyNumber: 'INS-RC-2026-99201',
    ictLicense: 'ICT-AV-0210',
    activeTours: ['monteverde-cloud-forest-canopy', 'monteverde-hanging-bridges', 'monteverde-night-walk'],
    slaTargetMinutes: 25,
    averageResponseMinutes: 12,
    acceptanceRate: 99.1,
    status: 'active',
    payoutAccount: {
      type: 'iban_dolares',
      number: 'CR05015100010026455020',
      bank: '',
      holderName: ''
    }
  },
  {
    id: 'prov_transporte_central',
    name: 'EcoTrans Costa Rica Transportes Turísticos',
    category: 'transport',
    region: 'Valle Central / Guanacaste / Arenal',
    contactName: 'Don Rodrigo Solano (Jefe de Flota)',
    phone: '+506 2220-3344',
    whatsapp: '+506 8412-9900',
    email: PROVIDER_DEV_EMAIL,
    officialEmail: 'flota@ecotranscostarica.com',
    cstLevel: 5,
    insPolicyNumber: 'INS-VEH-2026-77312',
    ictLicense: 'MOPT-TUR-9012',
    activeTours: ['transporte-privado-sjo', 'shuttle-arenal-monteverde', 'traslados-aeropuerto'],
    slaTargetMinutes: 15,
    averageResponseMinutes: 5,
    acceptanceRate: 99.8,
    status: 'active',
    payoutAccount: {
      type: 'sinpe_movil',
      number: '84129900',
      bank: '',
      holderName: ''
    }
  },
  {
    id: 'prov_manuel_antonio_guides',
    name: 'Asociación de Guías Naturalistas de Manuel Antonio',
    category: 'naturalist_guide',
    region: 'Manuel Antonio / Quepos',
    contactName: 'Guía Juan Carlos Monge (Lic. ICT #112)',
    phone: '+506 2777-1890',
    whatsapp: '+506 8301-4455',
    email: PROVIDER_DEV_EMAIL,
    officialEmail: 'guias@manuelantoniopark.cr',
    cstLevel: 5,
    insPolicyNumber: 'INS-GUIDE-2026-3391',
    ictLicense: 'ICT-GN-0112',
    activeTours: ['manuel-antonio-national-park', 'catamaran-ocean-king-manuel-antonio', 'damas-island-mangrove-boat'],
    slaTargetMinutes: 15,
    averageResponseMinutes: 6,
    acceptanceRate: 97.9,
    status: 'active',
    payoutAccount: {
      type: 'sinpe_movil',
      number: '83014455',
      bank: '',
      holderName: ''
    }
  },
  {
    id: 'prov_tortuguero_expeditions',
    name: 'Tortuguero Eco-Waterway Safaris',
    category: 'adventure',
    region: 'Tortuguero (Caribe Norte)',
    contactName: 'Yolanda Campbell',
    phone: '+506 2709-8012',
    whatsapp: '+506 8654-3210',
    email: PROVIDER_DEV_EMAIL,
    officialEmail: 'booking@tortuguerosafaris.cr',
    cstLevel: 4,
    insPolicyNumber: 'INS-MAR-2026-6612',
    ictLicense: 'ICT-MAR-0089',
    activeTours: ['tortuguero-canals-wildlife', 'tortuguero-turtle-nesting-night'],
    slaTargetMinutes: 30,
    averageResponseMinutes: 14,
    acceptanceRate: 96.5,
    status: 'active',
    payoutAccount: {
      type: 'iban_colones',
      number: 'CR12015202001027098012',
      bank: '',
      holderName: ''
    }
  }
];

// Registro en memoria de órdenes de servicio
const serviceOrdersStore: Map<string, ServiceOrder> = new Map();

async function persistServiceOrder(order: ServiceOrder) {
  const db = (await import('./bookingService')).getFirestoreDb();
  if (db) {
    await db.collection('service_orders').doc(order.id).set(order, { merge: true });
  }
}

async function loadServiceOrder(orderId: string): Promise<ServiceOrder | null> {
  const cached = serviceOrdersStore.get(orderId);
  if (cached) return cached;
  const db = (await import('./bookingService')).getFirestoreDb();
  if (!db) return null;
  const doc = await db.collection('service_orders').doc(orderId).get();
  if (!doc.exists) return null;
  const order = doc.data() as ServiceOrder;
  serviceOrdersStore.set(orderId, order);
  return order;
}

/**
 * Obtiene o asigna el proveedor ideal para un tour
 */
function isOperationallyVerifiedProvider(provider: TourProvider): boolean {
  return provider.verified === true || (
    process.env.NODE_ENV !== 'production' &&
    process.env.ALLOW_LEGACY_PROVIDER_DIRECTORY === 'true'
  );
}

export function getBestProviderForTour(tourId: string): TourProvider {
  const match = REGISTERED_PROVIDERS.find(
    p => p.activeTours.includes(tourId) && p.status === 'active' && isOperationallyVerifiedProvider(p)
  );
  if (!match) {
    throw new Error(`No hay un proveedor verificado y activo para el tour ${tourId}.`);
  }
  return match;
}

/**
 * Genera y despacha una orden de servicio a un operador
 */
export async function dispatchServiceOrder(params: {
  bookingId: string;
  tourId: string;
  tourName: string;
  date: string;
  time: string;
  adults: number;
  children: number;
  pickupLocation: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    dietaryRestrictions?: string;
    specialNeeds?: string;
  };
  totalUSD: number;
  providerId?: string;
}): Promise<ServiceOrder> {
  const provider = params.providerId 
    ? REGISTERED_PROVIDERS.find(p => p.id === params.providerId) || getBestProviderForTour(params.tourId)
    : getBestProviderForTour(params.tourId);

  const orderId = `OS-CR-${params.bookingId}-${Date.now().toString().slice(-4)}`;
  const now = new Date();
  const slaDeadline = new Date(now.getTime() + provider.slaTargetMinutes * 60000).toISOString();

  // Desglose de liquidación: 85% para el operador local, 15% comisión de plataforma
  const payoutAmountUSD = Math.round(params.totalUSD * 0.85 * 100) / 100;
  const platformFeeUSD = Math.round(params.totalUSD * 0.15 * 100) / 100;
  const exchangeRate = Number(process.env.USD_TO_CRC_RATE);
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error('USD_TO_CRC_RATE no está configurado; no se puede calcular la liquidación en CRC.');
  }
  const payoutAmountCRC = Math.round(payoutAmountUSD * exchangeRate);

  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(params.pickupLocation || 'San Jose Costa Rica')}`;

  const order: ServiceOrder = {
    id: orderId,
    bookingId: params.bookingId,
    tourId: params.tourId,
    tourName: params.tourName,
    providerId: provider.id,
    providerName: provider.name,
    date: params.date,
    time: params.time,
    adults: params.adults,
    children: params.children,
    pickupLocation: params.pickupLocation,
    wazeUrl,
    customer: params.customer,
    payoutAmountUSD,
    payoutAmountCRC,
    platformFeeUSD,
    status: 'dispatched',
    dispatchedAt: now.toISOString(),
    slaDeadline,
    failoverAttempts: 0
  };

  serviceOrdersStore.set(orderId, order);
  await persistServiceOrder(order).catch(err => console.warn('⚠️ No se pudo persistir la orden de servicio:', err));

  const providerEmail = resolveConfiguredProviderEmail(provider);
  console.log(`📡 [PROVEEDORES] Orden de servicio ${orderId} despachada a ${provider.name} (Email: ${providerEmail || 'no configurado'} | WhatsApp: ${provider.whatsapp}). SLA: ${provider.slaTargetMinutes}m.`);

  // Enviar correo únicamente a la dirección oficial/configurada del proveedor.
  if (providerEmail) {
    sendEmail({
      to: providerEmail,
      subject: `📋 [ORDEN DE SERVICIO] ${orderId} - ${params.tourName} (${params.date})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1c1917; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: #041711; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">Orden de Servicio Oficial • Costa Rica Tours</h2>
            <p style="margin: 4px 0 0; font-size: 13px; color: #a7f3d0;">Operador: ${provider.name}</p>
          </div>
          <div style="background: #fef3c7; padding: 8px 16px; font-size: 12px; color: #92400e; border-bottom: 1px solid #fde68a;">
            📡 <strong>SOLICITUD AUTOMÁTICA:</strong> Esta orden fue generada por el motor de reservas de Costa Rica Tours.
          </div>
          <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
            <p><strong>ID Orden:</strong> <code>${orderId}</code> (Reserva: #${params.bookingId})</p>
            <p><strong>Tour:</strong> ${params.tourName}</p>
            <p><strong>Fecha & Hora:</strong> ${params.date} a las ${params.time}</p>
            <p><strong>Pasajeros:</strong> ${params.adults} adultos, ${params.children} niños</p>
            <p><strong>Punto Pick-up:</strong> ${params.pickupLocation}</p>
            <p><strong>Waze / Navegación:</strong> <a href="${wazeUrl}" style="color: #059669; font-weight: bold;">Abrir en Waze</a></p>
            <p><strong>Cliente:</strong> ${params.customer.name} (${params.customer.phone})</p>
            <p><strong>Liquidación Operador:</strong> $${payoutAmountUSD} USD (₡${payoutAmountCRC.toLocaleString('es-CR')} CRC)</p>
            <p><strong>SLA de Aceptación:</strong> ${provider.slaTargetMinutes} minutos</p>
          </div>
        </div>
      `
    }).catch(err => console.warn(`⚠️ Error enviando correo de orden de servicio a ${provider.email}:`, err));
  }

  if (!providerEmail) {
    await createAlert({
      source: 'Comunicación con Proveedores',
      severity: 'warning',
      title: 'Proveedor sin email configurado',
      message: 'La orden ' + orderId + ' fue creada pero no se envió correo porque el proveedor no tiene un email operativo configurado en PROVIDER_EMAILS_JSON/PROVIDER_DEV_EMAIL.',
      bookingId: params.bookingId,
      providerId: provider.id
    }).catch(() => {});
  }

  // Actualizar estado en reserva
  await updateBookingStatus(params.bookingId, {
    serviceOrderId: orderId,
    providerId: provider.id,
    providerName: provider.name,
    serviceOrderStatus: 'dispatched'
  }).catch(() => {});

  return order;
}

/**
 * Procesa la respuesta de un proveedor (Confirmar, Reasignar, Demora, No-show)
 */
export async function handleProviderAction(params: {
  orderId: string;
  action: 'confirm' | 'reject' | 'delay' | 'no_show' | 'complete';
  notes?: string;
  operatorContact?: string;
  estimatedDelayMinutes?: number;
}): Promise<{ success: boolean; order: ServiceOrder; message: string }> {
  let order = await loadServiceOrder(params.orderId);

  // Si no existe ni en memoria ni en Firestore, devolver NOT_FOUND real.
  if (!order) {
    return {
      success: false,
      order: null as any,
      message: `Orden de servicio #${params.orderId} no encontrada (NOT_FOUND).`
    };
  }

  const now = new Date().toISOString();

  if (params.action === 'confirm') {
    order.status = 'confirmed';
    order.confirmedAt = now;
    order.notes = params.notes || 'Confirmado por operador local con cupo garantizado';
    
    await updateBookingStatus(order.bookingId, {
      serviceOrderStatus: 'confirmed',
      providerConfirmedAt: now
    }).catch(() => {});
    await persistServiceOrder(order).catch(() => {});

    return {
      success: true,
      order,
      message: `Orden ${order.id} confirmada exitosamente por ${order.providerName}.`
    };
  }

  if (params.action === 'reject') {
    order.status = 'rejected';
    order.notes = params.notes || 'Operador sin disponibilidad o fuera de horario.';
    
    // Auto-remediación: Reasignar automáticamente al siguiente proveedor certificado
    const failoverResult = await triggerAutoFailoverReassignment(order);
    return {
      success: true,
      order: failoverResult.reassignedOrder,
      message: `Rechazo procesado. Sistema auto-reasignó la reserva a ${failoverResult.newProvider.name}.`
    };
  }

  if (params.action === 'delay') {
    order.notes = `Demora reportada de ${params.estimatedDelayMinutes || 15} minutos por tráfico/clima.`;
    
    // Crear alerta operativa preventiva
    await createAlert({
      source: 'Gestión de Flota & Proveedores',
      severity: 'warning',
      title: `Demora en recogida - Reserva #${order.bookingId}`,
      message: `El operador ${order.providerName} reportó una demora estimada de ${params.estimatedDelayMinutes || 15} min para la recogida en ${order.pickupLocation}.`,
      bookingId: order.bookingId,
      providerId: order.providerId
    }).catch(() => {});

    return {
      success: true,
      order,
      message: `Demora registrada y notificada al Centro de Alertas y viajero.`
    };
  }

  if (params.action === 'no_show') {
    order.status = 'no_show';
    order.notes = params.notes || 'Pasajero no se presentó en lobby tras 15 min de cortesía.';
    
    await createAlert({
      source: 'Operaciones en Ruta (Guías & Choferes)',
      severity: 'warning',
      title: `No-Show reportado en Reserva #${order.bookingId}`,
      message: `Guía en sitio reporta que los pasajeros no se presentaron en ${order.pickupLocation}.`,
      bookingId: order.bookingId,
      providerId: order.providerId
    }).catch(() => {});

    return {
      success: true,
      order,
      message: `Reporte de No-Show ingresado en sistema.`
    };
  }

  if (params.action === 'complete') {
    order.status = 'completed';
    return {
      success: true,
      order,
      message: `Servicio completado exitosamente. Liquidación habilitada para pago.`
    };
  }

  return { success: false, order, message: 'Acción no reconocida.' };
}

/**
 * Reasignación autónoma a operador alternativo certificado (Failover)
 */
async function triggerAutoFailoverReassignment(rejectedOrder: ServiceOrder): Promise<{
  reassignedOrder: ServiceOrder;
  newProvider: TourProvider;
}> {
  const alternateProvider = REGISTERED_PROVIDERS.find(
    p => p.id !== rejectedOrder.providerId && p.status === 'active' && isOperationallyVerifiedProvider(p)
  );
  if (!alternateProvider) {
    await createAlert({
      source: 'Motor Autónomo de Reasignación de Operadores',
      severity: 'critical',
      title: `Reasignación requiere intervención humana #${rejectedOrder.bookingId}`,
      message: `No existe un proveedor alternativo verificado y activo para la orden ${rejectedOrder.id}. No se inventará ni asignará un operador sintético.`,
      bookingId: rejectedOrder.bookingId,
      providerId: rejectedOrder.providerId
    }).catch(() => {});
    throw new Error(`No hay proveedor alternativo verificado para la orden ${rejectedOrder.id}.`);
  }

  rejectedOrder.status = 'reassigned';
  rejectedOrder.providerId = alternateProvider.id;
  rejectedOrder.providerName = alternateProvider.name;
  rejectedOrder.failoverAttempts += 1;
  rejectedOrder.dispatchedAt = new Date().toISOString();
  rejectedOrder.slaDeadline = new Date(Date.now() + alternateProvider.slaTargetMinutes * 60000).toISOString();

  serviceOrdersStore.set(rejectedOrder.id, rejectedOrder);
  await persistServiceOrder(rejectedOrder).catch(() => {});
  await updateBookingStatus(rejectedOrder.bookingId, {
    serviceOrderStatus: 'reassigned',
    providerId: alternateProvider.id,
    providerName: alternateProvider.name,
    providerFailoverAt: new Date().toISOString()
  }).catch(() => {});

  const alternateEmail = alternateProvider.officialEmail || alternateProvider.email;
  if (alternateEmail) {
    await sendEmail({
      to: alternateEmail,
      subject: `📋 [REASIGNACIÓN DE SERVICIO] ${rejectedOrder.id} - ${rejectedOrder.tourName}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px"><h2>Solicitud de servicio reasignada</h2><p>Orden: <strong>${rejectedOrder.id}</strong></p><p>Tour: <strong>${rejectedOrder.tourName}</strong></p><p>Fecha: <strong>${rejectedOrder.date}</strong> ${rejectedOrder.time || ''}</p><p>Pasajeros: ${rejectedOrder.adults} adultos, ${rejectedOrder.children} niños</p><p>Punto de recogida: ${rejectedOrder.pickupLocation}</p><p>Por favor responda a este correo indicando si puede atender la solicitud.</p></div>`
    }).catch(() => {});
  }

  await createAlert({
    source: 'Motor Autónomo de Reasignación de Operadores',
    severity: 'info',
    title: `Reasignación Automática de Proveedor #${rejectedOrder.bookingId}`,
    message: `Reserva reasignada exitosamente a ${alternateProvider.name} tras rechazo o timeout del operador original.`,
    bookingId: rejectedOrder.bookingId,
    providerId: alternateProvider.id
  }).catch(() => {});

  return {
    reassignedOrder: rejectedOrder,
    newProvider: alternateProvider
  };
}

/**
 * Retorna la lista de proveedores con métricas de SLA y órdenes activas
 */
export async function observeProviderSla() {
  const now = Date.now();
  const orders = Array.from(serviceOrdersStore.values());
  const overdue = orders
    .filter(order => order.status === 'dispatched')
    .filter(order => new Date(order.slaDeadline).getTime() <= now)
    .map(order => ({
      orderId: order.id,
      bookingId: order.bookingId,
      providerId: order.providerId,
      providerName: order.providerName,
      tourId: order.tourId,
      date: order.date,
      time: order.time,
      slaDeadline: order.slaDeadline,
      status: order.status,
      severity: 'warning' as const
    }));

  for (const order of overdue) {
    await createAlert({
      source: 'Observador SLA de Proveedores',
      severity: 'warning',
      title: `SLA vencido - Orden ${order.orderId}`,
      message: `La orden ${order.orderId} sigue despachada después del SLA del proveedor ${order.providerName}. Requiere seguimiento antes de alterar el itinerario.`,
      bookingId: order.bookingId,
      providerId: order.providerId
    }).catch(() => {});
  }

  return {
    observedAt: new Date().toISOString(),
    overdue,
    affectedBookingIds: [...new Set(overdue.map(item => item.bookingId))],
    policy: {
      autoMutation: false,
      recommendation: overdue.length
        ? 'Escalar seguimiento al proveedor y evaluar adaptación únicamente si la confirmación no llega.'
        : 'No se detectaron órdenes despachadas fuera de SLA.'
    }
  };
}

export function getProvidersOverview() {
  const orders = Array.from(serviceOrdersStore.values());
  const activeOrders = orders.filter(o => o.status === 'dispatched' || o.status === 'confirmed');

  return {
    totalProviders: REGISTERED_PROVIDERS.length,
    activeProviders: REGISTERED_PROVIDERS.filter(p => p.status === 'active').length,
    providers: REGISTERED_PROVIDERS.map(p => {
      const providerOrders = orders.filter(o => o.providerId === p.id);
      return {
        ...p,
        totalOrdersAssigned: providerOrders.length,
        activeOrdersCount: providerOrders.filter(o => o.status === 'dispatched' || o.status === 'confirmed').length
      };
    }),
    recentServiceOrders: orders.slice(-25).reverse(),
    activeOrdersCount: activeOrders.length
  };
}
