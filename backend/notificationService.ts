import { GoogleGenAI } from '@google/genai';
import { createAlert, getMailTransporter } from './alertService';

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  path?: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: EmailAttachment[];
}

export interface TelegramMessageOptions {
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  chatId?: string;
  silent?: boolean;
}

/**
 * Sistema Real de Notificaciones y Alertas Operativas (Reemplazo activo de Telegram):
 * - Persiste en Firestore (`admin_alerts`)
 * - Envía alerta instantánea por correo electrónico a ADMIN_ALERT_EMAIL
 * - Analiza y enriquece alertas críticas usando Gemini AI cuando está disponible
 */
export async function sendTelegramMessage(
  text: string,
  options: TelegramMessageOptions = {}
): Promise<{ success: boolean; messageId?: number | string; error?: string }> {
  const ai = getAI();
  const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
  let aiSummary = '';

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analiza esta alerta operativa del sistema de reservas de Costa Rica Tours y genera una recomendación ejecutiva breve en español (máximo 2 oraciones):\n${cleanText}`
      });
      if (response.text) {
        aiSummary = response.text.trim();
      }
    } catch (e) {
      // fallback to clean text
    }
  }

  // Determinar severidad según contenido
  const isCritical = /🚨|CRÍTICA|CRITICAL|Fallo|Error|Falla|Declined|Excepción|Emergency/i.test(text);
  const isWarning = /⚠️|Warning|Advertencia|Atención|Supervisión|Pendiente/i.test(text);
  const severity: 'info' | 'warning' | 'critical' = isCritical ? 'critical' : isWarning ? 'warning' : 'info';

  // Extraer un título representativo de la primera línea
  const firstLine = cleanText.split('\n')[0]?.replace(/^[*#=\-_>\s]+/, '').trim() || 'Notificación Operativa';
  const title = firstLine.slice(0, 100);

  try {
    const { alertId } = await createAlert({
      source: 'Notificaciones Operativas',
      severity,
      title,
      message: text,
      metadata: {
        rawText: cleanText,
        aiInsight: aiSummary || undefined,
        chatId: options.chatId,
        silent: options.silent
      }
    });

    console.log(`📡 [ALERTA REAL FIRESTORE + EMAIL] Alerta #${alertId} (${severity.toUpperCase()}) registrada: "${title}"`);
    return { success: true, messageId: alertId };
  } catch (err: any) {
    console.error(`❌ [ERROR AL REGISTRAR ALERTA EN FIRESTORE/EMAIL]:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Escala una alerta operativa crítica o fallo directamente a Firestore (admin_alerts)
 * y despacha notificación por correo al Administrador de Costa Rica Tours.
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
  
  let msg = `🚨 [ESCALACIÓN OPERATIVA - COSTA RICA TOURS]\n`;
  msg += `Tipo: ${params.title}\n`;
  msg += `Motivo: ${params.reason}\n`;
  msg += `Fecha/Hora: ${timeStr} (Costa Rica)\n`;
  
  if (params.bookingId) msg += `ID Reserva: #${params.bookingId}\n`;
  if (params.customerName) msg += `Cliente: ${params.customerName}\n`;
  if (params.customerEmail) msg += `Email: ${params.customerEmail}\n`;
  if (params.customerPhone) msg += `Teléfono/WA: ${params.customerPhone}\n`;
  if (params.providerId) msg += `Proveedor: ${params.providerId}\n`;
  
  if (params.details && Object.keys(params.details).length > 0) {
    msg += `\nDetalles Técnicos:\n`;
    for (const [k, v] of Object.entries(params.details)) {
      msg += `• ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}\n`;
    }
  }

  msg += `\n⚠️ Por favor revisar en panel de operaciones o contactar manualmente.`;

  try {
    const { alertId } = await createAlert({
      source: 'Mesa de Operaciones / Escalación Crítica',
      severity: 'critical',
      title: params.title || 'Escalación Operativa Crítica',
      message: `${params.reason}\n\n${msg}`,
      bookingId: params.bookingId,
      providerId: params.providerId,
      metadata: {
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        customerPhone: params.customerPhone,
        ...(params.details || {})
      }
    });

    console.log(`🚨 [ESCALACIÓN CRÍTICA CONECTADA A FIRESTORE + EMAIL] Alerta #${alertId} despachada para: ${params.title}`);
    return { success: true };
  } catch (err: any) {
    console.error(`❌ [ERROR EN ESCALACIÓN OPERATIVA CRÍTICA]:`, err);
    return { success: false, error: err.message };
  }
}

// Aliases semánticos para uso en flujos modernos
export const sendAdministrativeAlert = sendTelegramEscalation;
export const sendOperationalNotification = sendTelegramMessage;

/**
 * Envía un correo electrónico transaccional.
 * Soporta Resend API, SendGrid API, transporte SMTP/Gmail directo vía nodemailer,
 * o fallback a logs estructurados en el servidor.
 */
export async function sendEmail(
  payload: EmailPayload
): Promise<{ success: boolean; id?: string; error?: string }> {
  const fromEmail = payload.from || process.env.EMAIL_FROM || process.env.SMTP_USER || 'Costa Rica Tours <reservas@costaricatours.es>';

  // 1. Enviar vía Resend API si está configurado
  if (process.env.RESEND_API_KEY) {
    try {
      const resendAttachments = payload.attachments?.map(att => ({
        filename: att.filename,
        content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content
      }));

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
          text: payload.text,
          attachments: resendAttachments && resendAttachments.length > 0 ? resendAttachments : undefined
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
      const sendGridAttachments = payload.attachments?.map(att => ({
        content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
        filename: att.filename,
        type: att.contentType || 'application/pdf',
        disposition: 'attachment'
      }));

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
          content: [{ type: 'text/html', value: payload.html }],
          attachments: sendGridAttachments && sendGridAttachments.length > 0 ? sendGridAttachments : undefined
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

  // 3. Enviar vía SMTP / Nodemailer si está configurado (SMTP_USER y SMTP_PASS)
  const transporter = getMailTransporter();
  if (transporter) {
    try {
      const nodemailerAttachments = payload.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType || 'application/pdf'
      }));

      const info = await transporter.sendMail({
        from: fromEmail,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text || payload.html.replace(/<[^>]*>?/gm, ''),
        attachments: nodemailerAttachments && nodemailerAttachments.length > 0 ? nodemailerAttachments : undefined
      });
      console.log(`📧 [EMAIL SMTP ENVIADO] Despachado exitosamente a ${payload.to} (ID: ${info.messageId}) con ${payload.attachments?.length || 0} adjuntos`);
      return { success: true, id: info.messageId };
    } catch (smtpErr: any) {
      console.error(`❌ [EMAIL SMTP ERROR] Falló envío a ${payload.to}:`, smtpErr);
      return { success: false, error: smtpErr.message };
    }
  }

  // 4. Fallback: Log estructurado de despacho en consola
  console.log(`✉️ [EMAIL TRANSACCIONAL REGISTRADO] (Para entrega física configure SMTP_USER/SMTP_PASS o RESEND_API_KEY/SENDGRID_API_KEY)`);
  console.log(`   Para: ${payload.to}`);
  console.log(`   Asunto: ${payload.subject}`);
  console.log(`   Remitente: ${fromEmail}`);
  if (payload.attachments && payload.attachments.length > 0) {
    payload.attachments.forEach(att => {
      const size = Buffer.isBuffer(att.content) ? att.content.length : att.content.length;
      console.log(`   📎 Adjunto: ${att.filename} (${size} bytes, tipo: ${att.contentType || 'application/pdf'})`);
    });
  }
  return { success: true, id: `sim-mail-${Date.now()}` };
}
