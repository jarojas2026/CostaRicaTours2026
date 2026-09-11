/**
 * ⚡ Servicio de Integración con n8n para Costa Rica Tours
 * Gestiona triggers salientes, verificación de webhooks entrantes y monitoreo de conexión.
 */

export interface N8NConfig {
  baseUrl: string;
  webhookSecret: string;
  apiKey: string;
  bookingWebhookUrl: string;
  chatWebhookUrl: string;
  providerNotifyWebhookUrl: string;
  antiFraudWebhookUrl: string;
}

export const getN8NConfig = (): N8NConfig => {
  const baseUrl = (
    process.env.N8N_BASE_URL ||
    process.env.VITE_N8N_BASE_URL ||
    process.env.VITE_N8N_WEBHOOK_URL ||
    'https://tu-instancia-n8n.webhook'
  ).replace(/\/+$/, '');

  return {
    baseUrl,
    webhookSecret: process.env.N8N_WEBHOOK_SECRET || process.env.VITE_N8N_WEBHOOK_SECRET || 'dev-secret-key-123',
    apiKey: process.env.N8N_API_KEY || process.env.VITE_N8N_API_KEY || '',
    bookingWebhookUrl: process.env.N8N_BOOKING_WEBHOOK_URL || `${baseUrl}/webhook/reserva-confirmada`,
    chatWebhookUrl: process.env.N8N_CHAT_WEBHOOK_URL || `${baseUrl}/webhook/chat-consulta`,
    providerNotifyWebhookUrl: process.env.N8N_PROVIDER_NOTIFY_WEBHOOK_URL || `${baseUrl}/webhook/notificar-proveedor`,
    antiFraudWebhookUrl: process.env.N8N_ANTIFRAUD_WEBHOOK_URL || `${baseUrl}/webhook/evaluar-antifraude`,
  };
};

/**
 * Despacha un trigger saliente hacia n8n con reintentos y autenticación
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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Secret': config.webhookSecret,
    'User-Agent': 'CostaRicaTours-Backend/1.0'
  };

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
        body: JSON.stringify(payload),
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
 */
export function verifyN8NRequest(headers: Record<string, string | string[] | undefined>): boolean {
  const config = getN8NConfig();
  const secretHeader = headers['x-webhook-secret'] || headers['X-Webhook-Secret'];
  const authHeader = headers['authorization'] || headers['Authorization'];

  // Si no hay secretos configurados, permitir en modo desarrollo
  if (!config.webhookSecret && !config.apiKey) {
    return true;
  }

  if (secretHeader && secretHeader === config.webhookSecret) {
    return true;
  }

  if (authHeader && typeof authHeader === 'string' && config.apiKey) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token === config.apiKey) {
      return true;
    }
  }

  return false;
}
