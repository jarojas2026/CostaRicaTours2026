/**
 * 🚨 Servicio de Gestión y Notificación de Alertas Administrativas (admin_alerts)
 * ==============================================================================
 * Reemplaza el canal de Centro de Operaciones por infraestructura 100% propia:
 * - Persistencia estructurada en Firestore (`admin_alerts`)
 * - Envío transaccional de alertas críticas/operativas por correo electrónico vía SMTP / Gmail
 * - Historial y gestión de estado (leído / resuelto) para el Admin Dashboard
 */

import nodemailer, { type Transporter } from 'nodemailer';
import type { Query } from 'firebase-admin/firestore';
import { getFirestoreDb } from './bookingService';

export interface AlertInput {
  source: string;        // Nombre del workflow o servicio (ej: "Pagos Automáticos a Proveedores")
  severity: 'info' | 'warning' | 'critical';
  title: string;         // Resumen corto (ej: "Fallo al enviar email de confirmación")
  message: string;       // Detalle completo del fallo o evento
  bookingId?: string;    // ID de la reserva asociada (si aplica)
  providerId?: string;   // ID del proveedor asociado (si aplica)
  metadata?: Record<string, unknown>; // Datos técnicos adicionales
}

export interface AdminAlert extends AlertInput {
  id: string;
  read: boolean;           // Si el operador ya la marcó como vista
  resolved: boolean;       // Si el operador ya la marcó como resuelta
  createdAt: string;      // ISO timestamp
}

// Almacén en memoria seguro para desarrollo o contingencia ante desconexión de Firestore
const inMemoryAlerts: Map<string, AdminAlert> = new Map();

/**
 * Retorna el emoji correspondiente a la severidad de la alerta
 */
export function getSeverityEmoji(severity: 'info' | 'warning' | 'critical'): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'warning':
      return '🟡';
    case 'info':
    default:
      return '🔵';
  }
}

/**
 * Configura y devuelve el cliente transportador SMTP / Gmail de nodemailer
 */
export function getMailTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    if (host) {
      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
    }

    // Configuración directa si es cuenta de Gmail
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  }

  return null;
}

/**
 * Envía la notificación de alerta por correo electrónico a ADMIN_ALERT_EMAIL
 */
async function dispatchAlertEmail(alert: AdminAlert): Promise<void> {
  const recipient = process.env.ADMIN_ALERT_EMAIL;
  if (!recipient) {
    console.log(`ℹ️ [ALERTA EMAIL] ADMIN_ALERT_EMAIL no está configurada. La alerta #${alert.id} fue guardada en Firestore.`);
    return;
  }

  const transporter = getMailTransporter();
  const emoji = getSeverityEmoji(alert.severity);
  const subject = `${emoji} [ALERTA ${alert.severity.toUpperCase()}] ${alert.title}`;

  const formattedDate = new Date(alert.createdAt).toLocaleString('es-CR', {
    timeZone: 'America/Costa_Rica',
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  const metadataHtml = alert.metadata && Object.keys(alert.metadata).length > 0
    ? `
      <div style="margin-top: 16px; padding: 12px; background-color: #0f172a; border-radius: 8px; font-family: monospace; font-size: 12px; color: #cbd5e1;">
        <strong>Metadatos Técnicos:</strong>
        <pre style="margin-top: 8px; white-space: pre-wrap;">${JSON.stringify(alert.metadata, null, 2)}</pre>
      </div>
    `
    : '';

  const bookingHtml = alert.bookingId
    ? `<p style="margin: 4px 0;"><strong>Reserva Asociada:</strong> <span style="font-family: monospace; color: #0d9488;">#${alert.bookingId}</span></p>`
    : '';

  const providerHtml = alert.providerId
    ? `<p style="margin: 4px 0;"><strong>Proveedor:</strong> <span style="font-family: monospace; color: #059669;">${alert.providerId}</span></p>`
    : '';

  const severityColor = alert.severity === 'critical' ? '#dc2626' : alert.severity === 'warning' ? '#d97706' : '#2563eb';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; margin: 0; padding: 24px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
          .header { background-color: #041711; color: #ffffff; padding: 20px; text-align: left; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #ffffff; background-color: ${severityColor}; }
          .body { padding: 24px; }
          .message-box { background-color: #f8fafc; border-left: 4px solid ${severityColor}; padding: 16px; border-radius: 4px; margin: 16px 0; font-size: 14px; line-height: 1.6; }
          .footer { background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="badge">${alert.severity.toUpperCase()}</span>
            <h2 style="margin: 12px 0 4px 0; font-size: 18px; color: #ffffff;">${alert.title}</h2>
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">Origen: ${alert.source} • ${formattedDate} (Costa Rica)</p>
          </div>
          <div class="body">
            <div class="message-box">
              <strong style="display: block; margin-bottom: 6px; color: #0f172a;">Detalle de la Alerta:</strong>
              ${alert.message.replace(/\n/g, '<br/>')}
            </div>
            ${bookingHtml}
            ${providerHtml}
            ${metadataHtml}
            <div style="margin-top: 24px; text-align: center;">
              <a href="${process.env.APP_URL || 'https://costaricatours.com'}" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: bold;">
                Abrir Panel de Administración
              </a>
            </div>
          </div>
          <div class="footer">
            Costa Rica Tours 2026 • Sistema Autónomo de Alertas Operativas
          </div>
        </div>
      </body>
    </html>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER || 'alertas@costaricatours.com',
        to: recipient,
        subject,
        html,
        text: `[ALERTA ${alert.severity.toUpperCase()}] ${alert.title}\nOrigen: ${alert.source}\nFecha: ${formattedDate}\n\n${alert.message}\n\nReserva: ${alert.bookingId || 'N/A'}\nProveedor: ${alert.providerId || 'N/A'}`
      });
      console.log(`📧 [ALERTA EMAIL ENVIADO] Alerta #${alert.id} notificada a ${recipient}`);
    } catch (err) {
      console.error(`❌ [ALERTA EMAIL ERROR] No se pudo enviar el correo de alerta a ${recipient}:`, err);
    }
  } else {
    // Si no hay SMTP configurado, dejamos un log informativo sin romper el flujo
    console.log(`✉️ [ALERTA EMAIL SIMULADO] (Configura SMTP_USER, SMTP_PASS y ADMIN_ALERT_EMAIL para entrega real por correo)`);
    console.log(`   Asunto: ${subject}`);
    console.log(`   Destinatario: ${recipient}`);
  }
}

/**
 * Crea una nueva alerta en Firestore (admin_alerts) y dispara la notificación por correo
 */
export async function createAlert(alert: AlertInput): Promise<{ alertId: string; alert: AdminAlert }> {
  const alertId = `alt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = new Date().toISOString();

  const newAlert: AdminAlert = {
    id: alertId,
    source: String(alert.source || 'Sistema Desconocido'),
    severity: (alert.severity === 'critical' || alert.severity === 'warning') ? alert.severity : 'info',
    title: String(alert.title || 'Alerta Operativa'),
    message: String(alert.message || ''),
    ...(alert.bookingId ? { bookingId: String(alert.bookingId) } : {}),
    ...(alert.providerId ? { providerId: String(alert.providerId) } : {}),
    ...(alert.metadata && typeof alert.metadata === 'object' ? { metadata: alert.metadata } : {}),
    read: false,
    resolved: false,
    createdAt
  };

  // Guardar en memoria para acceso rápido
  inMemoryAlerts.set(alertId, newAlert);

  // Guardar en Firestore
  try {
    const db = getFirestoreDb();
    if (db) {
      const docRef = db.collection('admin_alerts').doc(alertId);
      await docRef.set({
        source: newAlert.source,
        severity: newAlert.severity,
        title: newAlert.title,
        message: newAlert.message,
        ...(newAlert.bookingId ? { bookingId: newAlert.bookingId } : {}),
        ...(newAlert.providerId ? { providerId: newAlert.providerId } : {}),
        ...(newAlert.metadata ? { metadata: newAlert.metadata } : {}),
        read: false,
        resolved: false,
        createdAt
      });
      console.log(`💾 [ALERTA FIRESTORE] Alerta #${alertId} guardada exitosamente en Firestore (admin_alerts).`);
    }
  } catch (dbError) {
    console.error(`⚠️ [ALERTA FIRESTORE ERROR] Fallo al guardar alerta en Firestore:`, dbError);
  }

  // Notificar por correo electrónico (no bloquea ni falla si el email falla)
  dispatchAlertEmail(newAlert).catch((err) => {
    console.error('❌ [ALERTA EMAIL ERROR ASYNC]:', err);
  });

  return { alertId, alert: newAlert };
}

/**
 * Obtiene todas las alertas desde Firestore con filtros opcionales (ordenadas por createdAt desc, máx 200)
 */
export async function getAlerts(filters?: { resolved?: boolean; severity?: string }): Promise<AdminAlert[]> {
  try {
    const db = getFirestoreDb();
    if (db) {
      let query: Query = db.collection('admin_alerts').orderBy('createdAt', 'desc').limit(200);

      if (filters?.resolved !== undefined) {
        query = query.where('resolved', '==', filters.resolved);
      }

      if (filters?.severity) {
        query = query.where('severity', '==', filters.severity);
      }

      const snapshot = await query.get();
      const firestoreAlerts: AdminAlert[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        firestoreAlerts.push({
          id: doc.id,
          source: data.source || 'Motor nativo',
          severity: data.severity || 'info',
          title: data.title || 'Alerta',
          message: data.message || '',
          bookingId: data.bookingId,
          providerId: data.providerId,
          metadata: data.metadata,
          read: Boolean(data.read),
          resolved: Boolean(data.resolved),
          createdAt: data.createdAt || new Date().toISOString()
        });
      });

      if (firestoreAlerts.length > 0) {
        // Actualizar caché en memoria
        firestoreAlerts.forEach(a => inMemoryAlerts.set(a.id, a));
        return firestoreAlerts;
      }
    }
  } catch (err) {
    console.warn('⚠️ Fallo al leer admin_alerts desde Firestore. Retornando caché local:', err);
  }

  // Retornar caché en memoria filtrado
  let list = Array.from(inMemoryAlerts.values());

  if (filters?.resolved !== undefined) {
    list = list.filter(a => a.resolved === filters.resolved);
  }

  if (filters?.severity) {
    list = list.filter(a => a.severity === filters.severity);
  }

  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 200);
}

/**
 * Actualiza el estado de lectura o resolución de una alerta en Firestore
 */
export async function updateAlert(
  id: string,
  updates: { read?: boolean; resolved?: boolean }
): Promise<{ success: boolean; alert?: AdminAlert; error?: string }> {
  try {
    const db = getFirestoreDb();
    const updatePayload: Record<string, any> = {};

    if (updates.read !== undefined) updatePayload.read = Boolean(updates.read);
    if (updates.resolved !== undefined) updatePayload.resolved = Boolean(updates.resolved);

    if (Object.keys(updatePayload).length === 0) {
      return { success: false, error: 'No se enviaron campos válidos para actualizar (read o resolved).' };
    }

    if (db) {
      const docRef = db.collection('admin_alerts').doc(id);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        await docRef.update(updatePayload);
        const updatedData = (await docRef.get()).data()!;
        const updatedAlert: AdminAlert = {
          id,
          source: updatedData.source,
          severity: updatedData.severity,
          title: updatedData.title,
          message: updatedData.message,
          bookingId: updatedData.bookingId,
          providerId: updatedData.providerId,
          metadata: updatedData.metadata,
          read: Boolean(updatedData.read),
          resolved: Boolean(updatedData.resolved),
          createdAt: updatedData.createdAt
        };
        inMemoryAlerts.set(id, updatedAlert);
        return { success: true, alert: updatedAlert };
      }
    }

    // Actualizar en memoria si no está en Firestore o Firestore falló
    const cached = inMemoryAlerts.get(id);
    if (cached) {
      if (updates.read !== undefined) cached.read = Boolean(updates.read);
      if (updates.resolved !== undefined) cached.resolved = Boolean(updates.resolved);
      inMemoryAlerts.set(id, cached);
      return { success: true, alert: cached };
    }

    return { success: false, error: `Alerta #${id} no encontrada.` };
  } catch (err: any) {
    console.error(`Error actualizando alerta #${id}:`, err);
    return { success: false, error: err.message };
  }
}
