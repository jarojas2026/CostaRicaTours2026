/**
 * 🚀 TRIGGERS N8N - Costa Rica Tours
 * Funciones independientes para despachar los 7 eventos del ciclo de reservas y atención al cliente
 * hacia los webhooks de n8n, utilizando 'apiManager' con esquemas JSON estructurados.
 * 
 * CATÁLOGO DE TRIGGERS:
 * 1. triggerConsultaChatIA        -> /webhook/chat-consulta
 * 2. triggerInicioReserva         -> /webhook/inicio-reserva
 * 3. triggerSolicitudPago         -> /webhook/solicitud-pago
 * 4. triggerConfirmacionReserva   -> /webhook/confirmacion-reserva
 * 5. triggerSolicitudItinerario   -> /webhook/solicitud-itinerario
 * 6. triggerEventoAnalitica       -> /webhook/evento-analitica
 * 7. triggerSolicitudSoporte      -> /webhook/solicitud-soporte
 */

import { api, API_CONFIG } from './apiManager.js';

// ============================================================================
// 1. TRIGGER: CONSULTA_CHAT_IA (/webhook/chat-consulta)
// ============================================================================
/**
 * Canaliza la consulta del usuario hacia el flujo de IA de n8n.
 * Soporta invocación posicional o mediante objeto de configuración.
 * 
 * @param {string|object} idUsuarioOUsuario - ID único del usuario/sesión o payload completo
 * @param {string} [mensaje] - Pregunta o texto del usuario
 * @param {string} [agenteSeleccionado='asistente_pura_vida_ia'] - Identificador del agente
 * @param {string} [idioma='es'] - Código de idioma ('es' | 'en')
 * @param {object} [contexto={}] - Datos de contexto (tours vistos, fechas, etc.)
 * @returns {Promise<object>} Respuesta normalizada { exito, datos, error, timestamp }
 */
export async function triggerConsultaChatIA(idUsuarioOUsuario, mensaje, agenteSeleccionado = 'asistente_pura_vida_ia', idioma = 'es', contexto = {}) {
  let payload;

  if (typeof idUsuarioOUsuario === 'object' && idUsuarioOUsuario !== null) {
    const opts = idUsuarioOUsuario;
    payload = {
      trigger: 'CONSULTA_CHAT_IA',
      idUsuario: opts.idUsuario || opts.userId || 'anonimo_' + Math.random().toString(36).substring(2, 9),
      mensaje: opts.mensaje || opts.message || '',
      message: opts.mensaje || opts.message || '',
      agenteSeleccionado: opts.agenteSeleccionado || opts.agent || 'asistente_pura_vida_ia',
      idioma: opts.idioma || opts.language || 'es',
      language: opts.idioma || opts.language || 'es',
      historial: opts.historial || opts.history || [],
      contexto: opts.contexto || opts.context || {},
      context: opts.contexto || opts.context || {},
      timestamp: new Date().toISOString()
    };
  } else {
    payload = {
      trigger: 'CONSULTA_CHAT_IA',
      idUsuario: idUsuarioOUsuario || 'anonimo_' + Math.random().toString(36).substring(2, 9),
      mensaje: mensaje || '',
      message: mensaje || '',
      agenteSeleccionado: agenteSeleccionado || 'asistente_pura_vida_ia',
      idioma: idioma || 'es',
      language: idioma || 'es',
      contexto: contexto || {},
      context: contexto || {},
      timestamp: new Date().toISOString()
    };
  }

  const endpoint = API_CONFIG.endpoints?.chatConsulta || '/webhook/chat-consulta';
  return api.post(endpoint, payload);
}

export const triggerChatConsultation = triggerConsultaChatIA;
export const triggerChatAI = triggerConsultaChatIA;

// ============================================================================
// 2. TRIGGER: INICIO_RESERVA (/webhook/inicio-reserva)
// ============================================================================
/**
 * Notifica a n8n que un viajero ha comenzado el flujo de selección de reserva.
 * 
 * @param {string|object} idTourOUsuario - ID del tour o payload completo
 * @param {string} [nombreTour] - Nombre descriptivo del tour
 * @param {number} [precio] - Tarifa base o total estimado en USD
 * @param {string} [fechaSeleccionada] - Fecha en formato YYYY-MM-DD
 * @param {number|object} [cantidadPersonas] - Número total o desglose { adultos, ninos }
 * @param {object} [cliente={}] - Datos preliminares del cliente
 * @returns {Promise<object>}
 */
export async function triggerInicioReserva(idTourOUsuario, nombreTour, precio, fechaSeleccionada, cantidadPersonas, cliente = {}) {
  let payload;

  if (typeof idTourOUsuario === 'object' && idTourOUsuario !== null) {
    const opts = idTourOUsuario;
    payload = {
      trigger: 'INICIO_RESERVA',
      idTour: opts.idTour || opts.tourId || '',
      tourId: opts.idTour || opts.tourId || '',
      nombreTour: opts.nombreTour || opts.tourName || '',
      tourName: opts.nombreTour || opts.tourName || '',
      precio: opts.precio || opts.price || opts.totalUSD || 0,
      totalUSD: opts.precio || opts.price || opts.totalUSD || 0,
      fechaSeleccionada: opts.fechaSeleccionada || opts.date || '',
      date: opts.fechaSeleccionada || opts.date || '',
      horario: opts.horario || opts.time || '08:00 AM',
      cantidadPersonas: opts.cantidadPersonas || opts.passengers || 1,
      cliente: opts.cliente || opts.customer || {},
      timestamp: new Date().toISOString()
    };
  } else {
    payload = {
      trigger: 'INICIO_RESERVA',
      idTour: idTourOUsuario || '',
      tourId: idTourOUsuario || '',
      nombreTour: nombreTour || '',
      tourName: nombreTour || '',
      precio: precio || 0,
      totalUSD: precio || 0,
      fechaSeleccionada: fechaSeleccionada || '',
      date: fechaSeleccionada || '',
      cantidadPersonas: cantidadPersonas || 1,
      cliente: cliente || {},
      timestamp: new Date().toISOString()
    };
  }

  const endpoint = API_CONFIG.endpoints?.inicioReserva || '/webhook/inicio-reserva';
  return api.post(endpoint, payload);
}

export const triggerBookingStart = triggerInicioReserva;

// ============================================================================
// 3. TRIGGER: SOLICITUD_PAGO (/webhook/solicitud-pago)
// ============================================================================
/**
 * Registra en n8n la intención de pago y prepara los links o comprobantes de pasarelas.
 * 
 * @param {string|object} idReservaOUsuario - ID de reserva (ej. 'CR-PV-123456') o payload completo
 * @param {object} [datosCliente] - Objeto { nombre, email, telefono, hotelRecogida }
 * @param {number} [monto] - Monto total a cobrar
 * @param {string} [moneda='USD'] - 'USD' o 'CRC'
 * @param {string} [metodoPago='credit_card'] - 'credit_card', 'paypal', 'sinpe_movil'
 * @param {string} [email=''] - Email de contacto del cliente
 * @param {string} [telefono=''] - Teléfono internacional
 * @returns {Promise<object>}
 */
export async function triggerSolicitudPago(idReservaOUsuario, datosCliente, monto, moneda = 'USD', metodoPago = 'credit_card', email = '', telefono = '') {
  let payload;

  if (typeof idReservaOUsuario === 'object' && idReservaOUsuario !== null) {
    const opts = idReservaOUsuario;
    payload = {
      trigger: 'SOLICITUD_PAGO',
      idReserva: opts.idReserva || opts.bookingId || '',
      bookingId: opts.idReserva || opts.bookingId || '',
      datosCliente: opts.datosCliente || opts.customer || {},
      customer: opts.datosCliente || opts.customer || {},
      monto: opts.monto || opts.amount || 0,
      amount: opts.monto || opts.amount || 0,
      moneda: opts.moneda || opts.currency || 'USD',
      currency: opts.moneda || opts.currency || 'USD',
      metodoPago: opts.metodoPago || opts.paymentMethod || 'credit_card',
      paymentMethod: opts.metodoPago || opts.paymentMethod || 'credit_card',
      email: opts.email || opts.datosCliente?.email || '',
      telefono: opts.telefono || opts.datosCliente?.phone || '',
      desgloseTarifas: opts.desgloseTarifas || opts.breakdown || {},
      timestamp: new Date().toISOString()
    };
  } else {
    payload = {
      trigger: 'SOLICITUD_PAGO',
      idReserva: idReservaOUsuario || '',
      bookingId: idReservaOUsuario || '',
      datosCliente: datosCliente || {},
      customer: datosCliente || {},
      monto: monto || 0,
      amount: monto || 0,
      moneda: moneda || 'USD',
      currency: moneda || 'USD',
      metodoPago: metodoPago || 'credit_card',
      paymentMethod: metodoPago || 'credit_card',
      email: email || datosCliente?.email || '',
      telefono: telefono || datosCliente?.phone || '',
      timestamp: new Date().toISOString()
    };
  }

  const endpoint = API_CONFIG.endpoints?.solicitudPago || '/webhook/solicitud-pago';
  return api.post(endpoint, payload);
}

export const triggerPaymentRequest = triggerSolicitudPago;

// ============================================================================
// 4. TRIGGER: CONFIRMACION_RESERVA (/webhook/confirmacion-reserva)
// ============================================================================
/**
 * Se despacha inmediatamente después de confirmarse el pago por el backend.
 * Permite a n8n emitir vouchers oficiales, coordinar transportistas y notificar al cliente.
 * 
 * @param {string|object} idReservaOUsuario - ID de reserva o payload completo
 * @param {string} [referenciaPago] - ID de transacción (Stripe, PayPal, etc.)
 * @param {object} [datosCliente] - Información del cliente
 * @param {object} [detallesTour] - Detalles del itinerario y pasajeros
 * @param {string} [voucherQR=''] - Código o URL del voucher
 * @returns {Promise<object>}
 */
export async function triggerConfirmacionReserva(idReservaOUsuario, referenciaPago, datosCliente, detallesTour, voucherQR = '') {
  let payload;

  if (typeof idReservaOUsuario === 'object' && idReservaOUsuario !== null) {
    const opts = idReservaOUsuario;
    payload = {
      trigger: 'CONFIRMACION_RESERVA',
      event: 'booking.confirmed',
      idReserva: opts.idReserva || opts.bookingId || '',
      bookingId: opts.idReserva || opts.bookingId || '',
      referenciaPago: opts.referenciaPago || opts.paymentReference || opts.transactionId || '',
      paymentReference: opts.referenciaPago || opts.paymentReference || opts.transactionId || '',
      estadoPago: opts.estadoPago || opts.paymentStatus || 'completed',
      paymentStatus: opts.estadoPago || opts.paymentStatus || 'completed',
      datosCliente: opts.datosCliente || opts.customer || {},
      customer: opts.datosCliente || opts.customer || {},
      detallesTour: opts.detallesTour || opts.tourDetails || {},
      tourDetails: opts.detallesTour || opts.tourDetails || {},
      voucherQR: opts.voucherQR || opts.qrCodeUrl || '',
      totalPagado: opts.totalPagado || opts.amountPaid || null,
      timestamp: new Date().toISOString()
    };
  } else {
    payload = {
      trigger: 'CONFIRMACION_RESERVA',
      event: 'booking.confirmed',
      idReserva: idReservaOUsuario || '',
      bookingId: idReservaOUsuario || '',
      referenciaPago: referenciaPago || '',
      paymentReference: referenciaPago || '',
      estadoPago: 'completed',
      paymentStatus: 'completed',
      datosCliente: datosCliente || {},
      customer: datosCliente || {},
      detallesTour: detallesTour || {},
      tourDetails: detallesTour || {},
      voucherQR: voucherQR || '',
      timestamp: new Date().toISOString()
    };
  }

  const endpoint = API_CONFIG.endpoints?.confirmacionReserva || '/webhook/confirmacion-reserva';
  return api.post(endpoint, payload);
}

export const triggerBookingConfirmation = triggerConfirmacionReserva;

// ============================================================================
// 5. TRIGGER: SOLICITUD_ITINERARIO (/webhook/solicitud-itinerario)
// ============================================================================
/**
 * Envía las preferencias y presupuesto del viajero para que n8n genere una ruta personalizada.
 * 
 * @param {string|object} preferenciasOUsuario - Preferencias de viaje o payload completo
 * @param {string|number} [presupuesto] - Rango presupuestario estimado
 * @param {object|string} [fechas] - Fechas de viaje { inicio, fin, duracion }
 * @param {number|object} [cantidadPersonas] - Número de viajeros
 * @param {string[]} [intereses=[]] - Tags de intereses (ej. ['volcanes', 'fauna', 'playa'])
 * @param {object} [cliente={}] - Datos de contacto del cliente
 * @returns {Promise<object>}
 */
export async function triggerSolicitudItinerario(preferenciasOUsuario, presupuesto, fechas, cantidadPersonas, intereses = [], cliente = {}) {
  let payload;

  if (typeof preferenciasOUsuario === 'object' && preferenciasOUsuario !== null && !Array.isArray(preferenciasOUsuario)) {
    const opts = preferenciasOUsuario;
    payload = {
      trigger: 'SOLICITUD_ITINERARIO',
      cliente: opts.cliente || opts.customer || {},
      customer: opts.cliente || opts.customer || {},
      preferencias: opts.preferencias || opts.preferences || '',
      preferences: opts.preferencias || opts.preferences || '',
      presupuesto: opts.presupuesto || opts.budget || '',
      budget: opts.presupuesto || opts.budget || '',
      fechas: opts.fechas || opts.dates || {},
      dates: opts.fechas || opts.dates || {},
      cantidadPersonas: opts.cantidadPersonas || opts.passengers || opts.travelers || 1,
      travelers: opts.cantidadPersonas || opts.passengers || opts.travelers || 1,
      intereses: opts.intereses || opts.interests || [],
      interests: opts.intereses || opts.interests || [],
      timestamp: new Date().toISOString()
    };
  } else {
    payload = {
      trigger: 'SOLICITUD_ITINERARIO',
      cliente: cliente || {},
      customer: cliente || {},
      preferencias: preferenciasOUsuario || '',
      preferences: preferenciasOUsuario || '',
      presupuesto: presupuesto || '',
      budget: presupuesto || '',
      fechas: fechas || {},
      dates: fechas || {},
      cantidadPersonas: cantidadPersonas || 1,
      travelers: cantidadPersonas || 1,
      intereses: Array.isArray(intereses) ? intereses : [intereses].filter(Boolean),
      interests: Array.isArray(intereses) ? intereses : [intereses].filter(Boolean),
      timestamp: new Date().toISOString()
    };
  }

  const endpoint = API_CONFIG.endpoints?.solicitudItinerario || '/webhook/solicitud-itinerario';
  return api.post(endpoint, payload);
}

export const triggerItineraryRequest = triggerSolicitudItinerario;

// ============================================================================
// 6. TRIGGER: EVENTO_ANALITICA (/webhook/evento-analitica)
// ============================================================================
/**
 * Registra eventos de telemetría y conversión sin bloquear la interacción del usuario.
 * 
 * @param {string|object} tipoEventoOUsuario - Nombre del evento (ej. 'tour_viewed') o payload
 * @param {object} [datos={}] - Datos de contexto del evento
 * @param {string} [pagina=''] - Ruta de la página donde ocurrió
 * @returns {Promise<object>}
 */
export async function triggerEventoAnalitica(tipoEventoOUsuario, datos = {}, pagina = '') {
  let payload;

  if (typeof tipoEventoOUsuario === 'object' && tipoEventoOUsuario !== null) {
    const opts = tipoEventoOUsuario;
    payload = {
      trigger: 'EVENTO_ANALITICA',
      tipoEvento: opts.tipoEvento || opts.eventType || 'evento_general',
      eventType: opts.tipoEvento || opts.eventType || 'evento_general',
      datos: opts.datos || opts.data || {},
      data: opts.datos || opts.data || {},
      pagina: opts.pagina || opts.page || (typeof window !== 'undefined' ? window.location.pathname : ''),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/SSR',
      timestamp: new Date().toISOString()
    };
  } else {
    payload = {
      trigger: 'EVENTO_ANALITICA',
      tipoEvento: tipoEventoOUsuario || 'evento_general',
      eventType: tipoEventoOUsuario || 'evento_general',
      datos: datos || {},
      data: datos || {},
      pagina: pagina || (typeof window !== 'undefined' ? window.location.pathname : ''),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/SSR',
      timestamp: new Date().toISOString()
    };
  }

  const endpoint = API_CONFIG.endpoints?.eventoAnalitica || '/webhook/evento-analitica';
  // Se envía con skipQueue: true para no acumular analítica en localStorage
  return api.post(endpoint, payload, {}, { skipQueue: true });
}

export const triggerAnalyticsEvent = triggerEventoAnalitica;

// ============================================================================
// 7. TRIGGER: SOLICITUD_SOPORTE (/webhook/solicitud-soporte)
// ============================================================================
/**
 * Conecta al viajero con operadores humanos, levantando tickets y avisos a WhatsApp o Slack en n8n.
 * 
 * @param {string|object} nombreOUsuario - Nombre del usuario o payload completo
 * @param {string} [email] - Correo electrónico
 * @param {string} [telefono] - Número telefónico con código de país
 * @param {string} [asunto] - Motivo de la consulta o soporte
 * @param {string} [mensaje] - Descripción del problema o solicitud
 * @param {Array} [historialChat=[]] - Transcripción del chat con el bot
 * @param {string} [idReserva=''] - ID de reserva relacionada si existe
 * @returns {Promise<object>}
 */
export async function triggerSolicitudSoporte(nombreOUsuario, email, telefono, asunto, mensaje, historialChat = [], idReserva = '') {
  let payload;

  if (typeof nombreOUsuario === 'object' && nombreOUsuario !== null) {
    const opts = nombreOUsuario;
    payload = {
      trigger: 'SOLICITUD_SOPORTE',
      nombre: opts.nombre || opts.name || '',
      name: opts.nombre || opts.name || '',
      email: opts.email || '',
      telefono: opts.telefono || opts.phone || '',
      phone: opts.telefono || opts.phone || '',
      asunto: opts.asunto || opts.subject || 'Consulta General',
      subject: opts.asunto || opts.subject || 'Consulta General',
      mensaje: opts.mensaje || opts.message || '',
      message: opts.mensaje || opts.message || '',
      historialChat: opts.historialChat || opts.chatHistory || [],
      chatHistory: opts.historialChat || opts.chatHistory || [],
      idReserva: opts.idReserva || opts.bookingId || '',
      bookingId: opts.idReserva || opts.bookingId || '',
      prioridad: opts.prioridad || opts.priority || 'media',
      timestamp: new Date().toISOString()
    };
  } else {
    payload = {
      trigger: 'SOLICITUD_SOPORTE',
      nombre: nombreOUsuario || '',
      name: nombreOUsuario || '',
      email: email || '',
      telefono: telefono || '',
      phone: telefono || '',
      asunto: asunto || 'Consulta General',
      subject: asunto || 'Consulta General',
      mensaje: mensaje || '',
      message: mensaje || '',
      historialChat: Array.isArray(historialChat) ? historialChat : [],
      chatHistory: Array.isArray(historialChat) ? historialChat : [],
      idReserva: idReserva || '',
      bookingId: idReserva || '',
      timestamp: new Date().toISOString()
    };
  }

  const endpoint = API_CONFIG.endpoints?.solicitudSoporte || '/webhook/solicitud-soporte';
  return api.post(endpoint, payload);
}

export const triggerSupportRequest = triggerSolicitudSoporte;

// ============================================================================
// CATÁLOGO Y EXPORTACIÓN POR DEFECTO
// ============================================================================

export const n8nTriggers = {
  consultaChatIA: triggerConsultaChatIA,
  chatConsultation: triggerChatConsultation,
  inicioReserva: triggerInicioReserva,
  bookingStart: triggerBookingStart,
  solicitudPago: triggerSolicitudPago,
  paymentRequest: triggerPaymentRequest,
  confirmacionReserva: triggerConfirmacionReserva,
  bookingConfirmation: triggerBookingConfirmation,
  solicitudItinerario: triggerSolicitudItinerario,
  itineraryRequest: triggerItineraryRequest,
  eventoAnalitica: triggerEventoAnalitica,
  analyticsEvent: triggerAnalyticsEvent,
  solicitudSoporte: triggerSolicitudSoporte,
  supportRequest: triggerSupportRequest
};

export default n8nTriggers;
