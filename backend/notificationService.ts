import { GoogleGenAI } from '@google/genai';
import { createAlert } from './alertService';

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface TelegramMessageOptions {
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  chatId?: string;
  silent?: boolean;
  // Campos opcionales para clasificar mejor la alerta real que se genera
  severity?: 'info' | 'warning' | 'critical';
  source?: string;
  bookingId?: string;
  providerId?: string;
}

/**
 * Reemplazo real de Telegram (sin costo, sin dependencia externa):
 * registra la alerta en Firestore (colección admin_alerts) y envía un
 * email al operador vía createAlert(). Antes, esta función solo hacía
 * console.log() y devolvía éxito sin avisar a nadie realmente — se
 * corrigió porque significaba que ningún fallo operativo llegaba al
 * dueño del negocio.
 */
export async function sendTelegramMessage(
  text: string,
  options: TelegramMessageOptions = {}
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const cleanText = text.replace(/<[^>]*>?/gm, ''); // limpiar HTML para el email/log

  try {
    await createAlert({
      source: options.source || 'Sistema de Automatización',
      severity: options.severity || 'warning',
      title: cleanText.slice(0, 120),
      message: cleanText,
      bookingId: options.bookingId,
      providerId: options.providerId,
    });
    console.log(`✅ [ALERTA REGISTRADA Y NOTIFICADA] ${cleanText.slice(0, 100)}...`);
    return { success: true, messageId: Math.floor(Math.random() * 100000) };
  } catch (error: any) {
    // Si incluso el registro de la alerta falla, esto SÍ debe quedar
    // visible en los logs del servidor como último recurso.
    console.error('🔴 FALLO CRÍTICO: no se pudo registrar ni notificar una alerta:', error.message, '| Contenido original:', cleanText);
    return { success: false, error: error.message };
  }
}

/**
 * Escala una alerta operativa crítica o fallo — ahora vía Firestore + email
 * real en vez de Telegram.
 */
export async function sendTelegramEscalation(params: {
  title: string;
  reason: string;
  bookingId?: string;
  providerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  details?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  const timeStr = new Date().toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' });

  let msg = `Tipo: ${params.title}\n`;
  msg += `Motivo: ${params.reason}\n`;
  msg += `Fecha/Hora: ${timeStr} (Costa Rica)\n`;

  if (params.bookingId) msg += `ID Reserva: ${params.bookingId}\n`;
  if (params.customerName) msg += `Cliente: ${params.customerName}\n`;
  if (params.customerEmail) msg += `Email: ${params.customerEmail}\n`;
  if (params.customerPhone) msg += `Teléfono / WA: ${params.customerPhone}\n`;
  if (params.providerId) msg += `Proveedor: ${params.providerId}\n`;

  if (params.details && Object.keys(params.details).length > 0) {
    msg += `\nDetalles Técnicos:\n`;
    for (const [k, v] of Object.entries(params.details)) {
      msg += `• ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}\n`;
    }
  }

  msg += `\nRevisar en el panel de Alertas o contactar manualmente.`;

  return sendTelegramMessage(msg, {
    severity: 'critical',
    source: params.title,
    bookingId: params.bookingId,
    providerId: params.providerId,
  });
}

/**
 * Envía un correo electrónico transaccional.
 * Soporta Resend API (si RESEND_API_KEY existe) o SendGrid API (si SENDGRID_API_KEY existe),
 * o fallback a logs estructurados en el servidor.
 */
export async function sendEmail(
  payload: EmailPayload
): Promise<{ success: boolean; id?: string; error?: string }> {
  const fromEmail = payload.from || process.env.EMAIL_FROM || 'Costa Rica Tours <reservas@costaricatours.es>';

  // 1. Enviar vía Resend API si está configurado
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text
        })
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.message || 'Error de Resend API' };
      }
      return { success: true, id: data.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // 2. Enviar vía SendGrid si está configurado
  if (process.env.SENDGRID_API_KEY) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: payload.to }] }],
          from: { email: fromEmail.includes('<') ? fromEmail.match(/<([^>]+)>/)?.[1] || fromEmail : fromEmail },
          subject: payload.subject,
          content: [{ type: 'text/html', value: payload.html }]
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Error SendGrid: ${errorText}` };
      }
      return { success: true, id: `sg-${Date.now()}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // 3. Fallback: Log estructurado de despacho en consola
  console.log(`✉️ [EMAIL TRANSACCIONAL] (Configura RESEND_API_KEY o SENDGRID_API_KEY para entrega SMTP/API)`);
  console.log(`   Para: ${payload.to}`);
  console.log(`   Asunto: ${payload.subject}`);
  console.log(`   Remitente: ${fromEmail}`);
  return { success: true, id: `sim-mail-${Date.now()}` };
}
