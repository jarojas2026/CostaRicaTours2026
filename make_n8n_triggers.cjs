const fs = require('fs');

const triggersCode = `
import { api, API_CONFIG } from './apiManager';

/**
 * 🤖 TRIGGER: CONSULTA_CHAT_IA
 */
export const triggerChatAI = async (idUsuario, mensaje, agenteSeleccionado, idioma) => {
  return await api.post('chat-consulta', { idUsuario, mensaje, timestamp: new Date().toISOString(), agenteSeleccionado, idioma });
};

/**
 * 📝 TRIGGER: INICIO_RESERVA
 */
export const triggerInicioReserva = async (idTour, nombreTour, precio, fechaSeleccionada, cantidadPersonas) => {
  return await api.post('inicio-reserva', { idTour, nombreTour, precio, fechaSeleccionada, cantidadPersonas, timestamp: new Date().toISOString() });
};

/**
 * 💳 TRIGGER: SOLICITUD_PAGO
 */
export const triggerSolicitudPago = async (idReserva, datosCliente, monto, moneda, metodoPago, email, telefono) => {
  return await api.post('solicitud-pago', { idReserva, datosCliente, monto, moneda, metodoPago, email, telefono, timestamp: new Date().toISOString() });
};

/**
 * ✅ TRIGGER: CONFIRMACION_RESERVA
 */
export const triggerConfirmacionReserva = async (idReserva, referenciaPago, datosCliente, detallesTour, voucherQR) => {
  return await api.post('confirmacion-reserva', { idReserva, referenciaPago, datosCliente, detallesTour, voucherQR, timestamp: new Date().toISOString() });
};

/**
 * 📨 TRIGGER: SOLICITUD_ITINERARIO
 */
export const triggerSolicitudItinerario = async (preferencias, presupuesto, fechas, cantidadPersonas, intereses) => {
  return await api.post('solicitud-itinerario', { preferencias, presupuesto, fechas, cantidadPersonas, intereses, timestamp: new Date().toISOString() });
};

/**
 * 📊 TRIGGER: EVENTO_ANALITICA
 */
export const triggerEventoAnalitica = async (tipoEvento, datos, pagina) => {
  return await api.post('evento-analitica', { tipoEvento, datos, pagina, timestamp: new Date().toISOString(), userAgent: navigator.userAgent });
};

/**
 * 🆘 TRIGGER: SOLICITUD_SOPORTE
 */
export const triggerSolicitudSoporte = async (nombre, email, telefono, asunto, mensaje, historialChat = []) => {
  return await api.post('solicitud-soporte', { nombre, email, telefono, asunto, mensaje, historialChat, timestamp: new Date().toISOString() });
};
`;

fs.writeFileSync('src/lib/n8nTriggers.ts', triggersCode);
