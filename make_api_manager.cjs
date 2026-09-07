const fs = require('fs');

const apiManagerCode = `
/**
 * API MANAGER - Costa Rica Tours
 * Gestor centralizado para comunicaciones con n8n y APIs externas
 */

// 1. SISTEMA DE CONFIGURACIÓN CENTRALIZADA
const ENV = 'development'; // 'development' | 'production' | 'staging'

export const API_CONFIG = {
  n8n: {
    // Reemplaza con la URL base real de tu webhook de n8n
    baseUrl: ENV === 'production' 
      ? 'https://tu-instancia-n8n.webhook/production/' 
      : 'https://tu-instancia-n8n.webhook/test/',
    webhookSecret: process.env.VITE_N8N_WEBHOOK_SECRET || 'dev-secret-key-123'
  },
  pagos: {
    stripe: {
      publicKey: process.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_123'
    }
  }
};

// 2. CLIENTE HTTP UNIFICADO
export const api = {
  async fetchWithRetry(url, options = {}, retries = 3, backoff = 300) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }
      return response;
    } catch (error) {
      if (retries > 0) {
        console.warn(\`Retrying... (\${retries} left)\`);
        await new Promise(r => setTimeout(r, backoff));
        return this.fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw error;
    }
  },

  async request(endpoint, method = 'GET', data = null, customHeaders = {}) {
    const url = endpoint.startsWith('http') ? endpoint : \`\${API_CONFIG.n8n.baseUrl}\${endpoint}\`;
    
    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': API_CONFIG.n8n.webhookSecret,
      ...customHeaders
    };

    const options = {
      method,
      headers,
      ...(data ? { body: JSON.stringify(data) } : {})
    };

    try {
      if (ENV === 'development') {
        console.log(\`[API \${method}] Request to \${url}:\`, data);
      }

      const response = await this.fetchWithRetry(url, options);
      const result = await response.json();
      
      return {
        exito: true,
        datos: result,
        error: null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(\`[API \${method}] Error at \${url}:\`, error);
      
      // Guardar en cola si falla (offline fallback)
      if (method === 'POST') {
        this.saveToQueue({ url, options, timestamp: Date.now() });
      }

      return {
        exito: false,
        datos: null,
        error: {
          codigo: 'FETCH_ERROR',
          mensaje: error instanceof Error ? error.message : 'Error desconocido de red'
        },
        timestamp: new Date().toISOString()
      };
    }
  },

  async get(endpoint, headers) { return this.request(endpoint, 'GET', null, headers); },
  async post(endpoint, data, headers) { return this.request(endpoint, 'POST', data, headers); },
  async put(endpoint, data, headers) { return this.request(endpoint, 'PUT', data, headers); },
  async delete(endpoint, headers) { return this.request(endpoint, 'DELETE', null, headers); },

  // Manejo de colas para offline fallback
  saveToQueue(requestData) {
    try {
      const queue = JSON.parse(localStorage.getItem('crt_webhook_queue') || '[]');
      queue.push(requestData);
      localStorage.setItem('crt_webhook_queue', JSON.stringify(queue));
    } catch (e) {
      console.error('No se pudo guardar en la cola', e);
    }
  },

  processQueue() {
    // Lógica para procesar la cola almacenada cuando vuelve la conexión
    const queue = JSON.parse(localStorage.getItem('crt_webhook_queue') || '[]');
    if (queue.length === 0) return;
    
    console.log(\`Procesando \${queue.length} webhooks pendientes...\`);
    // Limpiar cola inmediatamente para evitar duplicados, 
    // en producción requeriría un manejo más robusto
    localStorage.removeItem('crt_webhook_queue');
    
    queue.forEach(req => {
       // Reintentar en background
       fetch(req.url, req.options).catch(e => console.error('Fallo en retry:', e));
    });
  }
};

// 3. SISTEMA DE WEBHOOKS SALIENTES Y TRIGGERS PARA N8N
export const n8nTriggers = {
  // 1. TRIGGER: CONSULTA_CHAT_IA
  enviarConsultaChat: async (idUsuario, mensaje, agenteSeleccionado, idioma) => {
    const payload = { idUsuario, mensaje, timestamp: new Date().toISOString(), agenteSeleccionado, idioma };
    return api.post('chat-consulta', payload);
  },

  // 2. TRIGGER: INICIO_RESERVA
  iniciarReserva: async (idTour, nombreTour, precio, fechaSeleccionada, cantidadPersonas) => {
    const payload = { idTour, nombreTour, precio, fechaSeleccionada, cantidadPersonas, timestamp: new Date().toISOString() };
    return api.post('inicio-reserva', payload);
  },

  // 3. TRIGGER: SOLICITUD_PAGO
  solicitarPago: async (idReserva, datosCliente, monto, moneda, metodoPago, email, telefono) => {
    const payload = { idReserva, datosCliente, monto, moneda, metodoPago, email, telefono, timestamp: new Date().toISOString() };
    return api.post('solicitud-pago', payload);
  },

  // 4. TRIGGER: CONFIRMACION_RESERVA
  confirmarReserva: async (idReserva, referenciaPago, datosCliente, detallesTour, voucherQR) => {
    const payload = { idReserva, referenciaPago, datosCliente, detallesTour, voucherQR, timestamp: new Date().toISOString() };
    return api.post('confirmacion-reserva', payload);
  },

  // 5. TRIGGER: SOLICITUD_ITINERARIO
  solicitarItinerario: async (preferencias, presupuesto, fechas, cantidadPersonas, intereses) => {
    const payload = { preferencias, presupuesto, fechas, cantidadPersonas, intereses, timestamp: new Date().toISOString() };
    return api.post('solicitud-itinerario', payload);
  },

  // 6. TRIGGER: EVENTO_ANALITICA
  registrarEvento: async (tipoEvento, datos, pagina) => {
    const payload = { 
      tipoEvento, 
      datos, 
      pagina, 
      timestamp: new Date().toISOString(), 
      userAgent: navigator.userAgent 
    };
    // No esperamos la respuesta para analítica
    api.post('evento-analitica', payload).catch(() => {});
  },

  // 7. TRIGGER: SOLICITUD_SOPORTE
  solicitarSoporte: async (nombre, email, telefono, asunto, mensaje, historialChat = []) => {
    const payload = { nombre, email, telefono, asunto, mensaje, historialChat, timestamp: new Date().toISOString() };
    return api.post('solicitud-soporte', payload);
  }
};

export default api;
`;

fs.writeFileSync('src/lib/apiManager.ts', apiManagerCode);
