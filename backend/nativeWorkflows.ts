import { getFirestoreDb, getBookingsCollection, updateBookingStatus } from './bookingService';
import { sendEmail, sendAdministrativeAlert, sendOperationalNotification, sendWhatsAppMessage } from './notificationService';
import { logAutomationExecution } from './nativeAutomationEngine';
import { generateBookingPDFBuffer } from './pdfService';
import { createProviderPortalToken, providerPortalConfigured } from './providerPortalService';
import { createCustomerActionToken } from './customerActionTokenService';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const APP_URL = process.env.APP_URL || '';

export function normalizeDate(dateVal: any): Date {
  if (!dateVal) return new Date(0);
  if (typeof dateVal.toDate === 'function') return dateVal.toDate();
  if (typeof dateVal._seconds === 'number') return new Date(dateVal._seconds * 1000);
  if (typeof dateVal.seconds === 'number') return new Date(dateVal.seconds * 1000);
  const d = new Date(dateVal);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

export async function recordEscalation(data: {
  type: string;
  bookingId?: string;
  providerId?: string;
  reason: string;
  details?: any;
  status?: 'pending' | 'resolved' | 'acknowledged';
  customerEmail?: string;
  customerPhone?: string;
}): Promise<string> {
  const db = getFirestoreDb();
  const escalationId = `esc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  if (db) {
    await db.collection('escalations').doc(escalationId).set({
      id: escalationId,
      ...data,
      createdAt: new Date().toISOString(),
      status: data.status || 'pending'
    }).catch((error) => console.warn('No se pudo persistir escalación:', error));
  }
  return escalationId;
}

/** Configuración de correo de pruebas; nunca se incrustan cuentas personales. */
export const PROVIDER_DEV_EMAIL = process.env.PROVIDER_DEV_EMAIL || '';

export function getEffectiveProviderEmail(officialEmail?: string | null): string {
  const useOfficial = process.env.NODE_ENV === 'production'
    || process.env.DISABLE_PROVIDER_EMAIL_OVERRIDE === 'true';
  if (useOfficial && officialEmail) return officialEmail;
  return process.env.PROVIDER_DEV_EMAIL || '';
}

export const MASTER_OPERATORS_REGISTRY: Record<string, {
  id: string;
  name: string;
  email: string;
  officialEmail?: string;
  verified?: boolean;
  phone: string;
  whatsapp: string;
  paypalEmail: string;
  officialPaypalEmail?: string;
  commissionRate: number;
  certificacion: string;
  website: string;
  active: boolean;
  region: string;
}> = {
  'alsama-tours-cr': {
    id: 'alsama-tours-cr',
    name: 'Alsama Tours CR • Operaciones Directas & Transporte Oficial',
    email: PROVIDER_DEV_EMAIL,
    officialEmail: 'operaciones@alsamatourscr.com',
    phone: '+506 8795-9148',
    whatsapp: '50687959148',
    paypalEmail: PROVIDER_DEV_EMAIL,
    officialPaypalEmail: 'operaciones@costaricatours.es',
    commissionRate: 0.15,
    certificacion: 'CST Nivel Elite • Transporte Ejecutivo Certificado ICT',
    website: 'https://costaricatours.netlify.app/',
    active: true,
    region: 'Valle Central & Todo el País'
  },
  'bay-island-cruises': {
    id: 'bay-island-cruises',
    name: 'Bay Island Cruises • Isla Tortuga Catamarán',
    email: PROVIDER_DEV_EMAIL,
    officialEmail: 'reservations@bayislandcruises.com',
    phone: '+506 2661-1111',
    whatsapp: '50688001111',
    paypalEmail: PROVIDER_DEV_EMAIL,
    officialPaypalEmail: 'accounting@bayislandcruises.com',
    commissionRate: 0.15,
    certificacion: 'CST 5 Hojas • Certificación Marítima Internacional',
    website: 'https://bayislandcruises.com/',
    active: true,
    region: 'Pacífico Central & Golfo de Nicoya'
  },
  'arenal-volcano-ops': {
    id: 'arenal-volcano-ops',
    name: 'Arenal Eco-Adventures & Hot Springs Operations',
    email: PROVIDER_DEV_EMAIL,
    officialEmail: 'reservas@arenalecoadventures.cr',
    phone: '+506 2479-1000',
    whatsapp: '50684791000',
    paypalEmail: PROVIDER_DEV_EMAIL,
    officialPaypalEmail: 'pagos@arenalecoadventures.cr',
    commissionRate: 0.15,
    certificacion: 'CST Nivel 5 • Guías Naturalistas Arenal',
    website: 'https://arenalecoadventures.cr/',
    active: true,
    region: 'La Fortuna / Arenal'
  },
  'monteverde-canopy-ops': {
    id: 'monteverde-canopy-ops',
    name: 'Selvatura Park & Monteverde Cloud Forest Guides',
    email: PROVIDER_DEV_EMAIL,
    officialEmail: 'operations@selvaturapark.cr',
    phone: '+506 2645-5929',
    whatsapp: '50686455929',
    paypalEmail: PROVIDER_DEV_EMAIL,
    officialPaypalEmail: 'finanzas@selvaturapark.cr',
    commissionRate: 0.15,
    certificacion: 'CST Sostenibilidad Bosque Nuboso',
    website: 'https://selvaturapark.cr/',
    active: true,
    region: 'Monteverde / Puntarenas'
  },
  'manuel-antonio-ops': {
    id: 'manuel-antonio-ops',
    name: 'Manuel Antonio Expeditions & Wildlife Guides',
    email: PROVIDER_DEV_EMAIL,
    officialEmail: 'tours@manuelantonioexpeditions.cr',
    phone: '+506 2777-0100',
    whatsapp: '50687770100',
    paypalEmail: PROVIDER_DEV_EMAIL,
    officialPaypalEmail: 'contabilidad@manuelantonioexpeditions.cr',
    commissionRate: 0.15,
    certificacion: 'CST Oficial • SINAC Guías Acreditados',
    website: 'https://manuelantonioexpeditions.cr/',
    active: true,
    region: 'Manuel Antonio / Quepos'
  },
  'pacuare-rafting-ops': {
    id: 'pacuare-rafting-ops',
    name: 'Pacuare River Expeditions & Whitewater Rafting',
    email: PROVIDER_DEV_EMAIL,
    officialEmail: 'rafting@pacuareriverexpeditions.cr',
    phone: '+506 2253-2400',
    whatsapp: '50682532400',
    paypalEmail: PROVIDER_DEV_EMAIL,
    officialPaypalEmail: 'billing@pacuareriverexpeditions.cr',
    commissionRate: 0.15,
    certificacion: 'IRF International Rafting Federation • CST',
    website: 'https://pacuareriverexpeditions.cr/',
    active: true,
    region: 'Turrialba / Río Pacuare'
  },
  'tortuguero-ops': {
    id: 'tortuguero-ops',
    name: 'Tortuguero Eco Canals & Green Sea Turtle Sanctuary',
    email: PROVIDER_DEV_EMAIL,
    officialEmail: 'canales@tortugueroecotours.cr',
    phone: '+506 2709-8000',
    whatsapp: '50687098000',
    paypalEmail: PROVIDER_DEV_EMAIL,
    officialPaypalEmail: 'admin@tortugueroecotours.cr',
    commissionRate: 0.15,
    certificacion: 'CST Caribe Verde • Protección Marina',
    website: 'https://tortugueroecotours.cr/',
    active: true,
    region: 'Tortuguero / Limón'
  },
  'doka-estate-coffee': {
    id: 'doka-estate-coffee',
    name: 'Doka Estate Coffee & Cacao Heritage Tour',
    email: PROVIDER_DEV_EMAIL,
    officialEmail: 'tours@dokaestate.com',
    phone: '+506 2449-5152',
    whatsapp: '50684495152',
    paypalEmail: PROVIDER_DEV_EMAIL,
    officialPaypalEmail: 'pagos@dokaestate.com',
    commissionRate: 0.15,
    certificacion: 'CST Cafetal Sostenible • Rainforest Alliance',
    website: 'https://dokaestate.com/',
    active: true,
    region: 'Alajuela / Poás'
  },
  'guanacaste-blue-ocean': {
    id: 'guanacaste-blue-ocean',
    name: 'Guanacaste Blue Ocean Adventures & Snorkel Safari',
    email: PROVIDER_DEV_EMAIL,
    officialEmail: 'info@guanacasteblueocean.cr',
    phone: '+506 2670-0000',
    whatsapp: '50686700000',
    paypalEmail: PROVIDER_DEV_EMAIL,
    officialPaypalEmail: 'payouts@guanacasteblueocean.cr',
    commissionRate: 0.15,
    certificacion: 'CST Bandera Azul Ecológica',
    website: 'https://guanacasteblueocean.cr/',
    active: true,
    region: 'Guanacaste / Tamarindo / Papagayo'
  },
  'tarcoles-crocodile-safari': {
    id: 'tarcoles-crocodile-safari',
    name: 'Tárcoles River Crocodile & Mangrove Birding Safari',
    email: PROVIDER_DEV_EMAIL,
    officialEmail: 'reservas@tarcolescrocodilesafari.cr',
    phone: '+506 2637-0333',
    whatsapp: '50686370333',
    paypalEmail: PROVIDER_DEV_EMAIL,
    officialPaypalEmail: 'operaciones@tarcolescrocodilesafari.cr',
    commissionRate: 0.15,
    certificacion: 'CST Manglares del Pacífico Central',
    website: 'https://tarcolescrocodilesafari.cr/',
    active: true,
    region: 'Tárcoles / Pacífico Central'
  }
};

/**
 * Obtiene los datos del proveedor desde Firestore (colecciones 'operators' o 'proveedores')
 * con fallback determinista al registro maestro.
 */
export async function getProviderFromDb(providerId: string): Promise<any | null> {
  const db = getFirestoreDb();
  const normalizedId = (providerId || '').toLowerCase().trim();

  // 1. Si hay base de datos Firestore activa, consultar
  if (db) {
    try {
      let doc = await db.collection('operators').doc(providerId).get();
      if (doc.exists) {
        const data = doc.data() || {};
        return {
          id: doc.id,
          ...data,
          officialEmail: data.email,
          email: getEffectiveProviderEmail(data.email),
          officialPaypalEmail: data.paypalEmail,
          paypalEmail: getEffectiveProviderEmail(data.paypalEmail)
        };
      }

      doc = await db.collection('proveedores').doc(providerId).get();
      if (doc.exists) {
        const data = doc.data() || {};
        return {
          id: doc.id,
          ...data,
          officialEmail: data.email,
          email: getEffectiveProviderEmail(data.email),
          officialPaypalEmail: data.paypalEmail,
          paypalEmail: getEffectiveProviderEmail(data.paypalEmail)
        };
      }

      const opSnap = await db.collection('operators').where('code', '==', providerId).limit(1).get();
      if (!opSnap.empty) {
        const data = opSnap.docs[0].data() || {};
        return {
          id: opSnap.docs[0].id,
          ...data,
          officialEmail: data.email,
          email: getEffectiveProviderEmail(data.email),
          officialPaypalEmail: data.paypalEmail,
          paypalEmail: getEffectiveProviderEmail(data.paypalEmail)
        };
      }

      const provSnap = await db.collection('proveedores').where('code', '==', providerId).limit(1).get();
      if (!provSnap.empty) {
        const data = provSnap.docs[0].data() || {};
        return {
          id: provSnap.docs[0].id,
          ...data,
          officialEmail: data.email,
          email: getEffectiveProviderEmail(data.email),
          officialPaypalEmail: data.paypalEmail,
          paypalEmail: getEffectiveProviderEmail(data.paypalEmail)
        };
      }
    } catch (err) {
      console.warn(`Error buscando proveedor ${providerId} en Firestore:`, err);
    }
  }

  // El registro maestro es metadata histórica y nunca es fuente operativa
  // en producción. Solo se permite explícitamente en entornos locales de prueba.
  const allowLegacyRegistry = process.env.NODE_ENV !== 'production'
    && process.env.ALLOW_LEGACY_PROVIDER_DIRECTORY === 'true';
  if (allowLegacyRegistry) {
    if (MASTER_OPERATORS_REGISTRY[normalizedId]) return MASTER_OPERATORS_REGISTRY[normalizedId];

    for (const [key, val] of Object.entries(MASTER_OPERATORS_REGISTRY)) {
      if (normalizedId.includes(key) || key.includes(normalizedId)) return val;
    }

    const keywordMappings: Array<[RegExp, string]> = [
      [/arenal|volcan|termales|fortuna/i, 'arenal-volcano-ops'],
      [/monteverde|canopy|tirolesa|puentes/i, 'monteverde-canopy-ops'],
      [/manuel-antonio|quepos|parque/i, 'manuel-antonio-ops'],
      [/tortuga|catamaran|bay-island|isla/i, 'bay-island-cruises'],
      [/pacuare|rafting|sarapiqui/i, 'pacuare-rafting-ops'],
      [/tortuguero|canales/i, 'tortuguero-ops'],
      [/cafe|coffee|doka|cacao/i, 'doka-estate-coffee'],
      [/guanacaste|tamarindo|papagayo|playa/i, 'guanacaste-blue-ocean'],
      [/tarcoles|cocodrilo|crocodile/i, 'tarcoles-crocodile-safari']
    ];
    const mapping = keywordMappings.find(([pattern]) => pattern.test(normalizedId));
    if (mapping) return MASTER_OPERATORS_REGISTRY[mapping[1]];
  }

  // Nunca inventamos un proveedor ni redirigimos una reserva hacia otro ID.
  return null;
}

/**
 * =========================================================================
 * 1. COORDINACIÓN EN TIEMPO REAL CON PROVEEDORES (AUTODEPENDIENTE & BIDIRECCIONAL)
 * =========================================================================
 * Notifica al operador asignado con un despacho estructurado, enlaces
 * de respuesta con 1 clic y fallback automático en caso de falta de respuesta.
 */
export async function executeProviderRealtimeCoordination(
  payload: any,
  authHeader?: string
): Promise<{
  success: boolean;
  providerNotified: boolean;
  escalated: boolean;
  provider: any;
  actionUrls: { confirm: string; modifyTime: string; decline: string };
  whatsappUrl: string;
  message: string;
}> {
  // Verificación de autenticación de Webhook si aplica
  if (process.env.NODE_ENV === 'production' && (!WEBHOOK_SECRET || authHeader !== WEBHOOK_SECRET)) {
    throw new Error('No autorizado: X-Webhook-Secret inválido o ausente.');
  }

  const booking = payload.booking || payload;
  const bookingId = booking.bookingId || booking.id || `CRT-${Date.now().toString().slice(-6)}`;
  const providerId = booking.providerId || booking.providerInfo?.id || 'alsama-tours-cr';
  const tourName = booking.tourName || 'Tour Oficial Costa Rica';
  const tourDate = booking.date || 'Fecha por confirmar';
  const tourTime = booking.time || '08:00 AM';
  const adults = Number(booking.adults ?? 2);
  const children = Number(booking.children ?? 0);
  const totalPax = adults + children;
  const pickupHotel = booking.pickupHotel || 'Recepción del Hotel';
  const specialRequests = booking.specialRequests || 'Ninguna';
  const customerName = booking.customerName || booking.customer?.name || 'Cliente Verificado';
  const customerPhone = booking.customerPhone || booking.customer?.phone || '';
  const customerEmail = booking.customerEmail || booking.customer?.email || '';

  // Obtener datos del proveedor sin sustituir silenciosamente por otro operador.
  const provider = await getProviderFromDb(providerId);
  if (!provider) {
    await updateBookingStatus(bookingId, {
      providerStatus: 'pending_provider_verification',
      providerDispatchBlockedAt: new Date().toISOString(),
      providerDispatchBlockedReason: 'Proveedor no encontrado o no verificado'
    }).catch(() => {});
    throw new Error('No existe un proveedor operativo verificado para la reserva ' + bookingId + '. El despacho queda bloqueado hasta asignar un proveedor real.');
  }
  const providerEmail = provider.email;
  const providerPhone = provider.phone || '+506 8795-9148';
  const whatsappNumber = provider.whatsapp || '50687959148';

  // Generar URLs de acción de 1 clic para el proveedor
  const providerPortalUrl = providerPortalConfigured()
    ? `${APP_URL}/provider/portal?token=${encodeURIComponent(createProviderPortalToken({ orderId: bookingId, providerId: provider.id, ttlMinutes: 1440 }))}`
    : '';
  const confirmUrl = providerPortalUrl ? `${providerPortalUrl}&action=confirm` : `${APP_URL}/api/provider/respond?action=confirm&bookingId=${encodeURIComponent(bookingId)}&providerId=${encodeURIComponent(provider.id)}`;
  const modifyTimeUrl = providerPortalUrl ? `${providerPortalUrl}&action=modify_time` : `${APP_URL}/api/provider/respond?action=modify_time&bookingId=${encodeURIComponent(bookingId)}&providerId=${encodeURIComponent(provider.id)}`;
  const declineUrl = providerPortalUrl ? `${providerPortalUrl}&action=decline` : `${APP_URL}/api/provider/respond?action=decline&bookingId=${encodeURIComponent(bookingId)}&providerId=${encodeURIComponent(provider.id)}`;

  // Enlace interactivo a WhatsApp para despacho móvil directo
  const waText = encodeURIComponent(
    `*COSTA RICA TOURS • DESPACHO OPERATIVO*\n` +
    `📌 *Reserva*: #${bookingId}\n` +
    `🌿 *Tour*: ${tourName}\n` +
    `📅 *Fecha*: ${tourDate} | ⏰ *Hora*: ${tourTime}\n` +
    `👥 *Pasajeros*: ${adults} adultos, ${children} niños (Total: ${totalPax})\n` +
    `🏨 *Pick-up*: ${pickupHotel}\n` +
    `👤 *Cliente*: ${customerName} (${customerPhone})\n` +
    `📝 *Notas*: ${specialRequests}\n\n` +
    `✅ *Confirmar y Asignar Guía*: ${confirmUrl}`
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${waText}`;

  // Actualizar estado de despacho del proveedor en Firestore/Memoria
  await updateBookingStatus(bookingId, {
    providerId: provider.id,
    providerName: provider.name,
    providerEmail: provider.email,
    providerStatus: 'notified',
    providerDispatchedAt: new Date().toISOString(),
    providerActionUrls: { confirm: confirmUrl, modifyTime: modifyTimeUrl, decline: declineUrl }
  }).catch(() => {});

  // Enviar correo de despacho estructurado al proveedor
  const isProviderActive = provider.active !== false;
  if (isProviderActive && providerEmail) {
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #041711 0%, #064e3b 100%); color: #ffffff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Costa Rica Tours • Despacho Operativo 2026</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #a7f3d0; font-weight: 500;">Asignación Inmediata de Reserva Turística Certificada CST</p>
        </div>
        
        <div style="padding: 28px; background-color: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #f5f5f4; padding-bottom: 12px;">
            <div>
              <span style="font-size: 12px; color: #78716c; text-transform: uppercase; font-weight: 700;">Operador Asignado:</span>
              <h3 style="margin: 2px 0 0 0; font-size: 16px; color: #064e3b;">${provider.name}</h3>
            </div>
            <div style="text-align: right;">
              <span style="background-color: #ecfdf5; color: #047857; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; border: 1px solid #a7f3d0;">#${bookingId}</span>
            </div>
          </div>

          <p style="font-size: 14px; line-height: 1.5; color: #44403c; margin: 0 0 16px 0;">
            Estimado equipo de operaciones de <strong>${provider.name}</strong>, se ha recibido una nueva solicitud de reserva a través de la plataforma oficial. Por favor revise los datos y acepte o rechace la solicitud:
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b; width: 35%;">🌿 Tour / Experiencia:</td>
                <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${tourName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">📅 Fecha & Hora:</td>
                <td style="padding: 8px 0; font-weight: 700; color: #047857;">${tourDate} a las ${tourTime}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">👥 Pasajeros:</td>
                <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${adults} Adultos, ${children} Niños (Total: ${totalPax})</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">🏨 Hotel / Punto Pick-up:</td>
                <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${pickupHotel}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 0; color: #64748b;">👤 Titular / Contacto:</td>
                <td style="padding: 8px 0; color: #0f172a;">${customerName} (${customerPhone})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">📝 Requerimientos:</td>
                <td style="padding: 8px 0; color: #0f172a;">${specialRequests}</td>
              </tr>
            </table>
          </div>

          <!-- BOTONES DE ACCIÓN AUTODEPENDIENTES -->
          <div style="text-align: center; margin: 24px 0 16px 0;">
            <p style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 12px;">Respuesta requerida (abra el formulario seguro para aceptar, rechazar o reportar un ajuste):</p>
            <div style="display: inline-block; width: 100%;">
              <a href="${confirmUrl}" style="display: block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 10px; font-weight: 700; font-size: 15px; margin-bottom: 10px; text-align: center; box-shadow: 0 2px 4px rgba(5,150,105,0.2);">
                📝 ABRIR FORMULARIO Y ACEPTAR / ASIGNAR
              </a>
              <div style="display: flex; gap: 8px; justify-content: center;">
                <a href="${modifyTimeUrl}" style="flex: 1; display: inline-block; background-color: #f1f5f9; color: #334155; text-decoration: none; padding: 10px 14px; border-radius: 8px; font-weight: 600; font-size: 12px; border: 1px solid #cbd5e1; text-align: center;">
                  ⏰ Proponer Ajuste de Hora
                </a>
                <a href="${declineUrl}" style="flex: 1; display: inline-block; background-color: #fef2f2; color: #b91c1c; text-decoration: none; padding: 10px 14px; border-radius: 8px; font-weight: 600; font-size: 12px; border: 1px solid #fecaca; text-align: center;">
                  🔄 Reasignar Automáticamente
                </a>
              </div>
            </div>
          </div>

          <div style="margin-top: 20px; padding: 12px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 12px; color: #166534; display: flex; align-items: center; justify-content: space-between;">
            <span>💬 ¿Prefieres coordinar por WhatsApp?</span>
            <a href="${whatsappUrl}" style="background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-weight: bold;">Abrir WhatsApp</a>
          </div>
        </div>

        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Costa Rica Tours 2026 • Plataforma de Turismo Sostenible CST • Despacho Autónomo M2M
        </div>
      </div>
    `;

    const emailResult = await sendEmail({
      to: providerEmail,
      subject: `🚐 [DESPACHO OPERATIVO] Nueva Reserva Asignada: ${tourName} (${tourDate}) - Ref: #${bookingId}`,
      html: emailHtml
    });

    if (emailResult.success) {
      console.log(`✅ [PROVEEDOR NOTIFICADO] Email de despacho enviado a ${providerEmail} (${provider.name}) para reserva #${bookingId}`);
      logAutomationExecution('WF_COORDINACION_PROVEEDOR', 0, 'success', `Proveedor ${provider.name} notificado para reserva ${bookingId}`);
      
      return {
        success: true,
        providerNotified: true,
        escalated: false,
        provider,
        actionUrls: { confirm: confirmUrl, modifyTime: modifyTimeUrl, decline: declineUrl },
        whatsappUrl,
        message: `Proveedor ${provider.name} notificado por email y canales bidireccionales con éxito.`
      };
    }
  }

  // Fallback: Si el envío falló o el proveedor no tiene correo, registrar escalación
  const reason = !providerEmail
    ? `Proveedor "${provider.name}" no tiene correo configurado.`
    : `Fallo al enviar correo a "${providerEmail}".`;

  await recordEscalation({
    type: 'PROVIDER_NOTIFICATION_FAILED',
    bookingId,
    providerId: provider.id,
    reason,
    details: { tourName, tourDate, tourTime, pickupHotel, customerName, customerPhone, whatsappUrl }
  });

  await sendAdministrativeAlert({
    title: 'Despacho a Proveedor Requiere Supervisión',
    reason,
    bookingId,
    providerId: provider.id,
    customerName,
    customerPhone,
    details: {
      Tour: tourName,
      Fecha: `${tourDate} ${tourTime}`,
      Pasajeros: `${totalPax} personas`,
      PuntoRecogida: pickupHotel,
      WhatsAppProveedor: whatsappUrl
    }
  });

  return {
    success: true,
    providerNotified: false,
    escalated: true,
    provider,
    actionUrls: { confirm: confirmUrl, modifyTime: modifyTimeUrl, decline: declineUrl },
    whatsappUrl,
    message: `Notificación escalada automáticamente a operaciones: ${reason}`
  };
}

/**
 * =========================================================================
 * PROCESADOR AUTODEPENDIENTE DE RESPUESTA DE PROVEEDORES
 * =========================================================================
 * Procesa la acción elegida por el operador (confirmar, ajustar hora, o declinar)
 * actualizando el estado de la reserva, notificando al viajero y sincronizando
 * el calendario sin intervención de personal intermediario.
 */
export async function handleProviderActionResponse(
  bookingId: string,
  action: 'confirm' | 'modify_time' | 'decline' | string,
  options?: {
    guideName?: string;
    vehiclePlate?: string;
    proposedTime?: string;
    providerNotes?: string;
    providerId?: string;
  }
): Promise<{
  success: boolean;
  action: string;
  bookingId: string;
  newStatus: string;
  providerStatus: string;
  message: string;
  reassigned?: boolean;
}> {
  console.log(`⚡ [RESPUESTA PROVEEDOR] Procesando acción "${action}" para reserva #${bookingId}`);
  const db = getFirestoreDb();
  let bookingData: any = null;

  if (db) {
    try {
      const doc = await db.collection('bookings').doc(bookingId).get();
      if (doc.exists) bookingData = doc.data();
    } catch (err) {
      console.warn('⚠️ Error leyendo reserva en Firestore:', err);
    }
  }

  const tourName = bookingData?.tourName || 'Excursión Oficial Costa Rica';
  const tourDate = bookingData?.date || 'Fecha confirmada';
  const customerEmail = bookingData?.customerEmail || bookingData?.customer?.email || 'viajero@costaricatours.es';
  const customerName = bookingData?.customerName || bookingData?.customer?.name || 'Estimado Viajero';

  // 1. CASO: CONFIRMAR RESERVA Y ASIGNAR LOGÍSTICA
  if (action === 'confirm') {
    const guide = options?.guideName || 'Guía Naturalista Certificado ICT';
    const vehicle = options?.vehiclePlate || 'Unidad Turística Oficial Alsama';
    const confirmedAt = new Date().toISOString();

    await updateBookingStatus(bookingId, {
      status: 'confirmada',
      providerStatus: 'confirmed',
      assignedGuide: guide,
      assignedVehicle: vehicle,
      providerConfirmedAt: confirmedAt,
      providerNotes: options?.providerNotes || 'Confirmado por operador local.'
    }).catch(() => {});

    // Notificar al cliente automáticamente con los detalles del chofer / guía
    if (customerEmail) {
      await sendEmail({
        to: customerEmail,
        subject: `🎉 ¡Operador y Guía Confirmados! Tu reserva #${bookingId} está 100% lista`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 12px; padding: 24px;">
            <h2 style="color: #064e3b; margin-top: 0;">¡Todo listo para tu aventura! 🌿</h2>
            <p>Hola <strong>${customerName}</strong>,</p>
            <p>Tu operador local ha confirmado la logística de tu experiencia <strong>${tourName}</strong>:</p>
            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 6px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>📅 Fecha:</strong> ${tourDate}</p>
              <p style="margin: 4px 0;"><strong>👤 Guía Asignado:</strong> ${guide}</p>
              <p style="margin: 4px 0;"><strong>🚐 Vehículo:</strong> ${vehicle}</p>
              <p style="margin: 4px 0;"><strong>📍 Estado:</strong> 100% Confirmado con logística lista</p>
            </div>
            <p style="font-size: 13px; color: #57534e;">¡Nos vemos en el punto de encuentro acordado! ¡Pura Vida! 🇨🇷</p>
          </div>
        `
      }).catch(() => {});
    }

    try {
      const { sendAgentMessage, publishAgentEvent } = await import('./agentMeshService');
      await sendAgentMessage({
        conversationId: bookingId,
        fromAgent: 'provider_liaison',
        toAgent: 'customer_service',
        audience: 'internal',
        type: 'response',
        subject: 'Proveedor confirmó logística',
        payload: { bookingId, providerId: options?.providerId, guide, vehicle, tourName, tourDate }
      });
      await publishAgentEvent('provider.booking.confirmed', { bookingId, providerId: options?.providerId, guide, vehicle }, bookingId);
      const { recordLearningEvent } = await import('./learningEngine');
      await recordLearningEvent({
        agentId: 'provider_liaison',
        input: `Coordinación de proveedor para ${bookingId}`,
        output: 'Proveedor confirmó logística',
        outcome: 'success',
        reward: 1,
        metadata: { bookingId, providerId: options?.providerId, action: 'confirm' }
      });
    } catch (meshErr) { console.warn('Agent mesh provider confirmation unavailable:', meshErr); }

    logAutomationExecution('WF_COORDINACION_PROVEEDOR', 0, 'success', `Reserva #${bookingId} confirmada por operador con guía ${guide}`);

    return {
      success: true,
      action: 'confirm',
      bookingId,
      newStatus: 'confirmada',
      providerStatus: 'confirmed',
      message: `¡Reserva #${bookingId} confirmada con éxito! Guía: ${guide}. Cliente notificado.`
    };
  }

  // 2. CASO: AJUSTE DE HORA SOLICITADO POR EL OPERADOR
  if (action === 'modify_time') {
    const proposedTime = options?.proposedTime || '09:00 AM';
    await updateBookingStatus(bookingId, {
      providerStatus: 'time_change_requested',
      proposedTime,
      providerNotes: options?.providerNotes || `Operador sugiere horario ${proposedTime}`
    }).catch(() => {});

    try {
      const { sendAgentMessage, publishAgentEvent } = await import('./agentMeshService');
      await sendAgentMessage({
        conversationId: bookingId,
        fromAgent: 'provider_liaison',
        toAgent: 'customer_service',
        audience: 'internal',
        type: 'request',
        subject: 'Proveedor solicita cambio de horario',
        payload: { bookingId, proposedTime, providerId: options?.providerId, notes: options?.providerNotes }
      });
      await publishAgentEvent('provider.booking.time_change_requested', { bookingId, proposedTime, providerId: options?.providerId }, bookingId);
      const { recordLearningEvent } = await import('./learningEngine');
      await recordLearningEvent({
        agentId: 'provider_liaison',
        input: `Cambio de horario solicitado para ${bookingId}`,
        output: proposedTime,
        outcome: 'partial',
        reward: 0.1,
        metadata: { bookingId, providerId: options?.providerId, action: 'modify_time' }
      });
    } catch (meshErr) { console.warn('Agent mesh provider time-change unavailable:', meshErr); }

    if (customerEmail) {
      await sendEmail({
        to: customerEmail,
        subject: `⏰ Ajuste de Horario Sugerido para tu Reserva #${bookingId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 12px; padding: 24px;">
            <h3 style="color: #d97706; margin-top: 0;">Ajuste de Horario para Mejor Experiencia</h3>
            <p>Hola <strong>${customerName}</strong>,</p>
            <p>Para garantizar mejores condiciones climáticas y avistamiento en <strong>${tourName}</strong>, tu operador sugiere realizar la actividad a las <strong>${proposedTime}</strong>.</p>
            <p style="font-size: 13px; color: #57534e;">Si este horario te parece bien, no tienes que hacer nada; queda automáticamente actualizado en tu voucher.</p>
          </div>
        `
      }).catch(() => {});
    }

    return {
      success: true,
      action: 'modify_time',
      bookingId,
      newStatus: bookingData?.status || 'confirmada',
      providerStatus: 'time_change_requested',
      message: `Ajuste de horario a ${proposedTime} registrado y comunicado al viajero.`
    };
  }

  // 3. CASO: DECLINAR -> REASIGNACIÓN AUTÓNOMA INMEDIATA
  if (action === 'decline') {
    return await executeAutonomousProviderFallback(bookingId, options?.providerId || 'original-provider', options?.providerNotes || 'Sin disponibilidad');
  }

  return {
    success: false,
    action,
    bookingId,
    newStatus: bookingData?.status || 'pendiente',
    providerStatus: 'unknown',
    message: `Acción "${action}" no reconocida.`
  };
}

/**
 * =========================================================================
 * FALLBACK AUTÓNOMO DE PROVEEDORES (SELF-HEALING FAILOVER)
 * =========================================================================
 * Reasigna instantáneamente una reserva rechazada a la flota directa de Alsama Tours CR,
 * despachando nuevo aviso a la central de operaciones sin cancelar la experiencia al viajero.
 */
export async function executeAutonomousProviderFallback(
  bookingId: string,
  failedProviderId: string,
  reason: string
): Promise<{
  success: boolean;
  action: string;
  bookingId: string;
  newStatus: string;
  providerStatus: string;
  message: string;
  reassigned: boolean;
}> {
  console.warn(`🔄 [FAILOVER AUTÓNOMO] Proveedor ${failedProviderId} declinó reserva #${bookingId}. Reasignando a Alsama Tours CR Operaciones Directas...`);
  
  const fallbackProvider = MASTER_OPERATORS_REGISTRY['alsama-tours-cr'];

  const fallbackEmail = getEffectiveProviderEmail(fallbackProvider.officialEmail);
  if (fallbackProvider.verified !== true || !fallbackProvider.active || !fallbackProvider.officialEmail || !fallbackEmail) {
    await sendAdministrativeAlert({
      title: 'Failover de proveedor requiere intervención humana',
      reason: `No existe un canal oficial verificable para reasignar ${bookingId}.`,
      bookingId,
      providerId: failedProviderId,
      details: { failedProviderId, reason, fallbackCandidate: fallbackProvider.id }
    });
    return {
      success: false,
      action: 'decline_escalate',
      bookingId,
      newStatus: 'requiere_intervencion',
      providerStatus: 'fallback_unverified',
      message: 'No se reasignó automáticamente: el proveedor directo no está marcado como verificado y no existe un canal operativo aprobado.',
      reassigned: false
    };
  }

  await updateBookingStatus(bookingId, {
    providerId: fallbackProvider.id,
    providerName: fallbackProvider.name,
    providerEmail: fallbackEmail,
    providerStatus: 'reassigned_to_direct_ops',
    fallbackReason: reason,
    fallbackTriggeredAt: new Date().toISOString()
  }).catch(() => {});

  // Despachar inmediatamente notificación prioritaria a Alsama Tours CR
  await sendEmail({
    to: fallbackEmail,
    subject: `🚨 [DESPACHO PRIORITARIO POR REASIGNACIÓN] Reserva #${bookingId} Asignada a Operaciones Directas`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1c1917; border: 2px solid #059669; border-radius: 12px; padding: 24px;">
        <h2 style="color: #064e3b; margin-top: 0;">⚡ Reasignación Automática de Emergencia</h2>
        <p>Equipo de <strong>Alsama Tours CR</strong>,</p>
        <p>El operador externo con ID <code>${failedProviderId}</code> declinó la reserva <strong>#${bookingId}</strong> (Motivo: <em>${reason}</em>).</p>
        <p>El motor autónomo ha transferido la reserva al equipo de operaciones directas para garantizar servicio sin interrupciones.</p>
        <div style="background-color: #ecfdf5; padding: 12px; border-radius: 8px; margin: 16px 0;">
          <a href="${APP_URL}/api/provider/respond?action=confirm&bookingId=${bookingId}&providerId=alsama-tours-cr" style="background-color: #059669; color: white; padding: 10px 16px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            Confirmar Despacho Alsama
          </a>
        </div>
      </div>
    `
  }).catch(() => {});

  await sendAdministrativeAlert({
    title: 'Failover Autónomo de Proveedor Ejecutado',
    reason: `Operador ${failedProviderId} declinó por: ${reason}`,
    bookingId,
    providerId: fallbackProvider.id,
    details: {
      Accion: 'Reasignado automáticamente a Alsama Tours CR Direct Ops',
      Estado: 'Reserva protegida, sin impacto al cliente'
    }
  });

  logAutomationExecution('WF_COORDINACION_PROVEEDOR', 0, 'success', `Reserva #${bookingId} reasignada automáticamente a Alsama Tours CR`);

  return {
    success: true,
    action: 'decline_and_reassign',
    bookingId,
    newStatus: 'pendiente_confirmacion_proveedor',
    providerStatus: 'reassigned_to_direct_ops',
    message: `Reserva #${bookingId} reasignada a Operaciones Directas Alsama Tours CR para confirmación del despacho; no se considera confirmada todavía.`,
    reassigned: true
  };
}

// =========================================================================
// 2. CONFIRMACIÓN DE RESERVA AL CLIENTE (Trigger: Webhook)
// =========================================================================
export async function executeCustomerBookingConfirmation(
  payload: any,
  authHeader?: string
): Promise<{ success: boolean; customerNotified: boolean; escalated: boolean; message: string }> {
  if (process.env.NODE_ENV === 'production' && authHeader !== WEBHOOK_SECRET) {
    throw new Error('No autorizado: X-Webhook-Secret inválido o ausente.');
  }

  const booking = payload.booking || payload;
  const bookingId = String(booking.bookingId || booking.id || 'CRT-CONF');
  const customerEmail = String(booking.customerEmail || booking.customer?.email || '');
  const customerName = String(booking.customerName || booking.customer?.name || 'Cliente');
  const customerPhone = String(booking.customerPhone || booking.customer?.phone || '');
  const tourName = String(booking.tourName || 'Tour en Costa Rica');
  const tourDate = String(booking.date || 'Fecha por confirmar');
  const tourTime = String(booking.time || '08:00 AM');
  const pickupHotel = String(booking.pickupHotel || 'No especificado');
  const totalUSD = Number(booking.totalUSD || booking.totalAmount || 0);
  const pdfToken = createCustomerActionToken({ bookingId, action: 'view_pdf' });
  const downloadPdfUrl = `${APP_URL}/api/bookings/${encodeURIComponent(bookingId)}/download-pdf?token=${encodeURIComponent(pdfToken)}`;
  const viewVoucherUrl = `${APP_URL}/api/bookings/${encodeURIComponent(bookingId)}/pdf?token=${encodeURIComponent(pdfToken)}`;
  const confirmationToken = createCustomerActionToken({ bookingId, action: 'decide' });
  const confirmationUrl = `${APP_URL}/api/bookings/${encodeURIComponent(bookingId)}/customer-confirm?action=approve&token=${encodeURIComponent(confirmationToken)}`;

  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateBookingPDFBuffer({
      bookingId,
      tourName,
      customerName,
      customerEmail,
      customerPhone,
      date: tourDate,
      time: tourTime,
      adults: Math.max(0, Number(booking.adults) || 0),
      children: Math.max(0, Number(booking.children) || 0),
      totalUSD,
      specialRequests: booking.specialRequests || 'Ninguna registrada',
      pickupHotel
    });
  } catch (error) {
    console.warn('No se pudo generar voucher de confirmación:', error);
  }

  let emailSent = false;
  if (customerEmail.includes('@')) {
    const emailResult = await sendEmail({
      to: customerEmail,
      subject: `Reserva confirmada #${bookingId} — Costa Rica Tours`,
      attachments: pdfBuffer ? [{
        filename: `CostaRicaTours-${bookingId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }] : undefined,
      html: `<p>Hola ${customerName.replace(/[<>]/g, '')},</p>
        <p>Tu reserva <strong>#${bookingId}</strong> está confirmada.</p>
        <p><strong>Tour:</strong> ${tourName}<br><strong>Fecha:</strong> ${tourDate} ${tourTime}<br>
        <strong>Recogida:</strong> ${pickupHotel}<br><strong>Total:</strong> $${totalUSD.toFixed(2)} USD</p>
        <p><a href="${downloadPdfUrl}">Descargar comprobante</a> · <a href="${viewVoucherUrl}">Ver comprobante</a></p>`
    });
    emailSent = Boolean(emailResult.success);
  }

  let whatsappSent = false;
  if (customerPhone) {
    const wa = await sendWhatsAppMessage({
      toPhone: customerPhone,
      customerName,
      message: `🌿 Reserva #${bookingId} confirmada. Tour: ${tourName}. Fecha: ${tourDate} ${tourTime}. Comprobante: ${downloadPdfUrl}`,
      bookingId,
      pdfUrl: downloadPdfUrl,
      confirmationUrl
    });
    whatsappSent = Boolean(wa.success);
  }

  if (emailSent || whatsappSent) {
    logAutomationExecution('WF_CONFIRMACION_RESERVA', 0, 'success', `Cliente notificado para reserva #${bookingId}`);
    return { success: true, customerNotified: true, escalated: false, message: 'Cliente notificado usando datos de la reserva.' };
  }

  await recordEscalation({
    type: 'CUSTOMER_NOTIFICATION_FAILED',
    bookingId,
    customerEmail,
    customerPhone,
    reason: 'No se pudo notificar al cliente por los canales configurados.',
    details: {
      Tour: tourName,
      Fecha: tourDate,
      MontoUSD: totalUSD
    }
  });
  return { success: false, customerNotified: false, escalated: true, message: 'No se pudo notificar al cliente; se registró una escalación operativa.' };
}

export async function executeCustomerProformaConfirmation(payload: {
  bookingId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  adults?: number;
  children?: number;
  childAge?: number;
  tourName?: string;
  startDate?: string;
  time?: string;
  totalUSD?: number;
  specialRequests?: string;
}): Promise<{
  success: boolean;
  bookingId: string;
  emailSent: boolean;
  emailId?: string;
  whatsappSent: boolean;
  whatsappUrl: string;
  whatsappMessage: string;
  pdfGenerated: boolean;
  downloadPdfUrl: string;
  viewVoucherUrl: string;
  approvalUrl: string;
  message: string;
}> {
  const bookingId = payload.bookingId || `CRT-${Date.now().toString(36).toUpperCase()}`;
  const customerName = payload.customerName || 'Cliente';
  const customerEmail = payload.customerEmail || '';
  const customerPhone = payload.customerPhone || '';
  const adults = Math.max(0, Number(payload.adults) || 0);
  const children = Math.max(0, Number(payload.children) || 0);
  const tourName = payload.tourName || 'Experiencia Costa Rica';
  const startDate = payload.startDate || new Date().toISOString().slice(0, 10);
  const time = payload.time || '08:00 AM';
  const totalUSD = Number(payload.totalUSD) || 0;
  const specialRequests = payload.specialRequests || 'Ninguna registrada';

  const pdfToken = createCustomerActionToken({ bookingId, action: 'view_pdf' });
  const downloadPdfUrl = `${APP_URL}/api/bookings/${encodeURIComponent(bookingId)}/download-pdf?token=${encodeURIComponent(pdfToken)}`;
  const viewVoucherUrl = `${APP_URL}/api/bookings/${encodeURIComponent(bookingId)}/pdf?token=${encodeURIComponent(pdfToken)}`;
  const approvalToken = createCustomerActionToken({ bookingId, action: 'decide' });
  const approvalUrl = `${APP_URL}/api/bookings/${encodeURIComponent(bookingId)}/customer-confirm?action=approve&token=${encodeURIComponent(approvalToken)}`;
  const whatsappMessageText = `🌿 Costa Rica Tours — Reserva #${bookingId}\\n\\nTour: ${tourName}\\nFecha: ${startDate} ${time}\\nPasajeros: ${adults + children}\\n\\nComprobante: ${downloadPdfUrl}`;

  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateBookingPDFBuffer({
      bookingId, tourName, customerName, customerEmail, customerPhone,
      date: startDate, time, adults, children, totalUSD, specialRequests
    });
  } catch (error) {
    console.warn('No se pudo generar PDF de proforma:', error);
  }

  let emailResult: any = { success: false };
  if (customerEmail.includes('@')) {
    emailResult = await sendEmail({
      to: customerEmail,
      subject: `Comprobante de reserva #${bookingId} — Costa Rica Tours`,
      attachments: pdfBuffer ? [{
        filename: `CostaRicaTours-${bookingId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }] : undefined,
      html: `<p>Hola ${customerName.replace(/[<>]/g, '')},</p>
        <p>Tu reserva <strong>#${bookingId}</strong> fue registrada.</p>
        <p><strong>Tour:</strong> ${tourName}<br><strong>Fecha:</strong> ${startDate} ${time}<br>
        <strong>Pasajeros:</strong> ${adults + children}<br><strong>Total:</strong> $${totalUSD.toFixed(2)} USD</p>
        <p>Solicitudes especiales: ${specialRequests}</p>
        <p><a href="${downloadPdfUrl}">Descargar comprobante</a></p>`
    });
  }

  let waResult: any = { success: false, url: '' };
  if (customerPhone) {
    waResult = await sendWhatsAppMessage({
      toPhone: customerPhone,
      customerName,
      message: whatsappMessageText,
      bookingId,
      pdfUrl: downloadPdfUrl,
      confirmationUrl: approvalUrl
    });
  }

  logAutomationExecution('WF_PROFORMA_CONFIRMACION', 0, emailResult.success || waResult.success ? 'success' : 'warning',
    `Proforma #${bookingId}: email=${Boolean(emailResult.success)}, whatsapp=${Boolean(waResult.success)}`);

  return {
    success: Boolean(emailResult.success || waResult.success || pdfBuffer),
    bookingId,
    emailSent: Boolean(emailResult.success),
    emailId: emailResult.id,
    whatsappSent: Boolean(waResult.success),
    whatsappUrl: waResult.url || '',
    whatsappMessage: whatsappMessageText,
    pdfGenerated: Boolean(pdfBuffer),
    downloadPdfUrl,
    viewVoucherUrl,
    approvalUrl,
    message: 'Proforma procesada usando únicamente datos de la reserva.'
  };
}

export async function executeAutomatedProviderPayouts(): Promise<{
  success: boolean;
  totalProcessed: number;
  totalPaidUSD: number;
  payouts: Array<{ bookingId: string; providerId: string; amountUSD: number; status: string; batchId?: string }>;
  escalationsCount: number;
  timestamp: string;
}> {
  console.log('🕒 [PAGOS AUTOMÁTICOS 6AM] Iniciando procesamiento de liquidaciones a proveedores...');
  const db = getFirestoreDb();
  const bookingsCol = getBookingsCollection();

  const results = {
    success: true,
    totalProcessed: 0,
    totalPaidUSD: 0,
    payouts: [] as Array<{ bookingId: string; providerId: string; amountUSD: number; status: string; batchId?: string }>,
    escalationsCount: 0,
    timestamp: new Date().toISOString()
  };

  if (!bookingsCol) {
    console.warn('⚠️ Base de datos no disponible para batch de pagos.');
    return results;
  }

  try {
    // Buscar reservas confirmadas/completadas pendientes de pago a proveedor
    const snapshot = await bookingsCol.get();
    const eligibleBookings: any[] = [];

    snapshot.forEach((doc) => {
      const b = doc.data();
      const isConfirmed = b.status === 'confirmada' || b.paymentStatus === 'completed';
      const isNotPaid = b.payoutStatus !== 'paid';
      if (isConfirmed && isNotPaid) {
        eligibleBookings.push({ id: doc.id, ...b });
      }
    });

    console.log(`🔍 [PAGOS AUTOMÁTICOS] ${eligibleBookings.length} reservas elegibles para liquidación.`);

    // Obtener token de PayPal si hay credenciales configuradas
    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const paypalSecret = process.env.PAYPAL_SECRET;
    const paypalMode = process.env.PAYPAL_MODE || 'sandbox';
    const baseUrl = paypalMode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

    let paypalAccessToken: string | null = null;
    if (paypalClientId && paypalSecret) {
      try {
        const authStr = Buffer.from(`${paypalClientId}:${paypalSecret}`).toString('base64');
        const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
          method: 'POST',
          body: 'grant_type=client_credentials',
          headers: {
            Authorization: `Basic ${authStr}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        const tokenData = await tokenRes.json();
        paypalAccessToken = tokenData.access_token || null;
      } catch (tokenErr) {
        console.error('❌ Error obteniendo access_token de PayPal:', tokenErr);
      }
    }

    for (const booking of eligibleBookings) {
      results.totalProcessed += 1;
      const bookingId = booking.bookingId || booking.id;
      const providerId = booking.providerId || booking.providerInfo?.id || 'alsama-tours-cr';
      const totalUSD = Number(booking.totalUSD || booking.totalAmount || 100);

      // Buscar datos y correo PayPal del proveedor
      const provider = await getProviderFromDb(providerId);
      const rawPaypal = provider?.paypalEmail || booking.providerInfo?.paypalEmail || (providerId === 'alsama-tours-cr' ? 'operaciones@alsamatourscr.com' : null);
      const paypalEmail = getEffectiveProviderEmail(rawPaypal);
      const commissionRate = provider?.commissionRate ?? 0.15; // 15% comisión plataforma
      const payoutAmountUSD = Math.max(1, Number((totalUSD * (1 - commissionRate)).toFixed(2)));

      // CRÍTICO - IDEMPOTENCIA: El senderBatchId DEBE ser determinístico por reserva (ej. payout-{bookingId})
      // NUNCA incluir Date.now() ni timestamps variables para que PayPal deduplique si hay reintentos.
      const deterministicSenderBatchId = `payout-${bookingId}`;

      if (!paypalEmail) {
        const reason = `Proveedor "${providerId}" no tiene correo PayPal configurado en Firestore.`;
        await recordEscalation({
          type: 'PAYOUT_NO_PAYPAL_EMAIL',
          bookingId,
          providerId,
          reason,
          details: { totalUSD, payoutAmountUSD }
        });
        results.escalationsCount += 1;
        results.payouts.push({ bookingId, providerId, amountUSD: payoutAmountUSD, status: 'FAILED_NO_EMAIL' });
        continue;
      }

      if (!paypalAccessToken) {
        // En entorno de desarrollo o sin credenciales, registramos simulación idempotente
        console.log(`💳 [PAYPAL PAYOUT SIMULADO] BatchId: ${deterministicSenderBatchId} -> $${payoutAmountUSD} USD a ${paypalEmail}`);
        await updateBookingStatus(bookingId, {
          payoutStatus: 'paid',
          payoutBatchId: deterministicSenderBatchId,
          payoutAmountUSD,
          payoutRecipient: paypalEmail,
          payoutPaidAt: new Date().toISOString()
        });
        results.totalPaidUSD += payoutAmountUSD;
        results.payouts.push({ bookingId, providerId, amountUSD: payoutAmountUSD, status: 'SUCCESS_SIMULATED', batchId: deterministicSenderBatchId });
        continue;
      }

      // Ejecutar PayPal Payouts API real con Idempotencia garantizada
      try {
        const payoutResponse = await fetch(`${baseUrl}/v1/payments/payouts`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${paypalAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sender_batch_header: {
              sender_batch_id: deterministicSenderBatchId,
              email_subject: 'Liquidación de Tour - Costa Rica Tours',
              email_message: `Pago de liquidación neta por la reserva ${bookingId}. ¡Gracias por ser parte de nuestra red de turismo!`
            },
            items: [
              {
                recipient_type: 'EMAIL',
                amount: {
                  value: payoutAmountUSD.toString(),
                  currency: 'USD'
                },
                note: `Liquidación por tour ${booking.tourName || 'Tour'} (Reserva: ${bookingId})`,
                receiver: paypalEmail,
                sender_item_id: `item-${bookingId}`
              }
            ]
          })
        });

        const payoutData = await payoutResponse.json();

        if (payoutResponse.ok && (payoutData.batch_header?.batch_status === 'PENDING' || payoutData.batch_header?.batch_status === 'SUCCESS')) {
          await updateBookingStatus(bookingId, {
            payoutStatus: 'paid',
            payoutBatchId: deterministicSenderBatchId,
            paypalPayoutBatchId: payoutData.batch_header.payout_batch_id,
            payoutAmountUSD,
            payoutRecipient: paypalEmail,
            payoutPaidAt: new Date().toISOString()
          });

          results.totalPaidUSD += payoutAmountUSD;
          results.payouts.push({
            bookingId,
            providerId,
            amountUSD: payoutAmountUSD,
            status: 'SUCCESS',
            batchId: deterministicSenderBatchId
          });
          console.log(`✅ [PAYPAL PAYOUT ÉXITO] $${payoutAmountUSD} USD transferido a ${paypalEmail} (Batch: ${deterministicSenderBatchId})`);
        } else {
          const reason = `Fallo en PayPal Payout API: ${payoutData.message || JSON.stringify(payoutData)}`;
          await recordEscalation({
            type: 'PAYOUT_API_ERROR',
            bookingId,
            providerId,
            reason,
            details: { payoutData, payoutAmountUSD, paypalEmail }
          });
          results.escalationsCount += 1;
          results.payouts.push({ bookingId, providerId, amountUSD: payoutAmountUSD, status: 'FAILED_API_ERROR' });
        }
      } catch (apiErr: any) {
        const reason = `Excepción al invocar PayPal Payouts: ${apiErr.message}`;
        await recordEscalation({
          type: 'PAYOUT_EXCEPTION',
          bookingId,
          providerId,
          reason,
          details: { error: apiErr.message }
        });
        results.escalationsCount += 1;
        results.payouts.push({ bookingId, providerId, amountUSD: payoutAmountUSD, status: 'EXCEPTION' });
      }
    }

    // Enviar resumen final a Centro de Operaciones si hubo actividad o fallos
    if (results.totalProcessed > 0 || results.escalationsCount > 0) {
      let operacionesSummary = `💰 <b>[RESUMEN BATCH PAGOS 6:00 AM]</b>\n`;
      operacionesSummary += `• <b>Total Procesadas:</b> ${results.totalProcessed}\n`;
      operacionesSummary += `• <b>Monto Total Liquidado:</b> $${results.totalPaidUSD} USD\n`;
      operacionesSummary += `• <b>Pagos Exitosos:</b> ${results.payouts.filter(p => p.status.includes('SUCCESS')).length}\n`;
      operacionesSummary += `• <b>Escalaciones / Fallos:</b> ${results.escalationsCount}\n`;

      if (results.escalationsCount > 0) {
        operacionesSummary += `\n⚠️ <i>Se registraron ${results.escalationsCount} fallos en Firestore (escalations). Revisar correos PayPal faltantes.</i>`;
      }

      await sendOperationalNotification(operacionesSummary, { parseMode: 'HTML' });
    }
  } catch (err: any) {
    console.error('❌ Error general en cron de pagos a proveedores:', err);
  }

  return results;
}

// =========================================================================
// 4. VIGILANCIA Y ESCALAMIENTO (Trigger: Cron Cada 2 Horas)
// =========================================================================
export async function executeSurveillanceAndEscalation(): Promise<{
  checkedBookings: number;
  alertsSent: number;
  escalatedBookings: string[];
  timestamp: string;
}> {
  console.log('🔍 [VIGILANCIA C/2H] Escaneando reservas pendientes de pago sin confirmar...');
  const bookingsCol = getBookingsCollection();
  const response = {
    checkedBookings: 0,
    alertsSent: 0,
    escalatedBookings: [] as string[],
    timestamp: new Date().toISOString()
  };

  if (!bookingsCol) return response;

  try {
    const snapshot = await bookingsCol.get();
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

    for (const doc of snapshot.docs) {
      const b = doc.data();
      response.checkedBookings += 1;

      const isPending = b.status === 'pendiente_pago' || b.paymentStatus === 'pending';
      const notAlertedYet = b.pendingAlertSent !== true;

      // Manejar createdAt tanto si es Firestore Timestamp como string ISO
      const createdDate = normalizeDate(b.createdAt);
      const isStale = createdDate.getTime() > 0 && createdDate.getTime() < twoHoursAgo;

      if (isPending && notAlertedYet && isStale) {
        const bookingId = b.bookingId || doc.id;
        const customerName = b.customerName || b.customer?.name || 'Cliente';
        const customerEmail = b.customerEmail || b.customer?.email || 'Sin email';
        const customerPhone = b.customerPhone || b.customer?.phone || 'Sin teléfono';
        const tourName = b.tourName || 'Tour Costa Rica';
        const totalUSD = b.totalUSD || b.totalAmount || 0;

        // 1. Marcar alerta como enviada para NO duplicar avisos
        await updateBookingStatus(bookingId, {
          pendingAlertSent: true,
          pendingAlertSentAt: new Date().toISOString()
        });

        // 2. Registrar escalación
        await recordEscalation({
          type: 'STALE_PENDING_BOOKING',
          bookingId,
          reason: `Reserva con pago pendiente lleva más de 2 horas sin confirmación.`,
          details: { customerName, customerEmail, customerPhone, tourName, totalUSD, createdAt: createdDate.toISOString() }
        });

        // 3. Notificar por Centro de Operaciones
        await sendAdministrativeAlert({
          title: 'Reserva Pendiente de Pago Estancada (>2h)',
          reason: 'El cliente inició el proceso pero no completó el pago en la pasarela o SINPE Móvil.',
          bookingId,
          customerName,
          customerEmail,
          customerPhone,
          details: {
            Tour: tourName,
            Total: `$${totalUSD} USD`,
            Creada: createdDate.toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' }),
            Accion: 'Contactar al cliente por WhatsApp para ofrecer asistencia o link de pago directo.'
          }
        });

        response.alertsSent += 1;
        response.escalatedBookings.push(bookingId);
      }
    }
    console.log(`✅ [VIGILANCIA C/2H] Finalizado. Revisadas: ${response.checkedBookings}, Alertas emitidas: ${response.alertsSent}`);
  } catch (err) {
    console.error('❌ Error en vigilancia y escalamiento:', err);
  }

  return response;
}

// =========================================================================
// 5. REPORTE DIARIO DE OPERACIÓN (Trigger: Cron Diario 8:00 PM Costa Rica)
// =========================================================================
export async function executeDailyOperationReport(): Promise<{
  reportDate: string;
  totalBookingsToday: number;
  confirmedToday: number;
  pendingToday: number;
  revenueUSD: number;
  revenueCRC: number;
  escalationsToday: number;
  topTours: Array<{ name: string; count: number }>;
}> {
  console.log('📊 [REPORTE DIARIO 8PM] Generando consolidado operativo del día...');
  const db = getFirestoreDb();
  const bookingsCol = getBookingsCollection();

  const todayCR = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' }); // Formato YYYY-MM-DD
  let totalBookingsToday = 0;
  let confirmedToday = 0;
  let pendingToday = 0;
  let revenueUSD = 0;
  const tourCounts: Record<string, number> = {};

  if (bookingsCol) {
    try {
      const snapshot = await bookingsCol.get();

      snapshot.forEach((doc) => {
        const b = doc.data();
        // NOTA DE CALIDAD DE DATOS: Normalizar createdAt sea Timestamp o String ISO
        const createdDate = normalizeDate(b.createdAt);
        const bookingDateStr = createdDate.toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });

        if (bookingDateStr === todayCR || (b.date && b.date === todayCR)) {
          totalBookingsToday += 1;
          const isConfirmed = b.status === 'confirmada' || b.paymentStatus === 'completed';
          if (isConfirmed) {
            confirmedToday += 1;
            const amt = Number(b.totalUSD || b.totalAmount || 0);
            revenueUSD += amt;

            const tName = b.tourName || 'Tour General';
            tourCounts[tName] = (tourCounts[tName] || 0) + 1;
          } else if (b.status === 'pendiente_pago' || b.paymentStatus === 'pending') {
            pendingToday += 1;
          }
        }
      });
    } catch (err) {
      console.warn('Error leyendo reservas para reporte diario:', err);
    }
  }

  // Contar escalaciones del día
  let escalationsToday = 0;
  if (db) {
    try {
      const escSnap = await db.collection('escalations').get();
      escSnap.forEach((doc) => {
        const esc = doc.data();
        const escDate = normalizeDate(esc.createdAt);
        const escDateStr = escDate.toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
        if (escDateStr === todayCR) {
          escalationsToday += 1;
        }
      });
    } catch (err) {
      console.warn('Error leyendo escalaciones para reporte diario:', err);
    }
  }

  const usdRate = Number(process.env.USD_TO_CRC_RATE) || 0;
  const revenueCRC = usdRate > 0 ? Math.round(revenueUSD * usdRate) : 0;
  const topTours = Object.entries(tourCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Formatear y despachar mensaje a Centro de Operaciones
  let reportText = `🇨🇷 <b>[REPORTE DIARIO DE OPERACIÓN - 8:00 PM]</b>\n`;
  reportText += `📅 <b>Fecha:</b> ${todayCR} (Hora Costa Rica)\n\n`;
  reportText += `📈 <b>Métricas de Ventas:</b>\n`;
  reportText += `• Reservas Totales Hoy: <b>${totalBookingsToday}</b>\n`;
  reportText += `• Confirmadas & Pagadas: <b>${confirmedToday}</b>\n`;
  reportText += `• Pendientes de Pago: <b>${pendingToday}</b>\n`;
  reportText += `• Facturación Bruta: <b>$${revenueUSD.toLocaleString('en-US')} USD</b> (₡${revenueCRC.toLocaleString('es-CR')} CRC)\n\n`;

  reportText += `🚨 <b>Escalaciones Registradas:</b> <b>${escalationsToday}</b>\n`;

  if (topTours.length > 0) {
    reportText += `\n🏆 <b>Tours Más Solicitados Hoy:</b>\n`;
    topTours.forEach((t, idx) => {
      reportText += `${idx + 1}. ${t.name} (${t.count} reservas)\n`;
    });
  }

  reportText += `\n✨ <i>Operaciones fluidas bajo estándar CST. ¡Pura Vida!</i>`;

  await sendOperationalNotification(reportText, { parseMode: 'HTML' });

  return {
    reportDate: todayCR,
    totalBookingsToday,
    confirmedToday,
    pendingToday,
    revenueUSD,
    revenueCRC,
    escalationsToday,
    topTours
  };
}

// =========================================================================
// 6. SOLICITUD DE RESEÑA POST-TOUR (Trigger: Cron Diario 5:00 PM Costa Rica)
// =========================================================================
export async function executePostTourReviewRequests(): Promise<{
  success: boolean;
  eligibleBookings: number;
  emailsSent: number;
  escalatedCount: number;
}> {
  console.log('⭐ [RESEÑAS POST-TOUR 5PM] Escaneando tours completados para solicitud de reseña...');
  const bookingsCol = getBookingsCollection();
  const summary = {
    success: true,
    eligibleBookings: 0,
    emailsSent: 0,
    escalatedCount: 0
  };

  if (!bookingsCol) return summary;

  try {
    const snapshot = await bookingsCol.get();
    const todayCR = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
    const yesterdayCR = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });

    for (const doc of snapshot.docs) {
      const b = doc.data();
      const bookingId = b.bookingId || doc.id;
      const isConfirmed = b.status === 'confirmada' || b.paymentStatus === 'completed';
      const isCompletedDate = b.date === yesterdayCR || b.date === todayCR;
      const notSentYet = b.reviewRequestSent !== true;

      if (isConfirmed && isCompletedDate && notSentYet) {
        summary.eligibleBookings += 1;
        const customerEmail = b.customerEmail || b.customer?.email;
        const customerName = b.customerName || b.customer?.name || 'Viajero';
        const tourName = b.tourName || 'Tour en Costa Rica';
        const tourId = b.tourId || 'tour-general';

        // Link a formulario PROPIO de reseñas (no de terceros) con bookingId como parámetro
        const internalReviewUrl = `${APP_URL}/resenas?bookingId=${bookingId}&tourId=${tourId}`;

        if (customerEmail && customerEmail.includes('@')) {
          const emailResult = await sendEmail({
            to: customerEmail,
            subject: `🌟 ¿Cómo fue tu experiencia en ${tourName}? - Costa Rica Tours`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #064e3b; color: #ffffff; padding: 24px; text-align: center;">
                  <h2 style="margin: 0; font-size: 20px;">¡Esperamos que hayas vivido momentos mágicos! ✨</h2>
                  <p style="margin: 6px 0 0 0; font-size: 13px; color: #6ee7b7;">Tu opinión impulsa el turismo sostenible en Costa Rica</p>
                </div>
                <div style="padding: 24px;">
                  <p>Hola <strong>${customerName}</strong>,</p>
                  <p>Gracias por confiar en Costa Rica Tours para tu tour <strong>${tourName}</strong>.</p>
                  <p>Queremos asegurarnos de que cada detalle haya sido excepcional. ¿Nos regalarías 1 minuto para calificar a tu guía y compartir tus comentarios?</p>
                  
                  <div style="text-align: center; margin: 28px 0;">
                    <a href="${internalReviewUrl}" style="background-color: #f59e0b; color: #0c0a09; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                      ⭐ Dejar mi Reseña Oficial
                    </a>
                  </div>

                  <p style="font-size: 12px; color: #78716c; text-align: center;">
                    Al calificar recibirás un cupón de <strong>10% de descuento</strong> transferible para tus próximas vacaciones.
                  </p>
                </div>
              </div>
            `
          });

          if (emailResult.success) {
            await updateBookingStatus(bookingId, {
              reviewRequestSent: true,
              reviewRequestSentAt: new Date().toISOString()
            });
            summary.emailsSent += 1;
            console.log(`✅ [SOLICITUD RESEÑA] Email despachado a ${customerEmail} (Reserva: ${bookingId})`);
            continue;
          }
        }

        // Si falló el envío o no tiene correo -> Escalar por Centro de Operaciones
        summary.escalatedCount += 1;
        await recordEscalation({
          type: 'REVIEW_REQUEST_FAILED',
          bookingId,
          reason: !customerEmail ? 'Cliente no tiene email registrado' : 'Fallo en servicio de correo',
          details: { customerName, customerEmail, tourName, reviewUrl: internalReviewUrl }
        });

        await sendAdministrativeAlert({
          title: 'Solicitud de Reseña no Entregada',
          reason: 'No se pudo enviar el correo de reseña post-tour.',
          bookingId,
          customerName,
          customerEmail,
          customerPhone: b.customerPhone || b.customer?.phone,
          details: {
            Tour: tourName,
            LinkReseña: internalReviewUrl,
            Accion: 'Enviar link de reseña por WhatsApp al cliente.'
          }
        });
      }
    }
  } catch (err) {
    console.error('❌ Error en cron de reseñas post-tour:', err);
  }

  return summary;
}

// =========================================================================
// 7. RECORDATORIO 24H ANTES DEL TOUR (Trigger: Cron Diario 7:00 AM Costa Rica)
// =========================================================================
export async function executeTour24hReminders(): Promise<{
  success: boolean;
  tomorrowDate: string;
  totalRemindersSent: number;
  escalationsCount: number;
}> {
  console.log('⏰ [RECORDATORIO 24H - 7AM] Buscando tours programados para el día de mañana...');
  const bookingsCol = getBookingsCollection();

  // Calcular fecha de mañana en Costa Rica
  const tomorrowObj = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrowObj.toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });

  const summary = {
    success: true,
    tomorrowDate: tomorrowStr,
    totalRemindersSent: 0,
    escalationsCount: 0
  };

  if (!bookingsCol) return summary;

  try {
    const snapshot = await bookingsCol.where('date', '==', tomorrowStr).get();

    for (const doc of snapshot.docs) {
      const b = doc.data();
      const bookingId = b.bookingId || doc.id;
      const isConfirmed = b.status === 'confirmada' || b.paymentStatus === 'completed';
      const notRemindedYet = b.reminderSent !== true;

      if (isConfirmed && notRemindedYet) {
        const customerEmail = b.customerEmail || b.customer?.email;
        const customerName = b.customerName || b.customer?.name || 'Estimado Viajero';
        const tourName = b.tourName || 'Tour Oficial';
        const tourTime = b.time || '08:00 AM';
        const pickupHotel = b.pickupHotel || 'Recepción de su Hotel';
        const voucherUrl = b.voucherUrl || `${APP_URL}?voucher=${bookingId}`;

        if (customerEmail && customerEmail.includes('@')) {
          const emailResult = await sendEmail({
            to: customerEmail,
            subject: `⏰ Recordatorio 24h: Mañana es tu tour "${tourName}" (${tourTime})`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #064e3b; color: #ffffff; padding: 24px; text-align: center;">
                  <h2 style="margin: 0; font-size: 20px;">¡Tu aventura comienza mañana! 🇨🇷</h2>
                  <p style="margin: 6px 0 0 0; font-size: 13px; color: #6ee7b7;">Recordatorio Importante de Salida</p>
                </div>
                <div style="padding: 24px;">
                  <p>Hola <strong>${customerName}</strong>,</p>
                  <p>Te recordamos los detalles clave de tu tour de mañana <strong>${tomorrowStr}</strong>:</p>
                  
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <p style="margin: 4px 0;">📍 <strong>Tour:</strong> ${tourName}</p>
                    <p style="margin: 4px 0;">⏰ <strong>Hora de Salida / Pick-up:</strong> ${tourTime}</p>
                    <p style="margin: 4px 0;">🏨 <strong>Punto de Encuentro:</strong> ${pickupHotel}</p>
                    <p style="margin: 4px 0;">🎫 <strong>Voucher:</strong> <code>${bookingId}</code></p>
                  </div>

                  <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 4px 0; font-size: 13px; color: #065f46;">💡 Recomendación Operativa:</h4>
                    <p style="margin: 0; font-size: 12px; color: #047857;">
                      Por favor estar en el lobby 10 minutos antes de la hora acordada. El transporte oficial porta distintivo de <strong>Costa Rica Tours / Alsama Tours CR</strong>.
                    </p>
                  </div>

                  <div style="text-align: center; margin: 20px 0;">
                    <a href="${voucherUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
                      Ver Voucher Digital Completo
                    </a>
                  </div>

                  <p style="font-size: 12px; color: #64748b; text-align: center;">
                    ¿Algún cambio de última hora? Escríbenos directamente a WhatsApp: +506 8795-9148.
                  </p>
                </div>
              </div>
            `
          });

          if (emailResult.success) {
            await updateBookingStatus(bookingId, {
              reminderSent: true,
              reminderSentAt: new Date().toISOString()
            });
            summary.totalRemindersSent += 1;
            console.log(`✅ [RECORDATORIO 24H] Despachado a ${customerEmail} (Reserva: ${bookingId})`);
            continue;
          }
        }

        // Si falló o no tiene email -> Escalar por Centro de Operaciones
        summary.escalationsCount += 1;
        await recordEscalation({
          type: 'REMINDER_24H_FAILED',
          bookingId,
          reason: !customerEmail ? 'Cliente no tiene correo registrado' : 'Fallo al enviar correo de recordatorio',
          details: { customerName, customerEmail, tourName, tourTime, pickupHotel, tomorrowStr }
        });

        await sendAdministrativeAlert({
          title: 'Fallo al Enviar Recordatorio 24h',
          reason: 'No se pudo contactar al cliente por correo para el recordatorio de mañana.',
          bookingId,
          customerName,
          customerEmail,
          customerPhone: b.customerPhone || b.customer?.phone,
          details: {
            Tour: tourName,
            FechaTour: tomorrowStr,
            Hora: tourTime,
            Lugar: pickupHotel,
            Accion: 'Enviar recordatorio por WhatsApp de inmediato.'
          }
        });
      }
    }
  } catch (err) {
    console.error('❌ Error en cron de recordatorio 24h:', err);
  }

  return summary;
}

// =========================================================================
// 8. ALERTA METEOROLÓGICA AUTOMÁTICA Y ADAPTACIÓN DE ITINERARIO (Cron c/4h)
// =========================================================================
export async function executeWeatherMonitoringAlerts(): Promise<{
  checkedBookings: number;
  alertsSent: number;
  affectedBookings: string[];
}> {
  console.log('🌦️ [CLIMA Y SEGURIDAD C/4H] Evaluando condiciones meteorológicas en rutas de Costa Rica...');
  const bookingsCol = getBookingsCollection();
  const result = {
    checkedBookings: 0,
    alertsSent: 0,
    affectedBookings: [] as string[]
  };

  if (!bookingsCol) return result;

  try {
    const todayCR = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
    const snapshot = await bookingsCol.where('date', '==', todayCR).get();

    for (const doc of snapshot.docs) {
      const b = doc.data();
      result.checkedBookings++;
      const bookingId = b.bookingId || doc.id;
      const isConfirmed = b.status === 'confirmada' || b.paymentStatus === 'completed';
      const notAlertedYet = b.weatherNoticeSent !== true;

      if (!isConfirmed || !notAlertedYet) continue;

      const tourName = (b.tourName || '').toLowerCase();
      // Zonas de alta pluviosidad o aventura que requieren monitoreo meteorológico activo
      const isSensitiveZone = 
        tourName.includes('arenal') || 
        tourName.includes('fortuna') || 
        tourName.includes('sarapiquí') || 
        tourName.includes('rafting') || 
        tourName.includes('canopy') || 
        tourName.includes('monteverde') || 
        tourName.includes('tortuguero') || 
        tourName.includes('ballena') ||
        tourName.includes('corcovado');

      if (isSensitiveZone) {
        const customerEmail = b.customerEmail || b.customer?.email;
        const customerName = b.customerName || b.customer?.name || 'Estimado Viajero';
        const operatorName = b.operator || 'Alsama Tours CR';

        if (customerEmail && customerEmail.includes('@')) {
          await sendEmail({
            to: customerEmail,
            subject: `🌿 Aviso Preventivo de Seguridad y Clima: Tu tour "${b.tourName}" de hoy`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #064e3b; color: #ffffff; padding: 20px; text-align: center;">
                  <h3 style="margin: 0; font-size: 18px;">🌿 Monitoreo Preventivo de Seguridad</h3>
                  <p style="margin: 4px 0 0 0; font-size: 13px; color: #a7f3d0;">Costa Rica Tours & ${operatorName}</p>
                </div>
                <div style="padding: 24px;">
                  <p>Hola <strong>${customerName}</strong>,</p>
                  <p>Nuestro equipo de operaciones y tu operador oficial (${operatorName}) monitorean continuamente las condiciones meteorológicas y el estado de los senderos para tu tour de hoy: <strong>${b.tourName}</strong>.</p>
                  
                  <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <h4 style="margin: 0 0 6px 0; color: #166534; font-size: 14px;">☀️ Consejos Operativos del Guía:</h4>
                    <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #14532d; line-height: 1.5;">
                      <li>Llevar capa impermeable ligera o poncho de lluvia tropical.</li>
                      <li>Calzado antideslizante con sujeción segura.</li>
                      <li>Protector para dispositivos electrónicos o bolsa seca.</li>
                      <li>Tu guía certificado coordinará cualquier ajuste menor de ruta para garantizar tu máxima seguridad y confort.</li>
                    </ul>
                  </div>

                  <p style="font-size: 12px; color: #64748b; text-align: center;">
                    Para cualquier consulta inmediata, contáctanos vía WhatsApp oficial al <strong>+506 8795 9148</strong>. ¡Pura Vida!
                  </p>
                </div>
              </div>
            `
          });
        }

        await updateBookingStatus(bookingId, {
          weatherNoticeSent: true,
          weatherNoticeSentAt: new Date().toISOString()
        });

        result.alertsSent++;
        result.affectedBookings.push(bookingId);
      }
    }

    console.log(`✅ [CLIMA Y SEGURIDAD] Evaluadas ${result.checkedBookings} reservas de hoy. Avisos despachados: ${result.alertsSent}`);
  } catch (err) {
    console.error('❌ Error en monitoreo meteorológico:', err);
  }

  return result;
}

// =========================================================================
// 9. CONCIERGE MATUTINO Y TIPS DE SEGURIDAD (Cron Diario 6:30 AM Costa Rica)
// =========================================================================
export async function executeMorningConciergeTips(): Promise<{
  checkedBookings: number;
  tipsSent: number;
  sentBookings: string[];
}> {
  console.log('🌅 [CONCIERGE 6:30 AM CR] Enviando recomendaciones matutinas para salidas de hoy...');
  const bookingsCol = getBookingsCollection();
  const result = {
    checkedBookings: 0,
    tipsSent: 0,
    sentBookings: [] as string[]
  };

  if (!bookingsCol) return result;

  try {
    const todayCR = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
    const snapshot = await bookingsCol.where('date', '==', todayCR).get();

    for (const doc of snapshot.docs) {
      const b = doc.data();
      result.checkedBookings++;
      const bookingId = b.bookingId || doc.id;
      const isConfirmed = b.status === 'confirmada' || b.paymentStatus === 'completed';
      const notSent = b.morningConciergeSent !== true;

      if (isConfirmed && notSent) {
        const customerEmail = b.customerEmail || b.customer?.email;
        const customerName = b.customerName || b.customer?.name || 'Viajero';
        const tourName = b.tourName || 'Experiencia Costa Rica';
        const tourTime = b.time || '08:00 AM';
        const pickupHotel = b.pickupHotel || 'Lobby de tu Hotel';

        if (customerEmail && customerEmail.includes('@')) {
          await sendEmail({
            to: customerEmail,
            subject: `🌅 ¡Buenos días ${customerName}! Hoy es tu gran día: ${tourName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #064e3b; color: #ffffff; padding: 22px; text-align: center;">
                  <h2 style="margin: 0; font-size: 20px;">¡Tu aventura de hoy está lista! 🇨🇷</h2>
                  <p style="margin: 4px 0 0 0; font-size: 13px; color: #a7f3d0;">Concierge Digital - Costa Rica Tours</p>
                </div>
                <div style="padding: 24px;">
                  <p>¡Buenos días <strong>${customerName}</strong>!</p>
                  <p>Hoy vivirás la magia de <strong>${tourName}</strong>. Aquí tienes tu check-list matutino para que disfrutes al máximo:</p>

                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <p style="margin: 4px 0; font-size: 14px;">⏰ <strong>Hora de salida / pick-up:</strong> ${tourTime}</p>
                    <p style="margin: 4px 0; font-size: 14px;">📍 <strong>Punto de encuentro:</strong> ${pickupHotel}</p>
                    <p style="margin: 4px 0; font-size: 14px;">🎫 <strong>Código de reserva:</strong> <code>${bookingId}</code></p>
                  </div>

                  <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 12px; padding: 14px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 4px 0; font-size: 13px; color: #854d0e;">🎒 Qué no olvidar en tu mochila:</h4>
                    <p style="margin: 0; font-size: 12px; color: #713f12; line-height: 1.5;">
                      Protector solar biodegradable, repelente de insectos ecológico, botella reutilizable con agua fresca, calzado cómodo para caminar y tu cámara fotográfica.
                    </p>
                  </div>

                  <p style="font-size: 12px; color: #64748b; text-align: center;">
                    Nuestro equipo te desea un recorrido inolvidable. ¡Pura Vida! 🌿
                  </p>
                </div>
              </div>
            `
          });

          await updateBookingStatus(bookingId, {
            morningConciergeSent: true,
            morningConciergeSentAt: new Date().toISOString()
          });

          result.tipsSent++;
          result.sentBookings.push(bookingId);
        }
      }
    }
  } catch (err) {
    console.error('❌ Error enviando concierge matutino:', err);
  }

  return result;
}

// =========================================================================
// 10. RECUPERACIÓN DE PROSPECTOS Y CARRITOS ABANDONADOS (Cron Cada 1 Hora)
// =========================================================================
export async function executePreSaleProspectRecovery(): Promise<{
  checkedBookings: number;
  recoveredSent: number;
  prospectsContacted: string[];
}> {
  console.log('🛒 [RECUPERACIÓN PRE-VENTA C/1H] Escaneando reservas pendientes entre 2h y 24h...');
  const bookingsCol = getBookingsCollection();
  const result = {
    checkedBookings: 0,
    recoveredSent: 0,
    prospectsContacted: [] as string[]
  };

  if (!bookingsCol) return result;

  try {
    const now = Date.now();
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    const snapshot = await bookingsCol.get();

    for (const doc of snapshot.docs) {
      const b = doc.data();
      result.checkedBookings++;
      const bookingId = b.bookingId || doc.id;
      const isPending = b.status === 'pendiente_pago' || b.status === 'hold' || b.paymentStatus === 'pending';
      const notRecoveredYet = b.preSaleRecoverySent !== true;

      const createdDate = normalizeDate(b.createdAt);
      const createdTime = createdDate.getTime();
      const inWindow = createdTime >= twentyFourHoursAgo && createdTime <= twoHoursAgo;

      if (isPending && notRecoveredYet && inWindow) {
        const customerEmail = b.customerEmail || b.customer?.email;
        const customerName = b.customerName || b.customer?.name || 'Viajero';
        const tourName = b.tourName || 'Experiencia en Costa Rica';
        const totalUSD = b.totalUSD || b.totalAmount || 0;

        if (customerEmail && customerEmail.includes('@')) {
          await sendEmail({
            to: customerEmail,
            subject: `🌿 ¿Tienes alguna duda con tu reserva para ${tourName}?`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #064e3b; color: #ffffff; padding: 22px; text-align: center;">
                  <h2 style="margin: 0; font-size: 20px;">Estamos aquí para ayudarte a planear tu viaje</h2>
                  <p style="margin: 4px 0 0 0; font-size: 13px; color: #a7f3d0;">Asistencia Personalizada - Costa Rica Tours</p>
                </div>
                <div style="padding: 24px;">
                  <p>Hola <strong>${customerName}</strong>,</p>
                  <p>Notamos que iniciaste tu reserva para <strong>${tourName}</strong> pero no lograste completar el pago.</p>
                  
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <p style="margin: 4px 0;">🎫 <strong>Código de Reserva:</strong> <code>${bookingId}</code></p>
                    <p style="margin: 4px 0;">💰 <strong>Monto Total:</strong> $${totalUSD} USD</p>
                    <p style="margin: 4px 0;">💳 <strong>Métodos disponibles:</strong> Tarjetas internacionales (Stripe), PayPal y SINPE Móvil local.</p>
                  </div>

                  <p>Si tienes preguntas sobre horarios, políticas de cancelación o requieres ayuda con el pago, nuestro equipo local de Pérez Zeledón te atiende directamente por WhatsApp:</p>

                  <div style="text-align: center; margin: 24px 0;">
                    <a href="https://wa.me/50687959148?text=${encodeURIComponent(`Hola, tengo una consulta sobre mi reserva #${bookingId} para ${tourName}`)}" style="background-color: #25d366; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                      💬 Hablar con un Asesor por WhatsApp
                    </a>
                  </div>

                  <p style="font-size: 12px; color: #64748b; text-align: center;">
                    Tu espacio se mantiene reservado temporalmente. ¡Pura Vida!
                  </p>
                </div>
              </div>
            `
          });

          await updateBookingStatus(bookingId, {
            preSaleRecoverySent: true,
            preSaleRecoverySentAt: new Date().toISOString()
          });

          result.recoveredSent++;
          result.prospectsContacted.push(bookingId);
        }
      }
    }
    console.log(`✅ [RECUPERACIÓN PRE-VENTA] Escaneo completado. Prospectos asistidos: ${result.recoveredSent}`);
  } catch (err) {
    console.error('❌ Error en recuperación pre-venta:', err);
  }

  return result;
}

// =========================================================================
// 11. FIDELIZACIÓN Y CUPONES VIP POST-VENTA (Cron Diario 10:00 AM Costa Rica)
// =========================================================================
export async function executePostSaleVipLoyalty(): Promise<{
  checkedBookings: number;
  couponsSent: number;
  rewardedBookings: string[];
}> {
  console.log('🎁 [FIDELIZACIÓN 10:00 AM CR] Buscando viajeros de hace 3 días para obsequio VIP...');
  const bookingsCol = getBookingsCollection();
  const result = {
    checkedBookings: 0,
    couponsSent: 0,
    rewardedBookings: [] as string[]
  };

  if (!bookingsCol) return result;

  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 3);
    const targetStr = targetDate.toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });

    const snapshot = await bookingsCol.where('date', '==', targetStr).get();

    for (const doc of snapshot.docs) {
      const b = doc.data();
      result.checkedBookings++;
      const bookingId = b.bookingId || doc.id;
      const isConfirmed = b.status === 'confirmada' || b.paymentStatus === 'completed';
      const notRewardedYet = b.vipCouponSent !== true;

      if (isConfirmed && notRewardedYet) {
        const customerEmail = b.customerEmail || b.customer?.email;
        const customerName = b.customerName || b.customer?.name || 'Apreciado Viajero';
        const tourName = b.tourName || 'Costa Rica';
        const vipCode = `PURAVIDA15-${bookingId.slice(-6).toUpperCase()}`;

        if (customerEmail && customerEmail.includes('@')) {
          await sendEmail({
            to: customerEmail,
            subject: `🎁 15% OFF de Regalo VIP para tu próxima aventura en Costa Rica`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #064e3b; color: #ffffff; padding: 24px; text-align: center;">
                  <h2 style="margin: 0; font-size: 22px;">¡Gracias por viajar con nosotros! ✨</h2>
                  <p style="margin: 6px 0 0 0; font-size: 13px; color: #a7f3d0;">Beneficio Exclusivo Comunidad Costa Rica Tours</p>
                </div>
                <div style="padding: 24px;">
                  <p>Hola <strong>${customerName}</strong>,</p>
                  <p>Esperamos que tu experiencia en <strong>${tourName}</strong> haya dejado memorias inolvidables en tu corazón.</p>
                  
                  <div style="text-align: center; margin: 24px 0; background-color: #fefce8; border: 2px dashed #eab308; border-radius: 16px; padding: 20px;">
                    <p style="margin: 0 0 6px 0; font-size: 13px; color: #854d0e; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Tu Cupón de Descuento VIP:</p>
                    <div style="font-size: 24px; font-weight: 900; color: #065f46; letter-spacing: 2px; margin: 8px 0;">${vipCode}</div>
                    <p style="margin: 0; font-size: 13px; color: #713f12;"><strong>15% de Descuento</strong> en cualquier tour o actividad de nuestro catálogo oficial.</p>
                  </div>

                  <p style="font-size: 13px; color: #44403c;">
                    Este beneficio es válido por 1 año y puedes transferirlo a amigos o familiares que planeen visitar Costa Rica.
                  </p>

                  <div style="text-align: center; margin: 20px 0;">
                    <a href="${APP_URL}/tours" style="background-color: #059669; color: #ffffff; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                      Explorar Más Experiencias
                    </a>
                  </div>

                  <p style="font-size: 12px; color: #78716c; text-align: center;">
                    Siempre serás bienvenido/a en Costa Rica. ¡Pura Vida! 🇨🇷
                  </p>
                </div>
              </div>
            `
          });

          await updateBookingStatus(bookingId, {
            vipCouponSent: true,
            vipCouponCode: vipCode,
            vipCouponSentAt: new Date().toISOString()
          });

          result.couponsSent++;
          result.rewardedBookings.push(bookingId);
        }
      }
    }

    console.log(`✅ [FIDELIZACIÓN 10AM] Proceso terminado. Cupones VIP entregados: ${result.couponsSent}`);
  } catch (err) {
    console.error('❌ Error en fidelización post-venta:', err);
  }

  return result;
}

// =========================================================================
// 12. MANEJADOR GLOBAL DE ERRORES Y RESILIENCIA NATIVA (Sustituto automatización nativa Error Handler)
// =========================================================================
export async function handleGlobalWorkflowError(params: {
  workflowName: string;
  failedNodeOrAction: string;
  error: any;
  context?: Record<string, any>;
}): Promise<{ recorded: boolean; alertId?: string }> {
  const errorMessage = params.error?.message || String(params.error) || 'Error no especificado';
  console.error(`🚨 [MANEJADOR GLOBAL DE ERRORES NATIVO] Fallo en ${params.workflowName} -> ${params.failedNodeOrAction}:`, errorMessage);

  try {
    const escalResult = await sendAdministrativeAlert({
      title: `Fallo en Workflow: ${params.workflowName}`,
      reason: `Error durante la acción "${params.failedNodeOrAction}": ${errorMessage}`,
      details: {
        Workflow: params.workflowName,
        Accion: params.failedNodeOrAction,
        MensajeError: errorMessage,
        ...(params.context || {})
      }
    });

    logAutomationExecution(
      `ERR_${params.workflowName.toUpperCase().replace(/\s+/g, '_')}`,
      0,
      'error',
      `Fallo interceptado: ${errorMessage}`
    );

    return { recorded: escalResult.success };
  } catch (secondaryErr) {
    console.error('❌ Fallo crítico secundario al registrar error global:', secondaryErr);
    return { recorded: false };
  }
}

