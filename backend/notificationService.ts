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

/**
 * Sistema Real de Notificaciones y Alertas Operativas (Reemplazo activo de Centro de Operaciones):
 * - Persiste en Firestore (`admin_alerts`)
 * - Envía alerta instantánea por correo electrónico a ADMIN_ALERT_EMAIL
 * - Analiza y enriquece alertas críticas usando Gemini AI cuando está disponible
 */
export async function sendOperationalNotification(
  text: string,
  options: { silent?: boolean; channel?: string } = {}
): Promise<{ success: boolean; messageId?: number | string; error?: string }> {
  const ai = getAI();
  const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
  let aiSummary = '';

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
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
export async function sendAdministrativeAlert(params: {
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

export interface WhatsAppMessagePayload {
  toPhone: string;
  customerName: string;
  message: string;
  bookingId?: string;
  pdfUrl?: string;
  confirmationUrl?: string;
}

/**
 * Despacha o formatea mensajes transaccionales de WhatsApp con enlaces enriquecidos y deep-links
 * para confirmación inmediata de reservas e itinerarios.
 */
export async function sendWhatsAppMessage(
  payload: WhatsAppMessagePayload
): Promise<{ success: boolean; url: string; directDispatched: boolean; id?: string }> {
  const cleanPhone = payload.toPhone.replace(/[^0-9]/g, '');
  const encodedMsg = encodeURIComponent(payload.message);
  const clickToChatUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;

  console.log(`📱 [WHATSAPP DISPATCH] Mensaje oficial preparado para: +${cleanPhone} (${payload.customerName})`);
  console.log(`   Enlace Directo: ${clickToChatUrl}`);

  // Soporte para Gateway HTTP genérico de WhatsApp (Evolution API, Z-API, n8n, UltraMsg, etc.)
  if (process.env.WHATSAPP_WEBHOOK_URL) {
    try {
      const resp = await fetch(process.env.WHATSAPP_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cleanPhone,
          phone: cleanPhone,
          message: payload.message,
          customerName: payload.customerName,
          bookingId: payload.bookingId,
          pdfUrl: payload.pdfUrl,
          confirmationUrl: payload.confirmationUrl
        })
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok) {
        console.log(`✅ [WHATSAPP WEBHOOK ENVIADO] Respuesta OK de gateway externo:`, data);
        return { success: true, url: clickToChatUrl, directDispatched: true, id: `wa-webhook-${Date.now()}` };
      }
    } catch (e: any) {
      console.warn(`⚠️ [WHATSAPP WEBHOOK ERROR] Fallback a link interactivo:`, e.message);
    }
  }

  // Soporte para Gateway de WhatsApp Cloud API (si está configurado)
  if (process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    try {
      const resp = await fetch(`https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: payload.message }
        })
      });
      const data = await resp.json();
      if (resp.ok) {
        console.log(`✅ [WHATSAPP CLOUD API ENVIADO] Mensaje ID: ${data?.messages?.[0]?.id}`);
        return { success: true, url: clickToChatUrl, directDispatched: true, id: data?.messages?.[0]?.id };
      }
    } catch (e: any) {
      console.warn(`⚠️ [WHATSAPP CLOUD API ERROR] Fallback a link interactivo:`, e.message);
    }
  }

  // Soporte para Twilio WhatsApp (si está configurado)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER) {
    try {
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const params = new URLSearchParams();
      params.append('From', `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`);
      params.append('To', `whatsapp:+${cleanPhone}`);
      params.append('Body', payload.message);

      const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      const data = await resp.json();
      if (resp.ok) {
        console.log(`✅ [TWILIO WHATSAPP ENVIADO] SID: ${data?.sid}`);
        return { success: true, url: clickToChatUrl, directDispatched: true, id: data?.sid };
      }
    } catch (e: any) {
      console.warn(`⚠️ [TWILIO WHATSAPP ERROR] Fallback a link interactivo:`, e.message);
    }
  }

  return {
    success: true,
    url: clickToChatUrl,
    directDispatched: false,
    id: `wa-link-${Date.now()}`
  };
}
