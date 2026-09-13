/**
 * 📢 Servicio Unificado de Notificaciones (Telegram & Email) para Costa Rica Tours
 * =========================================================================
 * Maneja el envío real de correos electrónicos a clientes/proveedores y
 * el despacho de alertas y escalaciones operativas a Telegram.
 */

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
}

/**
 * Envía un mensaje o alerta a Telegram a través del Bot API oficial.
 * Si las credenciales no están configuradas, registra el mensaje en consola de forma estructurada.
 */
export async function sendTelegramMessage(
  text: string,
  options: TelegramMessageOptions = {}
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options.chatId || process.env.TELEGRAM_OPS_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log(`📱 [TELEGRAM SIMULADO] (Configura TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID para envíos reales)\n${text}`);
    return { success: true, messageId: Math.floor(Math.random() * 100000) };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parseMode || 'HTML',
        disable_notification: options.silent || false
      })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      console.error('❌ Error de Telegram Bot API:', data);
      return { success: false, error: data.description || 'Error enviando mensaje a Telegram' };
    }

    return { success: true, messageId: data.result?.message_id };
  } catch (error: any) {
    console.error('❌ Excepción al contactar Telegram:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Escala una alerta operativa crítica o fallo a Telegram con formato estandarizado
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
  
  let msg = `🚨 <b>[ESCALACIÓN OPERATIVA - COSTA RICA TOURS]</b>\n`;
  msg += `<b>Tipo:</b> ${params.title}\n`;
  msg += `<b>Motivo:</b> ${params.reason}\n`;
  msg += `<b>Fecha/Hora:</b> ${timeStr} (Costa Rica)\n`;
  
  if (params.bookingId) msg += `<b>ID Reserva:</b> <code>${params.bookingId}</code>\n`;
  if (params.customerName) msg += `<b>Cliente:</b> ${params.customerName}\n`;
  if (params.customerEmail) msg += `<b>Email:</b> ${params.customerEmail}\n`;
  if (params.customerPhone) msg += `<b>Teléfono / WA:</b> ${params.customerPhone}\n`;
  if (params.providerId) msg += `<b>Proveedor:</b> <code>${params.providerId}</code>\n`;
  
  if (params.details && Object.keys(params.details).length > 0) {
    msg += `\n<b>Detalles Técnicos:</b>\n`;
    for (const [k, v] of Object.entries(params.details)) {
      msg += `• <i>${k}:</i> ${typeof v === 'object' ? JSON.stringify(v) : v}\n`;
    }
  }

  msg += `\n⚠️ <i>Por favor revisar en panel de operaciones o contactar manualmente.</i>`;

  return sendTelegramMessage(msg, { parseMode: 'HTML' });
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
