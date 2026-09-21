/**
 * ⚡ API MANAGER - Costa Rica Tours
 * Gestor centralizado para comunicaciones con APIs propias y servicios autorizados.
 * 
 * ESPECIFICACIONES DE ARQUITECTURA:
 * 1. Configuración Centralizada: URLs base, endpoints, secretos, timeouts y cabeceras por defecto.
 * 2. Cliente Fetch Unificado: Reintentos exponenciales (backoff), control de timeout por AbortController.
 * 3. Soporte para Firmas Criptográficas HMAC (SHA-256): Autenticación robusta de payloads salientes.
 * 4. Estructura de Respuesta Estandarizada: Respuestas normalizadas { exito, datos, error, timestamp, metadatos }.
 * 5. Cola de Contingencia Offline: Reintento automático en reconexión vía localStorage.
 * 6. Automatización: wrappers tipados y estructurados para operaciones del flujo nativo.
 */

// ============================================================================
// 1. CONFIGURACIÓN CENTRALIZADA
// ============================================================================

const getEnvironment = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.MODE) {
    return import.meta.env.MODE;
  }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  return 'development';
};

export const ENV = getEnvironment();

export const API_CONFIG = {
  http: { timeoutMs: 10000, maxRetries: 3, backoffMs: 350 },

  // Pasarelas de pago y servicios auxiliares
  pagos: {
    stripe: {
      publicKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STRIPE_PUBLIC_KEY) || ''
    },
    paypal: {
      clientId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PAYPAL_CLIENT_ID) || ''
    }
  }
};



// ============================================================================
// 2. UTILIDADES DE SEGURIDAD Y FIRMA HMAC (SHA-256)
// ============================================================================

/**
 * Genera una firma criptográfica HMAC-SHA256 para verificar la integridad del payload.
 * Compatible con navegadores modernos y entornos Node.js 18+ mediante Web Crypto API.
 * 
 * @param {any} payload - Objeto o string del cuerpo a firmar
 * @param {string} secret - Llave secreta compartida
 * @param {string} timestamp - Marca de tiempo ISO o epoch
 * @returns {Promise<string|null>} Firma en formato hexadecimal
 */
export async function generateHMACSignature(payload, secret, timestamp) {
  if (!secret) return null;

  try {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const message = `${timestamp}.${payloadStr}`;

    const cryptoObj = (typeof window !== 'undefined' && window.crypto) 
      ? window.crypto 
      : (typeof globalThis !== 'undefined' && globalThis.crypto ? globalThis.crypto : null);

    if (!cryptoObj || !cryptoObj.subtle) {
      return null;
    }

    const enc = new TextEncoder();
    const keyData = enc.encode(secret);
    const messageData = enc.encode(message);

    const key = await cryptoObj.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['sign']
    );

    const signatureBuffer = await cryptoObj.subtle.sign('HMAC', key, messageData);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.warn('[API Manager] Error generando firma HMAC:', error);
    return null;
  }
}

/**
 * Valida si una firma HMAC recibida coincide con la esperada
 * @param {any} payload 
 * @param {string} signature 
 * @param {string} secret 
 * @param {string} timestamp 
 * @returns {Promise<boolean>}
 */
export async function verifyHMACSignature(payload, signature, secret, timestamp) {
  if (!signature || !secret) return false;
  const expected = await generateHMACSignature(payload, secret, timestamp);
  return expected === signature;
}

// ============================================================================
// 3. ESTRUCTURA DE RESPUESTA ESTANDARIZADA
// ============================================================================

/**
 * Crea un objeto de respuesta exitosa normalizado
 * @param {any} datos 
 * @param {object} [metadatos] 
 */
export function createSuccessResponse(datos, metadatos = {}) {
  return {
    exito: true,
    success: true, // Alias en inglés para compatibilidad
    datos,
    data: datos,   // Alias en inglés para compatibilidad
    error: null,
    timestamp: new Date().toISOString(),
    metadatos
  };
}

/**
 * Crea un objeto de respuesta de error normalizado
 * @param {string} codigo 
 * @param {string} mensaje 
 * @param {number|null} [estadoHttp] 
 * @param {any} [detalles] 
 * @param {object} [metadatos] 
 */
export function createErrorResponse(codigo, mensaje, estadoHttp = null, detalles = null, metadatos = {}) {
  return {
    exito: false,
    success: false,
    datos: null,
    data: null,
    error: {
      codigo: codigo || 'UNKNOWN_ERROR',
      mensaje: mensaje || 'Error desconocido en la comunicación',
      estadoHttp,
      detalles
    },
    timestamp: new Date().toISOString(),
    metadatos
  };
}

// ============================================================================
// 4. CLIENTE HTTP UNIFICADO CON REINTENTOS Y FIRMAS
// ============================================================================

export const api = {
  /**
   * Ejecuta una petición HTTP fetch con reintentos exponenciales y control de timeout
   * @param {string} url 
   * @param {RequestInit} [options] 
   * @param {number} [retries] 
   * @param {number} [backoff] 
   * @param {number} [attempt] 
   * @returns {Promise<Response>}
   */
  async fetchWithRetry(url, options = {}, retries = API_CONFIG.http.maxRetries, backoff = API_CONFIG.http.backoffMs, attempt = 1) {
    const controller = new AbortController();
    const timeout = options.timeout || API_CONFIG.http.timeoutMs;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const mergedOptions = {
      ...options,
      signal: options.signal || controller.signal
    };

    try {
      const response = await fetch(url, mergedOptions);
      clearTimeout(timeoutId);

      // Si el servidor responde 5xx o 429 (Rate Limit), se considera error reintentable
      if (!response.ok && (response.status >= 500 || response.status === 429) && retries > 0) {
        console.warn(`[API Manager] HTTP ${response.status} en ${url}. Reintentando (${retries} restantes)...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        return this.fetchWithRetry(url, options, retries - 1, backoff * 2, attempt + 1);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      const isAbort = error.name === 'AbortError';
      const errorMessage = isAbort ? `Tiempo de espera agotado tras ${timeout}ms` : error.message;

      if (retries > 0) {
        console.warn(`[API Manager] Fallo de red: "${errorMessage}". Reintento ${attempt} en ${backoff}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        return this.fetchWithRetry(url, options, retries - 1, backoff * 2, attempt + 1);
      }

      throw new Error(errorMessage);
    }
  },

  /**
   * Ejecuta una petición estructurada firmando opcionalmente con HMAC y normalizando la respuesta
   * @param {string} endpoint - Ruta relativa o URL absoluta
   * @param {string} [method] - 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'
   * @param {any} [data] - Cuerpo a enviar
   * @param {object} [customHeaders] - Cabeceras adicionales
   * @param {object} [options] - Opciones avanzadas (ej. signWithHMAC, timeout, retries)
   */
  async request(endpoint, method = 'GET', data = null, customHeaders = {}, options = {}) {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    // 1. Construir URL destino
    let url;
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      url = endpoint;
    } else {
      const cleanBase = (API_CONFIG.http.baseUrl || '').replace(/\/+$/, '');
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      url = `${cleanBase}${cleanEndpoint}`;
    }

    // 2. Preparar cabeceras base
    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': API_CONFIG.http.webhookSecret,
      'X-Timestamp': timestamp,
      'X-Client-Version': 'CostaRicaTours-API/2.0',
      ...customHeaders
    };

        // 3. Soporte de Firma Criptográfica HMAC (SHA-256)
    const shouldSign = options.signWithHMAC !== false && (method === 'POST' || method === 'PUT' || method === 'PATCH');
    if (shouldSign && data) {
      const hmacSecret = options.hmacSecret || API_CONFIG.http.hmacSecret;
      const signature = await generateHMACSignature(data, hmacSecret, timestamp);
      if (signature) {
        headers['X-HMAC-Signature'] = signature;
        headers['X-Signature-SHA256'] = signature;
      }
    }

    // 4. Configurar opciones de Fetch
    const fetchOptions = {
      method,
      headers,
      timeout: options.timeout || API_CONFIG.http.timeoutMs,
      ...(data !== null && data !== undefined ? { body: JSON.stringify(data) } : {})
    };

    try {
      if (ENV === 'development') {
        console.log(`[API ${method}] 🚀 Enviando a ${url}`, data);
      }

      const response = await this.fetchWithRetry(
        url,
        fetchOptions,
        options.retries ?? API_CONFIG.http.maxRetries,
        options.backoff ?? API_CONFIG.http.backoffMs
      );

      const durationMs = Date.now() - startTime;
      const responseText = await response.text();

      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch {
        parsedData = { rawText: responseText };
      }

      if (!response.ok) {
        const errorMsg = parsedData?.message || parsedData?.error || `Error HTTP ${response.status}: ${response.statusText}`;
        return createErrorResponse('HTTP_ERROR', errorMsg, response.status, parsedData, {
          url,
          duracionMs: durationMs
        });
      }

      return createSuccessResponse(parsedData, {
        url,
        estadoHttp: response.status,
        duracionMs: durationMs
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error(`[API ${method}] ❌ Error en ${url}:`, error);

      // Guardar en cola de contingencia offline si es una mutación (POST/PUT/PATCH)
      if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && options.skipQueue !== true) {
        this.saveToQueue({
          url,
          method,
          data,
          headers,
          timestamp: Date.now()
        });
      }

      return createErrorResponse('FETCH_ERROR', error.message, null, error, {
        url,
        duracionMs: durationMs
      });
    }
  },

  // Atajos para métodos HTTP estándar
  get(endpoint, headers = {}, options = {}) {
    return this.request(endpoint, 'GET', null, headers, options);
  },

  post(endpoint, data = null, headers = {}, options = {}) {
    return this.request(endpoint, 'POST', data, headers, options);
  },

  put(endpoint, data = null, headers = {}, options = {}) {
    return this.request(endpoint, 'PUT', data, headers, options);
  },

  patch(endpoint, data = null, headers = {}, options = {}) {
    return this.request(endpoint, 'PATCH', data, headers, options);
  },

  delete(endpoint, headers = {}, options = {}) {
    return this.request(endpoint, 'DELETE', null, headers, options);
  },

  // ==========================================================================
  // CONFIGURACIÓN DINÁMICA DE ENTORNO (DEV / PROD)
  // ==========================================================================
  // ==========================================================================
  // 5. GESTIÓN DE COLA DE CONTINGENCIA OFFLINE
  // ==========================================================================

  saveToQueue(requestRecord) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const rawQueue = localStorage.getItem('crt_webhook_queue');
      const queue = rawQueue ? JSON.parse(rawQueue) : [];
      queue.push(requestRecord);

      // Limitar tamaño máximo de cola a 50 elementos para cuidar almacenamiento
      if (queue.length > 50) queue.shift();

      localStorage.setItem('crt_webhook_queue', JSON.stringify(queue));
      console.log(`[API Manager] 📥 Solicitud guardada en cola offline (${queue.length} pendientes).`);
    } catch (e) {
      console.warn('[API Manager] Error escribiendo en cola local:', e);
    }
  },

  async processQueue() {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const rawQueue = localStorage.getItem('crt_webhook_queue');
    if (!rawQueue) return;

    let queue = [];
    try {
      queue = JSON.parse(rawQueue);
    } catch {
      localStorage.removeItem('crt_webhook_queue');
      return;
    }

    if (queue.length === 0) return;

    console.log(`[API Manager] 🔄 Procesando ${queue.length} webhooks acumulados en la cola...`);
    localStorage.removeItem('crt_webhook_queue');

    const remainingQueue = [];

    for (const item of queue) {
      try {
        const res = await this.request(item.url, item.method, item.data, item.headers, { skipQueue: true });
        if (!res.exito) {
          remainingQueue.push(item);
        }
      } catch {
        remainingQueue.push(item);
      }
    }

    if (remainingQueue.length > 0) {
      localStorage.setItem('crt_webhook_queue', JSON.stringify(remainingQueue));
      console.warn(`[API Manager] ⚠️ Quedaron ${remainingQueue.length} webhooks pendientes en la cola.`);
    } else {
      console.log('[API Manager] ✅ Todos los webhooks de la cola offline fueron despachados exitosamente.');
    }
  }
};

