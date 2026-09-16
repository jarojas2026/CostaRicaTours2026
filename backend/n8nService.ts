import crypto from 'crypto';
/**
 * ⚡ Servicio de Integración con n8n para Costa Rica Tours
 * Gestiona triggers salientes, verificación de webhooks entrantes y monitoreo de conexión.
 * Configuración estricta de seguridad: No se admiten fallbacks hardcodeados en producción.
 */

export interface N8NConfig {
  baseUrl: string;
  webhookSecret: string;
  apiKey: string;
  bookingWebhookUrl: string;
  chatWebhookUrl: string;
  providerNotifyWebhookUrl: string;
  antiFraudWebhookUrl: string;
  telegramOpsWebhookUrl: string;
  calendarSyncWebhookUrl: string;
  multiChannelWebhookUrl: string;
  sinpeWebhookUrl: string;
}

export const getN8NConfig = (): N8NConfig => {
  const baseUrl = (
    process.env.N8N_BASE_URL ||
    process.env.VITE_N8N_BASE_URL ||
    process.env.VITE_N8N_WEBHOOK_URL ||
    'https://costaricatours2026.app.n8n.cloud'
  ).replace(/\/+$/, '');

  const webhookSecret =
    process.env.N8N_WEBHOOK_SECRET ||
    process.env.WEBHOOK_SECRET ||
    process.env.VITE_N8N_WEBHOOK_SECRET ||
    '';

  // Si N8N está habilitado pero no hay secreto configurado, alertar explícitamente
  if (process.env.N8N_ENABLED === 'true' && !webhookSecret) {
    console.error('❌ [SEGURIDAD] N8N_ENABLED=true pero N8N_WEBHOOK_SECRET no está definida. Las solicitudes a webhooks no podrán firmarse criptográficamente.');
  }

  return {
    baseUrl,
    webhookSecret,
    apiKey: process.env.N8N_API_KEY || process.env.VITE_N8N_API_KEY || '',
    bookingWebhookUrl: process.env.N8N_BOOKING_WEBHOOK_URL || `${baseUrl}/webhook/reserva-confirmada`,
    chatWebhookUrl: process.env.N8N_CHAT_WEBHOOK_URL || `${baseUrl}/webhook/chat-consulta`,
    providerNotifyWebhookUrl: process.env.N8N_PROVIDER_NOTIFY_WEBHOOK_URL || `${baseUrl}/webhook/notificar-proveedor`,
    antiFraudWebhookUrl: process.env.N8N_ANTIFRAUD_WEBHOOK_URL || `${baseUrl}/webhook/evaluar-antifraude`,
    telegramOpsWebhookUrl: process.env.N8N_TELEGRAM_OPS_WEBHOOK_URL || `${baseUrl}/webhook/telegram-ops-action`,
    calendarSyncWebhookUrl: process.env.N8N_CALENDAR_SYNC_WEBHOOK_URL || `${baseUrl}/webhook/sync-calendar`,
    multiChannelWebhookUrl: process.env.N8N_MULTICHANNEL_WEBHOOK_URL || `${baseUrl}/webhook/reserva-multicanal`,
    sinpeWebhookUrl: process.env.N8N_SINPE_WEBHOOK_URL || `${baseUrl}/webhook/cr-tours-sinpe-verify`,
  };
};

/**
 * Despacha un trigger saliente hacia n8n con reintentos y firma criptográfica
 */
export async function dispatchToN8N(
  endpointOrFullUrl: string,
  payload: any,
  retries = 2,
  backoffMs = 400
): Promise<{ success: boolean; status?: number; data?: any; error?: string }> {
  const config = getN8NConfig();

  let targetUrl = endpointOrFullUrl;
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    const cleanEndpoint = targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`;
    targetUrl = `${config.baseUrl}${cleanEndpoint}`;
  }

  // Prevenir llamadas a URLs de plantilla de ejemplo si no están configuradas
  if (targetUrl.includes('tu-instancia-n8n') || targetUrl.includes('tu-n8n.com')) {
    return {
      success: false,
      error: 'URL de n8n no configurada en variables de entorno (simulación activa)'
    };
  }

  const payloadString = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'CostaRicaTours-Backend/1.0'
  };

  if (config.webhookSecret) {
    const signature = crypto
      .createHmac('sha256', config.webhookSecret)
      .update(payloadString)
      .digest('hex');
    headers['X-Webhook-Signature'] = signature;
    headers['X-Webhook-Secret'] = config.webhookSecret;
  }

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let responseData: any = null;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { text: responseText };
      }

      if (response.ok) {
        return {
          success: true,
          status: response.status,
          data: responseData
        };
      }

      if (attempt <= retries && response.status >= 500) {
        await new Promise((res) => setTimeout(res, backoffMs * attempt));
        continue;
      }

      return {
        success: false,
        status: response.status,
        data: responseData,
        error: `n8n respondió con error HTTP ${response.status}`
      };
    } catch (err: any) {
      if (attempt <= retries) {
        await new Promise((res) => setTimeout(res, backoffMs * attempt));
        continue;
      }
      return {
        success: false,
        error: err.name === 'AbortError' ? 'Tiempo de espera agotado al contactar n8n' : err.message
      };
    }
  }

  return { success: false, error: 'Error desconocido al contactar n8n' };
}

/**
 * Valida si un webhook entrante desde n8n contiene las credenciales autorizadas
 * Rechaza sin ambigüedad si el secreto no coincide o no está configurado.
 */
/**
 * Valida si un webhook entrante desde n8n contiene las credenciales autorizadas
 * Rechaza sin ambigüedad si el secreto no coincide o no está configurado (Fail-closed en producción).
 * Usa crypto.timingSafeEqual para prevenir timing attacks.
 */
export function verifyN8NRequest(headers: Record<string, string | string[] | undefined>): boolean {
  const config = getN8NConfig();
  const secretHeader = headers['x-webhook-secret'] || headers['X-Webhook-Secret'];
  const authHeader = headers['authorization'] || headers['Authorization'];

  const isProduction = process.env.NODE_ENV === 'production';

  // Si no hay secretos configurados
  if (!config.webhookSecret && !config.apiKey) {
    if (isProduction) {
      console.warn('⚠️ [SEGURIDAD] Webhook entrante rechazado: Secreto/API Key de n8n no configurada en producción (fail-closed).');
      return false;
    }
    console.warn('⚠️ [SEGURIDAD ADVERTENCIA] Webhook entrante permitido sin credenciales en entorno de desarrollo.');
    return true;
  }

  try {
    // Validar por x-webhook-secret si está presente
    if (secretHeader && typeof secretHeader === 'string' && config.webhookSecret) {
      const expectedBuf = Buffer.from(config.webhookSecret);
      const providedBuf = Buffer.from(secretHeader);
      if (expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf)) {
        return true;
      }
    }

    // Validar por Bearer Token (Authorization) si está presente
    if (authHeader && typeof authHeader === 'string' && config.apiKey) {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const expectedBuf = Buffer.from(config.apiKey);
      const providedBuf = Buffer.from(token);
      if (expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf)) {
        return true;
      }
    }
  } catch (err) {
    console.error('Error validando timingSafeEqual en verifyN8NRequest:', err);
    return false;
  }

  return false;
}
